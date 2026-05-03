package tripmindai.com.mk.maintripservice.dto.hotels;

import java.util.List;

public record HotelFullDetailsDto(
        HotelDetailsDto basicDetails,
        HotelDescriptionInfoDto descriptionInfo,
        List<RoomInfoDto> rooms,
        HotelPaymentFeaturesDto paymentFeatures,
        HotelPoliciesDto policies,
        List<HotelPhotoDto> photos,
        List<HotelFacilityDto> facilities
) {}