import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState("loading"); // loading, success, failed
  const [attempts, setAttempts] = useState(0);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus("failed");
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    if (attempts >= 5) {
      setStatus("failed");
      return;
    }

    try {
      const response = await axios.get(
        `${API}/payments/status/${sessionId}`,
        { withCredentials: true }
      );

      if (response.data.payment_status === "paid") {
        setStatus("success");
      } else if (response.data.status === "expired") {
        setStatus("failed");
      } else {
        // Still pending, poll again
        setAttempts(prev => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="payment-success-page">
      <Navbar />

      <div className="max-w-md mx-auto px-4 py-16">
        <Card>
          <CardContent className="p-8 text-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 mx-auto text-cyan-600 animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Processing Payment</h2>
                <p className="text-gray-600 mt-2">Please wait while we confirm your payment...</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900" data-testid="success-message">Payment Successful!</h2>
                <p className="text-gray-600 mt-2">
                  Your subscription is now active. Your profile is visible to clients!
                </p>
                <div className="mt-6 space-y-3">
                  <Button className="w-full bg-cyan-600 hover:bg-cyan-700" asChild>
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/dashboard/profile">Edit Profile</Link>
                  </Button>
                </div>
              </>
            )}

            {status === "failed" && (
              <>
                <div className="h-16 w-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900" data-testid="failed-message">Payment Failed</h2>
                <p className="text-gray-600 mt-2">
                  We couldn't process your payment. Please try again.
                </p>
                <div className="mt-6 space-y-3">
                  <Button className="w-full bg-cyan-600 hover:bg-cyan-700" asChild>
                    <Link to="/pricing">Try Again</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
