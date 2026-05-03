package tripmindai.com.mk.maintripservice.service.geo;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tripmindai.com.mk.maintripservice.dto.country.CountryDto;
import tripmindai.com.mk.maintripservice.dto.country.CountryWithDestinationsDto;
import tripmindai.com.mk.maintripservice.dto.country.DestinationDto;
import tripmindai.com.mk.maintripservice.model.Destination;
import tripmindai.com.mk.maintripservice.repository.CountryRepository;
import tripmindai.com.mk.maintripservice.repository.DestinationRepository;

import java.util.List;

@Service
public class GeoService {

    private static final String DEFAULT_COUNTRY_IMAGE = "/images/countries/default-country.jpg";
    private static final String DEFAULT_DESTINATION_IMAGE = "/images/destinations/default-destination.jpg";
    private static final String DEFAULT_CURRENCY = "EUR";

    private final CountryRepository countryRepo;
    private final DestinationRepository destRepo;

    public GeoService(CountryRepository countryRepo, DestinationRepository destRepo) {
        this.countryRepo = countryRepo;
        this.destRepo = destRepo;
    }

    public List<CountryDto> getCountries() {
        return countryRepo.findAll().stream()
                .map(country -> new CountryDto(
                        country.getId(),
                        country.getCode(),
                        country.getName(),
                        safeCurrency(country.getCurrencyCode()),
                        safeCountryImage(country.getImageUrl())
                ))
                .toList();
    }

    public List<DestinationDto> getDestinationsByCountry(String code) {
        return destRepo.findByCountry_CodeIgnoreCaseOrderByNameAsc(code).stream()
                .map(this::toDestinationDto)
                .toList();
    }

    public DestinationDto getDestinationByCityCode(String cityCode) {
        Destination destination = destRepo.findByCityCodeIgnoreCase(cityCode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Destination not found: " + cityCode
                ));

        return toDestinationDto(destination);
    }

    @Transactional(readOnly = true)
    public List<CountryWithDestinationsDto> getCountriesWithDestinations() {
        return countryRepo.findAllWithDestinations().stream()
                .map(country -> new CountryWithDestinationsDto(
                        country.getId(),
                        country.getCode(),
                        country.getName(),
                        safeCurrency(country.getCurrencyCode()),
                        safeCountryImage(country.getImageUrl()),
                        country.getDestinations().stream()
                                .map(destination -> new DestinationDto(
                                        destination.getId(),
                                        country.getCode(),
                                        destination.getCityCode(),
                                        destination.getName(),
                                        destination.getLatitude(),
                                        destination.getLongitude(),
                                        destination.getDescription(),
                                        safeDestinationImage(destination.getImageUrl())
                                ))
                                .toList()
                ))
                .toList();
    }

    private DestinationDto toDestinationDto(Destination destination) {
        return new DestinationDto(
                destination.getId(),
                destination.getCountry().getCode(),
                destination.getCityCode(),
                destination.getName(),
                destination.getLatitude(),
                destination.getLongitude(),
                destination.getDescription(),
                safeDestinationImage(destination.getImageUrl())
        );
    }

    private String safeCountryImage(String imageUrl) {
        return isBlank(imageUrl) ? DEFAULT_COUNTRY_IMAGE : imageUrl;
    }

    private String safeDestinationImage(String imageUrl) {
        return isBlank(imageUrl) ? DEFAULT_DESTINATION_IMAGE : imageUrl;
    }

    private String safeCurrency(String currencyCode) {
        return isBlank(currencyCode) ? DEFAULT_CURRENCY : currencyCode.trim().toUpperCase();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
