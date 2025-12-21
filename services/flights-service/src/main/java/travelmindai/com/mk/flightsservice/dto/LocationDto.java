package travelmindai.com.mk.flightsservice.dto;

public record LocationDto(
        String name,
        String iataCode,
        String cityName,
        String countryCode,
        String subtype
) {}
