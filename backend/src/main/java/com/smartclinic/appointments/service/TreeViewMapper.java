package com.smartclinic.appointments.service;

import com.smartclinic.appointments.avl.AppointmentKey;
import com.smartclinic.appointments.avl.AvlTree;
import com.smartclinic.appointments.dto.TreeNodeView;
import com.smartclinic.appointments.dto.TreeView;
import com.smartclinic.appointments.dto.TraversalView;
import com.smartclinic.appointments.model.Appointment;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class TreeViewMapper {

    public TreeView toTreeView(AvlTree.Snapshot<AppointmentKey, Appointment> snapshot) {
        if (snapshot == null) {
            return TreeView.empty();
        }
        return new TreeView(
                toNode(snapshot.root()),
                snapshot.size(),
                snapshot.height(),
                snapshot.balanced(),
                snapshot.root() == null ? null : snapshot.root().key().displayKey(),
                List.of()
        );
    }

    private TreeNodeView toNode(AvlTree.NodeData<AppointmentKey, Appointment> node) {
        if (node == null) {
            return null;
        }
        Appointment appointment = node.value();
        AppointmentKey key = node.key();
        return new TreeNodeView(
                key.displayKey(),
                appointment.getId(),
                appointment.getPatientName(),
                key.date().toString(),
                key.time().toString().substring(0, 5),
                appointment.getStatus().name(),
                node.height(),
                node.balanceFactor(),
                toNode(node.left()),
                toNode(node.right())
        );
    }

    public TraversalView toTraversalView(
            List<Appointment> inorder,
            List<Appointment> preorder,
            List<Appointment> postorder
    ) {
        return new TraversalView(
                inorder.stream().map(this::toTraversalItem).toList(),
                preorder.stream().map(this::toTraversalItem).toList(),
                postorder.stream().map(this::toTraversalItem).toList()
        );
    }

    private TraversalView.TraversalItemView toTraversalItem(Appointment appointment) {
        return new TraversalView.TraversalItemView(
                appointment.getId(),
                AppointmentKey.of(appointment).displayKey(),
                appointment.getPatientName(),
                appointment.getAppointmentDate().toString(),
                appointment.getAppointmentTime().toString().substring(0, 5)
        );
    }
}
