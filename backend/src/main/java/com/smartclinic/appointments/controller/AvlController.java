package com.smartclinic.appointments.controller;

import com.smartclinic.appointments.dto.AvlOperationView;
import com.smartclinic.appointments.dto.SearchRequest;
import com.smartclinic.appointments.dto.TraversalView;
import com.smartclinic.appointments.dto.TreeHealthView;
import com.smartclinic.appointments.dto.TreeView;
import com.smartclinic.appointments.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/avl")
public class AvlController {

    private final AppointmentService appointmentService;

    public AvlController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @GetMapping("/tree")
    public TreeView tree() {
        return appointmentService.treeView();
    }

    @GetMapping("/health")
    public TreeHealthView health() {
        return appointmentService.treeHealth();
    }

    @GetMapping("/traversals")
    public TraversalView traversals() {
        return appointmentService.traversals();
    }

    @PostMapping("/search")
    public AvlOperationView search(@Valid @RequestBody SearchRequest request) {
        return appointmentService.searchAppointment(request.appointmentId());
    }

    @PostMapping("/sample")
    public AvlOperationView insertSample() {
        return appointmentService.insertSampleAppointment();
    }

    @DeleteMapping("/appointments/{id}")
    public AvlOperationView delete(@PathVariable String id) {
        return appointmentService.cancelAppointment(id);
    }

    @PostMapping("/reset")
    public AvlOperationView reset() {
        return appointmentService.resetAllData();
    }
}
