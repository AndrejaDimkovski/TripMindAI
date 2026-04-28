package tripmindai.com.mk.maintravelservice.service.AI;

import java.util.List;
import java.util.Map;
import java.util.Set;

public final class TravelPromptMappings {

    private TravelPromptMappings() {}

    public static final int MAX_PROMPT_LENGTH = 1200;
    public static final int MAX_RESULTS = 5;

    public static final Map<String, String> LOCATION_ALIASES = Map.ofEntries(
            Map.entry("ny", "New York"),
            Map.entry("nyc", "New York"),
            Map.entry("new york city", "New York"),
            Map.entry("new york", "New York"),
            Map.entry("њујорк", "New York"),
            Map.entry("нюјорк", "New York"),

            Map.entry("la", "Los Angeles"),
            Map.entry("l.a.", "Los Angeles"),
            Map.entry("los angeles", "Los Angeles"),
            Map.entry("лос анџелес", "Los Angeles"),
            Map.entry("лос ангелес", "Los Angeles"),

            Map.entry("miami", "Miami"),
            Map.entry("мајами", "Miami"),

            Map.entry("rome", "Rome"),
            Map.entry("roma", "Rome"),
            Map.entry("рим", "Rome"),

            Map.entry("milan", "Milan"),
            Map.entry("milano", "Milan"),
            Map.entry("милано", "Milan"),

            Map.entry("venice", "Venice"),
            Map.entry("venezia", "Venice"),
            Map.entry("венеција", "Venice"),

            Map.entry("paris", "Paris"),
            Map.entry("париз", "Paris"),

            Map.entry("nice", "Nice"),
            Map.entry("ница", "Nice"),

            Map.entry("lyon", "Lyon"),
            Map.entry("лион", "Lyon"),

            Map.entry("barcelona", "Barcelona"),
            Map.entry("барселона", "Barcelona"),

            Map.entry("madrid", "Madrid"),
            Map.entry("мадрид", "Madrid"),

            Map.entry("palma", "Palma de Mallorca"),
            Map.entry("palma de mallorca", "Palma de Mallorca"),
            Map.entry("mallorca", "Palma de Mallorca"),
            Map.entry("majorca", "Palma de Mallorca"),
            Map.entry("палма", "Palma de Mallorca"),
            Map.entry("мајорка", "Palma de Mallorca"),

            Map.entry("bangkok", "Bangkok"),
            Map.entry("bankok", "Bangkok"),
            Map.entry("banqkok", "Bangkok"),
            Map.entry("bangcok", "Bangkok"),
            Map.entry("bagnkok", "Bangkok"),
            Map.entry("бангкок", "Bangkok"),
            Map.entry("банкок", "Bangkok"),
            Map.entry("bkk", "Bangkok"),

            Map.entry("phuket", "Phuket"),
            Map.entry("пукет", "Phuket"),

            Map.entry("chiang mai", "Chiang Mai"),
            Map.entry("чианг мај", "Chiang Mai"),
            Map.entry("cnx", "Chiang Mai"),

            Map.entry("istanbul", "Istanbul"),
            Map.entry("constantinople", "Istanbul"),
            Map.entry("истанбул", "Istanbul"),
            Map.entry("стамбол", "Istanbul"),

            Map.entry("antalya", "Antalya"),
            Map.entry("анталија", "Antalya"),

            Map.entry("izmir", "Izmir"),
            Map.entry("измир", "Izmir")
    );

    public static final Map<String, String> COUNTRY_ALIASES = Map.ofEntries(
            Map.entry("usa", "United States"),
            Map.entry("u.s.a", "United States"),
            Map.entry("us", "United States"),
            Map.entry("america", "United States"),
            Map.entry("америка", "United States"),
            Map.entry("сад", "United States"),

            Map.entry("north america", "United States"),

            Map.entry("uk", "United Kingdom"),
            Map.entry("u.k.", "United Kingdom"),
            Map.entry("britain", "United Kingdom"),
            Map.entry("great britain", "United Kingdom"),
            Map.entry("england", "United Kingdom"),
            Map.entry("велика британија", "United Kingdom"),

            Map.entry("macedonia", "North Macedonia"),
            Map.entry("north macedonia", "North Macedonia"),
            Map.entry("македонија", "North Macedonia"),
            Map.entry("северна македонија", "North Macedonia"),

            Map.entry("greece", "Greece"),
            Map.entry("грција", "Greece"),
            Map.entry("hellas", "Greece"),

            Map.entry("germany", "Germany"),
            Map.entry("германија", "Germany"),
            Map.entry("deutschland", "Germany"),

            Map.entry("italy", "Italy"),
            Map.entry("italia", "Italy"),
            Map.entry("италија", "Italy"),

            Map.entry("france", "France"),
            Map.entry("francia", "France"),
            Map.entry("франција", "France"),

            Map.entry("spain", "Spain"),
            Map.entry("espana", "Spain"),
            Map.entry("españa", "Spain"),
            Map.entry("шпанија", "Spain"),

            Map.entry("thailand", "Thailand"),
            Map.entry("тајланд", "Thailand"),

            Map.entry("turkey", "Turkey"),
            Map.entry("turkiye", "Turkey"),
            Map.entry("türkiye", "Turkey"),
            Map.entry("турција", "Turkey")
    );

