package travelmindai.com.mk.flightsservice.service;

import com.amadeus.Amadeus;
import com.amadeus.Params;
import com.amadeus.exceptions.ResponseException;
import com.amadeus.referenceData.Locations;
import com.amadeus.resources.Location;
import org.springframework.stereotype.Service;
import travelmindai.com.mk.flightsservice.dto.LocationDto;

import java.util.ArrayList;
import java.util.List;

@Service
public class LocationsService {

    private final Amadeus amadeus;

    public LocationsService(Amadeus amadeus) {
        this.amadeus = amadeus;
    }

    public List<LocationDto> searchAirports(String keyword) throws ResponseException {
        Location[] locations = amadeus.referenceData.locations.get(
                Params.with("keyword", keyword)
                        .and("subType", Locations.AIRPORT)
        );

        List<LocationDto> out = new ArrayList<>();
        for (Location l : locations) {
            String name = l.getName();
            String iata = l.getIataCode();
            String city = (l.getAddress() != null) ? l.getAddress().getCityName() : null;
            String country = (l.getAddress() != null) ? l.getAddress().getCountryCode() : null;
            String subtype = l.getSubType();

            out.add(new LocationDto(name, iata, city, country, subtype));
        }
        return out;
    }
}
