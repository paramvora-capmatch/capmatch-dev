import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(
      `${backendUrl}/api/v1/projects/${projectId}/om/generate-insights`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to generate insights');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating OM insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

