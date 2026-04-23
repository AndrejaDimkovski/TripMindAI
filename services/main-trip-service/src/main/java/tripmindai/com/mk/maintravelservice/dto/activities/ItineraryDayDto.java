package tripmindai.com.mk.maintravelservice.dto.activities;

import tripmindai.com.mk.maintravelservice.dto.GeoPoint;

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