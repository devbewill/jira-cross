import { NextRequest, NextResponse } from "next/server";
import { JiraClient } from "@/lib/jira/client";
import { getJiraConfig, hasJiraCredentials } from "@/lib/jira/config";
import { IssueStats } from "@/types";
import { releaseIssuesCache } from "@/lib/cache/memory-cache";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const projectKey = req.nextUrl.searchParams.get("projectKey");
  if (!projectKey) {
    return NextResponse.json({ error: "Missing projectKey" }, { status: 400 });
  }

  const cfg = getJiraConfig();
  if (!hasJiraCredentials(cfg)) {
    return NextResponse.json({ error: "Missing Jira credentials" }, { status: 500 });
  }

  const cacheKey = `release-issues:${projectKey}`;
  const cached   = releaseIssuesCache.get(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cacheHit: true });

  try {
    const client = new JiraClient(cfg.baseUrl, cfg.email, cfg.apiToken);
    const jql    = `project = "${projectKey}" AND fixVersion is not EMPTY`;
    const issues = await client.searchIssues(jql, ["status", "fixVersions", "components", "description"]);

    const statsMap: Record<string, IssueStats> = {};

    for (const issue of issues) {
      const catKey = issue.fields?.status?.statusCategory?.key ?? "new";

      for (const fv of (issue.fields?.fixVersions as any[]) ?? []) {
        const vid = fv.id;
        if (!statsMap[vid]) {
          statsMap[vid] = { todo: 0, inProgress: 0, done: 0, total: 0, components: [], description: fv.description ?? "" };
        }

        if (catKey === "done") statsMap[vid].done++;
        else if (catKey === "indeterminate") statsMap[vid].inProgress++;
        else statsMap[vid].todo++;

        statsMap[vid].total++;

        for (const comp of (issue.fields?.components as any[]) ?? []) {
          if (comp.name && !statsMap[vid].components?.includes(comp.name)) {
            statsMap[vid].components?.push(comp.name);
          }
        }
      }
    }

    const result = { stats: statsMap, fetchedAt: new Date().toISOString(), cacheHit: false };
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
