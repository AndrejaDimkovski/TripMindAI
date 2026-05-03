package tripmindai.com.mk.maintripservice.service.AI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class AzureOpenAiClient {

    private static final Logger log = LoggerFactory.getLogger(AzureOpenAiClient.class);

    private final RestTemplate restTemplate;

    @Value("${azure.openai.endpoint}")
    private String endpoint;

    @Value("${azure.openai.api-key}")
    private String apiKey;

    @Value("${azure.openai.deployment:gpt-4.1}")
    private String deployment;

    @Value("${azure.openai.api-version:2025-01-01-preview}")
    private String apiVersion;

    public AzureOpenAiClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String chatJson(String systemPrompt, String userPrompt) {
        String cleanEndpoint = safe(endpoint);
        String cleanDeployment = safe(deployment);
        String cleanApiVersion = safe(apiVersion);
        String cleanApiKey = safe(apiKey);

        validateConfiguration(cleanEndpoint, cleanDeployment, cleanApiVersion, cleanApiKey);

        if (cleanEndpoint.endsWith("/")) {
            cleanEndpoint = cleanEndpoint.substring(0, cleanEndpoint.length() - 1);
        }

        String url = cleanEndpoint
                + "/openai/deployments/" + cleanDeployment
                + "/chat/completions?api-version=" + cleanApiVersion;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("temperature", 0.2);
        body.put("max_tokens", 2500);
        body.put("response_format", Map.of("type", "json_object"));

        String system = safe(systemPrompt) + "\nReturn ONLY valid JSON.";

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", system));
        messages.add(Map.of("role", "user", "content", safe(userPrompt)));
        body.put("messages", messages);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", cleanApiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("Azure OpenAI returned non-2xx status: " + response.getStatusCode());
            }

            Map<?, ?> responseBody = response.getBody();
            if (responseBody == null) {
                throw new IllegalStateException("Azure OpenAI response body is null.");
            }

            Object choicesObj = responseBody.get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
                throw new IllegalStateException("Azure OpenAI choices are missing or empty.");
            }

            Object firstChoice = choices.get(0);
            if (!(firstChoice instanceof Map<?, ?> firstMap)) {
                throw new IllegalStateException("Azure OpenAI first choice is invalid.");
            }

            String finishReason = firstMap.get("finish_reason") == null
                    ? null
                    : String.valueOf(firstMap.get("finish_reason")).trim();

            if (finishReason != null && !"stop".equalsIgnoreCase(finishReason)) {
                log.warn("Azure OpenAI completion did not finish cleanly. finish_reason={}", finishReason);
                return null;
            }

            Object messageObj = firstMap.get("message");
            if (!(messageObj instanceof Map<?, ?> messageMap)) {
                throw new IllegalStateException("Azure OpenAI message is missing.");
            }

            Object contentObj = messageMap.get("content");
            if (contentObj == null) {
                throw new IllegalStateException("Azure OpenAI content is null.");
            }

            String content = String.valueOf(contentObj).trim();
            if (content.isBlank()) {
                log.warn("Azure OpenAI content is blank.");
                return null;
            }

            return content;

        } catch (HttpStatusCodeException e) {
            log.error("Azure OpenAI HTTP error: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new IllegalStateException("Azure OpenAI HTTP error: " + e.getStatusCode(), e);
        } catch (ResourceAccessException e) {
            log.error("Azure OpenAI timeout/access error: {}", e.getMessage(), e);
            throw new IllegalStateException("Azure OpenAI access/timeout error.", e);
        } catch (RestClientException e) {
            log.error("Azure OpenAI REST client error: {}", e.getMessage(), e);
            throw new IllegalStateException("Azure OpenAI REST client error.", e);
        }
    }

    private void validateConfiguration(
            String cleanEndpoint,
            String cleanDeployment,
            String cleanApiVersion,
            String cleanApiKey
    ) {
        if (cleanEndpoint.isBlank()) {
            throw new IllegalStateException("Missing Azure OpenAI endpoint configuration.");
        }
        if (cleanDeployment.isBlank()) {
            throw new IllegalStateException("Missing Azure OpenAI deployment configuration.");
        }
        if (cleanApiVersion.isBlank()) {
            throw new IllegalStateException("Missing Azure OpenAI api-version configuration.");
        }
        if (cleanApiKey.isBlank()) {
            throw new IllegalStateException("Missing Azure OpenAI api-key configuration.");
        }
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
