package tripmindai.com.mk.maintravelservice.service.geo;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tripmindai.com.mk.maintravelservice.dto.GeoPoint;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GeocodingService {

    private static final String USER_AGENT = "TravelMindAI/1.0 (educational project)";
    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1";
    private static final GeoPoint DEFAULT_POINT = new GeoPoint(41.9981, 21.4254);

    private final RestTemplate restTemplate;
    private final Map<String, GeoPoint> cache = new ConcurrentHashMap<>();

    public GeocodingService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public GeoPoint geocode(String placeName, String destinationName, String countryName) {
        String cacheKey = buildCacheKey(placeName, destinationName, countryName);

        GeoPoint cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        for (String query : buildQueries(placeName, destinationName, countryName)) {
            GeoPoint point = tryGeocode(query);
            if (point != null) {
                cache.put(cacheKey, point);
                return point;
            }
        }

        GeoPoint fallback = fallback(destinationName);
        cache.put(cacheKey, fallback);
        return fallback;
    }

    private GeoPoint tryGeocode(String query) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", USER_AGENT);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<List> response = restTemplate.exchange(
                    NOMINATIM_URL,
                    HttpMethod.GET,
                    entity,
                    List.class,
                    Map.of("q", query)
            );

            if (!response.getStatusCode().is2xxSuccessful()
                    || response.getBody() == null
                    || response.getBody().isEmpty()) {
                return null;
            }

            Object first = response.getBody().get(0);
            if (!(first instanceof Map<?, ?> result)) {
                return null;
            }

            Object latObj = result.get("lat");
            Object lonObj = result.get("lon");
            if (latObj == null || lonObj == null) {
                return null;
            }

            double lat = Double.parseDouble(String.valueOf(latObj));
            double lng = Double.parseDouble(String.valueOf(lonObj));

            return new GeoPoint(lat, lng);
        } catch (Exception e) {
            return null;
        }
    }

    private List<String> buildQueries(String placeName, String destinationName, String countryName) {
        List<String> queries = new ArrayList<>();

        String place = safe(placeName);
        String city = safe(destinationName);
        String country = safe(countryName);

        if (!place.isBlank() && !city.isBlank() && !country.isBlank()) {
            queries.add(place + ", " + city + ", " + country);
        }
        if (!place.isBlank() && !city.isBlank()) {
            queries.add(place + ", " + city);
        }
        if (!place.isBlank() && !country.isBlank()) {
            queries.add(place + ", " + country);
        }
        if (!place.isBlank()) {
            queries.add(place);
        }
        if (!city.isBlank() && !country.isBlank()) {
            queries.add(city + ", " + country);
        }
        if (!city.isBlank()) {
            queries.add(city);
        }

        return queries;
    }

    private String buildCacheKey(String placeName, String destinationName, String countryName) {
        return (safe(placeName) + "|" + safe(destinationName) + "|" + safe(countryName))
                .trim()
                .toLowerCase();
    }

    private GeoPoint fallback(String city) {
        if (city == null || city.isBlank()) {
            return DEFAULT_POINT;
        }

        return switch (city.trim().toLowerCase()) {
            case "venice", "venezia" -> new GeoPoint(45.4408, 12.3155);
            case "barcelona" -> new GeoPoint(41.3874, 2.1686);
            case "rome", "roma" -> new GeoPoint(41.9028, 12.4964);
            case "paris" -> new GeoPoint(48.8566, 2.3522);
            case "amsterdam" -> new GeoPoint(52.3676, 4.9041);
            case "vienna", "wien" -> new GeoPoint(48.2082, 16.3738);
            case "budapest" -> new GeoPoint(47.4979, 19.0402);
            case "prague", "praha" -> new GeoPoint(50.0755, 14.4378);
            case "london" -> new GeoPoint(51.5074, -0.1278);
            case "bangkok" -> new GeoPoint(13.7563, 100.5018);
            case "istanbul" -> new GeoPoint(41.0082, 28.9784);
            case "antalya" -> new GeoPoint(36.8969, 30.7133);
            default -> DEFAULT_POINT;
        };
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
