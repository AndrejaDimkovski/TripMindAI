package tripmindai.com.mk.maintripservice.dto.trip;

import tripmindai.com.mk.maintripservice.dto.flights.FlightOfferDto;
import tripmindai.com.mk.maintripservice.dto.hotels.HotelOfferDto;
import tripmindai.com.mk.maintripservice.dto.hotels.HotelSearchItemDto;

import java.util.List;

public record TripSearchResponse(
        List<FlightOfferDto> flights,
        List<HotelSearchItemDto> hotels,
        List<HotelOfferDto> hotelOffers,
        boolean flightsServiceAvailable,
        boolean hotelsServiceAvailable,
        String flightsMessage,
        String hotelsMessage
) {
}
