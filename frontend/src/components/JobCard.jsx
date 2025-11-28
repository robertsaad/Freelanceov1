import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Clock, DollarSign, Briefcase } from "lucide-react";

export default function JobCard({ job }) {
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
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link to={`/jobs/${job.id}`} data-testid={`job-card-${job.id}`}>
      <Card className="freelancer-card h-full hover:border-indigo-200 cursor-pointer">
        <CardContent className="p-6">
          {/* Header with client info */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={job.client?.picture} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm">
                  {getInitials(job.client?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-gray-500">{job.client?.name || "Client"}</p>
                <p className="text-xs text-gray-400">{timeAgo(job.created_at)}</p>
              </div>
            </div>
            {job.remote && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                Remote
              </Badge>
            )}
          </div>

          {/* Job Title */}
          <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
            {job.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {job.description}
          </p>

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {job.skills_required?.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="secondary" className="bg-indigo-50 text-indigo-700 text-xs">
                {skill}
              </Badge>
            ))}
            {job.skills_required?.length > 3 && (
              <Badge variant="secondary" className="text-gray-500 text-xs">
                +{job.skills_required.length - 3}
              </Badge>
            )}
          </div>

          {/* Footer with budget and details */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1 text-gray-600">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-gray-900">{formatBudget()}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {job.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{job.duration}</span>
                </div>
              )}
              {job.applications_count > 0 && (
                <div className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  <span>{job.applications_count} applied</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
