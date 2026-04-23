package tripmindai.com.mk.maintravelservice.service.AI;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import tripmindai.com.mk.maintravelservice.dto.AI.AiItineraryResponse;

import java.time.LocalDate;

@Service
public class AiItineraryService {

    private static final String SYSTEM_PROMPT = """
            You are a professional travel planner.

            Return ONLY valid JSON.

            Structure:

            {
              "title": "Trip itinerary title",
              "days": [
                {
                  "dayNumber": 1,
                  "date": "YYYY-MM-DD",
                  "title": "Short daily title",
                  "theme": "arrival | culture | food | landmarks | relaxing",
                  "activities": [
                    {
                      "type": "landmark | museum | restaurant | walking_route | park | shopping | viewpoint | beach",
                      "timeSlot": "MORNING | AFTERNOON | EVENING",
                      "name": "real place name",
                      "description": "short useful text",
                      "lat": 0.0,
                      "lng": 0.0,
                      "estimatedMinutes": 90,
                      "zoneName": "area / district"
                    }
                  ]
                }
              ]
            }

            Rules:
            - output JSON only
            - exactly 3 activities per day
            - use REAL famous places in the requested city
            - every activity MUST include numeric lat/lng
            - first day should be lighter
            - last day should be lighter
            - descriptions max 6 words
            - keep JSON compact
            """;

    private final AzureOpenAiClient azureClient;
    private final ObjectMapper objectMapper;

    public AiItineraryService(AzureOpenAiClient azureClient, ObjectMapper objectMapper) {
        this.azureClient = azureClient;
        this.objectMapper = objectMapper;
    }

    public AiItineraryResponse generateItinerary(
            String destination,
            String country,
            LocalDate from,
            LocalDate to,
            int adults
    ) {
        String userPrompt = """
                Create a compact multi-day travel itinerary.

                City: %s
                Country: %s
                From: %s
                To: %s
                Travelers: %d
                """.formatted(
                safe(destination),
                safe(country),
                from,
                to,
                adults
        );

        try {
            String rawJson = azureClient.chatJson(SYSTEM_PROMPT, userPrompt);
            if (isBlank(rawJson)) {
                return null;
            }

            return objectMapper.readValue(rawJson, AiItineraryResponse.class);
        } catch (Exception e) {
            return null;
        }
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
