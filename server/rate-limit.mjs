import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

// Each increment and expiry is atomic, including when several functions run at once.
export const counterScript = `
local retry = 0
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('PEXPIRE', key, ARGV[i * 2]) end
  if count > tonumber(ARGV[i * 2 - 1]) then
    retry = math.max(retry, redis.call('PTTL', key))
  end
end
return retry
`;

export function validateRateLimitConfig(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url || token) {
    let endpoint;
    try {
      endpoint = new URL(url);
    } catch {
      /* Report a configuration error without its value. */
    }
    if (
      !endpoint ||
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      !token
    )
      throw new Error('Rate limit store configuration is invalid');
    return endpoint;
  }
  if (env.VERCEL || env.NODE_ENV === 'production')
    throw new Error('A shared rate limit store must be configured before deployment');
  return null;
}

export function createRateLimiter({
  env = process.env,
  fetchImpl = fetch,
  now = () => Date.now(),
} = {}) {
  const counters = new Map();
  return async (req, sessionId) => {
    const address = env.VERCEL ? req.headers['x-forwarded-for'] : req.socket?.remoteAddress;
    if (typeof address !== 'string' || !isIP(address))
      throw new Error('Trusted client address is unavailable');
    const ip = isIP(address) === 6 ? new URL(`http://[${address}]/`).hostname : address;
    const key = (kind, value) =>
      `ctf:limit:${kind}:` +
      createHmac('sha256', env.CTF_SESSION_SECRET).update(value).digest('hex');
    const buckets = sessionId
      ? [
          [key('answers', ip), 120, 60000],
          [key('cooldown', sessionId), 1, 750],
        ]
      : [[key('requests', ip), 600, 60000]];
    const endpoint = validateRateLimitConfig(env);
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (endpoint) {
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([
            'EVAL',
            counterScript,
            buckets.length,
            ...buckets.map(([name]) => name),
            ...buckets.flatMap(([, limit, window]) => [limit, window]),
          ]),
          signal: AbortSignal.timeout(3000),
          redirect: 'error',
        });
        const data = await response.json();
        if (!response.ok || data.error || !Number.isInteger(data.result) || data.result < 0)
          throw new Error('Invalid counter response');
        return data.result;
      } catch {
        // Do not expose credentials, request identifiers or upstream errors in logs.
        throw new Error('Rate limit store is unavailable');
      }
    }
    // The development server has one process. Production must use the shared store above.
    const time = now();
    for (const [name, value] of counters) if (value.expires <= time) counters.delete(name);
    if (counters.size + buckets.length > 10000)
      throw new Error('Local rate limit capacity exceeded');
    let retry = 0;
    for (const [name, limit, window] of buckets) {
      const counter = counters.get(name) || { count: 0, expires: time + window };
      counter.count++;
      counters.set(name, counter);
      if (counter.count > limit) retry = Math.max(retry, counter.expires - time);
    }
    return retry;
  };
}

export const rateLimit = createRateLimiter();
