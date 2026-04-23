package tripmindai.com.mk.maintravelservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tripmindai.com.mk.maintravelservice.model.TripPlan;

import java.util.List;

public interface TripPlanRepository extends JpaRepository<TripPlan, Long> {
    List<TripPlan> findByUsernameOrderByCreatedAtDesc(String username);
}