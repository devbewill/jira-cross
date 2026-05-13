import { NextResponse } from 'next/server';
import {
  epicsCache,
  releasesCache,
  releaseIssuesCache,
  storiesCache,
  versionIssuesCache,
  pspCache,
  sprintCache,
  timesheetCache,
  groupCache,
} from '@/lib/cache/memory-cache';

export async function POST(): Promise<NextResponse> {
  try {
    epicsCache.clear();
    releasesCache.clear();
    releaseIssuesCache.clear();
    storiesCache.clear();
    versionIssuesCache.clear();
    pspCache.clear();
    sprintCache.clear();
    timesheetCache.clear();
    groupCache.clear();
    return NextResponse.json(
      { success: true, message: 'Cache cleared' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
