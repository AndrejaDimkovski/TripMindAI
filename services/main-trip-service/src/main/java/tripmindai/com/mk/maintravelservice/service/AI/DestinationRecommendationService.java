package tripmindai.com.mk.maintravelservice.service.AI;

import org.springframework.stereotype.Service;
import tripmindai.com.mk.maintravelservice.dto.AI.AiTripInterpretation;
import tripmindai.com.mk.maintravelservice.dto.AI.RecommendedDestinationDto;
import tripmindai.com.mk.maintravelservice.model.Destination;
import tripmindai.com.mk.maintravelservice.repository.DestinationRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class DestinationRecommendationService {

    private final DestinationRepository destinationRepository;

    public DestinationRecommendationService(DestinationRepository destinationRepository) {
        this.destinationRepository = destinationRepository;
    }

    public List<RecommendedDestinationDto> recommend(AiTripInterpretation interpretation) {
        List<RecommendedDestinationDto> result = new ArrayList<>();

        if (interpretation == null || interpretation.destinationCodes() == null) {
            return result;
        }

        for (String code : interpretation.destinationCodes()) {
            if (code == null || code.isBlank()) {
                continue;
            }

            Destination destination = destinationRepository
                    .findByCityCodeIgnoreCase(code.trim().toUpperCase(Locale.ROOT))
                    .orElse(null);

            if (destination == null) {
                continue;
            }

            result.add(toDto(destination));
        }

        return result;
    }

    private RecommendedDestinationDto toDto(Destination destination) {
        return new RecommendedDestinationDto(
                destination.getId(),
                destination.getCountry() != null ? destination.getCountry().getCode() : null,
                destination.getCountry() != null ? destination.getCountry().getName() : null,
                destination.getCityCode(),
                destination.getName(),
                destination.getLatitude(),
                destination.getLongitude(),
                destination.getDescription(),
                destination.getImageUrl()
        );
    }
}