    public static final Map<String, Integer> MONTH_ALIASES = Map.ofEntries(
            Map.entry("january", 1), Map.entry("jan", 1), Map.entry("јануари", 1),
            Map.entry("february", 2), Map.entry("feb", 2), Map.entry("февруари", 2),
            Map.entry("march", 3), Map.entry("mar", 3), Map.entry("март", 3),
            Map.entry("april", 4), Map.entry("apr", 4), Map.entry("април", 4),
            Map.entry("may", 5), Map.entry("мај", 5),
            Map.entry("june", 6), Map.entry("jun", 6), Map.entry("јуни", 6),
            Map.entry("july", 7), Map.entry("jul", 7), Map.entry("јули", 7),
            Map.entry("august", 8), Map.entry("aug", 8), Map.entry("август", 8),
            Map.entry("september", 9), Map.entry("sep", 9), Map.entry("sept", 9), Map.entry("септември", 9),
            Map.entry("october", 10), Map.entry("oct", 10), Map.entry("октомври", 10),
            Map.entry("november", 11), Map.entry("nov", 11), Map.entry("ноември", 11),
            Map.entry("december", 12), Map.entry("dec", 12), Map.entry("декември", 12)
    );

    public static final Map<String, String> SEASON_TO_MONTH = Map.ofEntries(
            Map.entry("summer", "july"),
            Map.entry("лето", "july"),
            Map.entry("winter", "december"),
            Map.entry("зима", "december"),
            Map.entry("spring", "april"),
            Map.entry("пролет", "april"),
            Map.entry("autumn", "october"),
            Map.entry("fall", "october"),
            Map.entry("есен", "october")
    );

    public static final Map<String, String> DATE_FLEXIBILITY_KEYWORDS = Map.ofEntries(
            Map.entry("end of month", "END_OF_MONTH"),
            Map.entry("late in the month", "END_OF_MONTH"),
            Map.entry("крајот на месецот", "END_OF_MONTH"),
            Map.entry("при крајот на месецот", "END_OF_MONTH"),

            Map.entry("start of month", "START_OF_MONTH"),
            Map.entry("beginning of month", "START_OF_MONTH"),
            Map.entry("почеток на месецот", "START_OF_MONTH"),
            Map.entry("почетокот на месецот", "START_OF_MONTH"),

            Map.entry("middle of the month", "MID_MONTH"),
            Map.entry("mid month", "MID_MONTH"),
            Map.entry("mid-month", "MID_MONTH"),
            Map.entry("средина на месецот", "MID_MONTH"),
            Map.entry("во средина на месецот", "MID_MONTH"),

            Map.entry("next month", "NEXT_MONTH"),
            Map.entry("следен месец", "NEXT_MONTH"),
            Map.entry("нареден месец", "NEXT_MONTH"),

            Map.entry("weekend", "WEEKEND"),
            Map.entry("next weekend", "WEEKEND"),
            Map.entry("викенд", "WEEKEND"),
            Map.entry("следен викенд", "WEEKEND")
    );

    public static final Map<String, String> BUDGET_KEYWORDS = Map.ofEntries(
            Map.entry("low budget", "low"),
            Map.entry("budget friendly", "low"),
            Map.entry("cheap", "low"),
            Map.entry("affordable", "low"),
            Map.entry("low-cost", "low"),
            Map.entry("low cost", "low"),
            Map.entry("economic", "low"),
            Map.entry("economy", "low"),
            Map.entry("евтино", "low"),
            Map.entry("ефтино", "low"),
            Map.entry("низок буџет", "low"),
            Map.entry("low", "low"),

            Map.entry("medium budget", "medium"),
            Map.entry("mid budget", "medium"),
            Map.entry("mid-range", "medium"),
            Map.entry("mid range", "medium"),
            Map.entry("moderate budget", "medium"),
            Map.entry("average budget", "medium"),
            Map.entry("standard budget", "medium"),
            Map.entry("среден буџет", "medium"),
            Map.entry("medium", "medium"),
            Map.entry("moderate", "medium"),
            Map.entry("mid", "medium"),
            Map.entry("middle", "medium"),
            Map.entry("mid price", "medium"),
            Map.entry("medium price", "medium"),
            Map.entry("not expensive", "medium"),
            Map.entry("not too expensive", "medium"),
            Map.entry("average", "medium"),

            Map.entry("high budget", "high"),
            Map.entry("luxury", "high"),
            Map.entry("premium", "high"),
            Map.entry("luxurious", "high"),
            Map.entry("expensive", "high"),
            Map.entry("луксуз", "high"),
            Map.entry("луксузно", "high"),
            Map.entry("висок буџет", "high"),
            Map.entry("high", "high")
    );

