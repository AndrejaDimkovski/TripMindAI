package tripmindai.com.mk.flightsservice.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import tripmindai.com.mk.flightsservice.config.BookingRapidApiClient;
import tripmindai.com.mk.flightsservice.dto.FlightDestinationDto;
import tripmindai.com.mk.flightsservice.dto.FlightDetailsDto;
import tripmindai.com.mk.flightsservice.dto.FlightLegDetailsDto;
import tripmindai.com.mk.flightsservice.dto.FlightOfferDto;
import tripmindai.com.mk.flightsservice.dto.FlightSegmentDetailsDto;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FlightsSearchService {

    private static final int MAX_RESULTS = 5;

    private final BookingRapidApiClient bookingRapidApiClient;

    private final Map<String, String> locationIdCache = new ConcurrentHashMap<>();

    public FlightsSearchService(BookingRapidApiClient bookingRapidApiClient) {
        this.bookingRapidApiClient = bookingRapidApiClient;

        locationIdCache.put("SKP", "SKP.AIRPORT");
        locationIdCache.put("PAR", "PAR.CITY");
        locationIdCache.put("ROM", "ROM.CITY");
        locationIdCache.put("MIL", "MIL.CITY");
        locationIdCache.put("NYC", "NYC.CITY");
        locationIdCache.put("LON", "LON.CITY");
        locationIdCache.put("MIA", "MIA.AIRPORT");
        locationIdCache.put("LAX", "LAX.AIRPORT");
        locationIdCache.put("IST", "IST.AIRPORT");
        locationIdCache.put("BKK", "BKK.AIRPORT");
        locationIdCache.put("HKT", "HKT.AIRPORT");
        locationIdCache.put("CNX", "CNX.AIRPORT");
        locationIdCache.put("BCN", "BCN.AIRPORT");
        locationIdCache.put("MAD", "MAD.AIRPORT");
        locationIdCache.put("BEG", "BEG.AIRPORT");
    }

    @Cacheable(
            cacheNames = "flight-search",
            key = "#root.target.flightSearchCacheKey(#origin, #destination, #from, #to, #adults)",
            unless = "#result == null || #result.isEmpty()"
    )
    public List<FlightOfferDto> search(String origin, String destination, String from, String to, int adults) {
        String originCode = normalizeCode(origin);
        String destinationCode = normalizeCode(destination);

        LocalDate departDate = parseDateOrTomorrow(from);
        if (departDate.isBefore(LocalDate.now())) {
            departDate = LocalDate.now().plusDays(1);
        }

        LocalDate returnDate = null;
        if (to != null && !to.isBlank()) {
            returnDate = parseDateOrNull(to);
            if (returnDate != null && !returnDate.isAfter(departDate)) {
                returnDate = departDate.plusDays(1);
            }
        }

        int safeAdults = Math.max(1, adults);

        String fromId = resolveLocationId(originCode);
        String toId = resolveLocationId(destinationCode);

        if (isBlank(fromId) || isBlank(toId)) {
            return List.of();
        }

        Map<?, ?> raw = bookingRapidApiClient.searchFlightsRaw(
                fromId,
                toId,
                departDate.toString(),
                returnDate != null ? returnDate.toString() : null,
                safeAdults
        );

        if (raw == null) {
            return List.of();
        }

        List<FlightOfferDto> results = mapFlightOffers(raw).stream()
                .sorted(Comparator.comparingDouble(FlightOfferDto::totalPrice))
                .limit(MAX_RESULTS)
                .toList();
        return results;
    }

    @Cacheable(
            cacheNames = "flight-destinations",
            key = "#root.target.destinationCacheKey(#query)",
            unless = "#result == null || #result.isEmpty()"
    )
    public List<FlightDestinationDto> searchDestinations(String query) {
        if (isBlank(query)) return List.of();

        Map<?, ?> raw = bookingRapidApiClient.searchFlightLocationRaw(query.trim());
        if (raw == null) return List.of();

        return mapDestinations(raw);
    }

    @Cacheable(
            cacheNames = "flight-details",
            key = "#root.target.destinationCacheKey(#token)",
            unless = "#result == null"
    )
    public FlightDetailsDto getFlightDetails(String token) {
        if (isBlank(token)) {
            return null;
        }

        Map<?, ?> raw = bookingRapidApiClient.getFlightDetailsRaw(token);
        if (raw == null) {
            return null;
        }

        return mapFlightDetails(raw);
    }

    public String flightSearchCacheKey(String origin, String destination, String from, String to, int adults) {
        String originCode = normalizeCode(origin);
        String destinationCode = normalizeCode(destination);

        LocalDate departDate = parseDateOrTomorrow(from);
        if (departDate.isBefore(LocalDate.now())) {
            departDate = LocalDate.now().plusDays(1);
        }

        LocalDate returnDate = null;
        if (to != null && !to.isBlank()) {
            returnDate = parseDateOrNull(to);
            if (returnDate != null && !returnDate.isAfter(departDate)) {
                returnDate = departDate.plusDays(1);
            }
        }

        return String.join("|",
                normalizeCachePart(originCode),
                normalizeCachePart(destinationCode),
                departDate.toString(),
                returnDate != null ? returnDate.toString() : "",
                String.valueOf(Math.max(1, adults))
        );
    }

    public String destinationCacheKey(String value) {
        return normalizeCachePart(value);
    }

    public String normalizeCachePart(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    @SuppressWarnings("unchecked")
    private String resolveLocationId(String codeOrQuery) {
        if (isBlank(codeOrQuery)) return null;

        if (locationIdCache.containsKey(codeOrQuery)) {
            return locationIdCache.get(codeOrQuery);
        }

        Map<?, ?> raw = bookingRapidApiClient.searchFlightLocationRaw(codeOrQuery);
        if (raw == null) return null;

        Object dataObj = raw.get("data");
        if (!(dataObj instanceof List<?> dataList) || dataList.isEmpty()) {
            return null;
        }

        String bestId = null;

        for (Object item : dataList) {
            if (!(item instanceof Map<?, ?> map)) continue;

            String id = asString(map.get("id"));
            String code = asString(map.get("code"));
            String city = asString(map.get("city"));
            String cityName = asString(map.get("cityName"));
            String name = asString(map.get("name"));

            if (!isBlank(code) && codeOrQuery.equalsIgnoreCase(code) && !isBlank(id)) {
                locationIdCache.put(codeOrQuery, id);
                return id;
            }

            if (!isBlank(city) && codeOrQuery.equalsIgnoreCase(city) && !isBlank(id)) {
                locationIdCache.put(codeOrQuery, id);
                return id;
            }

            if (!isBlank(cityName) && codeOrQuery.equalsIgnoreCase(cityName) && !isBlank(id)) {
                locationIdCache.put(codeOrQuery, id);
                return id;
            }

            if (!isBlank(name) && codeOrQuery.equalsIgnoreCase(name) && !isBlank(id)) {
                locationIdCache.put(codeOrQuery, id);
                return id;
            }

            if (bestId == null && !isBlank(id)) {
                bestId = id;
            }
        }

        if (!isBlank(bestId)) {
            locationIdCache.put(codeOrQuery, bestId);
        }

        return bestId;
    }

    @SuppressWarnings("unchecked")
    private List<FlightDestinationDto> mapDestinations(Map<?, ?> raw) {
        List<FlightDestinationDto> result = new ArrayList<>();

        Object dataObj = raw.get("data");
        if (!(dataObj instanceof List<?> dataList)) return result;

        for (Object item : dataList) {
            if (!(item instanceof Map<?, ?> map)) continue;

            result.add(new FlightDestinationDto(
                    asString(map.get("id")),
                    asString(map.get("type")),
                    asString(map.get("name")),
                    asString(map.get("code")),
                    asString(map.get("city")),
                    asString(map.get("cityName")),
                    asString(map.get("country")),
                    asString(map.get("countryName")),
                    asString(map.get("parent"))
            ));
        }

        return result;
    }

    @SuppressWarnings("unchecked")
    private List<FlightOfferDto> mapFlightOffers(Map<?, ?> raw) {
        List<FlightOfferDto> result = new ArrayList<>();

        Object dataObj = raw.get("data");
        if (!(dataObj instanceof Map<?, ?> data)) return result;

        Object offersObj = data.get("flightOffers");
        if (!(offersObj instanceof List<?> offers)) return result;

        for (Object item : offers) {
            if (!(item instanceof Map<?, ?> offer)) continue;

            try {
                double totalPrice = extractPrice(offer);
                String currency = extractCurrency(offer);
                String token = asString(offer.get("token"));
                String tripType = normalizeTripType(asString(offer.get("tripType")));

                Object segmentsObj = offer.get("segments");
                if (!(segmentsObj instanceof List<?> segments) || segments.isEmpty()) continue;

                Object firstSegmentObj = segments.get(0);
                if (!(firstSegmentObj instanceof Map<?, ?> firstSegment)) continue;

                Map<?, ?> outboundDepartureAirport =
                        firstSegment.get("departureAirport") instanceof Map<?, ?> m ? m : null;
                Map<?, ?> outboundArrivalAirport =
                        firstSegment.get("arrivalAirport") instanceof Map<?, ?> m ? m : null;

                String departureAt = asString(firstSegment.get("departureTime"));
                String arrivalAt = asString(firstSegment.get("arrivalTime"));

                String originIata = asString(outboundDepartureAirport != null ? outboundDepartureAirport.get("code") : null);
                String originName = asString(outboundDepartureAirport != null ? outboundDepartureAirport.get("name") : null);
                String originCity = asString(outboundDepartureAirport != null ? outboundDepartureAirport.get("cityName") : null);

                String destIata = asString(outboundArrivalAirport != null ? outboundArrivalAirport.get("code") : null);
                String destName = asString(outboundArrivalAirport != null ? outboundArrivalAirport.get("name") : null);
                String destCity = asString(outboundArrivalAirport != null ? outboundArrivalAirport.get("cityName") : null);

                String returnDepartureAt = null;
                String returnArrivalAt = null;

                if (segments.size() > 1) {
                    Object secondSegmentObj = segments.get(1);
                    if (secondSegmentObj instanceof Map<?, ?> secondSegment) {
                        returnDepartureAt = asString(secondSegment.get("departureTime"));
                        returnArrivalAt = asString(secondSegment.get("arrivalTime"));
                    }
                }

                AirlineInfo airlineInfo = extractAirlineInfo(firstSegment);
                int stops = extractStops(segments);

                result.add(new FlightOfferDto(
                        token,
                        airlineInfo.code(),
                        airlineInfo.name(),
                        airlineInfo.logo(),
                        originIata,
                        originName,
                        originCity,
                        destIata,
                        destName,
                        destCity,
                        departureAt,
                        arrivalAt,
                        returnDepartureAt,
                        returnArrivalAt,
                        totalPrice,
                        currency,
                        stops,
                        tripType
                ));
            } catch (Exception e) {
            }
        }

        return result;
    }

    @SuppressWarnings("unchecked")
    private FlightDetailsDto mapFlightDetails(Map<?, ?> raw) {
        Object dataObj = raw.get("data");
        if (!(dataObj instanceof Map<?, ?> data)) return null;

        String token = asString(data.get("token"));
        String tripType = normalizeTripType(asString(data.get("tripType")));

        double totalPrice = 0.0;
        String currency = "EUR";

        Object priceBreakdownObj = data.get("priceBreakdown");
        if (priceBreakdownObj instanceof Map<?, ?> priceBreakdown) {
            Object totalObj = priceBreakdown.get("total");
            if (totalObj instanceof Map<?, ?> total) {
                Number units = asNumber(total.get("units"));
                Number nanos = asNumber(total.get("nanos"));

                totalPrice = units != null ? units.doubleValue() : 0.0;
                if (nanos != null) {
                    totalPrice += nanos.doubleValue() / 1_000_000_000d;
                }

                String c = asString(total.get("currencyCode"));
                if (!isBlank(c)) {
                    currency = c;
                }
            }
        }

        String fareName = null;
        String cabinClass = null;

        Object brandedFareInfoObj = data.get("brandedFareInfo");
        if (brandedFareInfoObj instanceof Map<?, ?> brandedFareInfo) {
            fareName = asString(brandedFareInfo.get("fareName"));
            cabinClass = asString(brandedFareInfo.get("cabinClass"));
        }

        List<FlightSegmentDetailsDto> segmentDtos = new ArrayList<>();

        Object segmentsObj = data.get("segments");
        if (segmentsObj instanceof List<?> segments) {
            for (Object segmentObj : segments) {
                if (!(segmentObj instanceof Map<?, ?> segment)) continue;

                Map<?, ?> departureAirport = segment.get("departureAirport") instanceof Map<?, ?> m ? m : null;
                Map<?, ?> arrivalAirport = segment.get("arrivalAirport") instanceof Map<?, ?> m ? m : null;

                String departureAirportCode = asString(departureAirport != null ? departureAirport.get("code") : null);
                String departureAirportName = asString(departureAirport != null ? departureAirport.get("name") : null);
                String departureCity = asString(departureAirport != null ? departureAirport.get("cityName") : null);

                String arrivalAirportCode = asString(arrivalAirport != null ? arrivalAirport.get("code") : null);
                String arrivalAirportName = asString(arrivalAirport != null ? arrivalAirport.get("name") : null);
                String arrivalCity = asString(arrivalAirport != null ? arrivalAirport.get("cityName") : null);

                String departureTime = asString(segment.get("departureTime"));
                String arrivalTime = asString(segment.get("arrivalTime"));

                int totalMinutes = secondsToMinutes(asNumber(segment.get("totalTime")));

                List<FlightLegDetailsDto> legDtos = new ArrayList<>();

                Object legsObj = segment.get("legs");
                if (legsObj instanceof List<?> legs) {
                    for (Object legObj : legs) {
                        if (!(legObj instanceof Map<?, ?> leg)) continue;

                        Map<?, ?> legDepartureAirport = leg.get("departureAirport") instanceof Map<?, ?> m ? m : null;
                        Map<?, ?> legArrivalAirport = leg.get("arrivalAirport") instanceof Map<?, ?> m ? m : null;

                        String legDepartureAirportCode = asString(legDepartureAirport != null ? legDepartureAirport.get("code") : null);
                        String legDepartureAirportName = asString(legDepartureAirport != null ? legDepartureAirport.get("name") : null);

                        String legArrivalAirportCode = asString(legArrivalAirport != null ? legArrivalAirport.get("code") : null);
                        String legArrivalAirportName = asString(legArrivalAirport != null ? legArrivalAirport.get("name") : null);

                        String legDepartureTime = asString(leg.get("departureTime"));
                        String legArrivalTime = asString(leg.get("arrivalTime"));
                        String legCabinClass = asString(leg.get("cabinClass"));
                        int legTotalMinutes = secondsToMinutes(asNumber(leg.get("totalTime")));

                        String airlineCode = "N/A";
                        String airlineName = "Unknown airline";
                        String airlineLogo = null;
                        String flightNumber = null;

                        Object flightInfoObj = leg.get("flightInfo");
                        if (flightInfoObj instanceof Map<?, ?> flightInfo) {
                            Object numberObj = flightInfo.get("flightNumber");
                            flightNumber = numberObj != null ? String.valueOf(numberObj) : null;
                        }

                        Object carriersDataObj = leg.get("carriersData");
                        if (carriersDataObj instanceof List<?> carriers && !carriers.isEmpty()) {
                            Object firstCarrierObj = carriers.get(0);
                            if (firstCarrierObj instanceof Map<?, ?> carrier) {
                                String code = asString(carrier.get("code"));
                                String name = asString(carrier.get("name"));
                                String logo = asString(carrier.get("logo"));

                                if (!isBlank(code)) airlineCode = code;
                                if (!isBlank(name)) airlineName = name;
                                airlineLogo = logo;
                            }
                        }

                        legDtos.add(new FlightLegDetailsDto(
                                legDepartureAirportCode,
                                legDepartureAirportName,
                                legArrivalAirportCode,
                                legArrivalAirportName,
                                legDepartureTime,
                                legArrivalTime,
                                airlineCode,
                                airlineName,
                                airlineLogo,
                                flightNumber,
                                legCabinClass,
                                legTotalMinutes
                        ));
                    }
                }

                segmentDtos.add(new FlightSegmentDetailsDto(
                        departureAirportCode,
                        departureAirportName,
                        departureCity,
                        arrivalAirportCode,
                        arrivalAirportName,
                        arrivalCity,
                        departureTime,
                        arrivalTime,
                        totalMinutes,
                        legDtos
                ));
            }
        }

        return new FlightDetailsDto(
                token,
                tripType,
                totalPrice,
                currency,
                fareName,
                cabinClass,
                segmentDtos
        );
    }

    private int extractStops(List<?> segments) {
        int totalStops = 0;

        for (Object segmentObj : segments) {
            if (!(segmentObj instanceof Map<?, ?> segment)) continue;

            Object legsObj = segment.get("legs");
            if (!(legsObj instanceof List<?> legs) || legs.isEmpty()) continue;

            totalStops += Math.max(0, legs.size() - 1);
        }

        return totalStops;
    }

    @SuppressWarnings("unchecked")
    private AirlineInfo extractAirlineInfo(Map<?, ?> segment) {
        Object legsObj = segment.get("legs");
        if (!(legsObj instanceof List<?> legs) || legs.isEmpty()) {
            return new AirlineInfo("N/A", "Unknown airline", null);
        }

        Object firstLegObj = legs.get(0);
        if (!(firstLegObj instanceof Map<?, ?> leg)) {
            return new AirlineInfo("N/A", "Unknown airline", null);
        }

        Object carriersDataObj = leg.get("carriersData");
        if (!(carriersDataObj instanceof List<?> carriers) || carriers.isEmpty()) {
            return new AirlineInfo("N/A", "Unknown airline", null);
        }

        Object firstCarrierObj = carriers.get(0);
        if (!(firstCarrierObj instanceof Map<?, ?> carrier)) {
            return new AirlineInfo("N/A", "Unknown airline", null);
        }

        String code = asString(carrier.get("code"));
        String name = asString(carrier.get("name"));
        String logo = asString(carrier.get("logo"));

        return new AirlineInfo(
                !isBlank(code) ? code : "N/A",
                !isBlank(name) ? name : "Unknown airline",
                logo
        );
    }

    private double extractPrice(Map<?, ?> offer) {
        Object priceBreakdownObj = offer.get("priceBreakdown");
        if (!(priceBreakdownObj instanceof Map<?, ?> priceBreakdown)) return 0.0;

        Object totalObj = priceBreakdown.get("total");
        if (!(totalObj instanceof Map<?, ?> total)) return 0.0;

        Number units = asNumber(total.get("units"));
        Number nanos = asNumber(total.get("nanos"));

        double value = units != null ? units.doubleValue() : 0.0;
        if (nanos != null) {
            value += nanos.doubleValue() / 1_000_000_000d;
        }

        return value;
    }

    private String extractCurrency(Map<?, ?> offer) {
        Object priceBreakdownObj = offer.get("priceBreakdown");
        if (!(priceBreakdownObj instanceof Map<?, ?> priceBreakdown)) return "EUR";

        Object totalObj = priceBreakdown.get("total");
        if (!(totalObj instanceof Map<?, ?> total)) return "EUR";

        String currency = asString(total.get("currencyCode"));
        return !isBlank(currency) ? currency : "EUR";
    }

    private String normalizeTripType(String value) {
        if (value == null || value.isBlank()) return "ONE_WAY";

        String v = value.trim().toUpperCase(Locale.ROOT);
        if ("ROUNDTRIP".equals(v)) return "ROUND_TRIP";
        if ("ONEWAY".equals(v)) return "ONE_WAY";

        return v;
    }

    private int secondsToMinutes(Number seconds) {
        if (seconds == null) return 0;
        return (int) Math.round(seconds.doubleValue() / 60.0);
    }

    private String normalizeCode(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Number asNumber(Object value) {
        if (value instanceof Number n) return n;
        try {
            return value != null ? Double.parseDouble(String.valueOf(value)) : null;
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private LocalDate parseDateOrTomorrow(String s) {
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            return LocalDate.now().plusDays(1);
        }
    }

    private LocalDate parseDateOrNull(String s) {
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private record AirlineInfo(String code, String name, String logo) {
    }
}
