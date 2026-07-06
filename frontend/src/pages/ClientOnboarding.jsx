import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Building2 } from "lucide-react";
import { COUNTRIES } from "@/lib/locationData";

const ORG_SIZES = [
  { value: "just_me", label: "Just me" },
  { value: "2_9", label: "2 – 9" },
  { value: "10_99", label: "10 – 99" },
  { value: "100_499", label: "100 – 499" },
  { value: "500_4999", label: "500 – 4,999" },
  { value: "5000_plus", label: "5,000+" },
];

const INDUSTRIES = [
  "Technology & Software",
  "Design & Creative",
  "Marketing & Advertising",
  "E-commerce & Retail",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "Media & Entertainment",
  "Real Estate",
  "Consulting",
  "Non-profit",
  "Other",
];

export default function ClientOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState({
    company_name: "",
    website: "",
    org_size: "",
    industry: "",
    country: "",
  });

  // Only clients; skip if a company profile already exists.
  useEffect(() => {
    if (user && user.role !== "client") {
      navigate("/dashboard");
      return;
    }
    let active = true;
    axios
      .get(`${API}/clients/profile/me`, { withCredentials: true })
      .then((res) => {
        if (!active) return;
        if (res.data && res.data.org_size) {
          navigate("/dashboard");
        } else {
          setData((d) => ({ ...d, company_name: d.company_name || user?.name || "" }));
          setChecking(false);
        }
      })
      .catch(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [user, navigate]);

  const canContinue = data.company_name.trim() && data.org_size;

  const handleSubmit = async () => {
    if (!canContinue) {
      toast.error("Please add your company name and organization size.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        company_name: data.company_name.trim(),
        website: data.website.trim() || null,
        org_size: data.org_size,
        industry: data.industry || null,
        country: data.country || null,
      };
      await axios.post(`${API}/clients/profile`, payload, { withCredentials: true });
      toast.success("You're all set! Let's find you great talent.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not save your business details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <img src="/logo-icon.png" alt="Freelanceo" className="h-7 w-7" />
          <span className="font-bold text-gray-900">Freelanceo</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 md:py-14">
        <div className="max-w-2xl mx-auto">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white mb-5">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Freelanceo!</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Tell us about your business and you'll be on your way to connect with talent.
          </p>

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input
                value={data.company_name}
                onChange={(e) => setData({ ...data, company_name: e.target.value })}
                placeholder="e.g. Acme Inc."
                data-testid="company-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Website <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={data.website}
                onChange={(e) => setData({ ...data, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-3">
              <Label>How many people are in your organization?</Label>
              <div className="flex flex-wrap gap-3">
                {ORG_SIZES.map((o) => {
                  const selected = data.org_size === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setData({ ...data, org_size: o.value })}
                      className={`rounded-full border-2 px-5 py-2 text-sm font-medium transition-all ${
                        selected
                          ? "border-cyan-600 bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                      data-testid={`org-size-${o.value}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Select value={data.industry || undefined} onValueChange={(v) => setData({ ...data, industry: v })}>
                  <SelectTrigger><SelectValue placeholder="Select an industry" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Select value={data.country || undefined} onValueChange={(v) => setData({ ...data, country: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !canContinue}
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="client-onboarding-continue"
              >
                {submitting ? "Saving…" : (<>Continue <ArrowRight className="ml-2 h-4 w-4" /></>)}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
