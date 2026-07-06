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
import { Plus, X, Save, Trash2, ExternalLink, Upload, Loader2, Image as ImageIcon, Video, Music } from "lucide-react";
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
  });

  const [newSkill, setNewSkill] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [portfolioItems, setPortfolioItems] = useState([]);
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {hasProfile ? "Edit Your Profile" : "Create Your Profile"}
        </h1>

        {/* Profile Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Tell clients about yourself</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Personal Details */}
              <div className="border-t pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Personal Details</h3>
                  <p className="text-sm text-gray-500">Your name, contact and location information.</p>
                </div>
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

              <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={saving} data-testid="save-profile-btn">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : (hasProfile ? "Save Changes" : "Create Profile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Portfolio Section */}
        {hasProfile && (
          <Card data-testid="portfolio-section">
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
              <CardDescription>Showcase your best work</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Existing Items */}
              {portfolioItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {portfolioItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 relative" data-testid={`portfolio-item-${item.id}`}>
                      <button
                        onClick={() => removePortfolioItem(item.id)}
                        className="absolute top-2 right-2 p-1 bg-red-100 rounded hover:bg-red-200"
                        data-testid={`remove-portfolio-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                      {item.media_type === "image" && item.media_url ? (
                        <img src={mediaSrc(item.media_url)} alt={item.title} className="w-full h-40 object-cover rounded mb-2" />
                      ) : item.media_type === "video" && item.media_url ? (
                        <video src={mediaSrc(item.media_url)} controls className="w-full h-40 object-cover rounded mb-2 bg-black" />
                      ) : item.media_type === "audio" && item.media_url ? (
                        <audio src={mediaSrc(item.media_url)} controls className="w-full mb-2" />
                      ) : item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover rounded mb-2" />
                      ) : null}
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-cyan-600 text-sm flex items-center gap-1 mt-2">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
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
      </div>

      <Footer />
    </div>
  );
}
