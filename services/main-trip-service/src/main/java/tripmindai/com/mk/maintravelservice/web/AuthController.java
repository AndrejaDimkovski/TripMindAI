package tripmindai.com.mk.maintravelservice.web;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import org.apache.commons.codec.binary.Base32;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tripmindai.com.mk.maintravelservice.model.Role;
import tripmindai.com.mk.maintravelservice.model.User;
import tripmindai.com.mk.maintravelservice.repository.UserRepository;
import tripmindai.com.mk.maintravelservice.security.JwtService;
import tripmindai.com.mk.maintravelservice.service.EmailService;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$");

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final GoogleAuthenticator googleAuthenticator = new GoogleAuthenticator();
    private final SecureRandom random = new SecureRandom();

    public AuthController(
            UserRepository users,
            PasswordEncoder encoder,
            JwtService jwtService,
            EmailService emailService
    ) {
        this.users = users;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }

    public record RegisterReq(String firstName, String lastName, String email, String password) {
    }

    public record VerifyEmailReq(String email, String code) {
    }

    public record LoginReq(String email, String password) {
    }

    public record Login2FaReq(String email, String code) {
    }

    public record CodeReq(String code) {
    }

    public record Msg(String message) {
    }

    @PostMapping("/register")
    public Object register(@RequestBody RegisterReq req) {
        String firstName = trim(req.firstName());
        String lastName = trim(req.lastName());
        String email = normalizeEmail(req.email());
        String password = req.password() == null ? "" : req.password();

        validateRegistration(firstName, lastName, email, password);

        String username = buildUniqueUsername(email);
        String verificationCode = String.format("%06d", random.nextInt(1_000_000));

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPasswordHash(encoder.encode(password));
        user.setRole(Role.USER);
        user.setEmailVerified(false);
        user.setEmailVerificationCode(verificationCode);
        user.setEmailVerificationExpiry(LocalDateTime.now().plusMinutes(15));
        user.setTwoFactorEnabled(false);
        user.setTotpSecret(null);

        users.save(user);
        emailService.sendVerificationCode(email, verificationCode);

        return new Object() {
            public final String message = "registered";
            public final String emailAddress = email;
            public final boolean requiresEmailVerification = true;
        };
    }

    @PostMapping("/verify-email")
    public Object verifyEmail(@RequestBody VerifyEmailReq req) {
        String email = normalizeEmail(req.email());
        String code = trim(req.code());

        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "user not found"));

        if (user.isEmailVerified()) {
            return new Msg("email already verified");
        }
        if (user.getEmailVerificationCode() == null || user.getEmailVerificationExpiry() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "verification code missing");
        }
        if (user.getEmailVerificationExpiry().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "verification code expired");
        }
        if (!user.getEmailVerificationCode().equals(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid verification code");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationCode(null);
        user.setEmailVerificationExpiry(null);
        users.save(user);

        return new Msg("email verified successfully");
    }

    @PostMapping("/login")
    public Object login(@RequestBody LoginReq req) {
        String email = normalizeEmail(req.email());
        String password = req.password() == null ? "" : req.password();

        if (email.isBlank() || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email/password required");
        }

        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials"));

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "email not verified");
        }
        if (!encoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }

        if (user.isTwoFactorEnabled()) {
            return new Object() {
                public final String message = "2fa required";
                public final boolean requires2fa = true;
                public final String emailAddress = user.getEmail();
            };
        }

        return buildLoginSuccess(user, jwtService.generateToken(user));
    }

    @PostMapping("/login/2fa")
    public Object login2fa(@RequestBody Login2FaReq req) {
        String email = normalizeEmail(req.email());
        String code = trim(req.code());

        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found"));

        if (!user.isTwoFactorEnabled() || user.getTotpSecret() == null || user.getTotpSecret().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2fa is not enabled");
        }

        if (!authorizeTotp(user.getTotpSecret(), code, HttpStatus.UNAUTHORIZED)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid 2fa code");
        }

        return buildLoginSuccess(user, jwtService.generateToken(user));
    }

    @PostMapping("/2fa/setup")
    public Object setup2fa(Authentication auth) {
        User user = getAuthenticatedUser(auth, HttpStatus.UNAUTHORIZED, "not authenticated", HttpStatus.NOT_FOUND, "user not found");

        if (user.getTotpSecret() == null || user.getTotpSecret().isBlank()) {
            byte[] buffer = new byte[10];
            random.nextBytes(buffer);

            Base32 base32 = new Base32();
            String secret = base32.encodeToString(buffer).replace("=", "");
            user.setTotpSecret(secret);
            users.save(user);
        }

        String issuer = "TravelMindAI";
        String otpAuth = "otpauth://totp/" + issuer + ":" + user.getEmail()
                + "?secret=" + user.getTotpSecret()
                + "&issuer=" + issuer;

        return new Object() {
            public final String secret = user.getTotpSecret();
            public final String otpAuthUrl = otpAuth;
        };
    }

    @PostMapping("/2fa/confirm")
    public Object confirm2fa(@RequestBody CodeReq req, Authentication auth) {
        User user = getAuthenticatedUser(auth, HttpStatus.UNAUTHORIZED, "not authenticated", HttpStatus.NOT_FOUND, "user not found");
        String code = trim(req.code());

        if (user.getTotpSecret() == null || user.getTotpSecret().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2fa setup not started");
        }

        if (!authorizeTotp(user.getTotpSecret(), code, HttpStatus.BAD_REQUEST)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid 2fa code");
        }

        user.setTwoFactorEnabled(true);
        users.save(user);

        return new Msg("2fa enabled");
    }

    @PostMapping("/2fa/disable")
    public Msg disable2fa(Authentication auth) {
        User user = getAuthenticatedUser(auth, HttpStatus.UNAUTHORIZED, "not authenticated", HttpStatus.NOT_FOUND, "user not found");

        user.setTwoFactorEnabled(false);
        user.setTotpSecret(null);
        users.save(user);

        return new Msg("2FA disabled successfully");
    }

    @PostMapping("/logout")
    public Msg logout() {
        return new Msg("logged-out");
    }

    @GetMapping("/me")
    public Object me(Authentication auth) {
        User user = getAuthenticatedUser(auth, HttpStatus.UNAUTHORIZED, "not logged in", HttpStatus.UNAUTHORIZED, "user not found");

        return new Object() {
            public final Long id = user.getId();
            public final String username = user.getUsername();
            public final String firstName = user.getFirstName();
            public final String lastName = user.getLastName();
            public final String email = user.getEmail();
            public final String role = user.getRole().name();
            public final boolean emailVerified = user.isEmailVerified();
            public final boolean twoFactorEnabled = user.isTwoFactorEnabled();
        };
    }

    private void validateRegistration(String firstName, String lastName, String email, String password) {
        if (firstName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "firstName required");
        }
        if (lastName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lastName required");
        }
        if (!isEmailValid(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid email");
        }
        if (!isPasswordValid(password)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "password must be at least 8 chars and include uppercase, number and special char"
            );
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email taken");
        }
    }

    private String buildUniqueUsername(String email) {
        String baseUsername = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String username = baseUsername;
        int suffix = 1;

        while (users.existsByUsername(username)) {
            username = baseUsername + suffix++;
        }

        return username;
    }

    private User getAuthenticatedUser(
            Authentication auth,
            HttpStatus authStatus,
            String authMessage,
            HttpStatus userStatus,
            String userMessage
    ) {
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(authStatus, authMessage);
        }

        return users.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(userStatus, userMessage));
    }

    private boolean authorizeTotp(String secret, String code, HttpStatus status) {
        try {
            return googleAuthenticator.authorize(secret, Integer.parseInt(code));
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(status, "invalid 2fa code");
        }
    }

    private Object buildLoginSuccess(User user, String jwt) {
        return new Object() {
            public final String token = jwt;
            public final String message = "logged-in";
            public final boolean requires2fa = false;
            public final Long id = user.getId();
            public final String username = user.getUsername();
            public final String firstName = user.getFirstName();
            public final String lastName = user.getLastName();
            public final String email = user.getEmail();
            public final String role = user.getRole().name();
            public final boolean emailVerified = user.isEmailVerified();
            public final boolean twoFactorEnabled = user.isTwoFactorEnabled();
        };
    }

    private String normalizeEmail(String email) {
        return trim(email).toLowerCase();
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isEmailValid(String email) {
        return !email.isBlank() && email.length() <= 255 && EMAIL_PATTERN.matcher(email).matches();
    }

    private boolean isPasswordValid(String password) {
        return password != null
                && password.length() >= 8
                && password.matches(".*[A-Z].*")
                && password.matches(".*[0-9].*")
                && password.matches(".*[!@#$%^&*(),.?\":{}|<>].*");
    }
}
