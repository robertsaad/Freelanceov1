import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, BACKEND_URL } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Play, Music, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

const mediaUrl = (url) => (!url ? null : url.startsWith("http") ? url : `${BACKEND_URL}${url}`);

export default function PortfolioGallery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [freelancer, setFreelancer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/freelancers/${id}`);
        setFreelancer(res.data);
      } catch (err) {
        console.error("Error fetching freelancer:", err);
        toast.error("Freelancer not found");
        navigate("/freelancers");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const items = freelancer?.portfolio_items || [];
  const active = activeIndex !== null ? items[activeIndex] : null;

  const showPrev = () => setActiveIndex((i) => (i > 0 ? i - 1 : items.length - 1));
  const showNext = () => setActiveIndex((i) => (i < items.length - 1 ? i + 1 : 0));

  const thumbFor = (item) => {
    if (item.media_type === "image" && item.media_url) return mediaUrl(item.media_url);
    if (item.image_url) return item.image_url;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-500">Loading portfolio…</div>
      </div>
    );
  }

  const name = freelancer?.user?.name || freelancer?.name || "Freelancer";
  const avatar = freelancer?.user?.picture || freelancer?.profile_picture;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/freelancers/${id}`)} data-testid="back-to-profile">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to profile
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-14 w-14">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            <p className="text-gray-500 text-sm">
              {items.length} {items.length === 1 ? "project" : "projects"}
            </p>
          </div>
        </div>

        {/* Instagram-style grid */}
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-20">No portfolio items yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
            {items.map((item, idx) => {
              const thumb = thumbFor(item);
              return (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className="group relative aspect-square overflow-hidden bg-gray-100 focus:outline-none"
                  data-testid={`gallery-tile-${idx}`}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {item.media_type === "video" ? (
                        <Play className="h-8 w-8" />
                      ) : item.media_type === "audio" ? (
                        <Music className="h-8 w-8" />
                      ) : (
                        <ImageIcon className="h-8 w-8" />
                      )}
                    </div>
                  )}
                  {/* media-type badge */}
                  {item.media_type === "video" && (
                    <span className="absolute top-2 right-2 text-white drop-shadow">
                      <Play className="h-4 w-4" />
                    </span>
                  )}
                  {item.media_type === "audio" && (
                    <span className="absolute top-2 right-2 text-white drop-shadow">
                      <Music className="h-4 w-4" />
                    </span>
                  )}
                  {/* hover overlay with title */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium p-3 line-clamp-2">
                      {item.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={active !== null} onOpenChange={(o) => !o && setActiveIndex(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {active && (
            <div className="flex flex-col">
              <div className="relative bg-black flex items-center justify-center min-h-[300px] max-h-[70vh]">
                {active.media_type === "video" && active.media_url ? (
                  <video src={mediaUrl(active.media_url)} controls className="max-h-[70vh] w-full bg-black" />
                ) : active.media_type === "audio" && active.media_url ? (
                  <div className="w-full p-8">
                    <audio src={mediaUrl(active.media_url)} controls className="w-full" />
                  </div>
                ) : thumbFor(active) ? (
                  <img src={thumbFor(active)} alt={active.title} className="max-h-[70vh] w-full object-contain" />
                ) : (
                  <div className="text-gray-400 py-20">No preview</div>
                )}

                {items.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={showPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={showNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2"
                      aria-label="Next"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              <div className="p-6">
                <DialogTitle className="text-lg font-semibold text-gray-900">{active.title}</DialogTitle>
                {active.description && <p className="text-gray-600 mt-2 whitespace-pre-line">{active.description}</p>}
                {active.link && (
                  <a
                    href={active.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-600 text-sm mt-3 hover:underline"
                  >
                    View project <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
      <MobileNav />
    </div>
  );
}
