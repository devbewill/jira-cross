import { NextResponse } from 'next/server';
import { epicsCache, releasesCache } from '@/lib/cache/memory-cache';

export async function POST(): Promise<NextResponse> {
  try {
    epicsCache.clear();
    releasesCache.clear();
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
