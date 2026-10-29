import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Obraz produkcyjny startuje z `.next/standalone` — patrz Dockerfile.
  output: "standalone",
  // Wskaznik dev zaslanial przycisk pobierania w rogu sidebara.
  devIndicators: false,
  // „X-Powered-By: Next.js” tylko podpowiada, jakich narzedzi uzyc do scrapingu.
  poweredByHeader: false,
  // Zastrzezenie eksploracji tekstow i danych (TDMRep, art. 4 dyrektywy 2019/790) na kazdej
  // odpowiedzi, takze statyce. Ta sama deklaracja w public/.well-known/tdmrep.json i public/ai.txt,
  // roboty AI odprawia app/robots.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "tdm-reservation", value: "1" },
          { key: "X-Robots-Tag", value: "noai, noimageai" },
        ],
      },
    ];
  },
};

export default nextConfig;
