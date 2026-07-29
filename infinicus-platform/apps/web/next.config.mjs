/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@infinicus/database', '@infinicus/workflow'],
};

export default nextConfig;
