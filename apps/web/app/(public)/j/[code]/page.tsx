import { redirect } from 'next/navigation';

// Invite links: /j/CODE?pwd=PASSCODE → redirect to lobby
export default async function InviteLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/meeting/${code}/lobby`);
}
