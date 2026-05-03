package tripmindai.com.mk.maintripservice.dto.hotels;

import java.util.List;

public record HotelSearchResponseDto(
        String destId,
        String destType,
        String checkIn,
        String checkOut,
        Integer adults,
        Integer pageNo,
        List<HotelSearchItemDto> hotels
) {}