package tripmindai.com.mk.maintravelservice.dto.AI;

import java.util.List;

public record AiRecommendationResponse(
        AiTripInterpretation interpretation,
        List<RecommendedDestinationDto> recommendations
) {}