    public static final Map<String, String> TRAVEL_STYLE_KEYWORDS = Map.ofEntries(
            Map.entry("romantic", "romantic"),
            Map.entry("романтично", "romantic"),
            Map.entry("романтика", "romantic"),

            Map.entry("family", "family"),
            Map.entry("семејно", "family"),
            Map.entry("family trip", "family"),

            Map.entry("adventure", "adventure"),
            Map.entry("авантура", "adventure"),
            Map.entry("hiking", "adventure"),
            Map.entry("planinarenje", "adventure"),

            Map.entry("beach", "beach"),
            Map.entry("sea", "beach"),
            Map.entry("island", "beach"),
            Map.entry("плажа", "beach"),
            Map.entry("море", "beach"),
            Map.entry("остров", "beach"),

            Map.entry("city break", "city-break"),
            Map.entry("citybreak", "city-break"),
            Map.entry("urban", "city-break"),
            Map.entry("grad", "city-break"),
            Map.entry("град", "city-break"),
            Map.entry("city", "city-break"),

            Map.entry("nature", "nature"),
            Map.entry("mountain", "nature"),
            Map.entry("lake", "nature"),
            Map.entry("природа", "nature"),
            Map.entry("планина", "nature"),
            Map.entry("езеро", "nature"),

            Map.entry("relax", "relax"),
            Map.entry("spa", "relax"),
            Map.entry("wellness", "relax"),
            Map.entry("одмор", "relax"),
            Map.entry("релакс", "relax")
    );

    public static final Map<String, String> INTEREST_KEYWORDS = Map.ofEntries(
            Map.entry("food", "food"),
            Map.entry("restaurant", "food"),
            Map.entry("restaurants", "food"),
            Map.entry("local food", "food"),
            Map.entry("храна", "food"),
            Map.entry("ресторани", "food"),

            Map.entry("walk", "walks"),
            Map.entry("walking", "walks"),
            Map.entry("stroll", "walks"),
            Map.entry("пешачење", "walks"),
            Map.entry("шетање", "walks"),

            Map.entry("beach", "beach"),
            Map.entry("sea", "beach"),
            Map.entry("swimming", "beach"),
            Map.entry("плажа", "beach"),
            Map.entry("море", "beach"),

            Map.entry("museum", "culture"),
            Map.entry("culture", "culture"),
            Map.entry("history", "culture"),
            Map.entry("architecture", "culture"),
            Map.entry("култура", "culture"),
            Map.entry("историја", "culture"),
            Map.entry("музеј", "culture"),

            Map.entry("nature", "nature"),
            Map.entry("mountain", "nature"),
            Map.entry("forest", "nature"),
            Map.entry("lake", "nature"),
            Map.entry("природа", "nature"),
            Map.entry("планина", "nature"),
            Map.entry("шума", "nature"),

            Map.entry("nightlife", "nightlife"),
            Map.entry("party", "nightlife"),
            Map.entry("bars", "nightlife"),
            Map.entry("club", "nightlife"),
            Map.entry("забава", "nightlife"),
            Map.entry("ноќен живот", "nightlife"),

            Map.entry("shopping", "shopping"),
            Map.entry("mall", "shopping"),
            Map.entry("шопинг", "shopping"),

            Map.entry("kids", "family"),
            Map.entry("children", "family"),
            Map.entry("деца", "family")
    );

