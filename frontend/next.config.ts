import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The staff tool was one page at /admin/stories before it split into
      // members and group photos. 307, not 308: a permanent redirect is cached
      // by the browser indefinitely and is very hard to take back.
      { source: "/admin/stories", destination: "/admin/members", permanent: false },
    ];
  },
};

export default nextConfig;
