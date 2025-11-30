import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 1. Helper to safely extract JSON
function cleanJson(text: string): string {
  try {
    // Remove markdown code blocks
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
    // Find first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace >= 0) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned.trim();
  } catch (e) {
    return text; // Return original if fail
  }
}

// 2. Math Helpers
const toNumber = (val: any) => {
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]/g, ''); 
  return parseFloat(str) || 0;
};
const round = (num: number, decimals = 2) => Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);

// 3. STRICT AI PROMPT
const ADPILOT_BRAIN_WITH_DATA = `You are an API endpoint. 
ROLE: Data Analyst.
INPUT: Ad metrics.
OUTPUT: Valid JSON only.

RESPONSE STRUCTURE:
{
  "insights": {
    "healthScore": 0, // 0-100
    "quickVerdict": "Summary string.",
    "quickVerdictTone": "positive" | "negative" | "mixed",
    "bestPerformers": [ { "id": "NAME", "reason": "ROAS 4.x" } ],
    "needsAttention": [ { "id": "NAME", "reason": "CPA $50" } ],
    "deepAnalysis": {
      "funnelHealth": { "status": "Healthy"|"Broken", "title": "Funnel", "description": "Analysis...", "metricToWatch": "CVR" },
      "opportunities": [ { "title": "Scale", "description": "...", "impact": "High" } ],
      "moneyWasters": [ { "title": "Pause", "description": "...", "impact": "High" } ],
      "creativeFatigue": []
    },
    "segmentAnalysis": null 
  }
}

RULES:
1. NO FAKE DATA. Use input names only.
2. RAW JSON ONLY. No markdown.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Parse FormData from frontend
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      throw new Error('No file uploaded')
    }

    // Read and parse CSV
    const text = await file.text()
    const lines = text.trim().split('\n')
    const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const csvData = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      csvHeaders.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      csvData.push(row)
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    console.log(`Analyzing ${file.name} (${csvData.length} rows)`);

    // --- A. Detect Columns ---
    const headers = Object.keys(csvData[0]).map(h => h.trim());
    const spendCol = headers.find(h => /Amount spent|Cost|Spend/i.test(h));
    const purchCol = headers.find(h => /Purchases|Results/i.test(h));
    const revCol = headers.find(h => /ROAS|Conversion value|Revenue/i.test(h));
    const nameCol = headers.find(h => /Ad name|Ad set name|Campaign name/i.test(h));
    
    // --- B. Aggregate Data ---
    let totalSpend = 0, totalRev = 0, totalPurch = 0;
    const rowMap = new Map();

    for (const row of csvData) {
      const spend = spendCol ? toNumber(row[spendCol]) : 0;
      const rev = revCol ? toNumber(row[revCol]) : 0;
      const purch = purchCol ? toNumber(row[purchCol]) : 0;
      
      totalSpend += spend;
      totalRev += rev;
      totalPurch += purch;

      if (nameCol) {
        const name = String(row[nameCol] || "Unknown").trim();
        if (name) {
           const e = rowMap.get(name) || { spend: 0, results: 0, revenue: 0 };
           e.spend += spend; e.results += purch; e.revenue += rev;
           rowMap.set(name, e);
        }
      }
    }

    const rows = Array.from(rowMap.entries()).map(([name, d]) => ({
        name,
        spend: round(d.spend),
        roas: d.spend > 0 ? round(d.revenue / d.spend) : 0,
        cpa: d.results > 0 ? round(d.spend / d.results) : 0
    }));

    // --- C. Construct AI Payload ---
    const analysisSummary = {
      metrics: {
        spend: round(totalSpend),
        roas: totalSpend > 0 ? round(totalRev / totalSpend) : 0,
        cpa: totalPurch > 0 ? round(totalSpend / totalPurch) : 0
      },
      topPerformers: rows.filter(r => r.spend > 0).sort((a,b) => b.roas - a.roas).slice(0, 3),
      worstPerformers: rows.filter(r => r.spend > 0).sort((a,b) => b.cpa - a.cpa).slice(0, 3),
      segments: null // Disable segments for stability
    };

    // --- D. Call AI (with Math Fallback) ---
    let aiInsights = null;
    
    try {
      if (!openAiKey) throw new Error("No API Key");

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': openAiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1500,
          temperature: 0,
          system: ADPILOT_BRAIN_WITH_DATA,
          messages: [{ role: 'user', content: JSON.stringify(analysisSummary) }]
        }),
      });

      const aiData = await response.json();
      if (aiData.content && aiData.content[0]?.text) {
         aiInsights = JSON.parse(cleanJson(aiData.content[0].text));
      }
    } catch (e) {
      console.error("AI Error:", e);
      // SILENT FAIL - Do not show "Failed". Generate Math Insights instead.
    }

    // --- E. "Smart Fallback" (If AI failed, generate basic insights) ---
    if (!aiInsights || !aiInsights.insights) {
       console.log("Using Smart Fallback");
       const roas = analysisSummary.metrics.roas;
       const isGood = roas > 2;
       
       aiInsights = {
         insights: {
           healthScore: isGood ? 80 : 40,
           quickVerdict: isGood ? `Healthy account with strong ROAS (${roas}x).` : `Performance is struggling (ROAS ${roas}x). Needs optimization.`,
           quickVerdictTone: isGood ? "positive" : "negative",
           bestPerformers: analysisSummary.topPerformers.map(p => ({ id: p.name, reason: `ROAS ${p.roas}x` })),
           needsAttention: analysisSummary.worstPerformers.map(p => ({ id: p.name, reason: `CPA $${p.cpa}` })),
           deepAnalysis: {
             funnelHealth: { 
                status: isGood ? "Healthy" : "Leaky", 
                title: "Funnel Status", 
                description: isGood ? "Conversion efficiency is stable." : "High costs indicate funnel leakage.", 
                metricToWatch: "ROAS" 
             },
             opportunities: [],
             moneyWasters: [],
             creativeFatigue: []
           },
           segmentAnalysis: null
         }
       };
    }

    // --- F. Final Response ---
    const finalResponse = {
       ok: true,
       rowCount: csvData.length,
       columnNames: Object.keys(csvData[0] || {}),
       ...analysisSummary.metrics,
       aiInsights: aiInsights
    };

    return new Response(JSON.stringify(finalResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Fatal Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
