import './globals.css';
import Sidebar from '@/components/Sidebar';

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
          <Sidebar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
