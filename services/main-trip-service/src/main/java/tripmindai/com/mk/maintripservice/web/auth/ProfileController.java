package tripmindai.com.mk.maintripservice.web.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tripmindai.com.mk.maintripservice.model.User;
import tripmindai.com.mk.maintripservice.repository.UserRepository;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public ProfileController(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    public record UpdateProfileReq(String firstName, String lastName, String email) {
    }

    public record ChangePasswordReq(String oldPassword, String newPassword, String confirmPassword) {
    }

    @PutMapping
    public Object updateProfile(@RequestBody UpdateProfileReq req, Authentication auth) {
        User user = getAuthenticatedUser(auth);

        String firstName = trim(req.firstName());
        String lastName = trim(req.lastName());
        String email = normalizeEmail(req.email());

        if (firstName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "firstName required");
        }
        if (lastName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lastName required");
        }
        if (email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email required");
        }

        var existing = users.findByEmailIgnoreCase(email);
        if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email already in use");
        }

        boolean emailChanged = !user.getEmail().equalsIgnoreCase(email);

        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(email);

        if (emailChanged) {
            user.setEmailVerified(false);
        }

        users.save(user);

        return new Object() {
            public final String message = "Profile updated successfully";
        };
    }

    @PostMapping("/change-password")
    public Object changePassword(@RequestBody ChangePasswordReq req, Authentication auth) {
        User user = getAuthenticatedUser(auth);

        String oldPassword = trim(req.oldPassword());
        String newPassword = trim(req.newPassword());
        String confirmPassword = trim(req.confirmPassword());

        if (oldPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "oldPassword required");
        }
        if (newPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "newPassword required");
        }
        if (confirmPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "confirmPassword required");
        }
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "old password is incorrect");
        }
        if (!newPassword.equals(confirmPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "new passwords do not match");
        }
        if (newPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "new password too short");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        users.save(user);

        return new Object() {
            public final String message = "Password changed successfully";
        };
    }

    private User getAuthenticatedUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "not authenticated");
        }

        return users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
    }

    private String normalizeEmail(String value) {
        return trim(value).toLowerCase();
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
