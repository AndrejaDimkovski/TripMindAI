package travelmindai.com.mk.maintravelservice.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name="reservations")
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private String username;

    @Column(nullable=false)
    private String type; // "FLIGHT" или "HOTEL"

    @Column(columnDefinition = "text", nullable=false)
    private String payloadJson;

    @Column(nullable=false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // getters/setters
}
