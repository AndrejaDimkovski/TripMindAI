import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/authApi";

export default function LoginPage() {
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        try {
            await loginUser({ username, password });
            nav("/trips");
        } catch {
            setErr("Login failed.");
        }
    }

    return (
        <div>
            <h2>Login</h2>
            {err && <p style={{ color: "tomato" }}>{err}</p>}
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="password" />
                <button type="submit">Login</button>
            </form>
        </div>
    );
}
