package tripmindai.com.mk.flightsservice.dto;

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