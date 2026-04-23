import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function activityColor(type) {
    switch (String(type || "").toLowerCase()) {
        case "museum":
            return "#6366f1";
        case "restaurant":
            return "#f59e0b";
        case "walking_route":
            return "#10b981";
        case "park":
            return "#22c55e";
        case "shopping":
            return "#ec4899";
        case "viewpoint":
            return "#8b5cf6";
        case "beach":
            return "#0ea5e9";
        case "nightlife":
            return "#111827";
        default:
            return "#198754";
    }
}

function activityEmoji(type) {
    switch (String(type || "").toLowerCase()) {
        case "museum":
            return "🏛️";
        case "restaurant":
            return "🍽️";
        case "walking_route":
            return "🚶";
        case "park":
            return "🌳";
        case "shopping":
            return "🛍️";
        case "viewpoint":
            return "🌇";
        case "beach":
            return "🏖️";
        case "nightlife":
            return "🌙";
        default:
            return "📍";
    }
}

function activityTypeText(type) {
    const raw = String(type || "").replaceAll("_", " ").trim();
    if (!raw) return "Activity";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function createNumberedIcon(number, type) {
    const color = activityColor(type);
    const emoji = activityEmoji(type);

    return L.divIcon({
        className: "tm-map-marker-root",
        html: `
      <div class="tm-map-marker-shell">
        <div class="tm-map-marker-pin" style="background:${color}; box-shadow: 0 10px 22px ${color}33;">
          <span class="tm-map-marker-num">${number}</span>
        </div>
        <div class="tm-map-marker-emoji">${emoji}</div>
      </div>
    `,
        iconSize: [46, 54],
        iconAnchor: [23, 44],
        popupAnchor: [0, -34],
    });
}

function FitBounds({ points, routePoints }) {
    const map = useMap();

    useEffect(() => {
        const allPoints = [
            ...(points || []).map((p) => p.position),
            ...(routePoints || []),
        ];

        if (!allPoints.length) return;

        if (allPoints.length === 1) {
            map.setView(allPoints[0], 14, { animate: true });
            return;
        }

        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, {
            padding: [42, 42],
            animate: true,
        });
    }, [map, points, routePoints]);

    return null;
}

function spreadOverlappingPoints(points) {
    const seen = new Map();

    return points.map((point) => {
        const lat = Number(point.position[0]);
        const lng = Number(point.position[1]);
        const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;

        const count = seen.get(key) || 0;
        seen.set(key, count + 1);

        if (count === 0) return point;

        const angle = count * 0.9;
        const radius = 0.00025 * count;

        return {
            ...point,
            position: [
                lat + Math.cos(angle) * radius,
                lng + Math.sin(angle) * radius,
            ],
        };
    });
}

function safeText(v, fallback = "—") {
    if (v == null) return fallback;
    const s = String(v).trim();
    return s ? s : fallback;
}

function fmtMinutes(v) {
    const n = Number(v || 0);
    return Number.isFinite(n) && n > 0 ? `${n} min` : "—";
}

function routePositionsFromDay(day) {
    const route = day?.routeCoordinates || [];
    return route
        .filter((p) => p?.lat != null && p?.lng != null)
        .map((p) => [Number(p.lat), Number(p.lng)])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
}

