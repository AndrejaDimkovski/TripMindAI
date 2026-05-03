package tripmindai.com.mk.maintripservice.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "trip_plans")
public class TripPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false, length = 30)
    private String tripMode = "FLIGHT_HOTEL";

    @Column(length = 100)
    private String origin;

    @Column(nullable = false, length = 10)
    private String destinationCityCode;

    @Column(nullable = false)
    private String destinationName;

    @Column(nullable = false)
    private String countryName;

    @Column(nullable = false)
    private LocalDate fromDate;

    @Column(nullable = false)
    private LocalDate toDate;

    @Column(nullable = false)
    private Integer adults;

    @Column(nullable = false)
    private String hotelId;

    @Column(nullable = false)
    private String hotelName;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal hotelPrice;

    @Column(nullable = false, length = 10)
    private String hotelCurrency;

    @Column
    private LocalDate hotelCheckInDate;

    @Column
    private LocalDate hotelCheckOutDate;

    @Column
    private String boardType;

    @Column
    private String paymentPolicy;

    @Column
    private Integer roomQuantity;

    @Column
    private String flightAirlineCode;

    @Column
    private String flightAirlineName;

    @Column(length = 10)
    private String flightOriginIata;

    @Column
    private String flightOriginCity;

    @Column(length = 10)
    private String flightDestIata;

    @Column
    private String flightDestinationCity;

    @Column
    private String flightDepartureAt;

    @Column
    private String flightArrivalAt;

    @Column
    private String returnFlightDepartureAt;

    @Column
    private String returnFlightArrivalAt;

    @Column
    private Integer flightStops;

    @Column
    private String flightTripType;

    @Column(precision = 12, scale = 2)
    private BigDecimal flightPrice;

    @Column(length = 10)
    private String flightCurrency;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Column(nullable = false, length = 10)
    private String totalCurrency;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public TripPlan() {}

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getTripMode() {
        return tripMode;
    }

    public void setTripMode(String tripMode) {
        this.tripMode = tripMode;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public String getDestinationCityCode() {
        return destinationCityCode;
    }

    public void setDestinationCityCode(String destinationCityCode) {
        this.destinationCityCode = destinationCityCode;
    }

    public String getDestinationName() {
        return destinationName;
    }

    public void setDestinationName(String destinationName) {
        this.destinationName = destinationName;
    }

    public String getCountryName() {
        return countryName;
    }

    public void setCountryName(String countryName) {
        this.countryName = countryName;
    }

    public LocalDate getFromDate() {
        return fromDate;
    }

    public void setFromDate(LocalDate fromDate) {
        this.fromDate = fromDate;
    }

    public LocalDate getToDate() {
        return toDate;
    }

    public void setToDate(LocalDate toDate) {
        this.toDate = toDate;
    }

    public Integer getAdults() {
        return adults;
    }

    public void setAdults(Integer adults) {
        this.adults = adults;
    }

    public String getHotelId() {
        return hotelId;
    }

    public void setHotelId(String hotelId) {
        this.hotelId = hotelId;
    }

    public String getHotelName() {
        return hotelName;
    }

    public void setHotelName(String hotelName) {
        this.hotelName = hotelName;
    }

    public BigDecimal getHotelPrice() {
        return hotelPrice;
    }

    public void setHotelPrice(BigDecimal hotelPrice) {
        this.hotelPrice = hotelPrice;
    }

    public String getHotelCurrency() {
        return hotelCurrency;
    }

    public void setHotelCurrency(String hotelCurrency) {
        this.hotelCurrency = hotelCurrency;
    }

    public LocalDate getHotelCheckInDate() {
        return hotelCheckInDate;
    }

    public void setHotelCheckInDate(LocalDate hotelCheckInDate) {
        this.hotelCheckInDate = hotelCheckInDate;
    }

    public LocalDate getHotelCheckOutDate() {
        return hotelCheckOutDate;
    }

    public void setHotelCheckOutDate(LocalDate hotelCheckOutDate) {
        this.hotelCheckOutDate = hotelCheckOutDate;
    }

    public String getBoardType() {
        return boardType;
    }

    public void setBoardType(String boardType) {
        this.boardType = boardType;
    }

    public String getPaymentPolicy() {
        return paymentPolicy;
    }

    public void setPaymentPolicy(String paymentPolicy) {
        this.paymentPolicy = paymentPolicy;
    }

    public Integer getRoomQuantity() {
        return roomQuantity;
    }

    public void setRoomQuantity(Integer roomQuantity) {
        this.roomQuantity = roomQuantity;
    }

    public String getFlightAirlineCode() {
        return flightAirlineCode;
    }

    public void setFlightAirlineCode(String flightAirlineCode) {
        this.flightAirlineCode = flightAirlineCode;
    }

    public String getFlightAirlineName() {
        return flightAirlineName;
    }

    public void setFlightAirlineName(String flightAirlineName) {
        this.flightAirlineName = flightAirlineName;
    }

    public String getFlightOriginIata() {
        return flightOriginIata;
    }

    public void setFlightOriginIata(String flightOriginIata) {
        this.flightOriginIata = flightOriginIata;
    }

    public String getFlightOriginCity() {
        return flightOriginCity;
    }

    public void setFlightOriginCity(String flightOriginCity) {
        this.flightOriginCity = flightOriginCity;
    }

    public String getFlightDestIata() {
        return flightDestIata;
    }

    public void setFlightDestIata(String flightDestIata) {
        this.flightDestIata = flightDestIata;
    }

    public String getFlightDestinationCity() {
        return flightDestinationCity;
    }

    public void setFlightDestinationCity(String flightDestinationCity) {
        this.flightDestinationCity = flightDestinationCity;
    }

    public String getFlightDepartureAt() {
        return flightDepartureAt;
    }

    public void setFlightDepartureAt(String flightDepartureAt) {
        this.flightDepartureAt = flightDepartureAt;
    }

    public String getFlightArrivalAt() {
        return flightArrivalAt;
    }

    public void setFlightArrivalAt(String flightArrivalAt) {
        this.flightArrivalAt = flightArrivalAt;
    }

    public String getReturnFlightDepartureAt() {
        return returnFlightDepartureAt;
    }

    public void setReturnFlightDepartureAt(String returnFlightDepartureAt) {
        this.returnFlightDepartureAt = returnFlightDepartureAt;
    }

    public String getReturnFlightArrivalAt() {
        return returnFlightArrivalAt;
    }

    public void setReturnFlightArrivalAt(String returnFlightArrivalAt) {
        this.returnFlightArrivalAt = returnFlightArrivalAt;
    }

    public Integer getFlightStops() {
        return flightStops;
    }

    public void setFlightStops(Integer flightStops) {
        this.flightStops = flightStops;
    }

    public String getFlightTripType() {
        return flightTripType;
    }

    public void setFlightTripType(String flightTripType) {
        this.flightTripType = flightTripType;
    }

    public BigDecimal getFlightPrice() {
        return flightPrice;
    }

    public void setFlightPrice(BigDecimal flightPrice) {
        this.flightPrice = flightPrice;
    }

    public String getFlightCurrency() {
        return flightCurrency;
    }

    public void setFlightCurrency(String flightCurrency) {
        this.flightCurrency = flightCurrency;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }

    public String getTotalCurrency() {
        return totalCurrency;
    }

    public void setTotalCurrency(String totalCurrency) {
        this.totalCurrency = totalCurrency;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
