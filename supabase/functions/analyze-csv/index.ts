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

    // --- A. Detect Columns (Final, Explicit Mapping + Robust Fallback) ---
    // Function to normalize headers for robust matching: lowercase, remove non-alphanumeric
    const headers = Object.keys(csvData[0]).map(h => h.trim());
    const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Map normalized headers to their original names
    const normalizedHeaders = Object.keys(csvData[0]).map(h => ({
      original: h,
      normalized: normalizeHeader(h),
    }));

    const findCol = (regex: RegExp) => normalizedHeaders.find(h => regex.test(h.normalized))?.original;

    // Use highly specific detection for core metrics
    let spendCol = findCol(/spend|cost|amount|izterets|terini/);
    let revCol = findCol(/conversionvalue|purchasevalue|ienakumi|pelnja|vertiba/);
    let purchCol = findCol(/purchases|results|conversions|pirkumi|rezultati/);
    let impsCol = findCol(/impressions|paradiessanas|skatijumi/);
    let clicksCol = findCol(/clicks|klikski/);
    let nameCol = findCol(/adname|adsetname|campaignname|nosaukums|kampanja/);

    // CRITICAL: Fallback for known headers from user's Meta export
    // If the aggressive regex failed, assume the most common known header names (including the currency format)
    if (!spendCol) spendCol = headers.find(h => h.includes('Amount spent (EUR)'));
    if (!revCol) revCol = headers.find(h => h.includes('Purchases conversion value'));
    if (!purchCol) purchCol = headers.find(h => h.includes('Purchases'));
    if (!nameCol) nameCol = headers.find(h => h.includes('Ad name'));
    if (!clicksCol) clicksCol = headers.find(h => h.includes('Clicks (all)'));
    if (!impsCol) impsCol = headers.find(h => h.includes('Impressions'));


    if (!spendCol || !revCol || !purchCol) {
        console.error("CRITICAL: Main metrics still not found. Using 0 values.");
        console.error("DEBUG: Available Headers:", Object.keys(csvData[0]));
    } else {
        console.log(`SUCCESS: Found Spend=${spendCol}, Revenue=${revCol}, Purchases=${purchCol}`);
    }

    // --- B. Aggregate Data ---
    let totalSpend = 0, totalRev = 0, totalPurch = 0, totalImps = 0, totalClicks = 0;
    const rowMap = new Map();

    for (const row of csvData) {
      // Use the found column names to extract values and run cleanup
      const spend = spendCol ? toNumber(row[spendCol]) : 0;
      const rev = revCol ? toNumber(row[revCol]) : 0;
      const purch = purchCol ? toNumber(row[purchCol]) : 0;
      const imps = impsCol ? toNumber(row[impsCol]) : 0;
      const clicks = clicksCol ? toNumber(row[clicksCol]) : 0;
      
      totalSpend += spend;
      totalRev += rev;
      totalPurch += purch;
      totalImps += imps;
      totalClicks += clicks;

      if (nameCol) {
        const name = String(row[nameCol] || "Unknown").trim();
        if (name) {
            const e = rowMap.get(name) || { spend: 0, results: 0, revenue: 0 };
            e.spend += spend; e.results += purch; e.revenue += rev;
            rowMap.set(name, e);
        }
      }
    }
    
    // Rows calculation (Top/Worst logic remains the same)
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
      segments: null
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
