import './globals.css';
import Sidebar from '@/components/Sidebar';
import AccountDataSync from '@/components/AccountDataSync';
import RoleAccessGuard from '@/components/RoleAccessGuard';

export const metadata = {
  title: 'KostPro — Kost Management System',
  description: 'Sistem manajemen kost online',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <div className="app">
          <AccountDataSync />
          <Sidebar />
          <main className="main"><RoleAccessGuard>{children}</RoleAccessGuard></main>
        </div>
      </body>
    </html>
  );
}
