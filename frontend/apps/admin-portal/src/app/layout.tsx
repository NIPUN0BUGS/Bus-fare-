import type { Metadata } from 'next';
import { brand } from '@buslanka/ui/tokens/brand';

export const metadata: Metadata = {
  title: `${brand.productName} Admin`,
  description: 'Platform administration',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-gray-100 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
