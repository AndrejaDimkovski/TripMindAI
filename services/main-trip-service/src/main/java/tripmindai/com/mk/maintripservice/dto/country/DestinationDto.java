package tripmindai.com.mk.maintripservice.dto.country;

public record DestinationDto(
        Long id,
        String countryCode,
        String cityCode,
        String name,
        Double latitude,
        Double longitude,
        String description,
        String imageUrl
) {}