import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
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
import { Plus, X, Send } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

const durations = [
  "Less than 1 week",
  "1-2 weeks",
  "2-4 weeks",
  "1-3 months",
  "3-6 months",
  "More than 6 months"
];

export default function PostJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const categories = useCategories();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    skills_required: [],
    budget_min: "",
    budget_max: "",
    budget_type: "fixed",
    duration: "",
    location: "",
    remote: true
  });

  const [newSkill, setNewSkill] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to post a job");
      navigate("/login");
      return;
    }

    if (user.role !== "client") {
      toast.error("Only clients can post jobs");
      return;
    }

    if (formData.skills_required.length === 0) {
      toast.error("Please add at least one required skill");
      return;
    }

    setSubmitting(true);
    try {
      const jobData = {
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null
      };

      const response = await axios.post(`${API}/jobs`, jobData, { withCredentials: true });
      toast.success("Job posted successfully!");
      navigate(`/jobs/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills_required.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills_required: [...formData.skills_required, newSkill.trim()]
      });
      setNewSkill("");
    }
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      skills_required: formData.skills_required.filter(s => s !== skill)
    });
  };

  if (!user || user.role !== "client") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {!user ? "Please Login" : "Clients Only"}
          </h1>
          <p className="text-gray-600 mb-6">
            {!user 
              ? "You need to be logged in as a client to post jobs." 
              : "Only clients can post job opportunities. Switch to a client account to continue."
            }
          </p>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate("/login")}>
            {!user ? "Login" : "Switch Account"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="post-job-page">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a New Job</h1>
        <p className="text-gray-600 mb-8">Describe your project and find the perfect freelancer</p>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Provide information about your project</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Build a React E-commerce Website"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  data-testid="title-input"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project in detail. Include requirements, deliverables, and any specific needs..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={6}
                  required
                  data-testid="description-input"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                  required
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

              {/* Skills */}
              <div className="space-y-2">
                <Label>Required Skills *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill (e.g. React, Python)"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    data-testid="skill-input"
                  />
                  <Button type="button" onClick={addSkill} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills_required.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-indigo-50 text-indigo-700 flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Budget Type</Label>
                  <Select
                    value={formData.budget_type}
                    onValueChange={(value) => setFormData({...formData, budget_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Min Budget ($)</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({...formData, budget_min: e.target.value})}
                    data-testid="budget-min-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Budget ($)</Label>
                  <Input
                    type="number"
                    placeholder="2000"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                    data-testid="budget-max-input"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Estimated Duration</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => setFormData({...formData, duration: value})}
                >
                  <SelectTrigger data-testid="duration-select">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map(dur => (
                      <SelectItem key={dur} value={dur}>{dur}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location & Remote */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location (Optional)</Label>
                  <Input
                    placeholder="e.g. New York, USA"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    data-testid="location-input"
                  />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <Label>Remote Work</Label>
                    <p className="text-sm text-gray-500">Allow remote freelancers</p>
                  </div>
                  <Switch
                    checked={formData.remote}
                    onCheckedChange={(checked) => setFormData({...formData, remote: checked})}
                    data-testid="remote-switch"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
                disabled={submitting}
                data-testid="submit-btn"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Posting..." : "Post Job"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
