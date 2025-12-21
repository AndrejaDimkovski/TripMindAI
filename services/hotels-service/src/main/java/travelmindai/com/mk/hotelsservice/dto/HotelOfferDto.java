package travelmindai.com.mk.hotelsservice.dto;

public record HotelOfferDto(
        String hotelId,
        String hotelName,
        String checkInDate,
        String checkOutDate,
        double totalPrice,
        String currency
) {}
