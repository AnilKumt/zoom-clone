import type { Participant } from '@/types/api';

export type HostAction =
  | 'MUTE_ALL'
  | 'UNMUTE_ALL'
  | 'MUTE_PARTICIPANT'
  | 'REMOVE_PARTICIPANT'
  | 'MAKE_HOST'
  | 'MAKE_CO_HOST'
  | 'END_MEETING';

export function canPerformAction(
  actor: { role: 'host' | 'co_host' | 'participant' } | null,
  action: HostAction,
  target?: Participant | null
): boolean {
  if (!actor) return false;
  if (actor.role === 'host') return true;

  if (actor.role === 'co_host') {
    if (action === 'END_MEETING' || action === 'MAKE_HOST') return false;
    if (target && (target.role === 'host' || target.role === 'co_host')) {
      return false; // Co-hosts cannot mute or remove host or fellow co-hosts
    }
    return true;
  }

  return false;
}
