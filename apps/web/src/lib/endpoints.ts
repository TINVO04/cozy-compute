interface BrowserLocation {
  origin: string;
  hostname: string;
  protocol: string;
}

/** Relative endpoints let HTTP matchmaking and WebSocket traffic share the game domain. */
export function resolveEndpoint(
  configured: string | undefined,
  location: BrowserLocation | undefined,
  kind: 'api' | 'realtime',
): string {
  const fallback = kind === 'api' ? 'http://localhost:8787' : 'ws://localhost:2567';
  if (configured?.startsWith('/')) {
    if (!location || !['http:', 'https:'].includes(location.protocol))
      throw new Error('Relative game endpoints require an HTTP(S) origin.');
    const url = new URL(configured, location.origin);
    if (url.origin !== location.origin) throw new Error('Relative endpoints must use the game origin.');
    if (kind === 'realtime') url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.href.replace(/\/$/, '');
  }
  const url = new URL(configured || fallback);
  const allowed = kind === 'api' ? ['http:', 'https:'] : ['ws:', 'wss:'];
  if (!allowed.includes(url.protocol)) throw new Error('Invalid game endpoint protocol.');
  // Keep LAN development working when another device opens the Vite server.
  if (
    location &&
    location.hostname !== 'localhost' &&
    ['http:', 'https:'].includes(location.protocol) &&
    ['localhost', '127.0.0.1'].includes(url.hostname)
  ) {
    url.hostname = location.hostname;
    url.protocol = kind === 'api' ? location.protocol : location.protocol === 'https:' ? 'wss:' : 'ws:';
  }
  return url.href.replace(/\/$/, '');
}
