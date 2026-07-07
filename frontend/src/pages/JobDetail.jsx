import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  Calendar,
  Globe,
  MessageSquare,
  Send,
  CheckCircle,
  Users,
  Lock
} from "lucide-react";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applications, setApplications] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    cover_letter: "",
    proposed_rate: "",
    proposed_rate_type: "fixed",
    estimated_duration: "",
  });

  useEffect(() => {
    fetchJob();
    if (user?.role === "freelancer") {
      checkIfApplied();
    }
  }, [id, user]);

  useEffect(() => {
    if (job && user?.id === job.client_id) {
      fetchApplications();
    }
  }, [job, user]);

  const fetchJob = async () => {
    try {
      const response = await axios.get(`${API}/jobs/${id}`, { withCredentials: true });
      setJob(response.data);
      
      // If it's preview only, show a toast
      if (response.data.preview_only) {
        toast.info("Subscribe to view full job details and apply");
      }
    } catch (error) {
      console.error("Error fetching job:", error);
      if (error.response?.status === 403) {
        toast.error("Access denied. Clients cannot view job details.");
        navigate("/freelancers");
      } else {
        toast.error("Job not found");
        navigate("/jobs");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkIfApplied = async () => {
    try {
      const response = await axios.get(`${API}/jobs/applications/my`, { withCredentials: true });
      const applied = response.data.some(app => app.job_id === id);
      setHasApplied(applied);
    } catch (error) {
      // Not logged in or error
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await axios.get(`${API}/jobs/${id}/applications`, { withCredentials: true });
      setApplications(response.data);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const handleApply = async (e) => {
    if (e) e.preventDefault();
    if (!user) {
      toast.error("Please login to apply");
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/jobs/${id}/apply`,
        {
          cover_letter: applyForm.cover_letter,
          proposed_rate: applyForm.proposed_rate ? Number(applyForm.proposed_rate) : null,
          proposed_rate_type: applyForm.proposed_rate_type,
          estimated_duration: applyForm.estimated_duration,
        },
        { withCredentials: true }
      );
      toast.success("Application submitted! The client will be notified.");
      setHasApplied(true);
      setShowApplyModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  };

  const hireApplicant = async (appId) => {
    try {
      const res = await axios.post(
        `${API}/jobs/${id}/applications/${appId}/hire`,
        {},
        { withCredentials: true }
      );
      toast.success("Hired! Set up terms & milestones on the contract.");
      navigate(`/dashboard/contracts/${res.data.contract_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to hire");
    }
  };

  const updateApplication = async (appId, status) => {
    try {
      await axios.put(`${API}/applications/${appId}`, { status }, { withCredentials: true });
      toast.success(`Applicant ${status}`);
      fetchApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to send a message");
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/messages`,
        {
          receiver_id: job.client_id,
          content: `Regarding your job "${job.title}":\n\n${messageContent}`
        },
        { withCredentials: true }
      );
      toast.success("Message sent successfully!");
      setShowMessageModal(false);
      setMessageContent("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "C";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatBudget = () => {
    if (job.budget_min && job.budget_max) {
      return `$${job.budget_min.toLocaleString()} - $${job.budget_max.toLocaleString()}`;
    } else if (job.budget_min) {
      return `From $${job.budget_min.toLocaleString()}`;
    } else if (job.budget_max) {
      return `Up to $${job.budget_max.toLocaleString()}`;
    }
    return "Budget negotiable";
  };

  const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="h-32 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const isOwner = user?.id === job.client_id;
  const isPreviewOnly = job.preview_only;

  // Show subscription prompt for preview-only access
  if (isPreviewOnly) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <Navbar />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Preview Card */}
          <Card className="mb-6 border-2 border-yellow-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Limited Preview</h2>
                  <p className="text-gray-600">You're viewing a limited preview of this job. Subscribe to unlock full details.</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">{job.title}</h1>
              
              <div className="flex flex-wrap gap-3 mb-6">
                {job.category && (
                  <Badge variant="secondary">{job.category}</Badge>
                )}
                {job.remote && (
                  <Badge className="bg-green-100 text-green-700">Remote</Badge>
                )}
                {job.budget_type && (
                  <Badge variant="outline">{job.budget_type === "hourly" ? "Hourly Rate" : "Fixed Price"}</Badge>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">What's Locked:</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    Full job description and requirements
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    Budget and compensation details
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    Client information and contact
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    Ability to apply for this job
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button className="bg-indigo-600 hover:bg-indigo-700 flex-1" asChild>
                  <Link to="/pricing">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Subscribe to Apply
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/jobs">Browse More Jobs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="job-detail-page">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Job Card */}
        <Card className="mb-6" data-testid="job-card">
          <CardContent className="p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={job.client?.picture} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xl">
                  {getInitials(job.client?.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={job.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                    {job.status === "open" ? "Open" : job.status}
                  </Badge>
                  {job.remote && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      <Globe className="h-3 w-3 mr-1" />
                      Remote
                    </Badge>
                  )}
                  <span className="text-gray-500 text-sm">Posted {timeAgo(job.created_at)}</span>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mt-3" data-testid="job-title">
                  {job.title}
                </h1>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-600">by</span>
                  <span className="font-medium text-gray-900">{job.client?.name}</span>
                </div>

                {/* Key Details */}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-gray-600">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-gray-900">{formatBudget()}</span>
                    <span className="text-sm">({job.budget_type})</span>
                  </div>
                  {job.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{job.duration}</span>
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{job.applications_count || 0} applicants</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6 pt-6 border-t">
              <h2 className="font-semibold text-gray-900 mb-3">Job Description</h2>
              <p className="text-gray-600 whitespace-pre-wrap" data-testid="job-description">
                {job.description}
              </p>
            </div>

            {/* Skills */}
            <div className="mt-6">
              <h2 className="font-semibold text-gray-900 mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills_required?.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-indigo-50 text-indigo-700">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {!isOwner && user?.role === "freelancer" && job.status === "open" && (
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
                {hasApplied ? (
                  <Button disabled className="bg-green-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Applied
                  </Button>
                ) : (
                  <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700"
                        data-testid="apply-btn"
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Apply Now
                      </Button>
                    </DialogTrigger>
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
                            data-testid="cover-letter-input"
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
                              data-testid="proposed-rate-input"
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
                            data-testid="duration-input"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-indigo-600"
                          disabled={submitting}
                          data-testid="submit-application-btn"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {submitting ? "Submitting..." : "Submit proposal"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Message Modal */}
                <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="message-btn">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Message to {job.client?.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSendMessage} className="space-y-4">
                      <Textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        rows={5}
                        placeholder="Introduce yourself and explain why you're a good fit for this job..."
                        required
                        data-testid="message-input"
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-indigo-600" 
                        disabled={submitting}
                        data-testid="send-message-btn"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitting ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {!user && job.status === "open" && (
              <div className="mt-6 pt-6 border-t">
                <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                  <Link to="/login">Login to Apply</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications (Owner Only) */}
        {isOwner && (
          <Card data-testid="applications-section">
            <CardHeader>
              <CardTitle>Applications ({applications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={app.freelancer?.picture} />
                          <AvatarFallback className="bg-cyan-600 text-white">
                            {getInitials(app.freelancer?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <Link 
                                to={`/freelancers/${app.freelancer_profile?.id}`}
                                className="font-semibold text-gray-900 hover:text-indigo-600"
                              >
                                {app.freelancer?.name}
                              </Link>
                              <p className="text-sm text-gray-600">{app.freelancer_profile?.title}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {app.status && app.status !== "pending" && (
                                <Badge
                                  className={
                                    app.status === "hired"
                                      ? "bg-green-100 text-green-700"
                                      : app.status === "shortlisted"
                                      ? "bg-blue-100 text-blue-700"
                                      : app.status === "declined"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-100 text-gray-700"
                                  }
                                >
                                  {app.status}
                                </Badge>
                              )}
                              <span className="text-sm text-gray-500">
                                {timeAgo(app.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Proposal */}
                          {(app.proposed_rate || app.estimated_duration) && (
                            <div className="flex flex-wrap gap-4 mt-2 text-sm">
                              {app.proposed_rate != null && (
                                <span className="flex items-center gap-1 text-gray-700">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <span className="font-semibold">${Number(app.proposed_rate).toLocaleString()}</span>
                                  <span className="text-gray-500">({app.proposed_rate_type || "fixed"})</span>
                                </span>
                              )}
                              {app.estimated_duration && (
                                <span className="flex items-center gap-1 text-gray-700">
                                  <Clock className="h-4 w-4" />
                                  {app.estimated_duration}
                                </span>
                              )}
                            </div>
                          )}
                          {app.cover_letter && (
                            <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap bg-gray-50 rounded p-3">
                              {app.cover_letter}
                            </p>
                          )}

                          {app.freelancer_profile && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {app.freelancer_profile.skills?.slice(0, 5).map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/freelancers/${app.freelancer_profile?.id}`}>
                                View Profile
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                            >
                              <Link to={`/dashboard/messages`}>
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Message
                              </Link>
                            </Button>
                            {app.status === "hired" ? (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                                <Link to={`/dashboard/contracts/${app.contract_id}`}>
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  View Contract
                                </Link>
                              </Button>
                            ) : app.status !== "declined" ? (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-indigo-600 hover:bg-indigo-700"
                                  onClick={() => hireApplicant(app.id)}
                                  data-testid={`hire-btn-${app.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Hire
                                </Button>
                                {app.status !== "shortlisted" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateApplication(app.id, "shortlisted")}
                                  >
                                    Shortlist
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => updateApplication(app.id, "declined")}
                                >
                                  Decline
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No applications yet</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
