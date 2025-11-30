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

    // --- A. Detect Columns (excluding "Total" columns) ---
    const headers = Object.keys(csvData[0]).map(h => h.trim());
    
    // Filter out columns that are "Total" variants (e.g., "Total Results", "All Results")
    const isNonTotalColumn = (h: string) => {
      const lower = h.toLowerCase();
      return !lower.startsWith('total ') && 
             !lower.startsWith('all ') && 
             !lower.startsWith('grand ') &&
             h.trim() !== ''; // Exclude empty column names
    };
    
    const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedHeaders = Object.keys(csvData[0])
      .filter(isNonTotalColumn)
      .map(h => ({
        original: h,
        normalized: normalizeHeader(h),
      }));

    const findCol = (regex: RegExp) => normalizedHeaders.find(h => regex.test(h.normalized))?.original;

    // Detect all metric columns (base columns only, no "Total X" variants)
    let spendCol = findCol(/^spent$|^spend$|^amountspent|^izterets$|^terini$/) || headers.filter(isNonTotalColumn).find(h => h.includes('Amount spent'));
    let revCol = findCol(/conversionvalue|purchasevalue|^ienakumi$|^pelnja$|^vertiba$|^revenue$|^totalconversionvalue$/) || headers.filter(isNonTotalColumn).find(h => h.includes('conversion value') || h.includes('revenue') || h.includes('value'));
    let purchCol = findCol(/^purchases$|^totalpurchases$|^purchase$|^websitepurchases$|^offlinepurchases$|^metapurchases$|^inapppurchases$|^offsiteconversionpurchase$|^actionspurchase$|^purchaseevent$/) || headers.filter(isNonTotalColumn).find(h => h === 'Purchases' || h === 'Website purchases' || h === 'Purchase' || h.includes('purchase'));
    let leadsCol = findCol(/^leads$|^totallead$|^lead$|^websiteleads$|^offlineleads$|^metaleads$|^onfacebooklead$|^generatedleads$|^conversions$/) || headers.filter(isNonTotalColumn).find(h => h === 'Leads' || h === 'Website leads' || h === 'Lead' || h === 'Generated leads' || h.includes('lead'));
    let resultsCol = findCol(/^results$/) || headers.filter(isNonTotalColumn).find(h => h === 'Results');
    let impsCol = findCol(/^impressions$|^skatijumi$/) || headers.filter(isNonTotalColumn).find(h => h === 'Impressions');
    let clicksCol = findCol(/^clicksall$|^clicks$|^klikski$/) || headers.filter(isNonTotalColumn).find(h => h === 'Clicks (all)' || h === 'Clicks');
    let nameCol = findCol(/adname|adsetname|campaignname|nosaukums/) || headers.filter(isNonTotalColumn).find(h => h.includes('name'));
    
    // Detect Meta objective/goal columns
    let objectiveCol = findCol(/^objective$|^optimizationgoal$/) || headers.filter(isNonTotalColumn).find(h => h.toLowerCase() === 'objective' || h.toLowerCase() === 'optimization goal');
    let campaignNameForGoal = headers.filter(isNonTotalColumn).find(h => h.toLowerCase().includes('campaign name'));
    let adsetNameForGoal = headers.filter(isNonTotalColumn).find(h => h.toLowerCase().includes('ad set name') || h.toLowerCase().includes('adset name'));

    console.log(`Column Detection: Spend=${spendCol}, Revenue=${revCol}, Purchases=${purchCol}, Leads=${leadsCol}, Results=${resultsCol}, Objective=${objectiveCol}`);
    
    // Special case: If objective indicates leads but no leads column exists, treat Results as Leads
    if (objectiveCol && resultsCol && !leadsCol) {
      const sampleObjective = csvData[0] && csvData[0][objectiveCol] ? String(csvData[0][objectiveCol]).toLowerCase() : '';
      if (sampleObjective.includes('lead')) {
        leadsCol = resultsCol;
        console.log(`⚠️ Objective is leads-based but no Leads column found. Using Results column as Leads.`);
      }
    }

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
    let totalSpend = 0, totalRev = 0, totalPurch = 0, totalLeads = 0, totalResults = 0, totalImps = 0, totalClicks = 0;
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
      const clicks = clicksCol ? toNumber(row[clicksCol]) : 0;
      
      totalSpend += spend;
      totalRev += rev;
      totalPurch += purch;
      totalLeads += leads;
      totalResults += results;
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
    
    // --- C. Calculate All Metrics ---
    const ctr = totalImps > 0 ? round((totalClicks / totalImps) * 100, 2) : null;
    const cpc = totalClicks > 0 ? round(totalSpend / totalClicks, 2) : null;
    const cpp = totalPurch > 0 ? round(totalSpend / totalPurch, 2) : null;
    const cpl = totalLeads > 0 ? round(totalSpend / totalLeads, 2) : null;
    const cpm = totalImps > 0 ? round((totalSpend / totalImps) * 1000, 2) : null;
    const roas = totalRev && totalSpend > 0 ? round(totalRev / totalSpend, 2) : null;

    // --- D. DETECT CONVERSION COLUMNS (CRITICAL: Column existence, not just values) ---
    // 
    // This determines if conversion columns EXIST, regardless of whether they have values > 0
    // If a conversion column exists, we MUST use conversion-based KPIs, even if values are 0
    //
    const hasLeadsColumn = !!leadsCol;
    const hasPurchasesColumn = !!purchCol;
    const hasRevenueColumn = !!revCol;
    
    console.log(`Column Existence Check: hasLeadsColumn=${hasLeadsColumn}, hasPurchasesColumn=${hasPurchasesColumn}, hasRevenueColumn=${hasRevenueColumn}`);
    
    // --- E. DETECT CAMPAIGN GOAL (STRICT HIERARCHY) ---
    // 
    // GOAL DETECTION HIERARCHY:
    // 1. Objective column (HIGHEST PRIORITY) - checks for Meta's "Objective" or "Optimization goal" column
    // 2. Campaign/Adset name inference - looks for keywords like "lead", "purchase", "traffic", "awareness"
    // 3. Column existence (if leads/purchases columns exist, that's the goal)
    // 4. Event volume analysis - determines goal based on which conversion type has the most activity
    //
    // GOAL OPTIONS: "leads" | "purchases" | "traffic" | "awareness"
    //
    let goal = "";
    
    // STEP 1: Check objective column (HIGHEST PRIORITY)
    if (objectiveCol && csvData.length > 0) {
      const objective = String(csvData[0][objectiveCol] || '').toUpperCase();
      
      if (objective.includes('LEAD')) {
        goal = "leads";
      } else if (objective.includes('CONVERSION') || objective.includes('PURCHASE') || objective.includes('SALES')) {
        goal = "purchases";
      } else if (objective.includes('TRAFFIC')) {
        goal = "traffic";
      } else if (objective.includes('REACH') || objective.includes('AWARENESS')) {
        goal = "awareness";
      }
      
      console.log(`Goal from Objective column: ${goal} (Objective: ${objective})`);
    }
    
    // STEP 2: Infer from campaign/adset names if objective missing or unclear
    if (!goal && csvData.length > 0) {
      // Check all rows for consistent naming patterns
      const allCampaignNames = campaignNameForGoal 
        ? csvData.map(r => String(r[campaignNameForGoal] || '').toLowerCase()).filter(Boolean)
        : [];
      const allAdsetNames = adsetNameForGoal
        ? csvData.map(r => String(r[adsetNameForGoal] || '').toLowerCase()).filter(Boolean)
        : [];
      
      const allNames = [...allCampaignNames, ...allAdsetNames].join(' ');
      
      // Priority order: leads > purchases > traffic > awareness
      if (allNames.includes('lead') || allNames.includes('leadgen') || allNames.includes('lead gen') || 
          allNames.includes('instant form') || allNames.includes('form') || allNames.includes('registration')) {
        goal = "leads";
      } else if (allNames.includes('purchase') || allNames.includes('sales') || allNames.includes('pirkumi') || 
                 allNames.includes('conversion') || allNames.includes('shop')) {
        goal = "purchases";
      } else if (allNames.includes('traffic') || allNames.includes('trafiks') || allNames.includes('clicks')) {
        goal = "traffic";
      } else if (allNames.includes('awareness') || allNames.includes('reach') || allNames.includes('brand')) {
        goal = "awareness";
      }
      
      if (goal) console.log(`Goal inferred from names: ${goal}`);
    }
    
    // STEP 3: Check if conversion columns exist (even if values are 0)
    if (!goal) {
      // Priority: purchases column > leads column > traffic > awareness
      if (hasPurchasesColumn) {
        goal = "purchases";
        console.log(`Goal set to purchases: Purchase column exists`);
      } else if (hasLeadsColumn) {
        goal = "leads";
        console.log(`Goal set to leads: Leads column exists`);
      }
    }
    
    // STEP 4: Infer from event volumes (which event has highest value)
    if (!goal) {
      // Find which conversion type has the most spend or volume
      const purchaseScore = totalPurch > 0 ? totalPurch * 10 : 0; // Weight purchases higher
      const leadScore = totalLeads > 0 ? totalLeads * 5 : 0;
      const clickScore = totalClicks > 0 ? totalClicks * 1 : 0;
      
      if (purchaseScore >= leadScore && purchaseScore >= clickScore && totalPurch > 0) {
        goal = "purchases";
      } else if (leadScore >= purchaseScore && leadScore >= clickScore && totalLeads > 0) {
        goal = "leads";
      } else if (totalClicks > 0) {
        goal = "traffic";
      } else if (totalImps > 0) {
        goal = "awareness";
      } else {
        goal = "awareness"; // ultimate fallback
      }
      
      console.log(`Goal inferred from event volumes: ${goal} (Purchases: ${totalPurch}, Leads: ${totalLeads}, Clicks: ${totalClicks})`);
    }
    
    // --- F. SELECT PRIMARY KPI (STRICT RULES - NO CTR, CONVERSION COLUMNS ALWAYS WIN) ---
    //
    // PRIMARY KPI SELECTION HIERARCHY:
    //
    // CRITICAL RULES:
    // 1. If conversion columns exist (purchases/leads), ALWAYS use conversion-based KPI, even if values are 0
    // 2. CTR is FORBIDDEN as primary KPI (only count-based fallbacks allowed)
    // 3. NEVER select CPC if conversion columns exist
    //
    // PURCHASES (if purchases column exists):  ROAS (if revenue > 0) → CPP (even if null) → Purchase Count → CPC → Impressions
    // LEADS (if leads column exists):          CPL (even if null) → Lead Count → CPC → Impressions  
    // TRAFFIC (only if NO conversion columns): CPC → Click Count → Impressions
    // AWARENESS:                               CPM → Impressions
    //
    // NOTE: CTR is never used as primary KPI under any circumstances
    //
    let primaryKpiKey = "";
    let primaryKpiLabel = "";
    let primaryKpiValue: number | null = null;
    let resultsLabel = "";
    let resultsValue: number | null = null;
    
    const revenueAvailable = totalRev > 0;
    const hasConversions = totalPurch > 0 || totalLeads > 0;
    const hasConversionColumns = hasPurchasesColumn || hasLeadsColumn;
    
    // STEP 1: Override goal if conversion columns exist but goal was inferred as traffic
    // This ensures we never show CPC when conversion columns are present
    if (hasConversionColumns && goal === "traffic") {
      if (hasPurchasesColumn) {
        goal = "purchases";
        console.log(`⚠️ Goal override: Purchase column exists, changing from traffic to purchases`);
      } else if (hasLeadsColumn) {
        goal = "leads";
        console.log(`⚠️ Goal override: Leads column exists, changing from traffic to leads`);
      }
    }
    
    // STEP 1b: Also override if we have actual conversions but goal was traffic
    if (hasConversions && goal === "traffic") {
      if (totalPurch > 0) {
        goal = "purchases";
        console.log(`⚠️ Goal override: Found purchases (${totalPurch}), changing from traffic to purchases`);
      } else if (totalLeads > 0) {
        goal = "leads";
        console.log(`⚠️ Goal override: Found leads (${totalLeads}), changing from traffic to leads`);
      }
    }
    
    // STEP 2: Goal-based KPI selection with STRICT conversion-first hierarchy
    if (goal === "purchases") {
      // Priority: ROAS → CPP → Purchase Count → CPC → Impressions
      // CRITICAL: Use CPP even if value is null (spend might be 0), as long as purchases column exists
      // NEVER use CTR as primary KPI
      if (revenueAvailable && roas !== null && roas > 0) {
        primaryKpiKey = "roas";
        primaryKpiLabel = "ROAS";
        primaryKpiValue = roas;
      } else if (cpp !== null && cpp > 0) {
        // Use CPP if it's calculable and > 0
        primaryKpiKey = "cpp";
        primaryKpiLabel = "Cost per Purchase";
        primaryKpiValue = cpp;
      } else if (totalPurch > 0) {
        // Use purchase count if CPP not available but purchases exist
        primaryKpiKey = "purchases";
        primaryKpiLabel = "Total Purchases";
        primaryKpiValue = totalPurch;
      } else if (hasPurchasesColumn && totalSpend > 0) {
        // CRITICAL: Even if purchases = 0, use CPP if column exists and spend > 0
        // Set CPP to null but still use it as the KPI
        primaryKpiKey = "cpp";
        primaryKpiLabel = "Cost per Purchase";
        primaryKpiValue = null; // Will show as "—" in UI
        console.log(`⚠️ Using CPP as KPI even though purchases = 0 (purchase column exists)`);
      } else if (cpc !== null && cpc > 0 && totalClicks > 0) {
        // Only use CPC if we don't have purchase column
        primaryKpiKey = "cpc";
        primaryKpiLabel = "Cost per Click";
        primaryKpiValue = cpc;
      } else if (totalImps > 0) {
        primaryKpiKey = "impressions";
        primaryKpiLabel = "Impressions";
        primaryKpiValue = totalImps;
      }
      
      // Results card
      if (totalPurch > 0) {
        resultsLabel = "Total Purchases";
        resultsValue = totalPurch;
      } else if (totalClicks > 0) {
        resultsLabel = "Total Clicks";
        resultsValue = totalClicks;
      } else {
        resultsLabel = "Total Results";
        resultsValue = 0;
      }
      
    } else if (goal === "leads") {
      // Priority: CPL → Lead Count → CPC → Impressions
      // CRITICAL: Use CPL even if value is null (spend might be 0), as long as leads column exists
      // NEVER use CTR as primary KPI
      if (cpl !== null && cpl > 0) {
        // Use CPL if it's calculable and > 0
        primaryKpiKey = "cpl";
        primaryKpiLabel = "Cost per Lead";
        primaryKpiValue = cpl;
      } else if (totalLeads > 0) {
        // Use lead count if CPL not available but leads exist
        primaryKpiKey = "leads";
        primaryKpiLabel = "Total Leads";
        primaryKpiValue = totalLeads;
      } else if (hasLeadsColumn && totalSpend > 0) {
        // CRITICAL: Even if leads = 0, use CPL if column exists and spend > 0
        // Set CPL to null but still use it as the KPI
        primaryKpiKey = "cpl";
        primaryKpiLabel = "Cost per Lead";
        primaryKpiValue = null; // Will show as "—" in UI
        console.log(`⚠️ Using CPL as KPI even though leads = 0 (leads column exists)`);
      } else if (cpc !== null && cpc > 0 && totalClicks > 0) {
        // Only use CPC if we don't have leads column
        primaryKpiKey = "cpc";
        primaryKpiLabel = "Cost per Click";
        primaryKpiValue = cpc;
      } else if (totalImps > 0) {
        primaryKpiKey = "impressions";
        primaryKpiLabel = "Impressions";
        primaryKpiValue = totalImps;
      }
      
      // Results card
      if (totalLeads > 0) {
        resultsLabel = "Total Leads";
        resultsValue = totalLeads;
      } else if (totalClicks > 0) {
        resultsLabel = "Total Clicks";
        resultsValue = totalClicks;
      } else {
        resultsLabel = "Total Results";
        resultsValue = 0;
      }
      
    } else if (goal === "traffic") {
      // CRITICAL: Only use traffic metrics if there are NO conversion columns
      // If conversion columns exist, this code should never be reached due to goal override above
      // NEVER use CTR as primary KPI - only CPC or count-based metrics
      if (cpc !== null && cpc > 0 && totalClicks > 0) {
        primaryKpiKey = "cpc";
        primaryKpiLabel = "Cost per Click";
        primaryKpiValue = cpc;
      } else if (totalClicks > 0) {
        // Use click count instead of CTR
        primaryKpiKey = "clicks";
        primaryKpiLabel = "Total Clicks";
        primaryKpiValue = totalClicks;
      } else if (totalImps > 0) {
        primaryKpiKey = "impressions";
        primaryKpiLabel = "Impressions";
        primaryKpiValue = totalImps;
      }
      
      // Results card
      if (totalClicks > 0) {
        resultsLabel = "Total Clicks";
        resultsValue = totalClicks;
      } else {
        resultsLabel = "Total Results";
        resultsValue = 0;
      }
      
    } else { // awareness
      // Try: CPM → Impressions
      if (cpm !== null && cpm > 0 && totalImps > 0) {
        primaryKpiKey = "cpm";
        primaryKpiLabel = "CPM";
        primaryKpiValue = cpm;
      } else if (totalImps > 0) {
        primaryKpiKey = "impressions";
        primaryKpiLabel = "Impressions";
        primaryKpiValue = totalImps;
      }
      
      // Results card
      resultsLabel = "Total Impressions";
      resultsValue = totalImps > 0 ? totalImps : 0;
    }
    
    // Sanity check: ensure primary KPI key is set
    // NOTE: primaryKpiValue CAN be null if we're using CPL/CPP with 0 conversions
    // This is intentional and correct - it shows "—" in the UI
    if (!primaryKpiKey) {
      console.warn(`⚠️ Primary KPI key was not set, falling back to impressions`);
      primaryKpiKey = "impressions";
      primaryKpiLabel = "Impressions";
      primaryKpiValue = totalImps > 0 ? totalImps : 0;
      
      if (resultsValue === null || resultsValue === 0) {
        resultsLabel = "Total Impressions";
        resultsValue = totalImps > 0 ? totalImps : 0;
      }
    }
    
    // Additional validation: check for NaN or Infinity (but allow null and 0)
    if (primaryKpiValue !== null && (isNaN(primaryKpiValue) || !isFinite(primaryKpiValue))) {
      console.warn(`⚠️ Primary KPI value was NaN or Infinity, setting to null`);
      primaryKpiValue = null;
    }
    
    // Additional safety: flag if spend is 0 (can't calculate cost metrics)
    if (totalSpend === 0) {
      console.warn(`⚠️ Warning: Total Spend is 0. Cost-based KPIs (CPC, CPL, CPP, CPM) will be null.`);
    }
    
    console.log(`✅ Goal Detection Complete: ${goal} (Purchases: ${totalPurch}, Leads: ${totalLeads}, Clicks: ${totalClicks})`);
    console.log(`✅ Primary KPI: ${primaryKpiLabel} (${primaryKpiKey}) = ${primaryKpiValue}`);
    console.log(`✅ Results Metric: ${resultsLabel} = ${resultsValue}`);

    // --- F. Core metrics object matching user's exact structure ---
    const metrics = {
      totalSpend: totalSpend > 0 ? round(totalSpend, 2) : null,
      totalImpressions: totalImps > 0 ? totalImps : null,
      totalClicks: totalClicks > 0 ? totalClicks : null,
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
      resultsValue
    };

    // Rows calculation for AI insights
    const rows = Array.from(rowMap.entries()).map(([name, d]) => ({
        name,
        spend: round(d.spend),
        roas: d.spend > 0 ? round(d.revenue / d.spend) : 0,
        cpa: d.results > 0 ? round(d.spend / d.results) : 0
    }));

    const analysisSummary = {
      metrics: {
        spend: round(totalSpend),
        roas: roas || 0,
        cpa: cpp || 0
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
       metrics,
       aiInsights: aiInsights
    };

    return new Response(JSON.stringify(finalResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Fatal Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
