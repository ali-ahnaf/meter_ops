import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeHero } from '@/lib/types/home.types';

export default function Hero({ data }: { data: HomeHero }) {
  return (
    <section className="px-4 pb-20 pt-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)]/85 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div className="space-y-6">
          <span className="inline-flex rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
            {data.badge}
          </span>
          <div className="space-y-4">
            <h1 className="font-serif text-4xl leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {data.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {data.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="#features">
                Explore Sections
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#latest-posts">View Content Pattern</Link>
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-8 text-slate-50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.3),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.28),transparent_30%)]" />
          <div className="relative space-y-6">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-200">
              Structure first
            </p>
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">Page sections</p>
                <p className="text-lg font-semibold">`app/home/sections/*`</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">Shared data layer</p>
                <p className="text-lg font-semibold">`lib/*` + TypeORM</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">Reusable components</p>
                <p className="text-lg font-semibold">`components/*`</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
