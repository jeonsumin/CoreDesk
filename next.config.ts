import type { NextConfig } from "next";

const CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
]

const nextConfig: NextConfig = {
//  output: 'standalone',
  // 개발 모드 표시가 사이드바 하단 사용자 메뉴를 가리지 않게 한다
  devIndicators: { position: 'bottom-right' },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async headers() {
    return [
      {
        source: '/api/portfolio/:path*',
        headers: CORS_HEADERS,
      },
    ]
  },
};

export default nextConfig;
