import re

with open("/Users/stefano.perelli/code/frontend-admin/src/features/jira/components/timesheet/timesheet-dashboard.tsx", "r") as f:
    original = f.read()

# Replace the imports
original = re.sub(
    r"import \{ useState, useMemo \} from 'react'.*?import type \{ TimesheetData, TimesheetEntry, UserTimesheet \} from '@\/lib\/api\/jira'",
    """import { useState, useMemo } from 'react';
import { RefreshCw, ChevronDown, Clock, Users, Briefcase, FileText, ExternalLink } from 'lucide-react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useGroup } from '@/hooks/useGroup';
import { useRefresh } from '@/contexts/RefreshContext';
import { UserTimesheet } from '@/types';""",
    original,
    flags=re.DOTALL
)

# Replace JIRA_BROWSE
original = re.sub(
    r"const JIRA_BROWSE =.*?replace\(\/\\/\$\/, ''\) \?\? ''",
    r"const JIRA_BROWSE = `${process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? ''}/browse`",
    original,
    flags=re.DOTALL
)

# Replace the component definition and hook usages
original = re.sub(
    r"export function TimesheetDashboard\(\) \{.*?const \{ isRefetching, refetch \} = useQuery.*?const \{ data, isLoading, error \} = useQuery\(\{\n    queryKey: \['timesheet', start, end\],\n    queryFn: \(\) => fetchTimesheet\(start, end\),\n    staleTime: CACHE_TTL_MS,\n    enabled: !!start && !!end,\n  \}\).*?const triggerRefresh = async \(\) => \{.*?\}",
    """export function TimesheetDashboard() {
  const [preset, setPreset] = useState<Preset>('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { isRefreshing, triggerRefresh } = useRefresh();
  const { start, end } = useMemo(() => getRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const { data, loading: isLoading, error } = useTimesheet(start, end);""",
    original,
    flags=re.DOTALL
)

original = original.replace("isLoading", "loading")

# Replace the Button imports/usage
original = re.sub(
    r"<Button[^>]*>.*?<\/Button>",
    r"<button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />JIRA</button>",
    original,
    flags=re.DOTALL
)
original = re.sub(r"import \{ Button \} from '@\/components\/ui\/button'", "", original)

with open("/Users/stefano.perelli/code/jira-cross/src/components/timesheet/TimesheetDashboard.tsx", "w") as f:
    f.write(original)

print("TimesheetDashboard restored exactly as frontend-admin")
