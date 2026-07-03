import { useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DEFAULT_CATEGORIES = [
  "Web Development",
  "Design",
  "Writing",
  "Video Editing",
  "Marketing",
  "Data Science",
  "Mobile Development",
  "Music & Audio",
  "Business",
];

// Returns an array of category name strings.
// Uses admin-managed categories from the API, falling back to defaults.
export function useCategories() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    let active = true;
    axios
      .get(`${API}/categories`)
      .then((res) => {
        if (active && Array.isArray(res.data) && res.data.length > 0) {
          const names = res.data.map((c) => c.name).filter(Boolean);
          if (names.length > 0) setCategories(names);
        }
      })
      .catch(() => {
        /* keep defaults on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  return categories;
}
