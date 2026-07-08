import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCategories } from "@/hooks/useCategories";
import {
  User,
  MessageSquare,
  FileText,
  DollarSign,
  Star,
  TrendingUp,
  Eye,
  Clock,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  Circle,
  BarChart3,
  HeartPulse,
  FileSignature,
  Search,
  Briefcase,
  ShieldCheck,
  ChevronRight,
  Building
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const categories = useCategories();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentJobs, setRecentJobs] = useState([]);
  const [matchJobs, setMatchJobs] = useState([]);
  const [requiresSub, setRequiresSub] = useState(false);
  const [jobsTab, setJobsTab] = useState("best");
  const [jobSearch, setJobSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "freelancer") {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/freelancers/profile/me`, { withCredentials: true });
      setProfile(response.data);
      fetchJobs(response.data?.category);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async (category) => {
    try {
      const recent = await axios.get(`${API}/jobs?page=1&limit=6`, { withCredentials: true });
      setRecentJobs(recent.data.jobs || []);
      setRequiresSub(!!recent.data.requires_subscription);
      if (category) {
        const m = await axios.get(`${API}/jobs?page=1&limit=6&category=${encodeURIComponent(category)}`, { withCredentials: true });
        setMatchJobs(m.data.jobs && m.data.jobs.length ? m.data.jobs : (recent.data.jobs || []));
      } else {
        setMatchJobs(recent.data.jobs || []);
      }
    } catch (error) {
      /* ignore */
    }
  };

  const jobTimeAgo = (d) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hrs < 1) return "Just now";
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString();
  };

  const fmtBudget = (j) => {
    if (j.budget_min && j.budget_max) return `$${j.budget_min.toLocaleString()} - $${j.budget_max.toLocaleString()}`;
    if (j.budget_min) return `From $${j.budget_min.toLocaleString()}`;
    if (j.budget_max) return `Up to $${j.budget_max.toLocaleString()}`;
    return "Budget negotiable";
  };

  // Profile completion checklist — drives the progress widget.
  const getCompletion = (p) => {
    if (!p) return { percent: 0, items: [] };
    const items = [
      { label: "Professional title", done: !!(p.title && p.title.trim()) },
      { label: "Overview / bio", done: !!(p.bio && p.bio.trim().length >= 50) },
      { label: "Skills", done: Array.isArray(p.skills) && p.skills.length > 0 },
      { label: "Category", done: !!p.category },
      { label: "Hourly rate", done: Number(p.hourly_rate) > 0 },
      { label: "Work experience", done: Array.isArray(p.employment_history) && p.employment_history.length > 0 },
      { label: "Education", done: Array.isArray(p.education) && p.education.length > 0 },
      { label: "Languages", done: Array.isArray(p.languages) && p.languages.length > 0 },
      { label: "Location", done: !!(p.location || p.city || p.country) },
      { label: "Portfolio item", done: Array.isArray(p.portfolio_items) && p.portfolio_items.length > 0 },
    ];
    const doneCount = items.filter((i) => i.done).length;
    const percent = Math.round((doneCount / items.length) * 100);
    return { percent, items };
  };

  const completion = getCompletion(profile);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="dashboard-page">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="welcome-message">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === "freelancer" ? "Manage your freelance profile and track your success" : "Find and hire the best freelancers"}
          </p>
        </div>

        {/* Freelancer Dashboard */}
        {user?.role === "freelancer" && (
          <>
            {/* Subscription Alert */}
            {(!profile || profile.subscription_status !== "active") && (
              <Card className="mb-6 border-amber-200 bg-amber-50" data-testid="subscription-alert">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {profile ? "Your subscription is inactive" : "Complete your profile to get started"}
                      </p>
                      <p className="text-sm text-amber-700">
                        {profile ? "Subscribe to make your profile visible to clients" : "Create your profile and subscribe to be discovered by clients"}
                      </p>
                    </div>
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700" asChild>
                    <Link to={profile ? "/pricing" : "/dashboard/profile"}>
                      {profile ? "Subscribe Now" : "Create Profile"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Upwork-style job-focused home */}
            <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
              {/* Main: find your next job */}
              <div className="w-full md:flex-1 min-w-0 space-y-6">
                <Card>
                  <CardContent className="p-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        navigate(`/jobs${jobSearch.trim() ? `?search=${encodeURIComponent(jobSearch.trim())}` : ""}`);
                      }}
                      className="flex gap-2"
                    >
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          value={jobSearch}
                          onChange={(e) => setJobSearch(e.target.value)}
                          placeholder="Search for jobs"
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          data-testid="dashboard-job-search"
                        />
                      </div>
                      <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Search</Button>
                    </form>
                  </CardContent>
                </Card>

                <Card data-testid="jobs-feed">
                  <CardHeader className="pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Jobs you might like</CardTitle>
                      <Link to="/jobs" className="text-sm text-cyan-600 hover:text-cyan-700">Browse all</Link>
                    </div>
                    <div className="flex gap-5 border-b border-gray-100 mt-3">
                      {[{ k: "best", l: "Best matches" }, { k: "recent", l: "Most recent" }].map((t) => (
                        <button
                          key={t.k}
                          onClick={() => setJobsTab(t.k)}
                          className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            jobsTab === t.k ? "border-cyan-600 text-cyan-700" : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {requiresSub ? (
                      <div className="text-center py-10">
                        <Briefcase className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-600 mb-4">Subscribe to unlock full job details and start applying.</p>
                        <Button className="bg-cyan-600 hover:bg-cyan-700" asChild>
                          <Link to="/pricing">View plans</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {(jobsTab === "best" ? matchJobs : recentJobs).length === 0 ? (
                          <p className="text-gray-500 text-center py-10">
                            No jobs to show yet. <Link to="/jobs" className="text-cyan-600 hover:text-cyan-700">Browse the job board</Link>.
                          </p>
                        ) : (
                          (jobsTab === "best" ? matchJobs : recentJobs).map((job) => (
                            <Link
                              key={job.id}
                              to={`/jobs/${job.id}`}
                              className="block py-4 -mx-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="font-medium text-gray-900 hover:text-cyan-600">{job.title}</h4>
                                <span className="text-xs text-gray-400 whitespace-nowrap">{jobTimeAgo(job.created_at)}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {job.budget_type === "hourly" ? "Hourly" : "Fixed-price"} · {fmtBudget(job)}
                                {job.experience_level ? ` · ${job.experience_level}` : ""}
                              </p>
                              {job.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{job.description}</p>
                              )}
                              {job.skills_required?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {job.skills_required.slice(0, 5).map((s, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                  ))}
                                </div>
                              )}
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                    {!requiresSub && (jobsTab === "best" ? matchJobs : recentJobs).length > 0 && (
                      <div className="pt-4 mt-2 border-t border-gray-100 text-center">
                        <Button variant="outline" asChild>
                          <Link to="/jobs">Find more jobs</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: profile + verification */}
              <div className="w-full md:w-80 md:flex-shrink-0 md:sticky md:top-20 self-start space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={user?.picture} />
                        <AvatarFallback className="bg-cyan-600 text-white text-lg">
                          {(user?.name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          to={profile ? `/freelancers/${profile.id}` : "/dashboard/profile"}
                          className="font-semibold text-gray-900 hover:text-cyan-600 truncate block"
                        >
                          {user?.name}
                        </Link>
                        <p className="text-sm text-gray-500 truncate">{profile?.title || "Add your professional title"}</p>
                      </div>
                    </div>

                    {profile && (
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Rating</p>
                          <p className="font-semibold text-gray-900">{profile.average_rating?.toFixed(1) || "0.0"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Reviews</p>
                          <p className="font-semibold text-gray-900">{profile.total_reviews || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Rate</p>
                          <p className="font-semibold text-gray-900">${profile.hourly_rate || 0}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Status</span>
                      <Badge className={profile?.subscription_status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                        {profile?.subscription_status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                      <Link to="/dashboard/profile">View / edit profile</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Verification / account health */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Account &amp; verification</h4>
                        <p className="text-sm text-gray-500 mt-0.5">Increase your visibility and win more work.</p>
                        <Link to="/dashboard/account-health" className="text-sm text-cyan-600 hover:text-cyan-700 inline-flex items-center mt-2">
                          Check account health <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Complete your profile (compact, sidebar) */}
                {profile && completion.percent < 100 && (
                  <Card data-testid="profile-completion">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">Complete your profile</h4>
                        <span className="text-lg font-bold text-cyan-600">{completion.percent}%</span>
                      </div>
                      <Progress value={completion.percent} className="h-2 mb-2" />
                      <p className="text-xs text-gray-500 mb-3">
                        {completion.items.filter((i) => !i.done).length} step(s) left — a complete profile wins more work.
                      </p>
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link to="/dashboard/profile">Finish your profile</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/dashboard/applications" data-testid="applications-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-cyan-100 rounded-full flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">My Applications</h3>
                      <p className="text-sm text-gray-500">Track jobs you applied to</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/profile" data-testid="edit-profile-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-cyan-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Edit Profile</h3>
                      <p className="text-sm text-gray-500">Update your info and skills</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/messages" data-testid="messages-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Messages</h3>
                      <p className="text-sm text-gray-500">Chat with clients</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/requests" data-testid="requests-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Hiring Requests</h3>
                      <p className="text-sm text-gray-500">View project requests</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/contracts" data-testid="contracts-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FileSignature className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Contracts</h3>
                      <p className="text-sm text-gray-500">Active &amp; past engagements</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/billing" data-testid="billing-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Membership &amp; Billing</h3>
                      <p className="text-sm text-gray-500">Plan, renewal &amp; payment history</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/stats" data-testid="stats-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-cyan-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">My Stats</h3>
                      <p className="text-sm text-gray-500">Views, followers &amp; opportunities</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/account-health" data-testid="account-health-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <HeartPulse className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Account Health</h3>
                      <p className="text-sm text-gray-500">Standing &amp; platform access</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        )}

        {/* Client Dashboard */}
        {user?.role === "client" && (
          <>
            {/* Hero */}
            <Card className="mb-8 border-0 shadow-sm bg-gradient-to-br from-cyan-50 to-white">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Hire proven freelancers who deliver results
                </h2>
                <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
                  Post a job and get proposals fast. See work history, reviews and ratings — then hire
                  the right talent in a few clicks.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700" asChild data-testid="hero-post-job">
                    <Link to="/jobs/post">Post a job</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="hero-browse-freelancers">
                    <Link to="/freelancers">
                      <Search className="h-4 w-4 mr-2" /> Browse freelancers
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Safe & secure hiring */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Safe and secure hiring, for any size of work</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[
                { icon: Star, title: "Verified reviews", desc: "Work with highly rated professionals backed by real reviews." },
                { icon: ShieldCheck, title: "Protected payments", desc: "Hassle-free billing so you can focus on the work that matters." },
                { icon: Briefcase, title: "Hire who you need", desc: "Find pros who can start right away and handle any job." },
              ].map((f) => (
                <Card key={f.title}>
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center mb-3">
                      <f.icon className="h-5 w-5 text-cyan-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Categories to hire */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose a category to see talent for hire</h2>
            <div className="rounded-xl border bg-white divide-y mb-10">
              {categories.map((c) => (
                <Link
                  key={c}
                  to={`/freelancers?category=${encodeURIComponent(c)}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  data-testid={`hire-category-${c}`}
                >
                  <span className="font-medium text-gray-800">{c}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>

            {/* Manage hiring */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage your hiring</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link to="/dashboard/messages" data-testid="messages-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Messages</h3>
                      <p className="text-sm text-gray-500">Chat with freelancers</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/requests" data-testid="requests-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">My Requests</h3>
                      <p className="text-sm text-gray-500">Track your hiring requests</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/contracts" data-testid="contracts-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <FileSignature className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Contracts</h3>
                      <p className="text-sm text-gray-500">Engagements with freelancers</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/dashboard/company" data-testid="company-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-cyan-100 rounded-full flex items-center justify-center">
                      <Building className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Company Settings</h3>
                      <p className="text-sm text-gray-500">Business details &amp; contact</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        )}
      </div>

      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
