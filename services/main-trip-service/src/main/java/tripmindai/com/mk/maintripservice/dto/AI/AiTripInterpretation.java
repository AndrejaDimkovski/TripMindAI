package tripmindai.com.mk.maintripservice.dto.AI;

import java.util.List;

public record AiTripInterpretation(
        String travelStyle,
        List<String> destinationCodes,
        List<String> candidateDestinations,
        List<String> candidateCountries,
        String budgetLevel,
        List<String> interests,
        String notes,
        Double confidence,
        boolean usedAi,
        boolean needsClarification,
        Integer extractedPeople,
        Integer extractedDurationDays,
        String extractedFromDate,
        String extractedToDate,
        String extractedMonth,
        String dateFlexibilityHint,
        String extractedDestinationText,
        String extractedCountry,
        String extractedOriginCity,
        String extractedOriginIata
) {}
