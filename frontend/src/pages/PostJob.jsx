import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, X, Check } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

const PROJECT_SIZES = [
  { value: "large", label: "Large", desc: "Longer term or complex initiatives (ex. build a full website)" },
  { value: "medium", label: "Medium", desc: "Well-defined projects (ex. a landing page)" },
  { value: "small", label: "Small", desc: "Quick and straightforward tasks (ex. update text and images)" },
];

const DURATIONS = [
  { value: "More than 6 months", label: "More than 6 months" },
  { value: "3 to 6 months", label: "3 to 6 months" },
  { value: "1 to 3 months", label: "1 to 3 months" },
  { value: "Less than 1 month", label: "Less than 1 month" },
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry", desc: "Looking for someone relatively new to this field" },
  { value: "intermediate", label: "Intermediate", desc: "Looking for substantial experience in this field" },
  { value: "expert", label: "Expert", desc: "Looking for comprehensive and deep expertise in this field" },
];

const STEPS = ["title", "skills", "scope", "budget", "description", "review"];
const STEP_LABELS = {
  title: "Title",
  skills: "Skills",
  scope: "Scope",
  budget: "Budget",
  description: "Description",
  review: "Review",
};

// Radio-style option card (module scope so inputs never lose focus on re-render).
const OptionCard = ({ selected, onClick, title, desc }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-start gap-3 ${
      selected ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600" : "border-gray-200 hover:border-gray-300 bg-white"
    }`}
  >
    <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selected ? "border-cyan-600" : "border-gray-300"}`}>
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-cyan-600" />}
    </span>
    <span className="flex-1">
      <span className="block font-semibold text-gray-900">{title}</span>
      {desc && <span className="block text-sm text-gray-500 mt-0.5">{desc}</span>}
    </span>
  </button>
);

