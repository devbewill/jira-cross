import { TimesheetDashboard } from '@/components/timesheet/TimesheetDashboard';

export const metadata = {
  title: 'Jira Timesheet Dashboard',
};

export default function TimesheetPage() {
  return (
    <div className='flex flex-col h-full bg-background'>
      <TimesheetDashboard />
    </div>
  );
}
