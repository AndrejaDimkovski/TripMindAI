package travelmindai.com.mk.hotelsservice.config;

import com.amadeus.Amadeus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AmadeusConfig {


    private static final String CLIENT_ID = "rTbo2uPFlZ6mbsgkGkvbhCDGGDRJmjpW";
    private static final String CLIENT_SECRET = "GOFFfyLNm2CVe9vG";
    private static final String HOSTNAME = "test"; // "test" или "production"

    @Bean
    public Amadeus amadeus() {
        return Amadeus.builder(CLIENT_ID, CLIENT_SECRET)
                .setHostname(HOSTNAME)
                .build();
    }
}
