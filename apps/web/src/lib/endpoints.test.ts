import { describe, expect, it } from 'vitest';
import { resolveEndpoint } from './endpoints';

describe('game endpoints behind a same-origin tunnel', () => {
  const location = { origin: 'https://play.devtizo.vip', hostname: 'play.devtizo.vip', protocol: 'https:' };
  it('routes API, HTTP matchmaking and WebSockets through HTTPS on the public domain', () => {
    expect(resolveEndpoint('/api', location, 'api')).toBe('https://play.devtizo.vip/api');
    expect(resolveEndpoint('/realtime/', location, 'realtime')).toBe('wss://play.devtizo.vip/realtime');
  });
  it('retains LAN ports and explicit remote endpoints', () => {
    const lan = { origin: 'http://192.168.1.12:5173', hostname: '192.168.1.12', protocol: 'http:' };
    expect(resolveEndpoint(undefined, lan, 'api')).toBe('http://192.168.1.12:8787');
    expect(resolveEndpoint(undefined, lan, 'realtime')).toBe('ws://192.168.1.12:2567');
    expect(resolveEndpoint('wss://realtime.example.com/game', location, 'realtime')).toBe(
      'wss://realtime.example.com/game',
    );
    expect(resolveEndpoint(undefined, undefined, 'api')).toBe('http://localhost:8787');
  });
  it('rejects endpoints that escape the origin or use the wrong protocol', () => {
    expect(() => resolveEndpoint('//other.example/api', location, 'api')).toThrow();
    expect(() => resolveEndpoint('https://game.example', location, 'realtime')).toThrow();
    expect(() => resolveEndpoint('/api', undefined, 'api')).toThrow();
  });
});
