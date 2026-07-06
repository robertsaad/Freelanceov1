import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import FreelancerCard from "@/components/FreelancerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API } from "@/App";
import { useAuth } from "@/App";
import { Search, Filter, Users, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

export default function FreelancersList() {
  const { user } = useAuth();
  const locked = !user;
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = ["All Categories", ...useCategories()];
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const country = searchParams.get("country") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    fetchFreelancers();
  }, [search, category, country, page]);

  useEffect(() => {
    axios.get(`${API}/freelancers/countries`).then((r) => setCountries(r.data || [])).catch(() => {});
  }, []);

  const fetchFreelancers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category && category !== "All Categories") params.append("category", category);
      if (country && country !== "All Countries") params.append("country", country);
      params.append("page", page.toString());
      params.append("limit", "12");

      const response = await axios.get(`${API}/freelancers?${params.toString()}`, { withCredentials: true });
      setFreelancers(response.data.freelancers);
      setTotalPages(response.data.pages);
      setTotal(response.data.total);
    } catch (error) {
      console.error("Error fetching freelancers:", error);
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

  const handleCountryChange = (value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "All Countries") {
      newParams.set("country", value);
    } else {
      newParams.delete("country");
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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="freelancers-list-page">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Freelancers</h1>
          <p className="mt-2 text-gray-600">Browse our network of talented professionals</p>

          {locked && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3">
              <Lock className="h-4 w-4 text-cyan-600 shrink-0" />
              <p className="text-sm text-cyan-800">
                You're viewing a limited preview. <Link to="/register" className="font-semibold underline">Sign up</Link> to see full profiles, names and contact talent.
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by skills, name, or keyword..."
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
                  <SelectItem key={cat} value={cat} data-testid={`category-option-${cat}`}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={country || "All Countries"} onValueChange={handleCountryChange}>
              <SelectTrigger className="w-full sm:w-48" data-testid="country-select">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="All Countries">All Countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c} value={c} data-testid={`country-option-${c}`}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600" data-testid="results-count">
            {total} freelancer{total !== 1 ? "s" : ""} found
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : freelancers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="freelancers-grid">
              {freelancers.map((freelancer) => (
                <FreelancerCard key={freelancer.id} freelancer={freelancer} locked={locked} />
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
                  data-testid="prev-page-btn"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                    .map((p, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span key={`ellipsis-${p}`} className="px-2">...</span>
                        )}
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="icon"
                          onClick={() => handlePageChange(p)}
                          className={p === page ? "bg-cyan-600" : ""}
                          data-testid={`page-${p}-btn`}
                        >
                          {p}
                        </Button>
                      </>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  data-testid="next-page-btn"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl" data-testid="no-results">
            <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900">No freelancers found</h3>
            <p className="text-gray-500 mt-2">
              {search || category ? "Try adjusting your filters" : "Be the first to join!"}
            </p>
            <Button className="mt-6 bg-cyan-600 hover:bg-cyan-700" asChild>
              <Link to="/register">Become a Freelancer</Link>
            </Button>
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
