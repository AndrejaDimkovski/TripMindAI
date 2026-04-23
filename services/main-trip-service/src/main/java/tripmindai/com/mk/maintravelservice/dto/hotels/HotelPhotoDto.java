package tripmindai.com.mk.maintravelservice.dto.hotels;

public record HotelPhotoDto(
        String url,
        String thumbnailUrl,
        String description,
        Integer sortOrder
) {}