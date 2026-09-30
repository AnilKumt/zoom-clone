/** Mirror of FastAPI response schemas — keep in sync with packages/contracts */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  personal_meeting_id: string;
  personal_link_name: string | null;
  timezone: string;
  plan: string;
  is_demo: boolean;
}

export type MeetingKind = 'instant' | 'scheduled' | 'personal';
export type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface Meeting {
  id: string;
  meeting_code: string;
  host_id: string;
  host_name: string;
  title: string;
  description: string | null;
  kind: MeetingKind;
  status: MeetingStatus;
  scheduled_start_at: string | null; // ISO-8601 UTC
  duration_minutes: number | null;
  timezone: string;
  passcode: string | null;
  requires_passcode: boolean;
  invite_url: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface PublicMeeting {
  exists: boolean;
  status: MeetingStatus | null;
  title: string | null;
  host_name: string | null;
  requires_passcode: boolean;
}

export interface MeetingSettings {
  host_video_on: boolean;
  participant_video_on: boolean;
  mute_on_entry: boolean;
  join_before_host: boolean;
  waiting_room: boolean;
  allow_self_unmute: boolean;
  chat_enabled: boolean;
}

export interface Participant {
  id: string;
  meeting_id: string;
  user_id: string | null;
  display_name: string;
  role: 'host' | 'co_host' | 'participant';
  status: 'joined' | 'left' | 'removed';
  audio: boolean;
  video: boolean;
  hand_raised: boolean;
  joined_at: string;
}

export interface JoinResult {
  participant_id: string;
  role: 'host' | 'co_host' | 'participant';
  ws_url: string;
  ws_ticket: string;
  ice_servers: RTCIceServer[];
}

export interface ApiList<T> {
  items: T[];
  next_cursor: string | null;
}

export interface ScheduleMeetingDto {
  title: string;
  description?: string;
  scheduled_start_at: string; // ISO-8601 UTC
  duration_minutes: number;
  timezone: string;
  meeting_id_type: 'generate' | 'personal';
  passcode?: string;
  host_video_on: boolean;
  participant_video_on: boolean;
  mute_on_entry: boolean;
  join_before_host: boolean;
  waiting_room: boolean;
}
