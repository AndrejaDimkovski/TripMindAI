package travelmindai.com.mk.hotelsservice.service;

import com.amadeus.Amadeus;
import com.amadeus.Params;
import com.amadeus.exceptions.ClientException;
import com.amadeus.exceptions.ResponseException;
import com.amadeus.resources.Hotel;
import com.amadeus.resources.HotelOfferSearch;
import org.springframework.stereotype.Service;
import travelmindai.com.mk.hotelsservice.dto.HotelDto;
import travelmindai.com.mk.hotelsservice.dto.HotelOfferDto;

import java.util.ArrayList;
import java.util.List;

@Service
public class HotelsSearchService {

    private final Amadeus amadeus;

    public HotelsSearchService(Amadeus amadeus) {
        this.amadeus = amadeus;
    }

    // ✅ Hotels by city (НЕ СМЕЕ да враќа 500 кон твој сервис)
    public List<HotelDto> hotelsByCity(String cityCode, int limit) {
        if (cityCode == null || cityCode.isBlank()) return List.of();

        try {
            Hotel[] hotels = amadeus.referenceData.locations.hotels.byCity.get(
                    Params.with("cityCode", cityCode.trim())
            );

            if (hotels == null || hotels.length == 0) return List.of();

            List<HotelDto> out = new ArrayList<>();
            int count = 0;

            for (Hotel h : hotels) {
                if (count >= limit) break;

                String hotelId = safe(() -> h.getHotelId(), null);
                String name = safe(() -> h.getName(), null);

                Double lat = null;
                Double lon = null;

                try {
                    if (h.getGeoCode() != null) {
                        lat = (double) h.getGeoCode().getLatitude();
                        lon = (double) h.getGeoCode().getLongitude();
                    }
                } catch (Exception ignored) {}

                if (hotelId == null || hotelId.isBlank()) continue;

                out.add(new HotelDto(hotelId, name, cityCode.trim(), lat, lon));
                count++;
            }

            return out;

        } catch (ResponseException e) {
            // ✅ фаќа и ClientException бидејќи е subclass
            return List.of();
        } catch (Exception e) {
            return List.of();
        }
    }


    /**
     * 2) Hotel offers search
     * - Прво batch со сите
     * - Ако падне, 1 по 1
     * - Никогаш не фрла 500 (за демо)
     */
    public List<HotelOfferDto> offers(String hotelIdsCsv, String checkIn, String checkOut, int adults) {
        if (hotelIdsCsv == null || hotelIdsCsv.isBlank()) return List.of();

        // 1) batch
        try {
            List<HotelOfferDto> batch = offersRaw(hotelIdsCsv, checkIn, checkOut, adults);
            if (batch != null && !batch.isEmpty()) return batch;
        } catch (Exception ignored) {}

        // 2) fallback one-by-one
        String[] ids = hotelIdsCsv.split(",");
        for (String raw : ids) {
            String id = raw.trim();
            if (id.isBlank()) continue;

            try {
                List<HotelOfferDto> one = offersRaw(id, checkIn, checkOut, adults);
                if (one != null && !one.isEmpty()) return one;
            } catch (Exception ignored) {}
        }

        return List.of();
    }

    private List<HotelOfferDto> offersRaw(String hotelIdsCsv, String checkIn, String checkOut, int adults)
            throws ResponseException {

        HotelOfferSearch[] offers = amadeus.shopping.hotelOffersSearch.get(
                Params.with("hotelIds", hotelIdsCsv)
                        .and("adults", adults)
                        .and("checkInDate", checkIn)
                        .and("checkOutDate", checkOut)
                        .and("roomQuantity", 1)
                        .and("paymentPolicy", "NONE")
                        .and("bestRateOnly", true)
        );

        return mapHotelOffers(offers, checkIn, checkOut);
    }

    private List<HotelOfferDto> mapHotelOffers(HotelOfferSearch[] offers, String checkIn, String checkOut) {
        List<HotelOfferDto> out = new ArrayList<>();
        if (offers == null) return out;

        for (HotelOfferSearch h : offers) {
            String hotelId = "N/A";
            String hotelName = "N/A";

            try {
                if (h.getHotel() != null) {
                    if (h.getHotel().getHotelId() != null) hotelId = h.getHotel().getHotelId();
                    if (h.getHotel().getName() != null) hotelName = h.getHotel().getName();
                }
            } catch (Exception ignored) {}

            try {
                if (h.getOffers() != null && h.getOffers().length > 0 && h.getOffers()[0].getPrice() != null) {
                    String currency = h.getOffers()[0].getPrice().getCurrency();
                    String totalStr = h.getOffers()[0].getPrice().getTotal();

                    double total = parseDoubleSafe(totalStr);

                    out.add(new HotelOfferDto(
                            hotelId,
                            hotelName,
                            checkIn,
                            checkOut,
                            total,      // ✅ double
                            currency
                    ));
                }
            } catch (Exception ignored) {}
        }

        return out;
    }

    private double parseDoubleSafe(String s) {
        if (s == null) return 0.0;
        try {
            // ако има запирки/space, исчисти
            String cleaned = s.trim().replace(",", "");
            return Double.parseDouble(cleaned);
        } catch (Exception e) {
            return 0.0;
        }
    }



    private static <T> T safe(SupplierX<T> s, T fallback) {
        try { return s.get(); } catch (Exception e) { return fallback; }
    }

    @FunctionalInterface
    private interface SupplierX<T> { T get() throws Exception; }
}
