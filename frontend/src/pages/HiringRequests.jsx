import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { FileText, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function HiringRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/hiring-requests`, { withCredentials: true });
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      await axios.put(
        `${API}/hiring-requests/${requestId}`,
        { status },
        { withCredentials: true }
      );
      toast.success(`Request ${status}!`);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update request");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      accepted: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      completed: "bg-blue-100 text-blue-700"
    };
    const icons = {
      pending: <Clock className="h-3 w-3" />,
      accepted: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
      completed: <CheckCircle className="h-3 w-3" />
    };

    return (
      <Badge className={`${styles[status]} flex items-center gap-1`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="hiring-requests-page">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hiring Requests</h1>
        <p className="text-gray-600 mb-8">
          {user?.role === "freelancer" ? "Manage your project requests from clients" : "Track your hiring requests"}
        </p>

        {requests.length > 0 ? (
          <div className="space-y-4" data-testid="requests-list">
            {requests.map((req) => (
              <Card key={req.id} data-testid={`request-${req.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Person Info */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user?.role === "freelancer" ? req.client?.picture : req.freelancer?.user?.picture} />
                        <AvatarFallback className="bg-cyan-600 text-white">
                          {getInitials(user?.role === "freelancer" ? req.client?.name : req.freelancer?.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user?.role === "freelancer" ? req.client?.name : req.freelancer?.user?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {user?.role === "freelancer" ? "Client" : req.freelancer?.title}
                        </p>
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{req.project_title}</h3>
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{req.project_description}</p>
                        </div>
                        {getStatusBadge(req.status)}
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Budget: ${req.budget}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Actions for Freelancer */}
                      {user?.role === "freelancer" && req.status === "pending" && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateRequestStatus(req.id, "accepted")}
                            data-testid={`accept-btn-${req.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => updateRequestStatus(req.id, "rejected")}
                            data-testid={`reject-btn-${req.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {/* Mark Complete for accepted requests */}
                      {user?.role === "freelancer" && req.status === "accepted" && (
                        <Button
                          size="sm"
                          className="mt-4 bg-blue-600 hover:bg-blue-700"
                          onClick={() => updateRequestStatus(req.id, "completed")}
                          data-testid={`complete-btn-${req.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card data-testid="no-requests">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No requests yet</h3>
              <p className="text-gray-500 mt-2">
                {user?.role === "freelancer"
                  ? "When clients send you hiring requests, they'll appear here"
                  : "Send hiring requests to freelancers to get started"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
