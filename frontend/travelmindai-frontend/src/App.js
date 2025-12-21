import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TripSearchPage from "./pages/TripSearchPage";
import DemoCheckoutPage from "./pages/DemoCheckoutPage";

function App() {
    return (
        <BrowserRouter>
            <NavBar />
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
                <Routes>
                    <Route path="/" element={<Navigate to="/trips" />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/trips" element={<TripSearchPage />} />
                    <Route path="/checkout" element={<DemoCheckoutPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
