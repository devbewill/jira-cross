import re

with open("/Users/stefano.perelli/code/frontend-admin/src/features/jira/components/sprint/sprint-dashboard.tsx", "r") as f:
    original = f.read()

# Replace the imports
original = re.sub(
    r"import \{ useState, useMemo \} from 'react'.*?import type \{ JiraSprint, SprintIssue \} from '@\/lib\/api\/jira'",
    """import { useState, useMemo } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useSprint } from '@/hooks/useSprint';
import { useGroup } from '@/hooks/useGroup';
import { useRefresh } from '@/contexts/RefreshContext';
import { JiraSprint, SprintIssue } from '@/types';""",
    original,
    flags=re.DOTALL
)

# Replace the component definition and hook usages
original = re.sub(
    r"export function SprintDashboard\(\) \{.*?const \{ data, isLoading, error \} = useQuery\(\{\n    queryKey: \['sprint-dashboard'\],\n    queryFn: fetchSprintDashboard,\n    staleTime: CACHE_TTL_MS,\n  \}\).*?const queryClient = useQueryClient\(\).*?const triggerRefresh = async \(\) => \{.*?\}",
    """export function SprintDashboard() {
  const { data, loading: isLoading, error, refetch: triggerRefresh } = useSprint();""",
    original,
    flags=re.DOTALL
)

original = original.replace("isLoading", "loading")

with open("/Users/stefano.perelli/code/jira-cross/src/components/sprint/SprintDashboard.tsx", "w") as f:
    f.write(original)

print("SprintDashboard restored exactly as frontend-admin")
