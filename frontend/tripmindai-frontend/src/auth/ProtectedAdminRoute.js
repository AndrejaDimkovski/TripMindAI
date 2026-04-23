import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedAdminRoute({ children }) {
    const { loading, isAuthed, isAdmin } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="p-4 text-white">Loading...</div>;
    }

    if (!isAuthed) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (!isAdmin) {
        return <Navigate to="/discover" replace />;
    }

    return children;
}
