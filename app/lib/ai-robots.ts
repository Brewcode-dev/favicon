/**
 * Tokeny robots.txt robotów AI: trening modeli, wyszukiwarki AI i agenci.
 *
 * To lekka warstwa ochrony — prośba, której słuchają uczciwe roboty. Obok niej
 * stoi zastrzeżenie TDM (art. 4 dyrektywy 2019/790): nagłówek
 * `tdm-reservation` w next.config.ts, public/.well-known/tdmrep.json
 * i public/ai.txt. Ta sama lista co w Hopedii i Rachubie.
 *
 * `Google-Extended` i `Applebot-Extended` to zgoda na trening AI, nie roboty
 * wyszukiwarek — Google i Apple dalej indeksują stronę.
 */
export const AI_ROBOTS_TOKENS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "PerplexityBot",
  "Perplexity-User",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "Diffbot",
  "omgili",
  "omgilibot",
  "ImagesiftBot",
  "YouBot",
  "AI2Bot",
  "Ai2Bot-Dolma",
  "Timpibot",
  "PanguBot",
  "Kangaroo Bot",
  "Webzio-Extended",
  "DuckAssistBot",
  "MistralAI-User",
  "img2dataset",
];
