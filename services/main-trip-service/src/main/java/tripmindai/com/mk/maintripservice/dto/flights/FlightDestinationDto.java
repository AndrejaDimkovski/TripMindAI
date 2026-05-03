package tripmindai.com.mk.maintripservice.dto.flights;

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