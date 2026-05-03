package tripmindai.com.mk.maintripservice.dto.hotels;

import java.util.List;

public record HotelDetailsDto(
        String hotelId,
        String name,
        String description,
        Double latitude,
        Double longitude,
        String address,
        String cityName,
        String countryCode,
        String chainCode,
        Integer rating,
        Double reviewScore,
        String reviewScoreWord,
        Integer reviewCount,
        List<String> amenities,
        List<String> mediaUrls,
        List<RoomInfoDto> rooms
) {}