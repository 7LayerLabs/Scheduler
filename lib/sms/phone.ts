export function normalizePhoneNumberToE164(input: string, defaultCountry: 'US' | 'CA' = 'US'): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  // Accept already formatted E.164 numbers.
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    // E.164 max is 15 digits, and real numbers are typically at least 8 digits.
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  // Strip everything except digits.
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // North America default: 10-digit local numbers.
  if ((defaultCountry === 'US' || defaultCountry === 'CA') && digits.length === 10) {
    return `+1${digits}`;
  }

  // Handle 11-digit numbers starting with country code 1.
  if ((defaultCountry === 'US' || defaultCountry === 'CA') && digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return null;
}

export function maskE164(phoneE164: string): string {
  const raw = (phoneE164 || '').trim();
  if (!raw.startsWith('+')) return raw;
  const digits = raw.slice(1).replace(/\D/g, '');
  if (digits.length <= 4) return raw;
  const last4 = digits.slice(-4);
  return `+${digits.slice(0, Math.max(0, digits.length - 4)).replace(/\d/g, '*')}${last4}`;
}


