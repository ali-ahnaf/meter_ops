import SessionDetail from '@/components/session-detail';

type SessionPageProps = {
  params: {
    sessionId: string;
  };
};

export default function SessionPage({ params }: SessionPageProps) {
  return <SessionDetail sessionId={params.sessionId} />;
}
