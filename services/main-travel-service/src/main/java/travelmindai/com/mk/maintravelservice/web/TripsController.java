package travelmindai.com.mk.maintravelservice.web;

import org.springframework.web.bind.annotation.*;
import travelmindai.com.mk.maintravelservice.dto.TripSearchResponse;
import travelmindai.com.mk.maintravelservice.service.TripSearchService;

@RestController
@RequestMapping("/api/trips")
@CrossOrigin(origins = "http://localhost:3001", allowCredentials = "true")
public class TripsController {

    private final TripSearchService service;

    public TripsController(TripSearchService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public TripSearchResponse search(
            @RequestParam String origin,
            @RequestParam String destination,
            @RequestParam String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "1") int adults,
            @RequestParam(required = false) String cityCode  // ✅ optional
    ) {
        // ✅ fallback: ако нема cityCode, користи destination како cityCode
        String cc = (cityCode == null || cityCode.isBlank()) ? destination : cityCode;
        return service.search(origin, destination, from, to, adults, cc);
    }
}
