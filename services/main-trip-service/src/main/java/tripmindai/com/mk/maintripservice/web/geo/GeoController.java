package tripmindai.com.mk.maintripservice.web.geo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tripmindai.com.mk.maintripservice.dto.country.CountryDto;
import tripmindai.com.mk.maintripservice.dto.country.CountryWithDestinationsDto;
import tripmindai.com.mk.maintripservice.dto.country.DestinationDto;
import tripmindai.com.mk.maintripservice.service.geo.GeoService;

import java.util.List;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private final GeoService geoService;

    public GeoController(GeoService geoService) {
        this.geoService = geoService;
    }

    @GetMapping("/countries")
    public List<CountryWithDestinationsDto> countries() {
        return geoService.getCountriesWithDestinations();
    }

    @GetMapping("/countries/simple")
    public List<CountryDto> countriesSimple() {
        return geoService.getCountries();
    }

    @GetMapping("/countries/{code}/destinations")
    public List<DestinationDto> destinations(@PathVariable String code) {
        return geoService.getDestinationsByCountry(code);
    }

    @GetMapping("/destinations/{cityCode}")
    public DestinationDto destinationByCityCode(@PathVariable String cityCode) {
        return geoService.getDestinationByCityCode(cityCode);
    }
}
