import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Bell } from "lucide-react";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const fetchUnread = async () => {
    try {
      const r = await axios.get(`${API}/notifications/unread-count`, { withCredentials: true });
      setUnread(r.data.count || 0);
    } catch (e) {
      /* ignore */
    }
  };

  const fetchList = async () => {
    try {
      const r = await axios.get(`${API}/notifications?limit=12`, { withCredentials: true });
      setItems(r.data.notifications || []);
      setUnread(r.data.unread_count || 0);
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 45000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) fetchList();
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openItem = async (n) => {
    try {
      if (!n.is_read) {
        await axios.put(`${API}/notifications/${n.id}/read`, {}, { withCredentials: true });
      }
    } catch (e) {
      /* ignore */
    }
    setOpen(false);
    fetchUnread();
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, { withCredentials: true });
      setUnread(0);
      fetchList();
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        data-testid="notification-bell"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unread > 0 && (
          <span
            className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
            data-testid="notification-badge"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length > 0 ? (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 flex gap-3 transition-colors ${
                    !n.is_read ? "bg-cyan-50/40" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                      !n.is_read ? "bg-cyan-500" : "bg-transparent"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">No notifications yet</p>
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className="block w-full text-center text-sm text-cyan-600 hover:bg-gray-50 py-2.5 border-t border-gray-100 font-medium"
          >
            View all
          </button>
        </div>
      )}
    </div>
  );
}
