package tripmindai.com.mk.maintravelservice.dto.country;

public record CountryDto(
        Long id,
        String code,
        String name,
        String currencyCode,
        String imageUrl
) {}