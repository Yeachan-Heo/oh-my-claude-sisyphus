import { describe, it, expect } from 'vitest';
import { validateUrlForSSRF, validateAnthropicBaseUrl } from '../utils/ssrf-guard.js';

describe('SSRF Guard', () => {
  describe('validateUrlForSSRF', () => {
    describe('blocks private/internal IPs', () => {
      it('blocks localhost', () => {
        expect(validateUrlForSSRF('http://localhost/api')).toEqual({
          allowed: false,
          reason: "Hostname 'localhost' resolves to a blocked internal/private address",
        });
      });

      it('blocks 127.0.0.1', () => {
        expect(validateUrlForSSRF('http://127.0.0.1/api')).toEqual({
          allowed: false,
          reason: "Hostname '127.0.0.1' resolves to a blocked internal/private address",
        });
      });

      it('blocks 10.x.x.x', () => {
        expect(validateUrlForSSRF('http://10.0.0.1/api').allowed).toBe(false);
        expect(validateUrlForSSRF('http://10.255.255.255/api').allowed).toBe(false);
      });

      it('blocks 172.16-31.x.x', () => {
        expect(validateUrlForSSRF('http://172.16.0.1/api').allowed).toBe(false);
        expect(validateUrlForSSRF('http://172.31.255.255/api').allowed).toBe(false);
        expect(validateUrlForSSRF('http://172.15.0.1/api').allowed).toBe(true);
        expect(validateUrlForSSRF('http://172.32.0.1/api').allowed).toBe(true);
      });

      it('blocks 192.168.x.x', () => {
        expect(validateUrlForSSRF('http://192.168.0.1/api').allowed).toBe(false);
        expect(validateUrlForSSRF('http://192.168.255.255/api').allowed).toBe(false);
      });

      it('blocks 169.254.x.x (link-local)', () => {
        expect(validateUrlForSSRF('http://169.254.0.1/api').allowed).toBe(false);
      });

      it('blocks IPv6 loopback', () => {
        expect(validateUrlForSSRF('http://[::1]/api').allowed).toBe(false);
      });

      it('blocks IPv6 link-local', () => {
        expect(validateUrlForSSRF('http://[fe80::1]/api').allowed).toBe(false);
      });
    });

    describe('blocks dangerous protocols', () => {
      it('blocks file://', () => {
        expect(validateUrlForSSRF('file:///etc/passwd').allowed).toBe(false);
      });

      it('blocks ftp://', () => {
        expect(validateUrlForSSRF('ftp://example.com/file').allowed).toBe(false);
      });

      it('blocks gopher://', () => {
        expect(validateUrlForSSRF('gopher://example.com').allowed).toBe(false);
      });
    });

    describe('blocks credentials in URL', () => {
      it('blocks user:pass@host', () => {
        expect(validateUrlForSSRF('https://user:pass@example.com').allowed).toBe(false);
      });
    });

    describe('blocks cloud metadata endpoints', () => {
      it('blocks AWS metadata', () => {
        expect(validateUrlForSSRF('http://169.254.169.254/latest/meta-data/').allowed).toBe(false);
      });
    });

    describe('allows valid URLs', () => {
      it('allows https://api.anthropic.com', () => {
        expect(validateUrlForSSRF('https://api.anthropic.com/v1').allowed).toBe(true);
      });

      it('allows https://custom-proxy.example.com', () => {
        expect(validateUrlForSSRF('https://custom-proxy.example.com/v1').allowed).toBe(true);
      });

      it('allows http:// for non-production (with warning)', () => {
        expect(validateUrlForSSRF('http://example.com').allowed).toBe(true);
      });
    });

    describe('handles invalid inputs', () => {
      it('rejects empty string', () => {
        expect(validateUrlForSSRF('').allowed).toBe(false);
      });

      it('rejects non-string input', () => {
        expect(validateUrlForSSRF(null as any).allowed).toBe(false);
        expect(validateUrlForSSRF(undefined as any).allowed).toBe(false);
      });

      it('rejects malformed URLs', () => {
        expect(validateUrlForSSRF('not-a-url').allowed).toBe(false);
      });
    });
  });

  describe('validateAnthropicBaseUrl', () => {
    it('blocks internal IPs', () => {
      expect(validateAnthropicBaseUrl('http://127.0.0.1:8080').allowed).toBe(false);
    });

    it('allows valid external URLs', () => {
      expect(validateAnthropicBaseUrl('https://api.anthropic.com').allowed).toBe(true);
    });
  });
});
