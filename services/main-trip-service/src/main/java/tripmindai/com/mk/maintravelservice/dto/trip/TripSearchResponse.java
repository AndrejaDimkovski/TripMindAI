package tripmindai.com.mk.maintravelservice.dto.trip;

import tripmindai.com.mk.maintravelservice.dto.flights.FlightOfferDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelOfferDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelSearchItemDto;

import java.util.List;

public record TripSearchResponse(
        List<FlightOfferDto> flights,
        List<HotelSearchItemDto> hotels,
        List<HotelOfferDto> hotelOffers
) {}