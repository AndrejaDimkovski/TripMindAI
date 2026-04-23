package tripmindai.com.mk.maintravelservice.service.trip;

import org.springframework.stereotype.Service;
import tripmindai.com.mk.maintravelservice.config.FlightsClient;
import tripmindai.com.mk.maintravelservice.config.HotelsClient;
import tripmindai.com.mk.maintravelservice.dto.country.DestinationSearchDto;
import tripmindai.com.mk.maintravelservice.dto.flights.FlightDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.flights.FlightOfferDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelDescriptionInfoDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelFacilityDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelFullDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelOfferDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelPaymentFeaturesDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelPhotoDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelPoliciesDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelSearchItemDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelSearchResponseDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.RoomInfoDto;
import tripmindai.com.mk.maintravelservice.dto.trip.TripSearchResponse;
import tripmindai.com.mk.maintravelservice.service.CurrencyConversionService;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Service
public class TripSearchService {

    private static final String TEST_HOTEL_ID = "TEST-HOTEL-1";

    private final FlightsClient flightsClient;
    private final HotelsClient hotelsClient;
    private final Executor tripSearchExecutor;
    private final CurrencyConversionService currencyConversionService;

    public TripSearchService(
            FlightsClient flightsClient,
            HotelsClient hotelsClient,
            Executor tripSearchExecutor,
            CurrencyConversionService currencyConversionService
    ) {
        this.flightsClient = flightsClient;
        this.hotelsClient = hotelsClient;
        this.tripSearchExecutor = tripSearchExecutor;
        this.currencyConversionService = currencyConversionService;
    }

    public TripSearchResponse search(
            String origin,
            String destination,
            String from,
            String to,
            int adults,
            String cityCode
    ) {
        return search(origin, destination, from, to, adults, cityCode, null, "EUR", null, 1, null, "NONE", null, false, false);
    }

    public TripSearchResponse search(
            String origin,
            String destination,
            String from,
            String to,
            int adults,
            String cityCode,
            String destinationCountryCode,
            String targetCurrency
    ) {
        return search(origin, destination, from, to, adults, cityCode, destinationCountryCode, targetCurrency, null, 1, null, "NONE", null, false, false);
    }

    public TripSearchResponse search(
            String origin,
            String destination,
            String from,
            String to,
            int adults,
            String cityCode,
            String destinationCountryCode,
            String targetCurrency,
            String countryOfResidence,
            Integer roomQuantity,
            String priceRange,
            String paymentPolicy,
            String boardType,
            Boolean includeClosed,
            Boolean bestRateOnly
    ) {
        LocalDate checkIn = parseCheckIn(from);
        LocalDate checkOut = parseCheckOut(checkIn, to);

        String checkInStr = checkIn.toString();
        String checkOutStr = checkOut.toString();
        String returnDate = isBlank(to) ? null : checkOutStr;

        int safeAdults = Math.max(1, adults);
        int safeRoomQuantity = roomQuantity == null ? 1 : Math.max(1, roomQuantity);
        String normalizedTargetCurrency = currencyConversionService.normalizeTargetCurrency(targetCurrency);

        CompletableFuture<List<FlightOfferDto>> flightsFuture = CompletableFuture.supplyAsync(
                () -> safeFlightsSearch(origin, destination, checkInStr, returnDate, safeAdults),
                tripSearchExecutor
        );

        CompletableFuture<HotelSearchResponseDto> hotelsFuture = CompletableFuture.supplyAsync(
                () -> safeHotelsSearch(destination, cityCode, checkInStr, checkOutStr, safeAdults, priceRange),
                tripSearchExecutor
        );

        List<FlightOfferDto> flights = flightsFuture.join();
        HotelSearchResponseDto hotelSearchResponse = hotelsFuture.join();

        List<HotelSearchItemDto> hotels = hotelSearchResponse != null && hotelSearchResponse.hotels() != null
                ? hotelSearchResponse.hotels()
                : List.of();

        hotels = filterAndSortHotelsByBudget(hotels, priceRange);

        List<HotelOfferDto> hotelOffers = mapHotelOffersFromHotels(
                hotels,
                safeAdults,
                destinationCountryCode,
                normalizedTargetCurrency,
                safeRoomQuantity
        );

        hotelOffers = pickCheapestOfferPerHotelWithinBudget(hotelOffers, priceRange);
        hotels = keepOnlyHotelsWithMatchingOffers(hotels, hotelOffers);

        if (hotels.isEmpty()) {
            return new TripSearchResponse(flights, List.of(), List.of());
        }

        return new TripSearchResponse(flights, hotels, hotelOffers);
    }

