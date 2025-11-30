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

// 3. AI METRICS BRAIN PROMPT (for metrics detection)
const METRICS_BRAIN_PROMPT = `You are the AdPilot metrics brain.
Your ONLY job is to look at a CSV export from ad platforms and return a single JSON object called metrics that summarizes global performance + campaign goal.

You never print explanations, comments or text – only the JSON.

1. Column detection (normalize names)
Normalize column names to lower-case and trim spaces.
Detect columns using flexible, contains-based matching (case insensitive):

Spend: "spend", "amount_spent", "cost" (but not "cost_per")
Impressions: "impression"
Clicks: "click" (not "link_click", not "cost_per")
Purchases: "purchase", "orders", "checkout", "sales"
Leads: "lead", "lead_form", "signup"
Revenue: "purchase_conversion_value", "value", "revenue", "total_conversion_value"
Objective: "objective"

2. Aggregate totals
Sum across all rows (excluding platform summary rows).

3. Detect campaign goal
Priority: objective column → data-based inference (purchases > leads > traffic > awareness)

4. Choose primary KPI & results
- purchases + revenue → ROAS
- purchases (no revenue) → CPP
- leads → CPL
- traffic → CPC
- awareness → CPM

5. Output format (RAW JSON ONLY, NO MARKDOWN):
{
  "totalSpend": number | 0,
  "totalImpressions": number | 0,
  "totalClicks": number | 0,
  "totalPurchases": number | 0,
  "totalLeads": number | 0,
  "totalRevenue": number | 0,
  "ctr": number | null,
  "cpc": number | null,
  "cpp": number | null,
  "cpl": number | null,
  "cpm": number | null,
  "roas": number | null,
  "goal": "purchases" | "leads" | "traffic" | "awareness" | "unknown",
  "primaryKpiKey": string,
  "primaryKpiLabel": string,
  "primaryKpiValue": number | null,
  "resultsLabel": string,
  "resultsValue": number | 0
}

Never return Infinity or NaN. When denominator is 0, set metric to null.
NO EXTRA TEXT. ONLY JSON.`;

// 4. AI INSIGHTS SYSTEM PROMPT - STRICT FOCUSED ANALYSIS
const ADPILOT_INSIGHTS_SYSTEM = `You are AdPilot — an advanced Meta Ads performance analyst.

Your job: analyze the provided metrics + CSV rows and return insights ONLY in the exact JSON structure required by the UI.

⚠️ VERY IMPORTANT RULES
- Return ONLY JSON.
- NO markdown, no commentary, no text before/after JSON.
- If data is limited, still produce insights based on what CAN be concluded (but do NOT hallucinate fake numbers).
- Each section MUST contain at least one meaningful insight unless absolutely impossible.
- Keys must match EXACTLY this structure:

{
  "funnelHealth": {
    "status": "",
    "title": "Conversion Funnel",
    "description": "",
    "metricToWatch": ""
  },
  "profitOpportunities": [
    {
      "title": "",
      "description": "",
      "impact": ""
    }
  ],
  "budgetLeaks": [
    {
      "title": "",
      "description": "",
      "impact": ""
    }
  ]
}

--------------------------------------
ANALYSIS LOGIC (MANDATORY)
--------------------------------------

### FUNNEL HEALTH
Status must be one of:
- "Healthy"
- "Warning"
- "Broken"

Rules:
- If CPL is low AND CTR + CPM stable → Healthy
- If CPL average OR CTR inconsistent → Warning
- If CPL very high OR leads very low → Broken

description = clear summary (2-3 sentences)
metricToWatch = the weakest metric (CPL, CTR, CPM, Lead volume, etc.)

--------------------------------------
PROFIT OPPORTUNITIES (ALWAYS RETURN ≥1)
--------------------------------------

Find patterns such as:
- Low CPL ads
- High CTR assets
- Cheap CPM placements
- Strong-performing age/gender breakdowns
- Creative themes that outperform average

Format:
{
  "title": "High-performing creative format",
  "description": "Video creatives achieved 32% lower CPL than account average (CPL €X vs €Y).",
  "impact": "High"
}

Impact must be: "High", "Medium", or "Low"

If data is limited → Base opportunities on relative comparisons within the dataset.
MANDATORY: Return at least 1-3 opportunities.

--------------------------------------
BUDGET LEAKS (ALWAYS RETURN ≥1)
--------------------------------------

Identify inefficiencies:
- High CPL ads
- High spend but low results
- Weak CTR creatives
- Expensive placements
- Ads with impressions but no conversions

Example:
{
  "title": "High CPL on specific creative",
  "description": "Creative 'Video #3' generated CPL of €15.61 — 3× higher than account average.",
  "impact": "High"
}

Impact must be: "High", "Medium", or "Low"

If data limited → pick the highest-cost or lowest-performing patterns.
MANDATORY: Return at least 1-3 budget leaks.

--------------------------------------
FINAL OUTPUT
--------------------------------------

After analyzing the data:
→ Return ONLY a valid JSON object.
→ DO NOT write any explanation outside that JSON.
→ No markdown.
→ No code fences.`;

