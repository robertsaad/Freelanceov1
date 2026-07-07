import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ClipboardList,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  Search,
} from "lucide-react";

const STATUS_META = {
  pending: { label: "Applied", style: "bg-amber-100 text-amber-700" },
  shortlisted: { label: "Shortlisted", style: "bg-blue-100 text-blue-700" },
  hired: { label: "Hired", style: "bg-green-100 text-green-700" },
  declined: { label: "Declined", style: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", style: "bg-gray-100 text-gray-600" },
};

// Ordered progress steps for an application that is moving forward
const STEPS = ["pending", "shortlisted", "hired"];

function ProgressBar({ status }) {
  if (status === "declined" || status === "withdrawn") {
    return (
      <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
        <XCircle className="h-4 w-4 text-red-500" />
        {STATUS_META[status].label}
      </div>
    );
  }
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-2 mt-3">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx;
        return (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                  done ? "bg-cyan-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs ${done ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                {STATUS_META[step].label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 ${i < currentIdx ? "bg-cyan-600" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await axios.get(`${API}/jobs/applications/my`, { withCredentials: true });
      setApplications(res.data);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async (appId) => {
    try {
      await axios.put(`${API}/applications/${appId}`, { status: "withdrawn" }, { withCredentials: true });
      toast.success("Application withdrawn");
      fetchApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to withdraw");
    }
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
    <div className="min-h-screen bg-gray-50" data-testid="my-applications-page">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
        <p className="text-gray-600 mb-8">Track the progress of jobs you've applied to.</p>

        {applications.length > 0 ? (
          <div className="space-y-4" data-testid="applications-list">
            {applications.map((app) => {
              const meta = STATUS_META[app.status] || STATUS_META.pending;
              return (
                <Card key={app.id} data-testid={`application-${app.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/jobs/${app.job_id}`}
                            className="font-semibold text-gray-900 hover:text-cyan-600"
                          >
                            {app.job?.title || "Job"}
                          </Link>
                          <Badge className={meta.style}>{meta.label}</Badge>
                        </div>
                        {app.job?.client?.name && (
                          <p className="text-sm text-gray-500 mt-1">
                            Client: {app.job.client.name}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                          {app.proposed_rate != null && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              ${Number(app.proposed_rate).toLocaleString()} ({app.proposed_rate_type || "fixed"})
                            </span>
                          )}
                          {app.estimated_duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {app.estimated_duration}
                            </span>
                          )}
                          <span>Applied {timeAgo(app.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <ProgressBar status={app.status} />

                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/jobs/${app.job_id}`}>View job</Link>
                      </Button>
                      {app.status === "hired" && app.contract_id && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                          <Link to={`/dashboard/contracts/${app.contract_id}`}>
                            <Briefcase className="h-3 w-3 mr-1" />
                            View contract
                          </Link>
                        </Button>
                      )}
                      {(app.status === "pending" || app.status === "shortlisted") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => withdraw(app.id)}
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card data-testid="no-applications">
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No applications yet</h3>
              <p className="text-gray-500 mt-2 mb-4">
                Browse the job board and apply to jobs that match your skills.
              </p>
              <Button className="bg-cyan-600 hover:bg-cyan-700" asChild>
                <Link to="/jobs">
                  <Search className="h-4 w-4 mr-2" />
                  Find jobs
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
