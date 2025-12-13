import { NextRequest, NextResponse } from 'next/server';
import { logFieldAccess, FieldAccessLog } from '@/lib/om-field-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    
    // Validate request body
    if (!Array.isArray(body.fields)) {
      return NextResponse.json(
        { error: 'Invalid request: fields must be an array' },
        { status: 400 }
      );
    }

    // Add projectId to each log entry
    const fieldLogs: FieldAccessLog[] = body.fields.map((field: Omit<FieldAccessLog, 'projectId'>) => ({
      ...field,
      projectId,
    }));

    // Log to file
    await logFieldAccess(fieldLogs);

    return NextResponse.json({ 
      success: true, 
      logged: fieldLogs.length 
    });
  } catch (error) {
    console.error('Error logging field access:', error);
    return NextResponse.json(
      { error: 'Failed to log field access' },
      { status: 500 }
    );
  }
}

