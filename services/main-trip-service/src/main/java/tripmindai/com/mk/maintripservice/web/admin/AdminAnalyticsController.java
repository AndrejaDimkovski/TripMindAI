package tripmindai.com.mk.maintripservice.web.admin;

import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tripmindai.com.mk.maintripservice.dto.admin.AdminMetricItemDto;
import tripmindai.com.mk.maintripservice.dto.admin.AdminAnalyticsSummaryDto;
import tripmindai.com.mk.maintripservice.model.Role;
import tripmindai.com.mk.maintripservice.repository.CountryRepository;
import tripmindai.com.mk.maintripservice.repository.DestinationRepository;
import tripmindai.com.mk.maintripservice.repository.TripPlanRepository;
import tripmindai.com.mk.maintripservice.repository.UserRepository;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    private final UserRepository userRepository;
    private final TripPlanRepository tripPlanRepository;
    private final CountryRepository countryRepository;
    private final DestinationRepository destinationRepository;

    public AdminAnalyticsController(
            UserRepository userRepository,
            TripPlanRepository tripPlanRepository,
            CountryRepository countryRepository,
            DestinationRepository destinationRepository
    ) {
        this.userRepository = userRepository;
        this.tripPlanRepository = tripPlanRepository;
        this.countryRepository = countryRepository;
        this.destinationRepository = destinationRepository;
    }

    @GetMapping("/summary")
    public AdminAnalyticsSummaryDto summary() {
        long totalUsers = userRepository.count();
        long registeredUsers = userRepository.countByRole(Role.USER);
        long totalPlans = tripPlanRepository.count();
        double averagePlansPerUser = registeredUsers == 0
                ? 0
                : Math.round(((double) totalPlans / registeredUsers) * 100.0) / 100.0;
        var topDestinations = tripPlanRepository.findTopDestinations(PageRequest.of(0, 5));
        var topCountries = tripPlanRepository.findTopCountries(PageRequest.of(0, 5));

        return new AdminAnalyticsSummaryDto(
                totalUsers,
                registeredUsers,
                userRepository.countByRoleAndEmailVerifiedTrue(Role.USER),
                userRepository.countByRole(Role.ADMIN),
                userRepository.countByRoleAndTwoFactorEnabledTrue(Role.USER),
                totalPlans,
                tripPlanRepository.countDistinctUsernamesWithPlans(),
                tripPlanRepository.countByTripMode("FLIGHT_HOTEL"),
                tripPlanRepository.countByTripMode("HOTEL_ONLY"),
                countryRepository.count(),
                destinationRepository.count(),
                averagePlansPerUser,
                firstOrEmpty(topDestinations),
                firstOrEmpty(topCountries),
                topDestinations,
                topCountries
        );
    }

    private AdminMetricItemDto firstOrEmpty(java.util.List<AdminMetricItemDto> items) {
        return items.isEmpty() ? new AdminMetricItemDto("N/A", 0L) : items.get(0);
    }
}
