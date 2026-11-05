package com.smartclinic.appointments.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Clinic booking policy: 30-minute slots from 09:00 through 16:30.
 *
 * <p>Keeping this policy in one place means the tree duplicate check,
 * availability calculation and next-slot search all agree.</p>
 */
@Component
public class SlotPolicy {

    public static final int DASHBOARD_DAYS = 7;
    public static final int SEARCH_HORIZON_DAYS = 60;

    private static final LocalTime FIRST_SLOT = LocalTime.of(9, 0);
    private static final LocalTime LAST_SLOT = LocalTime.of(16, 30);
    private static final int INTERVAL_MINUTES = 30;
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DAY_FORMAT = DateTimeFormatter.ofPattern("EEE");
    private static final DateTimeFormatter SHORT_DATE = DateTimeFormatter.ofPattern("dd MMM");
    private static final DateTimeFormatter FULL_DATE = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy");

    private final List<LocalTime> slots;

    public SlotPolicy() {
        List<LocalTime> generated = new ArrayList<>();
        LocalTime cursor = FIRST_SLOT;
        while (!cursor.isAfter(LAST_SLOT)) {
            generated.add(cursor);
            cursor = cursor.plusMinutes(INTERVAL_MINUTES);
        }
        this.slots = List.copyOf(generated);
    }

    public List<LocalTime> slots() {
        return slots;
    }

    public boolean isKnownSlot(LocalTime time) {
        return time != null && slots.contains(time);
    }

    public boolean isPast(LocalDate date, LocalTime time) {
        if (date == null || time == null) {
            return true;
        }
        return LocalDateTime.of(date, time).isBefore(LocalDateTime.now().plusMinutes(1));
    }

    public String formatTime(LocalTime time) {
        return TIME_FORMAT.format(time);
    }

    public String dayLabel(LocalDate date) {
        if (date.equals(LocalDate.now())) {
            return "Today";
        }
        if (date.equals(LocalDate.now().plusDays(1))) {
            return "Tomorrow";
        }
        return DAY_FORMAT.format(date);
    }

    public String shortDate(LocalDate date) {
        return SHORT_DATE.format(date);
    }

    public String fullDate(LocalDate date) {
        return FULL_DATE.format(date);
    }

    public boolean isClinicDay(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SUNDAY;
    }
}
