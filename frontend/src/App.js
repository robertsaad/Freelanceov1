import { useEffect, useState, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import FreelancersList from "@/pages/FreelancersList";
import FreelancerProfile from "@/pages/FreelancerProfile";
import Dashboard from "@/pages/Dashboard";
import EditProfile from "@/pages/EditProfile";
import Messages from "@/pages/Messages";
import HiringRequests from "@/pages/HiringRequests";
import Pricing from "@/pages/Pricing";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Feed from "@/pages/Feed";
import Notifications from "@/pages/Notifications";
import JobsList from "@/pages/JobsList";
import JobDetail from "@/pages/JobDetail";
import PostJob from "@/pages/PostJob";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export { API, BACKEND_URL };

// Auth Provider Component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  };

  const register = async (email, password, name, role) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, role }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  };

  const loginWithGoogle = async (sessionId, role = "freelancer") => {
    const response = await axios.post(`${API}/auth/google-session`, { session_id: sessionId, role }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route Component
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Google OAuth Callback Handler
function OAuthCallback() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processOAuth = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.slice(1));
      const sessionId = params.get("session_id");
      const role = localStorage.getItem("oauth_role") || "freelancer";

      if (sessionId) {
        try {
          await loginWithGoogle(sessionId, role);
          localStorage.removeItem("oauth_role");
          window.history.replaceState(null, "", window.location.pathname);
          toast.success("Successfully logged in!");
          navigate("/dashboard");
        } catch (error) {
          toast.error("Authentication failed");
          navigate("/login");
        }
      } else {
        setProcessing(false);
      }
    };

    processOAuth();
  }, [loginWithGoogle, navigate]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
}

function AppRoutes() {
  const location = useLocation();

  // Check for OAuth callback
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("session_id")) {
      // OAuth callback detected
    }
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<><OAuthCallback /><Landing /></>} />
      <Route path="/login" element={<><OAuthCallback /><Login /></>} />
      <Route path="/register" element={<Register />} />
      <Route path="/freelancers" element={<FreelancersList />} />
      <Route path="/freelancers/:id" element={<FreelancerProfile />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <Feed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/profile"
        element={
          <ProtectedRoute roles={["freelancer"]}>
            <EditProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/requests"
        element={
          <ProtectedRoute>
            <HiringRequests />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
