package tripmindai.com.mk.maintravelservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tripmindai.com.mk.maintravelservice.model.Destination;

import java.util.List;
import java.util.Optional;

public interface DestinationRepository extends JpaRepository<Destination, Long> {


    List<Destination> findByCountry_CodeIgnoreCaseOrderByNameAsc(String code);
    Optional<Destination> findByCityCodeIgnoreCase(String cityCode);
    List<Destination> findTop5ByOrderByNameAsc();
}