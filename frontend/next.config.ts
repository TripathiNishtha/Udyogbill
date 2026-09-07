import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.29.127", "192.168.29.127:3000", "localhost", "127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://localhost:5050/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
