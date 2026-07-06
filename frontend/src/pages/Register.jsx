import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, Briefcase, Search, Check } from "lucide-react";
import { COUNTRIES } from "@/lib/locationData";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    country: "",
    role: "client",
    marketing: false,
    agree: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isClient = formData.role === "client";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Please enter your first and last name");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!formData.agree) {
      toast.error("Please agree to the Terms of Service to continue");
      return;
    }

    setIsSubmitting(true);
    const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
    try {
      await register(formData.email, formData.password, name, formData.role);
      toast.success("Account created successfully!");
      navigate(isClient ? "/client-onboarding" : "/onboarding");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RoleChoice = ({ value, icon: Icon, label }) => {
    const selected = formData.role === value;
    return (
      <button
        type="button"
        onClick={() => setFormData({ ...formData, role: value })}
        className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
          selected ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600" : "border-gray-200 hover:border-gray-300 bg-white"
        }`}
        data-testid={`role-${value}`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-cyan-600 text-white" : "bg-gray-100 text-gray-600"}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {selected && <Check className="ml-auto h-5 w-5 text-cyan-600" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 py-10" data-testid="register-page">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/logo-icon.png" alt="Freelanceo" className="h-10 w-10" />
            <span className="text-2xl font-bold text-gray-900">Freelanceo</span>
          </Link>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {isClient ? "Sign up to hire talent" : "Sign up to find work"}
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                {isClient
                  ? "Create your account and post your first job in minutes."
                  : "Create your account and start applying to jobs."}
              </p>
            </div>

            {/* Role choice */}
            <div className="flex gap-3">
              <RoleChoice value="client" icon={Briefcase} label="I want to hire" />
              <RoleChoice value="freelancer" icon={Search} label="I want to work" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" required data-testid="first-name-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" required data-testid="last-name-input" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{isClient ? "Work email address" : "Email address"}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="pl-10" required data-testid="email-input" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password (8 or more characters)" className="pl-10" required data-testid="password-input" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={formData.country || undefined} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                  <SelectTrigger data-testid="country-select"><SelectValue placeholder="Select a country" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={formData.marketing} onCheckedChange={(v) => setFormData({ ...formData, marketing: !!v })} className="mt-0.5" />
                <span className="text-sm text-gray-600">
                  Send me helpful emails with tips and {isClient ? "talent recommendations" : "job recommendations"}.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={formData.agree} onCheckedChange={(v) => setFormData({ ...formData, agree: !!v })} className="mt-0.5" data-testid="agree-checkbox" />
                <span className="text-sm text-gray-600">
                  Yes, I understand and agree to the Freelanceo <span className="text-cyan-600">Terms of Service</span>, including the <span className="text-cyan-600">User Agreement</span> and <span className="text-cyan-600">Privacy Policy</span>.
                </span>
              </label>

              <Button type="submit" className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-base" disabled={isSubmitting} data-testid="register-submit-btn">
                {isSubmitting ? "Creating account..." : "Create my account"}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-cyan-600 hover:underline font-medium" data-testid="login-link">
                Log In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
