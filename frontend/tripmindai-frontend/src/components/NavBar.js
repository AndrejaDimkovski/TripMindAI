import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function NavBar() {
    const nav = useNavigate();
    const loc = useLocation();
    const { isAuthed, logout, user, loading, isAdmin } = useAuth();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [loc.pathname]);

    async function handleLogout() {
        await logout();
        nav("/login", { replace: true });
    }

    const hello = useMemo(() => {
        const u = user?.username || user?.name || user?.email || "";
        return u ? `Hi, ${u}` : "Signed in";
    }, [user]);

    const goHome = () => nav(isAuthed ? "/discover" : "/login");
    const isDiscover = loc.pathname === "/discover";

    const navWrapClass = isDiscover
        ? "fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-transparent text-white"
        : "sticky top-0 z-50 border-b bg-white/90 text-slate-900 shadow-sm backdrop-blur";

    const desktopLinkClass = (path) => {
        const active = loc.pathname === path;

        if (isDiscover) {
            return `px-4 py-2 rounded-full text-sm font-medium transition ${
                active
                    ? "bg-white/20 text-white backdrop-blur"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
            }`;
        }

        return `px-3 py-2 rounded-xl text-sm font-medium transition ${
            active ? "bg-emerald-500 text-white" : "text-slate-700 hover:bg-slate-100"
        }`;
    };

    const mobileLinkClass = (path) => {
        const active = loc.pathname === path;

        return `block px-4 py-3 rounded-2xl text-sm font-medium transition ${
            active
                ? "bg-emerald-500 text-white"
                : isDiscover
                    ? "text-white hover:bg-white/10"
                    : "text-slate-700 hover:bg-slate-100"
        }`;
    };

    return (
        <nav className={navWrapClass}>
            <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
                <div className="flex h-20 items-center justify-between">
                    <button onClick={goHome} className="flex items-center gap-3 font-bold">
                        <div className="flex h-13 w-13 items-center justify-center overflow-hidden">
                            <img
                                src="/web-app-manifest-512x512.png"
                                alt="TripMindAI logo"
                                className="h-20 w-20 object-contain"
                            />
                        </div>

                        <span className={`text-lg font-bold ${isDiscover ? "text-white" : "text-slate-900"}`}>
                            TripMindAI
                        </span>
                    </button>

                    {isAuthed && (
                        <div className="hidden md:flex items-center gap-3">
                            <Link to="/discover" className={desktopLinkClass("/discover")}>
                                Explore
                            </Link>

                            <Link to="/my-plans" className={desktopLinkClass("/my-plans")}>
                                My Plans
                            </Link>

                            <Link to="/profile" className={desktopLinkClass("/profile")}>
                                Profile
                            </Link>

                            {isAdmin && (
                                <Link to="/admin" className={desktopLinkClass("/admin")}>
                                    Admin
                                </Link>
                            )}
                        </div>
                    )}

                    <div className="hidden md:flex items-center gap-3">
                        {!isAuthed ? (
                            <>
                                <Link
                                    to="/login"
                                    className={`px-4 py-2 rounded-xl text-sm transition ${
                                        isDiscover
                                            ? "border border-white/25 text-white hover:bg-white/10"
                                            : "border hover:bg-slate-100"
                                    }`}
                                >
                                    Login
                                </Link>

                                <Link
                                    to="/register"
                                    className="px-4 py-2 rounded-xl bg-white-500 border border-black/10 text-black text-sm border hover:bg-slate-100"
                                >
                                    Register
                                </Link>
                            </>
                        ) : (
                            <>
                                <span
                                    className={`px-4 py-2 rounded-xl text-sm ${
                                        isDiscover
                                            ? "bg-white/10 text-white backdrop-blur"
                                            : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                    {hello}
                                </span>

                                <button
                                    onClick={handleLogout}
                                    disabled={loading}
                                    className={`px-4 py-2 rounded-xl text-sm transition ${
                                        isDiscover
                                            ? "border border-white/20 text-white hover:bg-white/10"
                                            : "border text-red-600 hover:bg-red-50"
                                    }`}
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setOpen((p) => !p)}
                        className={`md:hidden rounded-xl border p-2 ${
                            isDiscover ? "border-white/25 text-white" : "border-slate-300 text-slate-700"
                        }`}
                    >
                        ☰
                    </button>
                </div>

                {open && (
                    <div
                        className={`md:hidden pb-4 space-y-2 ${
                            isDiscover
                                ? "rounded-b-3xl border border-white/10 bg-black/30 p-3 backdrop-blur"
                                : ""
                        }`}
                    >
                        {isAuthed && (
                            <>
                                <Link to="/discover" className={mobileLinkClass("/discover")}>
                                    Explore
                                </Link>

                                <Link to="/my-plans" className={mobileLinkClass("/my-plans")}>
                                    My Plans
                                </Link>

                                <Link to="/profile" className={mobileLinkClass("/profile")}>
                                    Profile
                                </Link>

                                {isAdmin && (
                                    <Link to="/admin" className={mobileLinkClass("/admin")}>
                                        Admin
                                    </Link>
                                )}
                            </>
                        )}

                        <div className={`pt-3 flex flex-col gap-2 ${isDiscover ? "border-t border-white/10" : "border-t"}`}>
                            {!isAuthed ? (
                                <>
                                    <Link
                                        className={`px-4 py-3 rounded-2xl ${
                                            isDiscover ? "border border-white/20 text-white" : "border text-slate-700"
                                        }`}
                                        to="/login"
                                    >
                                        Login
                                    </Link>

                                    <Link
                                        className="px-4 py-3 rounded-2xl bg-emerald-500 text-white"
                                        to="/register"
                                    >
                                        Register
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <span
                                        className={`px-4 py-3 rounded-2xl text-sm ${
                                            isDiscover ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        {hello}
                                    </span>

                                    <button
                                        onClick={handleLogout}
                                        className={`px-4 py-3 rounded-2xl ${
                                            isDiscover ? "border border-white/20 text-white" : "border text-red-600"
                                        }`}
                                    >
                                        Logout
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
