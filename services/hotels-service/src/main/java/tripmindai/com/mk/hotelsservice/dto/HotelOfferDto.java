package tripmindai.com.mk.hotelsservice.dto;

import java.util.List;

public record HotelOfferDto(
        String hotelId,
        String hotelName,
        String checkInDate,
        String checkOutDate,
        double totalPrice,
        String currency,
        Double taxAmount,
        Double totalWithTaxes,
        String offerId,
        String roomType,
        String roomCategory,
        String roomDescription,
        Integer beds,
        String bedType,

        String boardType,
        Boolean refundable,
        String cancellationPolicy,

        Integer adults,
        Integer roomQuantity,

        List<String> amenities,

        Double pricePerNight,
        Double pricePerNightWithTaxes,
        Integer nights,
        String refundLabel
) {}