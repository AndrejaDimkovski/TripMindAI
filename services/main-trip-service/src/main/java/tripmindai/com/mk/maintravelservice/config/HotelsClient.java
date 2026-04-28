package tripmindai.com.mk.maintravelservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import tripmindai.com.mk.maintravelservice.dto.country.DestinationSearchDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelFullDetailsDto;
import tripmindai.com.mk.maintravelservice.dto.hotels.HotelSearchResponseDto;

import java.util.List;

@Component
public class HotelsClient {

    private static final ParameterizedTypeReference<List<DestinationSearchDto>> DESTINATIONS_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestTemplate restTemplate;
    private final String hotelsBaseUrl;

    public HotelsClient(
            RestTemplate restTemplate,
            @Value("${services.hotels.base-url}") String hotelsBaseUrl
    ) {
        this.restTemplate = restTemplate;
        this.hotelsBaseUrl = hotelsBaseUrl;
    }

    public List<DestinationSearchDto> searchDestinations(String query) {
        if (isBlank(query)) {
            return List.of();
        }

        String url = UriComponentsBuilder
                .fromUriString(hotelsBaseUrl + "/api/hotels/destinations")
                .queryParam("query", query.trim())
                .toUriString();

        try {
            List<DestinationSearchDto> result = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    DESTINATIONS_TYPE
            ).getBody();

            return result != null ? result : List.of();
        } catch (Exception e) {
            throw new RuntimeException("Hotels destinations request failed", e);
        }
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

    public HotelSearchResponseDto searchHotels(
            String destId,
            String destType,
            String checkIn,
            String checkOut,
            int adults,
            int pageNo,
            String priceRange
    ) {
        if (isBlank(destId) || isBlank(destType) || isBlank(checkIn) || isBlank(checkOut)) {
            return emptySearchResponse(destId, destType, checkIn, checkOut, adults, pageNo);
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(hotelsBaseUrl + "/api/hotels/search")
                .queryParam("destId", destId.trim())
                .queryParam("destType", destType.trim())
                .queryParam("checkIn", checkIn)
                .queryParam("checkOut", checkOut)
                .queryParam("adults", Math.max(1, adults))
                .queryParam("pageNo", Math.max(1, pageNo));

        if (!isBlank(priceRange)) {
            builder.queryParam("priceRange", priceRange.trim());
        }

        try {
            HotelSearchResponseDto result =
                    restTemplate.getForObject(builder.toUriString(), HotelSearchResponseDto.class);

            return result != null
                    ? result
                    : emptySearchResponse(destId, destType, checkIn, checkOut, adults, pageNo);
        } catch (Exception e) {
            throw new RuntimeException("Hotels search request failed", e);
        }
    }

    public HotelDetailsDto hotelDetails(
            String hotelId,
            String checkIn,
            String checkOut,
            int adults,
            String cityName
    ) {
        if (isBlank(hotelId) || isBlank(checkIn) || isBlank(checkOut)) {
            return null;
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(hotelsBaseUrl + "/api/hotels/" + hotelId.trim() + "/details")
                .queryParam("checkIn", checkIn)
                .queryParam("checkOut", checkOut)
                .queryParam("adults", Math.max(1, adults));

        if (!isBlank(cityName)) {
            builder.queryParam("cityName", cityName.trim());
        }

        try {
            return restTemplate.getForObject(builder.toUriString(), HotelDetailsDto.class);
        } catch (Exception e) {
            throw new RuntimeException("Hotel details request failed", e);
        }
    }

    public HotelFullDetailsDto hotelFullDetails(
            String hotelId,
            String checkIn,
            String checkOut,
            int adults,
            String cityName
    ) {
        if (isBlank(hotelId) || isBlank(checkIn) || isBlank(checkOut)) {
            return null;
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(hotelsBaseUrl + "/api/hotels/" + hotelId.trim() + "/full-details")
                .queryParam("checkIn", checkIn)
                .queryParam("checkOut", checkOut)
                .queryParam("adults", Math.max(1, adults));

        if (!isBlank(cityName)) {
            builder.queryParam("cityName", cityName.trim());
        }

        try {
            return restTemplate.getForObject(builder.toUriString(), HotelFullDetailsDto.class);
        } catch (Exception e) {
            throw new RuntimeException("Hotel full details request failed", e);
        }
    }

    private HotelSearchResponseDto emptySearchResponse(
            String destId,
            String destType,
            String checkIn,
            String checkOut,
            int adults,
            int pageNo
    ) {
        return new HotelSearchResponseDto(
                destId,
                destType,
                checkIn,
                checkOut,
                Math.max(1, adults),
                Math.max(1, pageNo),
                List.of()
        );
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
