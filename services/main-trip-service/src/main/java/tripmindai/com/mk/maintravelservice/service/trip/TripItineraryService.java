package tripmindai.com.mk.maintravelservice.service.trip;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tripmindai.com.mk.maintravelservice.dto.AI.AiItineraryResponse;
import tripmindai.com.mk.maintravelservice.dto.GeoPoint;
import tripmindai.com.mk.maintravelservice.dto.activities.ItineraryActivityDto;
import tripmindai.com.mk.maintravelservice.dto.activities.ItineraryDayDto;
import tripmindai.com.mk.maintravelservice.dto.trip.TripItineraryDto;
import tripmindai.com.mk.maintravelservice.model.TripPlan;
import tripmindai.com.mk.maintravelservice.repository.TripPlanRepository;
import tripmindai.com.mk.maintravelservice.service.AI.AiItineraryService;
import tripmindai.com.mk.maintravelservice.service.geo.GeocodingService;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class TripItineraryService {

    private static final String DEFAULT_ZONE = "Central area";

    private final TripPlanRepository tripPlanRepository;
    private final AiItineraryService aiItineraryService;
    private final GeocodingService geocodingService;
    private final RoutingService routingService;

    public TripItineraryService(
            TripPlanRepository tripPlanRepository,
            AiItineraryService aiItineraryService,
            GeocodingService geocodingService,
            RoutingService routingService
    ) {
        this.tripPlanRepository = tripPlanRepository;
        this.aiItineraryService = aiItineraryService;
        this.geocodingService = geocodingService;
        this.routingService = routingService;
    }

    public TripItineraryDto generateItinerary(Long id, Authentication authentication) {
        String username = extractUsername(authentication);

        TripPlan plan = tripPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found."));

        if (!plan.getUsername().equals(username)) {
            throw new RuntimeException("You cannot generate itinerary for another user's trip.");
        }

        String destinationName = safe(plan.getDestinationName());
        String countryName = safe(plan.getCountryName());
        LocalDate fromDate = plan.getFromDate();
        LocalDate toDate = plan.getToDate();
        int totalDays = (int) Math.max(1, ChronoUnit.DAYS.between(fromDate, toDate) + 1);

        AiItineraryResponse aiResponse = aiItineraryService.generateItinerary(
                destinationName,
                countryName,
                fromDate,
                toDate,
                plan.getAdults()
        );

        List<ItineraryDayDto> days = buildDays(aiResponse, destinationName, countryName, fromDate, totalDays);
        if (days.isEmpty()) {
            days = buildFallbackDays(destinationName, countryName, fromDate, totalDays);
        }

        String title = aiResponse != null && !safe(aiResponse.title()).isBlank()
                ? safe(aiResponse.title())
                : "Trip plan for " + destinationName;

        return new TripItineraryDto(
                plan.getId(),
                destinationName,
                countryName,
                fromDate.toString(),
                toDate.toString(),
                totalDays,
                title,
                days
        );
    }

    private List<ItineraryDayDto> buildDays(
            AiItineraryResponse aiResponse,
            String destinationName,
            String countryName,
            LocalDate fromDate,
            int totalDays
    ) {
        if (aiResponse == null || aiResponse.days() == null || aiResponse.days().isEmpty()) {
            return List.of();
        }

        List<ItineraryDayDto> days = new ArrayList<>();

        for (int i = 0; i < aiResponse.days().size(); i++) {
            AiItineraryResponse.DayPlan aiDay = aiResponse.days().get(i);
            int dayNumber = aiDay.dayNumber() > 0 ? aiDay.dayNumber() : i + 1;
            String date = !safe(aiDay.date()).isBlank() ? aiDay.date() : fromDate.plusDays(i).toString();
            String title = !safe(aiDay.title()).isBlank() ? safe(aiDay.title()) : buildDefaultDayTitle(dayNumber, destinationName);
            String theme = !safe(aiDay.theme()).isBlank() ? safe(aiDay.theme()) : inferDayTheme(dayNumber, totalDays);

            List<ItineraryActivityDto> activities = resolveActivities(
                    aiDay.activities(),
                    destinationName,
                    countryName
            );

            List<GeoPoint> activityPoints = activities.stream()
                    .filter(activity -> activity.lat() != null && activity.lng() != null)
                    .map(activity -> new GeoPoint(activity.lat(), activity.lng()))
                    .toList();

            List<GeoPoint> routeCoordinates = routingService.buildRoute(activityPoints);

            int totalActivityMinutes = activities.stream()
                    .map(ItineraryActivityDto::estimatedMinutes)
                    .filter(minutes -> minutes != null && minutes > 0)
                    .mapToInt(Integer::intValue)
                    .sum();

            int totalWalkingMinutes = estimateWalkingMinutes(routeCoordinates, activities.size());

            days.add(new ItineraryDayDto(
                    dayNumber,
                    date,
                    title,
                    theme,
                    totalActivityMinutes,
                    totalWalkingMinutes,
                    activities,
                    routeCoordinates
            ));
        }

        return days;
    }

    private List<ItineraryActivityDto> resolveActivities(
            List<AiItineraryResponse.Activity> aiActivities,
            String destinationName,
            String countryName
    ) {
        if (aiActivities == null || aiActivities.isEmpty()) {
            return List.of();
        }

        List<ItineraryActivityDto> activities = new ArrayList<>();

        for (int index = 0; index < aiActivities.size(); index++) {
            AiItineraryResponse.Activity activity = aiActivities.get(index);

            String name = safe(activity.name());
            String type = normalizeType(activity.type());
            String description = safe(activity.description());

            Double lat = activity.lat();
            Double lng = activity.lng();

            if (lat == null || lng == null) {
                GeoPoint point = geocodingService.geocode(name, destinationName, countryName);
                if (point != null) {
                    lat = point.lat();
                    lng = point.lng();
                }
            }

            activities.add(new ItineraryActivityDto(
                    type,
                    normalizeTimeSlot(activity.timeSlot(), index),
                    name.isBlank() ? "Activity " + (index + 1) : name,
                    description.isBlank() ? defaultDescriptionForType(type) : description,
                    lat,
                    lng,
                    normalizeEstimatedMinutes(activity.estimatedMinutes(), type),
                    safe(activity.zoneName()),
                    defaultIcon(activity.icon(), type),
                    activity.optional() != null ? activity.optional() : Boolean.FALSE
            ));
        }

        return activities;
    }

    private List<ItineraryDayDto> buildFallbackDays(
            String destinationName,
            String countryName,
            LocalDate fromDate,
            int totalDays
    ) {
        List<ItineraryDayDto> days = new ArrayList<>();

        List<String> names = List.of(
                destinationName + " Main Landmark",
                destinationName + " Museum",
                destinationName + " Local Restaurant",
                "Walk through " + destinationName + " Historic Center"
        );

        List<String> types = List.of("landmark", "museum", "restaurant", "walking_route");
        List<String> slots = List.of("MORNING", "AFTERNOON", "AFTERNOON", "EVENING");

        for (int i = 0; i < totalDays; i++) {
            List<ItineraryActivityDto> activities = new ArrayList<>();

            for (int j = 0; j < names.size(); j++) {
                GeoPoint point = geocodingService.geocode(names.get(j), destinationName, countryName);

                activities.add(new ItineraryActivityDto(
                        types.get(j),
                        slots.get(j),
                        names.get(j),
                        defaultDescriptionForType(types.get(j)),
                        point != null ? point.lat() : null,
                        point != null ? point.lng() : null,
                        normalizeEstimatedMinutes(null, types.get(j)),
                        DEFAULT_ZONE,
                        defaultIcon(null, types.get(j)),
                        Boolean.FALSE
                ));
            }

            List<GeoPoint> activityPoints = activities.stream()
                    .filter(activity -> activity.lat() != null && activity.lng() != null)
                    .map(activity -> new GeoPoint(activity.lat(), activity.lng()))
                    .toList();

            List<GeoPoint> routeCoordinates = routingService.buildRoute(activityPoints);

            int totalActivityMinutes = activities.stream()
                    .map(ItineraryActivityDto::estimatedMinutes)
                    .filter(minutes -> minutes != null && minutes > 0)
                    .mapToInt(Integer::intValue)
                    .sum();

            int dayNumber = i + 1;
            String date = fromDate.plusDays(i).toString();

            days.add(new ItineraryDayDto(
                    dayNumber,
                    date,
                    buildDefaultDayTitle(dayNumber, destinationName),
                    inferDayTheme(dayNumber, totalDays),
                    totalActivityMinutes,
                    estimateWalkingMinutes(routeCoordinates, activities.size()),
                    activities,
                    routeCoordinates
            ));
        }

        return days;
    }

    private String extractUsername(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("User is not authenticated.");
        }
        return authentication.getName();
    }

    private String normalizeType(String type) {
        String value = safe(type).toLowerCase(Locale.ROOT);
        return switch (value) {
            case "landmark", "museum", "restaurant", "walking_route",
                 "park", "shopping", "viewpoint", "beach", "nightlife" -> value;
            default -> "landmark";
        };
    }

    private String normalizeTimeSlot(String timeSlot, int index) {
        String value = safe(timeSlot).toUpperCase(Locale.ROOT);
        if ("MORNING".equals(value) || "AFTERNOON".equals(value) || "EVENING".equals(value)) {
            return value;
        }
        if (index <= 1) {
            return "MORNING";
        }
        if (index == 2) {
            return "AFTERNOON";
        }
        return "EVENING";
    }

    private Integer normalizeEstimatedMinutes(Integer estimatedMinutes, String type) {
        if (estimatedMinutes != null && estimatedMinutes > 0) {
            return estimatedMinutes;
        }

        return switch (type) {
            case "museum" -> 90;
            case "restaurant" -> 75;
            case "walking_route" -> 60;
            case "park", "viewpoint", "shopping" -> 60;
            case "beach", "nightlife" -> 120;
            default -> 75;
        };
    }

    private String defaultDescriptionForType(String type) {
        return switch (type) {
            case "museum" -> "Explore a local museum.";
            case "restaurant" -> "Taste local food specialties.";
            case "walking_route" -> "Enjoy a scenic city walk.";
            case "park" -> "Relax in a green area.";
            case "shopping" -> "Browse local shops and boutiques.";
            case "viewpoint" -> "Enjoy panoramic city views.";
            case "beach" -> "Relax by the sea.";
            case "nightlife" -> "Experience the evening atmosphere.";
            default -> "Visit a famous local attraction.";
        };
    }

    private String defaultIcon(String icon, String type) {
        String value = safe(icon).toLowerCase(Locale.ROOT);
        if (!value.isBlank()) {
            return value;
        }

        return switch (type) {
            case "museum" -> "museum";
            case "restaurant" -> "food";
            case "walking_route" -> "walk";
            case "park" -> "park";
            case "shopping" -> "shopping";
            case "viewpoint" -> "sunset";
            case "beach" -> "beach";
            case "nightlife" -> "night";
            default -> "landmark";
        };
    }

    private String buildDefaultDayTitle(int dayNumber, String destinationName) {
        return switch (dayNumber) {
            case 1 -> "Arrival and first highlights in " + destinationName;
            case 2 -> "Main attractions in " + destinationName;
            default -> "Day " + dayNumber + " in " + destinationName;
        };
    }

    private String inferDayTheme(int dayNumber, int totalDays) {
        if (dayNumber == 1) {
            return "arrival";
        }
        if (dayNumber == totalDays) {
            return "relaxing";
        }
        return "landmarks";
    }

    private int estimateWalkingMinutes(List<GeoPoint> routeCoordinates, int activitiesCount) {
        if (routeCoordinates == null || routeCoordinates.size() < 2) {
            return Math.max(15, activitiesCount * 10);
        }
        return Math.max(20, activitiesCount * 15);
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
