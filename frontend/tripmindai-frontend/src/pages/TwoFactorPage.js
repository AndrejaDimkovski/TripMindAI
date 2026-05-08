import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginUser2fa } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";

export default function TwoFactorPage() {
    const nav = useNavigate();
    const location = useLocation();
    const { loginWithToken } = useAuth();

    const email = location.state?.email || "";

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
        if (!email) {
            nav("/login", { replace: true });
        }
    }, [email, nav]);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        if (!email) return setErr("Missing email address for 2FA verification.");
        if (!code.trim()) return setErr("Enter your 2FA code.");

        setLoading(true);
        try {
            const res = await loginUser2fa({
                email,
                code: code.trim(),
            });

            if (!res?.token) {
                throw new Error("The server did not return an authentication token.");
            }

            loginWithToken(res.token, res);
            nav("/discover", { replace: true });
        } catch (e2) {
            setErr(e2?.message || "2FA verification failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
                <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
                <p className="mt-2 text-sm text-white/70">
                    Enter the 6-digit code from Google Authenticator.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    {err ? (
                        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                            {err}
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-2 block text-sm text-white/85">Email</label>
                        <input
                            value={email}
                            disabled
                            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/70 outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-white/85">2FA code</label>
                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
                            placeholder="123456"
                            inputMode="numeric"
                            maxLength={6}
                            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-70"
                    >
                        {loading ? "Verifying..." : "Verify and Log In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
