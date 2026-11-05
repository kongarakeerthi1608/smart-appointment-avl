package com.smartclinic.appointments.dto;

public record RotationView(
        String caseType,
        String action,
        String pivotKey,
        String childKey,
        String explanation,
        TreeView before,
        TreeView after
) {
}
