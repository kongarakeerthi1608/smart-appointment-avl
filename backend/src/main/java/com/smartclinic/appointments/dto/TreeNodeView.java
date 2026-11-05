package com.smartclinic.appointments.dto;

public record TreeNodeView(
        String key,
        String appointmentId,
        String patientName,
        String date,
        String time,
        String status,
        int height,
        int balanceFactor,
        TreeNodeView left,
        TreeNodeView right
) {
}
