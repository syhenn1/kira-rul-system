import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../"),
  },
  allowedDevOrigins: ["payroll-worldwide-separated-rehab.trycloudflare.com"],
};

export default nextConfig;
