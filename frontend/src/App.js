import { useEffect, useState, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import FreelancersList from "@/pages/FreelancersList";
import FreelancerProfile from "@/pages/FreelancerProfile";
import Dashboard from "@/pages/Dashboard";
import EditProfile from "@/pages/EditProfile";
import FreelancerOnboarding from "@/pages/FreelancerOnboarding";
import Billing from "@/pages/Billing";
import Statistics from "@/pages/Statistics";
import AccountHealth from "@/pages/AccountHealth";
import Contracts from "@/pages/Contracts";
import ContractDetail from "@/pages/ContractDetail";
import Messages from "@/pages/Messages";
import HiringRequests from "@/pages/HiringRequests";
import Pricing from "@/pages/Pricing";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Feed from "@/pages/Feed";
import Notifications from "@/pages/Notifications";
import JobsList from "@/pages/JobsList";
import JobDetail from "@/pages/JobDetail";
import PostJob from "@/pages/PostJob";
import Admin from "@/pages/Admin";

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

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
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
        path="/onboarding"
        element={
          <ProtectedRoute roles={["freelancer"]}>
            <FreelancerOnboarding />
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
        path="/dashboard/billing"
        element={
          <ProtectedRoute roles={["freelancer"]}>
            <Billing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/stats"
        element={
          <ProtectedRoute roles={["freelancer"]}>
            <Statistics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/account-health"
        element={
          <ProtectedRoute roles={["freelancer"]}>
            <AccountHealth />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/contracts"
        element={
          <ProtectedRoute>
            <Contracts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/contracts/:id"
        element={
          <ProtectedRoute>
            <ContractDetail />
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
      <Route path="/jobs" element={<JobsList />} />
      <Route path="/jobs/:id" element={<JobDetail />} />
      <Route
        path="/jobs/post"
        element={
          <ProtectedRoute roles={["client"]}>
            <PostJob />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Admin />
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
