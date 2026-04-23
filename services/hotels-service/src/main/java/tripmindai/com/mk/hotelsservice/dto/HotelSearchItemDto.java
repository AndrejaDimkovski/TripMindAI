package tripmindai.com.mk.hotelsservice.dto;

public record HotelSearchItemDto(
        String hotelId,
        String name,
        String address,
        String city,
        String country,
        Double latitude,
        Double longitude,
        Double reviewScore,
        String reviewScoreWord,
        Integer reviewCount,
        String photoUrl,
        Double totalPrice,
        String currency,
        String checkInDate,
        String checkOutDate
) {}