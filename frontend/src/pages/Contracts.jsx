import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Clock,
  CheckCircle,
  Briefcase,
  ArrowRight,
} from "lucide-react";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  ended: "bg-gray-200 text-gray-600",
};

export default function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [summary, setSummary] = useState({ active: 0, completed: 0, ended: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [search, setSearch] = useState("");

  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/contracts/summary`, { withCredentials: true });
      setSummary(res.data);
    } catch (error) {
      console.error("Error fetching contract summary:", error);
    }
  }, []);

  const fetchContracts = useCallback(async () => {
    try {
      const params = { status: statusFilter, sort: "started_at", order: sortOrder };
      if (search.trim()) params.search = search.trim();
      const res = await axios.get(`${API}/contracts`, { params, withCredentials: true });
      setContracts(res.data);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortOrder, search]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const t = setTimeout(fetchContracts, 250);
    return () => clearTimeout(t);
  }, [fetchContracts]);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const counterparty = (c) =>
    user?.role === "client"
      ? { name: c.freelancer?.user?.name, picture: c.freelancer?.user?.picture, sub: c.freelancer?.title || "Freelancer" }
      : { name: c.client?.name, picture: c.client?.picture, sub: "Client" };

  const StatusBadge = ({ status }) => (
    <Badge className={`${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"} capitalize`}>
      {status}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-gray-50" data-testid="contracts-page">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Contracts</h1>
        <p className="text-gray-600 mb-6">
          {user?.role === "client"
            ? "Engagements you've started with freelancers"
            : "Your active and past engagements with clients"}
        </p>

        {/* Summary strip (no earnings — subscription model) */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.active}</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.completed}</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by contract title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="contracts-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44" data-testid="contracts-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-48" data-testid="contracts-sort">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Start date: Newest</SelectItem>
              <SelectItem value="asc">Start date: Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
        ) : contracts.length > 0 ? (
          <div className="space-y-4" data-testid="contracts-list">
            {contracts.map((c) => {
              const cp = counterparty(c);
              return (
                <Link key={c.id} to={`/dashboard/contracts/${c.id}`} data-testid={`contract-${c.id}`}>
                  <Card className="hover:border-cyan-200 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={cp.picture} />
                          <AvatarFallback className="bg-cyan-600 text-white">
                            {getInitials(cp.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{c.title}</h3>
                              <p className="text-sm text-gray-500">
                                {cp.name} · {cp.sub}
                              </p>
                            </div>
                            <StatusBadge status={c.status} />
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            {c.budget != null && (
                              <span>Budget: ${Number(c.budget).toLocaleString()}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Started {new Date(c.started_at || c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-300 self-center" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card data-testid="no-contracts">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">
                {search || statusFilter !== "all"
                  ? "No contracts match your filters"
                  : "You don't have any contracts yet"}
              </h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                {user?.role === "client"
                  ? "When a freelancer accepts one of your hiring requests, the contract will appear here."
                  : "When you accept a hiring request from a client, the contract will appear here so you can track the work."}
              </p>
              <Link
                to={user?.role === "client" ? "/freelancers" : "/dashboard/requests"}
                className="mt-6 inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium"
              >
                {user?.role === "client" ? "Browse freelancers" : "View hiring requests"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
