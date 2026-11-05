package com.smartclinic.appointments.repository;

import com.smartclinic.appointments.model.Appointment;
import com.smartclinic.appointments.model.AppointmentStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    List<Appointment> findByStatusOrderByAppointmentDateAscAppointmentTimeAsc(AppointmentStatus status);

    long countByStatus(AppointmentStatus status);
}