export default function PostJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const categories = useCategories();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  const [data, setData] = useState({
    title: "",
    category: "",
    skills_required: [],
    project_size: "",
    duration: "",
    experience_level: "",
    contract_to_hire: null,
    budget_type: "hourly",
    budget_min: "",
    budget_max: "",
    description: "",
    remote: true,
    location: "",
  });

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !data.skills_required.includes(s) && data.skills_required.length < 10) {
      update({ skills_required: [...data.skills_required, s] });
      setNewSkill("");
    }
  };
  const removeSkill = (s) => update({ skills_required: data.skills_required.filter((x) => x !== s) });

  const stepName = STEPS[step];
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  const canProceed = () => {
    switch (stepName) {
      case "title":
        return data.title.trim().length > 0;
      case "skills":
        return !!data.category && data.skills_required.length > 0;
      case "scope":
        return !!data.project_size && !!data.duration && !!data.experience_level;
      case "budget":
        return Number(data.budget_min) > 0 && Number(data.budget_max) >= Number(data.budget_min);
      case "description":
        return data.description.trim().length >= 30;
      default:
        return true;
    }
  };

  const validationMessage = () => {
    switch (stepName) {
      case "title":
        return "Please enter a job title.";
      case "skills":
        return !data.category ? "Please choose a category." : "Please add at least one skill.";
      case "scope":
        return "Please choose the project size, duration and experience level.";
      case "budget":
        if (!(Number(data.budget_min) > 0)) return "Please enter a minimum budget.";
        return "The maximum must be greater than or equal to the minimum.";
      case "description":
        return `Please write at least 30 characters (you have ${data.description.trim().length}).`;
      default:
        return "Please complete this step.";
    }
  };

  const next = () => {
    if (!canProceed()) {
      toast.error(validationMessage());
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo(0, 0);
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        skills_required: data.skills_required,
        budget_type: data.budget_type,
        budget_min: data.budget_min ? parseFloat(data.budget_min) : null,
        budget_max: data.budget_max ? parseFloat(data.budget_max) : null,
        duration: data.duration || null,
        project_size: data.project_size || null,
        experience_level: data.experience_level || null,
        contract_to_hire: data.contract_to_hire,
        remote: data.remote,
        location: data.location || null,
      };
      const res = await axios.post(`${API}/jobs`, payload, { withCredentials: true });
      toast.success("Job posted successfully!");
      navigate(`/jobs/${res.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== "client") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{!user ? "Please log in" : "Clients only"}</h1>
          <p className="text-gray-600 mb-6">
            {!user ? "You need a client account to post jobs." : "Only clients can post job opportunities."}
          </p>
          <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => navigate(!user ? "/login" : "/dashboard")}>
            {!user ? "Log in" : "Back to dashboard"}
          </Button>
        </div>
      </div>
    );
  }

  const budgetHint = data.budget_type === "hourly" ? "/hr" : "";
  const stepIndexLabel = `${step + 1}/${STEPS.length}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <img src="/logo-icon.png" alt="Freelanceo" className="h-7 w-7" />
          <span className="font-bold text-gray-900">Freelanceo</span>
          <span className="ml-auto text-sm text-gray-500">Step {stepIndexLabel}</span>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-medium text-cyan-600 mb-2">
            {stepIndexLabel} · Job post · {STEP_LABELS[stepName]}
          </p>

          {stepName === "title" && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Let's start with a strong title.</h1>
                <p className="text-gray-500 mt-3">
                  This helps your job post stand out to the right candidates. It's the first thing they'll see, so make it count!
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Write a title for your job post</Label>
                  <Input
                    value={data.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="e.g. Build a responsive e-commerce website"
                    data-testid="job-title-input"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  <p className="font-medium text-gray-700 mb-1">Example titles</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Build responsive WordPress site with booking/payment functionality</li>
                    <li>Graphic designer needed to design ad creative for multiple campaigns</li>
                    <li>Facebook ad specialist needed for product launch</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {stepName === "skills" && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">What are the main skills required for your work?</h1>
                <p className="text-gray-500 mt-3">Pick a category and add 3–5 skills for the best matches.</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={data.category || undefined} onValueChange={(v) => update({ category: v })}>
                    <SelectTrigger data-testid="job-category-select"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Search skills or add your own</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      placeholder="e.g. React, Figma, SEO"
                      data-testid="job-skill-input"
                    />
                    <Button type="button" variant="outline" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-gray-400">{data.skills_required.length}/10 skills</p>
                  <div className="flex flex-wrap gap-2">
                    {data.skills_required.map((s) => (
                      <Badge key={s} variant="secondary" className="bg-cyan-50 text-cyan-700 flex items-center gap-1">
                        {s}
                        <button type="button" onClick={() => removeSkill(s)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {stepName === "scope" && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Next, estimate the scope of your work.</h1>
                <p className="text-gray-500 mt-3">Consider the size of your project and the time it will take.</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  {PROJECT_SIZES.map((o) => (
                    <OptionCard key={o.value} selected={data.project_size === o.value} onClick={() => update({ project_size: o.value })} title={o.label} desc={o.desc} />
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>How long will your work take?</Label>
                  <div className="space-y-2">
                    {DURATIONS.map((o) => (
                      <OptionCard key={o.value} selected={data.duration === o.value} onClick={() => update({ duration: o.value })} title={o.label} />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>What level of experience will it need?</Label>
                  <p className="text-sm text-gray-500">This won't restrict any proposals, but helps match expertise to your budget.</p>
                  <div className="space-y-2">
                    {EXPERIENCE_LEVELS.map((o) => (
                      <OptionCard key={o.value} selected={data.experience_level === o.value} onClick={() => update({ experience_level: o.value })} title={o.label} desc={o.desc} />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Is this a contract-to-hire opportunity?</Label>
                  <div className="space-y-2">
                    <OptionCard selected={data.contract_to_hire === true} onClick={() => update({ contract_to_hire: true })} title="Yes, this could become full time" desc="After a trial period, you can convert the contract." />
                    <OptionCard selected={data.contract_to_hire === false} onClick={() => update({ contract_to_hire: false })} title="No, not at this time" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {stepName === "budget" && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tell us about your budget.</h1>
                <p className="text-gray-500 mt-3">This will help us match you to talent within your range.</p>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => update({ budget_type: "hourly" })} className={`rounded-xl border-2 p-4 text-left ${data.budget_type === "hourly" ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600" : "border-gray-200 bg-white hover:border-gray-300"}`} data-testid="budget-hourly">
                    <span className="font-semibold text-gray-900">Hourly rate</span>
                  </button>
                  <button type="button" onClick={() => update({ budget_type: "fixed" })} className={`rounded-xl border-2 p-4 text-left ${data.budget_type === "fixed" ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600" : "border-gray-200 bg-white hover:border-gray-300"}`} data-testid="budget-fixed">
                    <span className="font-semibold text-gray-900">Fixed price</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input type="number" min="1" className="pl-7" value={data.budget_min} onChange={(e) => update({ budget_min: e.target.value })} placeholder="15" data-testid="budget-min" />
                      {budgetHint && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{budgetHint}</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input type="number" min="1" className="pl-7" value={data.budget_max} onChange={(e) => update({ budget_max: e.target.value })} placeholder="35" data-testid="budget-max" />
                      {budgetHint && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{budgetHint}</span>}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">This is the average rate for similar projects. Experts may charge more.</p>
              </div>
            </div>
          )}

          {stepName === "description" && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Start the conversation.</h1>
                <p className="text-gray-500 mt-3">Talent are looking for:</p>
                <ul className="list-disc pl-5 mt-2 text-gray-500 space-y-1 text-sm">
                  <li>Clear expectations about your task or deliverables</li>
                  <li>The skills required for your work</li>
                  <li>Good communication</li>
                  <li>Details about how you or your team like to work</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label>Describe what you need</Label>
                <Textarea
                  value={data.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={10}
                  placeholder="Already have a description? Paste it here!"
                  data-testid="job-description-input"
                />
                <p className={`text-xs ${data.description.trim().length >= 30 ? "text-emerald-600" : "text-gray-400"}`}>
                  {data.description.trim().length >= 30 ? `${data.description.trim().length} characters` : `${data.description.trim().length}/30 characters minimum`}
                </p>
              </div>
            </div>
          )}

          {stepName === "review" && (
            <div className="max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Review your job post.</h1>
              <p className="text-gray-500 mt-3">Make sure everything looks good before you publish.</p>
              <div className="mt-6 rounded-xl border bg-white divide-y">
                <ReviewRow label="Title" value={data.title} />
                <ReviewRow label="Category" value={data.category} />
                <ReviewRow label="Skills" value={data.skills_required.join(", ")} />
                <ReviewRow label="Project size" value={data.project_size} />
                <ReviewRow label="Duration" value={data.duration} />
                <ReviewRow label="Experience" value={data.experience_level} />
                <ReviewRow label="Contract-to-hire" value={data.contract_to_hire === null ? "" : data.contract_to_hire ? "Yes" : "No"} />
                <ReviewRow
                  label="Budget"
                  value={data.budget_min || data.budget_max ? `$${data.budget_min || "?"} - $${data.budget_max || "?"} ${data.budget_type === "hourly" ? "/hr" : "fixed"}` : ""}
                />
                <ReviewRow label="Description" value={data.description} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer nav */}
      <footer className="sticky bottom-0 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={back}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>Cancel</Button>
          )}
          {stepName === "review" ? (
            <Button type="button" className="bg-cyan-600 hover:bg-cyan-700" onClick={handleSubmit} disabled={submitting} data-testid="publish-job-btn">
              {submitting ? "Publishing…" : "Publish job"} <Check className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" className="bg-cyan-600 hover:bg-cyan-700" onClick={next} data-testid="job-next-btn">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <span className="w-36 shrink-0 text-sm font-medium text-gray-500">{label}</span>
      <span className="flex-1 text-sm text-gray-900 break-words">
        {value || <span className="text-gray-400">Not provided</span>}
      </span>
    </div>
  );
}
