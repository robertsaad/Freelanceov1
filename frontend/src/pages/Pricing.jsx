import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: 19.99,
    period: "month",
    features: [
      "Profile visible to all clients",
      "Unlimited portfolio items",
      "Direct messaging",
      "Receive hiring requests",
      "Priority support"
    ]
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 149.99,
    period: "year",
    popular: true,
    savings: "Save 37%",
    features: [
      "Everything in Monthly",
      "Featured in search results",
      "Profile badge",
      "Analytics dashboard",
      "Priority support"
    ]
  }
];

export default function Pricing() {
  const { user } = useAuth();

  const handleSubscribe = async (packageType) => {
    if (!user) {
      toast.error("Please login to subscribe");
      return;
    }

    if (user.role !== "freelancer") {
      toast.error("Only freelancers can subscribe");
      return;
    }

    try {
      const response = await axios.post(
        `${API}/payments/checkout`,
        {
          package_type: packageType,
          origin_url: window.location.origin
        },
        { withCredentials: true }
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to initiate checkout");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="pricing-page">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-xl text-gray-600">
            Choose the plan that works best for you
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? "pricing-popular" : "border-gray-200"}`}
              data-testid={`pricing-card-${plan.id}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-cyan-600 text-white px-4 py-1">
                    <Zap className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                {plan.savings && (
                  <Badge variant="secondary" className="w-fit mx-auto mt-2 bg-green-100 text-green-700">
                    {plan.savings}
                  </Badge>
                )}
                <div className="mt-4">
                  <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">/{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-cyan-600" />
                      </div>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {user ? (
                  user.role === "freelancer" ? (
                    <Button
                      className={`w-full h-12 text-base ${plan.popular ? "bg-cyan-600 hover:bg-cyan-700" : ""}`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.id)}
                      data-testid={`subscribe-btn-${plan.id}`}
                    >
                      Subscribe Now
                    </Button>
                  ) : (
                    <p className="text-center text-gray-500 text-sm">
                      Subscriptions are for freelancers only
                    </p>
                  )
                ) : (
                  <Button
                    className={`w-full h-12 text-base ${plan.popular ? "bg-cyan-600 hover:bg-cyan-700" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/register">Get Started</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="max-w-2xl mx-auto space-y-4 text-left">
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium text-gray-900">Can I cancel anytime?</h3>
              <p className="text-gray-600 text-sm mt-1">Yes, you can cancel your subscription at any time. Your profile will remain active until the end of your billing period.</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium text-gray-900">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm mt-1">We accept all major credit cards through our secure Stripe payment processor.</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium text-gray-900">What happens if I don't renew?</h3>
              <p className="text-gray-600 text-sm mt-1">Your profile will no longer be visible to clients, but your data and portfolio will be saved for when you resubscribe.</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
