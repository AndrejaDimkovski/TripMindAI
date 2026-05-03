package tripmindai.com.mk.maintripservice.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Objects;

@Entity
@Table(
        name = "destinations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_destination_citycode", columnNames = "cityCode")
        },
        indexes = {
                @Index(name = "idx_dest_country", columnList = "country_id"),
                @Index(name = "idx_dest_citycode", columnList = "cityCode"),
                @Index(name = "idx_dest_name", columnList = "name")
        }
)
public class Destination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 5)
    @Column(nullable = false, length = 5, updatable = false)
    private String cityCode;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @JsonIgnore
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "country_id", nullable = false)
    private Country country;

    public Destination() {}

    public Destination(String cityCode, String name, Double latitude, Double longitude, Country country) {
        this.cityCode = cityCode != null ? cityCode.toUpperCase() : null;
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.country = country;
    }

    @PrePersist
    @PreUpdate
    public void normalize() {
        if (cityCode != null) cityCode = cityCode.trim().toUpperCase();
        if (name != null) name = name.trim();
        if (description != null) description = description.trim();
    }

    public Long getId() { return id; }

    public String getCityCode() { return cityCode; }
    public void setCityCode(String cityCode) {
        this.cityCode = cityCode != null ? cityCode.trim().toUpperCase() : null;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Country getCountry() { return country; }
    public void setCountry(Country country) { this.country = country; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Destination that)) return false;
        return Objects.equals(cityCode, that.cityCode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(cityCode);
    }

    @Override
    public String toString() {
        return "Destination{" +
                "id=" + id +
                ", cityCode='" + cityCode + '\'' +
                ", name='" + name + '\'' +
                '}';
    }
}