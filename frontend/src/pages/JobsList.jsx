import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
import { Search, Filter, Briefcase, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/App";

const categories = [
  "All Categories",
  "Web Development",
  "Design",
  "Writing",
  "Video Editing",
  "Marketing",
  "Data Science",
  "Mobile Development",
  "Music & Audio",
  "Business"
];

export default function JobsList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const remoteOnly = searchParams.get("remote") === "true";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    fetchJobs();
  }, [search, category, remoteOnly, page]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category && category !== "All Categories") params.append("category", category);
      if (remoteOnly) params.append("remote", "true");
      params.append("page", page.toString());
      params.append("limit", "12");

      const response = await axios.get(`${API}/jobs?${params.toString()}`);
      setJobs(response.data.jobs);
      setTotalPages(response.data.pages);
      setTotal(response.data.total);
    } catch (error) {
      console.error("Error fetching jobs:", error);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="jobs-list-page">
      <Navbar />

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
