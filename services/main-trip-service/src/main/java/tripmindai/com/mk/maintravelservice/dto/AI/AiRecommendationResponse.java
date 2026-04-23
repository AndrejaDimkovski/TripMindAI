package tripmindai.com.mk.maintravelservice.dto.AI;

import tripmindai.com.mk.maintravelservice.dto.RecommendedDestinationDto;

import java.util.List;

public record AiRecommendationResponse(
        AiTripInterpretation interpretation,
        List<RecommendedDestinationDto> recommendations
) {}