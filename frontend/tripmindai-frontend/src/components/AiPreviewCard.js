function GlassCard({ children, className = "" }) {
    return (
        <div className={`rounded-[30px] border border-white/10 bg-white/78 shadow-xl backdrop-blur ${className}`}>
            {children}
        </div>
    );
}

function Badge({ children, tone = "light" }) {
    const styles = {
        light: "bg-slate-100 text-slate-700",
        green: "bg-emerald-100 text-emerald-700",
        blue: "bg-blue-100 text-blue-700",
        yellow: "bg-amber-100 text-amber-700",
        white: "bg-white/90 text-slate-900",
        red: "bg-rose-100 text-rose-700",
    };

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone] || styles.light}`}>
            {children}
        </span>
    );
}

export default function AiPreviewCard({
                                          tripMode,
                                          livePromptState,
                                          detectedDatesText,
                                          detectedPeople,
                                          budgetPreview,
                                          previewPriceRangeText,
                                          selectedDestinationName,
                                          aiPreview,
                                      }) {
    const destinationStatus = aiPreview?.isUnsupportedDestination
        ? aiPreview.notes
        : selectedDestinationName;

    const detectedDurationText = aiPreview?.extractedDurationDays
        ? `${aiPreview.extractedDurationDays} days`
        : "Will be detected from text";

    const detectedPeopleText = detectedPeople
        ? `${detectedPeople} traveler${Number(detectedPeople) > 1 ? "s" : ""}`
        : "Will be detected from text";

    return (
        <GlassCard className="p-6 bg-white/12 !border-white/15 !text-white backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <div className="text-xl font-bold text-white">AI preview</div>
                    <div className="mt-1 text-sm text-white/70">
                        Live interpretation while you type
                    </div>
                </div>
                <Badge tone="white">{livePromptState}</Badge>
            </div>

            <div className="space-y-3">
                <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Trip mode
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                        {tripMode === "HOTEL_ONLY" ? "Hotel only" : "Flight + Hotel"}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Detected dates
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                        {detectedDatesText}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Date flexibility
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                        {aiPreview?.dateFlexibilityHint || "Not specified"}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Detected duration
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                        {detectedDurationText}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Detected people
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                        {detectedPeopleText}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Detected budget
                    </div>

                    <div className="mt-2 text-sm font-semibold text-white">
                        {budgetPreview.label}
                    </div>

                    <div className="mt-2 text-sm text-white/75">
                        {budgetPreview.description}
                    </div>

                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                        Expected hotel range: {budgetPreview.rangeText}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Search price filter
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                        {previewPriceRangeText}
                    </div>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                        Destination status
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                        {destinationStatus}
                    </div>
                </div>

                {aiPreview?.isUnsupportedDestination ? (
                    <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-100">
                        {aiPreview.notes}
                    </div>
                ) : null}

                {aiPreview?.needsClarification && !aiPreview?.isUnsupportedDestination ? (
                    <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                        AI is not fully sure about the destination. Results may be approximate.
                    </div>
                ) : null}
            </div>
        </GlassCard>
    );
}
