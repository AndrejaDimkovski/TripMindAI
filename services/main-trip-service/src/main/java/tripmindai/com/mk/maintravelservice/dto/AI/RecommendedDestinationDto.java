package tripmindai.com.mk.maintravelservice.dto.AI;

public record RecommendedDestinationDto(
        Long id,
        String countryCode,
        String countryName,
        String cityCode,
        String name,
        Double latitude,
        Double longitude,
        String description,
        String imageUrl
) {}