package tripmindai.com.mk.maintripservice.service.trip;

import org.springframework.stereotype.Service;
import tripmindai.com.mk.maintripservice.model.Country;
import tripmindai.com.mk.maintripservice.repository.CountryRepository;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class CurrencyConversionService {

    private static final String DEFAULT_CURRENCY = "EUR";

    private static final Map<String, Double> TO_EUR_RATE = Map.of(
            "EUR", 1.0,
            "MKD", 1.0 / 61.5,
            "USD", 0.92,
            "GBP", 1.17,
            "CHF", 1.04,
            "THB", 0.0253,
            "RSD", 0.0085,
            "BGN", 0.5113,
            "TRY", 0.0285
    );

    private final CountryRepository countryRepository;

    public CurrencyConversionService(CountryRepository countryRepository) {
        this.countryRepository = countryRepository;
    }

    public String resolveCountryCurrency(String countryCode) {
        if (isBlank(countryCode)) {
            return DEFAULT_CURRENCY;
        }

        Optional<Country> country = countryRepository.findByCodeIgnoreCase(countryCode.trim());

        return country.map(Country::getCurrencyCode)
                .filter(code -> !isBlank(code))
                .map(this::normalizeCurrency)
                .orElse(DEFAULT_CURRENCY);
    }

    public String normalizeTargetCurrency(String targetCurrency) {
        String normalized = normalizeCurrency(targetCurrency);
        return switch (normalized) {
            case "EUR", "MKD" -> normalized;
            default -> DEFAULT_CURRENCY;
        };
    }

    public ConversionResult convert(
            Double amount,
            String sourceCurrency,
            String countryCode,
            String targetCurrency
    ) {
        String resolvedTarget = normalizeTargetCurrency(targetCurrency);

        if (amount == null) {
            return new ConversionResult(null, resolvedTarget);
        }

        String resolvedSource = !isBlank(sourceCurrency)
                ? normalizeCurrency(sourceCurrency)
                : resolveCountryCurrency(countryCode);

        Double amountInEur = convertToEur(amount, resolvedSource);
        if (amountInEur == null) {
            return new ConversionResult(round(amount), resolvedSource);
        }

        Double converted = convertFromEur(amountInEur, resolvedTarget);
        return new ConversionResult(round(converted), resolvedTarget);
    }

    private Double convertToEur(Double amount, String sourceCurrency) {
        Double rate = TO_EUR_RATE.get(sourceCurrency);
        return rate != null ? amount * rate : null;
    }

    private Double convertFromEur(Double eurAmount, String targetCurrency) {
        return switch (targetCurrency) {
            case "MKD" -> eurAmount * 61.5;
            case "EUR" -> eurAmount;
            default -> eurAmount;
        };
    }

    private Double round(Double value) {
        return value == null ? null : Math.round(value * 100.0) / 100.0;
    }

    private String normalizeCurrency(String currency) {
        return isBlank(currency) ? DEFAULT_CURRENCY : currency.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record ConversionResult(Double amount, String currency) {
    }
}
