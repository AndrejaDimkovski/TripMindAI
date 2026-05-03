package tripmindai.com.mk.maintripservice.service.admin;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tripmindai.com.mk.maintripservice.model.Country;
import tripmindai.com.mk.maintripservice.model.Destination;
import tripmindai.com.mk.maintripservice.repository.CountryRepository;
import tripmindai.com.mk.maintripservice.repository.DestinationRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Transactional
public class AdminGeoService {

    private static final String DEFAULT_EXTENSION = ".jpg";

    private final CountryRepository countryRepo;
    private final DestinationRepository destRepo;
    private final Path root = Paths.get("uploads");

    public AdminGeoService(CountryRepository countryRepo, DestinationRepository destRepo) {
        this.countryRepo = countryRepo;
        this.destRepo = destRepo;
    }

    public Country createCountry(String code, String name, MultipartFile image) {
        Country country = new Country();
        country.setCode(trimToNull(code));
        country.setName(trimToNull(name));
        country.setImageUrl(saveFile(image, "countries"));
        return countryRepo.save(country);
    }

    public Country updateCountry(Long id, String code, String name, MultipartFile image) {
        Country country = countryRepo.findById(id).orElseThrow();

        if (!isBlank(code)) {
            country.setCode(code.trim());
        }
        if (!isBlank(name)) {
            country.setName(name.trim());
        }
        if (image != null && !image.isEmpty()) {
            country.setImageUrl(saveFile(image, "countries"));
        }

        return countryRepo.save(country);
    }

    public void deleteCountry(Long id) {
        countryRepo.deleteById(id);
    }

    public Destination createDestination(
            String countryCode,
            String cityCode,
            String name,
            Double latitude,
            Double longitude,
            String description,
            MultipartFile image
    ) {
        Country country = countryRepo.findByCodeIgnoreCase(countryCode).orElseThrow();

        Destination destination = new Destination();
        destination.setCountry(country);
        destination.setCityCode(trimToNull(cityCode));
        destination.setName(trimToNull(name));
        destination.setLatitude(latitude);
        destination.setLongitude(longitude);
        destination.setDescription(trimToNull(description));
        destination.setImageUrl(saveFile(image, "destinations"));

        return destRepo.save(destination);
    }

    public Destination updateDestination(
            Long id,
            String name,
            Double latitude,
            Double longitude,
            String description,
            MultipartFile image
    ) {
        Destination destination = destRepo.findById(id).orElseThrow();

        if (!isBlank(name)) {
            destination.setName(name.trim());
        }
        if (latitude != null) {
            destination.setLatitude(latitude);
        }
        if (longitude != null) {
            destination.setLongitude(longitude);
        }
        if (description != null) {
            destination.setDescription(description.trim());
        }
        if (image != null && !image.isEmpty()) {
            destination.setImageUrl(saveFile(image, "destinations"));
        }

        return destRepo.save(destination);
    }

    public void deleteDestination(Long id) {
        destRepo.deleteById(id);
    }

    private String saveFile(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        try {
            Path directory = root.resolve(folder);
            Files.createDirectories(directory);

            String fileName = UUID.randomUUID() + extractExtension(file.getOriginalFilename());
            Path target = directory.resolve(fileName);

            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + folder + "/" + fileName;
        } catch (IOException e) {
            throw new RuntimeException("Cannot save file", e);
        }
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return DEFAULT_EXTENSION;
        }

        int dotIndex = originalFilename.lastIndexOf('.');
        return dotIndex >= 0 ? originalFilename.substring(dotIndex) : DEFAULT_EXTENSION;
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
