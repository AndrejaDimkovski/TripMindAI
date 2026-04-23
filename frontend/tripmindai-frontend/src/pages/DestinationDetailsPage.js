import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/http";

const BACKEND_BASE = API_BASE || "http://localhost:8080";
const FLOW_STORAGE_KEY = "tm_flow_v1";

function readFlowState() {
    try {
        const raw = sessionStorage.getItem(FLOW_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function buildImageUrl(path, fallback) {
    if (!path) return fallback;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${BACKEND_BASE}${path}`;
}

function displayValue(value, fallback = "—") {
    if (value == null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    return value;
}

function InfoCard({ label, value }) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                {label}
            </div>
            <div className="text-sm font-semibold text-white">{displayValue(value)}</div>
        </div>
    );
}

function Badge({ children, tone = "light" }) {
    const styles = {
        light: "border border-white/15 bg-white/10 text-white backdrop-blur",
        green: "bg-emerald-100 text-emerald-700",
        blue: "bg-blue-100 text-blue-700",
        white: "bg-white/90 text-slate-800",
    };

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone] || styles.light}`}>
            {children}
        </span>
    );
}

function GlassPanel({ children, className = "" }) {
    return (
        <div className={`rounded-[32px] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl ${className}`}>
            {children}
        </div>
    );
}

function HeroButton({ children, primary = false, className = "", ...props }) {
    return (
        <button
            {...props}
            className={`rounded-[20px] px-5 py-3 font-semibold transition ${
                primary
                    ? "bg-[#2b5da8] text-white hover:bg-[#214d8f]"
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
            } ${className}`}
        >
            {children}
        </button>
    );
}

export default function DestinationDetailsPage() {
    const nav = useNavigate();
    const { cityCode } = useParams();
    const location = useLocation();

    const flow = useMemo(() => readFlowState(), []);
    const flowDestination =
        flow?.destination?.cityCode === cityCode ? flow.destination : null;

    const destination = location.state?.destination || flowDestination || null;
    const countryName =
        location.state?.countryName ||
        flow?.country?.name ||
        "";
    const countryCode =
        location.state?.countryCode ||
        flow?.country?.code ||
        destination?.countryCode ||
        "";

    const destinationName = destination?.name || cityCode || "Destination";
    const description =
        destination?.description?.trim() ||
        "No description available for this destination yet.";

    const imageUrl = buildImageUrl(
        destination?.imageUrl,
        `${BACKEND_BASE}/images/destinations/default-destination.jpg`
    );

    const coordinates =
        destination?.latitude != null && destination?.longitude != null
            ? `${Number(destination.latitude).toFixed(4)}, ${Number(destination.longitude).toFixed(4)}`
            : "—";

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
                <section className="relative mb-8 min-h-[78vh] overflow-hidden rounded-[34px] shadow-2xl">
                    <img
                        src={imageUrl}
                        alt={destinationName}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = `${BACKEND_BASE}/images/destinations/default-destination.jpg`;
                        }}
                    />

                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.84)_0%,rgba(8,18,28,0.58)_36%,rgba(8,18,28,0.22)_68%,rgba(8,18,28,0.18)_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_28%)]" />

                    <div className="relative z-10 flex min-h-[78vh] flex-col justify-between px-6 py-8 lg:px-10 lg:py-10">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <Badge tone="light">Destination Details</Badge>

                                <h1 className="mt-5 text-5xl font-extrabold uppercase leading-none text-white drop-shadow-lg md:text-6xl xl:text-[6.5rem]">
                                    {destinationName}
                                </h1>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Badge tone="white">{displayValue(countryName, "Country")}</Badge>
                                    <Badge tone="white">{displayValue(destination?.cityCode || cityCode)}</Badge>
                                    {coordinates !== "—" ? <Badge tone="white">{coordinates}</Badge> : null}
                                </div>

                                <p className="mt-6 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                                    {description}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <HeroButton onClick={() => nav(-1)} type="button">
                                    ← Back
                                </HeroButton>

                                <HeroButton primary onClick={() => nav("/discover")} type="button">
                                    Back to Explore
                                </HeroButton>
                            </div>
                        </div>

                        <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
                            <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-white backdrop-blur">
                                <div className="text-2xl font-bold">{displayValue(countryName)}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/65">
                                    Country
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-white backdrop-blur">
                                <div className="text-2xl font-bold">{displayValue(destination?.cityCode || cityCode)}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/65">
                                    City Code
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-white backdrop-blur">
                                <div className="truncate text-2xl font-bold">{displayValue(countryCode)}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/65">
                                    Country Code
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <GlassPanel className="p-6 text-white lg:p-8">
                        <div className="mb-5">
                            <div className="text-xs uppercase tracking-[0.18em] text-white/55">
                                About
                            </div>
                            <h2 className="mt-2 text-2xl font-bold text-white">
                                Explore this destination
                            </h2>
                        </div>

                        <p className="whitespace-pre-line text-sm leading-8 text-white/75">
                            {description}
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <HeroButton primary onClick={() => nav("/discover")} type="button">
                                Back to Explore
                            </HeroButton>

                            <HeroButton onClick={() => nav(-1)} type="button">
                                Previous page
                            </HeroButton>
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-6 text-white lg:p-8">
                        <div className="mb-5">
                            <div className="text-xs uppercase tracking-[0.18em] text-white/55">
                                Destination facts
                            </div>
                            <h2 className="mt-2 text-2xl font-bold text-white">
                                Key information
                            </h2>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <InfoCard label="Destination" value={destination?.name} />
                            <InfoCard label="Country" value={countryName} />
                            <InfoCard label="Country code" value={countryCode} />
                            <InfoCard label="City code" value={destination?.cityCode || cityCode} />
                            <InfoCard label="Latitude" value={destination?.latitude} />
                            <InfoCard label="Longitude" value={destination?.longitude} />
                        </div>

                        <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-5">
                            <div className="text-xs uppercase tracking-[0.18em] text-white/55">
                                Coordinates
                            </div>
                            <div className="mt-2 text-lg font-bold text-white">{coordinates}</div>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}
