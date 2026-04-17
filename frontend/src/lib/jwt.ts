type JwtPayload = Record<string, unknown> & {
  sub?: string;
  userId?: string;
  id?: string;
  uid?: string;
  email?: string;
  name?: string;
};

function base64UrlToBase64(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return padded + '='.repeat(padLength);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(atob(base64UrlToBase64(parts[1])));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenSubject(token: string): string | null {
  const payload = decodeJwtPayload(token);
  const subject = payload?.sub ?? payload?.userId ?? payload?.id ?? payload?.uid;
  return typeof subject === 'string' && subject.trim() ? subject : null;
}
