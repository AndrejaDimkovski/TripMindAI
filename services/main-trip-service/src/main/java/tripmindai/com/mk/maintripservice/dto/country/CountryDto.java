package tripmindai.com.mk.maintripservice.dto.country;

public record CountryDto(
        Long id,
        String code,
        String name,
        String currencyCode,
        String imageUrl
) {}