package travelmindai.com.mk.flightsservice.config;

import com.amadeus.Amadeus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AmadeusConfig {


    private static final String CLIENT_ID = "rTbo2uPFlZ6mbsgkGkvbhCDGGDRJmjpW";
    private static final String CLIENT_SECRET = "GOFFfyLNm2CVe9vG";

    @Bean
    public Amadeus amadeus() {
        return Amadeus
                .builder(CLIENT_ID, CLIENT_SECRET)
                .build();
    }
}
