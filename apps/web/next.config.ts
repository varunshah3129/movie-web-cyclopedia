import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@movie/core"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;
