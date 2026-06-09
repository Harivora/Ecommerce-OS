/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't fail the production build on cosmetic ESLint rules (e.g. unescaped
  // apostrophes in text). TypeScript type-checking still runs and must pass.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
