import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the dev server to be accessed from other devices on the local
  // network (e.g. http://192.168.x.x:3000). Without this, Next.js 16 blocks
  // cross-origin _next/* resources, which causes a blank page with no data
  // and no interactivity on non-localhost devices.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.*",
    "192.168.1.*",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ],
};

export default nextConfig;
