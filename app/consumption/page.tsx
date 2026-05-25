import ConsumptionReport from '@/components/consumption-report';

type ConsumptionPageProps = {
  searchParams?: {
    firstSessionId?: string;
    secondSessionId?: string;
  };
};

export default function ConsumptionPage({ searchParams }: ConsumptionPageProps) {
  return (
    <ConsumptionReport
      firstSessionId={searchParams?.firstSessionId ?? null}
      secondSessionId={searchParams?.secondSessionId ?? null}
    />
  );
}
