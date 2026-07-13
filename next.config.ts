import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },

  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: "",
  },
  skipProxyUrlNormalize: true,
};

export default withNextIntl(nextConfig);
