import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API, BACKEND_URL } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Star,
  Calendar,
  ExternalLink,
  MessageSquare,
  Briefcase,
  Send,
  CheckCircle,
  UserPlus,
  UserMinus,
  ArrowLeft
} from "lucide-react";

export default function FreelancerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [freelancer, setFreelancer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHiringModal, setShowHiringModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Form states
  const [hiringForm, setHiringForm] = useState({
    project_title: "",
    project_description: "",
    budget: ""
  });
  const [messageContent, setMessageContent] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFreelancer();
    fetchReviews();
    checkFollowStatus();
  }, [id]);

  const fetchFreelancer = async () => {
    try {
      const response = await axios.get(`${API}/freelancers/${id}`);
      setFreelancer(response.data);
    } catch (error) {
      console.error("Error fetching freelancer:", error);
      toast.error("Freelancer not found");
      navigate("/freelancers");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/freelancers/${id}/reviews`);
      setReviews(response.data.reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await axios.get(`${API}/freelancers/${id}/is-following`, { withCredentials: true });
      setIsFollowing(response.data.is_following);
    } catch (error) {
      // Not logged in or error
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please login to follow freelancers");
      navigate("/login");
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await axios.delete(`${API}/freelancers/${id}/follow`, { withCredentials: true });
        setIsFollowing(false);
        toast.success("Unfollowed successfully");
      } else {
        await axios.post(`${API}/freelancers/${id}/follow`, {}, { withCredentials: true });
        setIsFollowing(true);
        toast.success("Following! You'll see their posts in your feed.");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleHiringSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to send a hiring request");
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/hiring-requests`,
        {
          freelancer_id: freelancer.id,
          ...hiringForm,
          budget: parseFloat(hiringForm.budget)
        },
        { withCredentials: true }
      );
      toast.success("Hiring request sent successfully!");
      setShowHiringModal(false);
      setHiringForm({ project_title: "", project_description: "", budget: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send request");
    } finally {
      setSubmitting(false);
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
          receiver_id: freelancer.user_id,
          content: messageContent
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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to leave a review");
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/freelancers/${id}/reviews`,
        reviewForm,
        { withCredentials: true }
      );
      toast.success("Review submitted successfully!");
      setShowReviewModal(false);
      setReviewForm({ rating: 5, comment: "" });
      fetchReviews();
      fetchFreelancer();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "F";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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

  if (!freelancer) return null;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="freelancer-profile-page">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-gray-600" onClick={() => { if (window.history.length > 1) { navigate(-1); } else { const owner = user?.id && (freelancer?.user_id || freelancer?.user?.id) === user.id; navigate(owner ? "/dashboard/profile" : "/freelancers"); } }} data-testid="back-btn">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {/* Main Profile Card */}
        <Card className="mb-6" data-testid="profile-card">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <Avatar className="h-32 w-32 mx-auto md:mx-0">
                <AvatarImage src={freelancer.user?.picture} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-indigo-500 text-white text-3xl">
                  {getInitials(freelancer.user?.name)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h1 className="text-2xl font-bold text-gray-900" data-testid="freelancer-name">
                    {freelancer.user?.name}
                  </h1>
                  {freelancer.is_available && (
                    <Badge className="bg-green-100 text-green-700 w-fit mx-auto md:mx-0">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  )}
                </div>
                <p className="text-xl text-cyan-600 font-medium mt-1" data-testid="freelancer-title">
                  {freelancer.title}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-gray-500">
                  {freelancer.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{freelancer.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>${freelancer.hourly_rate}/hr</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span>{freelancer.average_rating?.toFixed(1) || "New"}</span>
                    <span className="text-gray-400">({freelancer.total_reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{freelancer.experience_years} years exp</span>
                  </div>
                </div>

                <p className="mt-4 text-gray-600" data-testid="freelancer-bio">
                  {freelancer.bio}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {freelancer.skills?.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="skill-tag text-cyan-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t justify-center md:justify-start">
              {/* Follow Button */}
              <Button
                variant={isFollowing ? "outline" : "default"}
                className={!isFollowing ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                onClick={handleFollow}
                disabled={followLoading}
                data-testid="follow-btn"
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>

              {/* Hiring Modal */}
              <Dialog open={showHiringModal} onOpenChange={setShowHiringModal}>
                <DialogTrigger asChild>
                  <Button className="bg-cyan-600 hover:bg-cyan-700" data-testid="hire-btn">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Hire Me
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Hiring Request</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleHiringSubmit} className="space-y-4">
                    <div>
                      <Label>Project Title</Label>
                      <Input
                        value={hiringForm.project_title}
                        onChange={(e) => setHiringForm({...hiringForm, project_title: e.target.value})}
                        required
                        data-testid="project-title-input"
                      />
                    </div>
                    <div>
                      <Label>Project Description</Label>
                      <Textarea
                        value={hiringForm.project_description}
                        onChange={(e) => setHiringForm({...hiringForm, project_description: e.target.value})}
                        rows={4}
                        required
                        data-testid="project-description-input"
                      />
                    </div>
                    <div>
                      <Label>Budget ($)</Label>
                      <Input
                        type="number"
                        value={hiringForm.budget}
                        onChange={(e) => setHiringForm({...hiringForm, budget: e.target.value})}
                        required
                        data-testid="budget-input"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-cyan-600" disabled={submitting} data-testid="submit-hiring-btn">
                      {submitting ? "Sending..." : "Send Request"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Message Modal */}
              <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="message-btn">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Message</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <Label>Message</Label>
                      <Textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        rows={4}
                        placeholder="Write your message..."
                        required
                        data-testid="message-input"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-cyan-600" disabled={submitting} data-testid="send-message-btn">
                      <Send className="h-4 w-4 mr-2" />
                      {submitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Section */}
        {freelancer.portfolio_items?.length > 0 && (
          <Card className="mb-6" data-testid="portfolio-section">
            <CardHeader>
              <CardTitle>Portfolio ({freelancer.portfolio_items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {freelancer.portfolio_items.slice(0, 6).map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:border-cyan-200 transition-colors">
                    {item.media_type === "image" && item.media_url ? (
                      <img
                        src={item.media_url.startsWith("http") ? item.media_url : `${BACKEND_URL}${item.media_url}`}
                        alt={item.title}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                      />
                    ) : item.media_type === "video" && item.media_url ? (
                      <video
                        src={item.media_url.startsWith("http") ? item.media_url : `${BACKEND_URL}${item.media_url}`}
                        controls
                        className="w-full h-40 object-cover rounded-lg mb-3 bg-black"
                      />
                    ) : item.media_type === "audio" && item.media_url ? (
                      <audio
                        src={item.media_url.startsWith("http") ? item.media_url : `${BACKEND_URL}${item.media_url}`}
                        controls
                        className="w-full mb-3"
                      />
                    ) : item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                      />
                    ) : null}
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{item.description}</p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-600 text-sm mt-2 hover:underline"
                      >
                        View Project <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {freelancer.portfolio_items.length > 6 && (
                <div className="text-center mt-6">
                  <Button variant="outline" onClick={() => navigate(`/freelancers/${id}/portfolio`)} data-testid="view-all-portfolio">
                    Show all {freelancer.portfolio_items.length} projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Work history (employment) */}
        {freelancer.employment_history?.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Work history</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {freelancer.employment_history.map((job, i) => (
                <div key={i} className="border-l-2 border-cyan-100 pl-4">
                  <h4 className="font-semibold text-gray-900">{job.title}{job.company ? ` · ${job.company}` : ""}</h4>
                  <p className="text-sm text-gray-500">{[job.start_date, job.currently_working ? "Present" : job.end_date].filter(Boolean).join(" - ")}</p>
                  {job.description && <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">{job.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {freelancer.certifications?.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Certifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {freelancer.certifications.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.issuer && <p className="text-sm text-gray-500">{c.issuer}</p>}
                  </div>
                  {c.year && <span className="text-sm text-gray-400">{c.year}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {freelancer.education?.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Education</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {freelancer.education.map((ed, i) => (
                <div key={i}>
                  <p className="font-medium text-gray-900">{ed.school}</p>
                  <p className="text-sm text-gray-600">{[ed.degree, ed.field_of_study].filter(Boolean).join(", ")}</p>
                  <p className="text-xs text-gray-400">{[ed.start_year, ed.end_year].filter(Boolean).join(" - ")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Languages */}
        {freelancer.languages?.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Languages</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {freelancer.languages.map((l, i) => (
                  <Badge key={i} variant="secondary">{l.language}{l.proficiency ? ` — ${l.proficiency}` : ""}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other experiences */}
        {freelancer.other_experiences?.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Other experiences</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {freelancer.other_experiences.map((o, i) => (
                <div key={i}>
                  <p className="font-medium text-gray-900">{o.title}</p>
                  {o.description && <p className="text-sm text-gray-600 mt-1">{o.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        <Card data-testid="reviews-section">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reviews ({freelancer.total_reviews})</CardTitle>
            {user?.role === "client" && (
              <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="write-review-btn">
                    Write Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Write a Review</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <Label>Rating</Label>
                      <div className="mt-2">
                        <StarRating
                          rating={reviewForm.rating}
                          onRate={(r) => setReviewForm({...reviewForm, rating: r})}
                          interactive
                          size="lg"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Comment</Label>
                      <Textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                        rows={4}
                        placeholder="Share your experience..."
                        required
                        data-testid="review-comment-input"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-cyan-600" disabled={submitting} data-testid="submit-review-btn">
                      {submitting ? "Submitting..." : "Submit Review"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-0" data-testid={`review-${review.id}`}>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={review.client?.picture} />
                        <AvatarFallback className="bg-gray-200">
                          {getInitials(review.client?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.client?.name}</span>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                        <p className="text-gray-600 mt-1">{review.comment}</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No reviews yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
