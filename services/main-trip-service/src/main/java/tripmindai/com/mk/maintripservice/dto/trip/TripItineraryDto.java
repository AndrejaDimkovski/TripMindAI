package tripmindai.com.mk.maintripservice.dto.trip;

import tripmindai.com.mk.maintripservice.dto.activities.ItineraryDayDto;

import java.util.List;

public record TripItineraryDto(
        Long tripPlanId,
        String destinationName,
        String countryName,
        String fromDate,
        String toDate,
        int totalDays,
        String title,
        List<ItineraryDayDto> days
) {}