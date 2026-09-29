/**
 * Meeting code parser: accepts all formats Zoom supports.
 * Unit-tested in tests/lib/meeting-code.test.ts
 */

import { LIMITS } from '@/constants/limits';

export type ParsedCode =
  | { type: 'numeric'; code: string }
  | { type: 'personal_link'; name: string };

/**
 * Parse a user-entered value into a normalized meeting code or personal link name.
 * Returns null if the input is not recognizable.
 *
 * Accepts:
 *  - "833 834 7512" (spaced)
 *  - "833-834-7512" (dashed)
 *  - "8338347512" (raw digits)
 *  - "https://host/j/8338347512?pwd=..."
 *  - "abc-def" (personal link name)
 */
export function parseMeetingCode(input: string): ParsedCode | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Full invite URL — extract code from /j/<code> path segment
  const urlMatch = trimmed.match(/\/j\/([a-z0-9._-]{3,})/i);
  if (urlMatch) {
    const extracted = urlMatch[1].replace(/\D/g, '');
    if (extracted.length === LIMITS.MEETING_ID_DIGITS) {
      return { type: 'numeric', code: extracted };
    }
    return { type: 'personal_link', name: urlMatch[1].toLowerCase() };
  }

  // Pure digits with optional spaces or dashes (10 digits)
  const digitsOnly = trimmed.replace(/[\s-]/g, '');
  if (/^\d+$/.test(digitsOnly)) {
    if (digitsOnly.length === LIMITS.MEETING_ID_DIGITS) {
      return { type: 'numeric', code: digitsOnly };
    }
    return null;
  }

  // Personal link name (must not be purely numeric)
  if (LIMITS.PERSONAL_LINK_NAME_PATTERN.test(trimmed.toLowerCase())) {
    return { type: 'personal_link', name: trimmed.toLowerCase() };
  }

  return null;
}

export function isValidMeetingInput(input: string): boolean {
  return parseMeetingCode(input) !== null;
}
