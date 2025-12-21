import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../api/authApi";

export default function RegisterPage() {
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        try {
            await registerUser({ username, email, password });
            nav("/login");
        } catch {
            setErr("Register failed.");
        }
    }

    return (
        <div>
            <h2>Register</h2>
            {err && <p style={{ color: "tomato" }}>{err}</p>}
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="password" />
                <button type="submit">Create account</button>
            </form>
        </div>
    );
}
