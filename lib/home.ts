import { initializeDatabase, postRepo } from '@/lib/db';
import { HomeFeature, HomeHero } from '@/lib/types/home.types';

const hero: HomeHero = {
  badge: 'Reusable starter',
  title: 'A clean Next.js foundation with your existing project shape',
  description:
    'Start new projects from familiar conventions: route-first pages, page sections, shared components, and a server-side TypeORM data layer.',
};

const features: HomeFeature[] = [
  {
    title: 'Route-first organization',
    description:
      'Each page keeps its own `sections/` folder so page-specific UI stays near the route that owns it.',
  },
  {
    title: 'Shared component boundary',
    description:
      'Cross-page building blocks live in `components/`, with UI primitives separated under `components/ui/`.',
  },
  {
    title: 'TypeORM by default',
    description:
      'Database access is handled through a reusable datasource setup and entity-driven models.',
  },
];

export async function getHomeData() {
  const fallbackPosts = [
    {
      id: 'project-structure',
      slug: 'project-structure',
      title: 'Project structure conventions',
      excerpt:
        'Keep route files small by moving page-only UI into `sections/` and shared helpers into `lib/`.',
      category: 'Architecture',
      publishedAt: new Date(),
    },
    {
      id: 'typeorm-setup',
      slug: 'typeorm-setup',
      title: 'TypeORM setup pattern',
      excerpt:
        'Use a shared datasource module and repository helpers so route handlers and server components stay focused.',
      category: 'Database',
      publishedAt: new Date(),
    },
  ];

  let posts = fallbackPosts;

  try {
    await initializeDatabase();
    const existingPosts = await postRepo().find({
      order: { publishedAt: 'DESC' },
      take: 4,
    });

    if (existingPosts.length > 0) {
      posts = existingPosts;
    }
  } catch (error) {
    console.warn('Falling back to static posts:', error);
  }

  return {
    hero,
    features,
    posts,
  };
}
