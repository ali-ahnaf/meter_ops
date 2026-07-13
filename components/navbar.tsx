'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Droplets, Zap } from 'lucide-react';

const links = [
  { href: '/', label: 'DPDC', icon: Zap },
  { href: '/wasa', label: 'WASA', icon: Droplets },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)] backdrop-blur">
      <div className="page-wrap flex items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Meter Ops logo"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900">
            Meter Ops
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-700 bg-blue-700 text-white!'
                    : 'border-slate-300 bg-white text-slate-700! hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
