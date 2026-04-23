package tripmindai.com.mk.maintravelservice.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tripmindai.com.mk.maintravelservice.dto.flights.FlightDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelFullDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.trip.TripSearchResponse;
import tripmindai.com.mk.maintravelservice.service.trip.TripSearchService;

import java.util.Locale;

@RestController
@RequestMapping("/api/trips")
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
            @RequestParam(required = false) String cityCode,
            @RequestParam(required = false) String countryCode,
            @RequestParam(required = false, defaultValue = "EUR") String targetCurrency,
            @RequestParam(required = false) String countryOfResidence,
            @RequestParam(required = false, defaultValue = "1") Integer roomQuantity,
            @RequestParam(required = false) String priceRange,
            @RequestParam(required = false, defaultValue = "NONE") String paymentPolicy,
            @RequestParam(required = false) String boardType,
            @RequestParam(required = false, defaultValue = "false") Boolean includeClosed,
            @RequestParam(required = false, defaultValue = "false") Boolean bestRateOnly
    ) {
        String resolvedOrigin = trim(origin);
        String resolvedDestination = trim(destination);

        return service.search(
                resolvedOrigin,
                resolvedDestination,
                from,
                to,
                Math.max(1, adults),
                isBlank(cityCode) ? resolvedDestination : cityCode.trim(),
                normalizeUpper(countryCode),
                normalizeUpperOrDefault(targetCurrency, "EUR"),
                normalizeUpper(countryOfResidence),
                roomQuantity == null ? 1 : Math.max(1, roomQuantity),
                isBlank(priceRange) ? null : priceRange.trim(),
                normalizeUpperOrDefault(paymentPolicy, "NONE"),
                normalizeUpper(boardType),
                includeClosed != null && includeClosed,
                bestRateOnly != null && bestRateOnly
        );
    }

    @GetMapping("/hotel-details")
    public HotelDetailsDto hotelDetails(
            @RequestParam String hotelId,
            @RequestParam String checkIn,
            @RequestParam String checkOut,
            @RequestParam(defaultValue = "1") int adults,
            @RequestParam(required = false) String cityName
    ) {
        return service.hotelDetails(hotelId, checkIn, checkOut, adults, cityName);
    }

    @GetMapping("/hotel-full-details")
    public HotelFullDetailsDto hotelFullDetails(
            @RequestParam String hotelId,
            @RequestParam String checkIn,
            @RequestParam String checkOut,
            @RequestParam(defaultValue = "1") int adults,
            @RequestParam(required = false) String cityName
    ) {
        return service.hotelFullDetails(hotelId, checkIn, checkOut, adults, cityName);
    }

    @GetMapping("/flight-details")
    public FlightDetailsDto flightDetails(@RequestParam String token) {
        return service.flightDetails(token);
    }

    private String normalizeUpper(String value) {
        return isBlank(value) ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeUpperOrDefault(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim().toUpperCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
