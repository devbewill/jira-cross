import { SprintDashboard } from '@/components/sprint/SprintDashboard';

export const metadata = {
  title: 'Jira Sprint Dashboard',
};

export default function SprintPage() {
  return (
    <div className='flex flex-col h-full bg-background'>
      <SprintDashboard />
    </div>
  );
}
