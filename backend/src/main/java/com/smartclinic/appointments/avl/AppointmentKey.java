package com.smartclinic.appointments.avl;

import com.smartclinic.appointments.model.Appointment;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;

/**
 * Composite AVL key: appointment date + appointment time + unique ID.
 *
 * <p>The date and time come first so an in-order traversal is also a
 * chronological schedule. The unique ID is the final tie-breaker, which allows
 * multiple appointments at the same minute without key collisions.</p>
 */
public record AppointmentKey(LocalDate date, LocalTime time, String id) implements Comparable<AppointmentKey> {

    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.BASIC_ISO_DATE;
    private static final DateTimeFormatter KEY_TIME = DateTimeFormatter.ofPattern("HHmm");

    public static final Comparator<AppointmentKey> ORDER =
            Comparator.comparing(AppointmentKey::date)
                    .thenComparing(AppointmentKey::time)
                    .thenComparing(AppointmentKey::id);

    public static AppointmentKey of(Appointment appointment) {
        return new AppointmentKey(
                appointment.getAppointmentDate(),
                appointment.getAppointmentTime(),
                appointment.getId()
        );
    }

    public static AppointmentKey slotStart(LocalDate date, LocalTime time) {
        return new AppointmentKey(date, time, "");
    }

    public static AppointmentKey dayStart(LocalDate date) {
        return new AppointmentKey(date, LocalTime.MIN, "");
    }

    public static AppointmentKey dayEnd(LocalDate date) {
        return new AppointmentKey(date.plusDays(1), LocalTime.MIN, "");
    }

    public static AppointmentKey afterDate(LocalDate date, int days) {
        return new AppointmentKey(date.plusDays(days), LocalTime.MIN, "");
    }

    public String slotKey() {
        return date + "T" + time;
    }

    public String displayKey() {
        return KEY_DATE.format(date) + "-" + KEY_TIME.format(time) + "-" + id;
    }

    @Override
    public int compareTo(AppointmentKey other) {
        return ORDER.compare(this, other);
    }
}
