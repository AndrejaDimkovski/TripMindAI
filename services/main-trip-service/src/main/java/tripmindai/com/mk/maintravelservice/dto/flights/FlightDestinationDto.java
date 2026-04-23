package tripmindai.com.mk.maintravelservice.dto.flights;

public record FlightDestinationDto(
        String id,
        String type,
        String name,
        String code,
        String city,
        String cityName,
        String country,
        String countryName,
        String parent
) {}