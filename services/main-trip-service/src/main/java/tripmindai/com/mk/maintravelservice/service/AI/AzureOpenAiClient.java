package tripmindai.com.mk.maintravelservice.service.AI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Component
public class AzureOpenAiClient {

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
        if (cleanEndpoint.endsWith("/")) {
            cleanEndpoint = cleanEndpoint.substring(0, cleanEndpoint.length() - 1);
        }

        String cleanDeployment = safe(deployment);
        String cleanApiVersion = safe(apiVersion);

        String url = cleanEndpoint
                + "/openai/deployments/" + cleanDeployment
                + "/chat/completions?api-version=" + cleanApiVersion;

        System.out.println("AzureOpenAiClient endpoint = " + cleanEndpoint);
        System.out.println("AzureOpenAiClient deployment = " + cleanDeployment);
        System.out.println("AzureOpenAiClient apiVersion = " + cleanApiVersion);
        System.out.println("AzureOpenAiClient apiKey present = " + (apiKey != null && !apiKey.isBlank()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("temperature", 0.2);
        body.put("max_tokens", 2500);

        String system = safe(systemPrompt) + "\nReturn ONLY valid JSON.";

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", system));
        messages.add(Map.of("role", "user", "content", safe(userPrompt)));
        body.put("messages", messages);

        body.put("response_format", Map.of("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", safe(apiKey));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> res =
                    restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);

            if (!res.getStatusCode().is2xxSuccessful()) {
                System.out.println("AzureOpenAiClient: non-2xx status = " + res.getStatusCode());
                return null;
            }

            Map<?, ?> responseBody = res.getBody();
            if (responseBody == null) {
                System.out.println("AzureOpenAiClient: response body is null");
                return null;
            }

            Object choicesObj = responseBody.get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
                System.out.println("AzureOpenAiClient: choices missing or empty");
                return null;
            }

            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> firstMap)) {
                System.out.println("AzureOpenAiClient: first choice is invalid");
                return null;
            }

            Object msgObj = firstMap.get("message");
            if (!(msgObj instanceof Map<?, ?> msgMap)) {
                System.out.println("AzureOpenAiClient: message missing");
                return null;
            }

            Object contentObj = msgMap.get("content");
            if (contentObj == null) {
                System.out.println("AzureOpenAiClient: content is null");
                return null;
            }

            String content = String.valueOf(contentObj).trim();
            if (content.isBlank()) {
                System.out.println("AzureOpenAiClient: content is blank");
                return null;
            }

            return content;

        } catch (HttpStatusCodeException e) {
            System.out.println("AzureOpenAiClient HTTP status = " + e.getStatusCode());
            System.out.println("AzureOpenAiClient response body = " + e.getResponseBodyAsString());
            return null;
        } catch (ResourceAccessException e) {
            System.out.println("AzureOpenAiClient timeout/access error: " + e.getMessage());
            return null;
        } catch (RestClientException e) {
            System.out.println("AzureOpenAiClient rest error: " + e.getMessage());
            return null;
        } catch (Exception e) {
            System.out.println("AzureOpenAiClient unexpected error: " + e.getMessage());
            return null;
        }
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
