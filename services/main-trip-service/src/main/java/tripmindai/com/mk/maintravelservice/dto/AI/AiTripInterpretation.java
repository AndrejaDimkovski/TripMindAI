package tripmindai.com.mk.maintravelservice.dto.AI;

import java.util.List;

public record AiTripInterpretation(
        String travelStyle,
        List<String> destinationCodes,
        String budgetLevel,
        List<String> interests,
        String notes,
        Integer extractedPeople,
        Integer extractedDurationDays,
        String extractedFromDate,
        String extractedToDate,
        String extractedMonth,
        String extractedDestinationText,
        String extractedCountry
) {}