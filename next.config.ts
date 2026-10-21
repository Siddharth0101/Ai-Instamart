import type { NextConfig } from "next";
import { localPageRedirects } from "./src/server/origin";
const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  // Config redirects preserve the absolute loopback destination. Proxy redirects
  // normalize both hosts to localhost and can become a relative redirect loop.
  async redirects() { return localPageRedirects(); },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "microphone=(self), camera=()" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://media-assets.swiggy.com https://res.cloudinary.com; media-src 'self' blob:; connect-src 'self' wss://api.elevenlabs.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://mcp.swiggy.com" }
    ] }];
  }
};
export default config;
