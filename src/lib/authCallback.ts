import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';

type AuthCredentials =
  | { kind: 'code'; code: string }
  | { kind: 'otp'; tokenHash: string; type: string }
  | { kind: 'session'; accessToken: string; refreshToken: string };

function cleanRawUrl(raw: string): string {
  return raw
    .trim()
    .replace(/^[\s<([{'"]+|[\s>)\]}"']+$/g, '')
    .replace(/\s+/g, '');
}

function parseAuthUrl(raw: string): URL {
  const trimmed = cleanRawUrl(raw);
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return new URL(trimmed);
  }
  if (trimmed.startsWith('?') || trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return new URL(trimmed, window.location.origin);
  }
  return new URL(`/?${trimmed.replace(/^[?#]/, '')}`, window.location.origin);
}

function readParams(params: URLSearchParams): AuthCredentials | null {
  const code = params.get('code');
  if (code) return { kind: 'code', code };

  const tokenHash = params.get('token_hash') ?? params.get('token');
  const type = params.get('type');
  if (tokenHash && type) {
    return { kind: 'otp', tokenHash: decodeURIComponent(tokenHash), type };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    return {
      kind: 'session',
      accessToken: decodeURIComponent(accessToken),
      refreshToken: decodeURIComponent(refreshToken),
    };
  }

  return null;
}

function extractCredentials(rawUrl: string): AuthCredentials | null {
  const raw = cleanRawUrl(rawUrl);

  try {
    const url = parseAuthUrl(raw);
    const fromQuery = readParams(url.searchParams);
    if (fromQuery) return fromQuery;

    if (url.hash) {
      const fromHash = readParams(new URLSearchParams(url.hash.replace(/^#/, '')));
      if (fromHash) return fromHash;
    }
  } catch {
    // Fall through to regex parsing for partial / messy pastes.
  }

  const tokenMatch = raw.match(/[?&#](?:token_hash|token)=([^&#\s]+)/i);
  const typeMatch = raw.match(/[?&#]type=([^&#\s]+)/i);
  if (tokenMatch && typeMatch) {
    return {
      kind: 'otp',
      tokenHash: decodeURIComponent(tokenMatch[1]),
      type: decodeURIComponent(typeMatch[1]),
    };
  }

  const codeMatch = raw.match(/[?&#]code=([^&#\s]+)/);
  if (codeMatch) {
    return { kind: 'code', code: decodeURIComponent(codeMatch[1]) };
  }

  const accessMatch = raw.match(/access_token=([^&#\s]+)/);
  const refreshMatch = raw.match(/refresh_token=([^&#\s]+)/);
  if (accessMatch && refreshMatch) {
    return {
      kind: 'session',
      accessToken: decodeURIComponent(accessMatch[1]),
      refreshToken: decodeURIComponent(refreshMatch[1]),
    };
  }

  return null;
}

function otpTypesToTry(type: string): EmailOtpType[] {
  if (type === 'magiclink') return ['magiclink', 'email'];
  if (type === 'email') return ['email', 'magiclink'];
  return [type as EmailOtpType];
}

async function verifyOtpToken(client: SupabaseClient, tokenHash: string, type: string) {
  const types = otpTypesToTry(type);
  let lastError: Error | null = null;

  for (const otpType of types) {
    const { data, error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (!error) return { data, error: null };
    lastError = error;
  }

  return {
    data: { session: null, user: null },
    error: lastError ?? new Error('Magic link verification failed.'),
  };
}

/** Complete sign-in from a magic link URL (full URL, query string, or hash fragment). */
export async function completeAuthFromUrl(client: SupabaseClient, rawUrl: string) {
  const credentials = extractCredentials(rawUrl);

  if (!credentials) {
    return {
      data: { session: null, user: null },
      error: new Error(
        'Could not find sign-in credentials in that link. Copy the entire URL from your email, including the supabase.co part.',
      ),
    };
  }

  if (credentials.kind === 'code') {
    return client.auth.exchangeCodeForSession(credentials.code);
  }

  if (credentials.kind === 'session') {
    return client.auth.setSession({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });
  }

  return verifyOtpToken(client, credentials.tokenHash, credentials.type);
}

/** Handle auth params in the current page URL on load. */
export async function completeAuthFromCurrentUrl(client: SupabaseClient) {
  const { search, hash } = window.location;
  if (!search && !hash) return { error: null };

  const result = await completeAuthFromUrl(client, `${window.location.origin}${search}${hash}`);
  if (!result.error) {
    window.history.replaceState({}, '', window.location.pathname);
  }
  return result;
}
