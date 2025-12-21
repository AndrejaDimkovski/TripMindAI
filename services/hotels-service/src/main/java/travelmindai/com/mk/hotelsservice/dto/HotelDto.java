package travelmindai.com.mk.hotelsservice.dto;

public record HotelDto(
        String hotelId,
        String name,
        String cityCode,
        Double latitude,
        Double longitude
) {}
