package travelmindai.com.mk.maintravelservice.config;

import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import travelmindai.com.mk.maintravelservice.dto.HotelDto;
import travelmindai.com.mk.maintravelservice.dto.HotelOfferDto;

import java.util.Arrays;
import java.util.List;

@Component
public class HotelsClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String baseUrl = "http://localhost:8082/api/hotels";

    public List<HotelDto> hotelsByCity(String cityCode, int limit) {
        if (cityCode == null || cityCode.isBlank()) return List.of();

        String url = UriComponentsBuilder
                .fromUriString(baseUrl + "/by-city")   // ✅ FIX
                .queryParam("cityCode", cityCode.trim())
                .queryParam("limit", limit)
                .build()
                .toUriString();

        try {
            HotelDto[] res = restTemplate.getForObject(url, HotelDto[].class);
            return res == null ? List.of() : Arrays.asList(res);

        } catch (HttpStatusCodeException e) {
            return List.of();

        } catch (RestClientException e) {
            return List.of();
        }
    }

    public List<HotelOfferDto> hotelOffers(String hotelIdsCsv, String checkIn, String checkOut, int adults) {
        if (hotelIdsCsv == null || hotelIdsCsv.isBlank()) return List.of();

        String url = UriComponentsBuilder
                .fromUriString(baseUrl + "/offers")    // ✅ FIX
                .queryParam("hotelIds", hotelIdsCsv)
                .queryParam("checkIn", checkIn)
                .queryParam("checkOut", checkOut)
                .queryParam("adults", adults)
                .build()
                .toUriString();

        try {
            HotelOfferDto[] res = restTemplate.getForObject(url, HotelOfferDto[].class);
            return res == null ? List.of() : Arrays.asList(res);

        } catch (HttpStatusCodeException e) {
            return List.of();

        } catch (RestClientException e) {
            return List.of();
        }
    }
}
