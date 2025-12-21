package travelmindai.com.mk.maintravelservice.service;

import org.springframework.stereotype.Service;
import travelmindai.com.mk.maintravelservice.config.FlightsClient;
import travelmindai.com.mk.maintravelservice.config.HotelsClient;
import travelmindai.com.mk.maintravelservice.dto.HotelDto;
import travelmindai.com.mk.maintravelservice.dto.HotelOfferDto;
import travelmindai.com.mk.maintravelservice.dto.TripSearchResponse;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TripSearchService {

    private final FlightsClient flightsClient;
    private final HotelsClient hotelsClient;

    public TripSearchService(FlightsClient flightsClient, HotelsClient hotelsClient) {
        this.flightsClient = flightsClient;
        this.hotelsClient = hotelsClient;
    }

    public TripSearchResponse search(
            String origin,
            String destination,
            String from,
            String to,
            int adults,
            String cityCode
    ) {
        LocalDate checkIn;
        LocalDate checkOut;

        try {
            checkIn = LocalDate.parse(from);
        } catch (DateTimeParseException e) {
            checkIn = LocalDate.now();
        }

        try {
            checkOut = (to == null || to.isBlank()) ? checkIn.plusDays(1) : LocalDate.parse(to);
        } catch (DateTimeParseException e) {
            checkOut = checkIn.plusDays(1);
        }

        if (!checkOut.isAfter(checkIn)) {
            checkOut = checkIn.plusDays(1);
        }

        String checkInStr = checkIn.toString();
        String checkOutStr = checkOut.toString();

        var flights = flightsClient.search(
                origin,
                destination,
                checkInStr,
                (to == null || to.isBlank()) ? null : checkOutStr,
                adults
        );

        List<HotelDto> hotels = hotelsClient.hotelsByCity(cityCode, 10);

        String hotelIdsCsv = hotels.stream()
                .map(HotelDto::hotelId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.joining(","));

        List<HotelOfferDto> hotelOffers = hotelIdsCsv.isBlank()
                ? Collections.emptyList()
                : hotelsClient.hotelOffers(hotelIdsCsv, checkInStr, checkOutStr, adults);

        return new TripSearchResponse(flights, hotels, hotelOffers);
    }
}
