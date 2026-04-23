package tripmindai.com.mk.hotelsservice.web;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import tripmindai.com.mk.hotelsservice.dto.DestinationSearchDto;
import tripmindai.com.mk.hotelsservice.dto.HotelDetailsDto;
import tripmindai.com.mk.hotelsservice.dto.HotelFullDetailsDto;
import tripmindai.com.mk.hotelsservice.dto.HotelSearchResponseDto;
import tripmindai.com.mk.hotelsservice.service.HotelsSearchService;

import java.util.List;

@RestController
@RequestMapping("/api/hotels")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@Validated
public class HotelsController {

    private final HotelsSearchService hotelsSearchService;

    public HotelsController(HotelsSearchService hotelsSearchService) {
        this.hotelsSearchService = hotelsSearchService;
    }

    @GetMapping("/destinations")
    public List<DestinationSearchDto> destinations(
            @RequestParam @NotBlank(message = "query is required") String query
    ) {
        return hotelsSearchService.searchDestinations(safeTrim(query));
    }

    @GetMapping("/search")
    public HotelSearchResponseDto search(
            @RequestParam @NotBlank(message = "destId is required") String destId,
            @RequestParam @NotBlank(message = "destType is required") String destType,
            @RequestParam @NotBlank(message = "checkIn is required") String checkIn,
            @RequestParam @NotBlank(message = "checkOut is required") String checkOut,
            @RequestParam(defaultValue = "1") @Min(1) int adults,
            @RequestParam(defaultValue = "1") @Min(1) int pageNo,
            @RequestParam(required = false) String priceRange
    ) {
        return hotelsSearchService.searchHotels(
                safeTrim(destId),
                safeTrim(destType),
                safeTrim(checkIn),
                safeTrim(checkOut),
                adults,
                pageNo,
                safeTrim(priceRange)
        );
    }

    @GetMapping("/{hotelId}/details")
    public HotelDetailsDto details(
            @PathVariable @NotBlank(message = "hotelId is required") String hotelId,
            @RequestParam @NotBlank(message = "checkIn is required") String checkIn,
            @RequestParam @NotBlank(message = "checkOut is required") String checkOut,
            @RequestParam(defaultValue = "1") @Min(1) int adults,
            @RequestParam(required = false) String cityName
    ) {
        return hotelsSearchService.hotelDetails(
                safeTrim(hotelId),
                safeTrim(checkIn),
                safeTrim(checkOut),
                adults,
                safeTrim(cityName)
        );
    }

    @GetMapping("/{hotelId}/full-details")
    public HotelFullDetailsDto fullDetails(
            @PathVariable @NotBlank(message = "hotelId is required") String hotelId,
            @RequestParam @NotBlank(message = "checkIn is required") String checkIn,
            @RequestParam @NotBlank(message = "checkOut is required") String checkOut,
            @RequestParam(defaultValue = "1") @Min(1) int adults,
            @RequestParam(required = false) String cityName
    ) {
        return hotelsSearchService.hotelFullDetails(
                safeTrim(hotelId),
                safeTrim(checkIn),
                safeTrim(checkOut),
                adults,
                safeTrim(cityName)
        );
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }
}