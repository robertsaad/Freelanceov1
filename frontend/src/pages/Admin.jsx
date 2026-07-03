import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Users,
  Briefcase,
  DollarSign,
  Star,
  Shield,
  Ban,
  CheckCircle,
  Trash2,
  Search,
} from "lucide-react";

const api = axios.create({ baseURL: API, withCredentials: true });

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-lg bg-cyan-50 flex items-center justify-center">
            <Icon className="h-5 w-5 text-cyan-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfirmDelete({ onConfirm, label = "Delete" }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("users");

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (e) {
      toast.error("Failed to load stats");
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-cyan-600" />
          <h1 className="text-2xl font-bold text-gray-900" data-testid="admin-title">
            Admin Dashboard
          </h1>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats.users.total}
              sub={`${stats.users.freelancers} freelancers · ${stats.users.clients} clients`}
            />
            <StatCard
              icon={Star}
              label="Active Subscriptions"
              value={stats.freelancer_profiles.active_subscriptions}
              sub={`${stats.freelancer_profiles.total} profiles`}
            />
            <StatCard
              icon={Briefcase}
              label="Jobs"
              value={stats.jobs.total}
              sub={`${stats.jobs.open} open · ${stats.jobs.applications} applications`}
            />
            <StatCard
              icon={DollarSign}
              label="Revenue"
              value={`$${stats.revenue.total}`}
              sub={`${stats.revenue.paid_transactions} paid`}
            />
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="freelancers" data-testid="tab-freelancers">Freelancers</TabsTrigger>
            <TabsTrigger value="jobs" data-testid="tab-jobs">Jobs</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab currentUserId={user?.id} onChange={loadStats} />
          </TabsContent>
          <TabsContent value="freelancers">
            <FreelancersTab onChange={loadStats} />
          </TabsContent>
          <TabsContent value="jobs">
            <JobsTab onChange={loadStats} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative mb-4 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="admin-search"
      />
    </div>
  );
}

function UsersTab({ currentUserId, onChange }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users", { params: { search: search || undefined } });
      setItems(res.data.users);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const setStatus = async (id, isActive) => {
    try {
      await api.patch(`/admin/users/${id}/status`, { is_active: isActive });
      toast.success(isActive ? "User reactivated" : "User banned");
      load();
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  const setRole = async (id, role) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      toast.success("Role updated");
      load();
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("User deleted");
      load();
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Users</CardTitle>
      </CardHeader>
      <CardContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-400">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-400">No users</TableCell></TableRow>
            ) : (
              items.map((u) => {
                const isSelf = u.id === currentUserId;
                const active = u.is_active !== false;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-gray-500">{u.email}</TableCell>
                    <TableCell>
                      <select
                        className="border rounded px-2 py-1 text-sm disabled:opacity-50"
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => setRole(u.id, e.target.value)}
                        data-testid="user-role-select"
                      >
                        <option value="freelancer">freelancer</option>
                        <option value="client">client</option>
                        <option value="admin">admin</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      {active ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Banned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-1">
                          {active ? (
                            <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => setStatus(u.id, false)}>
                              <Ban className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => setStatus(u.id, true)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <ConfirmDelete onConfirm={() => remove(u.id)} label="Delete user" />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FreelancersTab({ onChange }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/freelancers", { params: { search: search || undefined } });
      setItems(res.data.freelancers);
    } catch (e) {
      toast.error("Failed to load freelancers");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const toggleSuspend = async (id, value) => {
    try {
      await api.patch(`/admin/freelancers/${id}/suspend`, { is_suspended: value });
      toast.success(value ? "Profile suspended" : "Profile restored");
      load();
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  const toggleFeature = async (id, value) => {
    try {
      await api.patch(`/admin/freelancers/${id}/feature`, { is_featured: value });
      toast.success(value ? "Profile featured" : "Removed from featured");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/freelancers/${id}`);
      toast.success("Profile deleted");
      load();
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Freelancer Profiles</CardTitle>
      </CardHeader>
      <CardContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by title or category" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400">No profiles</TableCell></TableRow>
            ) : (
              items.map((p) => {
                const suspended = p.is_suspended === true;
                const featured = p.is_featured === true;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title || p.user?.name || "—"}</TableCell>
                    <TableCell className="text-gray-500">{p.category || "—"}</TableCell>
                    <TableCell>
                      <Badge className={p.subscription_status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                        {p.subscription_status || "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{(p.average_rating || 0).toFixed(1)} ({p.total_reviews || 0})</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {featured && <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100">Featured</Badge>}
                        {suspended && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Suspended</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className={featured ? "text-cyan-600" : "text-gray-400"} onClick={() => toggleFeature(p.id, !featured)} title="Toggle featured">
                          <Star className="h-4 w-4" fill={featured ? "currentColor" : "none"} />
                        </Button>
                        {suspended ? (
                          <Button variant="ghost" size="sm" className="text-green-600" onClick={() => toggleSuspend(p.id, false)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-amber-600" onClick={() => toggleSuspend(p.id, true)}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        <ConfirmDelete onConfirm={() => remove(p.id)} label="Delete profile" />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function JobsTab({ onChange }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/jobs", { params: { search: search || undefined } });
      setItems(res.data.jobs);
    } catch (e) {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/jobs/${id}/status`, { status });
      toast.success("Job status updated");
      load();
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/jobs/${id}`);
      toast.success("Job deleted");
      load();
      onChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by title or category" />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Applications</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-400">No jobs</TableCell></TableRow>
            ) : (
              items.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.title}</TableCell>
                  <TableCell className="text-gray-500">{j.client?.name || "—"}</TableCell>
                  <TableCell className="text-gray-500">{j.category || "—"}</TableCell>
                  <TableCell>{j.applications_count || 0}</TableCell>
                  <TableCell>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={j.status}
                      onChange={(e) => setStatus(j.id, e.target.value)}
                      data-testid="job-status-select"
                    >
                      <option value="open">open</option>
                      <option value="closed">closed</option>
                      <option value="filled">filled</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmDelete onConfirm={() => remove(j.id)} label="Delete job" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/payments");
        setItems(res.data.transactions);
      } catch (e) {
        toast.error("Failed to load payments");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusBadge = (s) => {
    if (s === "paid") return "bg-green-100 text-green-700 hover:bg-green-100";
    if (s === "pending") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
    return "bg-gray-100 text-gray-600 hover:bg-gray-100";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-400">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-400">No transactions</TableCell></TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.user?.name || t.user?.email || "—"}</TableCell>
                  <TableCell className="text-gray-500">{t.package_type || "—"}</TableCell>
                  <TableCell>${(t.amount || 0).toFixed(2)} {(t.currency || "").toUpperCase()}</TableCell>
                  <TableCell>
                    <Badge className={statusBadge(t.payment_status)}>{t.payment_status || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
