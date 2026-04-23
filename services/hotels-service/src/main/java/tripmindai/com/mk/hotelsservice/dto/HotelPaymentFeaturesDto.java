package tripmindai.com.mk.hotelsservice.dto;

import java.util.List;

public record HotelPaymentFeaturesDto(
        String hotelId,
        Boolean payAtProperty,
        Boolean prepaymentRequired,
        Boolean freeCancellationAvailable,
        List<String> supportedCards,
        List<String> paymentNotes
) {}