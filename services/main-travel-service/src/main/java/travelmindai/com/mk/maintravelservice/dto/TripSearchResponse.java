package travelmindai.com.mk.maintravelservice.dto;

import java.util.List;

public record TripSearchResponse(
        List<FlightOfferDto> flights,
        List<HotelDto> hotels,
        List<HotelOfferDto> hotelOffers
) {}
