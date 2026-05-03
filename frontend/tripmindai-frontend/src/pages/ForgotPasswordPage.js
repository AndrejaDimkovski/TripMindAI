import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/authApi";

function isValidEmail(email) {
    return /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(email);
}

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [sent, setSent] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        if (!email.trim()) {
            setErr("Enter your email.");
            return;
        }

        if (!isValidEmail(email.trim())) {
            setErr("Email is not valid.");
            return;
        }

        setLoading(true);
        try {
            await forgotPassword({ email: email.trim() });
            setSent(true);
        } catch (e2) {
            setErr(e2?.message || "Could not send reset link.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b1620] px-4 text-white">
            <div className="w-full max-w-[460px] rounded-[28px] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
                <h1 className="text-3xl font-bold">Forgot password</h1>
                <p className="mt-2 text-sm text-white/65">
                    Enter your email and we will send you a password reset link.
                </p>

                {sent ? (
                    <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                        If that email exists, a reset link has been sent.
                    </div>
                ) : (
                    <form onSubmit={onSubmit} className="mt-6 space-y-5">
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
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/35 focus:bg-white/15"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full rounded-[20px] bg-[#2b5da8] px-5 py-3.5 font-semibold text-white transition hover:bg-[#214d8f] disabled:cursor-not-allowed disabled:bg-[#2b5da880]"
                            type="submit"
                        >
                            {loading ? "Sending..." : "Send reset link"}
                        </button>
                    </form>
                )}

                <Link className="mt-6 inline-block text-sm font-semibold text-white/80 hover:text-white" to="/login">
                    Back to login
                </Link>
            </div>
        </div>
    );
}
