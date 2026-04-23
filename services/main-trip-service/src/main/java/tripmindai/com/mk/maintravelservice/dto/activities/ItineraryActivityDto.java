package tripmindai.com.mk.maintravelservice.dto.activities;

public record ItineraryActivityDto(
        String type,
        String timeSlot,
        String name,
        String description,
        Double lat,
        Double lng,
        Integer estimatedMinutes,
        String zoneName,
        String icon,
        Boolean optional
) {}