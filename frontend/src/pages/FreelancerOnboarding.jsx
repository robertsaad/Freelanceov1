import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Target,
  Rocket,
  GraduationCap,
  Languages as LanguagesIcon,
  X,
  ImagePlus,
  Loader2,
  User as UserIcon,
  FileText,
} from "lucide-react";
import {
  LANGUAGES,
  COUNTRIES,
  getAddressConfig,
  getPostalError,
} from "@/lib/locationData";

const EXPERIENCE_LEVELS = [
  { value: "brand_new", label: "I'm brand new to freelancing", desc: "This is my first time offering my skills." },
  { value: "some_experience", label: "I have some experience", desc: "I've done a bit of freelance work before." },
  { value: "expert", label: "I'm an experienced freelancer", desc: "I've been freelancing for a while." },
];

const GOALS = [
  { value: "main_income", label: "To earn my main income", desc: "Freelancing is my primary way to make money." },
  { value: "side_money", label: "To earn extra money on the side", desc: "I have another job and want to earn more." },
  { value: "experience", label: "To gain experience", desc: "I want to build a portfolio and grow." },
  { value: "undecided", label: "I'm not sure yet", desc: "I'm just exploring my options." },
];

const WORK_PREFERENCES = [
  { value: "find_work", label: "I want to find opportunities myself", desc: "Browse and apply to jobs that fit me." },
  { value: "sell_packages", label: "I want clients to come to me", desc: "Showcase my profile so clients reach out." },
];

const PROFICIENCIES = ["Basic", "Conversational", "Fluent", "Native"];

const emptyEmployment = () => ({
  company: "",
  title: "",
  start_date: "",
  end_date: "",
  currently_working: false,
  description: "",
});

const emptyEducation = () => ({
  school: "",
  degree: "",
  field_of_study: "",
  start_year: "",
  end_year: "",
});

const emptyLanguage = () => ({ language: "", proficiency: "Conversational" });

