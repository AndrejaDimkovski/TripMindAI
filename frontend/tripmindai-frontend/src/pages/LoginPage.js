import { useEffect, useState } from "react";
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

function isValidEmail(email) {
    return /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(email);
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

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get("token");
        const error = params.get("error");

        if (error === "google_email_missing") {
            setErr("Google account email is missing.");
            return;
        }

        if (token) {
            loginWithToken(token);
            nav("/discover", { replace: true });
        }
    }, [location.search, loginWithToken, nav]);

    function startGoogleLogin() {
        window.location.href = "http://localhost:8080/oauth2/authorization/google";
    }

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        if (!form.email.trim()) {
            setErr("Enter your email.");
            return;
        }

        if (!isValidEmail(form.email.trim())) {
            setErr("Email is not valid.");
            return;
        }

        if (!form.password) {
            setErr("Enter your password.");
            return;
        }

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
                throw new Error("Token was not returned by the server.");
            }

            loginWithToken(res.token, res);

            const from = location.state?.from;
            nav(from || "/discover", { replace: true });
        } catch (e2) {
            setErr(e2?.message || "Login failed.");
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
                                        Continue planning smarter trips with TripMindAI.
                                    </p>

                                    <div className="mt-8 flex flex-wrap gap-3">
                                        <Pill tone="green">AI trips</Pill>
                                        <Pill>Hotels + Flights</Pill>
                                        <Pill>Hotels</Pill>
                                        <Pill>Activities</Pill>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end">
                                <div className="w-full max-w-[520px]">
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

                                        <div className="mb-5">
                                            <button
                                                type="button"
                                                onClick={startGoogleLogin}
                                                className="flex w-full items-center justify-center gap-3 rounded-[20px] border border-white/20 bg-white px-5 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100"
                                            >
                                                <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                                                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.207 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                                                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.351 4.337-17.694 10.691z" />
                                                    <path fill="#4CAF50" d="M24 44c5.168 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.143 35.091 26.715 36 24 36c-5.186 0-9.62-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                                                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                                                </svg>
                                                <span>Continue with Google</span>
                                            </button>
                                        </div>

                                        <div className="mb-5 text-center text-sm text-white/50">or</div>

                                        <form onSubmit={onSubmit} className="space-y-5">
                                            {err ? (
                                                <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                                    {err}
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
                                                <Link
                                                    to="/forgot-password"
                                                    className="text-sm font-semibold text-white/80 transition hover:text-white"
                                                >
                                                    Forgot password?
                                                </Link>
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
