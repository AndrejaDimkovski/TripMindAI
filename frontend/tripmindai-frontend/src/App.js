import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import TwoFactorPage from "./pages/TwoFactorPage";
import SetupTwoFactorPage from "./pages/SetupTwoFactorPage";
import DiscoverPage from "./pages/DiscoverPage";
import AiPlannerPage from "./pages/AiPlannerPage";
import ManualPlannerPage from "./pages/ManualPlannerPage";
import FlightResultsPage from "./pages/FlightResultsPage";
import FlightDetailsPage from "./pages/FlightDetailsPage";
import HotelResultsPage from "./pages/HotelResultsPage";
import TripSummaryPage from "./pages/TripSummaryPage";
import HotelDetailsPage from "./pages/HotelDetailsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import DestinationDetailsPage from "./pages/DestinationDetailsPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import ProtectedAdminRoute from "./auth/ProtectedAdminRoute";
import { AuthProvider } from "./auth/AuthContext";
import MyPlansPage from "./pages/MyPlansPage";
import ProfilePage from "./pages/ProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <NavBar />

                <Routes>
                    <Route path="/" element={<Navigate to="/discover" replace />} />

                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/login/2fa" element={<TwoFactorPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />

                    <Route
                        path="/setup-2fa"
                        element={
                            <ProtectedRoute>
                                <SetupTwoFactorPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/discover"
                        element={
                            <ProtectedRoute>
                                <DiscoverPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/plan/ai"
                        element={
                            <ProtectedRoute>
                                <AiPlannerPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/plan/manual"
                        element={
                            <ProtectedRoute>
                                <ManualPlannerPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/plan/flights"
                        element={
                            <ProtectedRoute>
                                <FlightResultsPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/plan/hotels"
                        element={
                            <ProtectedRoute>
                                <HotelResultsPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/plan/summary"
                        element={
                            <ProtectedRoute>
                                <TripSummaryPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/my-plans"
                        element={
                            <ProtectedRoute>
                                <MyPlansPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/destinations/:cityCode"
                        element={
                            <ProtectedRoute>
                                <DestinationDetailsPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/hotels/:hotelId"
                        element={
                            <ProtectedRoute>
                                <HotelDetailsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/plan/flight-details"
                        element={
                            <ProtectedRoute>
                                <FlightDetailsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/forgot-password"
                        element={<ForgotPasswordPage />}
                    />
                    <Route
                        path="/reset-password"
                        element={<ResetPasswordPage />}
                    />

                    <Route
                        path="/admin"
                        element={
                            <ProtectedAdminRoute>
                                <AdminDashboardPage />
                            </ProtectedAdminRoute>
                        }
                    />

                    <Route
                        path="/admin/analytics"
                        element={
                            <ProtectedAdminRoute>
                                <AdminAnalyticsPage />
                            </ProtectedAdminRoute>
                        }
                    />

                    <Route path="*" element={<Navigate to="/discover" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
