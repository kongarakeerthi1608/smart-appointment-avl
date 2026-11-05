package com.smartclinic.appointments.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(
        name = "appointments",
        indexes = {
                @Index(name = "idx_appointment_slot", columnList = "appointmentDate,appointmentTime"),
                @Index(name = "idx_appointment_status", columnList = "status")
        }
)
public class Appointment {

    @Id
    @Column(length = 32, nullable = false)
    private String id;

    @Column(nullable = false, length = 120)
    private String patientName;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(nullable = false, length = 24)
    private String phone;

    @Column(nullable = false)
    private LocalDate appointmentDate;

    @Column(nullable = false)
    private LocalTime appointmentTime;

    @Column(nullable = false, length = 600)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentStatus status = AppointmentStatus.BOOKED;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime cancelledAt;

    protected Appointment() {
        // Required by JPA.
    }

    public Appointment(
            String id,
            String patientName,
            String email,
            String phone,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            String description,
            LocalDateTime createdAt
    ) {
        this.id = id;
        this.patientName = patientName;
        this.email = email;
        this.phone = phone;
        this.appointmentDate = appointmentDate;
        this.appointmentTime = appointmentTime;
        this.description = description;
        this.createdAt = createdAt;
        this.status = AppointmentStatus.BOOKED;
    }

    public String getId() {
        return id;
    }

    public String getPatientName() {
        return patientName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public LocalDate getAppointmentDate() {
        return appointmentDate;
    }

    public LocalTime getAppointmentTime() {
        return appointmentTime;
    }

    public String getDescription() {
        return description;
    }

    public AppointmentStatus getStatus() {
        return status;
    }

    public void setStatus(AppointmentStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(LocalDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }
}
