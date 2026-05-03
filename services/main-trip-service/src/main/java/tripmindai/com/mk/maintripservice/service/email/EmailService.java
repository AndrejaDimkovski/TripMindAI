package tripmindai.com.mk.maintripservice.service.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final String VERIFY_SUBJECT = "TripMindAI email verification";
    private static final String RESET_SUBJECT = "TripMindAI password reset";

    private final JavaMailSender mailSender;
    private final String frontendUrl;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.frontend-url:http://localhost:3000}") String frontendUrl
    ) {
        this.mailSender = mailSender;
        this.frontendUrl = frontendUrl;
    }

    public void sendVerificationCode(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(VERIFY_SUBJECT);
        message.setText("Your verification code is: " + code + "\nThis code is valid for 15 minutes.");
        mailSender.send(message);
    }

    public void sendPasswordResetLink(String to, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(RESET_SUBJECT);
        message.setText(
                "Click this link to reset your TripMindAI password:\n\n"
                        + link
                        + "\n\nThis link is valid for 30 minutes."
        );
        mailSender.send(message);
    }
}
