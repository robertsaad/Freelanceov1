import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  MessageSquare,
  FileText,
  DollarSign,
  Star,
  TrendingUp,
  Eye,
  Clock,
  AlertCircle
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

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

            {/* Stats Cards */}
            {profile && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card data-testid="stat-rating">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Rating</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {profile.average_rating?.toFixed(1) || "N/A"}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <Star className="h-6 w-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-reviews">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Reviews</p>
                        <p className="text-2xl font-bold text-gray-900">{profile.total_reviews}</p>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-rate">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Hourly Rate</p>
                        <p className="text-2xl font-bold text-gray-900">${profile.hourly_rate}</p>
                      </div>
                      <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="stat-status">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <Badge className={profile.subscription_status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {profile.subscription_status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="h-12 w-12 bg-cyan-100 rounded-full flex items-center justify-center">
                        <Eye className="h-6 w-6 text-cyan-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </>
        )}

        {/* Client Dashboard */}
        {user?.role === "client" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/freelancers" data-testid="browse-freelancers-card">
                <Card className="hover:border-cyan-200 cursor-pointer transition-colors h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-cyan-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Browse Freelancers</h3>
                      <p className="text-sm text-gray-500">Find talent for your project</p>
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
