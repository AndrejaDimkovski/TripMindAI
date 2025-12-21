package travelmindai.com.mk.maintravelservice.dto;

public record HotelDto(
        String hotelId,
        String name,
        String cityCode,
        Double latitude,
        Double longitude
) {}
