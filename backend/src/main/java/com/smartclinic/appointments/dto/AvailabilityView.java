package com.smartclinic.appointments.dto;

import java.util.List;

public record AvailabilityView(
        String date,
        List<SlotView> slots,
        NextAvailableView nextAvailable
) {
    public record SlotView(String time, boolean available, String appointmentId) {
    }
}
