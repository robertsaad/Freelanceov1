import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Menu, X, User, LayoutDashboard, MessageSquare, FileText, LogOut, 
  ChevronDown, Briefcase, Search, Users, Code, Palette, PenTool, 
  Video, TrendingUp, Database, Smartphone, Music, Building, ArrowRight 
} from "lucide-react";

const categories = [
  { name: "Web Development", icon: Code, href: "/freelancers?category=Web Development" },
  { name: "Design", icon: Palette, href: "/freelancers?category=Design" },
  { name: "Writing", icon: PenTool, href: "/freelancers?category=Writing" },
  { name: "Video Editing", icon: Video, href: "/freelancers?category=Video Editing" },
  { name: "Marketing", icon: TrendingUp, href: "/freelancers?category=Marketing" },
  { name: "Data Science", icon: Database, href: "/freelancers?category=Data Science" },
  { name: "Mobile Development", icon: Smartphone, href: "/freelancers?category=Mobile Development" },
  { name: "Music & Audio", icon: Music, href: "/freelancers?category=Music & Audio" },
  { name: "Business", icon: Building, href: "/freelancers?category=Business" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [findTalentOpen, setFindTalentOpen] = useState(false);
  const [findWorkOpen, setFindWorkOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              <img src="/logo-icon.png" alt="Freelanceo" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">Freelanceo</span>
            </Link>

            {/* Desktop Navigation with Mega Menus */}
            <div className="hidden lg:flex items-center gap-6">
              {/* Find Talent Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setFindTalentOpen(true)}
                onMouseLeave={() => setFindTalentOpen(false)}
              >
                <button className="flex items-center gap-1 text-gray-700 hover:text-cyan-600 font-medium transition-colors py-2">
                  Find Talent
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {findTalentOpen && (
                  <div className="absolute left-0 top-full pt-2 w-screen max-w-4xl">
                    <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-6">
                      <div className="grid grid-cols-3 gap-6">
                        {/* Main Actions */}
                        <div className="col-span-1 border-r border-gray-100 pr-6">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">
                            Hire Professionals
                          </h3>
                          <Link 
                            to="/freelancers"
                            className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                            onClick={() => setFindTalentOpen(false)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-5 w-5 text-cyan-600" />
                              <span className="font-semibold text-gray-900 group-hover:text-cyan-600">
                                Talent Marketplace
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Browse and hire top-rated freelancers
                            </p>
                          </Link>
                          
                          <Link 
                            to="/pricing"
                            className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group mt-2"
                            onClick={() => setFindTalentOpen(false)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Search className="h-5 w-5 text-cyan-600" />
                              <span className="font-semibold text-gray-900 group-hover:text-cyan-600">
                                Post a Job
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Let freelancers come to you
                            </p>
                          </Link>
                        </div>

                        {/* Categories Grid */}
                        <div className="col-span-2">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">
                            Browse by Category
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {categories.map((category) => (
                              <Link
                                key={category.name}
                                to={category.href}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 hover:text-cyan-600"
                                onClick={() => setFindTalentOpen(false)}
                              >
                                <category.icon className="h-4 w-4" />
                                <span className="text-sm font-medium">{category.name}</span>
                              </Link>
                            ))}
                          </div>
                          
                          <Link
                            to="/freelancers"
                            className="mt-4 flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium text-sm"
                            onClick={() => setFindTalentOpen(false)}
                          >
                            View all freelancers
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Find Work Dropdown - Only for non-clients */}
              {user?.role !== "client" && (
                <div 
                  className="relative"
                  onMouseEnter={() => setFindWorkOpen(true)}
                  onMouseLeave={() => setFindWorkOpen(false)}
                >
                  <button className="flex items-center gap-1 text-gray-700 hover:text-cyan-600 font-medium transition-colors py-2">
                    Find Work
                    <ChevronDown className="h-4 w-4" />
                  </button>
                
                {findWorkOpen && (
                  <div className="absolute left-0 top-full pt-2 w-96">
                    <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">
                        Opportunities
                      </h3>
                      
                      <Link 
                        to="/jobs"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        onClick={() => setFindWorkOpen(false)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="h-5 w-5 text-cyan-600" />
                          <span className="font-semibold text-gray-900 group-hover:text-cyan-600">
                            Job Board
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Find and apply for jobs that match your skills
                        </p>
                      </Link>

                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Browse by Category</h4>
                        <div className="space-y-2">
                          {categories.slice(0, 5).map((category) => (
                            <Link
                              key={category.name}
                              to={`/jobs?category=${category.name}`}
                              className="flex items-center gap-2 text-sm text-gray-600 hover:text-cyan-600 transition-colors"
                              onClick={() => setFindWorkOpen(false)}
                            >
                              <category.icon className="h-4 w-4" />
                              {category.name}
                            </Link>
                          ))}
                        </div>
                        
                        <Link
                          to="/jobs"
                          className="mt-4 flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium text-sm"
                          onClick={() => setFindWorkOpen(false)}
                        >
                          View all jobs
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link 
                to="/pricing" 
                className="text-gray-700 hover:text-cyan-600 font-medium transition-colors"
                data-testid="pricing-link"
              >
                Pricing
              </Link>
            </div>
          </div>

          {/* Right Side - User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-trigger">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.picture} />
                      <AvatarFallback className="bg-cyan-600 text-white text-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2" data-testid="dashboard-link">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "freelancer" && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/profile" className="flex items-center gap-2" data-testid="edit-profile-link">
                        <User className="h-4 w-4" />
                        Edit Profile
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/messages" className="flex items-center gap-2" data-testid="messages-link">
                      <MessageSquare className="h-4 w-4" />
                      Messages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/requests" className="flex items-center gap-2" data-testid="requests-link">
                      <FileText className="h-4 w-4" />
                      Hiring Requests
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="logout-btn">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" asChild data-testid="login-btn">
                  <Link to="/login">Log In</Link>
                </Button>
                <Button className="bg-cyan-600 hover:bg-cyan-700" asChild data-testid="signup-btn">
                  <Link to="/register">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white" data-testid="mobile-menu">
          <div className="px-4 py-4 space-y-3">
            <Link
              to="/freelancers"
              className="block py-2 text-gray-600 hover:text-cyan-600 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Freelancers
            </Link>
            <Link
              to="/jobs"
              className="block py-2 text-gray-600 hover:text-cyan-600 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Find Jobs
            </Link>
            <Link
              to="/pricing"
              className="block py-2 text-gray-600 hover:text-cyan-600 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-gray-600 hover:text-cyan-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="block py-2 text-red-600 font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 text-gray-600 hover:text-cyan-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="block py-2 text-cyan-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
