 'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const links = [
  { href: '/', label: 'Home' },
  { href: '/consumption', label: 'Consumption' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(2,6,23,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="glitch-text text-xl font-bold tracking-[0.42em] text-cyan-300 sm:text-2xl" data-text="METER_OPS">
          METER_OPS
        </Link>

        <nav className="hidden items-center gap-3 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md border px-4 py-2 text-xs uppercase tracking-[0.28em] transition-all ${
                pathname === link.href
                  ? 'border-cyan-300 bg-[rgba(34,211,238,0.14)] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.16)]'
                  : 'border-[rgba(148,163,184,0.18)] text-slate-300 hover:border-cyan-400 hover:text-cyan-200'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button asChild variant="secondary" size="sm">
          <Link href="/consumption">
            Consumption
          </Link>
        </Button>
      </div>
    </header>
  );
}
