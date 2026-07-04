import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Briefcase, Mail, Lock, User, Chrome } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "freelancer"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(formData.email, formData.password, formData.name, formData.role);
      toast.success("Account created successfully!");
      navigate(formData.role === "freelancer" ? "/onboarding" : "/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = (role) => {
    localStorage.setItem("oauth_role", role);
    const redirectUrl = encodeURIComponent(window.location.origin);
    window.location.href = `https://auth.emergentagent.com/?redirect=${redirectUrl}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" data-testid="register-page">
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
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Join our community of professionals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Signup Options */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => handleGoogleSignup("freelancer")}
                data-testid="google-freelancer-signup-btn"
              >
                <Chrome className="mr-2 h-5 w-5" />
                Sign up as Freelancer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => handleGoogleSignup("client")}
                data-testid="google-client-signup-btn"
              >
                <Chrome className="mr-2 h-5 w-5" />
                Sign up as Client
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or register with email</span>
              </div>
            </div>

            {/* Email Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    data-testid="name-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    data-testid="password-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>I am a</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="freelancer" id="freelancer" data-testid="role-freelancer" />
                    <Label htmlFor="freelancer" className="font-normal cursor-pointer">
                      Freelancer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="client" id="client" data-testid="role-client" />
                    <Label htmlFor="client" className="font-normal cursor-pointer">
                      Client
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-base"
                disabled={isSubmitting}
                data-testid="register-submit-btn"
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-cyan-600 hover:underline font-medium" data-testid="login-link">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
