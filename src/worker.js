// BioWatch Google Identity Services authentication (Google-signed JWT verification).
// Set GOOGLE_CLIENT_ID as a Cloudflare Worker variable before enabling sign-in.
const COOKIE = '__Host-biowatch_session';
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';

function json(data, status = 200, cookie = null) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(JSON.stringify(data), { status, headers });
}
function cookieClear() {
  return COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}
function cookieSet(token, maxAge) {
  return COOKIE + '=' + encodeURIComponent(token) +
    '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge;
}
function getCookie(request, name) {
  const all = request.headers.get('Cookie') || '';
  for (const part of all.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
function readBase64Url(input) {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) throw new Error('Invalid JWT segment');
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function readJson(segment) {
  return JSON.parse(new TextDecoder().decode(readBase64Url(segment)));
}
async function verifyGoogleIdToken(jwt, clientId) {
  if (typeof jwt !== 'string' || jwt.length > 8000) throw new Error('Invalid credential');
  const segments = jwt.split('.');
  if (segments.length !== 3) throw new Error('Invalid JWT');
  const header = readJson(segments[0]);
  const claims = readJson(segments[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Invalid signing algorithm');
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') throw new Error('Invalid issuer');
  if (claims.aud !== clientId) throw new Error('Invalid audience');
  if (typeof claims.exp !== 'number' || claims.exp <= now || claims.exp > now + 7200) throw new Error('Expired credential');
  if (typeof claims.iat !== 'number' || claims.iat > now + 90) throw new Error('Invalid issued time');
  if (!claims.sub || claims.email_verified !== true) throw new Error('Unverified account');
  const response = await fetch(GOOGLE_JWKS, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Google public key service is unavailable');
  const { keys } = await response.json();
  const jwk = (keys || []).find(k => k.kid === header.kid && k.kty === 'RSA' && k.use === 'sig');
  if (!jwk) throw new Error('Unknown Google signing key');
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const signedData = new TextEncoder().encode(segments[0] + '.' + segments[1]);
  const signature = readBase64Url(segments[2]);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signedData)) {
    throw new Error('Invalid Google signature');
  }
  return claims;
}
function safeProfile(claims) {
  return {
    id: claims.sub,
    name: typeof claims.name === 'string' ? claims.name.slice(0, 120) : 'Google 使用者',
    email: typeof claims.email === 'string' ? claims.email : '',
    picture: typeof claims.picture === 'string' && claims.picture.startsWith('https://')
      ? claims.picture : ''
  };
}
function checkOrigin(request) {
  const origin = request.headers.get('Origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/auth/')) return env.ASSETS.fetch(request);
    const path = url.pathname;
    const configured = Boolean(env.GOOGLE_CLIENT_ID && /^[\w-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID));
    if (path === '/api/auth/config' && request.method === 'GET') {
      return json({ configured, clientId: configured ? env.GOOGLE_CLIENT_ID : null });
    }
    if (path === '/api/auth/session' && request.method === 'GET') {
      if (!configured) return json({ configured: false, authenticated: false });
      const token = getCookie(request, COOKIE);
      if (!token) return json({ configured: true, authenticated: false });
      try {
        const claims = await verifyGoogleIdToken(token, env.GOOGLE_CLIENT_ID);
        return json({ configured: true, authenticated: true, user: safeProfile(claims) });
      } catch (_) {
        return json({ configured: true, authenticated: false }, 200, cookieClear());
      }
    }
    if (path === '/api/auth/google' && request.method === 'POST') {
      if (!configured) return json({ error: '尚未設定 Google OAuth 用戶端 ID' }, 503);
      if (!checkOrigin(request)) return json({ error: '來源驗證失敗' }, 403);
      if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) {
        return json({ error: 'Content-Type 必須是 application/json' }, 415);
      }
      try {
        const body = await request.json();
        const claims = await verifyGoogleIdToken(body?.credential, env.GOOGLE_CLIENT_ID);
        const maxAge = Math.min(3500, Math.max(0, Math.floor(claims.exp - Date.now() / 1000)));
        if (!maxAge) throw new Error('Token expired');
        return json({ authenticated: true, user: safeProfile(claims) }, 200, cookieSet(body.credential, maxAge));
      } catch (_) {
        return json({ error: 'Google 登入驗證失敗，請重新登入' }, 401);
      }
    }
    if (path === '/api/auth/logout' && request.method === 'POST') {
      if (!checkOrigin(request)) return json({ error: '來源驗證失敗' }, 403);
      return json({ authenticated: false }, 200, cookieClear());
    }
    return json({ error: 'Unknown auth endpoint' }, 404);
  }
};
