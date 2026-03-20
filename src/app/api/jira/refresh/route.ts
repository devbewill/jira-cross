import { NextResponse } from 'next/server';
import { epicsCache } from '@/lib/cache/memory-cache';

export async function POST(): Promise<NextResponse> {
  try {
    epicsCache.clear();
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