    public HotelDetailsDto hotelDetails(
            String hotelId,
            String checkIn,
            String checkOut,
            int adults,
            String cityName
    ) {
        if (TEST_HOTEL_ID.equalsIgnoreCase(hotelId)) {
            return buildTestHotelDetails(cityName);
        }

        return hotelsClient.hotelDetails(
                hotelId,
                safeDateOrTomorrow(checkIn),
                safeDateOrNextDay(checkIn, checkOut),
                Math.max(1, adults),
                cityName
        );
    }

    public HotelFullDetailsDto hotelFullDetails(
            String hotelId,
            String checkIn,
            String checkOut,
            int adults,
            String cityName
    ) {
        if (TEST_HOTEL_ID.equalsIgnoreCase(hotelId)) {
            return buildTestHotelFullDetails(cityName);
        }

        return hotelsClient.hotelFullDetails(
                hotelId,
                safeDateOrTomorrow(checkIn),
                safeDateOrNextDay(checkIn, checkOut),
                Math.max(1, adults),
                cityName
        );
    }

    public HotelDetailsDto hotelDetails(String hotelId, String cityName) {
        String checkIn = LocalDate.now().plusDays(1).toString();
        String checkOut = LocalDate.now().plusDays(4).toString();
        return hotelDetails(hotelId, checkIn, checkOut, 1, cityName);
    }

    public HotelDetailsDto hotelDetails(String hotelId) {
        return hotelDetails(hotelId, null);
    }

    public FlightDetailsDto flightDetails(String token) {
        return isBlank(token) ? null : flightsClient.getDetails(token);
    }

