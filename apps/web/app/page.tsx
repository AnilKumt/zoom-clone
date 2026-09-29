import { redirect } from 'next/navigation';

// Root redirect: demo mode → /home, else → /welcome
// Actual auth guard is in middleware.ts
export default function RootPage() {
  redirect('/home');
}
