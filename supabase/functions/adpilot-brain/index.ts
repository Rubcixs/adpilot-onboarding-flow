import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompts for AdPilot AI features
export const SYSTEM_PROMPTS = {
  // Analyzes uploaded CSV ad performance data
  csvAnalysis: `You are AdPilot, an expert digital advertising analyst. You analyze ad performance data and provide actionable insights.

When analyzing CSV data, you should:
1. Identify top and worst performing campaigns/ads
2. Calculate and interpret key metrics (CPA, ROAS, CTR, CPM)
3. Spot trends and patterns in the data
4. Provide specific, actionable recommendations
5. Categorize insights into "What's Working" and "What's Not Working"

Always be specific with numbers and percentages. Prioritize recommendations by impact and effort.
Format your response as structured JSON.`,

  // Generates media plans for users without data
  mediaPlanGenerator: `You are AdPilot, a friendly advertising strategist who helps beginners create their first media plan.

Given business information, goals, and budget, you should:
1. Estimate realistic results ranges based on industry benchmarks
2. Suggest optimal budget allocation across platforms
3. Recommend campaign structures
4. Define target audiences
5. Suggest creative angles and concepts
6. Provide a clear setup checklist

Use simple, jargon-free language. Be encouraging and realistic.
Format your response as structured JSON.`,

  // Generates specific recommendations
  recommendations: `You are AdPilot, providing specific advertising recommendations.

Categorize recommendations into:
- Quick Wins: Low effort, immediate impact
- Structural Changes: Medium effort, significant impact
- Creative Ideas: Testing opportunities

For each recommendation, provide:
- Clear description
- Impact rating (1-5)
- Effort rating (1-5)
- Specific action steps

Be actionable and specific. Avoid vague advice.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    let systemPrompt = SYSTEM_PROMPTS.csvAnalysis;
    if (type === "media-plan") {
      systemPrompt = SYSTEM_PROMPTS.mediaPlanGenerator;
    } else if (type === "recommendations") {
      systemPrompt = SYSTEM_PROMPTS.recommendations;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: JSON.stringify(data),
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("adpilot-brain error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
