import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  console.log('OAuth callback:', { code: code ? '***' : 'missing', state: state ? '***' : 'missing', error });

  // Check for errors from Atlassian
  if (error) {
    console.error('Atlassian error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    console.error('Missing code from Atlassian');
    return NextResponse.redirect(new URL('/?error=missing_code', request.url));
  }

  // Verify state (CSRF protection)
  const storedState = request.cookies.get('oauth_state')?.value;
  console.log('State verification:', { hasState: !!state, hasStoredState: !!storedState, match: state === storedState });

  if (!state || state !== storedState) {
    console.error('State mismatch or missing');
    return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
  }

  try {
    const clientId = process.env.JIRA_OAUTH_CLIENT_ID;
    const clientSecret = process.env.JIRA_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing OAuth credentials');
    }

    // Exchange code for access token
    console.log('Exchanging code for token...');
    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: process.env.JIRA_OAUTH_REDIRECT_URI,
      }),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token data keys:', Object.keys(tokenData));
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access_token in response');
      throw new Error('No access token in response');
    }

    console.log('Access token obtained successfully (length:', accessToken.length, ')');

    // Redirect to home and set token in cookie
    const response = NextResponse.redirect(new URL('/', request.url));

    // Set access token in httpOnly cookie
    response.cookies.set('jira_access_token', accessToken, {
      httpOnly: true,
      maxAge: tokenData.expires_in || 3600, // 1 hour default
    });

    // Clear state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent(error instanceof Error ? error.message : 'OAuth failed')}`,
        request.url
      )
    );
  }
}
