/** Business logic limits — single source of truth shared with API constants */
export const LIMITS = {
  MEETING_ID_DIGITS: 10,
  DISPLAY_NAME_MAX: 60,
  CHAT_MESSAGE_MAX: 2000,
  PERSONAL_LINK_NAME_PATTERN: /^[a-z0-9._-]{3,32}$/,
  MEETING_DURATION_MIN_MINUTES: 5,
  MEETING_DURATION_MAX_MINUTES: 1440,
  PAGE_SIZE_DEFAULT: 25,
  PAGE_SIZE_TABLET: 9,
  PAGE_SIZE_MOBILE: 4,
} as const;
