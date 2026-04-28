package tripmindai.com.mk.hotelsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class HotelsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotelsServiceApplication.class, args);
    }

}
