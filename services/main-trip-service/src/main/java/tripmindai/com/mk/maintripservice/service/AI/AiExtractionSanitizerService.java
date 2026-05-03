package tripmindai.com.mk.maintripservice.service.AI;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class AiExtractionSanitizerService {

    public JsonNode sanitize(JsonNode node) {
        if (node == null || !node.isObject()) {
            return node;
        }

        ObjectNode obj = (ObjectNode) node;

        normalizeTextField(obj, "destinationText");
        normalizeTextField(obj, "countryText");
        normalizeTextField(obj, "originCity");
        normalizeTextField(obj, "originIata");
        normalizeTextField(obj, "travelStyle");
        normalizeTextField(obj, "month");
        normalizeTextField(obj, "notes");

        if (obj.hasNonNull("originCity")) {
            obj.put("originCity", toTitleCase(obj.get("originCity").asText()));
        }

        if (obj.hasNonNull("originIata")) {
            String iata = safe(obj.get("originIata").asText()).trim().toUpperCase(Locale.ROOT);
            if (!iata.matches("^[A-Z]{3}$")) {
                obj.putNull("originIata");
            } else {
                obj.put("originIata", iata);
            }
        }

        if (obj.hasNonNull("budgetLevel")) {
            String budget = normalizeBudget(obj.get("budgetLevel").asText());
            if (budget == null) {
                obj.putNull("budgetLevel");
            } else {
                obj.put("budgetLevel", budget);
            }
        }

        if (obj.hasNonNull("dateFlexibilityHint")) {
            String flex = safe(obj.get("dateFlexibilityHint").asText()).trim().toUpperCase(Locale.ROOT);
            if (!TravelPromptMappings.FLEX_VALUES.contains(flex)) {
                obj.putNull("dateFlexibilityHint");
            } else {
                obj.put("dateFlexibilityHint", flex);
            }
        }

        if (obj.hasNonNull("fromDate")) {
            String normalized = normalizeInputDate(obj.get("fromDate").asText());
            if (normalized == null) {
                obj.putNull("fromDate");
            } else {
                obj.put("fromDate", normalized);
            }
        }

        if (obj.hasNonNull("toDate")) {
            String normalized = normalizeInputDate(obj.get("toDate").asText());
            if (normalized == null) {
                obj.putNull("toDate");
            } else {
                obj.put("toDate", normalized);
            }
        }

        if (obj.hasNonNull("people")) {
            int people = obj.get("people").asInt(0);
            if (people <= 0 || people > 20) {
                obj.putNull("people");
            }
        }

        if (obj.hasNonNull("durationDays")) {
            int duration = obj.get("durationDays").asInt(0);
            if (duration <= 0 || duration > 60) {
                obj.putNull("durationDays");
            }
        }

        if (obj.has("interests") && obj.get("interests").isArray()) {
            sanitizeStringArray((ArrayNode) obj.get("interests"), false);
        }

        if (obj.has("candidateCountries") && obj.get("candidateCountries").isArray()) {
            sanitizeStringArray((ArrayNode) obj.get("candidateCountries"), true);
        }

        if (obj.has("candidateDestinations") && obj.get("candidateDestinations").isArray()) {
            sanitizeStringArray((ArrayNode) obj.get("candidateDestinations"), true);
        }

        if (obj.hasNonNull("confidence")) {
            double confidence = obj.get("confidence").asDouble(-1);
            if (confidence < 0 || confidence > 1) {
                obj.put("confidence", 0.0);
            }
        }

        if (obj.hasNonNull("originCity") && (obj.get("originIata") == null || obj.get("originIata").isNull())) {
            String inferredIata = resolveOriginToIata(obj.get("originCity").asText());
            if (inferredIata != null) {
                obj.put("originIata", inferredIata);
            }
        }

        return obj;
    }

    private void normalizeTextField(ObjectNode obj, String field) {
        if (!obj.hasNonNull(field)) {
            return;
        }

        String value = safe(obj.get(field).asText()).trim();
        if (value.isBlank()) {
            obj.putNull(field);
        } else {
            obj.put(field, value);
        }
    }

    private void sanitizeStringArray(ArrayNode arrayNode, boolean titleCase) {
        Set<String> seen = new HashSet<>();
        ArrayNode cleaned = arrayNode.arrayNode();

        for (JsonNode item : arrayNode) {
            String value = safe(item.asText()).trim();
            if (value.isBlank()) {
                continue;
            }

            String normalized = titleCase ? toTitleCase(value) : value;
            String dedupeKey = normalized.toLowerCase(Locale.ROOT);

            if (seen.add(dedupeKey)) {
                cleaned.add(normalized);
            }
        }

        arrayNode.removeAll();
        arrayNode.addAll(cleaned);
    }

    private String normalizeBudget(String raw) {
        String value = safe(raw).trim().toLowerCase(Locale.ROOT);

        if (TravelPromptMappings.BUDGET_VALUES.contains(value)) {
            return value;
        }

        if (value.equals("mid") || value.equals("moderate") || value.equals("average")) {
            return "medium";
        }

        if (value.equals("cheap") || value.equals("budget")) {
            return "low";
        }

        if (value.equals("luxury") || value.equals("premium")) {
            return "high";
        }

        return null;
    }

    private String normalizeInputDate(String value) {
        String v = safe(value).trim();
        if (v.isBlank()) return null;

        if (v.matches("^\\d{4}-\\d{2}-\\d{2}$")) return v;

        var dots = java.util.regex.Pattern.compile("^(\\d{2})\\.(\\d{2})\\.(\\d{4})$").matcher(v);
        if (dots.find()) return dots.group(3) + "-" + dots.group(2) + "-" + dots.group(1);

        var slashes = java.util.regex.Pattern.compile("^(\\d{2})/(\\d{2})/(\\d{4})$").matcher(v);
        if (slashes.find()) return slashes.group(3) + "-" + slashes.group(2) + "-" + slashes.group(1);

        return null;
    }

    private String resolveOriginToIata(String originCity) {
        String raw = safe(originCity).trim().toLowerCase(Locale.ROOT);
        if (raw.isBlank()) return null;

        Map<String, String> cityToIata = Map.ofEntries(
                Map.entry("skopje", "SKP"),
                Map.entry("belgrade", "BEG"),
                Map.entry("budapest", "BUD"),
                Map.entry("vienna", "VIE"),
                Map.entry("sofia", "SOF"),
                Map.entry("prague", "PRG"),
                Map.entry("munich", "MUC"),
                Map.entry("frankfurt", "FRA"),
                Map.entry("istanbul", "IST"),
                Map.entry("athens", "ATH"),
                Map.entry("tirana", "TIA"),
                Map.entry("podgorica", "TGD"),
                Map.entry("zagreb", "ZAG"),
                Map.entry("bucharest", "OTP"),
                Map.entry("london", "LON"),
                Map.entry("paris", "PAR"),
                Map.entry("rome", "ROM"),
                Map.entry("milan", "MIL"),
                Map.entry("new york", "NYC")
        );

        return cityToIata.getOrDefault(raw, null);
    }

    private String toTitleCase(String value) {
        if (value == null || value.isBlank()) return value;

        String[] parts = value.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();

        for (String part : parts) {
            if (part.isBlank()) continue;

            if (!sb.isEmpty()) {
                sb.append(' ');
            }

            sb.append(part.substring(0, 1).toUpperCase(Locale.ROOT));
            if (part.length() > 1) {
                sb.append(part.substring(1).toLowerCase(Locale.ROOT));
            }
        }

        return sb.toString();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
