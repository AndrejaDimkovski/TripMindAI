package tripmindai.com.mk.maintravelservice.web.admin;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tripmindai.com.mk.maintravelservice.model.Country;
import tripmindai.com.mk.maintravelservice.model.Destination;
import tripmindai.com.mk.maintravelservice.service.admin.AdminGeoService;

@RestController
@RequestMapping("/api/admin/geo")
public class AdminGeoController {

    private final AdminGeoService service;

    public AdminGeoController(AdminGeoService service) {
        this.service = service;
    }

    @PostMapping("/countries")
    public Country createCountry(
            @RequestParam String code,
            @RequestParam String name,
            @RequestParam(required = false) MultipartFile image
    ) {
        return service.createCountry(code, name, image);
    }

    @PutMapping("/countries/{id}")
    public Country updateCountry(
            @PathVariable Long id,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) MultipartFile image
    ) {
        return service.updateCountry(id, code, name, image);
    }

    @DeleteMapping("/countries/{id}")
    public void deleteCountry(@PathVariable Long id) {
        service.deleteCountry(id);
    }

    @PostMapping("/destinations")
    public Destination createDestination(
            @RequestParam String countryCode,
            @RequestParam String cityCode,
            @RequestParam String name,
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) MultipartFile image
    ) {
        return service.createDestination(countryCode, cityCode, name, latitude, longitude, description, image);
    }

    @PutMapping("/destinations/{id}")
    public Destination updateDestination(
            @PathVariable Long id,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) MultipartFile image
    ) {
        return service.updateDestination(id, name, latitude, longitude, description, image);
    }

    @DeleteMapping("/destinations/{id}")
    public void deleteDestination(@PathVariable Long id) {
        service.deleteDestination(id);
    }
}
