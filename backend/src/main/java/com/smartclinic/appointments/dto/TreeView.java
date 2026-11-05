package com.smartclinic.appointments.dto;

import java.util.List;

public record TreeView(
        TreeNodeView root,
        int size,
        int height,
        boolean balanced,
        String rootKey,
        List<String> errors
) {
    public static TreeView empty() {
        return new TreeView(null, 0, 0, true, null, List.of());
    }
}
