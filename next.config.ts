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
  // ssh2는 선택적 네이티브 모듈(cpu-features)을 require 하므로 번들하지 않는다
  serverExternalPackages: ['ssh2'],
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
