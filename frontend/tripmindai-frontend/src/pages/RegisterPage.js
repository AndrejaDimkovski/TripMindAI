import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/authApi";

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

export default function RegisterPage() {
    const nav = useNavigate();

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirm: "",
    });

    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        if (!form.firstName.trim()) return setErr("Enter your first name.");
        if (!form.lastName.trim()) return setErr("Enter your last name.");
        if (!form.email.trim()) return setErr("Enter your email.");
        if (!form.password) return setErr("Enter your password.");
        if (form.password.length < 8) return setErr("Password must be at least 8 characters long.");
        if (form.password !== form.confirm) return setErr("Passwords do not match.");

        setLoading(true);
        try {
            await registerUser({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                password: form.password,
            });

            nav("/verify-email", {
                replace: true,
                state: { email: form.email.trim() },
            });
        } catch (e2) {
            setErr(e2?.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0b1620]">
            <section className="relative min-h-screen overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,14,20,0.84)_0%,rgba(8,18,28,0.62)_36%,rgba(8,18,28,0.30)_68%,rgba(8,18,28,0.22)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_30%)]" />

                <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-12 pt-28 lg:px-6">
                    <div className="flex flex-1 items-center">
                        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                            <div className="relative pt-6 lg:pt-0">
                                <div className="lg:pl-4">
                                    <Pill>Create account</Pill>

                                    <h1 className="mt-8 text-5xl font-extrabold uppercase leading-none text-white md:text-6xl xl:text-[6rem]">
                                        Register
                                    </h1>

                                    <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">
                                        Join TravelMindAI and start building your next trip.
                                    </p>

                                    <div className="mt-8 flex flex-wrap gap-3">
                                        <Pill tone="green">Smart planning</Pill>
                                        <Pill>Flights</Pill>
                                        <Pill>Hotels</Pill>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end">
                                <div className="w-full max-w-[560px]">
                                    <GlassPanel className="p-6 text-white lg:p-8">
                                        <div className="mb-8 flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-13 w-13 items-center justify-center overflow-hidden">
                                                    <img
                                                        src="/web-app-manifest-512x512.png"
                                                        alt="TripMindAI logo"
                                                        className="h-14 w-14 object-contain"
                                                    />
                                                </div>

                                                <div>
                                                    <div className="text-2xl font-bold text-white">Create account</div>
                                                    <div className="text-sm text-white/65">
                                                        Start your TravelMindAI journey
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
                                                    {err}
                                                </div>
                                            ) : null}

                                            <div className="grid gap-5 sm:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-white/85">
                                                        First name
                                                    </label>
                                                    <input
                                                        value={form.firstName}
                                                        onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                                                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-white/85">
                                                        Last name
                                                    </label>
                                                    <input
                                                        value={form.lastName}
                                                        onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                                                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-white/85">
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={form.email}
                                                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none"
                                                />
                                            </div>

                                            <div className="grid gap-5 sm:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-white/85">
                                                        Password
                                                    </label>
                                                    <div className="flex overflow-hidden rounded-2xl border border-white/15 bg-white/10">
                                                        <input
                                                            type={showPw ? "text" : "password"}
                                                            value={form.password}
                                                            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
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

                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-white/85">
                                                        Confirm password
                                                    </label>
                                                    <input
                                                        type={showPw ? "text" : "password"}
                                                        value={form.confirm}
                                                        onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                                                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                className="w-full rounded-[20px] bg-[#2b5da8] px-5 py-3.5 font-semibold text-white transition hover:bg-[#214d8f] disabled:cursor-not-allowed disabled:bg-[#2b5da880]"
                                                disabled={loading}
                                                type="submit"
                                            >
                                                {loading ? "Creating..." : "Register"}
                                            </button>
                                        </form>

                                        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
                                            <span>
                                                Already have an account?{" "}
                                                <Link className="font-semibold text-white hover:text-white/80" to="/login">
                                                    Login
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
