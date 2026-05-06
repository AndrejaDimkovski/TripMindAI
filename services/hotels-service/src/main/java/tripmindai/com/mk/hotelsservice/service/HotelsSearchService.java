package tripmindai.com.mk.hotelsservice.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import tripmindai.com.mk.hotelsservice.config.BookingRapidApiClient;
import tripmindai.com.mk.hotelsservice.dto.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HotelsSearchService {

    private static final int MAX_RESULTS = 80;
    private static final int MAX_ROOM_PHOTOS = 8;
    private static final int MAX_HOTEL_PHOTOS = 12;

    private final BookingRapidApiClient bookingClient;

    public HotelsSearchService(BookingRapidApiClient bookingClient) {
        this.bookingClient = bookingClient;
    }

    @Cacheable(
            cacheNames = "hotel-destinations",
            key = "#root.target.destinationCacheKey(#query)",
            unless = "#result == null"
    )
    public List<DestinationSearchDto> searchDestinations(String query) {
        Map<?, ?> raw = bookingClient.searchDestinationRaw(query);
        return mapDestinations(raw);
    }

    public HotelSearchResponseDto searchHotels(
            String destId,
            String destType,
            String checkIn,
            String checkOut,
            int adults,
            int pageNo
    ) {
        return searchHotels(destId, destType, checkIn, checkOut, adults, pageNo, null);
    }

    @Cacheable(
            cacheNames = "hotel-search",
            key = "#root.target.hotelSearchCacheKey(#destId, #destType, #checkIn, #checkOut, #adults, #pageNo, #priceRange)",
            unless = "#result == null"
    )
    public HotelSearchResponseDto searchHotels(
            String destId,
            String destType,
            String checkIn,
            String checkOut,
            int adults,
            int pageNo,
            String priceRange
    ) {
        LocalDate in = parseDateOrTomorrow(checkIn);
        LocalDate out = parseDateOrTomorrow(checkOut);

        if (!out.isAfter(in)) {
            out = in.plusDays(1);
        }

        int adultsEff = Math.max(1, adults);
        int pageEff = Math.max(1, pageNo);

        Map<?, ?> raw = bookingClient.searchHotelsRaw(
                destId,
                destType,
                in.toString(),
                out.toString(),
                adultsEff,
                pageEff
        );

        List<HotelSearchItemDto> hotels = mapHotelSearchItems(
                raw,
                in.toString(),
                out.toString()
        );

        hotels = applyBudgetFilterAndSort(hotels, priceRange);

        return new HotelSearchResponseDto(
                destId,
                destType,
                in.toString(),
                out.toString(),
                adultsEff,
                pageEff,
                hotels
        );
    }

    @Cacheable(
            cacheNames = "hotel-details",
            key = "#root.target.hotelDetailsCacheKey(#hotelId, #checkIn, #checkOut, #adults, #cityNameFromReq)",
            unless = "#result == null"
    )
    public HotelDetailsDto hotelDetails(
            String hotelId,
            String checkIn,
            String checkOut,
            int adults,
            String cityNameFromReq
    ) {
        if (isBlank(hotelId)) return null;

        LocalDate in = parseDateOrTomorrow(checkIn);
        LocalDate out = parseDateOrTomorrow(checkOut);

        if (!out.isAfter(in)) {
            out = in.plusDays(1);
        }

        int adultsEff = Math.max(1, adults);

        Map<?, ?> raw = bookingClient.hotelDetailsRaw(
                hotelId.trim(),
                in.toString(),
                out.toString(),
                adultsEff
        );

        if (raw == null) return null;

        Object dataObj = raw.get("data");
        Map<?, ?> data = mapOf(dataObj);
        if (data == null) return null;

        String id = firstNonBlank(
                str(data.get("hotel_id")),
                str(data.get("id")),
                str(readNested(data, "property", "id")),
                hotelId.trim()
        );

        String name = firstNonBlank(
                str(data.get("hotel_name")),
                str(data.get("hotel_name_trans")),
                str(data.get("name")),
                str(data.get("wishlistName")),
                str(data.get("accessibilityLabel")),
                str(readNested(data, "property", "name")),
                str(readNested(data, "rawData", "name"))
        );

        Double lat = firstDouble(
                dbl(data.get("latitude")),
                dbl(data.get("lat")),
                dbl(readNested(data, "property", "latitude")),
                dbl(readNested(data, "rawData", "latitude"))
        );

        Double lng = firstDouble(
                dbl(data.get("longitude")),
                dbl(data.get("lng")),
                dbl(readNested(data, "property", "longitude")),
                dbl(readNested(data, "rawData", "longitude"))
        );

        String address = firstNonBlank(
                str(data.get("address")),
                str(data.get("address_trans")),
                str(data.get("full_address")),
                str(data.get("address_line")),
                str(readNested(data, "property", "address")),
                str(readNested(data, "location", "address"))
        );

        String cityName = firstNonBlank(
                cityNameFromReq,
                str(data.get("city")),
                str(data.get("city_name")),
                str(data.get("city_name_en")),
                str(data.get("district")),
                str(readNested(data, "rawData", "wishlistName"))
        );

        String country = firstNonBlank(
                str(data.get("country_trans")),
                str(data.get("country")),
                str(data.get("country_name")),
                str(readNested(data, "property", "country")),
                str(readNested(data, "rawData", "countryName")),
                mapCountryCodeToName(
                        firstNonBlank(
                                str(data.get("countrycode")),
                                str(data.get("country_code")),
                                str(readNested(data, "property", "countryCode")),
                                str(readNested(data, "rawData", "countryCode"))
                        )
                )
        );

        String chainCode = firstNonBlank(
                str(data.get("chain")),
                str(data.get("chain_code")),
                str(readNested(data, "property", "chainCode"))
        );

        Integer rating = firstPositiveInteger(
                integer(data.get("class")),
                integer(data.get("star_rating")),
                integer(data.get("hotel_class")),
                integer(readNested(data, "property", "class")),
                integer(readNested(data, "rawData", "accuratePropertyClass")),
                integer(readNested(data, "rawData", "propertyClass"))
        );

        Double reviewScore = firstDouble(
                dbl(data.get("review_score")),
                dbl(data.get("reviewScore")),
                dbl(readNested(data, "reviewScore", "score")),
                dbl(readNested(data, "property", "reviewScore")),
                dbl(readNested(data, "rawData", "reviewScore"))
        );

        String reviewScoreWord = firstNonBlank(
                str(data.get("review_score_word")),
                str(data.get("reviewScoreWord")),
                str(readNested(data, "reviewScore", "word")),
                str(readNested(data, "property", "reviewScoreWord")),
                str(readNested(data, "rawData", "reviewScoreWord"))
        );

        Integer reviewCount = firstInteger(
                integer(data.get("review_nr")),
                integer(data.get("reviewCount")),
                integer(readNested(data, "reviewScore", "reviewCount")),
                integer(readNested(data, "property", "reviewCount")),
                integer(readNested(data, "rawData", "reviewCount"))
        );

        String description = extractDescription(data);
        List<String> amenities = extractAmenities(data);
        List<String> mediaUrls = extractHotelPhotos(data);
        List<RoomInfoDto> rooms = extractRooms(data);

        return new HotelDetailsDto(
                id,
                name,
                description,
                lat,
                lng,
                address,
                cityName,
                country,
                chainCode,
                rating,
                reviewScore,
                reviewScoreWord,
                reviewCount,
                amenities,
                mediaUrls,
                rooms
        );
    }

    @Cacheable(
            cacheNames = "hotel-full-details",
            key = "#root.target.hotelDetailsCacheKey(#hotelId, #checkIn, #checkOut, #adults, #cityNameFromReq)",
            unless = "#result == null"
    )
    public HotelFullDetailsDto hotelFullDetails(
            String hotelId,
            String checkIn,
            String checkOut,
            int adults,
            String cityNameFromReq
    ) {
        if (isBlank(hotelId)) return null;

        LocalDate in = parseDateOrTomorrow(checkIn);
        LocalDate out = parseDateOrTomorrow(checkOut);

        if (!out.isAfter(in)) {
            out = in.plusDays(1);
        }

        int adultsEff = Math.max(1, adults);

        HotelDetailsDto basicDetails = hotelDetails(
                hotelId,
                in.toString(),
                out.toString(),
                adultsEff,
                cityNameFromReq
        );

        Map<?, ?> rawDetails = bookingClient.hotelDetailsRaw(
                hotelId,
                in.toString(),
                out.toString(),
                adultsEff
        );

        Map<?, ?> descriptionRaw = bookingClient.getDescriptionAndInfoRaw(hotelId);
        Map<?, ?> roomsRaw = bookingClient.getRoomListRaw(hotelId, in.toString(), out.toString(), adultsEff);
        Map<?, ?> photosRaw = bookingClient.getHotelPhotosRaw(hotelId);
        Map<?, ?> facilitiesRaw = bookingClient.getHotelFacilitiesRaw(hotelId);

        HotelDescriptionInfoDto descriptionInfo = mapDescriptionInfo(hotelId, rawDetails != null ? rawDetails : descriptionRaw, basicDetails);
        List<RoomInfoDto> rooms = mapRoomList(roomsRaw, basicDetails != null ? basicDetails.rooms() : List.of());
        HotelPaymentFeaturesDto paymentFeatures = mapPaymentFeatures(hotelId, rawDetails);
        HotelPoliciesDto policies = mapPolicies(hotelId, rawDetails);
        List<HotelPhotoDto> photos = mapPhotos(photosRaw, basicDetails != null ? basicDetails.mediaUrls() : List.of());
        List<HotelFacilityDto> facilities = mapFacilities(facilitiesRaw, basicDetails != null ? basicDetails.amenities() : List.of());

        return new HotelFullDetailsDto(
                basicDetails,
                descriptionInfo,
                rooms,
                paymentFeatures,
                policies,
                photos,
                facilities
        );
    }

    public String destinationCacheKey(String query) {
        return normalizeCachePart(query);
    }

    public String hotelSearchCacheKey(
            String destId,
            String destType,
            String checkIn,
            String checkOut,
            int adults,
            int pageNo,
            String priceRange
    ) {
        LocalDate in = parseDateOrTomorrow(checkIn);
        LocalDate out = parseDateOrTomorrow(checkOut);

        if (!out.isAfter(in)) {
            out = in.plusDays(1);
        }

        return String.join("|",
                normalizeCachePart(destId),
                normalizeCachePart(destType),
                in.toString(),
                out.toString(),
                String.valueOf(Math.max(1, adults)),
                String.valueOf(Math.max(1, pageNo)),
                normalizeCachePart(priceRange)
        );
    }

    public String hotelDetailsCacheKey(
            String hotelId,
            String checkIn,
            String checkOut,
            int adults,
            String cityNameFromReq
    ) {
        LocalDate in = parseDateOrTomorrow(checkIn);
        LocalDate out = parseDateOrTomorrow(checkOut);

        if (!out.isAfter(in)) {
            out = in.plusDays(1);
        }

        return String.join("|",
                normalizeCachePart(hotelId),
                in.toString(),
                out.toString(),
                String.valueOf(Math.max(1, adults)),
                normalizeCachePart(cityNameFromReq)
        );
    }

    public String normalizeCachePart(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private List<DestinationSearchDto> mapDestinations(Map<?, ?> raw) {
        if (raw == null) return List.of();

        Object dataObj = raw.get("data");
        if (!(dataObj instanceof List<?> dataList)) return List.of();

        List<DestinationSearchDto> result = new ArrayList<>();

        for (Object item : dataList) {
            if (!(item instanceof Map<?, ?> map)) continue;

            result.add(new DestinationSearchDto(
                    str(map.get("dest_id")),
                    str(map.get("dest_type")),
                    str(map.get("search_type")),
                    str(map.get("label")),
                    str(map.get("name")),
                    str(map.get("city_name")),
                    str(map.get("country")),
                    str(map.get("region")),
                    dbl(map.get("latitude")),
                    dbl(map.get("longitude")),
                    str(map.get("image_url")),
                    integer(map.get("nr_hotels"))
            ));
        }

        return result;
    }

    private List<HotelSearchItemDto> mapHotelSearchItems(
            Map<?, ?> raw,
            String checkIn,
            String checkOut
    ) {
        List<Map<?, ?>> hotels = extractHotelList(raw);
        if (hotels.isEmpty()) return List.of();

        List<HotelSearchItemDto> result = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();

        for (Map<?, ?> h : hotels) {
            String hotelId = firstNonBlank(
                    str(h.get("hotel_id")),
                    str(h.get("id")),
                    str(readNested(h, "property", "id")),
                    str(h.get("propertyId")),
                    str(readNested(h, "rawData", "id"))
            );

            if (isBlank(hotelId) || !seen.add(hotelId)) continue;

            String name = firstNonBlank(
                    str(h.get("hotel_name")),
                    str(h.get("hotel_name_trans")),
                    str(h.get("name")),
                    str(h.get("wishlistName")),
                    str(readNested(h, "property", "name")),
                    str(readNested(h, "property", "wishlistName")),
                    str(readNested(h, "rawData", "name"))
            );

            String address = firstNonBlank(
                    str(h.get("address")),
                    str(h.get("address_trans")),
                    str(h.get("full_address")),
                    str(h.get("address_line")),
                    str(readNested(h, "property", "address")),
                    str(readNested(h, "location", "address"))
            );

            String city = firstNonBlank(
                    str(h.get("city")),
                    str(h.get("city_name")),
                    str(h.get("city_name_en")),
                    str(h.get("district")),
                    str(readNested(h, "location", "city")),
                    str(readNested(h, "property", "city")),
                    str(readNested(h, "rawData", "wishlistName"))
            );

            String country = firstNonBlank(
                    str(h.get("country_trans")),
                    str(h.get("country")),
                    str(h.get("countryName")),
                    str(readNested(h, "location", "country")),
                    str(readNested(h, "property", "country")),
                    str(readNested(h, "rawData", "countryName")),
                    mapCountryCodeToName(
                            firstNonBlank(
                                    str(h.get("countrycode")),
                                    str(h.get("country_code")),
                                    str(readNested(h, "property", "countryCode")),
                                    str(readNested(h, "rawData", "countryCode"))
                            )
                    )
            );

            Double lat = firstDouble(
                    dbl(h.get("latitude")),
                    dbl(h.get("lat")),
                    dbl(readNested(h, "property", "latitude")),
                    dbl(readNested(h, "location", "latitude")),
                    dbl(readNested(h, "rawData", "latitude"))
            );

            Double lng = firstDouble(
                    dbl(h.get("longitude")),
                    dbl(h.get("lng")),
                    dbl(readNested(h, "property", "longitude")),
                    dbl(readNested(h, "location", "longitude")),
                    dbl(readNested(h, "rawData", "longitude"))
            );

            Double reviewScore = firstDouble(
                    dbl(h.get("review_score")),
                    dbl(h.get("reviewScore")),
                    dbl(readNested(h, "reviewScore", "score")),
                    dbl(readNested(h, "property", "reviewScore")),
                    dbl(readNested(h, "rawData", "reviewScore"))
            );

            String reviewScoreWord = firstNonBlank(
                    str(h.get("review_score_word")),
                    str(h.get("reviewScoreWord")),
                    str(readNested(h, "reviewScore", "word")),
                    str(readNested(h, "property", "reviewScoreWord")),
                    str(readNested(h, "rawData", "reviewScoreWord"))
            );

            Integer reviewCount = firstInteger(
                    integer(h.get("review_nr")),
                    integer(h.get("reviewCount")),
                    integer(readNested(h, "reviewScore", "reviewCount")),
                    integer(readNested(h, "property", "reviewCount")),
                    integer(readNested(h, "rawData", "reviewCount"))
            );

            String photoUrl = firstNonBlank(
                    str(h.get("main_photo_url")),
                    str(h.get("max_1440_photo_url")),
                    str(h.get("photoMainUrl")),
                    str(readNested(h, "property", "mainPhotoUrl")),
                    str(readNested(h, "property", "photoUrls", "0"))
            );

            Double totalPrice = firstPositive(
                    dbl(h.get("min_total_price")),
                    dbl(h.get("gross_price")),
                    dbl(h.get("price")),
                    dbl(readNested(h, "composite_price_breakdown", "gross_amount", "value")),
                    dbl(readNested(h, "priceBreakdown", "grossPrice", "value")),
                    dbl(readNested(h, "product_price_breakdown", "gross_amount", "value")),
                    dbl(readNested(h, "property", "priceBreakdown", "grossPrice", "value")),
                    dbl(readNested(h, "rawData", "priceBreakdown", "grossPrice", "value"))
            );

            String currency = firstNonBlank(
                    str(h.get("currencycode")),
                    str(h.get("currency")),
                    str(readNested(h, "composite_price_breakdown", "gross_amount", "currency")),
                    str(readNested(h, "priceBreakdown", "grossPrice", "currency")),
                    str(readNested(h, "product_price_breakdown", "gross_amount", "currency")),
                    str(readNested(h, "property", "priceBreakdown", "grossPrice", "currency")),
                    str(readNested(h, "rawData", "currency")),
                    "EUR"
            );

            result.add(new HotelSearchItemDto(
                    hotelId,
                    name,
                    address,
                    city,
                    country,
                    lat,
                    lng,
                    reviewScore,
                    reviewScoreWord,
                    reviewCount,
                    photoUrl,
                    totalPrice,
                    currency,
                    checkIn,
                    checkOut
            ));
        }

        return result;
    }

    private List<HotelSearchItemDto> applyBudgetFilterAndSort(
            List<HotelSearchItemDto> hotels,
            String priceRange
    ) {
        if (hotels == null || hotels.isEmpty()) {
            return List.of();
        }

        Double min = null;
        Double max = null;

        if (priceRange != null && !priceRange.isBlank()) {
            String normalized = priceRange.trim().toUpperCase(Locale.ROOT);

            switch (normalized) {
                case "LOW", "BUDGET", "CHEAP" -> {
                    min = 0.0;
                    max = 500.0;
                }
                case "MEDIUM", "MID" -> {
                    min = 500.0;
                    max = 1200.0;
                }
                case "HIGH", "LUXURY", "PREMIUM" -> {
                    min = 1200.0;
                    max = null;
                }
                default -> {
                    PriceBounds parsed = parseCustomPriceRange(priceRange);
                    min = parsed.min();
                    max = parsed.max();
                }
            }
        }

        final Double finalMin = min;
        final Double finalMax = max;

        return hotels.stream()
                .filter(Objects::nonNull)
                .filter(h -> h.totalPrice() != null && h.totalPrice() > 0)
                .filter(h -> finalMin == null || h.totalPrice() >= finalMin)
                .filter(h -> finalMax == null || h.totalPrice() <= finalMax)
                .sorted(Comparator.comparing(HotelSearchItemDto::totalPrice))
                .limit(MAX_RESULTS)
                .collect(Collectors.toList());
    }

    private PriceBounds parseCustomPriceRange(String priceRange) {
        if (priceRange == null || priceRange.isBlank()) {
            return new PriceBounds(null, null);
        }

        String cleaned = priceRange.trim()
                .replace("€", "")
                .replace("EUR", "")
                .replace(" ", "");

        if (cleaned.contains("-")) {
            String[] parts = cleaned.split("-", 2);
            Double min = toDouble(parts[0]);
            Double max = toDouble(parts[1]);
            return new PriceBounds(min, max);
        }

        if (cleaned.startsWith("<=")) {
            return new PriceBounds(null, toDouble(cleaned.substring(2)));
        }

        if (cleaned.startsWith(">=")) {
            return new PriceBounds(toDouble(cleaned.substring(2)), null);
        }

        if (cleaned.startsWith("<")) {
            return new PriceBounds(null, toDouble(cleaned.substring(1)));
        }

        if (cleaned.startsWith(">")) {
            return new PriceBounds(toDouble(cleaned.substring(1)), null);
        }

        return new PriceBounds(null, null);
    }

    private Double toDouble(String value) {
        try {
            return value == null || value.isBlank() ? null : Double.valueOf(value);
        } catch (Exception e) {
            return null;
        }
    }

    private HotelDescriptionInfoDto mapDescriptionInfo(
            String hotelId,
            Map<?, ?> raw,
            HotelDetailsDto basicDetails
    ) {
        Map<?, ?> data = raw != null ? mapOf(raw.get("data")) : null;

        String name = basicDetails != null ? basicDetails.name() : null;

        String description = firstMeaningfulText(
                data != null ? data.get("description") : null,
                data != null ? data.get("hotel_description") : null,
                data != null ? data.get("summary") : null,
                readNested(data, "hotel_text"),
                readNested(data, "property_description", "description"),
                readNested(data, "property_description", "summary"),
                readNested(data, "property_description", "text"),
                basicDetails != null ? basicDetails.description() : null
        );

        String accommodationType = firstNonBlank(
                data != null ? str(data.get("accommodation_type_name")) : null,
                data != null ? str(data.get("property_type")) : null
        );

        String spokenLanguages = firstNonBlank(
                data != null ? str(data.get("spoken_languages")) : null
        );

        String importantInfo = firstMeaningfulText(
                data != null ? data.get("important_info") : null,
                data != null ? data.get("important_information") : null
        );

        LinkedHashSet<String> highlights = new LinkedHashSet<>();
        if (data != null) {
            addStringList(highlights, data.get("highlights"));
        }

        return new HotelDescriptionInfoDto(
                hotelId,
                name,
                description,
                accommodationType,
                spokenLanguages,
                importantInfo,
                highlights.stream().toList()
        );
    }

    private HotelPaymentFeaturesDto mapPaymentFeatures(String hotelId, Map<?, ?> raw) {
        Map<?, ?> data = raw != null ? mapOf(raw.get("data")) : null;

        Boolean payAtProperty = null;
        Boolean prepaymentRequired = null;
        Boolean freeCancellationAvailable = null;

        List<String> supportedCards = new ArrayList<>();
        List<String> paymentNotes = new ArrayList<>();

        if (data != null) {
            payAtProperty = bool(data.get("pay_at_property"));
            prepaymentRequired = bool(data.get("prepayment_required"));
            freeCancellationAvailable = bool(data.get("free_cancellation"));

            supportedCards.addAll(extractSimpleStringList(data.get("credit_cards")));
            paymentNotes.addAll(extractSimpleStringList(data.get("payment_notes")));

            Object blocksObj = data.get("block");
            if (blocksObj instanceof List<?> blocks && !blocks.isEmpty()) {
                Object firstObj = blocks.get(0);
                if (firstObj instanceof Map<?, ?> firstBlock) {
                    Map<?, ?> paymentterms = mapOf(firstBlock.get("paymentterms"));
                    if (paymentterms != null) {
                        Map<?, ?> prepayment = mapOf(paymentterms.get("prepayment"));
                        if (prepayment != null) {
                            String prepaymentDesc = firstNonBlank(
                                    str(prepayment.get("description")),
                                    str(prepayment.get("simple_translation")),
                                    str(prepayment.get("type_translation")),
                                    str(prepayment.get("extended_type_translation"))
                            );

                            if (!isBlank(prepaymentDesc)) {
                                paymentNotes.add(prepaymentDesc);

                                String lower = prepaymentDesc.toLowerCase(Locale.ROOT);
                                if (prepaymentRequired == null) {
                                    prepaymentRequired = !(lower.contains("no prepayment")
                                            || lower.contains("no payment needed today")
                                            || lower.contains("pay during your stay"));
                                }
                                if (payAtProperty == null) {
                                    payAtProperty = lower.contains("pay during your stay")
                                            || lower.contains("at the property");
                                }
                            }
                        }

                        Map<?, ?> cancellation = mapOf(paymentterms.get("cancellation"));
                        if (cancellation != null) {
                            String cancellationType = firstNonBlank(
                                    str(cancellation.get("type_translation")),
                                    str(cancellation.get("description"))
                            );

                            if (!isBlank(cancellationType) && freeCancellationAvailable == null) {
                                freeCancellationAvailable =
                                        cancellationType.toLowerCase(Locale.ROOT).contains("free");
                            }

                            String cancellationDesc = str(cancellation.get("description"));
                            if (!isBlank(cancellationDesc)) {
                                paymentNotes.add(cancellationDesc);
                            }
                        }
                    }
                }
            }
        }

        supportedCards = supportedCards.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();

        paymentNotes = paymentNotes.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();

        return new HotelPaymentFeaturesDto(
                hotelId,
                payAtProperty,
                prepaymentRequired,
                freeCancellationAvailable,
                supportedCards,
                paymentNotes
        );
    }

    private HotelPoliciesDto mapPolicies(String hotelId, Map<?, ?> raw) {
        Map<?, ?> data = raw != null ? mapOf(raw.get("data")) : null;

        String checkInFrom = null;
        String checkInUntil = null;
        String checkOutFrom = null;
        String checkOutUntil = null;
        String cancellationPolicy = null;
        String childPolicy = null;
        String petPolicy = null;

        LinkedHashSet<String> policyNotes = new LinkedHashSet<>();

        if (data != null) {
            Map<?, ?> rawData = mapOf(data.get("rawData"));
            if (rawData != null) {
                Map<?, ?> checkin = mapOf(rawData.get("checkin"));
                if (checkin != null) {
                    checkInFrom = firstNonBlank(
                            str(checkin.get("fromTime")),
                            str(checkin.get("from_time"))
                    );
                    checkInUntil = firstNonBlank(
                            str(checkin.get("untilTime")),
                            str(checkin.get("until_time"))
                    );
                }

                Map<?, ?> checkout = mapOf(rawData.get("checkout"));
                if (checkout != null) {
                    checkOutFrom = firstNonBlank(
                            str(checkout.get("fromTime")),
                            str(checkout.get("from_time"))
                    );
                    checkOutUntil = firstNonBlank(
                            str(checkout.get("untilTime")),
                            str(checkout.get("until_time"))
                    );
                }
            }

            checkInFrom = firstNonBlank(
                    checkInFrom,
                    str(data.get("checkin_from")),
                    str(data.get("check_in_from"))
            );
            checkInUntil = firstNonBlank(
                    checkInUntil,
                    str(data.get("checkin_until")),
                    str(data.get("check_in_until"))
            );
            checkOutFrom = firstNonBlank(
                    checkOutFrom,
                    str(data.get("checkout_from")),
                    str(data.get("check_out_from"))
            );
            checkOutUntil = firstNonBlank(
                    checkOutUntil,
                    str(data.get("checkout_until")),
                    str(data.get("check_out_until"))
            );

            Object blockObj = data.get("block");
            if (blockObj instanceof List<?> blocks && !blocks.isEmpty()) {
                Object firstObj = blocks.get(0);
                if (firstObj instanceof Map<?, ?> firstBlock) {
                    Map<?, ?> paymentterms = mapOf(firstBlock.get("paymentterms"));
                    if (paymentterms != null) {
                        Map<?, ?> cancellation = mapOf(paymentterms.get("cancellation"));
                        if (cancellation != null) {
                            cancellationPolicy = firstMeaningfulText(
                                    cancellation.get("description"),
                                    cancellation.get("type_translation")
                            );
                        }
                    }

                    Map<?, ?> blockText = mapOf(firstBlock.get("block_text"));
                    if (blockText != null) {
                        Object policiesObj = blockText.get("policies");
                        if (policiesObj instanceof List<?> policiesList) {
                            for (Object item : policiesList) {
                                if (!(item instanceof Map<?, ?> p)) continue;

                                String clazz = str(p.get("class"));
                                String content = str(p.get("content"));
                                if (isBlank(content)) continue;

                                policyNotes.add(content);

                                if ("POLICY_CANCELLATION".equalsIgnoreCase(clazz) && isBlank(cancellationPolicy)) {
                                    cancellationPolicy = content;
                                }
                            }
                        }
                    }
                }
            }

            Object roomsObj = data.get("rooms");
            if (roomsObj instanceof Map<?, ?> roomsMap && !roomsMap.isEmpty()) {
                Object firstRoomObj = roomsMap.values().iterator().next();
                if (firstRoomObj instanceof Map<?, ?> roomMap) {
                    Map<?, ?> childrenAndBeds = mapOf(roomMap.get("children_and_beds_text"));
                    if (childrenAndBeds != null) {
                        Object childrenAtPropertyObj = childrenAndBeds.get("children_at_the_property");
                        if (childrenAtPropertyObj instanceof List<?> list) {
                            List<String> childTexts = new ArrayList<>();
                            for (Object item : list) {
                                if (item instanceof Map<?, ?> m) {
                                    String text = str(m.get("text"));
                                    if (!isBlank(text)) {
                                        childTexts.add(text.trim());
                                        policyNotes.add(text.trim());
                                    }
                                }
                            }
                            if (!childTexts.isEmpty()) {
                                childPolicy = String.join(" ", childTexts);
                            }
                        }

                        Object cribsObj = childrenAndBeds.get("cribs_and_extra_beds");
                        if (cribsObj instanceof List<?> list) {
                            for (Object item : list) {
                                if (item instanceof Map<?, ?> m) {
                                    String text = str(m.get("text"));
                                    if (!isBlank(text)) {
                                        policyNotes.add(text.trim());
                                    }
                                }
                            }
                        }
                    }
                }
            }

            cancellationPolicy = firstMeaningfulText(
                    cancellationPolicy,
                    data.get("cancellation_policy")
            );

            childPolicy = firstMeaningfulText(
                    childPolicy,
                    data.get("child_policy"),
                    data.get("children_policy")
            );

            petPolicy = firstMeaningfulText(
                    petPolicy,
                    data.get("pet_policy")
            );
        }

        if (isBlank(petPolicy)) {
            petPolicy = "Pets policy not provided by hotel";
        }

        return new HotelPoliciesDto(
                hotelId,
                checkInFrom,
                checkInUntil,
                checkOutFrom,
                checkOutUntil,
                cancellationPolicy,
                childPolicy,
                petPolicy,
                new ArrayList<>(policyNotes)
        );
    }

    private List<HotelPhotoDto> mapPhotos(Map<?, ?> raw, List<String> fallbackUrls) {
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<HotelPhotoDto> result = new ArrayList<>();

        Map<?, ?> data = raw != null ? mapOf(raw.get("data")) : null;

        if (data != null) {
            Object photosObj = data.get("photos");
            if (photosObj instanceof List<?> list) {
                int index = 0;
                for (Object item : list) {
                    if (!(item instanceof Map<?, ?> map)) continue;

                    String url = firstNonBlank(
                            str(map.get("url_max1280")),
                            str(map.get("url_max750")),
                            str(map.get("url_original")),
                            str(map.get("url")),
                            str(map.get("url_max300"))
                    );

                    if (isBlank(url) || !seen.add(url)) continue;

                    result.add(new HotelPhotoDto(
                            url,
                            firstNonBlank(str(map.get("url_max300")), url),
                            firstNonBlank(str(map.get("description")), str(map.get("caption"))),
                            index++
                    ));
                }
            }
        }

        if (result.isEmpty() && fallbackUrls != null) {
            int index = 0;
            for (String url : fallbackUrls) {
                if (isBlank(url) || !seen.add(url)) continue;
                result.add(new HotelPhotoDto(url, url, null, index++));
            }
        }

        return result.stream().limit(MAX_HOTEL_PHOTOS).toList();
    }

    private List<HotelFacilityDto> mapFacilities(Map<?, ?> raw, List<String> fallbackAmenities) {
        List<HotelFacilityDto> result = new ArrayList<>();
        LinkedHashSet<String> seen = new LinkedHashSet<>();

        Map<?, ?> data = raw != null ? mapOf(raw.get("data")) : null;

        if (data != null) {
            Object facilitiesObj = data.get("facilities");
            if (facilitiesObj instanceof List<?> list) {
                for (Object item : list) {
                    if (!(item instanceof Map<?, ?> map)) continue;

                    String name = firstNonBlank(
                            str(map.get("name")),
                            str(map.get("translated_name")),
                            str(map.get("title")),
                            str(map.get("label"))
                    );

                    if (isBlank(name) || !seen.add(name)) continue;

                    result.add(new HotelFacilityDto(
                            name,
                            firstNonBlank(str(map.get("category")), str(map.get("group_name"))),
                            str(map.get("icon")),
                            true
                    ));
                }
            }
        }

        if (result.isEmpty() && fallbackAmenities != null) {
            for (String amenity : fallbackAmenities) {
                if (isBlank(amenity) || !seen.add(amenity)) continue;
                result.add(new HotelFacilityDto(amenity, null, null, true));
            }
        }

        return result;
    }

    private List<RoomInfoDto> mapRoomList(Map<?, ?> raw, List<RoomInfoDto> fallbackRooms) {
        if (raw == null) {
            return fallbackRooms != null ? fallbackRooms : List.of();
        }

        Map<?, ?> data = mapOf(raw.get("data"));
        if (data == null) {
            return fallbackRooms != null ? fallbackRooms : List.of();
        }

        Map<String, Map<?, ?>> blockByRoomId = mapBlocksByRoomId(data.get("block"));

        Object roomsObj = data.get("rooms");
        if (!(roomsObj instanceof Map<?, ?> roomsMap) || roomsMap.isEmpty()) {
            return fallbackRooms != null ? fallbackRooms : List.of();
        }

        List<RoomInfoDto> result = new ArrayList<>();

        for (Map.Entry<?, ?> entry : roomsMap.entrySet()) {
            String roomId = entry.getKey() == null ? null : String.valueOf(entry.getKey());

            if (!(entry.getValue() instanceof Map<?, ?> roomMap)) continue;

            Map<?, ?> blockMap = roomId != null ? blockByRoomId.get(roomId) : null;

            String roomName = firstNonBlank(
                    str(roomMap.get("name")),
                    str(roomMap.get("room_name"))
            );

            String description = firstMeaningfulText(
                    roomMap.get("description"),
                    roomMap.get("room_description")
            );

            Integer maxAdults = firstInteger(
                    integer(roomMap.get("max_adults")),
                    integer(roomMap.get("maxAdultOccupancy"))
            );

            Integer maxChildren = firstInteger(
                    integer(roomMap.get("max_children"))
            );

            Integer beds = extractBedCount(roomMap);
            String bedType = extractBedType(roomMap);

            Double roomSize = firstDouble(
                    dbl(roomMap.get("room_size")),
                    dbl(roomMap.get("size")),
                    dbl(roomMap.get("room_surface_in_m2"))
            );

            String roomSizeUnit = roomSize != null ? "m²" : null;

            LinkedHashSet<String> roomPhotos = new LinkedHashSet<>();
            Object roomPhotosObj = roomMap.get("photos");
            if (roomPhotosObj instanceof List<?> list) {
                for (Object p : list) {
                    if (p instanceof Map<?, ?> pm) {
                        addIfText(roomPhotos, firstNonBlank(
                                str(pm.get("url_original")),
                                str(pm.get("url_max1280")),
                                str(pm.get("url_max750")),
                                str(pm.get("url_max300")),
                                str(pm.get("url_square180"))
                        ));
                    }
                }
            }

            LinkedHashSet<String> roomAmenities = new LinkedHashSet<>();
            addStringList(roomAmenities, roomMap.get("facilities"));
            addStringList(roomAmenities, roomMap.get("highlights"));

            String boardType = extractBoardType(blockMap, roomMap);
            String paymentPolicy = extractPaymentPolicy(blockMap);
            Boolean refundable = extractRefundable(blockMap);
            String cancellationPolicy = extractCancellationPolicy(blockMap);

            result.add(new RoomInfoDto(
                    roomId,
                    roomName,
                    description,
                    maxAdults,
                    maxChildren,
                    beds,
                    bedType,
                    roomSize,
                    roomSizeUnit,
                    roomPhotos.stream().limit(MAX_ROOM_PHOTOS).toList(),
                    roomAmenities.stream().limit(25).toList(),
                    boardType,
                    paymentPolicy,
                    refundable,
                    cancellationPolicy
            ));
        }

        return result.isEmpty() ? (fallbackRooms != null ? fallbackRooms : List.of()) : result;
    }

    private String extractDescription(Map<?, ?> data) {
        return firstMeaningfulText(
                data.get("hotel_text"),
                data.get("description"),
                data.get("hotel_description"),
                readNested(data, "property", "description"),
                readNested(data, "summary"),
                readNested(data, "property_description", "description"),
                readNested(data, "property_description", "summary"),
                readNested(data, "property_description", "text")
        );
    }

    private List<String> extractAmenities(Map<?, ?> data) {
        LinkedHashSet<String> amenities = new LinkedHashSet<>();

        addStringList(amenities, data.get("hotel_facilities"));
        addStringList(amenities, data.get("family_facilities"));
        addStringList(amenities, data.get("facilities"));
        addStringList(amenities, data.get("amenities"));

        Object propertyHighlightStripObj = data.get("property_highlight_strip");
        if (propertyHighlightStripObj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    addIfText(amenities,
                            firstNonBlank(
                                    str(m.get("name")),
                                    str(m.get("translated_name")),
                                    str(m.get("title")),
                                    str(m.get("label"))
                            )
                    );
                } else if (item != null) {
                    addIfText(amenities, String.valueOf(item));
                }
            }
        }

        Object facilitiesBlockObj = data.get("facilities_block");
        if (facilitiesBlockObj instanceof Map<?, ?> facilitiesBlock) {
            Object facilitiesObj = facilitiesBlock.get("facilities");
            if (facilitiesObj instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> m) {
                        addIfText(amenities,
                                firstNonBlank(
                                        str(m.get("name")),
                                        str(m.get("translated_name")),
                                        str(m.get("title")),
                                        str(m.get("label"))
                                )
                        );
                    } else if (item != null) {
                        addIfText(amenities, String.valueOf(item));
                    }
                }
            }
        }

        Object topBenefitsObj = data.get("top_ufi_benefits");
        if (topBenefitsObj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    addIfText(amenities,
                            firstNonBlank(
                                    str(m.get("translated_name")),
                                    str(m.get("name")),
                                    str(m.get("title")),
                                    str(m.get("label"))
                            )
                    );
                } else if (item != null) {
                    addIfText(amenities, String.valueOf(item));
                }
            }
        }

        Object freeFacilitiesObj = data.get("free_facilities_cancel_breakfast");
        if (freeFacilitiesObj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    addIfText(amenities,
                            firstNonBlank(
                                    str(m.get("translated_name")),
                                    str(m.get("name")),
                                    str(m.get("title")),
                                    str(m.get("label"))
                            )
                    );
                } else if (item != null) {
                    addIfText(amenities, String.valueOf(item));
                }
            }
        }

        Object aggregatedDataObj = data.get("aggregated_data");
        if (aggregatedDataObj instanceof Map<?, ?> aggregatedData) {
            Object kitchenFacObj = aggregatedData.get("common_kitchen_fac");
            if (kitchenFacObj instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> m) {
                        addIfText(amenities,
                                firstNonBlank(
                                        str(m.get("name")),
                                        str(m.get("translated_name"))
                                )
                        );
                    }
                }
            }
        }

        return amenities.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .limit(40)
                .toList();
    }

    private List<String> extractHotelPhotos(Map<?, ?> data) {
        LinkedHashSet<String> photos = new LinkedHashSet<>();

        addIfText(photos, firstNonBlank(
                str(data.get("main_photo_url")),
                str(data.get("max_1440_photo_url")),
                str(data.get("photoMainUrl")),
                str(readNested(data, "property", "mainPhotoUrl"))
        ));

        Object photosObj = data.get("photos");
        if (photosObj instanceof List<?> list) {
            for (Object o : list) {
                if (o instanceof Map<?, ?> m) {
                    addIfText(photos, firstNonBlank(
                            str(m.get("url_max1280")),
                            str(m.get("url_max750")),
                            str(m.get("url_original")),
                            str(m.get("url")),
                            str(m.get("url_max300")),
                            str(m.get("url_square180"))
                    ));
                }
            }
        }

        if (photos.size() < 3) {
            Object roomsObj = data.get("rooms");
            if (roomsObj instanceof Map<?, ?> roomsMap) {
                for (Object roomVal : roomsMap.values()) {
                    if (!(roomVal instanceof Map<?, ?> roomMap)) continue;

                    Object roomPhotosObj = roomMap.get("photos");
                    if (roomPhotosObj instanceof List<?> list) {
                        for (Object p : list) {
                            if (p instanceof Map<?, ?> pm) {
                                addIfText(photos, firstNonBlank(
                                        str(pm.get("url_max1280")),
                                        str(pm.get("url_max750")),
                                        str(pm.get("url_original")),
                                        str(pm.get("url_max300")),
                                        str(pm.get("url_square180"))
                                ));
                            }
                        }
                    }

                    if (photos.size() >= MAX_HOTEL_PHOTOS) {
                        break;
                    }
                }
            }
        }

        return photos.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .limit(MAX_HOTEL_PHOTOS)
                .toList();
    }

    private List<RoomInfoDto> extractRooms(Map<?, ?> data) {
        Object roomsObj = data.get("rooms");
        if (!(roomsObj instanceof Map<?, ?> roomsMap) || roomsMap.isEmpty()) {
            return List.of();
        }

        Map<String, Map<?, ?>> blockByRoomId = mapBlocksByRoomId(data.get("block"));
        List<RoomInfoDto> result = new ArrayList<>();

        for (Map.Entry<?, ?> entry : roomsMap.entrySet()) {
            String roomId = entry.getKey() == null ? null : String.valueOf(entry.getKey());

            if (!(entry.getValue() instanceof Map<?, ?> roomMap)) continue;

            Map<?, ?> blockMap = roomId != null ? blockByRoomId.get(roomId) : null;

            String roomName = firstNonBlank(
                    str(roomMap.get("name")),
                    str(roomMap.get("room_name")),
                    str(roomMap.get("name_with_lang")),
                    str(readNested(blockMap, "name_without_policy")),
                    str(readNested(blockMap, "name"))
            );

            String description = firstMeaningfulText(
                    roomMap.get("description"),
                    roomMap.get("room_description"),
                    readNested(roomMap, "description_trans")
            );

            Integer maxAdults = firstInteger(
                    integer(roomMap.get("max_adults")),
                    integer(roomMap.get("maxAdultOccupancy")),
                    integer(roomMap.get("adults")),
                    integer(readNested(blockMap, "max_occupancy")),
                    integer(readNested(blockMap, "nr_adults"))
            );

            Integer maxChildren = firstInteger(
                    integer(roomMap.get("max_children")),
                    integer(roomMap.get("children")),
                    integer(readNested(blockMap, "nr_children"))
            );

            Integer beds = extractBedCount(roomMap);
            String bedType = extractBedType(roomMap);

            Double roomSize = firstDouble(
                    dbl(roomMap.get("room_size")),
                    dbl(roomMap.get("size")),
                    dbl(roomMap.get("room_surface_in_m2")),
                    dbl(readNested(blockMap, "room_surface_in_m2"))
            );

            String roomSizeUnit = roomSize != null ? "m²" : null;

            LinkedHashSet<String> roomPhotos = new LinkedHashSet<>();
            Object roomPhotosObj = roomMap.get("photos");
            if (roomPhotosObj instanceof List<?> list) {
                for (Object p : list) {
                    if (p instanceof Map<?, ?> pm) {
                        addIfText(roomPhotos, firstNonBlank(
                                str(pm.get("url_original")),
                                str(pm.get("url_max1280")),
                                str(pm.get("url_max750")),
                                str(pm.get("url_max300")),
                                str(pm.get("url_square180"))
                        ));
                    } else if (p != null) {
                        addIfText(roomPhotos, String.valueOf(p));
                    }
                }
            }

            LinkedHashSet<String> roomAmenities = new LinkedHashSet<>();

            Object facilitiesObj = roomMap.get("facilities");
            if (facilitiesObj instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> m) {
                        addIfText(roomAmenities,
                                firstNonBlank(
                                        str(m.get("name")),
                                        str(m.get("translated_name")),
                                        str(m.get("title")),
                                        str(m.get("label"))
                                )
                        );
                    } else if (item != null) {
                        addIfText(roomAmenities, String.valueOf(item));
                    }
                }
            }

            Object highlightsObj = roomMap.get("highlights");
            if (highlightsObj instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> m) {
                        addIfText(roomAmenities,
                                firstNonBlank(
                                        str(m.get("translated_name")),
                                        str(m.get("name")),
                                        str(m.get("title")),
                                        str(m.get("label"))
                                )
                        );
                    } else if (item != null) {
                        addIfText(roomAmenities, String.valueOf(item));
                    }
                }
            }

            String boardType = extractBoardType(blockMap, roomMap);
            String paymentPolicy = extractPaymentPolicy(blockMap);
            Boolean refundable = extractRefundable(blockMap);
            String cancellationPolicy = extractCancellationPolicy(blockMap);

            result.add(new RoomInfoDto(
                    roomId,
                    roomName,
                    description,
                    maxAdults,
                    maxChildren,
                    beds,
                    bedType,
                    roomSize,
                    roomSizeUnit,
                    roomPhotos.stream().limit(MAX_ROOM_PHOTOS).toList(),
                    roomAmenities.stream().limit(25).toList(),
                    boardType,
                    paymentPolicy,
                    refundable,
                    cancellationPolicy
            ));
        }

        return result;
    }

    private Map<String, Map<?, ?>> mapBlocksByRoomId(Object blockObj) {
        Map<String, Map<?, ?>> result = new LinkedHashMap<>();

        if (!(blockObj instanceof List<?> list)) {
            return result;
        }

        for (Object item : list) {
            if (!(item instanceof Map<?, ?> blockMap)) continue;

            String roomId = firstNonBlank(
                    str(blockMap.get("room_id")),
                    str(blockMap.get("roomId"))
            );

            if (roomId != null) {
                result.put(roomId, blockMap);
            }
        }

        return result;
    }

    private Integer extractBedCount(Map<?, ?> roomMap) {
        Object bedConfigurationsObj = roomMap.get("bed_configurations");
        if (bedConfigurationsObj instanceof List<?> configs) {
            int total = 0;

            for (Object config : configs) {
                if (!(config instanceof Map<?, ?> configMap)) continue;

                Object bedTypesObj = configMap.get("bed_types");
                if (bedTypesObj instanceof List<?> bedTypes) {
                    for (Object bt : bedTypes) {
                        if (bt instanceof Map<?, ?> btMap) {
                            Integer count = integer(btMap.get("count"));
                            if (count != null) total += count;
                        }
                    }
                }
            }

            return total > 0 ? total : null;
        }

        return firstInteger(
                integer(roomMap.get("bed_count")),
                integer(roomMap.get("beds"))
        );
    }

    private String extractBedType(Map<?, ?> roomMap) {
        Object bedConfigurationsObj = roomMap.get("bed_configurations");
        if (bedConfigurationsObj instanceof List<?> configs) {
            List<String> bedNames = new ArrayList<>();

            for (Object config : configs) {
                if (!(config instanceof Map<?, ?> configMap)) continue;

                Object bedTypesObj = configMap.get("bed_types");
                if (bedTypesObj instanceof List<?> bedTypes) {
                    for (Object bt : bedTypes) {
                        if (bt instanceof Map<?, ?> btMap) {
                            String name = firstNonBlank(
                                    str(btMap.get("name_with_count")),
                                    str(btMap.get("name")),
                                    str(btMap.get("description"))
                            );
                            if (name != null && !name.isBlank()) {
                                bedNames.add(name.trim());
                            }
                        }
                    }
                }
            }

            return bedNames.isEmpty() ? null : String.join(", ", bedNames);
        }

        return firstNonBlank(
                str(roomMap.get("bed_type")),
                str(roomMap.get("bedType")),
                str(readNested(roomMap, "bed_config", "type"))
        );
    }

    private List<Map<?, ?>> extractHotelList(Map<?, ?> raw) {
        if (raw == null) return List.of();

        Object dataObj = raw.get("data");

        if (dataObj instanceof List<?> list) {
            List<Map<?, ?>> result = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    result.add(map);
                }
            }
            return result;
        }

        if (dataObj instanceof Map<?, ?> dataMap) {
            Object hotelsObj = dataMap.get("hotels");
            if (hotelsObj instanceof List<?> list) {
                List<Map<?, ?>> result = new ArrayList<>();
                for (Object item : list) {
                    if (item instanceof Map<?, ?> map) {
                        result.add(map);
                    }
                }
                return result;
            }

            Object resultObj = dataMap.get("result");
            if (resultObj instanceof List<?> list) {
                List<Map<?, ?>> result = new ArrayList<>();
                for (Object item : list) {
                    if (item instanceof Map<?, ?> map) {
                        result.add(map);
                    }
                }
                return result;
            }
        }

        return List.of();
    }

    private Object readNested(Map<?, ?> map, String... path) {
        Object current = map;

        for (String key : path) {
            if (current == null) return null;

            if (current instanceof Map<?, ?> m) {
                current = m.get(key);
                continue;
            }

            if (current instanceof List<?> list) {
                try {
                    int idx = Integer.parseInt(key);
                    current = (idx >= 0 && idx < list.size()) ? list.get(idx) : null;
                } catch (Exception e) {
                    return null;
                }
                continue;
            }

            return null;
        }

        return current;
    }

    private void addStringList(Set<String> target, Object obj) {
        if (obj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    addIfText(target, firstNonBlank(
                            str(m.get("name")),
                            str(m.get("translated_name")),
                            str(m.get("label")),
                            str(m.get("title")),
                            str(m.get("value"))
                    ));
                } else if (item != null) {
                    addIfText(target, String.valueOf(item));
                }
            }
        }
    }

    private void addIfText(Set<String> target, String value) {
        if (value != null && !value.isBlank()) {
            target.add(value.trim());
        }
    }

    private List<String> extractSimpleStringList(Object obj) {
        if (!(obj instanceof List<?> list)) return List.of();

        List<String> result = new ArrayList<>();
        for (Object item : list) {
            if (item == null) continue;
            String value = String.valueOf(item).trim();
            if (!value.isBlank()) {
                result.add(value);
            }
        }
        return result;
    }

    private String firstMeaningfulText(Object... values) {
        for (Object value : values) {
            if (value == null) continue;

            if (value instanceof String s) {
                String trimmed = s.trim();
                if (!trimmed.isBlank() && !"{}".equals(trimmed) && !"[]".equals(trimmed)) {
                    return trimmed;
                }
            } else if (value instanceof Map<?, ?> map) {
                String nested = firstMeaningfulText(
                        map.get("description"),
                        map.get("summary"),
                        map.get("text"),
                        map.get("content")
                );
                if (!isBlank(nested)) {
                    return nested;
                }
            }
        }

        return null;
    }

    private String extractBoardType(Map<?, ?> blockMap, Map<?, ?> roomMap) {
        String mealplan = firstNonBlank(
                str(blockMap != null ? blockMap.get("mealplan") : null),
                str(blockMap != null ? blockMap.get("meal_plan") : null),
                str(roomMap != null ? roomMap.get("mealplan") : null)
        );

        if (!isBlank(mealplan)) {
            return mealplan.trim();
        }

        if (bool(blockMap != null ? blockMap.get("all_inclusive") : null) == Boolean.TRUE) return "ALL_INCLUSIVE";
        if (bool(blockMap != null ? blockMap.get("full_board") : null) == Boolean.TRUE) return "FULL_BOARD";
        if (bool(blockMap != null ? blockMap.get("half_board") : null) == Boolean.TRUE) return "HALF_BOARD";
        if (bool(blockMap != null ? blockMap.get("breakfast_included") : null) == Boolean.TRUE) return "BREAKFAST_INCLUDED";

        return null;
    }

    private String extractPaymentPolicy(Map<?, ?> blockMap) {
        if (blockMap == null) return null;

        if (bool(blockMap.get("pay_in_advance")) == Boolean.TRUE) {
            return "PREPAYMENT_REQUIRED";
        }

        if (bool(blockMap.get("deposit_required")) == Boolean.TRUE) {
            return "DEPOSIT_REQUIRED";
        }

        Map<?, ?> paymentterms = mapOf(blockMap.get("paymentterms"));
        if (paymentterms != null) {
            Map<?, ?> prepayment = mapOf(paymentterms.get("prepayment"));
            if (prepayment != null) {
                String desc = firstNonBlank(
                        str(prepayment.get("type_translation")),
                        str(prepayment.get("extended_type_translation")),
                        str(prepayment.get("simple_translation")),
                        str(prepayment.get("description"))
                );

                if (!isBlank(desc)) {
                    String lower = desc.toLowerCase(Locale.ROOT);
                    if (lower.contains("no prepayment")) return "PAY_AT_PROPERTY";
                    if (lower.contains("pay during your stay")) return "PAY_AT_PROPERTY";
                    if (lower.contains("prepayment")) return "PREPAYMENT_REQUIRED";
                }
            }
        }

        return null;
    }

    private Boolean extractRefundable(Map<?, ?> blockMap) {
        if (blockMap == null) return null;

        if (blockMap.containsKey("refundable")) {
            return bool(blockMap.get("refundable"));
        }

        Map<?, ?> paymentterms = mapOf(blockMap.get("paymentterms"));
        if (paymentterms != null) {
            Map<?, ?> cancellation = mapOf(paymentterms.get("cancellation"));
            if (cancellation != null) {
                String type = firstNonBlank(
                        str(cancellation.get("type_translation")),
                        str(cancellation.get("description"))
                );

                if (!isBlank(type)) {
                    String lower = type.toLowerCase(Locale.ROOT);
                    if (lower.contains("free")) return true;
                    if (lower.contains("non-refundable") || lower.contains("non refundable")) return false;
                }
            }
        }

        return null;
    }

    private String extractCancellationPolicy(Map<?, ?> blockMap) {
        if (blockMap == null) return null;

        Map<?, ?> paymentterms = mapOf(blockMap.get("paymentterms"));
        if (paymentterms != null) {
            Map<?, ?> cancellation = mapOf(paymentterms.get("cancellation"));
            if (cancellation != null) {
                return firstMeaningfulText(
                        cancellation.get("description"),
                        cancellation.get("type_translation")
                );
            }
        }

        Map<?, ?> blockText = mapOf(blockMap.get("block_text"));
        if (blockText != null) {
            Object policiesObj = blockText.get("policies");
            if (policiesObj instanceof List<?> policiesList) {
                for (Object item : policiesList) {
                    if (!(item instanceof Map<?, ?> p)) continue;

                    String clazz = str(p.get("class"));
                    String content = str(p.get("content"));

                    if ("POLICY_CANCELLATION".equalsIgnoreCase(clazz) && !isBlank(content)) {
                        return content.trim();
                    }
                }
            }
        }

        return null;
    }

    private LocalDate parseDateOrTomorrow(String s) {
        try {
            LocalDate parsed = LocalDate.parse(s);
            return parsed.isBefore(LocalDate.now()) ? LocalDate.now().plusDays(1) : parsed;
        } catch (DateTimeParseException e) {
            return LocalDate.now().plusDays(1);
        }
    }

    private Map<?, ?> mapOf(Object o) {
        return (o instanceof Map<?, ?> m) ? m : null;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }

    private Double firstPositive(Double... values) {
        for (Double v : values) {
            if (v != null && v > 0) return v;
        }
        return null;
    }

    private Double firstDouble(Double... values) {
        for (Double v : values) {
            if (v != null) return v;
        }
        return null;
    }

    private Integer firstInteger(Integer... values) {
        for (Integer v : values) {
            if (v != null) return v;
        }
        return null;
    }

    private Integer firstPositiveInteger(Integer... values) {
        for (Integer v : values) {
            if (v != null && v > 0) return v;
        }
        return null;
    }

    private Boolean bool(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean b) return b;
        String s = String.valueOf(o).trim().toLowerCase(Locale.ROOT);
        if ("true".equals(s) || "1".equals(s) || "yes".equals(s)) return true;
        if ("false".equals(s) || "0".equals(s) || "no".equals(s)) return false;
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private Double dbl(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        try {
            return Double.valueOf(String.valueOf(o));
        } catch (Exception e) {
            return null;
        }
    }

    private Integer integer(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.valueOf(String.valueOf(o));
        } catch (Exception e) {
            return null;
        }
    }

    private String mapCountryCodeToName(String code) {
        if (code == null || code.isBlank()) return null;

        return switch (code.trim().toLowerCase(Locale.ROOT)) {
            case "tr" -> "Türkiye";
            case "mk" -> "North Macedonia";
            case "rs" -> "Serbia";
            case "gr" -> "Greece";
            case "al" -> "Albania";
            case "bg" -> "Bulgaria";
            case "it" -> "Italy";
            case "fr" -> "France";
            case "es" -> "Spain";
            case "de" -> "Germany";
            case "us" -> "United States";
            case "gb" -> "United Kingdom";
            default -> code.toUpperCase(Locale.ROOT);
        };
    }

    private record PriceBounds(Double min, Double max) {}
}
