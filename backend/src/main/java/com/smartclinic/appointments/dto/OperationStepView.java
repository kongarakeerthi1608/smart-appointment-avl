package com.smartclinic.appointments.dto;

public record OperationStepView(
        int number,
        String title,
        String detail,
        String type
) {
}
