package com.smartclinic.appointments.controller;

import com.smartclinic.appointments.service.AppointmentService;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SystemController {

    private final AppointmentService appointmentService;

    public SystemController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "Smart Appointment AVL API",
                "timestamp", Instant.now().toString(),
                "avl", appointmentService.dataSummary()
        );
    }
}
