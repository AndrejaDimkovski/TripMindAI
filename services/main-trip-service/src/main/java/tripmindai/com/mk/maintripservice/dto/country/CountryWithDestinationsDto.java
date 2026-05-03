package tripmindai.com.mk.maintripservice.dto.country;

import java.util.List;

public record CountryWithDestinationsDto(
        Long id,
        String code,
        String name,
        String currencyCode,
        String imageUrl,
        List<DestinationDto> destinations
) {}