import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyEmailCode } from "../api/authApi";

function HeroPill({ children }) {
    return (
        <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {children}
        </span>
    );
}

export default function VerifyEmailPage() {
    const nav = useNavigate();
    const location = useLocation();

    const email = location.state?.email || "";

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [success, setSuccess] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        setSuccess("");

        if (!email.trim()) {
            setErr("Email address is missing. Please register again.");
            return;
        }

        if (!code.trim()) {
            setErr("Enter the verification code.");
            return;
        }

        setLoading(true);
        try {
            const res = await verifyEmailCode({
                email: email.trim(),
                code: code.trim(),
            });

            setSuccess(res?.message || "Email verified successfully.");

            setTimeout(() => {
                nav("/login", {
                    replace: true,
                    state: { verifiedEmail: email.trim() },
                });
            }, 900);
        } catch (e2) {
            setErr(e2?.message || "Verification failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b1620] px-4 text-white">
            <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
                <HeroPill>Email Verification</HeroPill>

                <h1 className="mt-6 text-3xl font-bold">Verify your email</h1>

                <p className="mt-2 text-sm text-white/70">
                    Enter the 6-digit verification code sent to your email address.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    {err ? (
                        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                            {err}
                        </div>
                    ) : null}

                    {success ? (
                        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                            {success}
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-2 block text-sm text-white/85">
                            Verification code
                        </label>

                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
                            placeholder="123456"
                            inputMode="numeric"
                            maxLength={6}
                            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/35 focus:bg-white/15"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                    >
                        {loading ? "Verifying..." : "Verify email"}
                    </button>
                </form>
            </div>
        </div>
    );
}
