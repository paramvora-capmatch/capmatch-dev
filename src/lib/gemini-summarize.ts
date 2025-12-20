// src/lib/gemini-summarize.ts
// AI-powered meeting transcript summarization using backend LiteLLM proxy
// Generates structured summaries with CRE-specific context

import { getBackendUrl } from './apiConfig'

/**
 * Structured summary data extracted from meeting transcripts
 * Stored in meetings table summary field as JSONB
 */
export interface MeetingSummary {
  title: string
  description?: string
  executive_summary: string
  key_points: string[]
  important_numbers: string[]
  action_items: string[]
  speaker_insights?: string[]
  questions_raised: string[]
  open_questions: string[]
}

/**
 * Generate AI-powered summary from meeting transcript text
 * Uses backend LiteLLM proxy (Gemini 2.5 Flash) for fast, cost-effective summarization
 *
 * @param transcriptText - Plain text transcript (WebVTT already parsed)
 * @returns Structured summary or null if generation fails
 */
export async function generateMeetingSummary(
  transcriptText: string
): Promise<MeetingSummary | null> {
  try {
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/v1/ai/meeting-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcriptText,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend meeting summary error:', response.status, errorText)
      return null
    }

    const summary: MeetingSummary = await response.json()
    return summary
  } catch (error) {
    console.error('Error generating meeting summary:', error)
    return null
  }
}

/**
 * Parse WebVTT transcript to extract plain text
 */
export function parseWebVTTToText(vttContent: string): string {
  const lines = vttContent.split('\n')
  const textLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip WEBVTT header, timestamps, and empty lines
    if (
      line === '' ||
      line.startsWith('WEBVTT') ||
      line.startsWith('NOTE') ||
      line.startsWith('transcript:') ||
      line.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/)
    ) {
      continue
    }

    // Extract text from speaker tags: <v>speaker:</v>text
    const speakerMatch = line.match(/<v>([^<]+):<\/v>(.*)/)
    if (speakerMatch) {
      const speaker = speakerMatch[1].trim()
      const text = speakerMatch[2].trim()
      textLines.push(`${speaker}: ${text}`)
    } else {
      // Plain text line
      textLines.push(line)
    }
  }

  return textLines.join('\n')
}
