import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.IS_STATIC_SITE === "true" ? "export" : undefined
};

export default nextConfig;
