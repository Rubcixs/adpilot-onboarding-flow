import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to safely extract JSON
function cleanJson(text: string): string {
  try {
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace >= 0) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned.trim();
  } catch (e) {
    return text;
  }
}

// AI System Prompt for Zero-Data Forecast
const ADPILOT_BRAIN_NO_DATA = `You are an API endpoint. 
ROLE: Ad Strategist and Forecaster.
INPUT: Business details, budget, AOV, and marketing goal.
OUTPUT: Valid JSON only. Do not wrap the JSON in markdown fences.

RESPONSE STRUCTURE:
{
  "quickVerdict": "A single, short, and compelling summary of the strategy.",
  "benchmarks": {
    "cpm": 10.5,
    "cpc": 1.2,
    "ctr": 1.5,
    "cpa": 30.0,
    "roas": 2.5
  },
  "forecast": {
    "totalBudget": 3000,
    "impressionsRange": "250,000 - 300,000",
    "clicksRange": "3,000 - 3,600",
    "conversionsRange": "100 - 120"
  },
  "structure": [
    { 
      "name": "Campaign - Prospecting (TOF)", 
      "goal": "Conversions", 
      "budgetAllocation": "50%",
      "reason": "Focus on high-quality cold traffic acquisition."
    },
    { 
      "name": "Campaign - Retargeting (BOF)", 
      "goal": "Conversions", 
      "budgetAllocation": "30%",
      "reason": "High-efficiency budget for converting existing visitors."
    }
  ],
  "roadmap": [
    { "week": "Week 1", "title": "Setup & Creative Testing", "description": "Launch 3 ad sets (2 prospecting, 1 retargeting). Test 5 video/image ad variants." },
    { "week": "Week 2", "title": "Optimization & Scaling", "description": "Pause worst-performing creatives. Reallocate 20% of budget to best-performing ad set." }
  ]
}

RULES:
1. RAW JSON ONLY. No markdown.
2. Ensure all fields in the RESPONSE STRUCTURE are present and correctly formatted.
3. Base all numbers (benchmarks, forecast) on the provided INPUT data and industry standards.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { goal, budget, aov, industry, description } = await req.json();

    if (!budget || !goal || !aov || !industry) {
      throw new Error('Missing required inputs: budget, goal, AOV, or industry.');
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured.");
    
    const userPayload = {
      goal,
      budget,
      aov,
      industry,
      description: description || "No detailed description provided.",
    };

    console.log(`Generating zero-data forecast for: ${JSON.stringify(userPayload)}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        temperature: 0.3,
        system: ADPILOT_BRAIN_NO_DATA,
        messages: [{ 
          role: 'user', 
          content: `User Inputs: ${JSON.stringify(userPayload)}` 
        }]
      }),
    });

    const aiData = await response.json();
    let forecastInsights = null;

    if (aiData.content && aiData.content[0]?.text) {
      forecastInsights = JSON.parse(cleanJson(aiData.content[0].text));
    } else {
      throw new Error("AI did not return a valid forecast structure.");
    }
    
    const finalResponse = {
      ok: true,
      inputs: userPayload,
      aiForecast: forecastInsights
    };

    return new Response(JSON.stringify(finalResponse), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Fatal Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
