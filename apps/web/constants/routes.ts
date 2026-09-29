/** Application route constants — single source of truth for navigation */
export const ROUTES = {
  HOME: '/home',
  WELCOME: '/welcome',
  SIGN_IN: '/signin',
  SIGN_UP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  JOIN: '/join',
  MEETINGS: '/meetings',
  SCHEDULE: '/meetings/schedule',
  meeting: (code: string) => `/meeting/${code}`,
  lobby: (code: string) => `/meeting/${code}/lobby`,
  inviteLink: (code: string) => `/j/${code}`,
  meetingDetail: (code: string) => `/meetings/${code}`,
} as const;
