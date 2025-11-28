import { Link } from "react-router-dom";
import { Briefcase, Github, Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-8 w-8 text-cyan-400" />
              <span className="text-xl font-bold">FreelanceHub</span>
            </div>
            <p className="text-gray-400 max-w-md">
              Connect with top freelance talent worldwide. Find the perfect professional for your project or showcase your skills to potential clients.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/freelancers" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Browse Freelancers
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Become a Freelancer
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/freelancers?category=Web Development" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Web Development
                </Link>
              </li>
              <li>
                <Link to="/freelancers?category=Design" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Design
                </Link>
              </li>
              <li>
                <Link to="/freelancers?category=Writing" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Writing
                </Link>
              </li>
              <li>
                <Link to="/freelancers?category=Marketing" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Marketing
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} FreelanceHub. All rights reserved.
          </p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
