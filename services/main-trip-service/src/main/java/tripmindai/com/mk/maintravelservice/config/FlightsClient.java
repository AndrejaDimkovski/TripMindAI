package tripmindai.com.mk.maintravelservice.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import tripmindai.com.mk.maintravelservice.dto.flights.FlightDestinationDto;
import tripmindai.com.mk.maintravelservice.dto.flights.FlightDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.flights.FlightOfferDto;

import java.util.List;

@Component
public class FlightsClient {

    private static final ParameterizedTypeReference<List<FlightDestinationDto>> DESTINATIONS_TYPE =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<FlightOfferDto>> OFFERS_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;
    private final String baseUrl;

    public FlightsClient(
            @Qualifier("flightsRestClient") RestClient restClient,
            @Value("${services.flights.base-url}") String baseUrl
    ) {
        this.restClient = restClient;
        this.baseUrl = baseUrl;
    }

    public List<FlightDestinationDto> searchDestinations(String query) {
        if (isBlank(query)) {
            return List.of();
        }

        String url = UriComponentsBuilder
                .fromUriString(baseUrl + "/api/flights/destinations")
                .queryParam("query", query.trim())
                .toUriString();

        try {
            List<FlightDestinationDto> result = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(DESTINATIONS_TYPE);

            return result != null ? result : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    public List<FlightOfferDto> search(
            String origin,
            String destination,
            String from,
            String to,
            int adults
    ) {
        if (isBlank(origin) || isBlank(destination) || isBlank(from)) {
            return List.of();
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(baseUrl + "/api/flights/search")
                .queryParam("origin", origin.trim())
                .queryParam("destination", destination.trim())
                .queryParam("from", from)
                .queryParam("adults", Math.max(1, adults));

        if (!isBlank(to)) {
            builder.queryParam("to", to);
        }

        try {
            List<FlightOfferDto> result = restClient.get()
                    .uri(builder.toUriString())
                    .retrieve()
                    .body(OFFERS_TYPE);

            return result != null ? result : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    public FlightDetailsDto getDetails(String token) {
        if (isBlank(token)) {
            return null;
        }

        String url = UriComponentsBuilder
                .fromUriString(baseUrl + "/api/flights/details")
                .queryParam("token", token.trim())
                .toUriString();

        try {
            return restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(FlightDetailsDto.class);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
