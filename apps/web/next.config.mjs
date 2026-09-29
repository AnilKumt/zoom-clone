/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy all /api/* requests to the FastAPI backend
  // This makes cookies first-party (SameSite=Lax works)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_ORIGIN || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
