package com.smartclinic.appointments.dto;

import com.smartclinic.appointments.model.Appointment;
import com.smartclinic.appointments.model.AppointmentStatus;

public record AppointmentView(
        String id,
        String patientName,
        String email,
        String phone,
        String appointmentDate,
        String appointmentTime,
        String description,
        AppointmentStatus status,
        String createdAt,
        String cancelledAt
) {
    public static AppointmentView from(Appointment appointment) {
        return new AppointmentView(
                appointment.getId(),
                appointment.getPatientName(),
                appointment.getEmail(),
                appointment.getPhone(),
                appointment.getAppointmentDate().toString(),
                appointment.getAppointmentTime().toString().substring(0, 5),
                appointment.getDescription(),
                appointment.getStatus(),
                appointment.getCreatedAt() == null ? null : appointment.getCreatedAt().toString(),
                appointment.getCancelledAt() == null ? null : appointment.getCancelledAt().toString()
        );
    }
}
