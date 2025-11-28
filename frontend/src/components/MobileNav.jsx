import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { Home, Users, MessageSquare, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";

export default function MobileNav() {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCounts();
      // Poll every 30 seconds
      const interval = setInterval(fetchUnreadCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCounts = async () => {
    try {
      const [notifRes] = await Promise.all([
        axios.get(`${API}/notifications/unread-count`, { withCredentials: true })
      ]);
      setUnreadNotifications(notifRes.data.count);
    } catch (error) {
      console.error("Error fetching unread counts", error);
    }
  };

  if (!user) return null;

  const navItems = [
    {
      name: "Feed",
      icon: Home,
      path: "/feed",
      testId: "nav-feed"
    },
    {
      name: "Talent",
      icon: Users,
      path: "/freelancers",
      testId: "nav-talent"
    },
    {
      name: "Messages",
      icon: MessageSquare,
      path: "/dashboard/messages",
      badge: unreadMessages,
      testId: "nav-messages"
    },
    {
      name: "Alerts",
      icon: Bell,
      path: "/notifications",
      badge: unreadNotifications,
      testId: "nav-alerts"
    }
  ];

  const isActive = (path) => {
    if (path === "/feed") {
      return location.pathname === "/feed" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom" data-testid="mobile-nav">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-2 relative ${
                active ? "text-cyan-600" : "text-gray-500"
              }`}
              data-testid={item.testId}
            >
              <div className="relative">
                <item.icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : ""}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 ${active ? "font-semibold" : "font-medium"}`}>
                {item.name}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
