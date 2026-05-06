package tripmindai.com.mk.maintripservice.service.storage;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class ObjectStorageService {

    private static final String DEFAULT_EXTENSION = ".jpg";

    private final MinioClient minioClient;
    private final String bucket;
    private final String publicUrl;
    private final AtomicBoolean bucketReady = new AtomicBoolean(false);

    public ObjectStorageService(
            @Value("${minio.endpoint}") String endpoint,
            @Value("${minio.access-key}") String accessKey,
            @Value("${minio.secret-key}") String secretKey,
            @Value("${minio.bucket}") String bucket,
            @Value("${minio.public-url}") String publicUrl
    ) {
        this.minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        this.bucket = bucket;
        this.publicUrl = trimTrailingSlash(publicUrl);
    }

    public String uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        validateImage(file);
        ensureBucketReady();

        String objectName = normalizeFolder(folder) + "/" + UUID.randomUUID() + extractExtension(file.getOriginalFilename());

        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(contentType(file))
                    .build());

            return publicUrl + "/" + bucket + "/" + objectName;
        } catch (Exception e) {
            throw new RuntimeException("Cannot upload image to object storage", e);
        }
    }

    private void ensureBucketReady() {
        if (bucketReady.get()) {
            return;
        }

        synchronized (bucketReady) {
            if (bucketReady.get()) {
                return;
            }

            try {
                boolean exists = minioClient.bucketExists(BucketExistsArgs.builder()
                        .bucket(bucket)
                        .build());

                if (!exists) {
                    minioClient.makeBucket(MakeBucketArgs.builder()
                            .bucket(bucket)
                            .build());
                }

                minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                        .bucket(bucket)
                        .config(publicReadPolicy(bucket))
                        .build());

                bucketReady.set(true);
            } catch (Exception e) {
                throw new RuntimeException("Cannot prepare object storage bucket", e);
            }
        }
    }

    private void validateImage(MultipartFile file) {
        String type = contentType(file).toLowerCase(Locale.ROOT);
        if (!type.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files can be uploaded.");
        }
    }

    private String contentType(MultipartFile file) {
        String type = file.getContentType();
        return type == null || type.isBlank() ? "application/octet-stream" : type;
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return DEFAULT_EXTENSION;
        }

        int dotIndex = originalFilename.lastIndexOf('.');
        return dotIndex >= 0 ? originalFilename.substring(dotIndex).toLowerCase(Locale.ROOT) : DEFAULT_EXTENSION;
    }

    private String normalizeFolder(String folder) {
        return String.valueOf(folder == null ? "images" : folder)
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9/_-]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private String trimTrailingSlash(String value) {
        String normalized = String.valueOf(value == null ? "" : value).trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String publicReadPolicy(String bucketName) {
        return """
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": {"AWS": ["*"]},
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::%s/*"]
                    }
                  ]
                }
                """.formatted(bucketName);
    }
}
