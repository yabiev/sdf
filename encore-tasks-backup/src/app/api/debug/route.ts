import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    console.log('DEBUG:', message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}