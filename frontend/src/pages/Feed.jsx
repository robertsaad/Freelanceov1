import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Send,
  MoreHorizontal,
  Trash2,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [posting, setPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      // Try personalized feed first, fall back to all posts
      let response;
      try {
        response = await axios.get(`${API}/feed`, { withCredentials: true });
      } catch {
        response = await axios.get(`${API}/posts`);
      }
      setPosts(response.data.posts || []);
      
      // Check which posts are liked
      const likeStatus = {};
      for (const post of response.data.posts || []) {
        try {
          const likeRes = await axios.get(`${API}/posts/${post.id}/is-liked`, { withCredentials: true });
          likeStatus[post.id] = likeRes.data.liked;
        } catch {
          likeStatus[post.id] = false;
        }
      }
      setLikedPosts(likeStatus);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setPosting(true);
    try {
      const response = await axios.post(
        `${API}/posts`,
        { content: newPost, image_url: imageUrl || null },
        { withCredentials: true }
      );
      setPosts([response.data, ...posts]);
      setNewPost("");
      setImageUrl("");
      setShowImageInput(false);
      toast.success("Post created!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await axios.post(`${API}/posts/${postId}/like`, {}, { withCredentials: true });
      setLikedPosts({ ...likedPosts, [postId]: response.data.liked });
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, likes_count: p.likes_count + (response.data.liked ? 1 : -1) }
          : p
      ));
    } catch (error) {
      toast.error("Please login to like posts");
    }
  };

  const handleDelete = async (postId) => {
    try {
      await axios.delete(`${API}/posts/${postId}`, { withCredentials: true });
      setPosts(posts.filter(p => p.id !== postId));
      toast.success("Post deleted");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="feed-page">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Feed</h1>

        {/* Create Post Card (Freelancers only) */}
        {user?.role === "freelancer" && (
          <Card className="mb-6" data-testid="create-post-card">
            <CardContent className="p-4">
              <form onSubmit={handleCreatePost}>
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.picture} />
                    <AvatarFallback className="bg-cyan-600 text-white">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Share an update with your followers..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="min-h-[80px] resize-none border-0 focus:ring-0 p-0 text-base"
                      data-testid="post-content-input"
                    />
                    {showImageInput && (
                      <input
                        type="url"
                        placeholder="Image URL (optional)"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full mt-2 px-3 py-2 border rounded-lg text-sm"
                        data-testid="post-image-input"
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowImageInput(!showImageInput)}
                    className="text-gray-500"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Image
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-700"
                    disabled={posting || !newPost.trim()}
                    data-testid="submit-post-btn"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {posting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4" data-testid="posts-list">
            {posts.map((post) => (
              <Card key={post.id} data-testid={`post-${post.id}`}>
                <CardContent className="p-4">
                  {/* Post Header */}
                  <div className="flex items-start justify-between">
                    <Link to={`/freelancers/${post.freelancer_id}`} className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.user?.picture} />
                        <AvatarFallback className="bg-cyan-600 text-white">
                          {getInitials(post.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900 hover:text-cyan-600">
                          {post.user?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {post.profile?.title} · {formatTime(post.created_at)}
                        </p>
                      </div>
                    </Link>
                    {user?.id === post.user_id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDelete(post.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Post Content */}
                  <p className="mt-3 text-gray-800 whitespace-pre-wrap">{post.content}</p>

                  {/* Post Image */}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="mt-3 rounded-lg w-full max-h-96 object-cover"
                    />
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 mt-4 pt-3 border-t">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 transition-colors ${
                        likedPosts[post.id] ? "text-red-500" : "text-gray-500 hover:text-red-500"
                      }`}
                      data-testid={`like-btn-${post.id}`}
                    >
                      <Heart className={`h-5 w-5 ${likedPosts[post.id] ? "fill-current" : ""}`} />
                      <span className="text-sm font-medium">{post.likes_count || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-500 hover:text-cyan-600">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">{post.comments_count || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-500 hover:text-cyan-600">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card data-testid="empty-feed">
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Your feed is empty</h3>
              <p className="text-gray-500 mt-2">
                Follow some freelancers to see their posts here
              </p>
              <Button className="mt-6 bg-cyan-600 hover:bg-cyan-700" asChild>
                <Link to="/freelancers">Browse Freelancers</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNav />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
