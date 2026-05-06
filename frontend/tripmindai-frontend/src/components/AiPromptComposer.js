import { useEffect, useRef } from "react";

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

export default function AiPromptComposer({
                                             value,
                                             onChange,
                                             autoFocus = false,
                                             title = "Write your trip idea",
                                             subtitle = "Enter your request naturally and AI preview updates while you type.",
                                             badge = "Prompt",
                                             placeholder = "I want to go to New York just me, from 30.06.2026 to 07.07.2026 with medium budget...",
                                             minRows = 8,
                                             maxLength,
                                         }) {
    const promptRef = useRef(null);

    useEffect(() => {
        if (!autoFocus) return;
        const timer = setTimeout(() => promptRef.current?.focus?.(), 0);
        return () => clearTimeout(timer);
    }, [autoFocus]);

    return (
        <GlassCard className="p-6 bg-white/12 !border-white/15 !text-white backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <div className="text-xl font-bold text-white">{title}</div>
                    <div className="mt-1 text-sm text-white/70">{subtitle}</div>
                </div>

                <Badge tone="white">{badge}</Badge>
            </div>

            <div>
                <label className="mb-3 block text-sm font-medium text-white/80">
                    Prompt
                </label>

                <textarea
                    ref={promptRef}
                    rows={minRows}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    className="min-h-[260px] w-full resize-none rounded-[22px] border border-white/15 bg-white/10 px-5 py-5 text-[15px] leading-7 text-white placeholder:text-white/35 outline-none transition focus:border-white/30 focus:bg-white/15"
                />

                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-white/55">
                        Write destination, dates, people and style in one sentence.
                    </div>

                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                        {value?.length || 0}{maxLength ? ` / ${maxLength}` : ""} chars
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
