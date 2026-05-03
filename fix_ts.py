import re

with open("/Users/stefano.perelli/code/frontend-admin/src/features/jira/components/timesheet/timesheet-dashboard.tsx", "r") as f:
    content = f.read()

# 1. Strip all imports and replace with ours
content = re.sub(
    r"^import .*?\n\n",
    """\"use client\";\n\nimport { useState, useMemo } from 'react';\nimport { RefreshCw, ChevronDown, Clock, Users, Briefcase, FileText, ExternalLink } from 'lucide-react';\nimport { useTimesheet } from '@/hooks/useTimesheet';\nimport { useGroup } from '@/hooks/useGroup';\nimport { useRefresh } from '@/contexts/RefreshContext';\nimport { UserTimesheet } from '@/types';\n\n""",
    content,
    flags=re.DOTALL
)

# 2. Fix JIRA_BROWSE
content = re.sub(
    r"const JIRA_BROWSE = `\$\{import\.meta\.env\.VITE_JIRA_BASE_URL \?\? ''\}/browse`",
    r"const JIRA_BROWSE = `${process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? ''}/browse`;",
    content
)

# 3. Fix component and useTimesheet
content = re.sub(
    r"export function TimesheetDashboard\(\) \{.*?const queryClient = useQueryClient\(\).*?const triggerRefresh = async \(\) => \{.*?\}",
    """export function TimesheetDashboard() {
  const [preset, setPreset] = useState<Preset>('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { isRefreshing, triggerRefresh } = useRefresh();
  const { start, end } = useMemo(() => getRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const { data, loading, error } = useTimesheet(start, end);

  const analystQuery = useGroup('hd-analist');
  const devQuery = useGroup('hd-developers');
  const bitBossQuery = useGroup('EXT-BitBoss');
  const digitWareQuery = useGroup('EXT-DigitWare');
  const nesesisQuery = useGroup('newesis');

  const groupSets = useMemo(() => {
    const toSet = (d: unknown) => new Set<string>(Array.isArray(d) ? d : []);
    return {
      'hd-analist': toSet(analystQuery.data),
      'hd-developers': toSet(devQuery.data),
      'EXT-BitBoss': toSet(bitBossQuery.data),
      'EXT-DigitWare': toSet(digitWareQuery.data),
      newesis: toSet(nesesisQuery.data),
    };
  }, [analystQuery.data, devQuery.data, bitBossQuery.data, digitWareQuery.data, nesesisQuery.data]);""",
    content,
    flags=re.DOTALL
)

# Replace isLoading -> loading
content = content.replace("isLoading", "loading")
content = content.replace("isRefetching", "isRefreshing")

# Fix button
content = re.sub(
    r"<Button[^>]*>.*?<\/Button>",
    r"<button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />JIRA</button>",
    content,
    flags=re.DOTALL
)

with open("/Users/stefano.perelli/code/jira-cross/src/components/timesheet/TimesheetDashboard.tsx", "w") as f:
    f.write(content)

