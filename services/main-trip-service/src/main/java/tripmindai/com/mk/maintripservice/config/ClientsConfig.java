package tripmindai.com.mk.maintripservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class ClientsConfig {

    @Bean
    public RestClient flightsRestClient() {
        return RestClient.builder()
                .baseUrl("http://localhost:8081")
                .build();
    }

    @Bean
    public RestClient hotelsRestClient() {
        return RestClient.builder()
                .baseUrl("http://localhost:8082")
                .build();
    }
}

