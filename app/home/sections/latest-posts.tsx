import { PostEntity } from '@/lib/entities/Post.entity';

export default function LatestPosts({ data }: { data: PostEntity[] }) {
  return (
    <section id="latest-posts" className="px-4 py-10 pb-20 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              TypeORM example
            </p>
            <h2 className="font-serif text-3xl text-slate-900 sm:text-4xl">
              Server-rendered content from SQLite
            </h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {data.map((post) => (
            <article
              key={post.id}
              className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-6"
            >
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                {post.category}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                {post.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {post.excerpt}
              </p>
              <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-400">
                {post.publishedAt.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
