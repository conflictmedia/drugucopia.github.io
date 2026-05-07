import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';


const basePath = ""

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  trailingSlash: true,
  basePath,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
