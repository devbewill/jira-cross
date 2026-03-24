import { NextRequest, NextResponse } from "next/server";
import { IssueStats } from "@/types";
import { releaseIssuesCache } from "@/lib/cache/memory-cache";

interface JiraSearchResponse {
  issues: Array<{
    fields: {
      status: { statusCategory: { key: string } };
      fixVersions: Array<{ id: string; description?: string }>;
      components: Array<{ name: string }>;
    };
  }>;
  total: number;
  nextPageToken?: string | null;
}

/**
 * GET /api/jira/release-issues?projectKey=XXX
 *
 * Returns issue counts grouped by fixVersion id and Jira status category.
 * Response: { stats: Record<versionId, IssueStats> }
 *
 * Uses POST /rest/api/3/search/jql which is cursor-based (nextPageToken),
 * NOT offset-based (startAt was invalid and caused 400).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const projectKey = req.nextUrl.searchParams.get("projectKey");
  if (!projectKey) {
    return NextResponse.json({ error: "Missing projectKey" }, { status: 400 });
  }

  const base = process.env.JIRA_BASE_URL?.replace(/\/$/, "");
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!base || !email || !apiToken) {
    return NextResponse.json(
      { error: "Missing Jira credentials" },
      { status: 500 },
    );
  }

  // Serve from cache if available
  const cacheKey = `release-issues:${projectKey}`;
  const cached = releaseIssuesCache.get(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cacheHit: true });

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${auth}`,
  };
  const jql = `project = "${projectKey}" AND fixVersion is not EMPTY`;
  const url = `${base}/rest/api/3/search/jql`;

  try {
    const statsMap: Record<string, IssueStats> = {};

    let nextPageToken: string | null = null;
    let totalFetched = 0;
    let firstPage = true;

    while (firstPage || nextPageToken) {
      firstPage = false;

      const body: Record<string, unknown> = {
        jql,
        fields: ["status", "fixVersions", "components", "description"],
        maxResults: 100,
      };
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Jira API error: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
        );
      }

      const data: JiraSearchResponse = await res.json();

      if (data.issues.length === 0) break;

      for (const issue of data.issues) {
        // statusCategory keys: 'new' = To Do · 'indeterminate' = In Progress · 'done' = Done
        const catKey = issue.fields.status?.statusCategory?.key ?? "new";

        for (const fv of issue.fields.fixVersions ?? []) {
          const vid = fv.id;
          if (!statsMap[vid])
            statsMap[vid] = {
              todo: 0,
              inProgress: 0,
              done: 0,
              total: 0,
              components: [],
              description: fv.description ?? "",
            };

          if (catKey === "done") statsMap[vid].done++;
          else if (catKey === "indeterminate") statsMap[vid].inProgress++;
          else statsMap[vid].todo++;

          statsMap[vid].total++;

          // Collect components
          for (const comp of issue.fields.components ?? []) {
            if (comp.name && !statsMap[vid].components?.includes(comp.name)) {
              statsMap[vid].components?.push(comp.name);
            }
          }
        }
      }

      totalFetched += data.issues.length;
      nextPageToken = data.nextPageToken ?? null;

      // Safety cap: stop at 2 000 issues per project
      if (totalFetched >= 2000) break;
    }

    const result = {
      stats: statsMap,
      fetchedAt: new Date().toISOString(),
      cacheHit: false,
    };
    releaseIssuesCache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[release-issues] ${projectKey}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
