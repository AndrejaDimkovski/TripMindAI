package tripmindai.com.mk.maintripservice.dto.AI;

public record AiTripRequest(
        String prompt,
        String fromDate,
        String toDate,
        Integer people,
        String originCity,
        String budgetLevel
) {}