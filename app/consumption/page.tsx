import Footer from '@/components/footer';
import Navigation from '@/components/navigation';
import ConsumptionReport from '@/components/consumption-report';

export default function ConsumptionPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="overflow-x-hidden">
        <ConsumptionReport />
      </main>
      <Footer />
    </div>
  );
}
