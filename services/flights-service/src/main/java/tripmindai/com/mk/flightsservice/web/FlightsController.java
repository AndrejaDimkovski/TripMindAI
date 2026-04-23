package tripmindai.com.mk.flightsservice.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tripmindai.com.mk.flightsservice.dto.FlightDestinationDto;
import tripmindai.com.mk.flightsservice.dto.FlightDetailsDto;
import tripmindai.com.mk.flightsservice.dto.FlightOfferDto;
import tripmindai.com.mk.flightsservice.service.FlightsSearchService;

import java.util.List;

@RestController
@RequestMapping("/api/flights")
public class FlightsController {

    private final FlightsSearchService flightsSearchService;

    public FlightsController(FlightsSearchService flightsSearchService) {
        this.flightsSearchService = flightsSearchService;
    }

    @GetMapping("/destinations")
    public List<FlightDestinationDto> destinations(@RequestParam String query) {
        return flightsSearchService.searchDestinations(query);
    }

    @GetMapping("/search")
    public List<FlightOfferDto> search(
            @RequestParam String origin,
            @RequestParam String destination,
            @RequestParam String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "1") int adults
    ) {
        return flightsSearchService.search(origin, destination, from, to, adults);
    }

    @GetMapping("/details")
    public FlightDetailsDto details(@RequestParam String token) {
        return flightsSearchService.getFlightDetails(token);
    }
}
