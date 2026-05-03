package tripmindai.com.mk.maintripservice.web.ai;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tripmindai.com.mk.maintripservice.dto.AI.AiRecommendationResponse;
import tripmindai.com.mk.maintripservice.dto.AI.AiTripInterpretation;
import tripmindai.com.mk.maintripservice.dto.AI.AiTripRequest;
import tripmindai.com.mk.maintripservice.dto.AI.RecommendedDestinationDto;
import tripmindai.com.mk.maintripservice.dto.trip.TripSearchResponse;
import tripmindai.com.mk.maintripservice.service.AI.AiInterpretationService;
import tripmindai.com.mk.maintripservice.service.AI.DestinationRecommendationService;
import tripmindai.com.mk.maintripservice.service.trip.TripSearchService;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiInterpretationService aiInterpretationService;
    private final DestinationRecommendationService destinationRecommendationService;
    private final TripSearchService tripSearchService;

    public AiController(
            AiInterpretationService aiInterpretationService,
            DestinationRecommendationService destinationRecommendationService,
            TripSearchService tripSearchService
    ) {
        this.aiInterpretationService = aiInterpretationService;
        this.destinationRecommendationService = destinationRecommendationService;
        this.tripSearchService = tripSearchService;
    }

    @PostMapping("/recommend")
    public AiRecommendationResponse recommend(@RequestBody AiTripRequest req) {
        AiTripInterpretation interpretation = aiInterpretationService.interpret(req);
        List<RecommendedDestinationDto> recommendations = destinationRecommendationService.recommend(interpretation);
        return new AiRecommendationResponse(interpretation, recommendations);
    }

    @PostMapping("/offers")
    public Map<String, Object> offers(@RequestBody AiTripRequest req) {
        AiTripInterpretation interpretation = aiInterpretationService.interpret(req);
        List<RecommendedDestinationDto> recommendations = destinationRecommendationService.recommend(interpretation);

        if (recommendations.isEmpty()) {
            return Map.of(
                    "interpretation", interpretation,
                    "recommendations", List.of(),
                    "results", null
            );
        }

        RecommendedDestinationDto chosen = chooseBestRecommendation(interpretation, recommendations);

        String fromDate = firstNonBlank(interpretation.extractedFromDate(), req.fromDate());
        String toDate = firstNonBlank(interpretation.extractedToDate(), req.toDate());

        String origin = firstNonBlank(
                interpretation.extractedOriginIata(),
                interpretation.extractedOriginCity(),
                req.originCity()
        );

        int people = Math.max(
                1,
                interpretation.extractedPeople() != null
                        ? interpretation.extractedPeople()
                        : (req.people() != null ? req.people() : 1)
        );

        TripSearchResponse results = tripSearchService.search(
                normalizeOrigin(origin),
                chosen.cityCode(),
                fromDate,
                toDate,
                people,
                chosen.cityCode()
        );

        return Map.of(
                "interpretation", interpretation,
                "recommendations", recommendations,
                "chosenDestination", chosen,
                "results", results
        );
    }

    private RecommendedDestinationDto chooseBestRecommendation(
            AiTripInterpretation interpretation,
            List<RecommendedDestinationDto> recommendations
    ) {
        if (recommendations == null || recommendations.isEmpty()) {
            return null;
        }

        List<String> interpretedCodes = interpretation.destinationCodes();
        if (interpretedCodes != null) {
            for (String code : interpretedCodes) {
                if (isBlank(code)) {
                    continue;
                }
                for (RecommendedDestinationDto recommendation : recommendations) {
                    if (recommendation.cityCode() != null && recommendation.cityCode().equalsIgnoreCase(code)) {
                        return recommendation;
                    }
                }
            }
        }

        if (interpretation.candidateDestinations() != null) {
            for (String candidate : interpretation.candidateDestinations()) {
                if (isBlank(candidate)) {
                    continue;
                }

                for (RecommendedDestinationDto recommendation : recommendations) {
                    if (recommendation.name() != null && recommendation.name().equalsIgnoreCase(candidate)) {
                        return recommendation;
                    }
                }

                String candidateLower = candidate.trim().toLowerCase(Locale.ROOT);
                for (RecommendedDestinationDto recommendation : recommendations) {
                    if (recommendation.name() != null
                            && recommendation.name().toLowerCase(Locale.ROOT).contains(candidateLower)) {
                        return recommendation;
                    }
                }
            }
        }

        String extractedDestinationText = interpretation.extractedDestinationText();
        if (!isBlank(extractedDestinationText)) {
            String extracted = extractedDestinationText.trim().toLowerCase(Locale.ROOT);

            for (RecommendedDestinationDto recommendation : recommendations) {
                if (recommendation.name() != null
                        && recommendation.name().trim().equalsIgnoreCase(extractedDestinationText)) {
                    return recommendation;
                }
            }

            for (RecommendedDestinationDto recommendation : recommendations) {
                if (recommendation.name() != null
                        && recommendation.name().toLowerCase(Locale.ROOT).contains(extracted)) {
                    return recommendation;
                }
            }
        }

        if (interpretation.candidateCountries() != null) {
            for (String candidateCountry : interpretation.candidateCountries()) {
                if (isBlank(candidateCountry)) {
                    continue;
                }

                for (RecommendedDestinationDto recommendation : recommendations) {
                    if (recommendation.countryName() != null
                            && recommendation.countryName().equalsIgnoreCase(candidateCountry)) {
                        return recommendation;
                    }
                }
            }
        }

        String extractedCountry = interpretation.extractedCountry();
        if (!isBlank(extractedCountry)) {
            String extracted = extractedCountry.trim().toLowerCase(Locale.ROOT);

            for (RecommendedDestinationDto recommendation : recommendations) {
                if (recommendation.countryName() != null
                        && recommendation.countryName().trim().equalsIgnoreCase(extractedCountry)) {
                    return recommendation;
                }
            }

            for (RecommendedDestinationDto recommendation : recommendations) {
                if (recommendation.countryName() != null
                        && recommendation.countryName().toLowerCase(Locale.ROOT).contains(extracted)) {
                    return recommendation;
                }
            }
        }

        return recommendations.get(0);
    }

    private String normalizeOrigin(String origin) {
        return isBlank(origin) ? "SKP" : origin.trim().toUpperCase(Locale.ROOT);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
