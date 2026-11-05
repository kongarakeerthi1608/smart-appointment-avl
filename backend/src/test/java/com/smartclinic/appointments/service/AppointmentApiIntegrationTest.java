package com.smartclinic.appointments.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
        "app.seed-demo-data=false",
        "spring.datasource.url=jdbc:h2:mem:appointment-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class AppointmentApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AppointmentService appointmentService;

    private LocalDate date;

    @BeforeEach
    void setUp() {
        appointmentService.resetAllData();
        date = LocalDate.now().plusDays(10);
        while (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
    }

    @Test
    void booksSearchesPreventsDuplicatesAndCancels() throws Exception {
        String body = bookingJson("Aarav Mehta", "aarav@example.com", date, "10:00");

        MvcResult created = mockMvc.perform(post("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("APT-0001"))
                .andExpect(jsonPath("$.status").value("BOOKED"))
                .andReturn();

        JsonNode appointment = objectMapper.readTree(created.getResponse().getContentAsString());
        String id = appointment.get("id").asText();

        mockMvc.perform(post("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/avl/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"appointmentId\":\"" + id + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.appointment.id").value(id));

        mockMvc.perform(get("/api/avl/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.balanced").value(true));

        mockMvc.perform(post("/api/appointments/" + id + "/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.operation").value("DELETE"));

        mockMvc.perform(get("/api/avl/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(0));

        mockMvc.perform(get("/api/appointments/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void returnsAvailabilityAndNextSlotFromTheTree() throws Exception {
        mockMvc.perform(post("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Diya Sharma", "diya@example.com", date, "09:00")))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/appointments/availability").param("date", date.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots[0].time").value("09:00"))
                .andExpect(jsonPath("$.slots[0].available").value(false))
                .andExpect(jsonPath("$.slots[1].time").value("09:30"))
                .andExpect(jsonPath("$.slots[1].available").value(true));

        mockMvc.perform(get("/api/appointments/next-available"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slotKey").isNotEmpty());
    }

    @Test
    void validationRejectsInvalidEmailAndPastDate() throws Exception {
        mockMvc.perform(post("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("A", "not-an-email", LocalDate.now().minusDays(2), "10:00")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors").isNotEmpty());

        mockMvc.perform(post("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Valid Name", "valid@example.com", date, "10:15")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void insertsSampleAndSupportsReset() throws Exception {
        mockMvc.perform(post("/api/avl/sample"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.operation").value("INSERT"))
                .andExpect(jsonPath("$.steps").isArray());

        mockMvc.perform(get("/api/avl/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(1));

        mockMvc.perform(post("/api/avl/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/avl/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(0));
    }

    @Test
    void deleteEndpointRemovesActiveNode() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingJson("Meera Joshi", "meera@example.com", date, "11:00")))
                .andReturn();
        String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(delete("/api/avl/appointments/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/avl/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.size").value(0));
    }

    private String bookingJson(String name, String email, LocalDate date, String time) {
        return """
                {
                  "patientName": "%s",
                  "email": "%s",
                  "phone": "+91 98765 43210",
                  "appointmentDate": "%s",
                  "appointmentTime": "%s",
                  "description": "Routine consultation for integration testing."
                }
                """.formatted(name, email, date, LocalTime.parse(time));
    }
}
