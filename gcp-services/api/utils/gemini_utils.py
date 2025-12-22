"""Gemini AI utilities for meeting transcript summarization."""

import json
import logging
from typing import Dict, Optional

from config import settings

logger = logging.getLogger(__name__)


async def generate_meeting_summary(transcript_text: str) -> Optional[Dict]:
    """
    Generate AI-powered summary from meeting transcript text.

    Uses Gemini 2.5 Flash for fast, cost-effective summarization.

    Args:
        transcript_text: Plain text transcript (WebVTT already parsed)

    Returns:
        Structured summary dict or None if generation fails
    """
    try:
        gemini_api_key = settings.GEMINI_API_KEY
        if not gemini_api_key:
            logger.error("GEMINI_API_KEY not configured")
            return None

        prompt = """Please create a detailed summary of this meeting transcript for a commercial real estate (CRE) financing platform. The transcript may contain discussions about:
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
{transcript_text}
</transcript>

Please structure your response as a JSON object with the following format:
{{
    "title": "...",
    "description": "...",
    "executive_summary": "...",
    "key_points": ["point 1", "point 2", "..."],
    "important_numbers": ["metric 1", "metric 2", "..."],
    "action_items": ["action 1", "action 2", "..."],
    "speaker_insights": ["insight 1", "insight 2", "..."],
    "questions_raised": ["question 1", "question 2", "..."],
    "open_questions": ["open question 1", "open question 2", "..."]
}}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, just pure JSON.""".format(
            transcript_text=transcript_text
        )

        import httpx

        # Call Gemini API using REST endpoint
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.4,
                        "topK": 32,
                        "topP": 1,
                        "maxOutputTokens": 2048,
                    },
                },
                timeout=60.0,  # 60 second timeout for AI generation
            )

            if not response.is_success:
                logger.error(
                    "Gemini API error",
                    extra={"status": response.status_code, "error": response.text},
                )
                return None

            data = response.json()
            text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text")
            )

            if not text:
                logger.error("No text in Gemini response")
                return None

            # Clean up the response - remove markdown code blocks if present
            json_text = text.strip()
            if json_text.startswith("```json"):
                json_text = json_text.replace("```json\n", "").replace("\n```", "")
            elif json_text.startswith("```"):
                json_text = json_text.replace("```\n", "").replace("\n```", "")

            summary = json.loads(json_text)
            return summary

    except json.JSONDecodeError as e:
        logger.error("Error parsing Gemini JSON response", extra={"error": str(e)})
        return None
    except Exception as e:
        logger.error("Error generating meeting summary", extra={"error": str(e)})
        return None


def parse_webvtt_to_text(vtt_content: str) -> str:
    """
    Parse WebVTT transcript to extract plain text.

    Args:
        vtt_content: Raw WebVTT content

    Returns:
        Plain text transcript
    """
    lines = vtt_content.split("\n")
    text_lines = []

    for line in lines:
        line = line.strip()

        # Skip WEBVTT header, timestamps, and empty lines
        if (
            line == ""
            or line.startswith("WEBVTT")
            or line.startswith("NOTE")
            or line.startswith("transcript:")
            or _is_timestamp_line(line)
        ):
            continue

        # Extract text from speaker tags: <v>speaker:</v>text
        import re

        speaker_match = re.match(r"<v>([^<]+):</v>(.*)", line)
        if speaker_match:
            speaker = speaker_match.group(1).strip()
            text = speaker_match.group(2).strip()
            text_lines.append(f"{speaker}: {text}")
        else:
            # Plain text line
            text_lines.append(line)

    return "\n".join(text_lines)


def _is_timestamp_line(line: str) -> bool:
    """Check if line is a timestamp line (e.g., 00:00:00.000 --> 00:00:01.000)."""
    import re

    # Match timestamp pattern: HH:MM:SS.mmm --> HH:MM:SS.mmm
    return bool(re.match(r"^\d{2}:\d{2}:\d{2}\.\d{3}", line))

