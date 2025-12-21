package travelmindai.com.mk.hotelsservice.web;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
import travelmindai.com.mk.hotelsservice.dto.HotelDto;
import travelmindai.com.mk.hotelsservice.dto.HotelOfferDto;
import travelmindai.com.mk.hotelsservice.service.HotelsSearchService;

import java.util.List;

@RestController
@RequestMapping("/api/hotels")
@CrossOrigin(origins = "http://localhost:3001", allowCredentials = "true")
public class HotelsController {

    private final HotelsSearchService hotelsSearchService;

    public HotelsController(HotelsSearchService hotelsSearchService) {
        this.hotelsSearchService = hotelsSearchService;
    }

    @GetMapping("/by-city")
    public List<HotelDto> byCity(
            @RequestParam @NotBlank String cityCode,
            @RequestParam(defaultValue = "10") @Min(1) int limit
    ) {
        return hotelsSearchService.hotelsByCity(cityCode, limit);
    }

    @GetMapping("/offers")
    public List<HotelOfferDto> offers(
            @RequestParam(name = "hotelIds") @NotBlank String hotelIds,
            @RequestParam @NotBlank String checkIn,
            @RequestParam @NotBlank String checkOut,
            @RequestParam(defaultValue = "1") @Min(1) int adults
    ) {
        return hotelsSearchService.offers(hotelIds, checkIn, checkOut, adults);
    }
}
