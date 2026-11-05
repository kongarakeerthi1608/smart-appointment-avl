package com.smartclinic.appointments.dto;

import java.util.List;

public record TraversalView(
        List<TraversalItemView> inorder,
        List<TraversalItemView> preorder,
        List<TraversalItemView> postorder
) {
    public record TraversalItemView(
            String id,
            String key,
            String patientName,
            String date,
            String time
    ) {
    }
}
