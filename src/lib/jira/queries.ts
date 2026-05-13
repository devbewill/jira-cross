import { getJiraConfig } from './config';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_RESULTS = 1000;

export function buildEpicJql(): string {
  const { epicLabel } = getJiraConfig();
  return `issuetype = Epic AND labels = ${epicLabel} ORDER BY created DESC`;
}

export function buildPspJql(): string {
  const { pspProject } = getJiraConfig();
  return `project = ${pspProject} ORDER BY created DESC`;
}