// 5. STRICT AI INSIGHTS PROMPT

// 5. AI-Powered Metrics Detection Function
async function detectMetricsWithAI(csvData: any[], columnNames: string[]): Promise<any> {
  const claudeKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!claudeKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Prepare CSV summary for Claude (limit to first 50 rows + column info)
  const sampleData = csvData.slice(0, 50);
  const dataPayload = {
    columns: columnNames,
    rows: sampleData
  };

  console.log(`Calling AI Metrics Brain with ${csvData.length} rows (sending first 50)`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': claudeKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      temperature: 0,
      system: METRICS_BRAIN_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(dataPayload)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', response.status, errorText);
    throw new Error(`Claude API failed: ${response.status}`);
  }

  const result = await response.json();
  const rawText = result.content?.[0]?.text || '{}';
  
  console.log('AI Metrics Brain raw response:', rawText.substring(0, 200));
  
  // Clean and parse JSON
  const cleanedJson = cleanJson(rawText);
  const metrics = JSON.parse(cleanedJson);
  
  console.log('✅ AI Metrics Detection Complete:', metrics.primaryKpiLabel, '=', metrics.primaryKpiValue);
  
  return metrics;
}

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
    
    const rawData = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      csvHeaders.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      rawData.push(row);
    }

    // --- Meta-Specific Cleaning: Remove TOTAL/SUMMARY rows ---
    const csvHeaders2 = Object.keys(rawData[0] || {});
    
    // Detect key columns for Meta summary detection
    const adSetNameCol = csvHeaders2.find(h => h.toLowerCase().includes('ad set name') || h === 'Ad set name');
    const campaignNameCol = csvHeaders2.find(h => h.toLowerCase().includes('campaign name') || h === 'Campaign name');
    const platformCol = csvHeaders2.find(h => h.toLowerCase().includes('platform'));
    const campaignIdCol = csvHeaders2.find(h => h.toLowerCase().includes('campaign id'));
    const adSetIdCol = csvHeaders2.find(h => h.toLowerCase().includes('ad set id'));
    const endsCol = csvHeaders2.find(h => h.toLowerCase().includes('reporting ends') || h.toLowerCase().includes('ends'));
    
    const csvData = rawData.filter((row, index) => {
      // Rule 1: Ad set name is empty/blank/NaN
      if (adSetNameCol) {
        const adSetName = String(row[adSetNameCol] || '').trim().toLowerCase();
        if (!adSetName || adSetName === 'nan' || adSetName === '') {
          console.log(`Excluding row ${index}: Empty Ad set name`);
          return false;
        }
      }
      
      // Rule 2: Platform is empty or NaN
      if (platformCol) {
        const platform = String(row[platformCol] || '').trim().toLowerCase();
        if (!platform || platform === 'nan' || platform === '') {
          console.log(`Excluding row ${index}: Empty Platform`);
          return false;
        }
      }
      
      // Rule 3: Campaign name is empty/blank/NaN
      if (campaignNameCol) {
        const campaignName = String(row[campaignNameCol] || '').trim().toLowerCase();
        if (!campaignName || campaignName === 'nan' || campaignName === '') {
          console.log(`Excluding row ${index}: Empty Campaign name`);
          return false;
        }
      }
      
      // Rule 4: Campaign ID = 0 AND Ad set ID = 0
      if (campaignIdCol && adSetIdCol) {
        const campaignId = toNumber(row[campaignIdCol]);
        const adSetId = toNumber(row[adSetIdCol]);
        if (campaignId === 0 && adSetId === 0) {
          console.log(`Excluding row ${index}: Both Campaign ID and Ad Set ID are 0`);
          return false;
        }
      }
      
      // Rule 5: Check if name columns contain "total" keywords
      const isTotalRow = Object.entries(row).some(([key, value]) => {
        const keyLower = key.toLowerCase();
        const valStr = String(value || '').toLowerCase();
        if (keyLower.includes('name') || keyLower.includes('campaign') || keyLower.includes('ad set')) {
          return valStr.includes('total') || valStr.includes('summary') || valStr.includes('grand total') || valStr.includes('account total');
        }
        return false;
      });
      
      if (isTotalRow) {
        console.log(`Excluding row ${index}: Contains "total" keyword in name column`);
        return false;
      }
      
      return true; // Keep this row
    });
    
    console.log(`Filtered ${rawData.length - csvData.length} summary rows, kept ${csvData.length} atomic rows`);

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    console.log(`Analyzing ${file.name} (${csvData.length} rows)`);

    // --- B. STRICT DETERMINISTIC METRICS DETECTION ---
    // 
    // Step 1: Get headers and normalize all column names
    const headers = Object.keys(csvData[0] || {}).map(h => h.trim());
    
    const normalizeColName = (name: string): string => {
      return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    };
    
    const colMap = new Map<string, string>(); // normalized -> original
    headers.forEach((h: string) => {
      colMap.set(normalizeColName(h), h);
    });
    
    console.log(`Normalized ${headers.length} column names`);
    
    // Step 2: Detect metric columns using strict regex matching
    
    // SPEND: match "spend", "cost", "amount_spent"
    let spendCol: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/spend|cost|amountspent/.test(norm) && !/costper/.test(norm)) {
        spendCol = orig;
        break;
      }
    }
    
    // IMPRESSIONS: match "impressions"
    let impsCol: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/impressions/.test(norm)) {
        impsCol = orig;
        break;
      }
    }
    
    // CLICKS: fuzzy matching with exclusions and priority ranking
    // A column is a click column if:
    // - Contains "click"
    // - Does NOT contain: "rate", "ctr", "costper", "cpc", "perclick", "cpm"
    const clickCandidates: Array<{ col: string; total: number; priority: number }> = [];
    
    for (const [norm, orig] of colMap.entries()) {
      const hasClick = /click/.test(norm);
      const isExcluded = /rate|ctr|costper|cpc|perclick|cpm/.test(norm);
      
      if (hasClick && !isExcluded) {
        // Calculate total for this column
        let total = 0;
        for (const row of csvData) {
          total += toNumber(row[orig]);
        }
        
        // Determine priority: linkclick (1) > clicks (2) > other (3)
        let priority = 3;
        if (/linkclick/.test(norm)) {
          priority = 1;
        } else if (/^clicks$/.test(norm)) {
          priority = 2;
        }
        
        clickCandidates.push({ col: orig, total, priority });
      }
    }
    
    // Sort by priority (lower is better), then by total (higher is better)
    clickCandidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.total - a.total;
    });
    
    // Pick the best click column
    let clicksCol: string | null = null;
    if (clickCandidates.length > 0) {
      // Find first candidate with non-zero total
      const bestCandidate = clickCandidates.find(c => c.total > 0);
      if (bestCandidate) {
        clicksCol = bestCandidate.col;
        console.log(`Selected click column: ${clicksCol} (total: ${bestCandidate.total}, priority: ${bestCandidate.priority})`);
      } else {
        // All candidates have 0 total, pick first by priority
        clicksCol = clickCandidates[0].col;
        console.log(`Selected click column: ${clicksCol} (no non-zero totals, picked by priority)`);
      }
    }
    
    // PURCHASES: match "purchase", "purchases"
    let purchCol: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/purchase|purchases/.test(norm)) {
        purchCol = orig;
        break;
      }
    }
    
    // LEADS: match lead-type columns with strict exclusions
    // Pattern: /lead|leads|onfblead|websitelead|leadform|form|generatedleads|messagelead|result|results/
    // Exclude: columns containing "costper", "purchase", "order", "checkout", "cart", "value", "revenue"
    const leadCandidates: Array<{ col: string; total: number }> = [];
    for (const [norm, orig] of colMap.entries()) {
      const isLeadMatch = /lead|leads|onfblead|websitelead|leadform|form|generatedleads|messagelead|result|results/.test(norm);
      const isExcluded = /costper|purchase|order|checkout|cart|value|revenue/.test(norm);
      
      if (isLeadMatch && !isExcluded) {
        // Calculate total for this column
        let total = 0;
        for (const row of csvData) {
          total += toNumber(row[orig]);
        }
        leadCandidates.push({ col: orig, total });
      }
    }
    
    // Pick lead column with largest non-zero total
    let leadsCol: string | null = null;
    let maxLeadTotal = 0;
    for (const candidate of leadCandidates) {
      if (candidate.total > maxLeadTotal) {
        maxLeadTotal = candidate.total;
        leadsCol = candidate.col;
      }
    }
    
    // REVENUE: match "revenue", "value", "purchase_conversion_value", "total_conversion_value"
    let revCol: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/revenue|purchaseconversionvalue|totalconversionvalue/.test(norm) && /value/.test(norm)) {
        revCol = orig;
        break;
      }
    }
    if (!revCol) {
      for (const [norm, orig] of colMap.entries()) {
        if (/value/.test(norm) && !norm.includes('cost')) {
          revCol = orig;
          break;
        }
      }
    }
    
    // OBJECTIVE: detect objective column for goal inference
    let objectiveCol: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/objective/.test(norm)) {
        objectiveCol = orig;
        break;
      }
    }
    
    // NAME COLUMNS: for campaign/adset/ad names
    let nameCol: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/adname|adsetname|campaignname|name/.test(norm)) {
        nameCol = orig;
        break;
      }
    }
    
    // CAMPAIGN/ADSET NAME for goal inference
    let campaignNameForGoal: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/campaignname/.test(norm)) {
        campaignNameForGoal = orig;
        break;
      }
    }
    
    let adsetNameForGoal: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/adsetname/.test(norm)) {
        adsetNameForGoal = orig;
        break;
      }
    }
    
    // RESULTS column (legacy support)
    let resultsCol: string | null = null;
    for (const [norm, orig] of colMap.entries()) {
      if (/^results$/.test(norm)) {
        resultsCol = orig;
        break;
      }
    }
    
    console.log(`Column Detection: Spend=${spendCol}, Impressions=${impsCol}, Clicks=${clicksCol}, Purchases=${purchCol}, Leads=${leadsCol}, Revenue=${revCol}, Objective=${objectiveCol}`);

    // --- B. Aggregate Data with Total Row Detection ---
    // Step 1: Calculate tentative totals from all rows
    let tentativeSpend = 0, tentativeImps = 0, tentativeClicks = 0;
    
    for (const row of csvData) {
      tentativeSpend += spendCol ? toNumber(row[spendCol]) : 0;
      tentativeImps += impsCol ? toNumber(row[impsCol]) : 0;
      tentativeClicks += clicksCol ? toNumber(row[clicksCol]) : 0;
    }
    
    // Step 2: Check if any single row matches the tentative totals (global total row)
    let globalTotalRowIndex = -1;
    const tolerance = 0.02; // 2% tolerance for rounding
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowSpend = spendCol ? toNumber(row[spendCol]) : 0;
      const rowImps = impsCol ? toNumber(row[impsCol]) : 0;
      const rowClicks = clicksCol ? toNumber(row[clicksCol]) : 0;
      
      // Check if this row's values match tentative totals within tolerance
      const spendMatch = tentativeSpend > 0 && Math.abs(rowSpend - tentativeSpend) / tentativeSpend < tolerance;
      const impsMatch = tentativeImps > 0 && Math.abs(rowImps - tentativeImps) / tentativeImps < tolerance;
      const clicksMatch = tentativeClicks > 0 && Math.abs(rowClicks - tentativeClicks) / tentativeClicks < tolerance;
      
      if (spendMatch && impsMatch && clicksMatch) {
        globalTotalRowIndex = i;
        console.log(`Detected global TOTAL row at index ${i}, excluding from calculations`);
        break;
      }
    }
    
    // Step 3: Recalculate metrics excluding the global total row
    let totalSpend = 0, totalRev = 0, totalPurch = 0, totalLeads = 0, totalResults = 0, totalImps = 0;
    let totalClicks: number | null = null; // IMPORTANT: null if no click column exists
    const rowMap = new Map();

    for (let i = 0; i < csvData.length; i++) {
      if (i === globalTotalRowIndex) continue; // Skip the global total row
      
      const row = csvData[i];
      const spend = spendCol ? toNumber(row[spendCol]) : 0;
      const rev = revCol ? toNumber(row[revCol]) : 0;
      const purch = purchCol ? toNumber(row[purchCol]) : 0;
      const leads = leadsCol ? toNumber(row[leadsCol]) : 0;
      const results = resultsCol ? toNumber(row[resultsCol]) : 0;
      const imps = impsCol ? toNumber(row[impsCol]) : 0;
      
      // CRITICAL: Only aggregate clicks if click column exists
      if (clicksCol) {
        const clicks = toNumber(row[clicksCol]);
        totalClicks = (totalClicks || 0) + clicks;
      }
      
      totalSpend += spend;
      totalRev += rev;
      totalPurch += purch;
      totalLeads += leads;
      totalResults += results;
      totalImps += imps;

      if (nameCol) {
        const name = String(row[nameCol] || "Unknown").trim();
        if (name) {
            const e = rowMap.get(name) || { spend: 0, impressions: 0, clicks: 0, purchases: 0, leads: 0, revenue: 0 };
            e.spend += spend;
            e.impressions += imps;
            if (clicksCol) e.clicks += toNumber(row[clicksCol]);
            e.purchases += purch;
            e.leads += leads;
            e.revenue += rev;
            rowMap.set(name, e);
        }
      }
    }
    
    console.log(`Totals: Spend=${totalSpend}, Impressions=${totalImps}, Clicks=${totalClicks ?? 'null'}, Purchases=${totalPurch}, Leads=${totalLeads}, Revenue=${totalRev}`);
    
    // --- C. Calculate All Metrics ---
    // CRITICAL: CTR is null if either impressions or clicks are null/0
    const ctr = (totalImps > 0 && totalClicks !== null && totalClicks > 0) 
      ? round((totalClicks / totalImps) * 100, 2) 
      : null;
    
    const cpc = (totalClicks !== null && totalClicks > 0) 
      ? round(totalSpend / totalClicks, 2) 
      : null;
    
    const cpp = totalPurch > 0 ? round(totalSpend / totalPurch, 2) : null;
    const cpl = totalLeads > 0 ? round(totalSpend / totalLeads, 2) : null;
    const cpm = totalImps > 0 ? round((totalSpend / totalImps) * 1000, 2) : null;
    const roas = totalRev && totalSpend > 0 ? round(totalRev / totalSpend, 2) : null;
    
    console.log(`Metrics calculated: CTR=${ctr}, CPC=${cpc}, CPL=${cpl}, CPP=${cpp}, CPM=${cpm}, ROAS=${roas}`);

    // --- C. DETECT CAMPAIGN GOAL (STRICT DETERMINISTIC HIERARCHY) ---
    // 
    // GOAL OPTIONS: "purchases" | "leads" | "clicks" | "reach"
    //
    let goal = "";
    
    // STEP 1: Check objective column (HIGHEST PRIORITY)
    if (objectiveCol && csvData.length > 0) {
      const objective = String(csvData[0][objectiveCol] || '').toLowerCase();
      
      if (objective.includes('lead')) {
        goal = "leads";
      } else if (objective.includes('conversion') || objective.includes('purchase') || objective.includes('sales')) {
        goal = "purchases";
      } else if (objective.includes('traffic')) {
        goal = "clicks";
      } else if (objective.includes('reach') || objective.includes('awareness')) {
        goal = "reach";
      }
      
      console.log(`Goal from Objective column: ${goal} (Objective: ${objective})`);
    }
    
    // STEP 2: Infer from data (highest non-zero total in priority order)
    if (!goal) {
      // Priority: purchases > leads > clicks > impressions
      if (totalPurch > 0) {
        goal = "purchases";
        console.log(`Goal inferred from data: purchases (total: ${totalPurch})`);
      } else if (totalLeads > 0) {
        goal = "leads";
        console.log(`Goal inferred from data: leads (total: ${totalLeads})`);
      } else if (totalClicks !== null && totalClicks > 0) {
        goal = "clicks";
        console.log(`Goal inferred from data: clicks (total: ${totalClicks})`);
      } else if (totalImps > 0) {
        goal = "reach";
        console.log(`Goal inferred from data: reach (total impressions: ${totalImps})`);
      } else {
        goal = "reach"; // ultimate fallback
        console.log(`Goal fallback: reach`);
      }
    }
    
    console.log(`✅ Goal Detection Complete: ${goal}`);
    
    // --- D. SELECT PRIMARY KPI (STRICT DETERMINISTIC MAPPING) ---
    //
    // KPI MAPPING RULES:
    // - purchases + revenue > 0 → ROAS
    // - purchases (no revenue) → CPP
    // - leads → CPL
    // - clicks → CPC
    // - reach → CPM
    //
    let primaryKpiKey = "";
    let primaryKpiLabel = "";
    let primaryKpiValue: number | null = null;
    let resultsLabel = "";
    let resultsValue: number | null = null;
    
    if (goal === "purchases") {
      // Check if revenue exists
      if (totalRev > 0 && totalSpend > 0) {
        primaryKpiKey = "roas";
        primaryKpiLabel = "Return on Ad Spend";
        primaryKpiValue = roas;
      } else {
        primaryKpiKey = "cpp";
        primaryKpiLabel = "Cost per Purchase";
        primaryKpiValue = cpp;
      }
      resultsLabel = "Total Purchases";
      resultsValue = totalPurch;
      
    } else if (goal === "leads") {
      primaryKpiKey = "cpl";
      primaryKpiLabel = "Cost per Lead";
      primaryKpiValue = cpl;
      resultsLabel = "Total Leads";
      resultsValue = totalLeads;
      
    } else if (goal === "clicks") {
      primaryKpiKey = "cpc";
      primaryKpiLabel = "Cost per Click";
      primaryKpiValue = cpc;
      resultsLabel = "Total Clicks";
      resultsValue = totalClicks;
      
    } else { // reach
      primaryKpiKey = "cpm";
      primaryKpiLabel = "Cost per 1000 Impressions";
      primaryKpiValue = cpm;
      resultsLabel = "Total Impressions";
      resultsValue = totalImps;
    }
    
    // Validation: ensure no NaN or Infinity
    if (primaryKpiValue !== null && (isNaN(primaryKpiValue) || !isFinite(primaryKpiValue))) {
      console.warn(`⚠️ Primary KPI value was NaN or Infinity, setting to null`);
      primaryKpiValue = null;
    }
    
    console.log(`✅ Primary KPI: ${primaryKpiLabel} (${primaryKpiKey}) = ${primaryKpiValue}`);
    console.log(`✅ Results Metric: ${resultsLabel} = ${resultsValue}`);

    // --- E. OPTIONAL: AI-Powered Metrics Detection ---
    // Enable AI detection by setting USE_AI_METRICS=true environment variable
    const useAiMetrics = Deno.env.get('USE_AI_METRICS') === 'true';
    let metrics: any;
    
    if (useAiMetrics) {
      console.log('🤖 Using AI-Powered Metrics Detection');
      try {
        // Use AI to detect metrics
        metrics = await detectMetricsWithAI(csvData, headers);
        console.log('✅ AI Metrics Detection Success');
      } catch (aiError) {
        console.error('⚠️ AI Metrics Detection failed, falling back to manual:', aiError);
        // Fallback to manual detection
        metrics = {
          totalSpend: totalSpend > 0 ? round(totalSpend, 2) : null,
          totalImpressions: totalImps > 0 ? totalImps : null,
          totalClicks: (totalClicks !== null && totalClicks > 0) ? totalClicks : null,
          totalPurchases: totalPurch > 0 ? totalPurch : null,
          totalLeads: totalLeads > 0 ? totalLeads : null,
          totalRevenue: totalRev > 0 ? round(totalRev, 2) : null,
          ctr,
          cpc,
          cpp,
          cpl,
          cpm,
          roas,
          primaryKpiKey,
          primaryKpiLabel,
          primaryKpiValue,
          resultsLabel,
          resultsValue,
          goal
        };
      }
    } else {
      // Use manual detection (default)
      console.log('📊 Using Manual Metrics Detection');
      metrics = {
        totalSpend: totalSpend > 0 ? round(totalSpend, 2) : null,
        totalImpressions: totalImps > 0 ? totalImps : null,
        totalClicks: (totalClicks !== null && totalClicks > 0) ? totalClicks : null,
        totalPurchases: totalPurch > 0 ? totalPurch : null,
        totalLeads: totalLeads > 0 ? totalLeads : null,
        totalRevenue: totalRev > 0 ? round(totalRev, 2) : null,
        ctr,
        cpc,
        cpp,
        cpl,
        cpm,
        roas,
        primaryKpiKey,
        primaryKpiLabel,
        primaryKpiValue,
        resultsLabel,
        resultsValue,
        goal
      };
    }

    // --- G. Prepare AI Context (metrics + per-ad data) ---
    // Calculate per-ad metrics with all KPIs
    const adsData = Array.from(rowMap.entries()).map(([name, d]) => {
      const adCpl = d.leads > 0 ? round(d.spend / d.leads, 2) : null;
      const adCpc = d.clicks > 0 ? round(d.spend / d.clicks, 2) : null;
      const adCpm = d.impressions > 0 ? round((d.spend / d.impressions) * 1000, 2) : null;
      const adCtr = d.impressions > 0 && d.clicks > 0 ? round((d.clicks / d.impressions) * 100, 2) : null;
      const adRoas = d.revenue > 0 && d.spend > 0 ? round(d.revenue / d.spend, 2) : null;
      const adCpp = d.purchases > 0 ? round(d.spend / d.purchases, 2) : null;
      
      return {
        name,
        spend: round(d.spend, 2),
        impressions: d.impressions,
        clicks: d.clicks,
        leads: d.leads,
        purchases: d.purchases,
        revenue: round(d.revenue, 2),
        cpl: adCpl,
        cpc: adCpc,
        cpm: adCpm,
        ctr: adCtr,
        roas: adRoas,
        cpp: adCpp
      };
    }).filter(ad => ad.spend > 0); // Only include ads with spend

    const sampleRows = csvData.slice(0, 5).map(row => {
      const sample: any = {};
      if (nameCol) sample.name = row[nameCol];
      if (spendCol) sample.spend = toNumber(row[spendCol]);
      if (purchCol) sample.purchases = toNumber(row[purchCol]);
      if (leadsCol) sample.leads = toNumber(row[leadsCol]);
      if (revCol) sample.revenue = toNumber(row[revCol]);
      return sample;
    });

    const aiContext = {
      metrics: {
        totalSpend: metrics.totalSpend,
        totalImpressions: metrics.totalImpressions,
        totalClicks: metrics.totalClicks,
        totalPurchases: metrics.totalPurchases,
        totalLeads: metrics.totalLeads,
        totalRevenue: metrics.totalRevenue,
        ctr: metrics.ctr,
        cpc: metrics.cpc,
        cpp: metrics.cpp,
        cpl: metrics.cpl,
        cpm: metrics.cpm,
        roas: metrics.roas,
        goal: metrics.goal,
        primaryKpi: metrics.primaryKpiLabel,
        primaryKpiValue: metrics.primaryKpiValue
      },
      adsData: adsData
    };

    const userPrompt = `ACCOUNT METRICS:
${JSON.stringify(aiContext.metrics, null, 2)}

ALL ADS DATA (with individual metrics):
${JSON.stringify(aiContext.adsData, null, 2)}

Evaluate each ad individually and return the JSON output.`;

    // --- H. Call AI (with Math Fallback) ---
    let aiInsights = null;
    
    try {
      if (!openAiKey) throw new Error("No API Key");

      console.log('Calling Claude API for insights...');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': openAiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4000,
          temperature: 0,
          system: ADPILOT_INSIGHTS_SYSTEM,
          messages: [{ role: 'user', content: userPrompt }]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error:', response.status, errorText);
        throw new Error(`Claude API failed: ${response.status}`);
      }

      const aiData = await response.json();
      console.log("AI RAW RESPONSE:", JSON.stringify(aiData, null, 2));
      
       if (aiData.content && aiData.content[0]?.text) {
          const cleanedText = cleanJson(aiData.content[0].text);
          const deepInsights = JSON.parse(cleanedText);
          console.log('✅ Deep Insights parsed:', deepInsights);
          
          // Calculate overview metrics for healthScore and verdict
          const avgCpl = adsData.filter(a => a.cpl).reduce((sum, a) => sum + a.cpl!, 0) / adsData.filter(a => a.cpl).length || 10;
          const isHealthy = metrics.goal === "leads" 
            ? (metrics.cpl && metrics.cpl < avgCpl * 1.2)
            : metrics.goal === "purchases"
              ? (metrics.roas && metrics.roas > 1.5)
              : true;
          
          const healthScore = deepInsights.funnelHealth.status === "Healthy" ? 85 
            : deepInsights.funnelHealth.status === "Warning" ? 60 
            : 35;
          
          const verdictTone = healthScore >= 70 ? "positive" : healthScore >= 50 ? "mixed" : "negative";
          
          // Sort ads by primary KPI for best/worst
          let sortedAds = [...adsData];
          if (metrics.goal === "leads") {
            sortedAds.sort((a, b) => (a.cpl || 999) - (b.cpl || 999));
          } else if (metrics.goal === "purchases") {
            sortedAds.sort((a, b) => (b.roas || 0) - (a.roas || 0));
          } else {
            sortedAds.sort((a, b) => (a.cpc || 999) - (b.cpc || 999));
          }
          
          const bestAds = sortedAds.slice(0, 3);
          const worstAds = sortedAds.slice(-3).reverse();
          
          // Construct full AIInsights structure
          aiInsights = {
            insights: {
              healthScore,
              quickVerdict: `Account ${metrics.primaryKpiLabel} is ${metrics.primaryKpiValue?.toFixed(2) || 'N/A'}. ${deepInsights.funnelHealth.description}`,
              quickVerdictTone: verdictTone,
              bestPerformers: bestAds.map(a => ({
                id: a.name,
                reason: metrics.goal === "leads" && a.cpl 
                  ? `Strong CPL €${a.cpl.toFixed(2)} with ${a.leads} leads`
                  : metrics.goal === "purchases" && a.roas
                    ? `Strong ROAS ${a.roas.toFixed(2)}x`
                    : a.cpc ? `Efficient CPC €${a.cpc.toFixed(2)}` : `Top performer`
              })),
              needsAttention: worstAds.map(a => ({
                id: a.name,
                reason: metrics.goal === "leads" && a.cpl 
                  ? `High CPL €${a.cpl.toFixed(2)}`
                  : metrics.goal === "purchases" && a.roas !== null
                    ? `Low ROAS ${a.roas.toFixed(2)}x`
                    : a.cpc ? `High CPC €${a.cpc.toFixed(2)}` : `Needs attention`
              })),
              whatsWorking: [],
              whatsNotWorking: [],
              deepAnalysis: {
                funnelHealth: deepInsights.funnelHealth,
                opportunities: deepInsights.profitOpportunities || [],
                moneyWasters: deepInsights.budgetLeaks || [],
                creativeFatigue: []
              },
              segmentAnalysis: null
            }
          };
          console.log('✅ AI Insights generated successfully');
       }
    } catch (e) {
      console.error("AI Error:", e);
      console.log("Using Smart Fallback");
      // SILENT FAIL - Do not show "Failed". Generate Math Insights instead.
    }

    // --- I. "Smart Fallback" (If AI failed, generate basic insights) ---
    if (!aiInsights || !aiInsights.insights) {
       console.log("Generating fallback insights...");
       
       // Recreate adsData for fallback (in case it wasn't created earlier)
       const fallbackAds = Array.from(rowMap.entries()).map(([name, d]) => {
         const adCpl = d.leads > 0 ? round(d.spend / d.leads, 2) : null;
         const adCpc = d.clicks > 0 ? round(d.spend / d.clicks, 2) : null;
         const adRoas = d.revenue > 0 && d.spend > 0 ? round(d.revenue / d.spend, 2) : null;
         const adCpp = d.purchases > 0 ? round(d.spend / d.purchases, 2) : null;
         
         return { name, spend: d.spend, cpl: adCpl, cpc: adCpc, roas: adRoas, cpp: adCpp };
       }).filter(ad => ad.spend > 0);
       
       const primaryValue = metrics.primaryKpiValue || 0;
       const isGood = metrics.goal === "purchases" 
         ? (metrics.roas && metrics.roas > 2) 
         : (metrics.goal === "leads" ? (metrics.cpl && metrics.cpl < 10) : true);
       
       const score = isGood ? 80 : 40;
       const verdictTone = score >= 70 ? "positive" : score >= 50 ? "mixed" : "negative";
       
       // Sort by goal-appropriate metric
       let bestAds = [];
       let worstAds = [];
       
       if (metrics.goal === "leads") {
         bestAds = fallbackAds.filter(a => a.cpl).sort((a, b) => a.cpl! - b.cpl!).slice(0, 3);
         worstAds = fallbackAds.filter(a => a.cpl).sort((a, b) => b.cpl! - a.cpl!).slice(0, 3);
       } else if (metrics.goal === "purchases") {
         bestAds = fallbackAds.filter(a => a.roas).sort((a, b) => b.roas! - a.roas!).slice(0, 3);
         worstAds = fallbackAds.filter(a => a.roas).sort((a, b) => a.roas! - b.roas!).slice(0, 3);
       } else {
         bestAds = fallbackAds.filter(a => a.cpc).sort((a, b) => a.cpc! - b.cpc!).slice(0, 3);
         worstAds = fallbackAds.filter(a => a.cpc).sort((a, b) => b.cpc! - a.cpc!).slice(0, 3);
       }
       
       aiInsights = {
         insights: {
           healthScore: score,
           quickVerdict: isGood 
             ? `Performance is strong with healthy ${metrics.primaryKpiLabel} metrics. Account is scaling efficiently.`
             : `Performance needs optimization. ${metrics.primaryKpiLabel} requires attention to improve efficiency.`,
           quickVerdictTone: verdictTone,
           bestPerformers: bestAds.map(a => ({
             id: a.name,
             reason: metrics.goal === "leads" && a.cpl 
               ? `Strong CPL €${a.cpl.toFixed(2)}`
               : metrics.goal === "purchases" && a.roas
                 ? `Strong ROAS ${a.roas.toFixed(2)}x`
                 : a.cpc ? `Low CPC €${a.cpc.toFixed(2)}` : `Top performer`
           })),
           needsAttention: worstAds.map(a => ({
             id: a.name,
             reason: metrics.goal === "leads" && a.cpl 
               ? `High CPL €${a.cpl.toFixed(2)}`
               : metrics.goal === "purchases" && a.roas
                 ? `Low ROAS ${a.roas.toFixed(2)}x`
                 : a.cpc ? `High CPC €${a.cpc.toFixed(2)}` : `Needs attention`
           })),
           whatsWorking: [],
           whatsNotWorking: [],
            deepAnalysis: {
              funnelHealth: { 
                 status: isGood ? "Healthy" : "Warning", 
                 title: "Conversion Funnel", 
                 description: isGood 
                   ? "Funnel is converting efficiently with strong metrics across the board."
                   : "Funnel shows leakage with elevated costs. Focus on improving conversion rates.", 
                 metricToWatch: metrics.primaryKpiKey?.toUpperCase() || "ROAS"
              },
              opportunities: bestAds.length > 0 ? [
                {
                  title: `Top performer: ${bestAds[0].name}`,
                  description: metrics.goal === "leads" && bestAds[0].cpl
                    ? `This ad achieved CPL of €${bestAds[0].cpl.toFixed(2)}, significantly outperforming account average.`
                    : metrics.goal === "purchases" && bestAds[0].roas
                      ? `This ad achieved ROAS of ${bestAds[0].roas.toFixed(2)}x with strong efficiency.`
                      : `This ad shows strong performance metrics relative to account average.`,
                  impact: "High"
                }
              ] : [{
                title: "Optimize targeting",
                description: "Refine audience targeting to improve conversion efficiency.",
                impact: "Medium"
              }],
              moneyWasters: worstAds.length > 0 ? [
                {
                  title: `Underperformer: ${worstAds[0].name}`,
                  description: metrics.goal === "leads" && worstAds[0].cpl
                    ? `This ad has CPL of €${worstAds[0].cpl.toFixed(2)}, significantly above account average.`
                    : metrics.goal === "purchases" && worstAds[0].roas !== null
                      ? `This ad has low ROAS of ${worstAds[0].roas.toFixed(2)}x, indicating inefficient spend.`
                      : `This ad shows poor performance metrics relative to account average.`,
                  impact: "High"
                }
              ] : [{
                title: "High cost per result",
                description: "Current acquisition costs are above optimal levels for this campaign type.",
                impact: "Medium"
              }],
              creativeFatigue: []
            },
           segmentAnalysis: null
         }
       };
    }

    // --- J. Final Response ---
    const finalResponse = {
       ok: true,
       rowCount: csvData.length,
       columnNames: Object.keys(csvData[0] || {}),
       metrics,
       aiInsights: aiInsights
    };

    console.log("FINAL RESPONSE:", JSON.stringify(finalResponse, null, 2));
    return new Response(JSON.stringify(finalResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Fatal Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
