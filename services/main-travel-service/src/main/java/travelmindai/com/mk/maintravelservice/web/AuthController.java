package travelmindai.com.mk.maintravelservice.web;


import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import travelmindai.com.mk.maintravelservice.model.User;
import travelmindai.com.mk.maintravelservice.repository.UserRepository;


@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3001", allowCredentials = "true")

public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authManager;

    public AuthController(UserRepository users, PasswordEncoder encoder, AuthenticationManager authManager) {
        this.users = users;
        this.encoder = encoder;
        this.authManager = authManager;
    }

    public record RegisterReq(String username, String email, String password) {}
    public record LoginReq(String username, String password) {}
    public record Msg(String message) {}

    @PostMapping("/register")
    public Msg register(@RequestBody RegisterReq req) {
        if (req.username() == null || req.username().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username required");
        if (req.email() == null || req.email().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email required");
        if (req.password() == null || req.password().length() < 4)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password too short");

        if (users.existsByUsername(req.username()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "username taken");
        if (users.existsByEmail(req.email()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email taken");

        User u = new User();
        u.setUsername(req.username());
        u.setEmail(req.email());
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);

        return new Msg("registered");
    }

    @PostMapping("/login")
    public Msg login(@RequestBody LoginReq req, HttpServletRequest request) {
        var auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username(), req.password())
        );

        SecurityContextHolder.getContext().setAuthentication(auth);

        // ✅ create session
        HttpSession session = request.getSession(true);
        session.setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

        return new Msg("logged-in");
    }

    @PostMapping("/logout")
    public Msg logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return new Msg("logged-out");
    }
}

