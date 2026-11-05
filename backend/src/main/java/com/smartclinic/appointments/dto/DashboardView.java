package com.smartclinic.appointments.dto;

import java.util.List;

public record DashboardView(
        long totalAppointments,
        long bookedAppointments,
        long cancelledAppointments,
        int availableSlots,
        int availabilityDays,
        int activeTreeNodeCount,
        int treeHeight,
        String rootKey,
        boolean treeBalanced,
        NextAvailableView nextAvailable,
        List<DayBookingView> weeklyBookings,
        List<UpcomingAppointmentView> upcoming
) {
    public record DayBookingView(
            String date,
            String dayLabel,
            String shortDate,
            long booked,
            int available
    ) {
    }

    public record UpcomingAppointmentView(
            String id,
            String patientName,
            String date,
            String time,
            String dateLabel
    ) {
    }
}
