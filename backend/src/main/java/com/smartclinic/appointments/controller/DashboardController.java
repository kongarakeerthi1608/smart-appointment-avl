package com.smartclinic.appointments.controller;

import com.smartclinic.appointments.dto.DashboardView;
import com.smartclinic.appointments.service.AppointmentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final AppointmentService appointmentService;

    public DashboardController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @GetMapping
    public DashboardView dashboard() {
        return appointmentService.dashboard();
    }
}
