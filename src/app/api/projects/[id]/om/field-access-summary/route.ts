import { NextRequest, NextResponse } from 'next/server';
import { generateSummaryReport } from '@/lib/om-field-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || undefined;

    const summary = await generateSummaryReport(projectId, date);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error generating summary report:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary report' },
      { status: 500 }
    );
  }
}

