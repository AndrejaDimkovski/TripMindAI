package tripmindai.com.mk.maintripservice.service.trip;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tripmindai.com.mk.maintripservice.dto.trip.SaveTripPlanRequest;
import tripmindai.com.mk.maintripservice.dto.trip.TripPlanDto;
import tripmindai.com.mk.maintripservice.model.TripPlan;
import tripmindai.com.mk.maintripservice.repository.TripPlanRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class TripPlanService {

    private final TripPlanRepository tripPlanRepository;

    public TripPlanService(TripPlanRepository tripPlanRepository) {
        this.tripPlanRepository = tripPlanRepository;
    }

    public TripPlanDto savePlan(SaveTripPlanRequest req, Authentication authentication) {
        String username = extractUsername(authentication);

        TripPlan plan = new TripPlan();
        plan.setUsername(username);
        plan.setTripMode(req.tripMode() == null || req.tripMode().isBlank() ? "FLIGHT_HOTEL" : req.tripMode());

        plan.setOrigin(req.origin());
        plan.setDestinationCityCode(req.destinationCityCode());
        plan.setDestinationName(req.destinationName());
        plan.setCountryName(req.countryName());
        plan.setFromDate(LocalDate.parse(req.fromDate()));
        plan.setToDate(LocalDate.parse(req.toDate()));
        plan.setAdults(req.adults());

        plan.setHotelId(req.hotelId());
        plan.setHotelName(req.hotelName());
        plan.setHotelPrice(toBigDecimal(req.hotelPrice()));
        plan.setHotelCurrency(defaultCurrency(req.hotelCurrency()));
        plan.setHotelCheckInDate(parseLocalDate(req.hotelCheckInDate()));
        plan.setHotelCheckOutDate(parseLocalDate(req.hotelCheckOutDate()));
        plan.setBoardType(req.boardType());
        plan.setPaymentPolicy(req.paymentPolicy());
        plan.setRoomQuantity(req.roomQuantity());

        plan.setFlightAirlineCode(req.flightAirlineCode());
        plan.setFlightAirlineName(req.flightAirlineName());
        plan.setFlightOriginIata(req.flightOriginIata());
        plan.setFlightOriginCity(req.flightOriginCity());
        plan.setFlightDestIata(req.flightDestIata());
        plan.setFlightDestinationCity(req.flightDestinationCity());
        plan.setFlightDepartureAt(req.flightDepartureAt());
        plan.setFlightArrivalAt(req.flightArrivalAt());
        plan.setReturnFlightDepartureAt(req.returnFlightDepartureAt());
        plan.setReturnFlightArrivalAt(req.returnFlightArrivalAt());
        plan.setFlightStops(req.flightStops());
        plan.setFlightTripType(req.flightTripType());
        plan.setFlightPrice(toBigDecimal(req.flightPrice()));
        plan.setFlightCurrency(defaultCurrency(req.flightCurrency()));

        plan.setTotalPrice(toBigDecimal(req.totalPrice()));
        plan.setTotalCurrency(defaultCurrency(req.totalCurrency()));

        return toDto(tripPlanRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public List<TripPlanDto> getMyPlans(Authentication authentication) {
        String username = extractUsername(authentication);

        return tripPlanRepository.findByUsernameOrderByCreatedAtDesc(username)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public void deleteMyPlan(Long id, Authentication authentication) {
        String username = extractUsername(authentication);

        TripPlan plan = tripPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan not found."));

        if (!plan.getUsername().equals(username)) {
            throw new RuntimeException("You cannot delete another user's plan.");
        }

        tripPlanRepository.delete(plan);
    }

    private String extractUsername(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("User is not authenticated.");
        }
        return authentication.getName();
    }

    private TripPlanDto toDto(TripPlan plan) {
        return new TripPlanDto(
                plan.getId(),
                plan.getUsername(),
                plan.getTripMode(),
                plan.getOrigin(),
                plan.getDestinationCityCode(),
                plan.getDestinationName(),
                plan.getCountryName(),
                plan.getFromDate(),
                plan.getToDate(),
                plan.getAdults(),
                plan.getHotelId(),
                plan.getHotelName(),
                toDouble(plan.getHotelPrice()),
                plan.getHotelCurrency(),
                plan.getHotelCheckInDate(),
                plan.getHotelCheckOutDate(),
                plan.getBoardType(),
                plan.getPaymentPolicy(),
                plan.getRoomQuantity(),
                plan.getFlightAirlineCode(),
                plan.getFlightAirlineName(),
                plan.getFlightOriginIata(),
                plan.getFlightOriginCity(),
                plan.getFlightDestIata(),
                plan.getFlightDestinationCity(),
                plan.getFlightDepartureAt(),
                plan.getFlightArrivalAt(),
                plan.getReturnFlightDepartureAt(),
                plan.getReturnFlightArrivalAt(),
                plan.getFlightStops(),
                plan.getFlightTripType(),
                toDouble(plan.getFlightPrice()),
                plan.getFlightCurrency(),
                toDouble(plan.getTotalPrice()),
                plan.getTotalCurrency(),
                plan.getCreatedAt()
        );
    }

    private LocalDate parseLocalDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalDate.parse(value);
    }

    private BigDecimal toBigDecimal(Double value) {
        return BigDecimal.valueOf(value == null ? 0.0 : value);
    }

    private double toDouble(BigDecimal value) {
        return value != null ? value.doubleValue() : 0.0;
    }

    private String defaultCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return "EUR";
        }
        return currency.trim().toUpperCase(Locale.ROOT);
    }
}
