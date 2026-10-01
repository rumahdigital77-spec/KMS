'use client';

export default function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  // Access is no longer restricted by Owner/Admin role.
  // Database RLS/property isolation remains responsible for data security.
  return <>{children}</>;
}
