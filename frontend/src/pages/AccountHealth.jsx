import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Scale,
  Info,
  CheckCircle2,
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

export default function AccountHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axios
      .get(`${API}/account-health/me`, { withCredentials: true })
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const suspended = data?.is_suspended;
  const fullAccess = !suspended;
  const goodStanding = data?.account_standing === "good";

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="account-health-page">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account health</h1>
          <p className="text-gray-600 mt-1">
            Your standing on Freelanceo and your history with our community policies.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Platform access */}
              <Card data-testid="platform-access">
                <CardHeader>
                  <CardTitle className="text-base text-gray-500 font-medium">
                    Platform access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {fullAccess ? (
                      <ShieldCheck className="h-8 w-8 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="h-8 w-8 text-red-600" />
                    )}
                    <div>
                      <Badge
                        className={
                          fullAccess
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {fullAccess ? "Full access" : "Suspended"}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        {fullAccess
                          ? "You have full access to all Freelanceo features."
                          : "Your account is currently suspended. Contact support for help."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account standing */}
              <Card data-testid="account-standing">
                <CardHeader>
                  <CardTitle className="text-base text-gray-500 font-medium">
                    Account standing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Gauge
                      className={`h-8 w-8 ${goodStanding ? "text-emerald-600" : "text-amber-600"}`}
                    />
                    <div>
                      <Badge
                        className={
                          goodStanding
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {goodStanding ? "Good" : "At risk"}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        {goodStanding
                          ? "Keep it up! Your account is in good standing."
                          : "Your account standing needs attention."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enforcement history */}
            <Card className="mb-4" data-testid="enforcement-history">
              <CardHeader>
                <CardTitle className="text-base text-gray-500 font-medium flex items-center gap-2">
                  <Scale className="h-4 w-4" /> Enforcement history
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {data?.policy_violations ?? 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Policy violations</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {data?.submitted_appeals ?? 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Submitted appeals</p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                  <p className="font-medium text-gray-900">No enforcement actions</p>
                  <p className="text-sm text-gray-500">
                    You have no recorded policy violations. Great work staying within our guidelines.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trust & Safety tips */}
            <Card className="border-cyan-200 bg-cyan-50" data-testid="trust-safety-tips">
              <CardContent className="p-5 flex items-start gap-3">
                <Info className="h-6 w-6 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-cyan-900">Trust &amp; Safety tips</p>
                  <ul className="text-sm text-cyan-800 mt-2 space-y-1 list-disc list-inside">
                    <li>Keep all communication and payments on Freelanceo.</li>
                    <li>Never share sensitive personal or financial information.</li>
                    <li>Deliver work as agreed and communicate clearly with clients.</li>
                    <li>Report suspicious activity to our support team right away.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-gray-400 mt-6 text-center">
              Member since {formatDate(data?.member_since)}
            </p>
          </>
        )}
      </div>

      <Footer />
      <MobileNav />
    </div>
  );
}
