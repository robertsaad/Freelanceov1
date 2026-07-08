import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import JobCard from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API } from "@/App";
import { Search, Filter, Briefcase, ChevronLeft, ChevronRight, Plus, Lock, AlertCircle, DollarSign, Clock, MapPin, Users, Globe, Calendar, Send, CheckCircle, MessageSquare } from "lucide-react";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";

export default function JobsList() {
  const { user } = useAuth();
  const categories = ["All Categories", ...useCategories()];
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [appliedIds, setAppliedIds] = useState(() => new Set());
  const [showApply, setShowApply] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyForm, setApplyForm] = useState({ cover_letter: "", proposed_rate: "", proposed_rate_type: "fixed", estimated_duration: "" });
  const [messageContent, setMessageContent] = useState("");

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const remoteOnly = searchParams.get("remote") === "true";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    fetchJobs();
  }, [search, category, remoteOnly, page, user]);

  const fetchJobs = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category && category !== "All Categories") params.append("category", category);
      if (remoteOnly) params.append("remote", "true");
      params.append("page", page.toString());
      params.append("limit", "12");

      const response = await axios.get(`${API}/jobs?${params.toString()}`, { withCredentials: true });
      setJobs(response.data.jobs);
      setTotalPages(response.data.pages);
      setTotal(response.data.total);
      setRequiresSubscription(response.data.requires_subscription || false);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
        toast.error("Clients cannot browse jobs. Please visit the talent marketplace instead.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("search", value);
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleCategoryChange = (value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "All Categories") {
      newParams.set("category", value);
    } else {
      newParams.delete("category");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleRemoteChange = (checked) => {
    const newParams = new URLSearchParams(searchParams);
    if (checked) {
      newParams.set("remote", "true");
    } else {
      newParams.delete("remote");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const openJob = async (job) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      navigate(`/jobs/${job.id}`);
      return;
    }
    setSelectedId(job.id);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API}/jobs/${job.id}`, { withCredentials: true });
      setSelectedJob(res.data);
    } catch (e) {
      setSelectedJob(job);
    } finally {
      setDetailLoading(false);
    }
  };

  // Auto-select a job on desktop (or the one from ?job=)
  useEffect(() => {
    if (requiresSubscription || jobs.length === 0) return;
    const targetId = searchParams.get("job");
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
    if (targetId) {
      if (selectedId === targetId) return;
      const found = jobs.find((j) => j.id === targetId);
      openJob(found || { id: targetId });
      return;
    }
    if (isDesktop && (!selectedId || !jobs.find((j) => j.id === selectedId))) {
      openJob(jobs[0]);
    }
  }, [jobs, requiresSubscription, searchParams]);

  // Load applied job ids for freelancers
  useEffect(() => {
    if (user?.role === "freelancer") {
      axios
        .get(`${API}/jobs/applications/my`, { withCredentials: true })
        .then((r) => setAppliedIds(new Set((r.data || []).map((a) => a.job_id))))
        .catch(() => {});
    }
  }, [user]);

  const handleApply = async (e) => {
    if (e) e.preventDefault();
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/jobs/${selectedJob.id}/apply`,
        {
          cover_letter: applyForm.cover_letter,
          proposed_rate: applyForm.proposed_rate ? Number(applyForm.proposed_rate) : null,
          proposed_rate_type: applyForm.proposed_rate_type,
          estimated_duration: applyForm.estimated_duration,
        },
        { withCredentials: true }
      );
      toast.success("Application submitted! The client will be notified.");
      setAppliedIds((prev) => new Set(prev).add(selectedJob.id));
      setShowApply(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/messages`,
        {
          receiver_id: selectedJob.client_id,
          content: `Regarding your job "${selectedJob.title}":\n\n${messageContent}`,
        },
        { withCredentials: true }
      );
      toast.success("Message sent!");
      setShowMessage(false);
      setMessageContent("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const jobTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr), now = new Date(), diff = now - d;
    const h = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
    if (h < 1) return "Just now";
    if (h < 24) return `${h}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const fmtBudget = (job) => {
    if (job.budget_min && job.budget_max) return `$${job.budget_min.toLocaleString()} - $${job.budget_max.toLocaleString()}`;
    if (job.budget_min) return `From $${job.budget_min.toLocaleString()}`;
    if (job.budget_max) return `Up to $${job.budget_max.toLocaleString()}`;
    return "Budget negotiable";
  };

  const getInitials = (name) => (!name ? "C" : name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2));

  const renderPagination = () =>
    totalPages > 1 ? (
      <div className="mt-6 flex items-center justify-center gap-2" data-testid="pagination">
        <Button variant="outline" size="icon" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600 px-2">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="icon" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    ) : null;


  // Redirect clients to freelancers page
  useEffect(() => {
    if (user?.role === "client") {
      navigate("/freelancers");
      toast.info("Clients can browse talent, not jobs. Redirecting...");
    }
  }, [user, navigate]);

  if (accessDenied || user?.role === "client") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">
            Clients cannot browse job listings. You can post jobs and browse talent instead.
          </p>
          <Button className="bg-cyan-600 hover:bg-cyan-700" asChild>
            <Link to="/freelancers">Browse Talent</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="jobs-list-page">
      <Navbar />

      {/* Preview banner for guests and non-subscribed freelancers */}
      {requiresSubscription && user?.role !== "client" && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6" />
              <div>
                <p className="font-semibold">{user ? "Unlock Full Job Details" : "Sign up to unlock full job details"}</p>
                <p className="text-sm text-indigo-100">
                  {user
                    ? "Subscribe to view complete job descriptions, budgets, and client information"
                    : "You're viewing job titles only. Sign up to see descriptions, budgets and client info."}
                </p>
              </div>
            </div>
            <Button variant="secondary" asChild>
              <Link to={user ? "/pricing" : "/register"}>{user ? "View Plans" : "Sign up"}</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Jobs</h1>
              <p className="mt-2 text-gray-600">Discover opportunities that match your skills</p>
            </div>
            {user?.role === "client" && (
              <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link to="/jobs/post">
                  <Plus className="h-4 w-4 mr-2" />
                  Post a Job
                </Link>
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search jobs by title, skills..."
                defaultValue={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={category || "All Categories"} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-48" data-testid="category-select">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remote" 
                checked={remoteOnly}
                onCheckedChange={handleRemoteChange}
                data-testid="remote-checkbox"
              />
              <Label htmlFor="remote" className="text-sm text-gray-600 cursor-pointer">
                Remote only
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600" data-testid="results-count">
            {total} job{total !== 1 ? "s" : ""} found
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          requiresSubscription ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="jobs-grid">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              {renderPagination()}
            </>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6" data-testid="jobs-split">
              {/* Job list */}
              <div className="w-full lg:w-[38%] lg:flex-shrink-0 space-y-3 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto lg:pr-1">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => openJob(job)}
                    className={`w-full text-left bg-white rounded-xl border p-4 transition-colors hover:border-indigo-300 ${selectedId === job.id ? "border-indigo-500 ring-1 ring-indigo-200" : "border-gray-200"}`}
                    data-testid={`job-row-${job.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={job.client?.picture} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm">{getInitials(job.client?.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                        <p className="text-sm text-gray-500 truncate">{job.client?.name || "Client"}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1 text-gray-700 font-medium"><DollarSign className="h-3 w-3 text-green-600" />{fmtBudget(job)}</span>
                          {job.remote && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Remote</span>}
                          <span>{jobTimeAgo(job.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {renderPagination()}
              </div>

              {/* Detail pane (desktop) */}
              <div className="hidden lg:block lg:flex-1 min-w-0">
                <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto bg-white rounded-xl border border-gray-200">
                  {detailLoading ? (
                    <div className="p-8 animate-pulse space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-2/3" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-24 bg-gray-200 rounded" />
                    </div>
                  ) : selectedJob ? (
                    <div className="p-6 md:p-8" data-testid="job-detail-pane">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={selectedJob.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{selectedJob.status === "open" ? "Open" : selectedJob.status}</Badge>
                        {selectedJob.remote && <Badge variant="secondary" className="bg-blue-100 text-blue-700"><Globe className="h-3 w-3 mr-1" />Remote</Badge>}
                        <span className="text-gray-500 text-sm">Posted {jobTimeAgo(selectedJob.created_at)}</span>
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 mt-3">{selectedJob.title}</h1>
                      <div className="flex items-center gap-2 mt-1 text-gray-600">
                        <span>by</span>
                        <span className="font-medium text-gray-900">{selectedJob.client?.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-4 text-gray-600 text-sm">
                        <span className="flex items-center gap-1"><DollarSign className="h-4 w-4 text-green-600" /><span className="font-semibold text-gray-900">{fmtBudget(selectedJob)}</span> ({selectedJob.budget_type})</span>
                        {selectedJob.duration && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{selectedJob.duration}</span>}
                        {selectedJob.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{selectedJob.location}</span>}
                        <span className="flex items-center gap-1"><Users className="h-4 w-4" />{selectedJob.applications_count || 0} applicants</span>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-5">
                        {appliedIds.has(selectedJob.id) ? (
                          <Button disabled className="bg-green-600"><CheckCircle className="h-4 w-4 mr-2" />Applied</Button>
                        ) : (
                          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowApply(true)} data-testid="apply-btn"><Briefcase className="h-4 w-4 mr-2" />Apply Now</Button>
                        )}
                        <Button variant="outline" onClick={() => setShowMessage(true)}><MessageSquare className="h-4 w-4 mr-2" />Message</Button>
                        <Button variant="ghost" asChild><Link to={`/jobs/${selectedJob.id}`}>Open full page</Link></Button>
                      </div>

                      <div className="mt-6 pt-6 border-t">
                        <h2 className="font-semibold text-gray-900 mb-2">Job description</h2>
                        <p className="text-gray-600 whitespace-pre-wrap">{selectedJob.description}</p>
                      </div>

                      {selectedJob.skills_required?.length > 0 && (
                        <div className="mt-6">
                          <h2 className="font-semibold text-gray-900 mb-2">Skills and expertise</h2>
                          <div className="flex flex-wrap gap-2">
                            {selectedJob.skills_required.map((s, i) => (
                              <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-700 rounded-full px-3 py-1">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-6 pt-6 border-t">
                        <h2 className="font-semibold text-gray-900 mb-3">About the client</h2>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11">
                            <AvatarImage src={selectedJob.client?.picture} />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">{getInitials(selectedJob.client?.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{selectedJob.client_stats?.company_name || selectedJob.client?.name}</p>
                            {selectedJob.client_stats?.industry && <p className="text-xs text-gray-500 truncate">{selectedJob.client_stats.industry}</p>}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm mt-3">
                          {selectedJob.client_stats?.location && <div className="flex items-center gap-2 text-gray-600"><MapPin className="h-4 w-4 text-gray-400" />{selectedJob.client_stats.location}</div>}
                          <div className="flex items-center gap-2 text-gray-600"><Briefcase className="h-4 w-4 text-gray-400" />{selectedJob.client_stats?.jobs_posted ?? 0} jobs posted{selectedJob.client_stats?.open_jobs ? ` · ${selectedJob.client_stats.open_jobs} open` : ""}</div>
                          {selectedJob.client_stats?.member_since && <div className="flex items-center gap-2 text-gray-600"><Calendar className="h-4 w-4 text-gray-400" />Member since {new Date(selectedJob.client_stats.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-16 text-center text-gray-400">
                      <Briefcase className="h-12 w-12 mx-auto mb-3" />
                      Select a job to view details
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-16 bg-white rounded-xl" data-testid="no-results">
            <Briefcase className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900">No jobs found</h3>
            <p className="text-gray-500 mt-2">
              {search || category ? "Try adjusting your filters" : "Check back soon for new opportunities!"}
            </p>
            {user?.role === "client" && (
              <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link to="/jobs/post">Post the First Job</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Apply dialog */}
      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit a proposal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Cover letter</label>
              <Textarea
                value={applyForm.cover_letter}
                onChange={(e) => setApplyForm({ ...applyForm, cover_letter: e.target.value })}
                rows={5}
                placeholder="Introduce yourself and explain why you're a great fit for this job..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Your rate (USD)</label>
                <Input
                  type="number"
                  min="0"
                  value={applyForm.proposed_rate}
                  onChange={(e) => setApplyForm({ ...applyForm, proposed_rate: e.target.value })}
                  placeholder="e.g. 1500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Rate type</label>
                <div className="flex gap-2 mt-1">
                  {["fixed", "hourly"].map((rt) => (
                    <Button
                      key={rt}
                      type="button"
                      variant={applyForm.proposed_rate_type === rt ? "default" : "outline"}
                      className={applyForm.proposed_rate_type === rt ? "bg-indigo-600 flex-1" : "flex-1"}
                      onClick={() => setApplyForm({ ...applyForm, proposed_rate_type: rt })}
                    >
                      {rt === "fixed" ? "Fixed" : "Hourly"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Estimated duration</label>
              <Input
                value={applyForm.estimated_duration}
                onChange={(e) => setApplyForm({ ...applyForm, estimated_duration: e.target.value })}
                placeholder="e.g. 3 weeks"
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : "Submit proposal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Message dialog */}
      <Dialog open={showMessage} onOpenChange={setShowMessage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to {selectedJob?.client?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <Textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={5}
              placeholder="Introduce yourself and explain why you're a good fit for this job..."
              required
            />
            <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
