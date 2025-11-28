import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Briefcase, Mail, Lock, Chrome } from "lucide-react";

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = (role) => {
    localStorage.setItem("oauth_role", role);
    const redirectUrl = encodeURIComponent(window.location.origin);
    window.location.href = `https://auth.emergentagent.com/?redirect=${redirectUrl}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/logo-icon.png" alt="Freelanceo" className="h-10 w-10" />
            <span className="text-2xl font-bold text-gray-900">Freelanceo</span>
          </Link>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Login Options */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => handleGoogleLogin("freelancer")}
                data-testid="google-freelancer-btn"
              >
                <Chrome className="mr-2 h-5 w-5" />
                Continue as Freelancer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => handleGoogleLogin("client")}
                data-testid="google-client-btn"
              >
                <Chrome className="mr-2 h-5 w-5" />
                Continue as Client
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with email</span>
              </div>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-base"
                disabled={isSubmitting}
                data-testid="login-submit-btn"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/register" className="text-cyan-600 hover:underline font-medium" data-testid="register-link">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
