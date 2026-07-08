import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FreelancerCard from "@/components/FreelancerCard";
import JobCard from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API, useAuth } from "@/App";
import {
  Search,
  ArrowRight,
  Code,
  Palette,
  PenTool,
  Video,
  TrendingUp,
  Database,
  CheckCircle,
  Users,
  Award,
  Globe,
  Briefcase
} from "lucide-react";

const categories = [
  { name: "Web Development", icon: Code, color: "bg-blue-100 text-blue-600" },
  { name: "Design", icon: Palette, color: "bg-pink-100 text-pink-600" },
  { name: "Writing", icon: PenTool, color: "bg-purple-100 text-purple-600" },
  { name: "Video Editing", icon: Video, color: "bg-red-100 text-red-600" },
  { name: "Marketing", icon: TrendingUp, color: "bg-green-100 text-green-600" },
  { name: "Data Science", icon: Database, color: "bg-indigo-100 text-indigo-600" },
];

const stats = [
  { label: "Freelancers", value: "10K+", icon: Users },
  { label: "Projects Completed", value: "50K+", icon: CheckCircle },
  { label: "Happy Clients", value: "8K+", icon: Award },
  { label: "Countries", value: "120+", icon: Globe },
];

export default function Landing() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredFreelancers, setFeaturedFreelancers] = useState([]);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState("talent"); // talent or jobs

  useEffect(() => {
    fetchFeaturedFreelancers();
    fetchFeaturedJobs();
  }, []);

  const fetchFeaturedFreelancers = async () => {
    try {
      const response = await axios.get(`${API}/freelancers/featured`, { withCredentials: true });
      setFeaturedFreelancers(response.data);
    } catch (error) {
      console.error("Error fetching featured freelancers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedJobs = async () => {
    try {
      const response = await axios.get(`${API}/jobs/featured`, { withCredentials: true });
      setFeaturedJobs(response.data);
    } catch (error) {
      console.error("Error fetching featured jobs:", error);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="landing-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-gradient py-20 lg:py-28" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Find the Perfect
              <span className="text-cyan-600"> Freelancer </span>
              or
              <span className="text-indigo-600"> Job </span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Connect with top professionals or discover exciting opportunities. 
              Your next project or career move starts here.
            </p>

            {/* Search Type Toggle */}
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant={searchType === "talent" ? "default" : "outline"}
                className={searchType === "talent" ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                onClick={() => setSearchType("talent")}
                data-testid="search-talent-tab"
              >
                <Users className="h-4 w-4 mr-2" />
                Find Talent
              </Button>
              <Button
                variant={searchType === "jobs" ? "default" : "outline"}
                className={searchType === "jobs" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                onClick={() => setSearchType("jobs")}
                data-testid="search-jobs-tab"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Find a Job
              </Button>
            </div>

            {/* Search Bar */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={searchType === "talent" ? "Search for skills or services..." : "Search for jobs..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                  data-testid="hero-search-input"
                />
              </div>
              <Button 
                className={`h-12 px-8 ${searchType === "talent" ? "bg-cyan-600 hover:bg-cyan-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
                asChild
                data-testid="hero-search-btn"
              >
                <Link to={searchType === "talent" 
                  ? `/freelancers${searchQuery ? `?search=${searchQuery}` : ''}` 
                  : `/jobs${searchQuery ? `?search=${searchQuery}` : ''}`
                }>
                  {searchType === "talent" ? "Find Talent" : "Find Jobs"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Popular searches */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="text-gray-500 text-sm">Popular:</span>
              {searchType === "talent" 
                ? ["React Developer", "UI Designer", "Content Writer", "Video Editor"].map((term) => (
                    <Link
                      key={term}
                      to={`/freelancers?search=${encodeURIComponent(term)}`}
                      className="text-sm text-cyan-600 hover:text-cyan-700 hover:underline"
                    >
                      {term}
                    </Link>
                  ))
                : ["Web Development", "Mobile App", "Logo Design", "Content Writing"].map((term) => (
                    <Link
                      key={term}
                      to={`/jobs?search=${encodeURIComponent(term)}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {term}
                    </Link>
                  ))
              }
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b" data-testid="stats-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="h-8 w-8 mx-auto text-cyan-600 mb-2" />
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50" data-testid="categories-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Browse by Category</h2>
            <p className="mt-3 text-gray-600">Find the right talent for any project</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/freelancers?category=${encodeURIComponent(category.name)}`}
                className="category-card bg-white rounded-xl p-6 text-center border border-gray-100 hover:border-cyan-200"
                data-testid={`category-${category.name.toLowerCase().replace(/ /g, '-')}`}
              >
                <div className={`w-14 h-14 mx-auto rounded-xl ${category.color} flex items-center justify-center mb-3`}>
                  <category.icon className="h-7 w-7" />
                </div>
                <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Freelancers Section */}
      <section className="py-16 bg-white" data-testid="featured-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Featured Freelancers</h2>
              <p className="mt-2 text-gray-600">Top-rated professionals ready to work</p>
            </div>
            <Button variant="outline" asChild className="hidden sm:flex">
              <Link to="/freelancers">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : featuredFreelancers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredFreelancers.map((freelancer) => (
                <FreelancerCard key={freelancer.id} freelancer={freelancer} locked={!user} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No freelancers yet</h3>
              <p className="text-gray-500 mt-1">Be the first to join our platform!</p>
              <Button className="mt-4 bg-cyan-600 hover:bg-cyan-700" asChild>
                <Link to="/register">Become a Freelancer</Link>
              </Button>
            </div>
          )}

          <div className="text-center mt-8 sm:hidden">
            <Button variant="outline" asChild>
              <Link to="/freelancers">
                View All Freelancers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="py-16 bg-gray-50" data-testid="featured-jobs-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Latest Job Opportunities</h2>
              <p className="mt-2 text-gray-600">Find your next project</p>
            </div>
            <Button variant="outline" asChild className="hidden sm:flex">
              <Link to="/jobs">
                View All Jobs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No jobs posted yet</h3>
              <p className="text-gray-500 mt-1">Be the first to post a job!</p>
              <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link to="/register">Post a Job</Link>
              </Button>
            </div>
          )}

          <div className="text-center mt-8 sm:hidden">
            <Button variant="outline" asChild>
              <Link to="/jobs">
                View All Jobs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cyan-600 to-indigo-600" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Start Your Freelance Journey?
          </h2>
          <p className="text-xl text-cyan-100 mb-8">
            Join thousands of professionals who have grown their careers with Freelanceo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100" asChild>
              <Link to="/register">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10" asChild>
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
