import type { Metadata } from 'next';
import { brand } from '@buslanka/ui/tokens/brand';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `${brand.productName} Operator Portal`, template: `%s | ${brand.productName} Operator` },
  description: `Manage your bus routes, fares, and fleet on ${brand.productName}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
