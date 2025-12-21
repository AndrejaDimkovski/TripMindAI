package travelmindai.com.mk.maintravelservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import travelmindai.com.mk.maintravelservice.model.Reservation;

import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByUsernameOrderByCreatedAtDesc(String username);
}

