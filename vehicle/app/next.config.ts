import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:3002/:path*' },
      { source: '/voice-agent/:path*', destination: 'http://localhost:3010/api/voice-agent/:path*' },
    ];
  },
};

export default nextConfig;
