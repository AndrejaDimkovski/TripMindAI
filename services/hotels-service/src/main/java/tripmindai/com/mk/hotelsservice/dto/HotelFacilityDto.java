package tripmindai.com.mk.hotelsservice.dto;

public record HotelFacilityDto(
        String name,
        String category,
        String icon,
        Boolean available
) {}