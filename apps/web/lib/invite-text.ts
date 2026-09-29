import { formatMeetingId } from './utils';
import type { Meeting } from '@/types/api';

/** Generate the Zoom-style plain-text meeting invitation */
export function buildInviteText(meeting: Meeting, hostName: string): string {
  const lines: string[] = [
    `${hostName} is inviting you to a scheduled zoom meeting.`,
    '',
    `Topic: ${meeting.title}`,
    '',
    'Join zoom Meeting',
    meeting.invite_url,
    '',
    `Meeting ID: ${formatMeetingId(meeting.meeting_code)}`,
  ];

  if (meeting.passcode) {
    lines.push(`Passcode: ${meeting.passcode}`);
  }

  return lines.join('\n');
}
