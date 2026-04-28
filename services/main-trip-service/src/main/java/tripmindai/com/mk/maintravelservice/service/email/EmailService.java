package tripmindai.com.mk.maintravelservice.service.email;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final String SUBJECT = "TripMindAI email verification";

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationCode(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(SUBJECT);
        message.setText(buildVerificationText(code));
        mailSender.send(message);
    }

    private String buildVerificationText(String code) {
        return "Your verification code is: " + code + "\nThis code is valid for 15 minutes.";
    }
}
