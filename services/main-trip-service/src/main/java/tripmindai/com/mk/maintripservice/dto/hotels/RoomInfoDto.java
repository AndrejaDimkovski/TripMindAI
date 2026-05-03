package tripmindai.com.mk.maintripservice.dto.hotels;

import java.util.List;

public record RoomInfoDto(
        String roomId,
        String roomName,
        String description,
        Integer maxAdults,
        Integer maxChildren,
        Integer beds,
        String bedType,
        Double roomSize,
        String roomSizeUnit,
        List<String> photos,
        List<String> amenities,
        String boardType,
        Boolean refundable,
        String cancellationPolicy
) {}