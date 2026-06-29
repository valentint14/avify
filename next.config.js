/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't serve a stale client-side cached payload when navigating to a
  // dynamic route — always use the fresh server render (e.g. live stock on
  // the Stoc Materiale page after an order is completed elsewhere).
  experimental: {
    staleTimes: { dynamic: 0 },
  },
}

module.exports = nextConfig