// Reads an image file and returns a downscaled JPEG data URL (keeps the stored
// avatar small enough to save directly on the profile document).
const fileToCompressedDataUrl = (file, maxDim = 400, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file doesn't look like a valid image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

// NOTE: These presentational components are defined at module scope (not inside
// FreelancerOnboarding). Defining them inside the component recreates them on
// every render, which remounts their subtree and makes text inputs lose focus
// after a single keystroke.
const OptionCard = ({ selected, onClick, title, desc, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-start gap-3 ${
      selected
        ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
        : "border-gray-200 hover:border-gray-300 bg-white"
    }`}
  >
    {Icon && (
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          selected ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
    )}
    <span className="flex-1">
      <span className="block font-semibold text-gray-900">{title}</span>
      {desc && <span className="block text-sm text-gray-500 mt-0.5">{desc}</span>}
    </span>
    {selected && <Check className="h-5 w-5 text-emerald-600 shrink-0" />}
  </button>
);

const StepShell = ({ eyebrow, heading, subheading, children }) => (
  <div className="max-w-2xl mx-auto">
    {eyebrow && (
      <p className="text-sm font-medium text-emerald-600 mb-2">{eyebrow}</p>
    )}
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{heading}</h1>
    {subheading && <p className="text-gray-500 mt-2">{subheading}</p>}
    <div className="mt-6 space-y-4">{children}</div>
  </div>
);

export default function FreelancerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const categories = useCategories();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  const [data, setData] = useState({
    experience_level: "",
    goal: "",
    work_preference: "",
    open_to_contract: false,
    category: "",
    specialties: [],
    skills: [],
    title: "",
    employment_history: [],
    education: [],
    languages: [{ language: "English", proficiency: "Fluent" }],
    bio: "",
    hourly_rate: "",
    experience_years: "",
    location: "",
    phone: "",
    date_of_birth: "",
    country: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    profile_photo: "",
  });

  const [newSkill, setNewSkill] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cvParsing, setCvParsing] = useState(false);

  // Redirect non-freelancers, and skip onboarding if a profile already exists.
  useEffect(() => {
    if (user && user.role !== "freelancer") {
      navigate("/dashboard");
      return;
    }
    let active = true;
    axios
      .get(`${API}/freelancers/profile/me`, { withCredentials: true })
      .then((res) => {
        if (active && res.data) {
          navigate("/dashboard");
        } else if (active) {
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [user, navigate]);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  // ---- list helpers ----
  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !data.skills.includes(s) && data.skills.length < 15) {
      update({ skills: [...data.skills, s] });
      setNewSkill("");
    }
  };
  const removeSkill = (s) => update({ skills: data.skills.filter((x) => x !== s) });

  const addSpecialty = () => {
    const s = newSpecialty.trim();
    if (s && !data.specialties.includes(s) && data.specialties.length < 3) {
      update({ specialties: [...data.specialties, s] });
      setNewSpecialty("");
    }
  };
  const removeSpecialty = (s) => update({ specialties: data.specialties.filter((x) => x !== s) });

  const addEmployment = () => update({ employment_history: [...data.employment_history, emptyEmployment()] });
  const setEmployment = (i, patch) =>
    update({
      employment_history: data.employment_history.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    });
  const removeEmployment = (i) =>
    update({ employment_history: data.employment_history.filter((_, idx) => idx !== i) });

  const addEducation = () => update({ education: [...data.education, emptyEducation()] });
  const setEducation = (i, patch) =>
    update({ education: data.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  const removeEducation = (i) => update({ education: data.education.filter((_, idx) => idx !== i) });

  const addLanguage = () => update({ languages: [...data.languages, emptyLanguage()] });
  const setLanguage = (i, patch) =>
    update({ languages: data.languages.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  const removeLanguage = (i) => update({ languages: data.languages.filter((_, idx) => idx !== i) });

  // ---- profile photo ----
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, etc.).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large. Please pick one under 10 MB.");
      return;
    }
    setPhotoUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      update({ profile_photo: dataUrl });
    } catch (err) {
      toast.error(err.message || "Could not process that image.");
    } finally {
      setPhotoUploading(false);
    }
  };

  // ---- CV autofill ----
  const matchFromList = (value, list) => {
    if (!value) return "";
    const v = String(value).trim().toLowerCase();
    const aliases = {
      usa: "United States",
      "u.s.a.": "United States",
      "u.s.": "United States",
      us: "United States",
      uk: "United Kingdom",
      "u.k.": "United Kingdom",
      uae: "United Arab Emirates",
    };
    if (aliases[v] && list.includes(aliases[v])) return aliases[v];
    const hit = list.find((x) => x.toLowerCase() === v);
    return hit || "";
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const okExt = /\.(pdf|docx|doc)$/i.test(file.name);
    if (!okExt) {
      toast.error("Please upload a PDF or Word (.docx) file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Please pick one under 10 MB.");
      return;
    }
    setCvParsing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post(`${API}/freelancers/parse-cv`, form, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      const p = res.data || {};
      const matchedCategory = categories.find(
        (c) => c.toLowerCase() === String(p.category || "").toLowerCase()
      );
      setData((d) => ({
        ...d,
        title: p.title || d.title,
        bio: p.bio || d.bio,
        category: matchedCategory || d.category,
        skills: p.skills?.length ? p.skills.slice(0, 15) : d.skills,
        specialties: p.specialties?.length ? p.specialties.slice(0, 3) : d.specialties,
        languages: p.languages?.length ? p.languages : d.languages,
        employment_history: p.employment_history?.length ? p.employment_history : d.employment_history,
        education: p.education?.length ? p.education : d.education,
        experience_years:
          p.experience_years != null && p.experience_years !== ""
            ? String(p.experience_years)
            : d.experience_years,
        phone: p.phone || d.phone,
        country: matchFromList(p.country, COUNTRIES) || d.country,
        city: p.city || d.city,
      }));
      toast.success("We filled in what we could from your CV. Review each step and edit as needed.");
      setStep(1);
      window.scrollTo(0, 0);
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Couldn't read that CV. You can fill the form manually instead."
      );
    } finally {
      setCvParsing(false);
    }
  };

  // ---- country-aware address ----
  const addressConfig = getAddressConfig(data.country);
  const postalError = getPostalError(data.country, data.zip_code);

  // ---- steps ----
  const steps = [
    "welcome",
    "experience",
    "goal",
    "work_preference",
    "category",
    "skills",
    "title",
    "photo",
    "employment",
    "education",
    "languages",
    "bio",
    "rate",
    "personal",
    "review",
  ];

  const totalWizardSteps = steps.length - 1; // exclude welcome from the count
  const progress = step === 0 ? 0 : Math.round((step / totalWizardSteps) * 100);

  const canProceed = () => {
    switch (steps[step]) {
      case "experience":
        return !!data.experience_level;
      case "goal":
        return !!data.goal;
      case "work_preference":
        return !!data.work_preference;
      case "category":
        return !!data.category;
      case "skills":
        return data.skills.length > 0;
      case "title":
        return data.title.trim().length > 0;
      case "bio":
        return data.bio.trim().length >= 50;
      case "rate":
        return Number(data.hourly_rate) > 0 && data.experience_years !== "";
      case "personal":
        return !postalError;
      default:
        return true;
    }
  };

  // Returns a specific message explaining what's missing on the current step, or null.
  const validationMessage = () => {
    switch (steps[step]) {
      case "experience":
        return "Please select your experience level to continue.";
      case "goal":
        return "Please pick a goal to continue.";
      case "work_preference":
        return "Please choose how you'd like to work.";
      case "category":
        return "Please select a category.";
      case "skills":
        return "Please add at least one skill.";
      case "title":
        return "Please enter a professional title.";
      case "bio":
        return `Please write at least 50 characters (you have ${data.bio.trim().length}).`;
      case "rate":
        if (!(Number(data.hourly_rate) > 0)) return "Please enter your hourly rate.";
        if (data.experience_years === "") return "Please enter your years of experience.";
        return "Please complete this step to continue.";
      case "personal":
        return postalError || "Please complete this step to continue.";
      default:
        return "Please complete this step to continue.";
    }
  };

  const next = () => {
    if (!canProceed()) {
      toast.error(validationMessage());
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo(0, 0);
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title.trim(),
        bio: data.bio.trim(),
        skills: data.skills,
        category: data.category,
        hourly_rate: Number(data.hourly_rate),
        experience_years: Number(data.experience_years) || 0,
        location: data.location || [data.city, data.country].filter(Boolean).join(", ") || null,
        experience_level: data.experience_level || null,
        goal: data.goal || null,
        work_preference: data.work_preference || null,
        open_to_contract: data.open_to_contract,
        specialties: data.specialties,
        employment_history: data.employment_history.filter((e) => e.company && e.title),
        education: data.education.filter((e) => e.school),
        languages: data.languages.filter((l) => l.language),
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
        country: data.country || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        profile_photo: data.profile_photo || null,
      };
      await axios.post(`${API}/freelancers/profile`, payload, { withCredentials: true });
      toast.success("Your freelancer profile is live!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not create your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    );
  }

  const stepName = steps[step];
  const stepIndexLabel = `${step}/${totalWizardSteps}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <img src="/logo-icon.png" alt="Freelanceo" className="h-7 w-7" />
          <span className="font-bold text-gray-900">Freelanceo</span>
          {step > 0 && (
            <span className="ml-auto text-sm text-gray-500">Step {stepIndexLabel}</span>
          )}
        </div>
        {step > 0 && <Progress value={progress} className="h-1 rounded-none" />}
      </header>

      <main className="flex-1 px-4 py-8 md:py-12">
        {stepName === "welcome" && (
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white mb-6">
              <Rocket className="h-7 w-7" />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Ready for your next big opportunity?
            </h1>
            <p className="text-gray-500 mt-4 text-lg">
              Let's set up your freelancer profile so clients can find you. It only takes a few
              minutes, and you can edit everything later.
            </p>

            <div className="mt-8 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-6 text-left">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900">Have a CV? Autofill your profile</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload your resume (PDF or Word) and we'll pre-fill your title, skills,
                    experience, education and languages. You review everything before publishing.
                  </p>
                  <label className={`mt-4 inline-block ${cvParsing ? "pointer-events-none opacity-70" : "cursor-pointer"}`}>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handleCvUpload}
                      disabled={cvParsing}
                      data-testid="onboarding-cv-input"
                    />
                    <span className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                      {cvParsing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading your CV…
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" /> Upload CV to autofill
                        </>
                      )}
                    </span>
                  </label>
                  <p className="mt-2 text-xs text-gray-400">PDF or DOCX, up to 10 MB. Scanned images aren't supported yet.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs uppercase tracking-wide">or</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <Button
              size="lg"
              variant="outline"
              className="mt-6"
              onClick={next}
              disabled={cvParsing}
              data-testid="onboarding-start-btn"
            >
              Fill in manually <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {stepName === "experience" && (
          <StepShell
            eyebrow={`Question 1 of 3`}
            heading="Have you freelanced before?"
            subheading="This helps us tailor Freelanceo to your experience."
          >
            {EXPERIENCE_LEVELS.map((o) => (
              <OptionCard
                key={o.value}
                selected={data.experience_level === o.value}
                onClick={() => update({ experience_level: o.value })}
                title={o.label}
                desc={o.desc}
                icon={Sparkles}
              />
            ))}
          </StepShell>
        )}

        {stepName === "goal" && (
          <StepShell
            eyebrow={`Question 2 of 3`}
            heading="What's your biggest goal for freelancing?"
            subheading="We'll use this to personalize your experience."
          >
            {GOALS.map((o) => (
              <OptionCard
                key={o.value}
                selected={data.goal === o.value}
                onClick={() => update({ goal: o.value })}
                title={o.label}
                desc={o.desc}
                icon={Target}
              />
            ))}
          </StepShell>
        )}

        {stepName === "work_preference" && (
          <StepShell
            eyebrow={`Question 3 of 3`}
            heading="How would you like to work?"
            subheading="You can always change this later."
          >
            {WORK_PREFERENCES.map((o) => (
              <OptionCard
                key={o.value}
                selected={data.work_preference === o.value}
                onClick={() => update({ work_preference: o.value })}
                title={o.label}
                desc={o.desc}
                icon={Briefcase}
              />
            ))}
            <label className="flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 cursor-pointer">
              <Checkbox
                checked={data.open_to_contract}
                onCheckedChange={(v) => update({ open_to_contract: !!v })}
              />
              <span className="text-sm text-gray-700">
                I'm open to contract-to-hire opportunities
              </span>
            </label>
          </StepShell>
        )}

        {stepName === "category" && (
          <StepShell
            eyebrow="Create your profile"
            heading="What kind of work are you here to do?"
            subheading="Pick the category that best matches your services, then add up to 3 specialties."
          >
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={data.category} onValueChange={(v) => update({ category: v })}>
                <SelectTrigger data-testid="onboarding-category-select">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Specialties (optional, up to 3)</Label>
              <div className="flex gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                  placeholder="e.g. Landing pages"
                />
                <Button type="button" variant="outline" onClick={addSpecialty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.specialties.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-sm"
                  >
                    {s}
                    <button type="button" onClick={() => removeSpecialty(s)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </StepShell>
        )}

        {stepName === "skills" && (
          <StepShell
            eyebrow="Create your profile"
            heading="What are your top skills?"
            subheading="Add up to 15 skills. These help clients find you in search."
          >
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="e.g. React, Copywriting, Figma"
                data-testid="onboarding-skill-input"
              />
              <Button type="button" variant="outline" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400">{data.skills.length}/15 skills</p>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-800 px-3 py-1.5 text-sm"
                >
                  {s}
                  <button type="button" onClick={() => removeSkill(s)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </StepShell>
        )}

        {stepName === "title" && (
          <StepShell
            eyebrow="Create your profile"
            heading="Give yourself a professional title"
            subheading="This is the headline clients see first. Make it clear and specific."
          >
            <div className="space-y-2">
              <Label>Professional title</Label>
              <Input
                value={data.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="e.g. Senior Full-Stack Developer"
                data-testid="onboarding-title-input"
              />
            </div>
          </StepShell>
        )}

        {stepName === "photo" && (
          <StepShell
            eyebrow="Create your profile"
            heading="Add a profile photo"
            subheading="A friendly, professional photo helps clients trust you. Optional, but recommended."
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                  {data.profile_photo ? (
                    <img
                      src={data.profile_photo}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-14 w-14 text-gray-300" />
                  )}
                </div>
                {photoUploading && (
                  <div className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                    data-testid="onboarding-photo-input"
                  />
                  <span className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <ImagePlus className="mr-2 h-4 w-4" />
                    {data.profile_photo ? "Change photo" : "Upload photo"}
                  </span>
                </label>
                {data.profile_photo && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-gray-500 hover:text-red-500"
                    onClick={() => update({ profile_photo: "" })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400">JPG or PNG, up to 10 MB.</p>
            </div>
          </StepShell>
        )}

        {stepName === "employment" && (
          <StepShell
            eyebrow="Create your profile"
            heading="Add your work experience"
            subheading="Share your employment history. This is optional but builds trust with clients."
          >
            {data.employment_history.map((e, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Experience {i + 1}</span>
                  <button type="button" onClick={() => removeEmployment(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Job title" value={e.title} onChange={(ev) => setEmployment(i, { title: ev.target.value })} />
                  <Input placeholder="Company" value={e.company} onChange={(ev) => setEmployment(i, { company: ev.target.value })} />
                  <Input placeholder="Start (e.g. Jan 2021)" value={e.start_date} onChange={(ev) => setEmployment(i, { start_date: ev.target.value })} />
                  <Input
                    placeholder="End (e.g. Present)"
                    value={e.end_date}
                    disabled={e.currently_working}
                    onChange={(ev) => setEmployment(i, { end_date: ev.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <Checkbox
                    checked={e.currently_working}
                    onCheckedChange={(v) => setEmployment(i, { currently_working: !!v, end_date: v ? "" : e.end_date })}
                  />
                  I currently work here
                </label>
                <Textarea
                  placeholder="What did you do in this role? (optional)"
                  value={e.description}
                  onChange={(ev) => setEmployment(i, { description: ev.target.value })}
                  rows={3}
                />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addEmployment}>
              <Plus className="mr-2 h-4 w-4" /> Add work experience
            </Button>
          </StepShell>
        )}

        {stepName === "education" && (
          <StepShell
            eyebrow="Create your profile"
            heading="Add your education"
            subheading="Optional — add any degrees, courses, or certifications."
          >
            {data.education.map((e, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 inline-flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" /> Education {i + 1}
                  </span>
                  <button type="button" onClick={() => removeEducation(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input placeholder="School / Institution" value={e.school} onChange={(ev) => setEducation(i, { school: ev.target.value })} />
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Degree (e.g. B.Sc.)" value={e.degree} onChange={(ev) => setEducation(i, { degree: ev.target.value })} />
                  <Input placeholder="Field of study" value={e.field_of_study} onChange={(ev) => setEducation(i, { field_of_study: ev.target.value })} />
                  <Input placeholder="Start year" value={e.start_year} onChange={(ev) => setEducation(i, { start_year: ev.target.value })} />
                  <Input placeholder="End year" value={e.end_year} onChange={(ev) => setEducation(i, { end_year: ev.target.value })} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addEducation}>
              <Plus className="mr-2 h-4 w-4" /> Add education
            </Button>
          </StepShell>
        )}

        {stepName === "languages" && (
          <StepShell
            eyebrow="Create your profile"
            heading="What languages do you speak?"
            subheading="Let clients know how you can communicate."
          >
            {data.languages.map((l, i) => {
              const taken = data.languages
                .filter((_, idx) => idx !== i)
                .map((x) => x.language)
                .filter(Boolean);
              const options = LANGUAGES.filter(
                (lang) => !taken.includes(lang) || lang === l.language
              );
              return (
                <div key={i} className="flex gap-2 items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                    <LanguagesIcon className="h-4 w-4" />
                  </span>
                  <Select
                    value={l.language || undefined}
                    onValueChange={(v) => setLanguage(i, { language: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={l.proficiency} onValueChange={(v) => setLanguage(i, { proficiency: v })}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {data.languages.length > 1 && (
                    <button type="button" onClick={() => removeLanguage(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="outline" onClick={addLanguage}>
              <Plus className="mr-2 h-4 w-4" /> Add language
            </Button>
          </StepShell>
        )}

        {stepName === "bio" && (
          <StepShell
            eyebrow="Create your profile"
            heading="Write an overview about yourself"
            subheading="Tell clients about your experience, strengths, and what makes you a great choice. (Minimum 50 characters.)"
          >
            <Textarea
              value={data.bio}
              onChange={(e) => update({ bio: e.target.value })}
              rows={8}
              placeholder="I'm a full-stack developer with 5 years of experience building..."
              data-testid="onboarding-bio-input"
            />
            <p className={`text-xs ${data.bio.trim().length >= 50 ? "text-emerald-600" : "text-gray-400"}`}>
              {data.bio.trim().length >= 50
                ? `${data.bio.trim().length} characters — looks good!`
                : `${data.bio.trim().length}/50 characters minimum`}
            </p>
          </StepShell>
        )}

        {stepName === "rate" && (
          <StepShell
            eyebrow="Create your profile"
            heading="Set your hourly rate"
            subheading="You can adjust this anytime. Clients see this on your profile."
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hourly rate (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input
                    type="number"
                    min="1"
                    className="pl-7"
                    value={data.hourly_rate}
                    onChange={(e) => update({ hourly_rate: e.target.value })}
                    placeholder="50"
                    data-testid="onboarding-rate-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Years of experience</Label>
                <Input
                  type="number"
                  min="0"
                  value={data.experience_years}
                  onChange={(e) => update({ experience_years: e.target.value })}
                  placeholder="5"
                />
              </div>
            </div>
          </StepShell>
        )}

        {stepName === "personal" && (
          <StepShell
            eyebrow="Almost done"
            heading="A few personal details"
            subheading="This helps clients know where you're based. All fields here are optional."
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={data.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+1 555 123 4567" />
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input type="date" value={data.date_of_birth} onChange={(e) => update({ date_of_birth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={data.country || undefined}
                  onValueChange={(v) => update({ country: v, state: "", zip_code: "" })}
                >
                  <SelectTrigger data-testid="onboarding-country-select">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{addressConfig.cityLabel}</Label>
                <Input value={data.city} onChange={(e) => update({ city: e.target.value })} placeholder={addressConfig.cityLabel} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Street address</Label>
                <Input value={data.address} onChange={(e) => update({ address: e.target.value })} placeholder="123 Main St" />
              </div>
              <div className="space-y-2">
                <Label>{addressConfig.stateLabel}</Label>
                {addressConfig.stateOptions ? (
                  <Select
                    value={data.state || undefined}
                    onValueChange={(v) => update({ state: v })}
                    disabled={!data.country}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${addressConfig.stateLabel.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {addressConfig.stateOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={data.state}
                    onChange={(e) => update({ state: e.target.value })}
                    placeholder={addressConfig.stateLabel}
                  />
                )}
              </div>
              {addressConfig.postalLabel && (
                <div className="space-y-2">
                  <Label>{addressConfig.postalLabel}</Label>
                  <Input
                    value={data.zip_code}
                    onChange={(e) => update({ zip_code: e.target.value })}
                    placeholder={addressConfig.postalPlaceholder}
                    className={postalError ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  {postalError && <p className="text-xs text-red-500">{postalError}</p>}
                </div>
              )}
            </div>
          </StepShell>
        )}

        {stepName === "review" && (
          <StepShell
            eyebrow="Last step"
            heading="Review your profile"
            subheading="Make sure everything looks good. You can edit it later from your dashboard."
          >
            <div className="rounded-xl border bg-white divide-y">
              <ReviewRow
                label="Photo"
                value={
                  data.profile_photo ? (
                    <img
                      src={data.profile_photo}
                      alt="Profile"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    ""
                  )
                }
              />
              <ReviewRow label="Title" value={data.title} />
              <ReviewRow label="Category" value={data.category} />
              <ReviewRow label="Specialties" value={data.specialties.join(", ")} />
              <ReviewRow label="Skills" value={data.skills.join(", ")} />
              <ReviewRow label="Hourly rate" value={data.hourly_rate ? `$${data.hourly_rate}/hr` : ""} />
              <ReviewRow label="Experience" value={data.experience_years ? `${data.experience_years} years` : ""} />
              <ReviewRow label="Languages" value={data.languages.filter((l) => l.language).map((l) => `${l.language} (${l.proficiency})`).join(", ")} />
              <ReviewRow label="Work history" value={`${data.employment_history.filter((e) => e.company).length} entries`} />
              <ReviewRow label="Education" value={`${data.education.filter((e) => e.school).length} entries`} />
              <ReviewRow label="Location" value={[data.city, data.state, data.country].filter(Boolean).join(", ")} />
              <ReviewRow label="Bio" value={data.bio} />
            </div>
          </StepShell>
        )}
      </main>

      {/* Footer nav */}
      {stepName !== "welcome" && (
        <footer className="sticky bottom-0 bg-white border-t">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={back}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {stepName === "review" ? (
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="onboarding-submit-btn"
              >
                {isSubmitting ? "Publishing…" : "Publish profile"}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={next}
                data-testid="onboarding-next-btn"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <span className="w-32 shrink-0 text-sm font-medium text-gray-500">{label}</span>
      <span className="flex-1 text-sm text-gray-900 break-words">
        {value || <span className="text-gray-400">Not provided</span>}
      </span>
    </div>
  );
}
