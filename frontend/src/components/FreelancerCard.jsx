import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Clock } from "lucide-react";

export default function FreelancerCard({ freelancer }) {
  const getInitials = (name) => {
    if (!name) return "F";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Link to={`/freelancers/${freelancer.id}`} data-testid={`freelancer-card-${freelancer.id}`}>
      <Card className="freelancer-card h-full hover:border-cyan-200 cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={freelancer.user?.picture} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-indigo-500 text-white text-lg">
                {getInitials(freelancer.user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {freelancer.user?.name || "Freelancer"}
              </h3>
              <p className="text-cyan-600 font-medium text-sm">{freelancer.title}</p>
              {freelancer.location && (
                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{freelancer.location}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-gray-600 text-sm mt-4 line-clamp-2">
            {freelancer.bio}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {freelancer.skills?.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="secondary" className="skill-tag text-cyan-700 text-xs">
                {skill}
              </Badge>
            ))}
            {freelancer.skills?.length > 3 && (
              <Badge variant="secondary" className="text-gray-500 text-xs">
                +{freelancer.skills.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="font-semibold text-gray-900">
                {freelancer.average_rating?.toFixed(1) || "New"}
              </span>
              <span className="text-gray-500 text-sm">({freelancer.total_reviews || 0})</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">${freelancer.hourly_rate}</span>
              <span className="text-sm">/hr</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
