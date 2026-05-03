package tripmindai.com.mk.maintripservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tripmindai.com.mk.maintripservice.model.Country;

import java.util.List;
import java.util.Optional;

public interface CountryRepository extends JpaRepository<Country, Long> {

    Optional<Country> findByCodeIgnoreCase(String code);

    @Query("""
       select distinct c 
       from Country c 
       left join fetch c.destinations
       order by c.name
       """)
    List<Country> findAllWithDestinations();
}
