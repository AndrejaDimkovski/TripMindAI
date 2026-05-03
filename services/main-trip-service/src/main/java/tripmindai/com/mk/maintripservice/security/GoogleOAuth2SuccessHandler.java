package tripmindai.com.mk.maintripservice.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import tripmindai.com.mk.maintripservice.model.Role;
import tripmindai.com.mk.maintripservice.model.User;
import tripmindai.com.mk.maintripservice.repository.UserRepository;

import java.io.IOException;

@Component
public class GoogleOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository users;
    private final JwtService jwtService;

    @Value("${frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public GoogleOAuth2SuccessHandler(UserRepository users, JwtService jwtService) {
        this.users = users;
        this.jwtService = jwtService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String email = oauthUser.getAttribute("email");
        String firstName = oauthUser.getAttribute("given_name");
        String lastName = oauthUser.getAttribute("family_name");
        String fullName = oauthUser.getAttribute("name");

        if (email == null || email.isBlank()) {
            response.sendRedirect(frontendBaseUrl + "/login?error=google_email_missing");
            return;
        }

        User user = users.findByEmailIgnoreCase(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email.toLowerCase());
            newUser.setUsername(buildUniqueUsername(email));
            newUser.setFirstName(firstName != null ? firstName : fullName);
            newUser.setLastName(lastName != null ? lastName : "");
            newUser.setPasswordHash("");
            newUser.setRole(Role.USER);
            newUser.setEmailVerified(true);
            newUser.setTwoFactorEnabled(false);
            return users.save(newUser);
        });

        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            users.save(user);
        }

        String token = jwtService.generateToken(user);
        response.sendRedirect(frontendBaseUrl + "/login?token=" + token);
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
}
