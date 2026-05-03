package tripmindai.com.mk.maintripservice.dto.hotels;

import java.util.List;

public record HotelDescriptionInfoDto(
        String hotelId,
        String name,
        String description,
        String accommodationType,
        String spokenLanguages,
        String importantInfo,
        List<String> highlights
) {}