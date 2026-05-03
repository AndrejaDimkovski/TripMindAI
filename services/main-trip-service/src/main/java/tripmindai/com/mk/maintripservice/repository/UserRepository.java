package tripmindai.com.mk.maintripservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tripmindai.com.mk.maintripservice.model.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByUsername(String username);

    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByPasswordResetTokenHash(String passwordResetTokenHash);
}