package com.smartclinic.appointments.dto;

import java.util.List;

public record TraceFrameView(
        String title,
        String detail,
        String rotationType,
        String action,
        List<String> highlightKeys,
        TreeView tree
) {
}
