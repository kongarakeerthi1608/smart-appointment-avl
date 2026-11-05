package com.smartclinic.appointments.dto;

import java.util.List;

public record AvlOperationView(
        String operation,
        boolean success,
        String message,
        AppointmentView appointment,
        String highlightedKey,
        List<String> searchPath,
        List<OperationStepView> steps,
        List<TraceFrameView> frames,
        List<RotationView> rotations,
        TreeView beforeTree,
        TreeView tree
) {
}
