package tripmindai.com.mk.hotelsservice.dto;

public record HotelPhotoDto(
        String url,
        String thumbnailUrl,
        String description,
        Integer sortOrder
) {}