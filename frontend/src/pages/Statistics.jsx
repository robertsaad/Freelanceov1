import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Users,
  Star,
  MessageSquare,
  FileText,
  Briefcase,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <Card data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900 mt-4">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axios
      .get(`${API}/freelancers/stats/me`, { withCredentials: true })
      .then((res) => {
        if (active) setStats(res.data);
      })
      .catch(() => {
        if (active) setStats(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rating = stats?.average_rating ? Number(stats.average_rating).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="statistics-page">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Stats</h1>
          <p className="text-gray-600 mt-1">
            Track how your profile is performing and where your opportunities come from.
          </p>
        </div>

        {/* No service fee reassurance */}
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <CardContent className="p-5 flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">You keep 100% of what you earn</p>
              <p className="text-sm text-emerald-800 mt-0.5">
                Freelanceo takes no commission on your work — so there are no earnings deductions to
                track here. Your stats focus on visibility and opportunities.
              </p>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !stats ? (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="text-gray-600">
                Create your freelancer profile to start tracking your stats.
              </p>
              <Link to="/dashboard/profile">
                <span className="inline-flex items-center gap-1 text-cyan-600 mt-3">
                  Set up your profile <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Profile metrics */}
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Profile metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard
                icon={Eye}
                label="Profile views"
                value={stats.profile_views ?? 0}
                accent="bg-cyan-100 text-cyan-700"
                sub="Total times clients viewed your profile"
              />
              <StatCard
                icon={Users}
                label="Followers"
                value={stats.followers ?? 0}
                accent="bg-indigo-100 text-indigo-700"
              />
              <StatCard
                icon={Star}
                label="Average rating"
                value={rating}
                accent="bg-amber-100 text-amber-700"
                sub={`${stats.total_reviews ?? 0} review${stats.total_reviews === 1 ? "" : "s"}`}
              />
            </div>

            {/* Opportunities */}
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Opportunities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard
                icon={MessageSquare}
                label="Hiring requests"
                value={stats.hiring_requests_received ?? 0}
                accent="bg-emerald-100 text-emerald-700"
                sub="Requests received from clients"
              />
              <StatCard
                icon={Briefcase}
                label="Applications sent"
                value={stats.applications_sent ?? 0}
                accent="bg-blue-100 text-blue-700"
              />
              <StatCard
                icon={FileText}
                label="Portfolio items"
                value={stats.portfolio_count ?? 0}
                accent="bg-purple-100 text-purple-700"
              />
            </div>

            {/* Account overview */}
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-700 w-fit">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-gray-500 mt-4">Membership</p>
                  <Badge
                    className={
                      stats.subscription_status === "active"
                        ? "bg-emerald-100 text-emerald-700 mt-1"
                        : "bg-gray-100 text-gray-700 mt-1"
                    }
                  >
                    {stats.subscription_status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-700 w-fit">
                    <Eye className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-gray-500 mt-4">Availability</p>
                  <Badge
                    className={
                      stats.is_available
                        ? "bg-emerald-100 text-emerald-700 mt-1"
                        : "bg-gray-100 text-gray-700 mt-1"
                    }
                  >
                    {stats.is_available ? "Available for work" : "Not available"}
                  </Badge>
                </CardContent>
              </Card>
              <StatCard
                icon={CalendarDays}
                label="Member since"
                value={formatDate(stats.member_since)}
                accent="bg-gray-100 text-gray-700"
              />
            </div>
          </>
        )}
      </div>

      <Footer />
      <MobileNav />
    </div>
  );
}
