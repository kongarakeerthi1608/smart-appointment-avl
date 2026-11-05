package com.smartclinic.appointments.controller;

import com.smartclinic.appointments.dto.AppointmentView;
import com.smartclinic.appointments.dto.AvailabilityView;
import com.smartclinic.appointments.dto.AvlOperationView;
import com.smartclinic.appointments.dto.BookingRequest;
import com.smartclinic.appointments.dto.NextAvailableView;
import com.smartclinic.appointments.exception.BusinessValidationException;
import com.smartclinic.appointments.model.AppointmentStatus;
import com.smartclinic.appointments.service.AppointmentService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public ResponseEntity<AppointmentView> book(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(appointmentService.book(request));
    }

    @GetMapping
    public List<AppointmentView> list(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status
    ) {
        return appointmentService.listAppointments(query, parseStatus(status));
    }

    @GetMapping("/{id}")
    public AppointmentView get(@PathVariable String id) {
        return appointmentService.getAppointment(id);
    }

    @PostMapping("/{id}/cancel")
    public AvlOperationView cancel(@PathVariable String id) {
        return appointmentService.cancelAppointment(id);
    }

    @GetMapping("/availability")
    public AvailabilityView availability(@RequestParam String date) {
        try {
            return appointmentService.availability(LocalDate.parse(date));
        } catch (java.time.format.DateTimeParseException exception) {
            throw new BusinessValidationException("Date must use the yyyy-MM-dd format.");
        }
    }

    @GetMapping("/next-available")
    public ResponseEntity<NextAvailableView> nextAvailable() {
        NextAvailableView next = appointmentService.nextAvailableAppointment();
        return next == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(next);
    }

    private AppointmentStatus parseStatus(String status) {
        if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) {
            return null;
        }
        try {
            return AppointmentStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BusinessValidationException("Status must be BOOKED, CANCELLED or ALL.");
        }
    }
}
