import { NavLink, useNavigate } from "react-router-dom";
import { logoutUser } from "../api/authApi";
import "./NavBar.css";

export default function NavBar() {
    const nav = useNavigate();

    async function handleLogout() {
        try {
            await logoutUser();
        } catch (e) {}
        nav("/login");
    }

    return (
        <div className="nb-wrap">
            <div className="nb-inner">
                <div className="nb-left">
                    <span className="nb-brand">TravelMindAI</span>

                    <NavLink
                        to="/trips"
                        className={({ isActive }) => (isActive ? "nb-link active" : "nb-link")}
                    >
                        Trips
                    </NavLink>
                </div>

                <div className="nb-spacer" />

                <NavLink
                    to="/login"
                    className={({ isActive }) => (isActive ? "nb-link active" : "nb-link")}
                >
                    Login
                </NavLink>

                <NavLink
                    to="/register"
                    className={({ isActive }) => (isActive ? "nb-link active" : "nb-link")}
                >
                    Register
                </NavLink>

                <button className="nb-logout" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
}
