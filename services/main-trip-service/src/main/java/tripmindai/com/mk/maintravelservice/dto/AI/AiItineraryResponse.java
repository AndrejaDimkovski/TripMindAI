package tripmindai.com.mk.maintravelservice.dto.AI;

import java.util.List;

public record AiItineraryResponse(
        String title,
        List<DayPlan> days
) {
    public record DayPlan(
            int dayNumber,
            String date,
            String title,
            String theme,
            List<Activity> activities
    ) {}

    public record Activity(
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
}