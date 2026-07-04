import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  CalendarClock,
  Receipt,
  Sparkles,
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

export default function Billing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axios
      .get(`${API}/billing/me`, { withCredentials: true })
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch(() => {
        if (active) setData({ transactions: [] });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isActive = data?.subscription_status === "active";
  const plan = data?.current_plan;
  const transactions = data?.transactions || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="billing-page">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Membership &amp; Billing</h1>
          <p className="text-gray-600 mt-1">
            Manage your Freelanceo membership and view your payment history.
          </p>
        </div>

        {/* No service fee reassurance */}
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <CardContent className="p-5 flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">You keep 100% of what you earn</p>
              <p className="text-sm text-emerald-800 mt-0.5">
                Freelanceo never takes a service fee or commission on your work. You only pay a
                simple monthly membership fee to stay visible to clients.
              </p>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Membership status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card data-testid="membership-status">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                    <CreditCard className="h-4 w-4" /> Membership
                  </div>
                  <Badge
                    className={
                      isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-3">
                    {plan ? plan.name : "No active plan"}
                    {plan && (
                      <span className="font-semibold">
                        {" "}
                        · ${plan.amount}/{plan.package_type === "yearly" ? "yr" : "mo"}
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                    <CalendarClock className="h-4 w-4" />
                    {isActive ? "Renews / expires" : "Status"}
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {isActive ? formatDate(data?.subscription_expires_at) : "Not subscribed"}
                  </p>
                  {isActive && (
                    <p className="text-xs text-gray-500 mt-1">
                      Your profile stays visible until this date.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                    <Receipt className="h-4 w-4" /> Total paid
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    ${(data?.total_paid ?? 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Across all membership payments</p>
                </CardContent>
              </Card>
            </div>

            {/* CTA when inactive */}
            {!isActive && (
              <Card className="mb-8 border-cyan-200 bg-cyan-50">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-6 w-6 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-cyan-900">
                        Activate your membership to get discovered
                      </p>
                      <p className="text-sm text-cyan-800 mt-0.5">
                        Subscribe to make your profile visible to clients and apply to jobs.
                      </p>
                    </div>
                  </div>
                  <Button className="bg-cyan-600 hover:bg-cyan-700" asChild>
                    <Link to="/pricing">
                      View plans <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Billing history */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billing history</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <Receipt className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p>No payments yet.</p>
                    <p className="text-sm mt-1">
                      Your membership payments will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="py-2 pr-4 font-medium">Date</th>
                          <th className="py-2 pr-4 font-medium">Plan</th>
                          <th className="py-2 pr-4 font-medium">Amount</th>
                          <th className="py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t, i) => (
                          <tr key={t.session_id || i} className="border-b last:border-0">
                            <td className="py-3 pr-4 text-gray-700">
                              {formatDate(t.created_at)}
                            </td>
                            <td className="py-3 pr-4 text-gray-700 capitalize">
                              {t.package_type || "—"}
                            </td>
                            <td className="py-3 pr-4 text-gray-900 font-medium">
                              ${Number(t.amount || 0).toFixed(2)}
                            </td>
                            <td className="py-3">
                              {t.payment_status === "paid" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 className="h-4 w-4" /> Paid
                                </span>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600 capitalize">
                                  {t.payment_status || "pending"}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
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
