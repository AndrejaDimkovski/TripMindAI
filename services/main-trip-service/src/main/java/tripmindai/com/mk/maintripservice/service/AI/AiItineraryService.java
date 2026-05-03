package tripmindai.com.mk.maintripservice.service.AI;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import tripmindai.com.mk.maintripservice.dto.AI.AiItineraryResponse;

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
            - DO NOT generate sightseeing activities for the checkout / return-travel day
            - the last itinerary day must be the day before checkout / return travel
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
        LocalDate safeFrom = from != null ? from : LocalDate.now().plusDays(1);
        LocalDate safeTo = to != null ? to : safeFrom.plusDays(1);
        LocalDate itineraryEnd = resolveItineraryEnd(safeFrom, safeTo);

        String userPrompt = """
                Create a compact multi-day travel itinerary.

                City: %s
                Country: %s
                Arrival date: %s
                Checkout / return flight date: %s
                Generate itinerary days only from %s to %s.
                Important: %s is a departure day, so do not include activities for that date.
                Travelers: %d
                """.formatted(
                safe(destination),
                safe(country),
                safeFrom,
                safeTo,
                safeFrom,
                itineraryEnd,
                safeTo,
                adults
        );

        try {
            String rawJson = azureClient.chatJson(SYSTEM_PROMPT, userPrompt);
            if (isBlank(rawJson)) {
                return null;
            }

            AiItineraryResponse parsed = objectMapper.readValue(rawJson, AiItineraryResponse.class);
            return trimCheckoutDay(parsed, safeTo);
        } catch (Exception e) {
            return null;
        }
    }

    private AiItineraryResponse trimCheckoutDay(AiItineraryResponse response, LocalDate checkoutDate) {
        if (response == null || response.days() == null || checkoutDate == null) {
            return response;
        }

        var filteredDays = response.days().stream()
                .filter(day -> day != null && day.date() != null)
                .filter(day -> {
                    try {
                        return LocalDate.parse(day.date()).isBefore(checkoutDate);
                    } catch (Exception e) {
                        return true;
                    }
                })
                .toList();

        return new AiItineraryResponse(response.title(), filteredDays);
    }

    private LocalDate resolveItineraryEnd(LocalDate from, LocalDate to) {
        LocalDate candidate = to.minusDays(1);
        return candidate.isBefore(from) ? from : candidate;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
