package com.smartclinic.appointments.dto;

import java.util.List;

public record TreeHealthView(
        boolean valid,
        int nodesChecked,
        int size,
        int height,
        boolean balanced,
        String rootKey,
        List<String> errors
) {
}
