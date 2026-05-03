package tripmindai.com.mk.maintripservice.service.AI;

import org.springframework.stereotype.Service;
import tripmindai.com.mk.maintripservice.dto.AI.AiTripInterpretation;
import tripmindai.com.mk.maintripservice.dto.AI.RecommendedDestinationDto;
import tripmindai.com.mk.maintripservice.model.Destination;
import tripmindai.com.mk.maintripservice.repository.DestinationRepository;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class DestinationRecommendationService {

    private final DestinationRepository destinationRepository;

    public DestinationRecommendationService(DestinationRepository destinationRepository) {
        this.destinationRepository = destinationRepository;
    }

    public List<RecommendedDestinationDto> recommend(AiTripInterpretation interpretation) {
        List<RecommendedDestinationDto> result = new ArrayList<>();

        if (interpretation == null) {
            return result;
        }

        boolean unsupportedRequestedPlace =
                interpretation.destinationCodes() != null
                        && interpretation.destinationCodes().isEmpty()
                        && (
                        (interpretation.extractedCountry() != null && !interpretation.extractedCountry().isBlank())
                                || (interpretation.extractedDestinationText() != null && !interpretation.extractedDestinationText().isBlank())
                                || (interpretation.candidateCountries() != null && !interpretation.candidateCountries().isEmpty())
                                || (interpretation.candidateDestinations() != null && !interpretation.candidateDestinations().isEmpty())
                );

        if (unsupportedRequestedPlace) {
            return List.of();
        }

        Set<String> addedCodes = new LinkedHashSet<>();

        addFromCodes(result, addedCodes, interpretation.destinationCodes());

        if (result.isEmpty()) {
            addFromCandidateDestinations(result, addedCodes, interpretation.candidateDestinations());
        }

        if (result.isEmpty() && interpretation.extractedDestinationText() != null && !interpretation.extractedDestinationText().isBlank()) {
            addFromSingleDestinationText(result, addedCodes, interpretation.extractedDestinationText());
        }

        if (result.isEmpty()) {
            addFromCandidateCountries(result, addedCodes, interpretation.candidateCountries());
        }

        if (result.isEmpty() && interpretation.extractedCountry() != null && !interpretation.extractedCountry().isBlank()) {
            addFromCandidateCountries(result, addedCodes, List.of(interpretation.extractedCountry()));
        }

        if (result.isEmpty()) {
            for (Destination destination : destinationRepository.findTop5ByOrderByNameAsc()) {
                addDestination(result, addedCodes, destination);
            }
        }

        return result.stream()
                .limit(TravelPromptMappings.MAX_RESULTS)
                .toList();
    }

    private void addFromCodes(List<RecommendedDestinationDto> result, Set<String> addedCodes, List<String> codes) {
        if (codes == null) {
            return;
        }

        for (String code : codes) {
            if (code == null || code.isBlank()) {
                continue;
            }

            String normalizedCode = code.trim().toUpperCase(Locale.ROOT);
            if (!addedCodes.add(normalizedCode)) {
                continue;
            }

            destinationRepository.findByCityCodeIgnoreCase(normalizedCode)
                    .ifPresent(destination -> result.add(toDto(destination)));
        }
    }

    private void addFromCandidateDestinations(
            List<RecommendedDestinationDto> result,
            Set<String> addedCodes,
            List<String> candidateDestinations
    ) {
        if (candidateDestinations == null) {
            return;
        }

        for (String candidate : candidateDestinations) {
            if (candidate == null || candidate.isBlank()) {
                continue;
            }

            destinationRepository.findByNameIgnoreCase(candidate.trim())
                    .ifPresentOrElse(
                            destination -> addDestination(result, addedCodes, destination),
                            () -> {
                                for (Destination destination : destinationRepository.findTop5ByNameContainingIgnoreCaseOrderByNameAsc(candidate.trim())) {
                                    addDestination(result, addedCodes, destination);
                                }
                            }
                    );
        }
    }

    private void addFromSingleDestinationText(
            List<RecommendedDestinationDto> result,
            Set<String> addedCodes,
            String destinationText
    ) {
        destinationRepository.findByNameIgnoreCase(destinationText.trim())
                .ifPresentOrElse(
                        destination -> addDestination(result, addedCodes, destination),
                        () -> {
                            for (Destination destination : destinationRepository.findTop5ByNameContainingIgnoreCaseOrderByNameAsc(destinationText.trim())) {
                                addDestination(result, addedCodes, destination);
                            }
                        }
                );
    }

    private void addFromCandidateCountries(
            List<RecommendedDestinationDto> result,
            Set<String> addedCodes,
            List<String> candidateCountries
    ) {
        if (candidateCountries == null) {
            return;
        }

        for (String candidateCountry : candidateCountries) {
            if (candidateCountry == null || candidateCountry.isBlank()) {
                continue;
            }

            for (Destination destination : destinationRepository.findByCountry_NameIgnoreCaseOrderByNameAsc(candidateCountry.trim())) {
                addDestination(result, addedCodes, destination);
            }
        }
    }

    private void addDestination(
            List<RecommendedDestinationDto> result,
            Set<String> addedCodes,
            Destination destination
    ) {
        if (destination == null || destination.getCityCode() == null) {
            return;
        }

        String code = destination.getCityCode().trim().toUpperCase(Locale.ROOT);
        if (addedCodes.add(code)) {
            result.add(toDto(destination));
        }
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
