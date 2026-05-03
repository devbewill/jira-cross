import os
import re

SOURCE_DIR = "/Users/stefano.perelli/code/frontend-admin/src/features/jira/components/releases"
DEST_DIR = "/Users/stefano.perelli/code/jira-cross/src/components/timeline"

files_to_copy = [
    "release-timeline.tsx",
    "release-block.tsx",
    "release-card-view.tsx",
    "release-panel.tsx",
    "timeline-header.tsx",
    "today-marker.tsx"
]

def map_imports(content):
    # 1. @/features/jira/components/releases/... -> ./...
    content = re.sub(r"@/features/jira/components/releases/([^']+)", r"./\1", content)
    
    # 2. @/features/jira/hooks/use-timeline-scale -> @/hooks/useTimelineScale
    content = content.replace("@/features/jira/hooks/use-timeline-scale", "@/hooks/useTimelineScale")
    content = content.replace("use-timeline-scale", "useTimelineScale")
    
    # 3. @/features/jira/lib/date-utils -> @/lib/utils/date-utils
    content = content.replace("@/features/jira/lib/date-utils", "@/lib/utils/date-utils")
    
    # 4. @/features/jira/lib/status-config -> @/lib/utils/status-config
    content = content.replace("@/features/jira/lib/status-config", "@/lib/utils/status-config")
    
    # 5. @/features/jira/types/releases -> @/types
    content = content.replace("@/features/jira/types/releases", "@/types")
    
    # 6. @/features/jira/lib/format-utils -> @/lib/utils/format-utils
    content = content.replace("@/features/jira/lib/format-utils", "@/lib/utils/format-utils")
    
    # 7. import.meta.env.VITE_JIRA_CACHE_TTL -> process.env.NEXT_PUBLIC_JIRA_CACHE_TTL
    content = content.replace("import.meta.env.VITE_JIRA_CACHE_TTL", "process.env.NEXT_PUBLIC_JIRA_CACHE_TTL")
    
    # 8. import.meta.env.VITE_JIRA_BASE_URL -> process.env.NEXT_PUBLIC_JIRA_BASE_URL
    content = content.replace("import.meta.env.VITE_JIRA_BASE_URL", "process.env.NEXT_PUBLIC_JIRA_BASE_URL")
    
    # 9. @/lib/api/jira -> @/hooks/useReleases or @/lib/jira/client...
    # In Next.js, we don't have clearReleasesCache and fetchReleasesActive etc. 
    # They should be replaced with `useReleases` hook. 
    # But wait! Let me do this manually for `ReleaseTimeline.tsx`!
    return content

for filename in files_to_copy:
    src_path = os.path.join(SOURCE_DIR, filename)
    dest_filename = "".join(word.capitalize() for word in filename.replace(".tsx", "").split("-")) + ".tsx"
    if dest_filename == "ReleaseCardView.tsx":
        pass # It is correctly ReleaseCardView.tsx
        
    dest_path = os.path.join(DEST_DIR, dest_filename)
    
    with open(src_path, "r") as f:
        content = f.read()
        
    content = map_imports(content)
    
    # Ensure correct local imports
    content = content.replace("./release-block", "./ReleaseBlock")
    content = content.replace("./release-card-view", "./ReleaseCardView")
    content = content.replace("./release-panel", "./ReleasePanel")
    content = content.replace("./timeline-header", "./TimelineHeader")
    content = content.replace("./today-marker", "./TodayMarker")
    
    if filename == "release-timeline.tsx":
        # Let's fix the queries. We need to use useReleases hook in Next.js
        content = re.sub(r"import \{.*?fetchReleasesActive.*?} from '@\/lib\/api\/jira'", "import { useReleases } from '@/hooks/useReleases'", content, flags=re.DOTALL)
        
        # Replace the activeQuery and allQuery logic with just useReleases!
        # In jira-cross we use: const { data, loading: isLoading, error, refetch } = useReleases()
        
        # Wait, frontend-admin has `statusFilter`. In jira-cross, we get everything from useReleases, or we just rely on what it provides.
        # Let's see what we can do for `ReleaseTimeline.tsx`.
        # I will leave it as is for now and then replace it using a separate step.
        pass
        
    if filename == "release-panel.tsx":
        content = content.replace("import { fetchReleaseChangelog } from '@/lib/api/jira'", "import { fetchReleaseChangelog } from '@/lib/api/jira' // TODO Next.js API")
        
    # Write to destination
    with open(dest_path, "w") as f:
        # add "use client"
        f.write('"use client";\n\n' + content)
    print(f"Copied and processed {filename} to {dest_filename}")

