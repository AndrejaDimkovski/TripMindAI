package tripmindai.com.mk.maintripservice.dto.activities;

import tripmindai.com.mk.maintripservice.dto.country.GeoPoint;

import java.util.List;

public record ItineraryDayDto(
        int dayNumber,
        String date,
        String title,
        String theme,
        Integer totalActivityMinutes,
        Integer totalWalkingMinutes,
        List<ItineraryActivityDto> activities,
        List<GeoPoint> routeCoordinates
) {}