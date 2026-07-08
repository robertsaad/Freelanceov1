import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API, BACKEND_URL } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Building2, Upload, Loader2 } from "lucide-react";
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

const TIME_ZONES = (() => {
  try {
    if (typeof Intl.supportedValuesOf === "function") return Intl.supportedValuesOf("timeZone");
  } catch (e) {
    /* older browsers */
  }
  return [
    "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "Europe/London", "Europe/Paris", "Europe/Berlin", "Africa/Cairo", "Asia/Beirut",
    "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
  ];
})();

export default function ClientSettings() {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    website: "",
    org_size: "",
    industry: "",
    description: "",
    phone: "",
    time_zone: "",
    country: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    logo: "",
  });

  useEffect(() => {
    if (user && user.role !== "client") {
      navigate("/dashboard");
      return;
    }
    const parts = (user?.name || "").trim().split(" ");
    const fnFallback = parts[0] || "";
    const lnFallback = parts.slice(1).join(" ");
    axios
      .get(`${API}/clients/profile/me`, { withCredentials: true })
      .then((res) => {
        const p = res.data || {};
        setForm((f) => ({
          ...f,
          first_name: user?.first_name || fnFallback,
          last_name: user?.last_name || lnFallback,
          company_name: p.company_name || "",
          website: p.website || "",
          org_size: p.org_size || "",
          industry: p.industry || "",
          description: p.description || "",
          phone: p.phone || "",
          time_zone: p.time_zone || "",
          country: p.country || "",
          address: p.address || "",
          city: p.city || "",
          state: p.state || "",
          zip_code: p.zip_code || "",
          logo: p.logo || "",
        }));
      })
      .catch(() =>
        setForm((f) => ({ ...f, first_name: user?.first_name || fnFallback, last_name: user?.last_name || lnFallback }))
      )
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const addressConfig = getAddressConfig(form.country);
  const postalError = getPostalError(form.country, form.zip_code);

  const logoSrc = (url) => (!url ? "" : url.startsWith("http") ? url : `${BACKEND_URL}${url}`);
  const ownerName = `${form.first_name} ${form.last_name}`.trim() || user?.name || "—";

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploadingLogo(true);
    try {
      const res = await axios.post(`${API}/uploads`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, logo: res.data.media_url }));
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (postalError) {
      toast.error(postalError);
      return;
    }
    setSaving(true);
    try {
      const { first_name, last_name, ...company } = form;
      await axios.post(`${API}/clients/profile`, company, { withCredentials: true });
      await axios.put(
        `${API}/auth/me`,
        { first_name: first_name.trim(), last_name: last_name.trim() },
        { withCredentials: true }
      );
      if (checkAuth) await checkAuth();
      toast.success("Changes saved!");
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Info</h1>
          <p className="text-sm text-gray-500 mt-1">This is a client account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your name and how clients see you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.picture} />
                  <AvatarFallback className="bg-cyan-600 text-white text-lg">
                    {ownerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "C"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{ownerName}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="John" data-testid="first-name-input" />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Doe" data-testid="last-name-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-400">Your login email can't be changed here.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company details</CardTitle>
              <CardDescription>Tell talent about your business.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg border bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo ? (
                    <img src={logoSrc(form.logo)} alt="Company logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 cursor-pointer hover:underline" data-testid="logo-upload-label">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingLogo ? "Uploading…" : form.logo ? "Change logo" : "Upload logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG or WEBP. Square works best.</p>
                </div>
              </div>

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
              <CardTitle>Company contacts</CardTitle>
              <CardDescription>How talent can reach you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Input value={ownerName} disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 123 4567" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Time zone</Label>
                  <Select value={form.time_zone || undefined} onValueChange={(v) => setForm({ ...form, time_zone: v })}>
                    <SelectTrigger><SelectValue placeholder="Select time zone" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {TIME_ZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                <div className="space-y-2">
                  <Label>{addressConfig.cityLabel}</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={addressConfig.cityLabel} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Street address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
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
