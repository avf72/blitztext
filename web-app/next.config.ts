import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  // Eindeutige Workspace-Wurzel (es liegt ein weiteres Lockfile in C:\Users\avf).
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  // Service Worker und Manifest werden statisch aus /public ausgeliefert.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
