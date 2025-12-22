#!/bin/bash
# Deploy script for daily-webhook edge function

set -e

echo "🚀 Deploying daily-webhook edge function..."

# Check if required secrets are set
echo "📋 Checking required secrets..."

# Deploy the function
echo "📦 Deploying function..."
npx supabase functions deploy daily-webhook --no-verify-jwt

# Get the function URL
PROJECT_REF=$(supabase status | grep 'API URL' | awk '{print $3}' | sed 's|https://||' | sed 's|.supabase.co||')
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/daily-webhook"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Function URL:"
echo "   ${FUNCTION_URL}"
echo ""
echo "⚙️  Next Steps:"
echo "   1. Set Daily.co API key (if not already set):"
echo "      supabase secrets set DAILY_API_KEY=your_api_key_here"
echo ""
echo "   2. Set Gemini API key (if not already set):"
echo "      supabase secrets set GEMINI_API_KEY=your_api_key_here"
echo ""
echo "   3. Configure Daily.co webhook at https://dashboard.daily.co:"
echo "      - URL: ${FUNCTION_URL}"
echo "      - Events: meeting.started, meeting.ended, transcript.ready-to-download, recording.ready, recording.upload-complete"
echo ""
echo "   4. View logs:"
echo "      supabase functions logs daily-webhook --tail"
echo ""
