import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StarRating({ rating, onRate, interactive = false, size = "md" }) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <div className="flex items-center gap-1" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate && onRate(star)}
          className={cn(
            "transition-colors",
            interactive && "cursor-pointer hover:scale-110"
          )}
          data-testid={`star-${star}`}
        >
          <Star
            className={cn(
              sizes[size],
              star <= rating
                ? "text-amber-400 fill-amber-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}
