import { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || "";
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";

const upstashLimiter =
  upstashUrl && upstashToken
    ? new Ratelimit({
        redis: new Redis({
          url: upstashUrl,
          token: upstashToken,
        }),
        limiter: Ratelimit.slidingWindow(10, "60 s"),
        analytics: true,
        prefix: "fineprint:ratelimit",
      })
    : null;

interface WindowEntry {
  timestamps: number[];
}

const memoryBuckets = new Map<string, WindowEntry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

export async function checkRateLimit(req: NextRequest): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}> {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

  if (upstashLimiter) {
    try {
      const result = await upstashLimiter.limit(ip);
      return {
        allowed: result.success,
        limit: result.limit,
        remaining: result.remaining,
        resetMs: Math.max(0, result.reset - Date.now()),
      };
    } catch {}
  }

  const now = Date.now();
  const entry = memoryBuckets.get(ip) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = entry.timestamps[0] || now;
    return {
      allowed: false,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: 0,
      resetMs: Math.max(1000, WINDOW_MS - (now - oldest)),
    };
  }

  entry.timestamps.push(now);
  memoryBuckets.set(ip, entry);

  return {
    allowed: true,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.timestamps.length),
    resetMs: WINDOW_MS,
  };
}
