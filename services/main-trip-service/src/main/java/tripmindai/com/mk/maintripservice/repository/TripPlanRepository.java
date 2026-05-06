package tripmindai.com.mk.maintripservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import tripmindai.com.mk.maintripservice.dto.admin.AdminMetricItemDto;
import tripmindai.com.mk.maintripservice.model.TripPlan;

import java.util.List;

public interface TripPlanRepository extends JpaRepository<TripPlan, Long> {
    List<TripPlan> findByUsernameOrderByCreatedAtDesc(String username);

    long countByTripMode(String tripMode);

    @Query("select count(distinct p.username) from TripPlan p")
    long countDistinctUsernamesWithPlans();

    @Query("""
            select new tripmindai.com.mk.maintripservice.dto.admin.AdminMetricItemDto(p.destinationName, count(p))
            from TripPlan p
            group by p.destinationName
            order by count(p) desc, p.destinationName asc
            """)
    List<AdminMetricItemDto> findTopDestinations(Pageable pageable);

    @Query("""
            select new tripmindai.com.mk.maintripservice.dto.admin.AdminMetricItemDto(p.countryName, count(p))
            from TripPlan p
            group by p.countryName
            order by count(p) desc, p.countryName asc
            """)
    List<AdminMetricItemDto> findTopCountries(Pageable pageable);
}
