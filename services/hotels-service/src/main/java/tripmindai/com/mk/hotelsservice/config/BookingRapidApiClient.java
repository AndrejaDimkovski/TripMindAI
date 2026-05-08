package tripmindai.com.mk.hotelsservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

@Component
public class BookingRapidApiClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${booking.api.base-url}")
    private String baseUrl;

    @Value("${booking.api.key}")
    private String apiKey;

    @Value("${booking.api.host}")
    private String apiHost;

    @Value("${booking.api.default-currency:EUR}")
    private String defaultCurrency;

    @Value("${booking.api.default-language:en-us}")
    private String defaultLanguage;

    public Map<?, ?> searchDestinationRaw(String query) {
        if (isBlank(query)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/searchDestination")
                    .queryParam("query", query.trim())
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> searchHotelsRaw(
            String destId,
            String destType,
            String arrivalDate,
            String departureDate,
            int adults,
            int roomQuantity,
            int pageNo
    ) {
        if (isBlank(destId) || isBlank(destType)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/searchHotels")
                    .queryParam("dest_id", destId.trim())
                    .queryParam("search_type", destType.trim())
                    .queryParam("arrival_date", arrivalDate)
                    .queryParam("departure_date", departureDate)
                    .queryParam("adults", Math.max(1, adults))
                    .queryParam("children_age", "0,17")
                    .queryParam("room_qty", Math.max(1, roomQuantity))
                    .queryParam("page_number", Math.max(1, pageNo))
                    .queryParam("units", "metric")
                    .queryParam("temperature_unit", "c")
                    .queryParam("languagecode", defaultLanguage)
                    .queryParam("currency_code", defaultCurrency)
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> hotelDetailsRaw(
            String hotelId,
            String arrivalDate,
            String departureDate,
            int adults,
            int roomQuantity
    ) {
        if (isBlank(hotelId)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/getHotelDetails")
                    .queryParam("hotel_id", hotelId.trim())
                    .queryParam("arrival_date", arrivalDate)
                    .queryParam("departure_date", departureDate)
                    .queryParam("adults", Math.max(1, adults))
                    .queryParam("children_age", "0,17")
                    .queryParam("room_qty", Math.max(1, roomQuantity))
                    .queryParam("units", "metric")
                    .queryParam("temperature_unit", "c")
                    .queryParam("languagecode", defaultLanguage)
                    .queryParam("currency_code", defaultCurrency)
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> getDescriptionAndInfoRaw(String hotelId) {
        if (isBlank(hotelId)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/getDescriptionAndInfo")
                    .queryParam("hotel_id", hotelId.trim())
                    .queryParam("languagecode", defaultLanguage)
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> getRoomListRaw(
            String hotelId,
            String arrivalDate,
            String departureDate,
            int adults,
            int roomQuantity
    ) {
        if (isBlank(hotelId)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/getRoomList")
                    .queryParam("hotel_id", hotelId.trim())
                    .queryParam("arrival_date", arrivalDate)
                    .queryParam("departure_date", departureDate)
                    .queryParam("adults", Math.max(1, adults))
                    .queryParam("children_age", "0,17")
                    .queryParam("room_qty", Math.max(1, roomQuantity))
                    .queryParam("currency_code", defaultCurrency)
                    .queryParam("languagecode", defaultLanguage)
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> getPaymentFeaturesRaw(
            String hotelId,
            String arrivalDate,
            String departureDate,
            int adults,
            int roomQuantity
    ) {
        if (isBlank(hotelId)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/getPaymentFeatures")
                    .queryParam("hotel_id", hotelId.trim())
                    .queryParam("arrival_date", arrivalDate)
                    .queryParam("departure_date", departureDate)
                    .queryParam("adults", Math.max(1, adults))
                    .queryParam("children_age", "0,17")
                    .queryParam("room_qty", Math.max(1, roomQuantity))
                    .queryParam("currency_code", defaultCurrency)
                    .queryParam("languagecode", defaultLanguage)
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> getHotelPoliciesRaw(String hotelId) {
        if (isBlank(hotelId)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/getHotelPolicies")
                    .queryParam("hotel_id", hotelId.trim())
                    .queryParam("languagecode", defaultLanguage)
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> getHotelPhotosRaw(String hotelId) {
        if (isBlank(hotelId)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/getHotelPhotos")
                    .queryParam("hotel_id", hotelId.trim())
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> getHotelFacilitiesRaw(String hotelId) {
        if (isBlank(hotelId)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/hotels/getHotelFacilities")
                    .queryParam("hotel_id", hotelId.trim())
                    .queryParam("languagecode", defaultLanguage)
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    private Map<?, ?> exchange(String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-RapidAPI-Key", apiKey);
            headers.set("X-RapidAPI-Host", apiHost);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            return response.getBody();
        } catch (HttpStatusCodeException e) {
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
