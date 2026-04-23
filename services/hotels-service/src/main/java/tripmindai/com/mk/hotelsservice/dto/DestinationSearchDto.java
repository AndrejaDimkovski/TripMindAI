package tripmindai.com.mk.hotelsservice.dto;

public record DestinationSearchDto(
        String destId,
        String destType,
        String searchType,
        String label,
        String name,
        String cityName,
        String country,
        String region,
        Double latitude,
        Double longitude,
        String imageUrl,
        Integer hotelCount
) {}