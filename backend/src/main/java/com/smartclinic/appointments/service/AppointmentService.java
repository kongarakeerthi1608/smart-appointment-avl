package com.smartclinic.appointments.service;

import com.smartclinic.appointments.avl.AppointmentKey;
import com.smartclinic.appointments.avl.AvlTree;
import com.smartclinic.appointments.avl.AvlTree.DeleteResult;
import com.smartclinic.appointments.avl.AvlTree.InsertResult;
import com.smartclinic.appointments.avl.AvlTree.Rotation;
import com.smartclinic.appointments.avl.AvlTree.SearchResult;
import com.smartclinic.appointments.avl.AvlTree.Snapshot;
import com.smartclinic.appointments.dto.AppointmentView;
import com.smartclinic.appointments.dto.AvailabilityView;
import com.smartclinic.appointments.dto.AvlOperationView;
import com.smartclinic.appointments.dto.BookingRequest;
import com.smartclinic.appointments.dto.DashboardView;
import com.smartclinic.appointments.dto.NextAvailableView;
import com.smartclinic.appointments.dto.OperationStepView;
import com.smartclinic.appointments.dto.RotationView;
import com.smartclinic.appointments.dto.TraceFrameView;
import com.smartclinic.appointments.dto.TraversalView;
import com.smartclinic.appointments.dto.TreeHealthView;
import com.smartclinic.appointments.dto.TreeView;
import com.smartclinic.appointments.exception.BusinessValidationException;
import com.smartclinic.appointments.exception.DuplicateAppointmentException;
import com.smartclinic.appointments.exception.ResourceNotFoundException;
import com.smartclinic.appointments.model.Appointment;
import com.smartclinic.appointments.model.AppointmentStatus;
import com.smartclinic.appointments.repository.AppointmentRepository;
import jakarta.annotation.PostConstruct;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppointmentService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentService.class);
    private static final Pattern ID_PATTERN = Pattern.compile("^APT-(\\d+)$");
    private static final DateTimeFormatter FRIENDLY_DATE = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy");

    private static final String[] SAMPLE_NAMES = {
            "Aarav Mehta", "Diya Sharma", "Kabir Nair", "Ishita Rao", "Vihaan Kapoor",
            "Ananya Iyer", "Rohan Verma", "Meera Joshi", "Arjun Patel", "Saanvi Desai",
            "Neel Bansal", "Tara Krishnan"
    };

    private final AppointmentRepository repository;
    private final SlotPolicy slotPolicy;
    private final TreeViewMapper treeViewMapper;

    /**
     * Primary data structure: ordered by date + time + appointment ID.
     * It powers duplicate detection, availability, next-slot search, schedule
     * traversal and the live visualizer.
     */
    private final AvlTree<AppointmentKey, Appointment> scheduleTree =
            new AvlTree<>(AppointmentKey.ORDER);

    /**
     * Auxiliary AVL index: appointment ID -> appointment.
     * This is the second manually written AVL tree. It gives O(log n) lookup by
     * the user-facing appointment ID while the primary tree stays chronological.
     */
    private final AvlTree<String, Appointment> idIndex =
            new AvlTree<>(String.CASE_INSENSITIVE_ORDER);

    private long nextSequence = 1;

    public AppointmentService(
            AppointmentRepository repository,
            SlotPolicy slotPolicy,
            TreeViewMapper treeViewMapper
    ) {
        this.repository = repository;
        this.slotPolicy = slotPolicy;
        this.treeViewMapper = treeViewMapper;
    }

    @PostConstruct
    public synchronized void rebuildTreeFromDatabase() {
        scheduleTree.clear();
        idIndex.clear();
        List<Appointment> active = repository.findByStatusOrderByAppointmentDateAscAppointmentTimeAsc(
                AppointmentStatus.BOOKED
        );
        for (Appointment appointment : active) {
            scheduleTree.insert(AppointmentKey.of(appointment), appointment);
            idIndex.insert(appointment.getId(), appointment);
        }
        nextSequence = 1;
        repository.findAll().forEach(appointment -> updateSequenceFromId(appointment.getId()));
        log.info(
                "AVL indexes rebuilt from H2: {} active appointments, height {}, balanced={}",
                scheduleTree.size(),
                scheduleTree.height(),
                scheduleTree.validate().valid()
        );
    }

    private void updateSequenceFromId(String id) {
        Matcher matcher = ID_PATTERN.matcher(id == null ? "" : id);
        if (matcher.matches()) {
            try {
                nextSequence = Math.max(nextSequence, Long.parseLong(matcher.group(1)) + 1);
            } catch (NumberFormatException ignored) {
                // An unusual legacy ID should not prevent startup.
            }
        }
    }

    // ------------------------------------------------------------------
    // BOOKING
    // ------------------------------------------------------------------

    @Transactional
    public synchronized AppointmentView book(BookingRequest request) {
        return AppointmentView.from(performBookingWithTrace(request).appointment());
    }

    private BookingExecution performBookingWithTrace(BookingRequest request) {
        validateBooking(request);
        Snapshot<AppointmentKey, Appointment> before = scheduleTree.snapshot();
        String id = nextAppointmentId();
        Appointment appointment = new Appointment(
                id,
                request.patientName().trim(),
                request.email().trim().toLowerCase(),
                request.phone().trim(),
                request.appointmentDate(),
                request.appointmentTime(),
                request.description().trim(),
                LocalDateTime.now()
        );

        repository.saveAndFlush(appointment);

        AppointmentKey key = AppointmentKey.of(appointment);
        try {
            InsertResult<AppointmentKey, Appointment> inserted = scheduleTree.insert(key, appointment);
            if (!inserted.inserted()) {
                throw new DuplicateAppointmentException("This appointment key already exists in the AVL tree.");
            }
            idIndex.insert(appointment.getId(), appointment);
            return new BookingExecution(appointment, before, inserted);
        } catch (RuntimeException exception) {
            repository.delete(appointment);
            repository.flush();
            throw exception;
        }
    }

    private record BookingExecution(
            Appointment appointment,
            Snapshot<AppointmentKey, Appointment> before,
            InsertResult<AppointmentKey, Appointment> insertion
    ) {
    }

    private void validateBooking(BookingRequest request) {
        if (request.appointmentDate() == null || request.appointmentTime() == null) {
            throw new BusinessValidationException("Appointment date and time are required.");
        }
        if (request.appointmentDate().getDayOfWeek() == DayOfWeek.SUNDAY) {
            throw new BusinessValidationException("The clinic is closed on Sundays. Please choose another day.");
        }
        if (!slotPolicy.isKnownSlot(request.appointmentTime())) {
            throw new BusinessValidationException(
                    "Choose a valid clinic slot between 09:00 and 16:30 in 30-minute intervals."
            );
        }
        if (request.appointmentDate().isAfter(LocalDate.now().plusDays(SlotPolicy.SEARCH_HORIZON_DAYS))) {
            throw new BusinessValidationException("Appointments can be booked up to 60 days in advance.");
        }
        if (slotPolicy.isPast(request.appointmentDate(), request.appointmentTime())) {
            throw new BusinessValidationException("That appointment slot is already in the past.");
        }
        if (isSlotBooked(request.appointmentDate(), request.appointmentTime())) {
            throw new DuplicateAppointmentException(
                    "That date and time is already booked. Please select another available slot."
            );
        }
    }

    private String nextAppointmentId() {
        while (true) {
            String candidate = "APT-%04d".formatted(nextSequence++);
            if (!repository.existsById(candidate) && !idIndex.search(candidate).found()) {
                return candidate;
            }
        }
    }

    // ------------------------------------------------------------------
    // CANCELLATION
    // ------------------------------------------------------------------

    @Transactional
    public synchronized AvlOperationView cancelAppointment(String appointmentId) {
        Appointment appointment = findActiveAppointment(appointmentId);
        AppointmentKey key = AppointmentKey.of(appointment);
        Snapshot<AppointmentKey, Appointment> before = scheduleTree.snapshot();
        DeleteResult<AppointmentKey, Appointment> deletion = scheduleTree.delete(key);
        idIndex.delete(appointment.getId());

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancelledAt(LocalDateTime.now());
        try {
            repository.saveAndFlush(appointment);
        } catch (RuntimeException exception) {
            scheduleTree.insert(key, appointment);
            idIndex.insert(appointment.getId(), appointment);
            throw exception;
        }

        return buildDeleteOperation(appointment, key, before, deletion);
    }

    private Appointment findActiveAppointment(String appointmentId) {
        if (appointmentId == null || appointmentId.isBlank()) {
            throw new BusinessValidationException("Appointment ID is required.");
        }
        SearchResult<String, Appointment> indexed = idIndex.search(appointmentId.trim());
        if (!indexed.found()) {
            Appointment existing = repository.findById(appointmentId.trim().toUpperCase()).orElse(null);
            if (existing != null && existing.getStatus() == AppointmentStatus.CANCELLED) {
                throw new BusinessValidationException("This appointment has already been cancelled.");
            }
            throw new ResourceNotFoundException("Appointment " + appointmentId.trim() + " was not found.");
        }
        return indexed.value();
    }

    // ------------------------------------------------------------------
    // SEARCH / VISUALIZER OPERATIONS
    // ------------------------------------------------------------------

    public synchronized AvlOperationView searchAppointment(String appointmentId) {
        String requestedId = appointmentId == null ? "" : appointmentId.trim().toUpperCase();
        SearchResult<String, Appointment> idLookup = idIndex.search(requestedId);
        TreeView currentTree = treeViewMapper.toTreeView(scheduleTree.snapshot());
        List<OperationStepView> steps = new ArrayList<>();
        List<TraceFrameView> frames = new ArrayList<>();

        if (!idLookup.found()) {
            Appointment cancelled = repository.findById(requestedId).orElse(null);
            String message = cancelled != null
                    ? "Appointment " + requestedId + " exists in H2 but is CANCELLED, so it is not in the active AVL tree."
                    : "No active appointment with ID " + requestedId + " was found.";
            addStep(
                    steps,
                    "Search the ID index AVL tree",
                    "Compared " + idLookup.comparisons() + " node(s). The key sequence is not present.",
                    "SEARCH"
            );
            frames.add(new TraceFrameView(
                    "Search complete - not found",
                    message,
                    null,
                    null,
                    List.of(),
                    currentTree
            ));
            return new AvlOperationView(
                    "SEARCH", false, message, null, null, List.of(),
                    List.copyOf(steps), List.copyOf(frames), List.of(), currentTree, currentTree
            );
        }

        Appointment appointment = idLookup.value();
        AppointmentKey key = AppointmentKey.of(appointment);
        SearchResult<AppointmentKey, Appointment> scheduleLookup = scheduleTree.search(key);
        List<String> searchPath = scheduleLookup.path().stream()
                .map(AppointmentKey::displayKey)
                .toList();

        addStep(
                steps,
                "Search the ID index AVL tree",
                requestedId + " found after " + idLookup.comparisons() + " comparison(s).",
                "SEARCH"
        );
        addStep(
                steps,
                "Locate the chronological key",
                "Resolve the composite key " + key.displayKey() + ".",
                "SEARCH"
        );
        addStep(
                steps,
                "Search the primary AVL tree",
                "Visited " + scheduleLookup.comparisons() + " node(s): " + String.join(" -> ", searchPath),
                "SEARCH"
        );

        String message = "Appointment " + requestedId + " found in " + scheduleLookup.comparisons()
                + " primary-tree comparison(s).";
        frames.add(new TraceFrameView(
                "Appointment found",
                message,
                null,
                null,
                List.of(key.displayKey()),
                currentTree
        ));
        return new AvlOperationView(
                "SEARCH",
                true,
                message,
                AppointmentView.from(appointment),
                key.displayKey(),
                searchPath,
                List.copyOf(steps),
                List.copyOf(frames),
                List.of(),
                currentTree,
                currentTree
        );
    }

    @Transactional
    public synchronized AvlOperationView insertSampleAppointment() {
        LevelSlot slot = pickRandomAvailableSlot();
        int sampleIndex = (int) (scheduleTree.size() % SAMPLE_NAMES.length);
        String name = SAMPLE_NAMES[sampleIndex];
        String slug = name.toLowerCase().replace(" ", ".");
        BookingRequest request = new BookingRequest(
                name,
                slug + "@example.com",
                "+91 98765 43" + (210 + sampleIndex),
                slot.date(),
                slot.time(),
                "Demo consultation inserted from the AVL visualizer."
        );

        BookingExecution execution = performBookingWithTrace(request);
        return buildInsertOperation(
                execution.appointment(),
                execution.before(),
                execution.insertion()
        );
    }

    private record LevelSlot(LocalDate date, LocalTime time) {
    }

    private LevelSlot pickRandomAvailableSlot() {
        List<LevelSlot> available = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int offset = 0; offset <= 45; offset++) {
            LocalDate date = today.plusDays(offset);
            if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                continue;
            }
            for (LocalTime time : slotPolicy.slots()) {
                if (!slotPolicy.isPast(date, time) && !isSlotBooked(date, time)) {
                    available.add(new LevelSlot(date, time));
                }
            }
        }
        if (available.isEmpty()) {
            throw new BusinessValidationException("No future slots are available for a sample appointment.");
        }
        return available.get(ThreadLocalRandom.current().nextInt(available.size()));
    }

    @Transactional
    public synchronized AvlOperationView resetAllData() {
        Snapshot<AppointmentKey, Appointment> before = scheduleTree.snapshot();
        TreeView beforeTree = treeViewMapper.toTreeView(before);
        repository.deleteAllInBatch();
        scheduleTree.clear();
        idIndex.clear();
        nextSequence = 1;

        List<OperationStepView> steps = new ArrayList<>();
        addStep(steps, "Delete persisted appointments", "All H2 appointment records were removed.", "RESET");
        addStep(steps, "Clear both AVL trees", "Primary schedule tree and ID index are now empty.", "RESET");
        addStep(steps, "Reset sequence", "The next booking will receive APT-0001.", "RESET");

        TreeView empty = treeViewMapper.toTreeView(scheduleTree.snapshot());
        List<TraceFrameView> frames = List.of(
                new TraceFrameView("Before reset", "Captured the complete active AVL tree.", null, null, List.of(), beforeTree),
                new TraceFrameView("Tree reset", "The real backend tree is now empty.", "RESET", "Clear tree", List.of(), empty)
        );
        return new AvlOperationView(
                "RESET", true, "All appointment data and AVL nodes were cleared.", null, null,
                List.of(), List.copyOf(steps), frames, List.of(), beforeTree, empty
        );
    }

    // ------------------------------------------------------------------
    // READ-ONLY QUERIES
    // ------------------------------------------------------------------

    public TreeView treeView() {
        return treeViewMapper.toTreeView(scheduleTree.snapshot());
    }

    public TreeHealthView treeHealth() {
        AvlTree.ValidationResult validation = scheduleTree.validate();
        return new TreeHealthView(
                validation.valid(),
                validation.nodesChecked(),
                scheduleTree.size(),
                scheduleTree.height(),
                validation.valid(),
                scheduleTree.rootKey() == null ? null : scheduleTree.rootKey().displayKey(),
                validation.errors()
        );
    }

    public TraversalView traversals() {
        return treeViewMapper.toTraversalView(
                scheduleTree.inOrder(),
                scheduleTree.preOrder(),
                scheduleTree.postOrder()
        );
    }

    public List<AppointmentView> listAppointments(String query, AppointmentStatus status) {
        String needle = query == null ? "" : query.trim().toLowerCase();
        Sort sort = Sort.by(Sort.Order.asc("appointmentDate"), Sort.Order.asc("appointmentTime"));
        return repository.findAll(sort).stream()
                .filter(appointment -> status == null || appointment.getStatus() == status)
                .filter(appointment -> needle.isEmpty() || matches(appointment, needle))
                .map(AppointmentView::from)
                .toList();
    }

    private boolean matches(Appointment appointment, String needle) {
        return appointment.getId().toLowerCase().contains(needle)
                || appointment.getPatientName().toLowerCase().contains(needle)
                || appointment.getEmail().toLowerCase().contains(needle)
                || appointment.getPhone().toLowerCase().contains(needle)
                || appointment.getAppointmentDate().toString().contains(needle);
    }

    public AppointmentView getAppointment(String id) {
        return AppointmentView.from(repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment " + id + " was not found.")));
    }

    public DashboardView dashboard() {
        long total = repository.count();
        long booked = repository.countByStatus(AppointmentStatus.BOOKED);
        long cancelled = repository.countByStatus(AppointmentStatus.CANCELLED);
        LocalDate today = LocalDate.now();

        int available = 0;
        List<DashboardView.DayBookingView> weekly = new ArrayList<>();
        for (int offset = 0; offset < SlotPolicy.DASHBOARD_DAYS; offset++) {
            LocalDate date = today.plusDays(offset);
            int dayAvailable = availableSlotCount(date);
            available += dayAvailable;
            List<Appointment> dayAppointments = scheduleTree.valuesBetween(
                    AppointmentKey.dayStart(date),
                    AppointmentKey.dayEnd(date)
            );
            weekly.add(new DashboardView.DayBookingView(
                    date.toString(),
                    slotPolicy.dayLabel(date),
                    slotPolicy.shortDate(date),
                    dayAppointments.size(),
                    dayAvailable
            ));
        }

        List<Appointment> upcomingRaw = scheduleTree.valuesBetween(
                AppointmentKey.dayStart(today),
                AppointmentKey.afterDate(today, SlotPolicy.SEARCH_HORIZON_DAYS)
        );
        List<DashboardView.UpcomingAppointmentView> upcoming = upcomingRaw.stream()
                .filter(appointment -> !slotPolicy.isPast(
                        appointment.getAppointmentDate(),
                        appointment.getAppointmentTime()
                ))
                .limit(5)
                .map(appointment -> new DashboardView.UpcomingAppointmentView(
                        appointment.getId(),
                        appointment.getPatientName(),
                        appointment.getAppointmentDate().toString(),
                        slotPolicy.formatTime(appointment.getAppointmentTime()),
                        slotPolicy.dayLabel(appointment.getAppointmentDate()) + ", "
                                + slotPolicy.shortDate(appointment.getAppointmentDate())
                ))
                .toList();

        AvlTree.ValidationResult validation = scheduleTree.validate();
        return new DashboardView(
                total,
                booked,
                cancelled,
                available,
                SlotPolicy.DASHBOARD_DAYS,
                scheduleTree.size(),
                scheduleTree.height(),
                scheduleTree.rootKey() == null ? null : scheduleTree.rootKey().displayKey(),
                validation.valid(),
                nextAvailableAppointment(),
                weekly,
                upcoming
        );
    }

    public AvailabilityView availability(LocalDate date) {
        if (date == null) {
            throw new BusinessValidationException("A date is required.");
        }
        Map<LocalTime, Appointment> bookedByTime = new HashMap<>();
        scheduleTree.valuesBetween(AppointmentKey.dayStart(date), AppointmentKey.dayEnd(date))
                .forEach(appointment -> bookedByTime.put(appointment.getAppointmentTime(), appointment));

        List<AvailabilityView.SlotView> slots = slotPolicy.slots().stream()
                .map(time -> {
                    Appointment bookedAppointment = bookedByTime.get(time);
                    boolean selectable = date.getDayOfWeek() != DayOfWeek.SUNDAY
                            && !slotPolicy.isPast(date, time)
                            && bookedAppointment == null;
                    return new AvailabilityView.SlotView(
                            slotPolicy.formatTime(time),
                            selectable,
                            bookedAppointment == null ? null : bookedAppointment.getId()
                    );
                })
                .toList();

        return new AvailabilityView(date.toString(), slots, nextAvailableAppointment());
    }

    public NextAvailableView nextAvailableAppointment() {
        LocalDate today = LocalDate.now();
        for (int offset = 0; offset <= SlotPolicy.SEARCH_HORIZON_DAYS; offset++) {
            LocalDate date = today.plusDays(offset);
            if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                continue;
            }
            for (LocalTime time : slotPolicy.slots()) {
                if (!slotPolicy.isPast(date, time) && !isSlotBooked(date, time)) {
                    return toNextAvailable(date, time);
                }
            }
        }
        return null;
    }

    private NextAvailableView toNextAvailable(LocalDate date, LocalTime time) {
        return new NextAvailableView(
                date.toString(),
                slotPolicy.formatTime(time),
                slotPolicy.dayLabel(date),
                slotPolicy.dayLabel(date) + ", " + slotPolicy.shortDate(date) + " at " + slotPolicy.formatTime(time),
                date + "T" + slotPolicy.formatTime(time)
        );
    }

    private int availableSlotCount(LocalDate date) {
        if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            return 0;
        }
        int count = 0;
        for (LocalTime time : slotPolicy.slots()) {
            if (!slotPolicy.isPast(date, time) && !isSlotBooked(date, time)) {
                count++;
            }
        }
        return count;
    }

    /**
     * O(log n) duplicate check. ceilingKey finds the first chronological key at
     * or after the requested slot; if it has the same date/time, the slot is
     * already occupied.
     */
    public boolean isSlotBooked(LocalDate date, LocalTime time) {
        AppointmentKey ceiling = scheduleTree.ceilingKey(AppointmentKey.slotStart(date, time));
        return ceiling != null
                && ceiling.date().equals(date)
                && ceiling.time().equals(time);
    }

    // ------------------------------------------------------------------
    // TRACE BUILDERS
    // ------------------------------------------------------------------

    private AvlOperationView buildInsertOperation(
            Appointment appointment,
            Snapshot<AppointmentKey, Appointment> before,
            InsertResult<AppointmentKey, Appointment> insertion
    ) {
        AppointmentKey key = AppointmentKey.of(appointment);
        TreeView beforeTree = treeViewMapper.toTreeView(before);
        TreeView finalTree = treeViewMapper.toTreeView(insertion.finalSnapshot());

        List<OperationStepView> steps = new ArrayList<>();
        String pathText = insertion.path().isEmpty()
                ? "The tree was empty."
                : insertion.path().stream().map(AppointmentKey::displayKey)
                        .reduce((left, right) -> left + " -> " + right).orElse("");
        addStep(steps, "Compare keys from the root", "Visited: " + pathText, "COMPARE");
        addStep(
                steps,
                "Insert the new node",
                "Placed " + key.displayKey() + " at the correct BST position.",
                "INSERT"
        );
        addStep(
                steps,
                "Update heights and balance factors",
                "Recomputed height and BF while unwinding the insertion path.",
                "UPDATE"
        );

        if (insertion.rotations().isEmpty()) {
            addStep(steps, "Check balance", "Every node still has a balance factor in [-1, 1]. No rotation needed.", "BALANCE");
        } else {
            for (Rotation<AppointmentKey, Appointment> rotation : insertion.rotations()) {
                addStep(
                        steps,
                        rotation.caseType() + " rotation",
                        rotation.action() + ". " + rotation.explanation(),
                        "ROTATE"
                );
            }
            addStep(
                    steps,
                    "Verify the AVL property",
                    "All nodes are balanced after " + insertion.rotations().size() + " rotation(s).",
                    "VERIFY"
            );
        }

        List<TraceFrameView> frames = new ArrayList<>();
        frames.add(new TraceFrameView(
                "Before insertion",
                "Current backend tree before " + key.displayKey() + " is inserted.",
                null, null,
                insertion.path().stream().map(AppointmentKey::displayKey).toList(),
                beforeTree
        ));

        if (insertion.rotations().isEmpty()) {
            frames.add(new TraceFrameView(
                    "Balanced after insertion",
                    "The node was inserted and every balance factor remains in [-1, 1].",
                    null, null,
                    List.of(key.displayKey()),
                    finalTree
            ));
        } else {
            Rotation<AppointmentKey, Appointment> first = insertion.rotations().get(0);
            frames.add(new TraceFrameView(
                    "Imbalance detected",
                    "Node inserted. The first rotation is required at the highlighted pivot.",
                    first.caseType().name(), first.action(),
                    List.of(first.pivotKey().displayKey(), key.displayKey()),
                    treeViewMapper.toTreeView(first.before())
            ));
            insertion.rotations().forEach(rotation -> frames.add(new TraceFrameView(
                    rotation.action(),
                    rotation.explanation(),
                    rotation.caseType().name(),
                    rotation.action(),
                    List.of(rotation.childKey().displayKey(), rotation.pivotKey().displayKey()),
                    treeViewMapper.toTreeView(rotation.after())
            )));
            frames.add(new TraceFrameView(
                    "Balanced tree",
                    "AVL invariant restored. Height = " + finalTree.height() + ".",
                    null, null,
                    List.of(key.displayKey()),
                    finalTree
            ));
        }

        List<RotationView> rotationViews = insertion.rotations().stream()
                .map(rotation -> new RotationView(
                        rotation.caseType().name(),
                        rotation.action(),
                        rotation.pivotKey().displayKey(),
                        rotation.childKey().displayKey(),
                        rotation.explanation(),
                        treeViewMapper.toTreeView(rotation.before()),
                        treeViewMapper.toTreeView(rotation.after())
                ))
                .toList();

        String message = insertion.rotations().isEmpty()
                ? appointment.getId() + " inserted. The tree stayed balanced."
                : appointment.getId() + " inserted with " + insertion.rotations().size() + " rotation(s).";

        return new AvlOperationView(
                "INSERT",
                true,
                message,
                AppointmentView.from(appointment),
                key.displayKey(),
                insertion.path().stream().map(AppointmentKey::displayKey).toList(),
                List.copyOf(steps),
                List.copyOf(frames),
                rotationViews,
                beforeTree,
                finalTree
        );
    }

    private AvlOperationView buildDeleteOperation(
            Appointment appointment,
            AppointmentKey key,
            Snapshot<AppointmentKey, Appointment> before,
            DeleteResult<AppointmentKey, Appointment> deletion
    ) {
        TreeView beforeTree = treeViewMapper.toTreeView(before);
        List<OperationStepView> steps = new ArrayList<>();
        String pathText = deletion.path().isEmpty()
                ? "No path recorded."
                : deletion.path().stream().map(AppointmentKey::displayKey)
                        .reduce((left, right) -> left + " -> " + right).orElse("");
        addStep(steps, "Search for the appointment key", "Visited: " + pathText, "COMPARE");
        addStep(
                steps,
                "Remove the node",
                "The BST node was removed. If it had two children, the in-order successor replaced it.",
                "DELETE"
        );
        addStep(
                steps,
                "Update heights and balance factors",
                "Recomputed metrics while unwinding the deletion path.",
                "UPDATE"
        );

        if (deletion.rotations().isEmpty()) {
            addStep(steps, "Check balance", "No rotation was required after deletion.", "BALANCE");
        } else {
            for (Rotation<AppointmentKey, Appointment> rotation : deletion.rotations()) {
                addStep(
                        steps,
                        rotation.caseType() + " rotation",
                        rotation.action() + ". " + rotation.explanation(),
                        "ROTATE"
                );
            }
            addStep(
                    steps,
                    "Verify the AVL property",
                    "The tree is balanced after " + deletion.rotations().size() + " rotation(s).",
                    "VERIFY"
            );
        }

        List<TraceFrameView> frames = new ArrayList<>();
        frames.add(new TraceFrameView(
                "Before cancellation",
                "Captured the active AVL tree before removing " + key.displayKey() + ".",
                null, null,
                List.of(key.displayKey()),
                beforeTree
        ));

        if (deletion.rotations().isEmpty()) {
            frames.add(new TraceFrameView(
                    "Node removed",
                    "The active booking was removed and the tree remains balanced.",
                    "DELETE", "Remove node",
                    List.of(),
                    treeViewMapper.toTreeView(deletion.finalSnapshot())
            ));
        } else {
            Rotation<AppointmentKey, Appointment> first = deletion.rotations().get(0);
            frames.add(new TraceFrameView(
                    "Imbalance after deletion",
                    "The node was removed. Rebalancing starts at the highlighted pivot.",
                    first.caseType().name(), first.action(),
                    List.of(first.pivotKey().displayKey()),
                    treeViewMapper.toTreeView(first.before())
            ));
            deletion.rotations().forEach(rotation -> frames.add(new TraceFrameView(
                    rotation.action(),
                    rotation.explanation(),
                    rotation.caseType().name(),
                    rotation.action(),
                    List.of(rotation.childKey().displayKey(), rotation.pivotKey().displayKey()),
                    treeViewMapper.toTreeView(rotation.after())
            )));
            frames.add(new TraceFrameView(
                    "Balanced tree",
                    "Deletion complete. Height = " + deletion.finalSnapshot().height() + ".",
                    null, null,
                    List.of(),
                    treeViewMapper.toTreeView(deletion.finalSnapshot())
            ));
        }

        List<RotationView> rotationViews = deletion.rotations().stream()
                .map(rotation -> new RotationView(
                        rotation.caseType().name(),
                        rotation.action(),
                        rotation.pivotKey().displayKey(),
                        rotation.childKey().displayKey(),
                        rotation.explanation(),
                        treeViewMapper.toTreeView(rotation.before()),
                        treeViewMapper.toTreeView(rotation.after())
                ))
                .toList();

        return new AvlOperationView(
                "DELETE",
                true,
                appointment.getId() + " cancelled and removed from the active AVL tree.",
                AppointmentView.from(appointment),
                key.displayKey(),
                deletion.path().stream().map(AppointmentKey::displayKey).toList(),
                List.copyOf(steps),
                List.copyOf(frames),
                rotationViews,
                beforeTree,
                treeViewMapper.toTreeView(deletion.finalSnapshot())
        );
    }

    private void addStep(List<OperationStepView> steps, String title, String detail, String type) {
        steps.add(new OperationStepView(steps.size() + 1, title, detail, type));
    }

    public Map<String, Object> dataSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("persistedRecords", repository.count());
        summary.put("activeTreeNodes", scheduleTree.size());
        summary.put("idIndexNodes", idIndex.size());
        summary.put("treeHeight", scheduleTree.height());
        summary.put("treeBalanced", scheduleTree.validate().valid());
        return summary;
    }
}
