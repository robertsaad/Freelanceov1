import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Building2 } from "lucide-react";
import { COUNTRIES, getAddressConfig, getPostalError } from "@/lib/locationData";

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

export default function ClientSettings() {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    company_name: "",
    website: "",
    org_size: "",
    industry: "",
    description: "",
    phone: "",
    country: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  });

  useEffect(() => {
    if (user && user.role !== "client") {
      navigate("/dashboard");
      return;
    }
    axios
      .get(`${API}/clients/profile/me`, { withCredentials: true })
      .then((res) => {
        const p = res.data || {};
        setForm((f) => ({
          ...f,
          name: user?.name || "",
          company_name: p.company_name || "",
          website: p.website || "",
          org_size: p.org_size || "",
          industry: p.industry || "",
          description: p.description || "",
          phone: p.phone || "",
          country: p.country || "",
          address: p.address || "",
          city: p.city || "",
          state: p.state || "",
          zip_code: p.zip_code || "",
        }));
      })
      .catch(() => setForm((f) => ({ ...f, name: user?.name || "" })))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const addressConfig = getAddressConfig(form.country);
  const postalError = getPostalError(form.country, form.zip_code);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (postalError) {
      toast.error(postalError);
      return;
    }
    setSaving(true);
    try {
      const { name, ...company } = form;
      await axios.post(`${API}/clients/profile`, company, { withCredentials: true });
      if (name.trim() && name.trim() !== (user?.name || "")) {
        await axios.put(`${API}/auth/me`, { name: name.trim() }, { withCredentials: true });
        if (checkAuth) await checkAuth();
      }
      toast.success("Company details saved!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="h-6 w-6 text-cyan-600" />
          <h1 className="text-2xl font-bold text-gray-900">Company settings</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your name and how clients see you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-gray-50" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company details</CardTitle>
              <CardDescription>Tell talent about your business.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company name</Label>
                  <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Inc." />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Organization size</Label>
                  <Select value={form.org_size || undefined} onValueChange={(v) => setForm({ ...form, org_size: v })}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {ORG_SIZES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={form.industry || undefined} onValueChange={(v) => setForm({ ...form, industry: v })}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>About the company <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="What does your company do?" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={form.country || undefined} onValueChange={(v) => setForm({ ...form, country: v, state: "", zip_code: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Street address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <Label>{addressConfig.cityLabel}</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={addressConfig.cityLabel} />
                </div>
                <div className="space-y-2">
                  <Label>{addressConfig.stateLabel}</Label>
                  {addressConfig.stateOptions ? (
                    <Select value={form.state || undefined} onValueChange={(v) => setForm({ ...form, state: v })} disabled={!form.country}>
                      <SelectTrigger><SelectValue placeholder={`Select ${addressConfig.stateLabel.toLowerCase()}`} /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {addressConfig.stateOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder={addressConfig.stateLabel} />
                  )}
                </div>
                {addressConfig.postalLabel && (
                  <div className="space-y-2">
                    <Label>{addressConfig.postalLabel}</Label>
                    <Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} placeholder={addressConfig.postalPlaceholder} className={postalError ? "border-red-400" : ""} />
                    {postalError && <p className="text-xs text-red-500">{postalError}</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 h-12 text-base" disabled={saving} data-testid="save-company-btn">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
