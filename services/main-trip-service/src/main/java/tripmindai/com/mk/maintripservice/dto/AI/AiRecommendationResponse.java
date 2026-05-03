package tripmindai.com.mk.maintripservice.dto.AI;

import java.util.List;

public record AiRecommendationResponse(
        AiTripInterpretation interpretation,
        List<RecommendedDestinationDto> recommendations
) {}