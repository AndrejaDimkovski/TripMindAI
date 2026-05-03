package tripmindai.com.mk.maintripservice.web.trip;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tripmindai.com.mk.maintripservice.dto.trip.SaveTripPlanRequest;
import tripmindai.com.mk.maintripservice.dto.trip.TripItineraryDto;
import tripmindai.com.mk.maintripservice.dto.trip.TripPlanDto;
import tripmindai.com.mk.maintripservice.service.trip.TripItineraryService;
import tripmindai.com.mk.maintripservice.service.trip.TripPlanService;

import java.util.List;

@RestController
@RequestMapping("/api/plans")
public class TripPlanController {

    private final TripPlanService tripPlanService;
    private final TripItineraryService tripItineraryService;

    public TripPlanController(
            TripPlanService tripPlanService,
            TripItineraryService tripItineraryService
    ) {
        this.tripPlanService = tripPlanService;
        this.tripItineraryService = tripItineraryService;
    }

    @PostMapping
    public TripPlanDto savePlan(@RequestBody SaveTripPlanRequest req, Authentication authentication) {
        return tripPlanService.savePlan(req, authentication);
    }

    @GetMapping("/mine")
    public List<TripPlanDto> myPlans(Authentication authentication) {
        return tripPlanService.getMyPlans(authentication);
    }

    @DeleteMapping("/{id}")
    public void deletePlan(@PathVariable Long id, Authentication authentication) {
        tripPlanService.deleteMyPlan(id, authentication);
    }

    @PostMapping("/{id}/generate-itinerary")
    public TripItineraryDto generateItinerary(@PathVariable Long id, Authentication authentication) {
        return tripItineraryService.generateItinerary(id, authentication);
    }
}
