package travelmindai.com.mk.maintravelservice.config;

import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import travelmindai.com.mk.maintravelservice.dto.FlightOfferDto;

import java.util.Arrays;
import java.util.List;

@Component
public class FlightsClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String baseUrl = "http://localhost:8081/api/flights";

    public List<FlightOfferDto> search(
            String origin,
            String destination,
            String from,
            String to,
            int adults
    ) {

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(baseUrl + "/search")
                .queryParam("origin", origin)
                .queryParam("dest", destination)
                .queryParam("from", from)
                .queryParam("adults", adults);

        if (to != null && !to.isBlank()) {
            builder.queryParam("to", to);
        }

        String url = builder.build().toUriString();

        try {
            FlightOfferDto[] response =
                    restTemplate.getForObject(url, FlightOfferDto[].class);

            return response != null ? Arrays.asList(response) : List.of();

        } catch (HttpStatusCodeException e) {
            // flights-service врати 400/500 → не руши TripSearch
            return List.of();
        } catch (RestClientException e) {
            return List.of();
        }
    }
}
