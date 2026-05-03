package tripmindai.com.mk.maintripservice.web.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

import java.util.*;

@Component
public class AiTravelController {

    private final RestTemplate restTemplate;
    private final String endpoint;
    private final String apiKey;
    private final String deployment;
    private final String apiVersion;

    public AiTravelController(
            RestTemplate restTemplate,
            @Value("${azure.openai.endpoint}") String endpoint,
            @Value("${azure.openai.api-key}") String apiKey,
            @Value("${azure.openai.deployment}") String deployment,
            @Value("${azure.openai.api-version}") String apiVersion
    ) {
        this.restTemplate = restTemplate;
        this.endpoint = normalizeEndpoint(endpoint);
        this.apiKey = apiKey;
        this.deployment = deployment;
        this.apiVersion = apiVersion;
    }

    private String normalizeEndpoint(String ep) {
        if (ep == null) return "";
        String s = ep.trim();
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }

        int idx = s.indexOf("/openai/");
        if (idx > 0) {
            s = s.substring(0, idx);
        }

        return s;
    }

    public String chatJson(String systemPrompt, String userPrompt) {
        String url = endpoint
                + "/openai/deployments/" + deployment
                + "/chat/completions?api-version=" + apiVersion;

        String sys = (systemPrompt == null ? "" : systemPrompt.trim());
        if (!sys.toLowerCase(Locale.ROOT).contains("json")) {
            sys = (sys.isEmpty() ? "" : (sys + "\n\n"))
                    + "Return ONLY valid JSON. No prose, no markdown.";
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("temperature", 0.2);
        body.put("max_tokens", 900);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", sys));
        messages.add(Map.of("role", "user", "content", userPrompt == null ? "" : userPrompt));
        body.put("messages", messages);

        body.put("response_format", Map.of("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> res = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);

            if (res.getBody() == null) {
                System.out.println("Azure OpenAI: empty body, status=" + res.getStatusCode());
                return null;
            }

            Object choicesObj = res.getBody().get("choices");
            if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
                System.out.println("Azure OpenAI: missing choices");
                return null;
            }

            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> firstMap)) {
                System.out.println("Azure OpenAI: invalid choice shape");
                return null;
            }

            Object msgObj = firstMap.get("message");
            if (!(msgObj instanceof Map<?, ?> msgMap)) {
                System.out.println("Azure OpenAI: missing message");
                return null;
            }

            Object content = msgMap.get("content");
            if (content == null) {
                System.out.println("Azure OpenAI: content is null");
                return null;
            }

            String text = String.valueOf(content).trim();
            return text.isBlank() ? null : text;

        } catch (HttpStatusCodeException e) {
            System.out.println("Azure OpenAI HTTP " + e.getStatusCode() + ": " + e.getResponseBodyAsString());
            return null;
        } catch (ResourceAccessException e) {
            System.out.println("Azure OpenAI timeout/network: " + e.getMessage());
            return null;
        } catch (RestClientException e) {
            System.out.println("Azure OpenAI error: " + e.getMessage());
            return null;
        }
    }
}