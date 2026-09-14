import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['vietnamese', 'latin'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

export const metadata: Metadata = {
  title: 'Cờ Vua Sài Gòn · Kết quả thi đấu',
  description: 'Tra cứu điểm số, từng ván đấu và thứ hạng của con.',
  robots: { index: false, follow: false },
  icons: { icon: '/company-logo.png', apple: '/company-logo.png' },
  appleWebApp: { capable: true, title: 'Cờ Vua Sài Gòn', statusBarStyle: 'default' }
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet" />
      </head>
      <body className={beVietnamPro.className}>{children}</body>
    </html>
  );
}
