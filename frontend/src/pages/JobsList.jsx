import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import JobCard from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { API } from "@/App";
import { Search, Filter, Briefcase, ChevronLeft, ChevronRight, Plus, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";

export default function JobsList() {
  const { user } = useAuth();
  const categories = ["All Categories", ...useCategories()];
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const remoteOnly = searchParams.get("remote") === "true";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    fetchJobs();
  }, [search, category, remoteOnly, page, user]);

  const fetchJobs = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category && category !== "All Categories") params.append("category", category);
      if (remoteOnly) params.append("remote", "true");
      params.append("page", page.toString());
      params.append("limit", "12");

      const response = await axios.get(`${API}/jobs?${params.toString()}`, { withCredentials: true });
      setJobs(response.data.jobs);
      setTotalPages(response.data.pages);
      setTotal(response.data.total);
      setRequiresSubscription(response.data.requires_subscription || false);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
        toast.error("Clients cannot browse jobs. Please visit the talent marketplace instead.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("search", value);
    } else {
      newParams.delete("search");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleCategoryChange = (value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "All Categories") {
      newParams.set("category", value);
    } else {
      newParams.delete("category");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleRemoteChange = (checked) => {
    const newParams = new URLSearchParams(searchParams);
    if (checked) {
      newParams.set("remote", "true");
    } else {
      newParams.delete("remote");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  // Redirect clients to freelancers page
  useEffect(() => {
    if (user?.role === "client") {
      navigate("/freelancers");
      toast.info("Clients can browse talent, not jobs. Redirecting...");
    }
  }, [user, navigate]);

  if (accessDenied || user?.role === "client") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">
            Clients cannot browse job listings. You can post jobs and browse talent instead.
          </p>
          <Button className="bg-cyan-600 hover:bg-cyan-700" asChild>
            <Link to="/freelancers">Browse Talent</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="jobs-list-page">
      <Navbar />

      {/* Subscription Banner for non-subscribed freelancers */}
      {requiresSubscription && user?.role === "freelancer" && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6" />
              <div>
                <p className="font-semibold">Unlock Full Job Details</p>
                <p className="text-sm text-indigo-100">Subscribe to view complete job descriptions, budgets, and client information</p>
              </div>
            </div>
            <Button variant="secondary" asChild>
              <Link to="/pricing">View Plans</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Jobs</h1>
              <p className="mt-2 text-gray-600">Discover opportunities that match your skills</p>
            </div>
            {user?.role === "client" && (
              <Button className="bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link to="/jobs/post">
                  <Plus className="h-4 w-4 mr-2" />
                  Post a Job
                </Link>
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search jobs by title, skills..."
                defaultValue={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={category || "All Categories"} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-48" data-testid="category-select">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remote" 
                checked={remoteOnly}
                onCheckedChange={handleRemoteChange}
                data-testid="remote-checkbox"
              />
              <Label htmlFor="remote" className="text-sm text-gray-600 cursor-pointer">
                Remote only
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600" data-testid="results-count">
            {total} job{total !== 1 ? "s" : ""} found
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="jobs-grid">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2" data-testid="pagination">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                    .map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-2">...</span>
                        )}
                        <Button
                          variant={p === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => handlePageChange(p)}
                          className={p === page ? "bg-indigo-600" : ""}
                        >
                          {p}
                        </Button>
                      </span>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl" data-testid="no-results">
            <Briefcase className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900">No jobs found</h3>
            <p className="text-gray-500 mt-2">
              {search || category ? "Try adjusting your filters" : "Check back soon for new opportunities!"}
            </p>
            {user?.role === "client" && (
              <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link to="/jobs/post">Post the First Job</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
