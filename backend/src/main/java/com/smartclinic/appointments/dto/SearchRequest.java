package com.smartclinic.appointments.dto;

import jakarta.validation.constraints.NotBlank;

public record SearchRequest(
        @NotBlank(message = "Appointment ID is required.")
        String appointmentId
) {
}
