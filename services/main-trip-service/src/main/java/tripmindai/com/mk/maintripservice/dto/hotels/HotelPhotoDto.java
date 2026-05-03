package tripmindai.com.mk.maintripservice.dto.hotels;

public record HotelPhotoDto(
        String url,
        String thumbnailUrl,
        String description,
        Integer sortOrder
) {}