import Link from 'next/link';
import { Button } from '@/components/ui/button';

const links = [
  { href: '/', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#latest-posts', label: 'Posts' },
];

export default function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="font-serif text-2xl font-semibold text-slate-900">
          template-nextjs
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button asChild variant="secondary">
          <Link href="https://nextjs.org/docs" target="_blank">
            Docs
          </Link>
        </Button>
      </div>
    </header>
  );
}