    public static final Map<String, Integer> PEOPLE_KEYWORDS = Map.ofEntries(
            Map.entry("just me", 1),
            Map.entry("solo", 1),
            Map.entry("alone", 1),
            Map.entry("only me", 1),
            Map.entry("myself", 1),
            Map.entry("сам", 1),
            Map.entry("сама", 1),
            Map.entry("еден", 1),
            Map.entry("едно лице", 1),

            Map.entry("couple", 2),
            Map.entry("for two", 2),
            Map.entry("two people", 2),
            Map.entry("two persons", 2),
            Map.entry("двајца", 2),
            Map.entry("за двајца", 2),
            Map.entry("2 ppl", 2),
            Map.entry("2 people", 2),
            Map.entry("2 persons", 2),
            Map.entry("2 person", 2),
            Map.entry("for 2", 2),
            Map.entry("me and my friend", 2),
            Map.entry("me and friend", 2),
            Map.entry("me and my girlfriend", 2),
            Map.entry("me and my boyfriend", 2),
            Map.entry("me and my wife", 2),
            Map.entry("me and my husband", 2),
            Map.entry("we are two", 2),
            Map.entry("we are 2", 2),
            Map.entry("2 adults", 2),
            Map.entry("two adults", 2),

            Map.entry("for three", 3),
            Map.entry("three people", 3),
            Map.entry("three persons", 3),
            Map.entry("тројца", 3),
            Map.entry("за тројца", 3),
            Map.entry("friends", 3),
            Map.entry("3 adults", 3),
            Map.entry("three adults", 3),

            Map.entry("for four", 4),
            Map.entry("four people", 4),
            Map.entry("four persons", 4),
            Map.entry("четворица", 4),
            Map.entry("за четворица", 4),
            Map.entry("4 adults", 4),
            Map.entry("four adults", 4),

            Map.entry("family", 3),
            Map.entry("семејство", 3)
    );

    public static final Map<String, Integer> DURATION_KEYWORDS = Map.ofEntries(
            Map.entry("one day", 1),
            Map.entry("1 day", 1),
            Map.entry("еден ден", 1),

            Map.entry("two days", 2),
            Map.entry("2 days", 2),
            Map.entry("two nights", 2),
            Map.entry("2 nights", 2),
            Map.entry("два дена", 2),
            Map.entry("две ноќи", 2),

            Map.entry("three days", 3),
            Map.entry("3 days", 3),
            Map.entry("three nights", 3),
            Map.entry("3 nights", 3),

            Map.entry("four days", 4),
            Map.entry("4 days", 4),
            Map.entry("four nights", 4),
            Map.entry("4 nights", 4),

            Map.entry("five days", 5),
            Map.entry("5 days", 5),
            Map.entry("five nights", 5),
            Map.entry("5 nights", 5),

            Map.entry("six days", 6),
            Map.entry("6 days", 6),
            Map.entry("six nights", 6),
            Map.entry("6 nights", 6),

            Map.entry("seven days", 7),
            Map.entry("7 days", 7),
            Map.entry("seven nights", 7),
            Map.entry("7 nights", 7),
            Map.entry("one week", 7),
            Map.entry("a week", 7),
            Map.entry("една недела", 7),

            Map.entry("ten days", 10),
            Map.entry("10 days", 10),

            Map.entry("two weeks", 14),
            Map.entry("2 weeks", 14),
            Map.entry("две недели", 14)
    );

    public static final Map<String, List<String>> REGION_DEFAULT_CODES = Map.ofEntries(
            Map.entry("europe", List.of("ROM", "PAR", "BCN", "MAD", "VCE")),
            Map.entry("европа", List.of("ROM", "PAR", "BCN", "MAD", "VCE")),
            Map.entry("mediterranean", List.of("PMI", "AYT", "BCN", "NCE", "IZM")),
            Map.entry("mediteran", List.of("PMI", "AYT", "BCN", "NCE", "IZM")),
            Map.entry("балкан", List.of("IST", "ROM", "BCN")),
            Map.entry("balkans", List.of("IST", "ROM", "BCN")),
            Map.entry("asia", List.of("BKK", "HKT", "CNX")),
            Map.entry("азија", List.of("BKK", "HKT", "CNX")),
            Map.entry("america", List.of("NYC", "MIA", "LAX")),
            Map.entry("usa", List.of("NYC", "MIA", "LAX")),
            Map.entry("united states", List.of("NYC", "MIA", "LAX"))
    );

    public static final Map<String, List<String>> STYLE_DEFAULT_CODES = Map.ofEntries(
            Map.entry("beach", List.of("HKT", "AYT", "PMI", "NCE", "MIA")),
            Map.entry("city-break", List.of("PAR", "ROM", "BCN", "MAD", "NYC")),
            Map.entry("romantic", List.of("PAR", "VCE", "ROM", "NCE", "PMI")),
            Map.entry("family", List.of("PMI", "AYT", "MIA", "BCN", "BKK")),
            Map.entry("adventure", List.of("CNX", "HKT", "AYT", "IZM", "MIA")),
            Map.entry("nature", List.of("CNX", "NCE", "IZM", "AYT", "PMI")),
            Map.entry("relax", List.of("HKT", "PMI", "AYT", "NCE", "BKK")),
            Map.entry("general", List.of("ROM", "PAR", "BCN", "BKK", "NYC"))
    );

    public static final Set<String> BUDGET_VALUES = Set.of("low", "medium", "high");

    public static final Set<String> FLEX_VALUES = Set.of(
            "START_OF_MONTH", "MID_MONTH", "END_OF_MONTH", "NEXT_MONTH", "WEEKEND"
    );
}
