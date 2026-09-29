import { redirect } from 'next/navigation';

// Invite links: /j/CODE?pwd=PASSCODE → redirect to lobby
export default function InviteLinkPage({ params }: { params: { code: string } }) {
  redirect(`/meeting/${params.code}/lobby`);
}
