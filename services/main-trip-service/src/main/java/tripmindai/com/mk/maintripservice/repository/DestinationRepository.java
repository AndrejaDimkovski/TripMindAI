package tripmindai.com.mk.maintripservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tripmindai.com.mk.maintripservice.model.Destination;

import java.util.List;
import java.util.Optional;

public interface DestinationRepository extends JpaRepository<Destination, Long> {

    List<Destination> findByCountry_CodeIgnoreCaseOrderByNameAsc(String code);

    List<Destination> findByCountry_NameIgnoreCaseOrderByNameAsc(String countryName);

    Optional<Destination> findByCityCodeIgnoreCase(String cityCode);

    Optional<Destination> findByNameIgnoreCase(String name);

    List<Destination> findTop5ByNameContainingIgnoreCaseOrderByNameAsc(String name);

    List<Destination> findTop5ByOrderByNameAsc();
}
