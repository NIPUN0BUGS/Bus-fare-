import { brand } from '@buslanka/ui/tokens/brand';

export default function AdminDashboard() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary-700">{brand.productName} Administration</h1>
        <p className="text-gray-500 mt-2">Phase 1 — Operator approval and route management coming in Week 9.</p>
      </div>
    </main>
  );
}
