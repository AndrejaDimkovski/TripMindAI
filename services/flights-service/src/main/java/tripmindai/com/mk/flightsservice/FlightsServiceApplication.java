package tripmindai.com.mk.flightsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class FlightsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(FlightsServiceApplication.class, args);
    }

}
