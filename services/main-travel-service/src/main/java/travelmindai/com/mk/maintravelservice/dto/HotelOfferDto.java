package travelmindai.com.mk.maintravelservice.dto;

public record HotelOfferDto(
        String hotelId,
        String hotelName,
        String checkIn,
        String checkOut,
        double total,
        String currency
) {}
