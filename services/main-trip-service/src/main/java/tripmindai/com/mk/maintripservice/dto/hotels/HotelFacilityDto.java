package tripmindai.com.mk.maintripservice.dto.hotels;

public record HotelFacilityDto(
        String name,
        String category,
        String icon,
        Boolean available
) {}