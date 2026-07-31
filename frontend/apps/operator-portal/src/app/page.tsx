import { brand } from '@buslanka/ui/tokens/brand';

export default function OperatorDashboard() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary-700">{brand.productName} Operator Portal</h1>
        <p className="text-gray-500 mt-2">Phase 1 — Login and dashboard coming in Week 5.</p>
      </div>
    </main>
  );
}
