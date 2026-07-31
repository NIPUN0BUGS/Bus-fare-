import type { Metadata } from 'next';
import { brand } from '@buslanka/ui/tokens/brand';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: brand.productName,
    template: `%s | ${brand.productName}`,
  },
  description: brand.tagline,
  manifest: '/manifest.json',
  themeColor: '#2563EB',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: brand.productName },
  openGraph: {
    type: 'website',
    siteName: brand.productName,
    title: brand.productName,
    description: brand.tagline,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+Sinhala:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
