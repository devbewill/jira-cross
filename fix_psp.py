import re

with open("/Users/stefano.perelli/code/frontend-admin/src/features/jira/components/psp/psp-dashboard.tsx", "r") as f:
    original = f.read()

# Replace the imports
original = re.sub(
    r"import \{ useState, useMemo \} from 'react'.*?import type \{\n  PSPIssue,\n  PSPSla,\n  PSPRequestTypeGroup,\n\} from '@\/features\/jira\/types\/psp'",
    """import { useState, useMemo } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { usePSP } from '@/hooks/usePSP';
import { useRefresh } from '@/contexts/RefreshContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PSPIssue, PSPRequestTypeGroup, PSPSla } from '@/types';""",
    original,
    flags=re.DOTALL
)

# Replace ISSUE_COLORS usage if it is broken, wait ISSUE_COLORS is imported. Let's see if ISSUE_COLORS is used.
original = re.sub(r"import \{ ISSUE_COLORS \} from '@\/features\/jira\/lib\/jira-colors'\n", "", original)
# wait, if ISSUE_COLORS is used, we need to replace it or inline it. Let's check where it's used.

# Replace JIRA_BROWSE
original = re.sub(
    r"const JIRA_BROWSE =.*?replace\(\/\\/\$\/, ''\) \?\? ''",
    r"const JIRA_BROWSE = `${process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? ''}/browse`",
    original,
    flags=re.DOTALL
)

# Replace the component definition and hook usages
original = re.sub(
    r"export function PSPDashboard\(\) \{.*?const \{ data, isLoading, error \} = useQuery\(\{\n    queryKey: \['psp-dashboard'\],\n    queryFn: getPSPData,\n    staleTime: CACHE_TTL_MS,\n  \}\).*?const triggerRefresh = async \(\) => \{.*?\}",
    """export function PSPDashboard() {
  const { data, loading: isLoading, error, cacheHit, refetch: triggerRefresh } = usePSP();
  const { isRefreshing } = useRefresh();""",
    original,
    flags=re.DOTALL
)

original = original.replace("isLoading", "loading")

# Replace Button
original = re.sub(
    r"<Button[^>]*>.*?<\/Button>",
    r"<button className='inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3' disabled={loading || isRefreshing} onClick={triggerRefresh}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading || isRefreshing ? 'animate-spin' : ''}`} />Ricarica</button>",
    original,
    flags=re.DOTALL
)

original = re.sub(
    r"import \{ Button \} from '@\/components\/ui\/button'\n", "", original
)

# Fix cache hit displaying
original = re.sub(
    r"dataUpdatedAt",
    r"data.fetchedAt",
    original,
    flags=re.DOTALL
)

original = re.sub(
    r"isStale \? 'bg-amber-500' : 'bg-emerald-500'",
    r"cacheHit ? 'bg-amber-500' : 'bg-emerald-500'",
    original,
    flags=re.DOTALL
)

original = re.sub(
    r"const CACHE_TTL_MS =.*?1000",
    r"",
    original,
    flags=re.DOTALL
)

original = re.sub(
    r"const ttlMinutes = Math\.round\(CACHE_TTL_MS \/ 60000\)",
    r"const ttlMinutes = Math.round((parseInt(process.env.NEXT_PUBLIC_JIRA_CACHE_TTL || '300', 10)) / 60)",
    original,
    flags=re.DOTALL
)

original = re.sub(
    r"const queryClient = useQueryClient\(\)",
    r"",
    original
)

with open("/Users/stefano.perelli/code/jira-cross/src/components/psp/PSPDashboard.tsx", "w") as f:
    f.write(original)

print("PSPDashboard replaced")
