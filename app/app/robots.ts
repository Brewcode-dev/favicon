import type { MetadataRoute } from "next";

import { AI_ROBOTS_TOKENS } from "@/lib/ai-robots";

// Generator jest jedna strona do indeksowania; /api to tylko healthcheck dla Dockera.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Roboty AI (trening, wyszukiwarki AI, agenci): caly serwis zamkniety.
      { userAgent: AI_ROBOTS_TOKENS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
  };
}
