package tripmindai.com.mk.maintripservice.dto.admin;

import java.util.List;

public record AdminAnalyticsSummaryDto(
        long totalUsers,
        long registeredUsers,
        long verifiedUsers,
        long adminUsers,
        long twoFactorUsers,
        long totalPlans,
        long usersWithPlans,
        long flightHotelPlans,
        long hotelOnlyPlans,
        long countries,
        long destinations,
        double averagePlansPerUser,
        AdminMetricItemDto popularDestination,
        AdminMetricItemDto popularCountry,
        List<AdminMetricItemDto> topDestinations,
        List<AdminMetricItemDto> topCountries
) {}
