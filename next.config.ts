import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No other site may frame Lockhouse (its keys live in this site's localStorage). Our own pages may (phone-width checks).
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
};

export default nextConfig;
