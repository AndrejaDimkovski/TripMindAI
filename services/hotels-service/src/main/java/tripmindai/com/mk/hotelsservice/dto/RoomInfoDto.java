package tripmindai.com.mk.hotelsservice.dto;

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
        String paymentPolicy,
        Boolean refundable,
        String cancellationPolicy
) {}
