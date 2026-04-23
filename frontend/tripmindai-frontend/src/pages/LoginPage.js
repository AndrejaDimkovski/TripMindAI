import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";

function Pill({ children, tone = "light" }) {
    const styles = {
        light: "border border-white/15 bg-white/15 text-white",
        white: "bg-white/90 text-slate-900",
        green: "bg-emerald-100 text-emerald-700",
    };

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone] || styles.light}`}>
            {children}
        </span>
    );
}

function GlassPanel({ children, className = "" }) {
    return (
        <div className={`rounded-[28px] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl ${className}`}>
            {children}
        </div>
    );
}

export default function LoginPage() {
    const nav = useNavigate();
    const location = useLocation();
    const { loginWithToken } = useAuth();

    const [form, setForm] = useState({
        email: location.state?.verifiedEmail || "",
        password: "",
    });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        if (!form.email.trim()) return setErr("Внеси email.");
        if (!form.password) return setErr("Внеси password.");

        setLoading(true);
        try {
            const res = await loginUser({
                email: form.email.trim(),
                password: form.password,
            });

            if (res?.requires2fa) {
                nav("/login/2fa", {
                    replace: true,
                    state: { email: res.emailAddress || form.email.trim() },
                });
                return;
            }

            if (!res?.token) {
                throw new Error("Token не е вратен од сервер.");
            }

            loginWithToken(res.token, res);

            const from = location.state?.from;
            nav(from || "/discover", { replace: true });
        } catch (e2) {
            setErr(e2?.message || "Login не успеа.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.84)_0%,rgba(8,18,28,0.62)_36%,rgba(8,18,28,0.30)_68%,rgba(8,18,28,0.22)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_30%)]" />

                <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-12 pt-28 lg:px-6">
                    <div className="flex flex-1 items-center">
                        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                            <div className="relative pt-6 lg:pt-0">
                                <div className="lg:pl-4">
                                    <Pill>Welcome back</Pill>

                                    <h1 className="mt-8 text-5xl font-extrabold uppercase leading-none text-white md:text-6xl xl:text-[6rem]">
                                        Login
                                    </h1>

                                    <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">
                                        Continue planning smarter trips with TravelMindAI.
                                    </p>

                                    <div className="mt-8 flex flex-wrap gap-3">
                                        <Pill tone="green">AI trips</Pill>
                                        <Pill>Hotels</Pill>
                                        <Pill>Saved plans</Pill>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end">
                                <div className="w-full max-w-[520px]">
                                    <GlassPanel className="p-6 text-white lg:p-8">
                                        <div className="mb-8 flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-lg font-bold text-slate-900 shadow-lg">
                                                    TM
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-white">Sign in</div>
                                                    <div className="text-sm text-white/65">
                                                        Continue to your travel dashboard
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                                                onClick={() => nav("/discover")}
                                                type="button"
                                            >
                                                ← Back
                                            </button>
                                        </div>

                                        <form onSubmit={onSubmit} className="space-y-5">
                                            {err ? (
                                                <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                                    ⚠️ {err}
                                                </div>
                                            ) : null}

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-white/85">
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={form.email}
                                                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                                    placeholder="you@example.com"
                                                    autoComplete="email"
                                                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/35 focus:bg-white/15"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-white/85">
                                                    Password
                                                </label>
                                                <div className="flex overflow-hidden rounded-2xl border border-white/15 bg-white/10 transition focus-within:border-white/35 focus-within:bg-white/15">
                                                    <input
                                                        type={showPw ? "text" : "password"}
                                                        value={form.password}
                                                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                                                        placeholder="••••••••"
                                                        autoComplete="current-password"
                                                        className="w-full bg-transparent px-4 py-3 text-white placeholder:text-white/35 outline-none"
                                                    />
                                                    <button
                                                        className="border-l border-white/10 px-4 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                                                        type="button"
                                                        onClick={() => setShowPw((s) => !s)}
                                                    >
                                                        {showPw ? "Hide" : "Show"}
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                className="w-full rounded-[20px] bg-[#2b5da8] px-5 py-3.5 font-semibold text-white transition hover:bg-[#214d8f] disabled:cursor-not-allowed disabled:bg-[#2b5da880]"
                                                disabled={loading}
                                                type="submit"
                                            >
                                                {loading ? "Signing in..." : "Login"}
                                            </button>
                                        </form>

                                        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
                                            <span>
                                                No account?{" "}
                                                <Link className="font-semibold text-white hover:text-white/80" to="/register">
                                                    Register
                                                </Link>
                                            </span>
                                        </div>
                                    </GlassPanel>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
