package tripmindai.com.mk.flightsservice.config;

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

    public Map<?, ?> searchFlightLocationRaw(String query) {
        if (isBlank(query)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/flights/searchDestination")
                    .queryParam("query", query.trim())
                    .toUriString();

            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> searchFlightsRaw(
            String fromId,
            String toId,
            String departDate,
            String returnDate,
            int adults
    ) {
        if (isBlank(fromId) || isBlank(toId) || isBlank(departDate)) return null;

        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/flights/searchFlights")
                    .queryParam("fromId", fromId.trim())
                    .queryParam("toId", toId.trim())
                    .queryParam("departDate", departDate)
                    .queryParam("adults", Math.max(1, adults))
                    .queryParam("children", 0)
                    .queryParam("sort", "BEST")
                    .queryParam("cabinClass", "ECONOMY")
                    .queryParam("currency_code", defaultCurrency);

            if (!isBlank(returnDate)) {
                builder.queryParam("returnDate", returnDate);
            }

            String url = builder.toUriString();
            return exchange(url);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<?, ?> getFlightDetailsRaw(String token) {
        if (isBlank(token)) return null;

        try {
            String url = UriComponentsBuilder
                    .fromUriString(baseUrl + "/api/v1/flights/getFlightDetails")
                    .queryParam("token", token)
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
            headers.setContentType(MediaType.APPLICATION_JSON);
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
