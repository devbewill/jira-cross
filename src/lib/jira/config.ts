export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  serviceDeskId: string;
  pspProject: string;
  epicLabel: string;
  pcProject: string;
  initiativeType: string;
  fields: {
    startDate: string;
    storyPoints: string;
    sprint: string;
    sla: string;
  };
}

export function getJiraConfig(): JiraConfig {
  return {
    baseUrl:        (process.env.JIRA_BASE_URL ?? '').replace(/\/$/, ''),
    email:          process.env.JIRA_EMAIL    ?? '',
    apiToken:       process.env.JIRA_API_TOKEN ?? '',
    serviceDeskId:  process.env.JIRA_SERVICE_DESK_ID ?? '30',
    pspProject:     process.env.JIRA_PSP_PROJECT ?? 'SA',
    epicLabel:      process.env.JIRA_EPIC_LABEL  ?? 'P0',
    pcProject:      process.env.JIRA_PC_PROJECT  ?? 'PC',
    initiativeType: process.env.JIRA_INITIATIVE_TYPE ?? 'Initiative',
    fields: {
      startDate:   process.env.JIRA_FIELD_START_DATE   ?? 'customfield_10015',
      storyPoints: process.env.JIRA_FIELD_STORY_POINTS ?? 'customfield_10016',
      sprint:      process.env.JIRA_FIELD_SPRINT       ?? 'customfield_10020',
      sla:         process.env.JIRA_FIELD_SLA          ?? 'customfield_10060',
    },
  };
}

export function hasJiraCredentials(cfg: JiraConfig): boolean {
  return !!(cfg.baseUrl && cfg.email && cfg.apiToken);
}
