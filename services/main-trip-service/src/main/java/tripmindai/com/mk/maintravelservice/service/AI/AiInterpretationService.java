package tripmindai.com.mk.maintravelservice.service.AI;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import tripmindai.com.mk.maintravelservice.dto.AI.AiTripInterpretation;
import tripmindai.com.mk.maintravelservice.dto.AI.AiTripRequest;
import tripmindai.com.mk.maintravelservice.model.Country;
import tripmindai.com.mk.maintravelservice.model.Destination;
import tripmindai.com.mk.maintravelservice.repository.CountryRepository;
import tripmindai.com.mk.maintravelservice.repository.DestinationRepository;

import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiInterpretationService {

    private static final double HIGH_CONFIDENCE = 0.80;
    private static final double MEDIUM_CONFIDENCE = 0.55;

    private final AzureOpenAiClient client;
    private final ObjectMapper mapper;
    private final CountryRepository countryRepository;
    private final DestinationRepository destinationRepository;

    public AiInterpretationService(
            AzureOpenAiClient client,
            ObjectMapper mapper,
            CountryRepository countryRepository,
            DestinationRepository destinationRepository
    ) {
        this.client = client;
        this.mapper = mapper;
        this.countryRepository = countryRepository;
        this.destinationRepository = destinationRepository;
    }

    public AiTripInterpretation interpret(AiTripRequest req) {
        String prompt = sanitizePrompt(req.prompt());
        String promptLower = normalizeText(prompt);

        List<Country> countries = countryRepository.findAll();
        List<Destination> destinations = destinationRepository.findAll();

        ParsedSignals ruleSignals = extractSignalsRuleBased(req, prompt, promptLower, countries, destinations);

        DateResolution resolvedDates = resolveFlexibleDates(
                ruleSignals.fromDate(),
                ruleSignals.toDate(),
                ruleSignals.durationDays(),
                ruleSignals.month(),
                ruleSignals.dateFlexibilityHint()
        );

        String extractedFromDate = resolvedDates.fromDate();
        String extractedToDate = resolvedDates.toDate();
        Integer extractedDurationDays = resolvedDates.durationDays();

        if (extractedFromDate != null && extractedToDate != null && extractedDurationDays == null) {
            extractedDurationDays = calculateDurationDays(extractedFromDate, extractedToDate);
        }

        DestinationResolution destinationResolution = resolveDestinationWithScoring(
                promptLower,
                ruleSignals.destinationText(),
                ruleSignals.countryText(),
                ruleSignals.travelStyle(),
                ruleSignals.interests(),
                destinations
        );

        double confidence = computeConfidence(ruleSignals, destinationResolution);

        if (!destinationResolution.codes().isEmpty() && confidence >= MEDIUM_CONFIDENCE) {
            return new AiTripInterpretation(
                    ruleSignals.travelStyle(),
                    destinationResolution.codes().stream()
                            .limit(TravelPromptMappings.MAX_RESULTS)
                            .toList(),
                    normalizeBudget(ruleSignals.budgetLevel()),
                    ruleSignals.interests(),
                    buildNotes(ruleSignals, destinationResolution, confidence, false),
                    ruleSignals.people(),
                    extractedDurationDays,
                    extractedFromDate,
                    extractedToDate,
                    ruleSignals.month(),
                    destinationResolution.destinationText(),
                    ruleSignals.countryText()
            );
        }

        JsonNode aiExtract = extractStructuredParamsWithAi(req, prompt);

        ParsedSignals mergedSignals = mergeRuleAndAiSignals(
                ruleSignals,
                aiExtract,
                prompt,
                promptLower,
                countries,
                destinations
        );

        DateResolution aiResolvedDates = resolveFlexibleDates(
                mergedSignals.fromDate(),
                mergedSignals.toDate(),
                mergedSignals.durationDays(),
                mergedSignals.month(),
                mergedSignals.dateFlexibilityHint()
        );

        String finalFromDate = aiResolvedDates.fromDate();
        String finalToDate = aiResolvedDates.toDate();
        Integer finalDurationDays = aiResolvedDates.durationDays();

        if (finalFromDate != null && finalToDate != null && finalDurationDays == null) {
            finalDurationDays = calculateDurationDays(finalFromDate, finalToDate);
        }

        DestinationResolution mergedDestination = resolveDestinationWithScoring(
                promptLower,
                mergedSignals.destinationText(),
                mergedSignals.countryText(),
                mergedSignals.travelStyle(),
                mergedSignals.interests(),
                destinations
        );

        double mergedConfidence = computeConfidence(mergedSignals, mergedDestination);

        if (!mergedDestination.codes().isEmpty()) {
            return new AiTripInterpretation(
                    mergedSignals.travelStyle(),
                    mergedDestination.codes().stream()
                            .limit(TravelPromptMappings.MAX_RESULTS)
                            .toList(),
                    normalizeBudget(mergedSignals.budgetLevel()),
                    mergedSignals.interests(),
                    buildNotes(mergedSignals, mergedDestination, mergedConfidence, true),
                    mergedSignals.people(),
                    finalDurationDays,
                    finalFromDate,
                    finalToDate,
                    mergedSignals.month(),
                    mergedDestination.destinationText(),
                    mergedSignals.countryText()
            );
        }

        return fallbackInterpretation(
                req,
                destinations,
                mergedSignals.people(),
                finalDurationDays,
                finalFromDate,
                finalToDate,
                mergedSignals.month(),
                mergedSignals.destinationText(),
                mergedSignals.countryText(),
                mergedSignals.travelStyle(),
                mergedSignals.budgetLevel(),
                mergedSignals.interests()
        );
    }

    private ParsedSignals extractSignalsRuleBased(
            AiTripRequest req,
            String prompt,
            String promptLower,
            List<Country> countries,
            List<Destination> destinations
    ) {
        Integer people = firstNonNullInt(
                extractPeople(promptLower),
                req.people() > 0 ? req.people() : null,
                1
        );

        Integer durationDays = extractDurationDays(promptLower);

        String fromDate = firstNonBlank(
                extractIsoDate(prompt, "from"),
                normalizeInputDate(safe(req.fromDate()))
        );

        String toDate = firstNonBlank(
                extractIsoDate(prompt, "to"),
                normalizeInputDate(safe(req.toDate()))
        );

        String month = firstNonBlank(
                extractMonth(promptLower),
                extractSeasonAsMonth(promptLower),
                null
        );

        String dateFlexibilityHint = extractDateFlexibilityHint(promptLower);

        List<String> mentionedDestinations = extractMentionedDestinations(prompt, destinations);

        String destinationText = firstNonBlank(
                normalizeKnownLocationAlias(prompt),
                !mentionedDestinations.isEmpty() ? mentionedDestinations.get(0) : null,
                extractDestinationText(prompt, destinations),
                null
        );

        String countryText = firstNonBlank(
                extractCountryName(prompt, countries),
                normalizeKnownCountryAlias(prompt),
                null
        );

        String travelStyle = firstNonBlank(
                detectTravelStyle(promptLower),
                detectWarmWeatherStyle(promptLower),
                "general"
        );

        String budgetLevel = normalizeBudget(firstNonBlank(
                extractBudgetLevel(promptLower),
                req.budgetLevel(),
                "medium"
        ));

        List<String> interests = detectInterests(promptLower);

        return new ParsedSignals(
                people,
                durationDays,
                fromDate,
                toDate,
                month,
                dateFlexibilityHint,
                destinationText,
                countryText,
                travelStyle,
                budgetLevel,
                interests,
                mentionedDestinations
        );
    }

    private ParsedSignals mergeRuleAndAiSignals(
            ParsedSignals base,
            JsonNode aiExtract,
            String prompt,
            String promptLower,
            List<Country> countries,
            List<Destination> destinations
    ) {
        Integer people = firstNonNullInt(
                readInt(aiExtract, "people"),
                base.people(),
                extractPeople(promptLower),
                1
        );

        Integer durationDays = firstNonNullInt(
                readInt(aiExtract, "durationDays"),
                base.durationDays(),
                extractDurationDays(promptLower)
        );

        String fromDate = firstNonBlank(
                readText(aiExtract, "fromDate"),
                base.fromDate(),
                extractIsoDate(prompt, "from")
        );

        String toDate = firstNonBlank(
                readText(aiExtract, "toDate"),
                base.toDate(),
                extractIsoDate(prompt, "to")
        );

        String month = firstNonBlank(
                readText(aiExtract, "month"),
                base.month(),
                extractMonth(promptLower),
                extractSeasonAsMonth(promptLower)
        );

        String dateFlexibilityHint = firstNonBlank(
                readText(aiExtract, "dateFlexibilityHint"),
                base.dateFlexibilityHint(),
                extractDateFlexibilityHint(promptLower)
        );

        List<String> mentionedDestinations = extractMentionedDestinations(prompt, destinations);

        String destinationText = firstNonBlank(
                readText(aiExtract, "destinationText"),
                base.destinationText(),
                !mentionedDestinations.isEmpty() ? mentionedDestinations.get(0) : null,
                normalizeKnownLocationAlias(prompt),
                extractDestinationText(prompt, destinations)
        );

        String countryText = firstNonBlank(
                readText(aiExtract, "countryText"),
                base.countryText(),
                extractCountryName(prompt, countries),
                normalizeKnownCountryAlias(prompt)
        );

        String travelStyle = firstNonBlank(
                readText(aiExtract, "travelStyle"),
                base.travelStyle(),
                detectTravelStyle(promptLower),
                detectWarmWeatherStyle(promptLower),
                "general"
        );

        String budgetLevel = normalizeBudget(firstNonBlank(
                readText(aiExtract, "budgetLevel"),
                base.budgetLevel(),
                extractBudgetLevel(promptLower),
                "medium"
        ));

        List<String> interests = readStringList(aiExtract, "interests");
        if (interests.isEmpty()) {
            interests = base.interests() == null || base.interests().isEmpty()
                    ? detectInterests(promptLower)
                    : base.interests();
        }

        List<String> mergedMentioned = new ArrayList<>();
        if (base.mentionedDestinations() != null) {
            mergedMentioned.addAll(base.mentionedDestinations());
        }
        for (String d : mentionedDestinations) {
            if (!mergedMentioned.contains(d)) {
                mergedMentioned.add(d);
            }
        }

        return new ParsedSignals(
                people,
                durationDays,
                fromDate,
                toDate,
                month,
                dateFlexibilityHint,
                destinationText,
                countryText,
                travelStyle,
                budgetLevel,
                interests,
                mergedMentioned
        );
    }

    private DestinationResolution resolveDestinationWithScoring(
            String prompt,
            String destinationText,
            String countryText,
            String travelStyle,
            List<String> interests,
            List<Destination> destinations
    ) {
        String normalizedPrompt = normalizeText(prompt);
        String normalizedDestination = normalizeText(destinationText);
        String normalizedCountry = normalizeText(countryText);
        List<String> mentionedDestinations = extractMentionedDestinations(prompt, destinations);

        Map<String, Double> scoreByCode = new LinkedHashMap<>();
        Map<String, String> nameByCode = new LinkedHashMap<>();

        for (Destination dest : destinations) {
            if (dest == null || dest.getCityCode() == null) continue;

            String code = normalizeCode(dest.getCityCode());
            String destName = normalizeText(dest.getName());
            String destCountry = dest.getCountry() != null ? normalizeText(dest.getCountry().getName()) : "";

            double score = 0.0;

            if (!normalizedDestination.isBlank()) {
                if (destName.equals(normalizedDestination)) score += 1.00;
                else if (destName.contains(normalizedDestination) || normalizedDestination.contains(destName)) score += 0.85;
                else if (fuzzyMatchSmart(destName, normalizedDestination)) score += 0.70;
            }

            if (containsFuzzyToken(normalizedPrompt, destName)) score += 0.65;
            if (normalizedPrompt.contains(destName)) score += 0.70;

            if (mentionedDestinations.stream().anyMatch(m -> normalizeText(m).equals(destName))) {
                score += 0.90;
            }

            if (!normalizedCountry.isBlank()) {
                if (destCountry.equals(normalizedCountry)) score += 0.45;
                else if (fuzzyMatchSmart(destCountry, normalizedCountry)) score += 0.30;
            }

            score += scoreStyleHeuristics(code, travelStyle, interests);

            if (score > 0) {
                scoreByCode.put(code, score);
                nameByCode.put(code, dest.getName());
            }
        }

        if (!scoreByCode.isEmpty()) {
            List<Map.Entry<String, Double>> sorted = scoreByCode.entrySet().stream()
                    .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                    .toList();

            double topScore = sorted.get(0).getValue();

            List<String> strongCodes = sorted.stream()
                    .filter(e -> e.getValue() >= Math.max(0.65, topScore - 0.25))
                    .map(Map.Entry::getKey)
                    .distinct()
                    .limit(TravelPromptMappings.MAX_RESULTS)
                    .toList();

            String detectedText = destinationText;
            if ((detectedText == null || detectedText.isBlank()) && !strongCodes.isEmpty()) {
                detectedText = nameByCode.get(strongCodes.get(0));
            }

            return new DestinationResolution(strongCodes, detectedText, topScore);
        }

        List<String> regionCodes = findRegionDefaultCodes(prompt);
        if (!regionCodes.isEmpty()) {
            return new DestinationResolution(regionCodes, destinationText, 0.45);
        }

        List<String> defaults = buildSmartDefaultCodes(travelStyle, interests);
        return new DestinationResolution(defaults, destinationText, defaults.isEmpty() ? 0.0 : 0.30);
    }

    private double scoreStyleHeuristics(String code, String travelStyle, List<String> interests) {
        double score = 0.0;

        List<String> defaults = TravelPromptMappings.STYLE_DEFAULT_CODES.getOrDefault(
                safe(travelStyle),
                TravelPromptMappings.STYLE_DEFAULT_CODES.getOrDefault("general", List.of())
        );

        if (defaults.contains(code)) score += 0.20;

        if (interests != null) {
            if (interests.contains("beach") && List.of("HKT", "PMI", "AYT", "MIA", "NCE").contains(code)) score += 0.12;
            if (interests.contains("culture") && List.of("ROM", "PAR", "VCE", "MAD", "BCN").contains(code)) score += 0.12;
            if (interests.contains("nightlife") && List.of("MIA", "BCN", "BKK", "HKT").contains(code)) score += 0.10;
            if (interests.contains("nature") && List.of("CNX", "IZM", "NCE", "AYT", "HKT").contains(code)) score += 0.10;
            if (interests.contains("family") && List.of("PMI", "AYT", "MIA", "BKK", "HKT").contains(code)) score += 0.10;
        }

        return score;
    }

    private double computeConfidence(ParsedSignals signals, DestinationResolution destinationResolution) {
        double confidence = 0.0;

        if (signals.destinationText() != null && !signals.destinationText().isBlank()) confidence += 0.35;
        if (!destinationResolution.codes().isEmpty()) confidence += 0.25;
        if (signals.mentionedDestinations() != null && !signals.mentionedDestinations().isEmpty()) confidence += 0.08;
        if (destinationResolution.score() >= 0.85) confidence += 0.15;
        else if (destinationResolution.score() >= 0.65) confidence += 0.10;
        else if (destinationResolution.score() >= 0.45) confidence += 0.05;

        if (signals.people() != null) confidence += 0.08;
        if (signals.durationDays() != null) confidence += 0.08;
        if (signals.month() != null) confidence += 0.05;
        if (signals.fromDate() != null || signals.toDate() != null) confidence += 0.08;
        if (signals.budgetLevel() != null && !signals.budgetLevel().isBlank()) confidence += 0.06;

        return Math.min(1.0, confidence);
    }

    private String buildNotes(
            ParsedSignals signals,
            DestinationResolution destinationResolution,
            double confidence,
            boolean usedAiMerge
    ) {
        return "Interpretation "
                + (usedAiMerge ? "with AI merge" : "rule-based first")
                + ", confidence=" + String.format(Locale.US, "%.2f", confidence)
                + ", destination=" + safe(destinationResolution.destinationText())
                + ", travelStyle=" + safe(signals.travelStyle())
                + ", budget=" + safe(signals.budgetLevel());
    }

    private JsonNode extractStructuredParamsWithAi(AiTripRequest req, String cleanedPrompt) {
        String system = """
                You are an AI that extracts structured travel parameters from free text.

                Return ONLY valid JSON. No markdown.

                JSON schema:
                {
                  "destinationText": "string|null",
                  "countryText": "string|null",
                  "travelStyle": "string|null",
                  "budgetLevel": "low|medium|high|null",
                  "interests": ["string", ...],
                  "people": 1,
                  "durationDays": 1,
                  "fromDate": "YYYY-MM-DD|null",
                  "toDate": "YYYY-MM-DD|null",
                  "month": "string|null",
                  "dateFlexibilityHint": "START_OF_MONTH|MID_MONTH|END_OF_MONTH|NEXT_MONTH|WEEKEND|null",
                  "notes": "string"
                }

                Rules:
                - Infer parameters from Macedonian and English input.
                - Normalize slang, short forms, abbreviations, typos, and informal names.
                - Example: bankok -> Bangkok, ny -> New York, mid -> medium.
                - If exact dates are explicitly given, return them in fromDate/toDate.
                - If only duration is known, fill durationDays.
                - If only season is known, map it to a month.
                - If only a month is known, put it in "month".
                - Keep values concise and normalized.
                """;

        String user = """
                User prompt: %s
                Existing request fromDate: %s
                Existing request toDate: %s
                Existing request people: %d
                Existing request budget: %s
                Existing request originCity: %s
                """.formatted(
                cleanedPrompt,
                safe(req.fromDate()),
                safe(req.toDate()),
                req.people(),
                safe(req.budgetLevel()),
                safe(req.originCity())
        );

        try {
            String json = client.chatJson(system, user);
            if (json == null || json.isBlank()) return null;
            return mapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }

    private AiTripInterpretation fallbackInterpretation(
            AiTripRequest req,
            List<Destination> destinations,
            Integer extractedPeople,
            Integer extractedDurationDays,
            String extractedFromDate,
            String extractedToDate,
            String extractedMonth,
            String extractedDestinationText,
            String extractedCountry,
            String travelStyle,
            String budgetLevel,
            List<String> interests
    ) {
        String promptLower = normalizeText(safe(req.prompt()));

        Country matchedCountry = findCountryFromPrompt(promptLower, countryRepository.findAll());

        List<String> codes;
        if (matchedCountry != null) {
            codes = destinationRepository.findByCountry_CodeIgnoreCaseOrderByNameAsc(matchedCountry.getCode())
                    .stream()
                    .map(Destination::getCityCode)
                    .filter(Objects::nonNull)
                    .map(this::normalizeCode)
                    .distinct()
                    .limit(TravelPromptMappings.MAX_RESULTS)
                    .toList();
        } else {
            List<String> regionCodes = findRegionDefaultCodes(promptLower);
            if (!regionCodes.isEmpty()) {
                codes = regionCodes;
            } else {
                codes = buildSmartDefaultCodes(travelStyle, interests);
            }
        }

        return new AiTripInterpretation(
                travelStyle,
                codes == null ? List.of() : codes.stream().limit(TravelPromptMappings.MAX_RESULTS).toList(),
                normalizeBudget(budgetLevel),
                interests == null || interests.isEmpty() ? detectInterests(promptLower) : interests,
                "fallback suggestions",
                extractedPeople,
                extractedDurationDays,
                extractedFromDate,
                extractedToDate,
                extractedMonth,
                extractedDestinationText,
                extractedCountry
        );
    }

    private List<String> findRegionDefaultCodes(String text) {
        String t = normalizeText(text);

        for (Map.Entry<String, List<String>> entry : TravelPromptMappings.REGION_DEFAULT_CODES.entrySet()) {
            if (t.contains(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        return List.of();
    }

    private Country findCountryFromPrompt(String text, List<Country> countries) {
        String normalizedText = normalizeText(text);

        for (Country c : countries) {
            String countryName = normalizeText(c.getName());
            if (!countryName.isBlank() && normalizedText.contains(countryName)) {
                return c;
            }
        }

        String alias = normalizeKnownCountryAlias(text);
        if (alias != null) {
            for (Country c : countries) {
                if (normalizeText(c.getName()).equals(normalizeText(alias))) {
                    return c;
                }
            }
        }

        return null;
    }

    private Integer extractPeople(String text) {
        String t = normalizeText(text);

        for (Map.Entry<String, Integer> entry : TravelPromptMappings.PEOPLE_KEYWORDS.entrySet()) {
            if (t.contains(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        Matcher m = Pattern.compile("\\b(\\d+)\\s*(лица|persons|people|adults|adult|guests|guest|ppl)\\b").matcher(t);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (Exception ignored) {}
        }

        Matcher m2 = Pattern.compile("\\bfor\\s+(\\d+)\\b").matcher(t);
        if (m2.find()) {
            try {
                return Integer.parseInt(m2.group(1));
            } catch (Exception ignored) {}
        }

        if (t.contains("for two persons") || t.contains("for two people")) return 2;
        if (t.contains("for one person") || t.contains("just me")) return 1;
        if (t.contains("for three persons") || t.contains("for three people")) return 3;
        if (t.contains("for four persons") || t.contains("for four people")) return 4;

        return null;
    }

    private Integer extractDurationDays(String text) {
        String t = normalizeText(text);

        Matcher m1 = Pattern.compile("\\b(\\d+)\\s*(days|day|nights|night)\\b").matcher(t);
        if (m1.find()) {
            try {
                return Integer.parseInt(m1.group(1));
            } catch (Exception ignored) {}
        }

        Matcher m2 = Pattern.compile("\\b(\\d+)\\s*(дена|денови|ден|ноќи|ноки|ноќ)\\b").matcher(t);
        if (m2.find()) {
            try {
                return Integer.parseInt(m2.group(1));
            } catch (Exception ignored) {}
        }

        Matcher m3 = Pattern.compile("\\bfor\\s+(\\d+)\\s*(days|day|nights|night)\\b").matcher(t);
        if (m3.find()) {
            try {
                return Integer.parseInt(m3.group(1));
            } catch (Exception ignored) {}
        }

        Matcher m4 = Pattern.compile("\\baround\\s+(\\d+)\\s*(days|day|nights|night)\\b").matcher(t);
        if (m4.find()) {
            try {
                return Integer.parseInt(m4.group(1));
            } catch (Exception ignored) {}
        }

        Matcher m5 = Pattern.compile("\\bstay\\s+(\\d+)\\s*(days|day|nights|night)\\b").matcher(t);
        if (m5.find()) {
            try {
                return Integer.parseInt(m5.group(1));
            } catch (Exception ignored) {}
        }

        return null;
    }

    private String extractIsoDate(String text, String which) {
        String t = safe(text);

        Matcher dots = Pattern.compile("(\\d{2})\\.(\\d{2})\\.(\\d{4})").matcher(t);
        List<String> dates = new ArrayList<>();
        while (dots.find()) {
            dates.add(dots.group(3) + "-" + dots.group(2) + "-" + dots.group(1));
        }

        Matcher slashes = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})").matcher(t);
        while (slashes.find()) {
            dates.add(slashes.group(3) + "-" + slashes.group(2) + "-" + slashes.group(1));
        }

        Matcher iso = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})").matcher(t);
        while (iso.find()) {
            dates.add(iso.group(1) + "-" + iso.group(2) + "-" + iso.group(3));
        }

        if (dates.isEmpty()) return null;
        if ("from".equals(which)) return dates.get(0);
        if ("to".equals(which) && dates.size() > 1) return dates.get(1);

        return null;
    }

    private String extractCountryName(String text, List<Country> countries) {
        String normalizedText = normalizeText(text);

        for (Country c : countries) {
            String name = normalizeText(c.getName());
            if (!name.isBlank() && normalizedText.contains(name)) {
                return c.getName();
            }
        }

        return normalizeKnownCountryAlias(text);
    }

    private String extractMonth(String text) {
        String normalizedText = normalizeText(text);

        for (Map.Entry<String, Integer> entry : TravelPromptMappings.MONTH_ALIASES.entrySet()) {
            if (normalizedText.contains(normalizeText(entry.getKey()))) {
                return entry.getKey();
            }
        }

        return null;
    }

    private String extractSeasonAsMonth(String text) {
        String normalizedText = normalizeText(text);

        for (Map.Entry<String, String> entry : TravelPromptMappings.SEASON_TO_MONTH.entrySet()) {
            if (normalizedText.contains(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        return null;
    }

    private String extractDateFlexibilityHint(String text) {
        String normalizedText = normalizeText(text);

        for (Map.Entry<String, String> entry : TravelPromptMappings.DATE_FLEXIBILITY_KEYWORDS.entrySet()) {
            if (normalizedText.contains(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        if (normalizedText.matches(".*\\bend of\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\b.*")) {
            return "END_OF_MONTH";
        }

        if (normalizedText.matches(".*\\blate\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\b.*")) {
            return "END_OF_MONTH";
        }

        if (normalizedText.matches(".*\\bstart of\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\b.*")) {
            return "START_OF_MONTH";
        }

        if (normalizedText.matches(".*\\bbeginning of\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\b.*")) {
            return "START_OF_MONTH";
        }

        if (normalizedText.matches(".*\\bmiddle of\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\b.*")) {
            return "MID_MONTH";
        }

        if (normalizedText.matches(".*\\bmid\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\b.*")) {
            return "MID_MONTH";
        }

        return null;
    }

    private String extractDestinationText(String prompt, List<Destination> destinations) {
        String normalizedPrompt = normalizeText(prompt);

        String aliasMatch = normalizeKnownLocationAlias(prompt);
        if (aliasMatch != null) return aliasMatch;

        List<String> mentioned = extractMentionedDestinations(prompt, destinations);
        if (!mentioned.isEmpty()) {
            return mentioned.get(0);
        }

        for (Destination d : destinations) {
            String name = normalizeText(d.getName());
            if (!name.isBlank() && normalizedPrompt.contains(name)) {
                return d.getName();
            }
        }

        for (Destination d : destinations) {
            String name = normalizeText(d.getName());
            if (!name.isBlank() && fuzzyPromptContains(normalizedPrompt, name)) {
                return d.getName();
            }
        }

        return null;
    }

    private List<String> extractMentionedDestinations(String prompt, List<Destination> destinations) {
        String normalizedPrompt = normalizeText(prompt);
        List<String> matches = new ArrayList<>();

        for (Map.Entry<String, String> entry : TravelPromptMappings.LOCATION_ALIASES.entrySet()) {
            if (normalizedPrompt.contains(normalizeText(entry.getKey())) && !matches.contains(entry.getValue())) {
                matches.add(entry.getValue());
            }
        }

        for (Destination d : destinations) {
            String name = normalizeText(d.getName());
            if (!name.isBlank() && (normalizedPrompt.contains(name) || fuzzyPromptContains(normalizedPrompt, name))) {
                if (!matches.contains(d.getName())) {
                    matches.add(d.getName());
                }
            }
        }

        return matches;
    }

    private String normalizeKnownLocationAlias(String text) {
        String normalizedText = normalizeText(text);

        for (Map.Entry<String, String> entry : TravelPromptMappings.LOCATION_ALIASES.entrySet()) {
            if (normalizedText.contains(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        return null;
    }

    private String normalizeKnownCountryAlias(String text) {
        String normalizedText = normalizeText(text);

        for (Map.Entry<String, String> entry : TravelPromptMappings.COUNTRY_ALIASES.entrySet()) {
            if (normalizedText.contains(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        return null;
    }

    private String detectTravelStyle(String promptLower) {
        String text = normalizeText(promptLower);

        for (Map.Entry<String, String> entry : TravelPromptMappings.TRAVEL_STYLE_KEYWORDS.entrySet()) {
            if (text.contains(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        return "general";
    }

    private String detectWarmWeatherStyle(String promptLower) {
        String text = normalizeText(promptLower);

        if (text.contains("warm") || text.contains("hot weather") || text.contains("sun") || text.contains("somewhere warm")) {
            return "beach";
        }

        return null;
    }

    private List<String> detectInterests(String promptLower) {
        String text = normalizeText(promptLower);
        List<String> interests = new ArrayList<>();

        for (Map.Entry<String, String> entry : TravelPromptMappings.INTEREST_KEYWORDS.entrySet()) {
            if (text.contains(normalizeText(entry.getKey())) && !interests.contains(entry.getValue())) {
                interests.add(entry.getValue());
            }
        }

        if (text.contains("warm") || text.contains("somewhere warm") || text.contains("sunny")) {
            if (!interests.contains("beach")) {
                interests.add("beach");
            }
        }

        if (interests.isEmpty()) {
            interests.add("travel");
        }

        return interests;
    }

    private String extractBudgetLevel(String text) {
        String normalizedText = normalizeText(text);

        for (Map.Entry<String, String> entry : TravelPromptMappings.BUDGET_KEYWORDS.entrySet()) {
            if (normalizedText.contains(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        if (Pattern.compile("\\bmid\\b").matcher(normalizedText).find()) return "medium";
        if (Pattern.compile("\\bmedium\\b").matcher(normalizedText).find()) return "medium";
        if (Pattern.compile("\\blow\\b").matcher(normalizedText).find()) return "low";
        if (Pattern.compile("\\bhigh\\b").matcher(normalizedText).find()) return "high";

        if (normalizedText.contains("not too expensive") || normalizedText.contains("not expensive")) {
            return "medium";
        }

        return null;
    }

    private String normalizeBudget(String budget) {
        String b = safe(budget).trim().toLowerCase(Locale.ROOT);
        if (TravelPromptMappings.BUDGET_VALUES.contains(b)) {
            return b;
        }
        return "medium";
    }

    private Integer normalizeMonthToNumber(String monthText) {
        if (monthText == null || monthText.isBlank()) return null;

        String m = normalizeText(monthText);

        for (Map.Entry<String, Integer> entry : TravelPromptMappings.MONTH_ALIASES.entrySet()) {
            if (m.equals(normalizeText(entry.getKey()))) {
                return entry.getValue();
            }
        }

        return null;
    }

    private DateResolution resolveFlexibleDates(
            String extractedFromDate,
            String extractedToDate,
            Integer durationDays,
            String extractedMonth,
            String dateFlexibilityHint
    ) {
        if (extractedFromDate != null && extractedToDate != null) {
            return new DateResolution(extractedFromDate, extractedToDate, durationDays);
        }

        if (durationDays == null || durationDays <= 0) {
            return new DateResolution(extractedFromDate, extractedToDate, durationDays);
        }

        Integer monthNumber = normalizeMonthToNumber(extractedMonth);
        LocalDate now = LocalDate.now();
        int year = now.getYear();

        if (monthNumber == null && "NEXT_MONTH".equals(dateFlexibilityHint)) {
            LocalDate nextMonth = now.plusMonths(1).withDayOfMonth(1);
            monthNumber = nextMonth.getMonthValue();
            year = nextMonth.getYear();
        }

        if (monthNumber == null) {
            return new DateResolution(extractedFromDate, extractedToDate, durationDays);
        }

        if (monthNumber < now.getMonthValue()) {
            year = year + 1;
        }

        LocalDate start;
        YearMonth ym = YearMonth.of(year, monthNumber);

        switch (safe(dateFlexibilityHint)) {
            case "START_OF_MONTH" -> start = LocalDate.of(year, monthNumber, Math.min(3, ym.lengthOfMonth()));
            case "MID_MONTH" -> start = LocalDate.of(year, monthNumber, Math.min(15, ym.lengthOfMonth()));
            case "END_OF_MONTH" -> {
                LocalDate lastDay = ym.atEndOfMonth();
                start = lastDay.minusDays(Math.max(0, durationDays - 1L));
            }
            case "NEXT_MONTH" -> start = LocalDate.of(year, monthNumber, Math.min(5, ym.lengthOfMonth()));
            case "WEEKEND" -> {
                LocalDate base = LocalDate.of(year, monthNumber, 1);
                start = moveToFriday(base);
            }
            default -> start = LocalDate.of(year, monthNumber, Math.min(10, ym.lengthOfMonth()));
        }

        LocalDate end = start.plusDays(durationDays);
        return new DateResolution(start.toString(), end.toString(), durationDays);
    }

    private LocalDate moveToFriday(LocalDate date) {
        LocalDate d = date;
        while (d.getDayOfWeek() != DayOfWeek.FRIDAY) {
            d = d.plusDays(1);
        }
        return d;
    }

    private Integer calculateDurationDays(String fromDate, String toDate) {
        try {
            LocalDate from = LocalDate.parse(fromDate);
            LocalDate to = LocalDate.parse(toDate);
            long days = ChronoUnit.DAYS.between(from, to);
            return days > 0 ? (int) days : null;
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private List<String> buildSmartDefaultCodes(String travelStyle, List<String> interests) {
        List<String> out = new ArrayList<>();

        List<String> styleDefaults = TravelPromptMappings.STYLE_DEFAULT_CODES.getOrDefault(
                safe(travelStyle),
                TravelPromptMappings.STYLE_DEFAULT_CODES.get("general")
        );

        out.addAll(styleDefaults);

        if (interests != null) {
            if (interests.contains("beach")) addMissing(out, List.of("HKT", "PMI", "AYT", "MIA"));
            if (interests.contains("culture")) addMissing(out, List.of("ROM", "PAR", "VCE", "MAD"));
            if (interests.contains("nightlife")) addMissing(out, List.of("MIA", "BCN", "BKK", "HKT"));
            if (interests.contains("nature")) addMissing(out, List.of("CNX", "NCE", "IZM"));
            if (interests.contains("family")) addMissing(out, List.of("PMI", "AYT", "MIA"));
        }

        return out.stream().distinct().limit(TravelPromptMappings.MAX_RESULTS).toList();
    }

    private void addMissing(List<String> target, List<String> values) {
        for (String v : values) {
            if (!target.contains(v)) {
                target.add(v);
            }
        }
    }

    private String readText(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) return null;
        String v = node.get(field).asText("").trim();
        return v.isBlank() ? null : v;
    }

    private Integer readInt(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) return null;
        try {
            int v = node.get(field).asInt();
            return v > 0 ? v : null;
        } catch (Exception e) {
            return null;
        }
    }

    private List<String> readStringList(JsonNode node, String field) {
        List<String> out = new ArrayList<>();
        if (node == null || !node.has(field) || !node.get(field).isArray()) return out;

        for (JsonNode n : node.get(field)) {
            String v = n.asText("").trim();
            if (!v.isBlank() && !out.contains(v)) {
                out.add(v);
            }
        }
        return out;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private Integer firstNonNullInt(Integer... values) {
        for (Integer v : values) {
            if (v != null && v > 0) return v;
        }
        return null;
    }

    private String sanitizePrompt(String s) {
        String value = safe(s)
                .replace("\u0000", " ")
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();

        if (value.length() > TravelPromptMappings.MAX_PROMPT_LENGTH) {
            value = value.substring(0, TravelPromptMappings.MAX_PROMPT_LENGTH);
        }

        return value;
    }

    private String normalizeInputDate(String value) {
        String v = safe(value).trim();
        if (v.isBlank()) return null;

        if (v.matches("^\\d{4}-\\d{2}-\\d{2}$")) return v;

        Matcher dots = Pattern.compile("^(\\d{2})\\.(\\d{2})\\.(\\d{4})$").matcher(v);
        if (dots.find()) return dots.group(3) + "-" + dots.group(2) + "-" + dots.group(1);

        Matcher slashes = Pattern.compile("^(\\d{2})/(\\d{2})/(\\d{4})$").matcher(v);
        if (slashes.find()) return slashes.group(3) + "-" + slashes.group(2) + "-" + slashes.group(1);

        return null;
    }

    private String normalizeText(String text) {
        String v = safe(text).toLowerCase(Locale.ROOT).trim();
        v = Normalizer.normalize(v, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        v = v.replaceAll("[^\\p{L}\\p{Nd}\\s-]", " ");
        v = v.replaceAll("\\s+", " ").trim();
        return v;
    }

    private boolean fuzzyMatchSmart(String input, String target) {
        String a = normalizeText(input).replace(" ", "");
        String b = normalizeText(target).replace(" ", "");

        if (a.isBlank() || b.isBlank()) return false;
        if (a.equals(b)) return true;
        if (a.contains(b) || b.contains(a)) return true;

        int distance = levenshteinDistance(a, b);

        if (b.length() <= 5) return distance <= 1;
        if (b.length() <= 8) return distance <= 2;
        return distance <= 3;
    }

    private boolean containsFuzzyToken(String text, String target) {
        String[] tokens = normalizeText(text).split("\\s+");
        String t = normalizeText(target);

        for (String token : tokens) {
            if (fuzzyMatchSmart(token, t)) {
                return true;
            }
        }

        return false;
    }

    private boolean fuzzyPromptContains(String prompt, String destinationName) {
        if (prompt == null || prompt.isBlank() || destinationName == null || destinationName.isBlank()) {
            return false;
        }

        String promptFlat = normalizeText(prompt).replace(" ", "");
        String destFlat = normalizeText(destinationName).replace(" ", "");

        if (promptFlat.contains(destFlat) || destFlat.contains(promptFlat)) {
            return true;
        }

        String[] tokens = normalizeText(prompt).split("\\s+");
        for (String token : tokens) {
            if (token.length() >= 4 && levenshteinDistance(token, destFlat) <= 2) {
                return true;
            }
        }

        return false;
    }

    private int levenshteinDistance(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];

        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }

        return dp[a.length()][b.length()];
    }

    private String normalizeCode(String code) {
        return safe(code).trim().toUpperCase(Locale.ROOT);
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private record DateResolution(
            String fromDate,
            String toDate,
            Integer durationDays
    ) {}

    private record ParsedSignals(
            Integer people,
            Integer durationDays,
            String fromDate,
            String toDate,
            String month,
            String dateFlexibilityHint,
            String destinationText,
            String countryText,
            String travelStyle,
            String budgetLevel,
            List<String> interests,
            List<String> mentionedDestinations
    ) {}

    private record DestinationResolution(
            List<String> codes,
            String destinationText,
            double score
    ) {}
}