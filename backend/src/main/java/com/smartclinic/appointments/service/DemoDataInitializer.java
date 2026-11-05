package com.smartclinic.appointments.service;

import com.smartclinic.appointments.dto.AppointmentView;
import com.smartclinic.appointments.dto.BookingRequest;
import com.smartclinic.appointments.repository.AppointmentRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Inserts a small, realistic demo schedule on the very first run. These are
 * normal service bookings, so every record is persisted and inserted through
 * the real AVL tree. Set app.seed-demo-data=false to start empty.
 */
@Component
public class DemoDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private final AppointmentService appointmentService;
    private final AppointmentRepository repository;
    private final boolean enabled;

    public DemoDataInitializer(
            AppointmentService appointmentService,
            AppointmentRepository repository,
            @Value("${app.seed-demo-data:true}") boolean enabled
    ) {
        this.appointmentService = appointmentService;
        this.repository = repository;
        this.enabled = enabled;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        if (!enabled || repository.count() > 0) {
            return;
        }

        List<DemoBooking> bookings = new ArrayList<>();
        bookings.add(new DemoBooking("Aarav Mehta", "aarav.mehta@example.com", "+91 98765 43210",
                9, LocalTime.of(10, 0), "Routine cardiac consultation."));
        bookings.add(new DemoBooking("Diya Sharma", "diya.sharma@example.com", "+91 98765 43211",
                3, LocalTime.of(9, 30), "Follow-up for seasonal allergy."));
        bookings.add(new DemoBooking("Kabir Nair", "kabir.nair@example.com", "+91 98765 43212",
                15, LocalTime.of(11, 30), "Blood pressure review."));
        bookings.add(new DemoBooking("Ishita Rao", "ishita.rao@example.com", "+91 98765 43213",
                2, LocalTime.of(14, 0), "General wellness check."));
        bookings.add(new DemoBooking("Vihaan Kapoor", "vihaan.kapoor@example.com", "+91 98765 43214",
                7, LocalTime.of(10, 30), "Persistent migraine assessment."));
        bookings.add(new DemoBooking("Ananya Iyer", "ananya.iyer@example.com", "+91 98765 43215",
                20, LocalTime.of(15, 0), "Annual diabetes screening."));
        bookings.add(new DemoBooking("Rohan Verma", "rohan.verma@example.com", "+91 98765 43216",
                4, LocalTime.of(13, 0), "Physiotherapy consultation."));
        bookings.add(new DemoBooking("Meera Joshi", "meera.joshi@example.com", "+91 98765 43217",
                12, LocalTime.of(12, 0), "Post-treatment review."));
        bookings.add(new DemoBooking("Arjun Patel", "arjun.patel@example.com", "+91 98765 43218",
                25, LocalTime.of(9, 0), "Routine health check."));
        bookings.add(new DemoBooking("Saanvi Desai", "saanvi.desai@example.com", "+91 98765 43219",
                6, LocalTime.of(16, 0), "Nutrition and lifestyle consultation."));
        bookings.add(new DemoBooking("Neel Bansal", "neel.bansal@example.com", "+91 98765 43220",
                18, LocalTime.of(11, 0), "Skin allergy consultation."));

        List<AppointmentView> created = new ArrayList<>();
        for (DemoBooking booking : bookings) {
            LocalDate date = futureDate(booking.dayOffset());
            created.add(appointmentService.book(new BookingRequest(
                    booking.name(),
                    booking.email(),
                    booking.phone(),
                    date,
                    booking.time(),
                    booking.description()
            )));
        }

        // Realistic status mix: two records are cancelled and therefore absent
        // from the active AVL tree but remain visible in Manage Appointments.
        if (created.size() >= 10) {
            appointmentService.cancelAppointment(created.get(9).id());
            appointmentService.cancelAppointment(created.get(10).id());
        }
        log.info("Seeded {} demo appointments through the real AVL booking service.", created.size());
    }

    private LocalDate futureDate(int offset) {
        LocalDate date = LocalDate.now().plusDays(offset);
        while (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return date;
    }

    private record DemoBooking(
            String name,
            String email,
            String phone,
            int dayOffset,
            LocalTime time,
            String description
    ) {
    }
}
