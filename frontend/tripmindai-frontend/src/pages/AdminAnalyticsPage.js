import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminAnalyticsSummary } from "../api/adminAnalyticsApi";

function numberValue(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

function fmtNumber(value) {
    return new Intl.NumberFormat("en").format(numberValue(value));
}

function fmtPercent(value, total) {
    const n = numberValue(value);
    const t = numberValue(total);
    if (t <= 0) return "0%";
    return `${Math.round((n / t) * 100)}%`;
}

function percentWidth(value, total) {
    const n = numberValue(value);
    const t = numberValue(total);
    if (t <= 0) return "0%";
    return `${Math.min(100, Math.round((n / t) * 100))}%`;
}

function HeroPill({ children }) {
    return (
        <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {children}
        </span>
    );
}

function HeroButton({ children, primary = false, className = "", ...props }) {
    return (
        <button
            {...props}
            className={`rounded-[18px] px-5 py-3 text-sm font-semibold transition ${
                primary
                    ? "bg-[#2b5da8] text-white shadow-lg hover:bg-[#214d8f] disabled:cursor-not-allowed disabled:bg-[#2b5da880]"
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            } ${className}`}
        >
            {children}
        </button>
    );
}

function GlassPanel({ children, className = "" }) {
    return (
        <div className={`rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl ${className}`}>
            {children}
        </div>
    );
}

function GlassSection({ title, subtitle, children, className = "" }) {
    return (
        <GlassPanel className={`p-5 text-white lg:p-6 ${className}`}>
            <div className="mb-5">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
            </div>
            {children}
        </GlassPanel>
    );
}

function StatCard({ label, value, note, tone = "blue" }) {
    const tones = {
        blue: "from-blue-500/25 to-sky-400/10 border-blue-300/20",
        green: "from-emerald-500/25 to-lime-400/10 border-emerald-300/20",
        yellow: "from-amber-500/25 to-orange-400/10 border-amber-300/20",
        rose: "from-rose-500/25 to-pink-400/10 border-rose-300/20",
        violet: "from-violet-500/25 to-indigo-400/10 border-violet-300/20",
        slate: "from-slate-500/25 to-white/5 border-white/10",
    };

    return (
        <div className={`rounded-[26px] border bg-gradient-to-br p-5 ${tones[tone] || tones.blue}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                {label}
            </div>
            <div className="mt-3 text-4xl font-black text-white">{value}</div>
            {note ? <div className="mt-2 text-sm leading-6 text-white/70">{note}</div> : null}
        </div>
    );
}

function BreakdownRow({ label, value, total, tone = "bg-emerald-300" }) {
    return (
        <div className="rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-sm font-bold text-white">
                    {fmtNumber(value)} / {fmtPercent(value, total)}
                </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${tone}`} style={{ width: percentWidth(value, total) }} />
            </div>
        </div>
    );
}

function RankedList({ items = [], total = 0 }) {
    if (!items.length) {
        return (
            <div className="rounded-2xl bg-white/10 px-4 py-5 text-sm text-white/65">
                No saved trip data yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="rounded-2xl bg-white/10 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xs font-black text-slate-900">
                                {idx + 1}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">{item.label || "N/A"}</div>
                                <div className="mt-1 text-xs text-white/50">Saved trip plans</div>
                            </div>
                        </div>
                        <div className="text-sm font-bold text-white">
                            {fmtNumber(item.count)} / {fmtPercent(item.count, total)}
                        </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-sky-300"
                            style={{ width: percentWidth(item.count, total) }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ title, message }) {
    return (
        <GlassPanel className="p-6 text-white">
            <div className="text-lg font-bold">{title}</div>
            <div className="mt-2 text-sm leading-6 text-white/70">{message}</div>
        </GlassPanel>
    );
}

export default function AdminAnalyticsPage() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadSummary() {
        setLoading(true);
        setError("");

        try {
            const data = await getAdminAnalyticsSummary();
            setSummary(data || {});
        } catch (e) {
            setError(e.message || "Failed to load analytics.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSummary();
    }, []);

    const totals = useMemo(() => {
        const s = summary || {};
        return {
            users: numberValue(s.registeredUsers ?? s.totalUsers),
            allAccounts: numberValue(s.totalUsers),
            verifiedUsers: numberValue(s.verifiedUsers),
            plans: numberValue(s.totalPlans),
            usersWithPlans: numberValue(s.usersWithPlans),
            flightHotelPlans: numberValue(s.flightHotelPlans),
            hotelOnlyPlans: numberValue(s.hotelOnlyPlans),
            countries: numberValue(s.countries),
            destinations: numberValue(s.destinations),
            averagePlansPerUser: Number(s.averagePlansPerUser || 0).toFixed(2),
            popularDestination: s.popularDestination || { label: "N/A", count: 0 },
            popularCountry: s.popularCountry || { label: "N/A", count: 0 },
            topDestinations: Array.isArray(s.topDestinations) ? s.topDestinations : [],
            topCountries: Array.isArray(s.topCountries) ? s.topCountries : [],
        };
    }, [summary]);

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="fixed inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center bg-fixed" />
                <div className="fixed inset-0 bg-[linear-gradient(100deg,rgba(6,13,20,0.94)_0%,rgba(8,18,28,0.82)_38%,rgba(8,18,28,0.48)_100%)]" />
                <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_30%)]" />

                <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-20 pt-24 lg:px-6">
                    <div className="grid items-start gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="pt-6 lg:pt-8">
                            <HeroPill>Admin Analytics</HeroPill>

                            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.08] text-white md:text-5xl xl:text-[4rem]">
                                Platform overview
                            </h1>

                            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                                Track TripMindAI platform numbers: registered users, saved trip plans,
                                popular destinations, destination content and travel mode distribution.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <HeroButton primary onClick={loadSummary} disabled={loading}>
                                    {loading ? "Refreshing..." : "Refresh analytics"}
                                </HeroButton>
                                <HeroButton onClick={() => navigate("/admin")}>
                                    Manage content
                                </HeroButton>
                            </div>
                        </div>

                        <GlassSection title="Snapshot" subtitle="High-level admin metrics">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <StatCard
                                    label="Registered users"
                                    value={fmtNumber(totals.users)}
                                    note={`Admins excluded / ${fmtPercent(totals.verifiedUsers, totals.users)} verified`}
                                    tone="green"
                                />
                                <StatCard
                                    label="Plans"
                                    value={fmtNumber(totals.plans)}
                                    note={`${totals.averagePlansPerUser} plans per user`}
                                    tone="blue"
                                />
                            </div>
                        </GlassSection>
                    </div>

                    {error ? (
                        <div className="mt-8">
                            <EmptyState title="Analytics unavailable" message={error} />
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="mt-8">
                            <EmptyState title="Loading analytics" message="Fetching the latest platform numbers..." />
                        </div>
                    ) : null}

                    {!loading && !error ? (
                        <div className="mt-8 grid gap-6">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <StatCard label="Registered users" value={fmtNumber(totals.users)} tone="green" />
                                <StatCard label="Saved plans" value={fmtNumber(totals.plans)} note="All saved trip plans" tone="blue" />
                                <StatCard label="Popular destination" value={totals.popularDestination.label || "N/A"} note={`${fmtNumber(totals.popularDestination.count)} saved plan${totals.popularDestination.count === 1 ? "" : "s"}`} tone="yellow" />
                                <StatCard label="Popular country" value={totals.popularCountry.label || "N/A"} note={`${fmtNumber(totals.popularCountry.count)} saved plan${totals.popularCountry.count === 1 ? "" : "s"}`} tone="violet" />
                            </div>

                            <div className="grid gap-6 xl:grid-cols-2">
                                <GlassSection title="User analytics" subtitle="Account health and adoption">
                                    <div className="space-y-3">
                                        <BreakdownRow label="Verified registered users" value={totals.verifiedUsers} total={totals.users} tone="bg-emerald-300" />
                                        <BreakdownRow label="Unverified registered users" value={Math.max(totals.users - totals.verifiedUsers, 0)} total={totals.users} tone="bg-amber-300" />
                                        <BreakdownRow label="Users with saved plans" value={totals.usersWithPlans} total={totals.users} tone="bg-violet-300" />
                                        <BreakdownRow label="Users without saved plans" value={Math.max(totals.users - totals.usersWithPlans, 0)} total={totals.users} tone="bg-sky-300" />
                                    </div>
                                </GlassSection>

                                <GlassSection title="Trip analytics" subtitle="Saved plans by travel mode">
                                    <div className="space-y-3">
                                        <BreakdownRow label="Flight + Hotel" value={totals.flightHotelPlans} total={totals.plans} tone="bg-blue-300" />
                                        <BreakdownRow label="Hotel only" value={totals.hotelOnlyPlans} total={totals.plans} tone="bg-emerald-300" />
                                    </div>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <StatCard
                                            label="Active planners"
                                            value={fmtNumber(totals.usersWithPlans)}
                                            note="Users who saved at least one plan"
                                            tone="slate"
                                        />
                                        <StatCard
                                            label="Avg plans/user"
                                            value={totals.averagePlansPerUser}
                                            note="Based on registered users"
                                            tone="rose"
                                        />
                                    </div>
                                </GlassSection>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-2">
                                <GlassSection title="Top destinations" subtitle="Most selected destinations in saved plans">
                                    <RankedList items={totals.topDestinations} total={totals.plans} />
                                </GlassSection>

                                <GlassSection title="Top countries" subtitle="Most selected countries in saved plans">
                                    <RankedList items={totals.topCountries} total={totals.plans} />
                                </GlassSection>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <StatCard label="Countries" value={fmtNumber(totals.countries)} note="Managed country records" tone="yellow" />
                                <StatCard label="Destinations" value={fmtNumber(totals.destinations)} note="Available destination records" tone="violet" />
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}
