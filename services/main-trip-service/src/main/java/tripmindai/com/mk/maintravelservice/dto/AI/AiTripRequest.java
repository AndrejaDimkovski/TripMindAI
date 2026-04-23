package tripmindai.com.mk.maintravelservice.dto.AI;

public record AiTripRequest(
        String prompt,
        String fromDate,
        String toDate,
        int people,
        String originCity,
        String budgetLevel
) {}