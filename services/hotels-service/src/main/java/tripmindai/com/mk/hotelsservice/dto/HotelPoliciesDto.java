package tripmindai.com.mk.hotelsservice.dto;

import java.util.List;

public record HotelPoliciesDto(
        String hotelId,
        String checkInFrom,
        String checkInUntil,
        String checkOutFrom,
        String checkOutUntil,
        String cancellationPolicy,
        String childPolicy,
        String petPolicy,
        List<String> policyNotes
) {}