import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  CheckCircle,
  Star,
  Plus,
  DollarSign,
  Clock,
} from "lucide-react";

const JOB_STATUS_STYLES = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-200 text-gray-600",
  in_progress: "bg-indigo-100 text-indigo-700",
};

export default function MyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API}/jobs/my-jobs`, { withCredentials: true });
      setJobs(res.data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatBudget = (job) => {
    if (job.budget_min && job.budget_max) {
      return `$${job.budget_min.toLocaleString()} - $${job.budget_max.toLocaleString()}`;
    }
    if (job.budget_min) return `From $${job.budget_min.toLocaleString()}`;
    if (job.budget_max) return `Up to $${job.budget_max.toLocaleString()}`;
    return "Budget negotiable";
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const days = Math.floor((Date.now() - d) / 86400000);
    if (days < 1) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="my-jobs-page">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
          <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
            <Link to="/jobs/post">
              <Plus className="h-4 w-4 mr-2" />
              Post a job
            </Link>
          </Button>
        </div>
        <p className="text-gray-600 mb-8">
          Manage your posted jobs and review applicant progress.
        </p>

        {jobs.length > 0 ? (
          <div className="space-y-4" data-testid="jobs-list">
            {jobs.map((job) => (
              <Card key={job.id} data-testid={`job-${job.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="font-semibold text-gray-900 hover:text-indigo-600 text-lg"
                        >
                          {job.title}
                        </Link>
                        <Badge className={JOB_STATUS_STYLES[job.status] || "bg-gray-100 text-gray-700"}>
                          {job.status === "open" ? "Open" : job.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          {formatBudget(job)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Posted {timeAgo(job.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Applicant progress */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className="flex items-center gap-1 text-sm bg-gray-50 rounded-full px-3 py-1 text-gray-700">
                      <Users className="h-4 w-4 text-gray-500" />
                      {job.applicant_count || 0} applicant{(job.applicant_count || 0) === 1 ? "" : "s"}
                    </span>
                    {job.shortlisted_count > 0 && (
                      <span className="flex items-center gap-1 text-sm bg-blue-50 rounded-full px-3 py-1 text-blue-700">
                        <Star className="h-4 w-4" />
                        {job.shortlisted_count} shortlisted
                      </span>
                    )}
                    {job.hired_count > 0 && (
                      <span className="flex items-center gap-1 text-sm bg-green-50 rounded-full px-3 py-1 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        {job.hired_count} hired
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" asChild>
                      <Link to={`/jobs/${job.id}`}>
                        <Users className="h-3 w-3 mr-1" />
                        View applicants
                      </Link>
                    </Button>
                    {job.hired_count > 0 && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/dashboard/contracts">View contracts</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card data-testid="no-jobs">
            <CardContent className="p-12 text-center">
              <Briefcase className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No jobs posted yet</h3>
              <p className="text-gray-500 mt-2 mb-4">
                Post a job to start receiving applications from freelancers.
              </p>
              <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link to="/jobs/post">
                  <Plus className="h-4 w-4 mr-2" />
                  Post a job
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
