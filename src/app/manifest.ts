import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iluvkt · guitar practice",
    short_name: "iluvkt",
    description: "Learning guitar, 30 minutes a day.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#b5651d",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
