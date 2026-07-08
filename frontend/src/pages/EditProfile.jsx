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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, X, Save, Trash2, Upload, Loader2, Image as ImageIcon, Video, Music, Eye, CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { COUNTRIES, getAddressConfig, getPostalError } from "@/lib/locationData";

const mediaSrc = (url) => {
  if (!url) return url;
  return url.startsWith("http") ? url : `${BACKEND_URL}${url}`;
};

export default function EditProfile() {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const categories = useCategories();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileId, setProfileId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    title: "",
    bio: "",
    skills: [],
    specialties: [],
    category: "",
    hourly_rate: "",
    experience_years: "",
    location: "",
    is_available: true,
    phone: "",
    date_of_birth: "",
    country: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    employment_history: [],
    education: [],
    languages: [],
    certifications: [],
    other_experiences: [],
    hours_per_week: "",
    video_intro_url: "",
  });

  const [newSkill, setNewSkill] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [showAllPortfolio, setShowAllPortfolio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({
    title: "",
    description: "",
    image_url: "",
    link: "",
    media_type: "",
    media_url: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/freelancers/profile/me`, { withCredentials: true });
      if (response.data) {
        setHasProfile(true);
        setProfileId(response.data.id);
        setFormData({
          name: user?.name || "",
          title: response.data.title || "",
          bio: response.data.bio || "",
          skills: response.data.skills || [],
          specialties: response.data.specialties || [],
          category: response.data.category || "",
          hourly_rate: response.data.hourly_rate?.toString() || "",
          experience_years: response.data.experience_years?.toString() || "",
          location: response.data.location || "",
          is_available: response.data.is_available ?? true,
          phone: response.data.phone || "",
          date_of_birth: response.data.date_of_birth || "",
          country: response.data.country || "",
          address: response.data.address || "",
          city: response.data.city || "",
          state: response.data.state || "",
          zip_code: response.data.zip_code || "",
          employment_history: response.data.employment_history || [],
          education: response.data.education || [],
          languages: response.data.languages || [],
          certifications: response.data.certifications || [],
          other_experiences: response.data.other_experiences || [],
          hours_per_week: response.data.hours_per_week || "",
          video_intro_url: response.data.video_intro_url || "",
        });
        setPortfolioItems(response.data.portfolio_items || []);
      } else {
        setFormData((f) => ({ ...f, name: user?.name || "" }));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const postalError = getPostalError(formData.country, formData.zip_code);
    if (postalError) {
      toast.error(postalError);
      return;
    }

    setSaving(true);

    try {
      const { name, ...profileFields } = formData;
      const data = {
        ...profileFields,
        hourly_rate: parseFloat(formData.hourly_rate),
        experience_years: parseInt(formData.experience_years),
      };

      if (hasProfile) {
        await axios.put(`${API}/freelancers/profile`, data, { withCredentials: true });
      } else {
        await axios.post(`${API}/freelancers/profile`, data, { withCredentials: true });
        setHasProfile(true);
      }

      // Update the account display name if it changed
      if (name.trim() && name.trim() !== (user?.name || "")) {
        await axios.put(`${API}/auth/me`, { name: name.trim() }, { withCredentials: true });
        if (checkAuth) await checkAuth();
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const removeSkill = (skill) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addSpecialty = () => {
    const s = newSpecialty.trim();
    if (s && !formData.specialties.includes(s) && formData.specialties.length < 3) {
      setFormData({ ...formData, specialties: [...formData.specialties, s] });
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (s) => {
    setFormData({ ...formData, specialties: formData.specialties.filter(x => x !== s) });
  };

  // Generic list-section editors (employment, education, languages, certifications, etc.)
  const addItem = (key, blank) => setFormData((f) => ({ ...f, [key]: [...(f[key] || []), blank] }));
  const updateItem = (key, idx, field, val) =>
    setFormData((f) => ({ ...f, [key]: (f[key] || []).map((it, i) => (i === idx ? { ...it, [field]: val } : it)) }));
  const removeItem = (key, idx) =>
    setFormData((f) => ({ ...f, [key]: (f[key] || []).filter((_, i) => i !== idx) }));

  const addPortfolioItem = async () => {
    if (!newPortfolio.title || !newPortfolio.description) {
      toast.error("Please fill in title and description");
      return;
    }

    try {
      const response = await axios.post(
        `${API}/freelancers/portfolio`,
        newPortfolio,
        { withCredentials: true }
      );
      setPortfolioItems([...portfolioItems, response.data]);
      setNewPortfolio({ title: "", description: "", image_url: "", link: "", media_type: "", media_url: "" });
      toast.success("Portfolio item added!");
    } catch (error) {
      toast.error("Failed to add portfolio item");
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50 MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(`${API}/uploads`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewPortfolio((prev) => ({
        ...prev,
        media_type: res.data.media_type,
        media_url: res.data.media_url,
      }));
      toast.success("File uploaded! Add a title and save.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePortfolioItem = async (itemId) => {
    try {
      await axios.delete(`${API}/freelancers/portfolio/${itemId}`, { withCredentials: true });
      setPortfolioItems(portfolioItems.filter(item => item.id !== itemId));
      toast.success("Portfolio item removed");
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const addressConfig = getAddressConfig(formData.country);
  const postalError = getPostalError(formData.country, formData.zip_code);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="edit-profile-page">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-gray-600" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/dashboard"))} data-testid="back-btn">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {hasProfile ? "Edit Your Profile" : "Create Your Profile"}
            </h1>
            <p className="text-gray-500 mt-1">Build a profile that wins you more work.</p>
          </div>
          {hasProfile && profileId && (
            <Button variant="outline" asChild data-testid="preview-profile-btn">
              <a href={`/freelancers/${profileId}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" /> Preview public profile
              </a>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-20">
            {/* How clients see you */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-cyan-600 text-white flex items-center justify-center font-semibold shrink-0">
                    {(formData.name || user?.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{formData.name || user?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{formData.title || "Your professional title"}</p>
                  </div>
                </div>
                {hasProfile && profileId && (
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 text-sm">
                    <div><p className="text-xs text-gray-500">Rate</p><p className="font-medium text-gray-900">${formData.hourly_rate || 0}/hr</p></div>
                    <div><p className="text-xs text-gray-500">Availability</p><p className="font-medium text-gray-900">{formData.is_available ? "Open to work" : "Not available"}</p></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion checklist */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-medium text-gray-900 mb-3">Complete your profile</h3>
                <ul className="space-y-2 text-sm">
                  {[
                    { label: "Professional title", done: !!formData.title },
                    { label: "Overview / bio", done: (formData.bio || "").length >= 50 },
                    { label: "Skills", done: (formData.skills || []).length > 0 },
                    { label: "Hourly rate", done: Number(formData.hourly_rate) > 0 },
                    { label: "Portfolio item", done: portfolioItems.length > 0 },
                  ].map((it) => (
                    <li key={it.label} className="flex items-center gap-2">
                      {it.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
                      <span className={it.done ? "text-gray-500" : "text-gray-800"}>{it.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Video introduction */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-medium text-gray-900 mb-1 flex items-center gap-2"><Video className="h-4 w-4 text-cyan-600" /> Video introduction</h3>
                <p className="text-xs text-gray-500 mb-3">Link a short intro video (YouTube, Vimeo, Loom).</p>
                <Input placeholder="https://..." value={formData.video_intro_url} onChange={(e) => setFormData({ ...formData, video_intro_url: e.target.value })} />
              </CardContent>
            </Card>

            {/* Hours per week */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-medium text-gray-900 mb-2">Hours per week</h3>
                <Select value={formData.hours_per_week || undefined} onValueChange={(v) => setFormData({ ...formData, hours_per_week: v })}>
                  <SelectTrigger><SelectValue placeholder="Set your availability" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="More than 30 hrs/week">More than 30 hrs/week</SelectItem>
                    <SelectItem value="Less than 30 hrs/week">Less than 30 hrs/week</SelectItem>
                    <SelectItem value="As needed - open to offers">As needed - open to offers</SelectItem>
                    <SelectItem value="Not available">Not available</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Languages</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => addItem("languages", { language: "", proficiency: "Conversational" })}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-3">
                  {(formData.languages || []).length === 0 && <p className="text-xs text-gray-400">Add the languages you speak.</p>}
                  {(formData.languages || []).map((lng, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input className="flex-1" placeholder="Language" value={lng.language} onChange={(e) => updateItem("languages", i, "language", e.target.value)} />
                      <select className="border rounded-md text-sm px-2 py-2 bg-white" value={lng.proficiency} onChange={(e) => updateItem("languages", i, "proficiency", e.target.value)}>
                        <option>Basic</option><option>Conversational</option><option>Fluent</option><option>Native</option>
                      </select>
                      <button type="button" onClick={() => removeItem("languages", i)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Education</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => addItem("education", { school: "", degree: "", field_of_study: "", start_year: "", end_year: "" })}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-4">
                  {(formData.education || []).length === 0 && <p className="text-xs text-gray-400">Add your education.</p>}
                  {(formData.education || []).map((ed, i) => (
                    <div key={i} className="space-y-2 border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex gap-2">
                        <Input className="flex-1" placeholder="School" value={ed.school} onChange={(e) => updateItem("education", i, "school", e.target.value)} />
                        <button type="button" onClick={() => removeItem("education", i)} className="text-gray-300 hover:text-red-500 mt-2"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <Input placeholder="Degree (e.g. BSc Computer Science)" value={ed.degree} onChange={(e) => updateItem("education", i, "degree", e.target.value)} />
                      <div className="flex gap-2">
                        <Input placeholder="From (year)" value={ed.start_year} onChange={(e) => updateItem("education", i, "start_year", e.target.value)} />
                        <Input placeholder="To (year)" value={ed.end_year} onChange={(e) => updateItem("education", i, "end_year", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main column */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <Card className="order-1">
                <CardHeader>
                  <CardTitle>Profile headline &amp; overview</CardTitle>
                  <CardDescription>The first thing clients see — make it count.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Professional Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Senior React Developer"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    data-testid="title-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell clients about your experience and expertise..."
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows={4}
                  required
                  data-testid="bio-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    placeholder="50"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                    required
                    data-testid="hourly-rate-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience_years">Years of Experience</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    placeholder="5"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                    required
                    data-testid="experience-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    data-testid="location-input"
                  />
                </div>
              </div>
                </CardContent>
              </Card>

              <Card className="order-3">
                <CardHeader>
                  <CardTitle>Skills &amp; expertise</CardTitle>
                  <CardDescription>Help the right clients find you in search.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
              {/* Skills */}
              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill (e.g. React, Python)"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    data-testid="skill-input"
                  />
                  <Button type="button" onClick={addSkill} variant="outline" data-testid="add-skill-btn">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="skill-tag flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} data-testid={`remove-skill-${skill}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Specialties */}
              <div className="space-y-2">
                <Label>Specialties (up to 3)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a specialty (e.g. Landing pages)"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                  />
                  <Button type="button" onClick={addSpecialty} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.specialties.map((s, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {s}
                      <button type="button" onClick={() => removeSpecialty(s)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
                </CardContent>
              </Card>

              <Card className="order-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Employment history</CardTitle>
                      <CardDescription>Add the roles you've held.</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem("employment_history", { company: "", title: "", start_date: "", end_date: "", currently_working: false, description: "" })}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {(formData.employment_history || []).length === 0 && <p className="text-sm text-gray-400">No employment history yet.</p>}
                  {(formData.employment_history || []).map((job, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3 relative">
                      <button type="button" onClick={() => removeItem("employment_history", i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><Label>Title</Label><Input value={job.title} onChange={(e) => updateItem("employment_history", i, "title", e.target.value)} placeholder="e.g. Senior Developer" /></div>
                        <div><Label>Company</Label><Input value={job.company} onChange={(e) => updateItem("employment_history", i, "company", e.target.value)} placeholder="e.g. Microsoft" /></div>
                        <div><Label>From</Label><Input value={job.start_date} onChange={(e) => updateItem("employment_history", i, "start_date", e.target.value)} placeholder="Jan 2021" /></div>
                        <div><Label>To</Label><Input value={job.end_date} onChange={(e) => updateItem("employment_history", i, "end_date", e.target.value)} placeholder="Present" disabled={job.currently_working} /></div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={!!job.currently_working} onChange={(e) => updateItem("employment_history", i, "currently_working", e.target.checked)} /> I currently work here</label>
                      <div><Label>Description</Label><Textarea rows={2} value={job.description} onChange={(e) => updateItem("employment_history", i, "description", e.target.value)} placeholder="What did you do in this role?" /></div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="order-5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div><CardTitle>Certifications</CardTitle><CardDescription>Licenses and certifications you've earned.</CardDescription></div>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem("certifications", { name: "", issuer: "", year: "" })}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(formData.certifications || []).length === 0 && <p className="text-sm text-gray-400">No certifications added.</p>}
                  {(formData.certifications || []).map((c, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-end border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex-1 min-w-[160px]"><Label>Name</Label><Input value={c.name} onChange={(e) => updateItem("certifications", i, "name", e.target.value)} placeholder="e.g. Azure Solutions Architect" /></div>
                      <div className="flex-1 min-w-[120px]"><Label>Issuer</Label><Input value={c.issuer} onChange={(e) => updateItem("certifications", i, "issuer", e.target.value)} placeholder="Microsoft" /></div>
                      <div className="w-24"><Label>Year</Label><Input value={c.year} onChange={(e) => updateItem("certifications", i, "year", e.target.value)} placeholder="2024" /></div>
                      <button type="button" onClick={() => removeItem("certifications", i)} className="text-gray-300 hover:text-red-500 mb-2"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="order-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div><CardTitle>Other experiences</CardTitle><CardDescription>Anything else that showcases your expertise.</CardDescription></div>
                    <Button type="button" variant="outline" size="sm" onClick={() => addItem("other_experiences", { title: "", description: "" })}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(formData.other_experiences || []).length === 0 && <p className="text-sm text-gray-400">No other experiences added.</p>}
                  {(formData.other_experiences || []).map((o, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                      <button type="button" onClick={() => removeItem("other_experiences", i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      <Input value={o.title} onChange={(e) => updateItem("other_experiences", i, "title", e.target.value)} placeholder="Title" />
                      <Textarea rows={2} value={o.description} onChange={(e) => updateItem("other_experiences", i, "description", e.target.value)} placeholder="Describe it..." />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="order-7">
                <CardHeader>
                  <CardTitle>Personal &amp; contact details</CardTitle>
                  <CardDescription>Used for billing and verification — not shown publicly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
              {/* Personal Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 555 123 4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input id="dob" type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={formData.country || undefined} onValueChange={(v) => setFormData({ ...formData, country: v, state: "", zip_code: "" })}>
                      <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Street address</Label>
                    <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" />
                  </div>
                  <div className="space-y-2">
                    <Label>{addressConfig.cityLabel}</Label>
                    <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder={addressConfig.cityLabel} />
                  </div>
                  <div className="space-y-2">
                    <Label>{addressConfig.stateLabel}</Label>
                    {addressConfig.stateOptions ? (
                      <Select value={formData.state || undefined} onValueChange={(v) => setFormData({ ...formData, state: v })} disabled={!formData.country}>
                        <SelectTrigger><SelectValue placeholder={`Select ${addressConfig.stateLabel.toLowerCase()}`} /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {addressConfig.stateOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder={addressConfig.stateLabel} />
                    )}
                  </div>
                  {addressConfig.postalLabel && (
                    <div className="space-y-2">
                      <Label>{addressConfig.postalLabel}</Label>
                      <Input value={formData.zip_code} onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })} placeholder={addressConfig.postalPlaceholder} className={postalError ? "border-red-400" : ""} />
                      {postalError && <p className="text-xs text-red-500">{postalError}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Availability */}
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <Label>Available for Work</Label>
                  <p className="text-sm text-gray-500">Show clients you're open to new projects</p>
                </div>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({...formData, is_available: checked})}
                  data-testid="availability-switch"
                />
              </div>
                </CardContent>
              </Card>

              <div className="order-8">
                <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={saving} data-testid="save-profile-btn">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : (hasProfile ? "Save Changes" : "Create Profile")}
                </Button>
              </div>

        {/* Portfolio Section */}
        {hasProfile && (
          <Card className="order-2" data-testid="portfolio-section">
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
              <CardDescription>Showcase your best work — talent with a portfolio get hired far more often.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Existing Items */}
              {portfolioItems.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-500">{portfolioItems.length} project{portfolioItems.length === 1 ? "" : "s"}</p>
                    {portfolioItems.length > 6 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllPortfolio(!showAllPortfolio)}>
                        {showAllPortfolio ? "Show less" : `Show all ${portfolioItems.length}`}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(showAllPortfolio ? portfolioItems : portfolioItems.slice(0, 6)).map((item) => {
                    const thumb = item.media_type === "image" && item.media_url
                      ? mediaSrc(item.media_url)
                      : item.image_url || null;
                    return (
                    <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-gray-100" data-testid={`portfolio-item-${item.id}`}>
                      {thumb ? (
                        <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                      ) : item.media_type === "video" && item.media_url ? (
                        <video src={mediaSrc(item.media_url)} className="w-full h-full object-cover bg-black" />
                      ) : item.media_type === "audio" ? (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><Music className="h-8 w-8" /></div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="h-8 w-8" /></div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePortfolioItem(item.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                        data-testid={`remove-portfolio-${item.id}`}
                        aria-label="Remove project"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-white text-xs font-medium line-clamp-1">{item.title}</p>
                      </div>
                    </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* Add New Item */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Add New Portfolio Item</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        placeholder="Project title"
                        value={newPortfolio.title}
                        onChange={(e) => setNewPortfolio({...newPortfolio, title: e.target.value})}
                        data-testid="portfolio-title-input"
                      />
                    </div>
                    <div>
                      <Label>Link (optional)</Label>
                      <Input
                        placeholder="https://example.com"
                        value={newPortfolio.link}
                        onChange={(e) => setNewPortfolio({...newPortfolio, link: e.target.value})}
                        data-testid="portfolio-link-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Image URL (optional)</Label>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={newPortfolio.image_url}
                      onChange={(e) => setNewPortfolio({...newPortfolio, image_url: e.target.value})}
                      data-testid="portfolio-image-input"
                    />
                  </div>
                  <div>
                    <Label>Upload media (image, video, or music)</Label>
                    <p className="text-xs text-gray-500 mb-2">Max 50 MB. JPG, PNG, GIF, WEBP, MP4, WEBM, MOV, MP3, WAV, OGG.</p>
                    {newPortfolio.media_url ? (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        {newPortfolio.media_type === "image" && (
                          <img src={mediaSrc(newPortfolio.media_url)} alt="preview" className="w-full h-40 object-cover rounded" />
                        )}
                        {newPortfolio.media_type === "video" && (
                          <video src={mediaSrc(newPortfolio.media_url)} controls className="w-full h-40 object-cover rounded bg-black" />
                        )}
                        {newPortfolio.media_type === "audio" && (
                          <audio src={mediaSrc(newPortfolio.media_url)} controls className="w-full" />
                        )}
                        <button
                          type="button"
                          onClick={() => setNewPortfolio({ ...newPortfolio, media_type: "", media_url: "" })}
                          className="text-red-600 text-sm flex items-center gap-1 mt-2"
                        >
                          <X className="h-3 w-3" /> Remove uploaded file
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition">
                        {uploading ? (
                          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                        ) : (
                          <>
                            <div className="flex gap-3 text-gray-400 mb-2">
                              <ImageIcon className="h-5 w-5" />
                              <Video className="h-5 w-5" />
                              <Music className="h-5 w-5" />
                            </div>
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Upload className="h-4 w-4" /> Click to upload a file
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,video/*,audio/*"
                          className="hidden"
                          onChange={handleMediaUpload}
                          disabled={uploading}
                          data-testid="portfolio-upload-input"
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe your project..."
                      value={newPortfolio.description}
                      onChange={(e) => setNewPortfolio({...newPortfolio, description: e.target.value})}
                      rows={3}
                      data-testid="portfolio-description-input"
                    />
                  </div>
                  <Button type="button" onClick={addPortfolioItem} variant="outline" data-testid="add-portfolio-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Portfolio Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
