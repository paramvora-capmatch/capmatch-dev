// Shared utility: AI-powered meeting transcript summarization using backend LiteLLM proxy
// Generates structured summaries with CRE-specific context
// Falls back to direct Gemini API if backend URL is not configured

import type { MeetingSummary } from './daily-types.ts'

/**
 * Generate AI-powered summary from meeting transcript text
 * Uses backend LiteLLM proxy (Gemini 2.5 Flash) if available, otherwise falls back to direct Gemini API
 *
 * @param transcriptText - Plain text transcript (WebVTT already parsed)
 * @returns Structured summary or null if generation fails
 */
export async function generateMeetingSummary(
  transcriptText: string
): Promise<MeetingSummary | null> {
  try {
    // Try backend endpoint first if configured
    const backendUrl = Deno.env.get('BACKEND_URL')
    if (backendUrl) {
      try {
        const response = await fetch(`${backendUrl}/api/v1/ai/meeting-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcriptText,
          }),
        })

        if (response.ok) {
          const summary: MeetingSummary = await response.json()
          return summary
        } else {
          console.warn(
            `Backend meeting summary failed (${response.status}), falling back to direct Gemini API`
          )
        }
      } catch (error) {
        console.warn('Backend meeting summary error, falling back to direct Gemini API:', error)
      }
    }

    // Fallback to direct Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error('Neither BACKEND_URL nor GEMINI_API_KEY configured')
      return null
    }

    const prompt = `Please create a detailed summary of this meeting transcript for a commercial real estate (CRE) financing platform. The transcript may contain discussions about:
- Deal structures, loan terms, capital stack
- Property details, market analysis, financial projections
- Action items and next steps for borrowers and lenders

Please:

Title: Generate a concise, descriptive title for this meeting (3-8 words)

Description: Provide a brief description of the meeting's purpose and agenda. (1 sentence)

Executive Summary: Provide a 2-3 sentence overview of the main discussion

Key Points Discussed: Extract and organize the main topics covered

Important Numbers/Metrics: Highlight any significant figures, dates, or statistics mentioned

Action Items: If any next steps or follow-ups are mentioned, list them

Speaker Insights: Summarize the key insights or lessons shared by the speakers

Questions Raised: List any questions that were asked during the meeting by any participants.

Open Questions: If there are any unresolved questions or topics that need further discussion, list them.

Please translate any Hindi/Hinglish portions to English and provide the summary in clear, professional English.

<transcript>
${transcriptText}
</transcript>

Please structure your response as a JSON object with the following format:
{
    "title": "...",
    "description": "...",
    "executive_summary": "...",
    "key_points": ["point 1", "point 2", "..."],
    "important_numbers": ["metric 1", "metric 2", "..."],
    "action_items": ["action 1", "action 2", "..."],
    "speaker_insights": ["insight 1", "insight 2", "..."],
    "questions_raised": ["question 1", "question 2", "..."],
    "open_questions": ["open question 1", "open question 2", "..."],
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, just pure JSON.`

    // Call Gemini API using REST endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error('No text in Gemini response')
      return null
    }

    // Clean up the response - remove markdown code blocks if present
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    const summary: MeetingSummary = JSON.parse(jsonText)
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