export default function TripItineraryMap({ day }) {
    const points = useMemo(() => {
        const rawPoints = (day?.activities || [])
            .filter((a) => a?.lat != null && a?.lng != null)
            .map((a, idx) => ({
                id: `${idx}-${a.name || "activity"}`,
                order: idx + 1,
                name: safeText(a.name, `Activity ${idx + 1}`),
                description: safeText(a.description, "No description available."),
                type: safeText(a.type, "landmark"),
                timeSlot: safeText(a.timeSlot, "—"),
                zoneName: safeText(a.zoneName, "—"),
                estimatedMinutes: a.estimatedMinutes,
                optional: !!a.optional,
                position: [Number(a.lat), Number(a.lng)],
            }))
            .filter(
                (p) =>
                    Number.isFinite(p.position[0]) &&
                    Number.isFinite(p.position[1])
            );

        return spreadOverlappingPoints(rawPoints);
    }, [day]);

    const center = useMemo(() => {
        return points.length ? points[0].position : [41.9981, 21.4254];
    }, [points]);

    const fallbackPolyline = useMemo(() => {
        return points.map((p) => p.position);
    }, [points]);

    const routePolyline = useMemo(() => routePositionsFromDay(day), [day]);

    if (!points.length) {
        return (
            <div className="h-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                <div className="border-b border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-sm font-semibold text-white">Route map</div>
                    <div className="text-xs text-white/55">No coordinates available for this day</div>
                </div>

                <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                    <div className="text-5xl">🗺️</div>
                    <div className="mt-4 text-lg font-semibold text-white">
                        No map points available
                    </div>
                    <div className="mt-2 max-w-sm text-sm text-white/65">
                        This itinerary day does not contain valid coordinates for activities.
                    </div>
                </div>
            </div>
        );
    }

    const activeLine = routePolyline.length > 1 ? routePolyline : fallbackPolyline;

    return (
        <div className="h-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
            <style>
                {`
                    .tm-map-wrap .leaflet-container {
                        background: #0f1b26;
                        font-family: inherit;
                    }

                    .tm-map-wrap .leaflet-control-zoom a {
                        background: rgba(16, 33, 49, 0.92);
                        color: #fff;
                        border: 1px solid rgba(255,255,255,0.12);
                    }

                    .tm-map-wrap .leaflet-control-zoom a:hover {
                        background: rgba(28, 52, 74, 0.98);
                    }

                    .tm-map-wrap .leaflet-popup-content-wrapper {
                        background: #f8fafc;
                        color: #0f172a;
                        border-radius: 18px;
                    }

                    .tm-map-wrap .leaflet-popup-tip {
                        background: #f8fafc;
                    }

                    .tm-map-marker-root {
                        background: transparent;
                        border: 0;
                    }

                    .tm-map-marker-shell {
                        position: relative;
                        width: 46px;
                        height: 54px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .tm-map-marker-pin {
                        position: absolute;
                        inset: 6px 6px 10px 6px;
                        border-radius: 18px 18px 18px 4px;
                        transform: rotate(45deg);
                        border: 2px solid rgba(255,255,255,0.92);
                    }

                    .tm-map-marker-num {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transform: rotate(-45deg);
                        color: #fff;
                        font-weight: 800;
                        font-size: 14px;
                    }

                    .tm-map-marker-emoji {
                        position: absolute;
                        right: -2px;
                        top: -2px;
                        width: 22px;
                        height: 22px;
                        border-radius: 999px;
                        background: rgba(255,255,255,0.96);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        box-shadow: 0 6px 14px rgba(15,23,42,0.22);
                    }
                `}
            </style>

            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
                <div>
                    <div className="text-sm font-semibold text-white">Route map</div>
                    <div className="text-xs text-white/55">
                        {points.length} stop{points.length > 1 ? "s" : ""} plotted on the map
                    </div>
                </div>

                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Interactive
                </div>
            </div>

            <div className="tm-map-wrap h-[460px] w-full">
                <MapContainer
                    center={center}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                >
                    <FitBounds points={points} routePoints={routePolyline} />

                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {activeLine.length > 1 && (
                        <Polyline
                            positions={activeLine}
                            pathOptions={{
                                color: "#10b981",
                                weight: 6,
                                opacity: 0.9,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                    )}

                    {points.map((point, idx) => (
                        <Marker
                            key={point.id}
                            position={point.position}
                            icon={createNumberedIcon(idx + 1, point.type)}
                        >
                            <Popup>
                                <div className="w-[240px]">
                                    <div className="text-sm font-bold text-slate-900">
                                        {idx + 1}. {point.name}
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                            {activityEmoji(point.type)} {activityTypeText(point.type)}
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                            🕒 {point.timeSlot}
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                            ⏱ {fmtMinutes(point.estimatedMinutes)}
                                        </span>
                                    </div>

                                    <div className="mt-3 text-xs leading-6 text-slate-600">
                                        {point.description}
                                    </div>

                                    <div className="mt-3 text-[11px] text-slate-500">
                                        📍 Zone: {point.zoneName}
                                    </div>

                                    {point.optional && (
                                        <div className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                            Optional stop
                                        </div>
                                    )}

                                    <div className="mt-3 text-[11px] text-slate-400">
                                        {Number(point.position[0]).toFixed(6)}, {Number(point.position[1]).toFixed(6)}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
