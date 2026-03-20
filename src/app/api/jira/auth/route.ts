import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET() {
  const clientId = process.env.JIRA_OAUTH_CLIENT_ID;
  const redirectUri = process.env.JIRA_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Missing OAuth configuration' },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = randomBytes(16).toString('hex');

  // Granular scopes for Jira Software (includes epic, issue, sprint, etc.)
  const scopes = [
    'read:board-scope.admin:jira-software',
    'read:board-scope:jira-software',
    'read:epic:jira-software',
    'read:issue:jira-software',
    'read:sprint:jira-software',
    'read:filter:jira',
    'read:filter.column:jira',
    'read:issue:jira',
    'read:issue-meta:jira',
    'read:attachment:jira',
    'read:comment:jira',
    'read:comment.property:jira',
    'read:field:jira',
    'read:field.default-value:jira',
    'read:issue-link:jira',
    'read:space-info:jira'
  ].join(' ');

  // Store state in cookie (simple approach - in production use session storage)
  const response = NextResponse.redirect(
    `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&prompt=consent`
  );

  // Set state in cookie (httpOnly, Secure in production)
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    maxAge: 600, // 10 minutes
  });

  return response;
}
