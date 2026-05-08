import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { me as meApi } from "../api/authApi";
import { apiPost, apiPut } from "../api/http";

function HeroPill({ children }) {
    return (
        <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {children}
        </span>
    );
}

function SectionCard({ title, subtitle, children }) {
    return (
        <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-white/65">{subtitle}</p> : null}
            </div>
            {children}
        </div>
    );
}

function Input({ label, type = "text", value, onChange, placeholder, autoComplete, disabled = false }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-white/85">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
                className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-white/35 focus:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
            />
        </div>
    );
}

export default function ProfilePage() {
    const nav = useNavigate();

    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [twoFactorLoading, setTwoFactorLoading] = useState(false);

    const [err, setErr] = useState("");
    const [success, setSuccess] = useState("");

    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        twoFactorEnabled: false,
        emailVerified: false,
    });

    const [passwordForm, setPasswordForm] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            setLoading(true);
            setErr("");

            try {
                const u = await meApi();

                if (!active) return;

                setProfile({
                    firstName: u?.firstName || "",
                    lastName: u?.lastName || "",
                    email: u?.email || "",
                    username: u?.username || "",
                    twoFactorEnabled: !!u?.twoFactorEnabled,
                    emailVerified: !!u?.emailVerified,
                });
            } catch (e) {
                if (!active) return;
                setErr(e?.message || "Unable to load your profile.");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            active = false;
        };
    }, []);

    async function reloadProfile() {
        const fresh = await meApi();
        setProfile({
            firstName: fresh?.firstName || "",
            lastName: fresh?.lastName || "",
            email: fresh?.email || "",
            username: fresh?.username || "",
            twoFactorEnabled: !!fresh?.twoFactorEnabled,
            emailVerified: !!fresh?.emailVerified,
        });
    }

    async function handleProfileSave(e) {
        e.preventDefault();
        setErr("");
        setSuccess("");

        if (!profile.firstName.trim()) return setErr("Enter your first name.");
        if (!profile.lastName.trim()) return setErr("Enter your last name.");
        if (!profile.email.trim()) return setErr("Enter your email address.");

        setSavingProfile(true);
        try {
            const res = await apiPut("/api/profile", {
                firstName: profile.firstName.trim(),
                lastName: profile.lastName.trim(),
                email: profile.email.trim(),
            });

            setSuccess(res?.message || "Profile updated successfully.");
            await reloadProfile();
        } catch (e) {
            setErr(e?.message || "Profile update failed.");
        } finally {
            setSavingProfile(false);
        }
    }

    async function handlePasswordChange(e) {
        e.preventDefault();
        setErr("");
        setSuccess("");

        if (!passwordForm.oldPassword) return setErr("Enter your old password.");
        if (!passwordForm.newPassword) return setErr("Enter your new password.");
        if (passwordForm.newPassword.length < 8) {
            return setErr("New password must be at least 8 characters long.");
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return setErr("New password and confirm password do not match.");
        }

        setSavingPassword(true);
        try {
            const res = await apiPost("/api/profile/change-password", {
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
                confirmPassword: passwordForm.confirmPassword,
            });

            setSuccess(res?.message || "Password changed successfully.");
            setPasswordForm({
                oldPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } catch (e) {
            setErr(e?.message || "Password change failed.");
        } finally {
            setSavingPassword(false);
        }
    }

    async function handleTwoFactorToggle() {
        setErr("");
        setSuccess("");
        setTwoFactorLoading(true);

        try {
            if (profile.twoFactorEnabled) {
                const res = await apiPost("/api/auth/2fa/disable", {});
                setSuccess(res?.message || "Two-factor authentication disabled successfully.");
                setProfile((p) => ({ ...p, twoFactorEnabled: false }));
            } else {
                nav("/setup-2fa");
            }
        } catch (e) {
            setErr(e?.message || "Unable to update two-factor authentication.");
        } finally {
            setTwoFactorLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0b1620] px-4 py-24 text-white">
                <div className="mx-auto max-w-5xl">Loading profile...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b1620] text-white">
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1496950866446-3253e1470e8e?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,13,20,0.93)_0%,rgba(8,18,28,0.84)_34%,rgba(8,18,28,0.56)_70%,rgba(8,18,28,0.42)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_30%)]" />

                <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-24 lg:px-6">
                    <div className="mb-8">
                        <HeroPill>Account Settings</HeroPill>
                        <h1 className="mt-6 text-4xl font-extrabold md:text-5xl">My Profile</h1>
                        <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
                            Manage your account information, security settings, and two-factor authentication.
                        </p>
                    </div>

                    {err ? (
                        <div className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                            {err}
                        </div>
                    ) : null}

                    {success ? (
                        <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                            {success}
                        </div>
                    ) : null}

                    <div className="grid gap-6 lg:grid-cols-2">
                        <SectionCard title="Profile Information" subtitle="Update your basic account details.">
                            <form onSubmit={handleProfileSave} className="space-y-4">
                                <Input
                                    label="First Name"
                                    value={profile.firstName}
                                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                                    placeholder="Andreja"
                                    autoComplete="given-name"
                                />

                                <Input
                                    label="Last Name"
                                    value={profile.lastName}
                                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                                    placeholder="Dimkovski"
                                    autoComplete="family-name"
                                />

                                <Input
                                    label="Email"
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                        <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                                            Username
                                        </div>
                                        <div className="mt-1 text-sm text-white/90">
                                            {profile.username || "N/A"}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                        <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                                            Email status
                                        </div>
                                        <div className="mt-1 text-sm text-white/90">
                                            {profile.emailVerified ? "Verified" : "Not verified"}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="w-full rounded-2xl bg-[#2b5da8] px-4 py-3 font-semibold text-white transition hover:bg-[#214d8f] disabled:opacity-70"
                                >
                                    {savingProfile ? "Saving..." : "Update Profile"}
                                </button>
                            </form>
                        </SectionCard>

                        <SectionCard title="Account Security" subtitle="Change your password and manage 2FA.">
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <Input
                                    label="Old Password"
                                    type="password"
                                    value={passwordForm.oldPassword}
                                    onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                                    autoComplete="current-password"
                                />

                                <Input
                                    label="New Password"
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                                    autoComplete="new-password"
                                />

                                <Input
                                    label="Confirm New Password"
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                                    autoComplete="new-password"
                                />

                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                                >
                                    {savingPassword ? "Updating..." : "Change Password"}
                                </button>
                            </form>

                            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-sm font-semibold text-white">Two-Factor Authentication</div>
                                        <div className="mt-1 text-sm text-white/65">
                                            {profile.twoFactorEnabled
                                                ? "2FA is enabled for this account."
                                                : "Enable 2FA to protect your account."}
                                        </div>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            profile.twoFactorEnabled
                                                ? "bg-emerald-400/20 text-emerald-300"
                                                : "bg-amber-400/20 text-amber-300"
                                        }`}
                                    >
                                        {profile.twoFactorEnabled ? "Enabled" : "Disabled"}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleTwoFactorToggle}
                                    disabled={twoFactorLoading}
                                    className="mt-4 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/15 disabled:opacity-70"
                                >
                                    {twoFactorLoading
                                        ? "Please wait..."
                                        : profile.twoFactorEnabled
                                            ? "Disable 2FA"
                                            : "Enable 2FA"}
                                </button>
                            </div>
                        </SectionCard>
                    </div>
                </div>
            </section>
        </div>
    );
}
