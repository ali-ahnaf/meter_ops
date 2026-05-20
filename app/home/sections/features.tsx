import { FolderTree, LayoutTemplate, Database } from 'lucide-react';
import { HomeFeature } from '@/lib/types/home.types';

const icons = [FolderTree, LayoutTemplate, Database];

export default function Features({ data }: { data: HomeFeature[] }) {
  return (
    <section id="features" className="px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Conventions
          </p>
          <h2 className="font-serif text-3xl text-slate-900 sm:text-4xl">
            Reuse the project shape, not just the visuals
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.map((item, index) => {
            const Icon = icons[index] || LayoutTemplate;

            return (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-5 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
