import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { confirm2fa, setup2fa } from "../api/authApi";

function HeroPill({ children }) {
    return (
        <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {children}
        </span>
    );
}

export default function Setup2faPage() {
    const nav = useNavigate();

    const [secret, setSecret] = useState("");
    const [otpAuthUrl, setOtpAuthUrl] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [err, setErr] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let active = true;

        async function loadSetup() {
            setLoading(true);
            setErr("");

            try {
                const res = await setup2fa();

                if (!active) return;

                setSecret(res?.secret || "");
                setOtpAuthUrl(res?.otpAuthUrl || "");
            } catch (e) {
                if (!active) return;
                setErr(e?.message || "Failed to start 2FA setup.");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadSetup();

        return () => {
            active = false;
        };
    }, []);

    const qrCodeUrl = useMemo(() => {
        if (!otpAuthUrl) return "";
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpAuthUrl)}`;
    }, [otpAuthUrl]);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        setSuccess("");

        if (!code.trim()) {
            setErr("Enter your 2FA code.");
            return;
        }

        setConfirming(true);
        try {
            const res = await confirm2fa({
                code: code.trim(),
            });

            setSuccess(res?.message || "2FA enabled successfully.");

            setTimeout(() => {
                nav("/profile", { replace: true });
            }, 900);
        } catch (e) {
            setErr(e?.message || "2FA confirmation failed.");
        } finally {
            setConfirming(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b1620] px-4 text-white">
            <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
                <HeroPill>Security Setup</HeroPill>

                <h1 className="mt-6 text-3xl font-bold">Set up Two-Factor Authentication</h1>
                <p className="mt-2 text-sm text-white/70">
                    Scan the QR code with Google Authenticator, then enter the 6-digit code to confirm.
                </p>

                {loading ? (
                    <div className="mt-6 text-sm text-white/70">Loading 2FA setup...</div>
                ) : (
                    <>
                        {err ? (
                            <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                {err}
                            </div>
                        ) : null}

                        {success ? (
                            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                                {success}
                            </div>
                        ) : null}

                        {qrCodeUrl ? (
                            <div className="mt-6 flex justify-center">
                                <div className="rounded-[28px] border border-white/10 bg-white p-4 shadow-xl">
                                    <img
                                        src={qrCodeUrl}
                                        alt="2FA QR code"
                                        className="h-[220px] w-[220px] rounded-xl object-contain"
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="mb-2 block text-sm text-white/85">Secret</label>
                                <input
                                    value={secret}
                                    readOnly
                                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/80 outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm text-white/85">OTP Auth URL</label>
                                <textarea
                                    value={otpAuthUrl}
                                    readOnly
                                    rows={4}
                                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/80 outline-none"
                                />
                            </div>
                        </div>

                        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                                disabled={confirming}
                                className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                            >
                                {confirming ? "Confirming..." : "Enable 2FA"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
