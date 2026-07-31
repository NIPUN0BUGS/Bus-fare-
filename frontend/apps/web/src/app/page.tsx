import { brand } from '@buslanka/ui/tokens/brand';
import SearchForm from '@/components/search/SearchForm';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-600 to-primary-800">
      {/* Header */}
      <header className="px-4 pt-12 pb-6 text-white text-center">
        <h1 className="text-3xl font-bold tracking-tight">{brand.productName}</h1>
        <p className="mt-1 text-primary-100 text-sm">{brand.tagline}</p>
      </header>

      {/* Search card */}
      <section
        className="mx-auto max-w-lg px-4"
        aria-label="Journey search"
      >
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <SearchForm />
        </div>
      </section>

      {/* Quick actions */}
      <section className="mx-auto max-w-lg px-4 mt-6 grid grid-cols-2 gap-3">
        <a
          href="/nearby"
          className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur
                     text-white rounded-xl p-4 transition-colors"
          aria-label="Find nearby bus stops"
        >
          <span className="text-2xl" role="img" aria-hidden="true">📍</span>
          <span className="font-medium text-sm">Nearby Stops</span>
        </a>
        <a
          href="/bookings"
          className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur
                     text-white rounded-xl p-4 transition-colors"
          aria-label="My bookings"
        >
          <span className="text-2xl" role="img" aria-hidden="true">🎟</span>
          <span className="font-medium text-sm">My Bookings</span>
        </a>
      </section>
    </main>
  );
}
