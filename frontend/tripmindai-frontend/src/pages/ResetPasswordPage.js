import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/authApi";

function isValidPassword(password) {
    return password.length >= 8
        && /[A-Z]/.test(password)
        && /[0-9]/.test(password)
        && /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

export default function ResetPasswordPage() {
    const nav = useNavigate();
    const location = useLocation();
    const token = new URLSearchParams(location.search).get("token") || "";

    const [form, setForm] = useState({
        password: "",
        confirm: "",
    });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        if (!token) {
            setErr("Reset link is missing or invalid.");
            return;
        }

        if (!isValidPassword(form.password)) {
            setErr("Password must contain at least 8 characters, one uppercase letter, one number, and one special character.");
            return;
        }

        if (form.password !== form.confirm) {
            setErr("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await resetPassword({
                token,
                password: form.password,
            });

            nav("/login", {
                replace: true,
                state: { passwordReset: true },
            });
        } catch (e2) {
            setErr(e2?.message || "Could not reset password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b1620] px-4 text-white">
            <div className="w-full max-w-[460px] rounded-[28px] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
                <h1 className="text-3xl font-bold">Reset password</h1>
                <p className="mt-2 text-sm text-white/65">
                    Enter your new password and then log in again.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-5">
                    {err ? (
                        <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                            {err}
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-2 block text-sm font-medium text-white/85">
                            New password
                        </label>
                        <div className="flex overflow-hidden rounded-2xl border border-white/15 bg-white/10">
                            <input
                                type={showPw ? "text" : "password"}
                                value={form.password}
                                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                                className="w-full bg-transparent px-4 py-3 text-white outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((s) => !s)}
                                className="border-l border-white/10 px-4 text-sm font-semibold text-white/80 hover:bg-white/10"
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
                            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none"
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full rounded-[20px] bg-[#2b5da8] px-5 py-3.5 font-semibold text-white transition hover:bg-[#214d8f] disabled:cursor-not-allowed disabled:bg-[#2b5da880]"
                        type="submit"
                    >
                        {loading ? "Saving..." : "Reset password"}
                    </button>
                </form>

                <Link className="mt-6 inline-block text-sm font-semibold text-white/80 hover:text-white" to="/login">
                    Back to login
                </Link>
            </div>
        </div>
    );
}
