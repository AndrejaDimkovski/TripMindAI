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

        if (!email) return setErr("Недостасува email за 2FA.");
        if (!code.trim()) return setErr("Внеси 2FA code.");

        setLoading(true);
        try {
            const res = await loginUser2fa({
                email,
                code: code.trim(),
            });

            if (!res?.token) {
                throw new Error("Token не е вратен од сервер.");
            }

            loginWithToken(res.token, res);
            nav("/discover", { replace: true });
        } catch (e2) {
            setErr(e2?.message || "2FA verification не успеа.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
                <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
                <p className="mt-2 text-sm text-white/70">
                    Внеси го 6-digit кодот од Google Authenticator.
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
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="123456"
                            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-70"
                    >
                        {loading ? "Verifying..." : "Verify & Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}