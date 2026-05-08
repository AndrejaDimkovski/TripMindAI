package tripmindai.com.mk.maintripservice.web.auth;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import org.apache.commons.codec.binary.Base32;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tripmindai.com.mk.maintripservice.model.Role;
import tripmindai.com.mk.maintripservice.model.User;
import tripmindai.com.mk.maintripservice.repository.UserRepository;
import tripmindai.com.mk.maintripservice.security.JwtService;
import tripmindai.com.mk.maintripservice.service.email.EmailService;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
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

    public record RegisterReq(String firstName, String lastName, String email, String password) {}
    public record VerifyEmailReq(String email, String code) {}
    public record LoginReq(String email, String password) {}
    public record Login2FaReq(String email, String code) {}
    public record ForgotPasswordReq(String email) {}
    public record ResetPasswordReq(String token, String password) {}
    public record CodeReq(String code) {}
    public record Msg(String message) {}

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

        if (!isEmailValid(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is not valid.");
        }
        if (code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code is required.");
        }

        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found."));

        if (user.isEmailVerified()) {
            return new Msg("Email is already verified.");
        }
        if (user.getEmailVerificationCode() == null || user.getEmailVerificationExpiry() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code is missing.");
        }
        if (user.getEmailVerificationExpiry().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code has expired.");
        }
        if (!user.getEmailVerificationCode().equals(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification code.");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationCode(null);
        user.setEmailVerificationExpiry(null);
        users.save(user);

        return new Msg("Email verified successfully.");
    }

    @PostMapping("/forgot-password")
    public Msg forgotPassword(@RequestBody ForgotPasswordReq req) {
        String email = normalizeEmail(req.email());

        if (isEmailValid(email)) {
            users.findByEmailIgnoreCase(email).ifPresent(user -> {
                String token = generateResetToken();
                user.setPasswordResetTokenHash(hashToken(token));
                user.setPasswordResetExpiry(LocalDateTime.now().plusMinutes(30));
                users.save(user);
                emailService.sendPasswordResetLink(user.getEmail(), token);
            });
        }

        return new Msg("If that email exists, a password reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public Msg resetPassword(@RequestBody ResetPasswordReq req) {
        String token = trim(req.token());
        String password = req.password() == null ? "" : req.password();

        if (token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token is required.");
        }

        if (!isPasswordValid(password)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must contain at least 8 characters, one uppercase letter, one number, and one special character."
            );
        }

        User user = users.findByPasswordResetTokenHash(hashToken(token))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset link."));

        if (user.getPasswordResetExpiry() == null || user.getPasswordResetExpiry().isBefore(LocalDateTime.now())) {
            user.setPasswordResetTokenHash(null);
            user.setPasswordResetExpiry(null);
            users.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset link.");
        }

        user.setPasswordHash(encoder.encode(password));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetExpiry(null);
        users.save(user);

        return new Msg("Password reset successfully.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req) {
        String email = normalizeEmail(req.email());
        String password = req.password() == null ? "" : req.password();

        if (!isEmailValid(email)) {
            return ResponseEntity.badRequest().body(new Msg("Email is not valid."));
        }
        if (password.isBlank()) {
            return ResponseEntity.badRequest().body(new Msg("Password is required."));
        }

        User user = users.findByEmailIgnoreCase(email).orElse(null);

        if (user == null || !encoder.matches(password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new Msg("Invalid email or password."));
        }

        if (!user.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new Msg("Email address is not verified."));
        }

        if (user.isTwoFactorEnabled()) {
            return ResponseEntity.ok(new Object() {
                public final String message = "2fa required";
                public final boolean requires2fa = true;
                public final String emailAddress = user.getEmail();
            });
        }

        return ResponseEntity.ok(buildLoginSuccess(user, jwtService.generateToken(user)));
    }

    @PostMapping("/login/2fa")
    public ResponseEntity<?> login2fa(@RequestBody Login2FaReq req) {
        String email = normalizeEmail(req.email());
        String code = trim(req.code());

        if (!isEmailValid(email)) {
            return ResponseEntity.badRequest().body(new Msg("Email is not valid."));
        }
        if (code.isBlank()) {
            return ResponseEntity.badRequest().body(new Msg("2FA code is required."));
        }

        User user = users.findByEmailIgnoreCase(email).orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new Msg("Invalid email or code."));
        }

        if (!user.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new Msg("Email address is not verified."));
        }

        if (!user.isTwoFactorEnabled() || user.getTotpSecret() == null || user.getTotpSecret().isBlank()) {
            return ResponseEntity.badRequest().body(new Msg("2FA is not enabled."));
        }

        if (!authorizeTotpSafe(user.getTotpSecret(), code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new Msg("Invalid 2FA code."));
        }

        return ResponseEntity.ok(buildLoginSuccess(user, jwtService.generateToken(user)));
    }

    @PostMapping("/2fa/setup")
    public Object setup2fa(Authentication auth) {
        User user = getAuthenticatedUser(auth, HttpStatus.UNAUTHORIZED, "Not authenticated.", HttpStatus.NOT_FOUND, "User not found.");

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verify your email first.");
        }

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
        User user = getAuthenticatedUser(auth, HttpStatus.UNAUTHORIZED, "Not authenticated.", HttpStatus.NOT_FOUND, "User not found.");
        String code = trim(req.code());

        if (code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2FA code is required.");
        }
        if (user.getTotpSecret() == null || user.getTotpSecret().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "2FA setup has not started.");
        }

        if (!authorizeTotp(user.getTotpSecret(), code, HttpStatus.BAD_REQUEST)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid 2FA code.");
        }

        user.setTwoFactorEnabled(true);
        users.save(user);

        return new Msg("2FA enabled successfully.");
    }

    @PostMapping("/2fa/disable")
    public Msg disable2fa(Authentication auth) {
        User user = getAuthenticatedUser(auth, HttpStatus.UNAUTHORIZED, "Not authenticated.", HttpStatus.NOT_FOUND, "User not found.");

        user.setTwoFactorEnabled(false);
        user.setTotpSecret(null);
        users.save(user);

        return new Msg("2FA disabled successfully.");
    }

    @PostMapping("/logout")
    public Msg logout() {
        return new Msg("logged-out");
    }

    @GetMapping("/me")
    public Object me(Authentication auth) {
        User user = getAuthenticatedUser(auth, HttpStatus.UNAUTHORIZED, "Not logged in.", HttpStatus.UNAUTHORIZED, "User not found.");

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
        if (firstName.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "First name is required.");
        if (lastName.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Last name is required.");
        if (!isEmailValid(email)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is not valid.");
        if (!isPasswordValid(password)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must contain at least 8 characters, one uppercase letter, one number, and one special character.");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email address already exists.");
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

    private User getAuthenticatedUser(Authentication auth, HttpStatus authStatus, String authMessage, HttpStatus userStatus, String userMessage) {
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
            throw new ResponseStatusException(status, "Invalid 2FA code.");
        }
    }

    private boolean authorizeTotpSafe(String secret, String code) {
        try {
            return googleAuthenticator.authorize(secret, Integer.parseInt(code));
        } catch (Exception e) {
            return false;
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

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not process reset token.");
        }
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
