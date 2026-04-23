package tripmindai.com.mk.maintravelservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tripmindai.com.mk.maintravelservice.model.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByUsername(String username);

    boolean existsByEmailIgnoreCase(String email);
}