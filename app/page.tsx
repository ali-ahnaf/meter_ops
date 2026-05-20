import Footer from '@/components/footer';
import Navigation from '@/components/navigation';
import Features from '@/app/home/sections/features';
import Hero from '@/app/home/sections/hero';
import LatestPosts from '@/app/home/sections/latest-posts';
import { getHomeData } from '@/lib/home';

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <div className="min-h-screen font-sans text-slate-900">
      <Navigation />
      <main className="overflow-x-hidden">
        <Hero data={data.hero} />
        <Features data={data.features} />
        <LatestPosts data={data.posts} />
      </main>
      <Footer />
    </div>
  );
}
