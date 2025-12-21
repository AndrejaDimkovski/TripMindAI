package travelmindai.com.mk.flightsservice.web;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
import travelmindai.com.mk.flightsservice.dto.FlightOfferDto;
import travelmindai.com.mk.flightsservice.dto.LocationDto;
import travelmindai.com.mk.flightsservice.service.FlightOrderService;
import travelmindai.com.mk.flightsservice.service.FlightsSearchService;
import travelmindai.com.mk.flightsservice.service.LocationsService;

import java.util.List;

@RestController
@RequestMapping("/api/flights")
@CrossOrigin(origins = "http://localhost:3001", allowCredentials = "true")
public class FlightsController {

    private final FlightsSearchService flightsSearchService;
    private final LocationsService locationsService;
    private final FlightOrderService orderService;

    public FlightsController(FlightsSearchService flightsSearchService,
                             LocationsService locationsService,
                             FlightOrderService orderService) {
        this.flightsSearchService = flightsSearchService;
        this.locationsService = locationsService;
        this.orderService = orderService;
    }

    @GetMapping("/search")
    public List<FlightOfferDto> search(
            @RequestParam @NotBlank String origin,
            @RequestParam @NotBlank String dest,
            @RequestParam(name = "from") @NotBlank String from,
            @RequestParam(name = "to", required = false) String to,
            @RequestParam(defaultValue = "1") @Min(1) int adults
    ) {
        return flightsSearchService.search(origin, dest, from, to, adults);
    }

    @GetMapping("/locations")
    public List<LocationDto> locations(@RequestParam @NotBlank String keyword) {
        try {
            return locationsService.searchAirports(keyword);
        } catch (Exception e) {
            return List.of();
        }
    }

    // //@PostMapping("/order")
    // public FlightOrder order(@RequestBody JsonObject order) throws ResponseException {
    //     return orderService.createOrder(order);
    // }
}
