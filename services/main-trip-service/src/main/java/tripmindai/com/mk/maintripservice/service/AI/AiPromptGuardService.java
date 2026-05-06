package tripmindai.com.mk.maintripservice.service.AI;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tripmindai.com.mk.maintripservice.model.Country;
import tripmindai.com.mk.maintripservice.model.Destination;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class AiPromptGuardService {

    private static final int MIN_LENGTH = 10;
    private static final int MAX_LENGTH = 600;

    public String cleanAndValidate(String prompt, List<Country> countries, List<Destination> destinations) {
        String cleaned = clean(prompt);
        String normalized = normalize(cleaned);

        if (cleaned.length() < MIN_LENGTH) {
            throw badRequest("Please describe a travel request with destination, dates, people or budget.");
        }

        if (cleaned.length() > MAX_LENGTH) {
            throw badRequest("Prompt is too long. Please keep it under " + MAX_LENGTH + " characters.");
        }

        if (containsBlockedTerm(normalized)) {
            throw badRequest("AI planner can only be used for safe trip planning requests.");
        }

        if (!looksTravelRelated(normalized, countries, destinations)) {
            throw badRequest("AI planner can only help with trip planning requests.");
        }

        return cleaned;
    }

    private boolean looksTravelRelated(String normalized, List<Country> countries, List<Destination> destinations) {
        boolean hasTravelTerm = AiPromptPolicyTerms.TRAVEL_TERMS.stream()
                .anyMatch(term -> containsPolicyTerm(normalized, term));
        boolean hasDateOrDuration = normalized.matches(".*\\b\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}\\b.*")
                || normalized.matches(".*\\b\\d+\\s*(day|days|night|nights|den|dena|nok|nokji)\\b.*");
        boolean mentionsKnownCountry = countries != null && countries.stream()
                .anyMatch(c -> containsKnownName(normalized, c.getName(), c.getCode()));
        boolean mentionsKnownDestination = destinations != null && destinations.stream()
                .anyMatch(d -> containsKnownName(normalized, d.getName(), d.getCityCode()));

        return hasTravelTerm || hasDateOrDuration || mentionsKnownCountry || mentionsKnownDestination;
    }

    private boolean containsKnownName(String normalized, String name, String code) {
        String normalizedName = normalize(name);
        String normalizedCode = normalize(code);

        return (!normalizedName.isBlank() && normalized.contains(normalizedName))
                || (!normalizedCode.isBlank() && normalized.matches(".*\\b" + java.util.regex.Pattern.quote(normalizedCode) + "\\b.*"));
    }

    private boolean containsBlockedTerm(String normalized) {
        return AiPromptPolicyTerms.BLOCKED_TERMS.stream()
                .anyMatch(term -> containsPolicyTerm(normalized, term));
    }

    private boolean containsPolicyTerm(String normalized, String term) {
        if (normalized.isBlank() || term == null || term.isBlank()) return false;

        return Pattern.compile("(^|[^a-z0-9])" + Pattern.quote(term) + "([^a-z0-9]|$)")
                .matcher(normalized)
                .find();
    }

    private String clean(String prompt) {
        return String.valueOf(prompt == null ? "" : prompt)
                .replace("\u0000", " ")
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();
    }

    private String normalize(String value) {
        String normalized = Normalizer.normalize(String.valueOf(value == null ? "" : value), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9 ._/-]+", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
