package com.smartclinic.appointments.dto;

public record NextAvailableView(
        String date,
        String time,
        String dayLabel,
        String display,
        String slotKey
) {
}
