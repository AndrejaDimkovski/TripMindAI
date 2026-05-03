package tripmindai.com.mk.maintripservice.service.trip;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tripmindai.com.mk.maintripservice.dto.country.GeoPoint;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RoutingService {

    private final RestTemplate restTemplate;

    public RoutingService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<GeoPoint> buildRoute(List<GeoPoint> points) {
        if (points == null) {
            return List.of();
        }
        if (points.size() < 2) {
            return points;
        }

        try {
            String coordinates = points.stream()
                    .map(point -> point.lng() + "," + point.lat())
                    .collect(Collectors.joining(";"));

            String url = "https://router.project-osrm.org/route/v1/driving/"
                    + coordinates
                    + "?overview=full&geometries=geojson";

            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            List<GeoPoint> routePoints = extractRoutePoints(response);

            return routePoints.isEmpty() ? points : routePoints;
        } catch (Exception e) {
            return points;
        }
    }

    private List<GeoPoint> extractRoutePoints(Map<?, ?> response) {
        if (response == null) {
            return List.of();
        }

        Object routesObj = response.get("routes");
        if (!(routesObj instanceof List<?> routes) || routes.isEmpty()) {
            return List.of();
        }

        Object firstRouteObj = routes.get(0);
        if (!(firstRouteObj instanceof Map<?, ?> firstRoute)) {
            return List.of();
        }

        Object geometryObj = firstRoute.get("geometry");
        if (!(geometryObj instanceof Map<?, ?> geometry)) {
            return List.of();
        }

        Object coordinatesObj = geometry.get("coordinates");
        if (!(coordinatesObj instanceof List<?> coordinates)) {
            return List.of();
        }

        List<GeoPoint> result = new ArrayList<>();
        for (Object coordinateObj : coordinates) {
            if (!(coordinateObj instanceof List<?> pair) || pair.size() < 2) {
                continue;
            }

            try {
                double lng = Double.parseDouble(String.valueOf(pair.get(0)));
                double lat = Double.parseDouble(String.valueOf(pair.get(1)));
                result.add(new GeoPoint(lat, lng));
            } catch (Exception ignored) {
            }
        }

        return result;
    }
}