    private List<FlightOfferDto> safeFlightsSearch(
            String origin,
            String destination,
            String checkIn,
            String returnDate,
            int adults
    ) {
        try {
            List<FlightOfferDto> result = flightsClient.search(origin, destination, checkIn, returnDate, adults);
            return result != null ? result : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    private HotelSearchResponseDto safeHotelsSearch(
            String destination,
            String cityCode,
            String checkIn,
            String checkOut,
            int adults,
            String priceRange
    ) {
        try {
            String hotelQuery = firstNonBlank(cityCode, destination);
            List<DestinationSearchDto> destinations = hotelsClient.searchDestinations(hotelQuery);
            DestinationSearchDto best = pickBestDestination(destinations, destination);

            if (best == null || isBlank(best.destId()) || isBlank(best.destType())) {
                return buildEmptyHotelSearch(checkIn, checkOut, adults);
            }

            HotelSearchResponseDto response = hotelsClient.searchHotels(
                    best.destId(),
                    best.destType(),
                    checkIn,
                    checkOut,
                    adults,
                    1,
                    priceRange
            );

            return response != null ? response : buildEmptyHotelSearch(checkIn, checkOut, adults);
        } catch (Exception e) {
            return buildEmptyHotelSearch(checkIn, checkOut, adults);
        }
    }

    private HotelSearchResponseDto buildEmptyHotelSearch(String checkIn, String checkOut, int adults) {
        return new HotelSearchResponseDto(null, null, checkIn, checkOut, adults, 1, List.of());
    }

    private DestinationSearchDto pickBestDestination(List<DestinationSearchDto> destinations, String requestedDestination) {
        if (destinations == null || destinations.isEmpty()) {
            return null;
        }

        String target = normalize(requestedDestination);

        for (DestinationSearchDto destination : destinations) {
            if (destination != null
                    && "city".equalsIgnoreCase(destination.destType())
                    && normalize(destination.name()).equals(target)) {
                return destination;
            }
        }

        for (DestinationSearchDto destination : destinations) {
            if (destination != null && "city".equalsIgnoreCase(destination.destType())) {
                return destination;
            }
        }

        return destinations.get(0);
    }

    private List<HotelSearchItemDto> filterAndSortHotelsByBudget(List<HotelSearchItemDto> hotels, String priceRange) {
        if (hotels == null || hotels.isEmpty()) {
            return List.of();
        }

        PriceBounds bounds = resolvePriceBounds(priceRange);

        return hotels.stream()
                .filter(Objects::nonNull)
                .filter(hotel -> hotel.totalPrice() != null && hotel.totalPrice() > 0)
                .filter(hotel -> bounds.min() == null || hotel.totalPrice() >= bounds.min())
                .filter(hotel -> bounds.max() == null || hotel.totalPrice() <= bounds.max())
                .sorted(Comparator.comparing(HotelSearchItemDto::totalPrice))
                .toList();
    }

    private List<HotelOfferDto> mapHotelOffersFromHotels(
            List<HotelSearchItemDto> hotels,
            int adults,
            String destinationCountryCode,
            String targetCurrency,
            Integer roomQuantity
    ) {
        if (hotels == null || hotels.isEmpty()) {
            return List.of();
        }

        List<HotelOfferDto> result = new ArrayList<>();

        for (HotelSearchItemDto item : hotels) {
            if (item == null || isBlank(item.hotelId()) || item.totalPrice() == null || item.totalPrice() <= 0) {
                continue;
            }

            double totalPrice = item.totalPrice();
            String currency = firstNonBlank(item.currency(), "EUR");
            int nights = (int) Math.max(1, daysBetweenSafe(item.checkInDate(), item.checkOutDate()));
            double pricePerNight = totalPrice / nights;

            CurrencyConversionService.ConversionResult totalConverted = currencyConversionService.convert(
                    totalPrice,
                    currency,
                    destinationCountryCode,
                    targetCurrency
            );

            CurrencyConversionService.ConversionResult nightlyConverted = currencyConversionService.convert(
                    pricePerNight,
                    currency,
                    destinationCountryCode,
                    targetCurrency
            );

            result.add(new HotelOfferDto(
                    item.hotelId(),
                    item.name(),
                    item.checkInDate(),
                    item.checkOutDate(),
                    totalPrice,
                    currency,
                    null,
                    totalPrice,
                    "SEARCH-" + item.hotelId(),
                    "Cheapest matching room",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    adults,
                    roomQuantity == null ? 1 : Math.max(1, roomQuantity),
                    List.of(),
                    pricePerNight,
                    pricePerNight,
                    nights,
                    null,
                    totalConverted.amount(),
                    nightlyConverted.amount(),
                    totalConverted.currency(),
                    null,
                    totalConverted.amount(),
                    nightlyConverted.amount()
            ));
        }

        return result;
    }

    private List<HotelOfferDto> pickCheapestOfferPerHotelWithinBudget(List<HotelOfferDto> offers, String priceRange) {
        if (offers == null || offers.isEmpty()) {
            return List.of();
        }

        PriceBounds bounds = resolvePriceBounds(priceRange);

        return offers.stream()
                .filter(Objects::nonNull)
                .filter(offer -> !isBlank(offer.hotelId()))
                .filter(offer -> isPriceWithinBounds(priceForOffer(offer), bounds))
                .collect(Collectors.groupingBy(HotelOfferDto::hotelId))
                .values()
                .stream()
                .map(group -> group.stream()
                        .min(Comparator.comparingDouble(this::priceForOffer))
                        .orElse(null))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble(this::priceForOffer))
                .toList();
    }

    private List<HotelSearchItemDto> keepOnlyHotelsWithMatchingOffers(
            List<HotelSearchItemDto> hotels,
            List<HotelOfferDto> hotelOffers
    ) {
        if (hotelOffers == null || hotelOffers.isEmpty()) {
            return List.of();
        }

        Map<String, HotelOfferDto> cheapestByHotelId = new LinkedHashMap<>();
        for (HotelOfferDto offer : hotelOffers) {
            if (offer != null && !isBlank(offer.hotelId())) {
                cheapestByHotelId.put(offer.hotelId(), offer);
            }
        }

        return hotels.stream()
                .filter(Objects::nonNull)
                .filter(hotel -> !isBlank(hotel.hotelId()) && cheapestByHotelId.containsKey(hotel.hotelId()))
                .sorted(Comparator.comparingDouble(hotel -> priceForOffer(cheapestByHotelId.get(hotel.hotelId()))))
                .toList();
    }

    private boolean isPriceWithinBounds(double price, PriceBounds bounds) {
        if (price <= 0 || price == Double.MAX_VALUE) {
            return false;
        }
        if (bounds.min() != null && price < bounds.min()) {
            return false;
        }
        if (bounds.max() != null && price > bounds.max()) {
            return false;
        }
        return true;
    }

    private PriceBounds resolvePriceBounds(String priceRange) {
        if (priceRange == null || priceRange.isBlank()) {
            return new PriceBounds(null, null);
        }

        String normalized = priceRange.trim().toUpperCase(Locale.ROOT);

        return switch (normalized) {
            case "LOW", "BUDGET", "CHEAP" -> new PriceBounds(0.0, 500.0);
            case "MEDIUM", "MID" -> new PriceBounds(500.0, 1200.0);
            case "HIGH", "LUXURY", "PREMIUM" -> new PriceBounds(1200.0, null);
            default -> parseCustomPriceRange(priceRange);
        };
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
            return new PriceBounds(toDouble(parts[0]), toDouble(parts[1]));
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

    private double priceForOffer(HotelOfferDto offer) {
        if (offer == null) {
            return Double.MAX_VALUE;
        }

        Double price = offer.convertedTotalWithTaxes() != null ? offer.convertedTotalWithTaxes()
                : offer.convertedTotalPrice() != null ? offer.convertedTotalPrice()
                : offer.totalWithTaxes() != null ? offer.totalWithTaxes()
                : offer.totalPrice();

        return price != null ? price : Double.MAX_VALUE;
    }

    private HotelDetailsDto buildTestHotelDetails(String cityName) {
        return new HotelDetailsDto(
                TEST_HOTEL_ID,
                "Test Hotel " + firstNonBlank(cityName, "Demo City"),
                "This is a fallback hotel details card used only for testing the hotel flow in main-travel-service.",
                41.9981,
                21.4254,
                "Demo Street 1",
                firstNonBlank(cityName, "Demo City"),
                "TEST",
                "TEST-CHAIN",
                4,
                8.4,
                "Very good",
                128,
                List.of("WiFi", "Parking", "Breakfast area"),
                List.of("https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop"),
                List.of(
                        new RoomInfoDto(
                                "TEST-ROOM-1",
                                "Cheapest matching room",
                                "Comfortable demo room for fallback testing.",
                                2,
                                0,
                                1,
                                "Double",
                                24.0,
                                "m²",
                                List.of("https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop"),
                                List.of("WiFi", "Air conditioning"),
                                "BREAKFAST",
                                true,
                                "Free cancellation demo"
                        )
                )
        );
    }

    private HotelFullDetailsDto buildTestHotelFullDetails(String cityName) {
        HotelDetailsDto basic = buildTestHotelDetails(cityName);

        return new HotelFullDetailsDto(
                basic,
                new HotelDescriptionInfoDto(
                        TEST_HOTEL_ID,
                        basic.name(),
                        basic.description(),
                        "Hotel",
                        "English, Macedonian",
                        "Demo fallback information for testing full hotel details flow.",
                        List.of("Central location", "Free WiFi", "Breakfast included")
                ),
                basic.rooms(),
                new HotelPaymentFeaturesDto(
                        TEST_HOTEL_ID,
                        true,
                        false,
                        true,
                        List.of("Visa", "Mastercard"),
                        List.of("Pay at property available")
                ),
                new HotelPoliciesDto(
                        TEST_HOTEL_ID,
                        "14:00",
                        "23:59",
                        "07:00",
                        "11:00",
                        "Free cancellation up to 24h before check-in.",
                        "Children of all ages are welcome.",
                        "Pets are not allowed.",
                        List.of("Valid ID may be required at check-in.")
                ),
                List.of(
                        new HotelPhotoDto(
                                "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
                                "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=400&auto=format&fit=crop",
                                "Hotel exterior",
                                0
                        ),
                        new HotelPhotoDto(
                                "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop",
                                "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=400&auto=format&fit=crop",
                                "Room interior",
                                1
                        )
                ),
                List.of(
                        new HotelFacilityDto("Free WiFi", "General", null, true),
                        new HotelFacilityDto("Parking", "General", null, true),
                        new HotelFacilityDto("Breakfast", "Food & Drink", null, true)
                )
        );
    }

    private LocalDate parseCheckIn(String from) {
        try {
            return LocalDate.parse(from);
        } catch (DateTimeParseException e) {
            return LocalDate.now().plusDays(1);
        }
    }

    private LocalDate parseCheckOut(LocalDate checkIn, String to) {
        try {
            LocalDate parsed = isBlank(to) ? checkIn.plusDays(1) : LocalDate.parse(to);
            return parsed.isAfter(checkIn) ? parsed : checkIn.plusDays(1);
        } catch (DateTimeParseException e) {
            return checkIn.plusDays(1);
        }
    }

    private String safeDateOrTomorrow(String value) {
        try {
            LocalDate date = LocalDate.parse(value);
            return date.isBefore(LocalDate.now()) ? LocalDate.now().plusDays(1).toString() : date.toString();
        } catch (Exception e) {
            return LocalDate.now().plusDays(1).toString();
        }
    }

    private String safeDateOrNextDay(String checkIn, String checkOut) {
        try {
            LocalDate in = LocalDate.parse(safeDateOrTomorrow(checkIn));
            LocalDate out = LocalDate.parse(checkOut);
            return out.isAfter(in) ? out.toString() : in.plusDays(1).toString();
        } catch (Exception e) {
            LocalDate in = LocalDate.parse(safeDateOrTomorrow(checkIn));
            return in.plusDays(1).toString();
        }
    }

    private long daysBetweenSafe(String checkIn, String checkOut) {
        try {
            LocalDate in = LocalDate.parse(checkIn);
            LocalDate out = LocalDate.parse(checkOut);
            return Math.max(1, ChronoUnit.DAYS.between(in, out));
        } catch (Exception e) {
            return 1;
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record PriceBounds(Double min, Double max) {
    }
}
