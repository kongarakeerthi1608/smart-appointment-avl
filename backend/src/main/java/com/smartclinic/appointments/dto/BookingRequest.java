package com.smartclinic.appointments.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

public record BookingRequest(
        @NotBlank(message = "Patient name is required.")
        @Size(min = 2, max = 120, message = "Patient name must be 2-120 characters.")
        String patientName,

        @NotBlank(message = "Email address is required.")
        @Email(message = "Enter a valid email address.")
        @Size(max = 160, message = "Email address is too long.")
        String email,

        @NotBlank(message = "Phone number is required.")
        @Pattern(
                regexp = "^[+]?[0-9()\\-\\s]{7,20}$",
                message = "Enter a valid phone number (7-20 digits)."
        )
        String phone,

        @NotNull(message = "Appointment date is required.")
        @FutureOrPresent(message = "Appointment date cannot be in the past.")
        LocalDate appointmentDate,

        @NotNull(message = "Appointment time is required.")
        LocalTime appointmentTime,

        @NotBlank(message = "Appointment description is required.")
        @Size(min = 5, max = 600, message = "Description must be 5-600 characters.")
        String description
) {
}
