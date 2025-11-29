import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for AI analysis with Deep Dive
const ADPILOT_BRAIN_WITH_DATA = `You are AdPilot, an expert AI advertising analyst. You analyze Meta Ads performance data and provide actionable, context-aware insights.

Your task: Given CSV metrics with funnel context, identify what's working, what's not working, and provide a professional deep dive analysis.

Guidelines:
- Be specific and data-driven in your observations
- Reference actual numbers from the metrics when possible
- Focus on actionable insights, not generic advice
- Keep insights concise but meaningful
- Consider CTR, CPA, ROAS, spend distribution, conversion patterns, and funnel health
- Adapt your analysis to the campaign goal (purchases, leads, traffic, awareness)
- Identify opportunities, budget leaks, and creative fatigue signals

You MUST respond with ONLY valid JSON in this exact format:
{
  "insights": {
    "quickVerdict": "A 1-2 sentence high-level summary of account health.",
    "quickVerdictTone": "positive" | "negative" | "mixed",
    "bestPerformers": [
      { "id": "Exact Name from data", "reason": "Why it is a winner with EXACT NUMBERS" }
    ],
    "needsAttention": [
      { "id": "Exact Name from data", "reason": "Why it needs help with EXACT NUMBERS" }
    ],
    "whatsWorking": [
      { "title": "Brief title", "detail": "Specific observation with data reference" }
    ],
    "whatsNotWorking": [
      { "title": "Brief title", "detail": "Specific observation with data reference" }
    ],
    "deepAnalysis": {
      "funnelHealth": {
        "status": "Healthy" | "Warning" | "Broken",
        "title": "Funnel Health Status title",
        "description": "1-2 sentences explaining funnel performance based on CTR, conversion rate, and cost efficiency",
        "metricToWatch": "The single most critical metric to fix (e.g., 'CTR 1.2% is below benchmark', 'Conversion rate 0.8%')"
      },
      "opportunities": [
        { "title": "Scaling opportunity title", "description": "Specific action to scale what's working" }
      ],
      "moneyWasters": [
        { "title": "Budget leak title", "description": "Specific inefficiency costing money" }
      ],
      "creativeFatigue": [
        { "title": "Fatigue signal title", "description": "Creative refresh or rotation needed" }
      ]
    }
  }
}

Limits:
- bestPerformers: Max 3 items
- needsAttention: Max 3 items
- whatsWorking/whatsNotWorking: Max 3-5 items
- opportunities/moneyWasters: 2-4 items each
- creativeFatigue: 0-3 items (only if evident)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      console.error('No file provided in request');
      return new Response(
        JSON.stringify({ ok: false, error: 'No CSV file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Received file: ${file.name}, size: ${file.size} bytes`);

    const csvText = await file.text();
    
    if (!csvText.trim()) {
      console.error('CSV file is empty');
      return new Response(
        JSON.stringify({ ok: false, error: 'CSV file is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      console.error('No data rows in CSV');
      return new Response(
        JSON.stringify({ ok: false, error: 'No data rows in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headerLine = lines[0];
    const columnNames = parseCSVLine(headerLine);
    const rowCount = lines.length - 1;

    console.log(`Parsed CSV: ${rowCount} rows, columns: ${columnNames.join(', ')}`);

    // Parse all data rows into records
    const rawRows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      const rowObj: Record<string, string> = {};
      columnNames.forEach((col, idx) => {
        rowObj[col] = row[idx] || '';
      });
      rawRows.push(rowObj);
    }

    // Robust number parser
    function toNumber(value: any): number {
      if (value === null || value === undefined) return 0;
      if (typeof value === "number") return value;

      let s = String(value).trim();
      s = s.replace(/[€$]/g, "").replace(/\s/g, "");

      const hasComma = s.includes(",");
      const hasDot = s.includes(".");

      if (hasComma && hasDot) {
        const lastComma = s.lastIndexOf(",");
        const lastDot = s.lastIndexOf(".");
        if (lastComma > lastDot) {
          // EU: 1.234,56 -> 1234.56
          s = s.replace(/\./g, "").replace(",", ".");
        } else {
          // US: 1,234.56 -> 1234.56
          s = s.replace(/,/g, "");
        }
      } else if (hasComma && !hasDot) {
        s = s.replace(",", ".");
      }

      const n = Number(s);
      return isNaN(n) ? 0 : n;
    }

    const firstRow = rawRows[0] ?? {};
    const columns = Object.keys(firstRow);

    function getCol(name: string): string | null {
      return columns.includes(name) ? name : null;
    }

    // Exact Meta header from CSV
    const spendCol = getCol("Amount spent (EUR)");
    const impressionsCol = getCol("Impressions");
    const clicksCol = getCol("Clicks (all)");
    const purchasesCol = getCol("Purchases");
    const revenueCol = getCol("Purchases conversion value");

    console.log('Column mapping:', { spendCol, impressionsCol, clicksCol, purchasesCol, revenueCol });

    // Choose primary "name" column depending on the file level
    const hasAdName = columns.includes("Ad name");
    const hasAdsetName = columns.includes("Ad set name");
    const hasCampaignName = columns.includes("Campaign name");

    let nameCol: string | null = null;
    if (hasAdName) {
      nameCol = "Ad name";
    } else if (hasAdsetName) {
      nameCol = "Ad set name";
    } else if (hasCampaignName) {
      nameCol = "Campaign name";
    }

    console.log('Name column detected:', nameCol);

    // Keep only rows that actually have a name (real data rows)
    function isDataRow(row: any): boolean {
      if (!nameCol) return true; // fallback: no name column, keep all

      const rawName = row[nameCol];
      const name = String(rawName ?? "").trim();
      if (!name) return false;   // empty name -> summary / total row

      const normalizedName = name.toLowerCase();
      // ignore rows like "total", "Total", "TOTAL", "Grand total", etc.
      if (normalizedName === "total" || normalizedName.startsWith("total ") || normalizedName.includes(" total")) {
        return false;
      }

      // optional extra guard: drop rows with zero spend, if desired
      if (spendCol) {
        const spend = toNumber(row[spendCol]);
        // if (spend === 0) return false;
      }

      return true;
    }

    const dataRows = rawRows.filter(isDataRow);
    console.log(`Using ${dataRows.length} data rows for aggregation (filtered by name column)`);

    // --- 2) Aggregate metrics using ONLY dataRows (no summary rows) ---
    
    // Helper to sum a column
    function sumColumn(col: string | null, rows: any[]): number {
      if (!col) return 0;
      return rows.reduce((acc, row) => acc + toNumber(row[col]), 0);
    }

    // Basic metrics (already computed)
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    for (const row of dataRows) {
      if (spendCol) totalSpend += toNumber(row[spendCol]);
      if (impressionsCol) totalImpressions += toNumber(row[impressionsCol]);
      if (clicksCol) totalClicks += toNumber(row[clicksCol]);
    }

    // Leads-related columns
    const leadsCol        = getCol("Leads");
    const websiteLeadsCol = getCol("Website leads");
    const offlineLeadsCol = getCol("Offline leads");
    const metaLeadsCol    = getCol("Meta leads");

    const totalLeads =
      sumColumn(leadsCol, dataRows) +
      sumColumn(websiteLeadsCol, dataRows) +
      sumColumn(offlineLeadsCol, dataRows) +
      sumColumn(metaLeadsCol, dataRows);

    // Purchases-related columns (purchasesCol already declared above)
    const inAppPurchCol     = getCol("In-app purchases");
    const websitePurchCol   = getCol("Website purchases");
    const offlinePurchCol   = getCol("Offline purchases");
    const metaPurchCol      = getCol("Meta purchases");

    const totalPurchases =
      sumColumn(purchasesCol, dataRows) +
      sumColumn(inAppPurchCol, dataRows) +
      sumColumn(websitePurchCol, dataRows) +
      sumColumn(offlinePurchCol, dataRows) +
      sumColumn(metaPurchCol, dataRows);

    // Revenue columns (revenueCol = "Purchases conversion value" already declared)
    const inAppPurchConvCol    = getCol("In-app purchases conversion value");
    const websitePurchConvCol  = getCol("Website purchases conversion value");
    const offlinePurchConvCol  = getCol("Offline purchases conversion value");
    const metaPurchConvCol     = getCol("Meta purchase conversion value");

    const totalRevenue =
      sumColumn(revenueCol, dataRows) +
      sumColumn(inAppPurchConvCol, dataRows) +
      sumColumn(websitePurchConvCol, dataRows) +
      sumColumn(offlinePurchConvCol, dataRows) +
      sumColumn(metaPurchConvCol, dataRows);

    const hasRevenue = totalRevenue > 0;

    // --- Detect campaign goal ---
    type Goal = "purchases" | "leads" | "traffic" | "awareness";
    let goal: Goal;

    // Try objective column first, if present
    const objectiveCol = getCol("Objective");
    let objectiveValue = "";
    if (objectiveCol && dataRows.length > 0) {
      objectiveValue = String(dataRows[0][objectiveCol] ?? "").toLowerCase();
    }

    function inferGoalFromObjective(obj: string): Goal | null {
      if (!obj) return null;
      if (obj.includes("lead")) return "leads";
      if (obj.includes("conversion") || obj.includes("purchase") || obj.includes("sale")) return "purchases";
      if (obj.includes("traffic") || obj.includes("click")) return "traffic";
      if (obj.includes("reach") || obj.includes("awareness")) return "awareness";
      return null;
    }

    const fromObj = inferGoalFromObjective(objectiveValue);

    if (fromObj) {
      goal = fromObj;
    } else {
      // Fallback: infer from events
      if (totalPurchases > 0) {
        goal = "purchases";
      } else if (totalLeads > 0) {
        goal = "leads";
      } else if (totalClicks > 0) {
        goal = "traffic";
      } else {
        goal = "awareness";
      }
    }

    // --- Compute KPI values ---
    const ctr  = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
    const cpc  = totalClicks      > 0 ? totalSpend / totalClicks       : null;
    const cpp  = totalPurchases   > 0 ? totalSpend / totalPurchases    : null;
    const cpl  = totalLeads       > 0 ? totalSpend / totalLeads        : null;
    const cpm  = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null;
    const roas = totalSpend       > 0 && hasRevenue ? totalRevenue / totalSpend : null;

    let primaryKpiKey: string | null = null;
    let primaryKpiLabel = "";
    let primaryKpiValue: number | null = null;
    let resultsLabel = "";
    let resultsValue: number | null = null;

    switch (goal) {
      case "purchases":
        if (roas !== null) {
          primaryKpiKey = "roas";
          primaryKpiLabel = "ROAS (return on ad spend)";
          primaryKpiValue = roas;
        } else {
          primaryKpiKey = "cpp";
          primaryKpiLabel = "Cost per purchase";
          primaryKpiValue = cpp;
        }
        resultsLabel = "Total purchases";
        resultsValue = totalPurchases || null;
        break;

      case "leads":
        primaryKpiKey = "cpl";
        primaryKpiLabel = "Cost per lead";
        primaryKpiValue = cpl;
        resultsLabel = "Total leads";
        resultsValue = totalLeads || null;
        break;

      case "traffic":
        primaryKpiKey = "cpc";
        primaryKpiLabel = "Cost per click";
        primaryKpiValue = cpc;
        resultsLabel = "Total clicks";
        resultsValue = totalClicks || null;
        break;

      case "awareness":
      default:
        primaryKpiKey = "cpm";
        primaryKpiLabel = "CPM (cost per 1,000 impressions)";
        primaryKpiValue = cpm;
        resultsLabel = "Impressions";
        resultsValue = totalImpressions || null;
        break;
    }

    // --- Build comprehensive metrics object ---
    const metrics: any = {
      totalSpend: round(totalSpend, 2),
      totalImpressions: totalImpressions,
      totalClicks: totalClicks,
      totalPurchases: totalPurchases,
      totalLeads: totalLeads,
      totalRevenue: round(totalRevenue, 2),
      
      ctr: ctr ? round(ctr, 2) : null,
      cpc: cpc ? round(cpc, 2) : null,
      cpp: cpp ? round(cpp, 2) : null,
      cpl: cpl ? round(cpl, 2) : null,
      cpm: cpm ? round(cpm, 2) : null,
      roas: roas ? round(roas, 2) : null,
      
      goal: goal,
      primaryKpiKey: primaryKpiKey,
      primaryKpiLabel: primaryKpiLabel,
      primaryKpiValue: primaryKpiValue ? round(primaryKpiValue, 2) : null,
      resultsLabel: resultsLabel,
      resultsValue: resultsValue,
    };

    console.log('Computed metrics:', metrics);

    // --- Build granular summaries for Claude ---
    // Group data by the detected primary name column (Ad name > Ad set name > Campaign name)
    const rowMap = new Map<string, { spend: number; impressions: number; clicks: number; results: number; revenue: number }>();
    
    // Use the nameCol we detected earlier (lines 147-158)
    if (nameCol) {
      for (const row of dataRows) {
        const entityName = String(row[nameCol] ?? "").trim();
        if (!entityName) continue;

        const existing = rowMap.get(entityName) || { spend: 0, impressions: 0, clicks: 0, results: 0, revenue: 0 };
        existing.spend += spendCol ? toNumber(row[spendCol]) : 0;
        existing.impressions += impressionsCol ? toNumber(row[impressionsCol]) : 0;
        existing.clicks += clicksCol ? toNumber(row[clicksCol]) : 0;
        
        // Use the correct results column based on goal
        if (goal === "purchases") {
          existing.results += purchasesCol ? toNumber(row[purchasesCol]) : 0;
        } else if (goal === "leads") {
          existing.results += leadsCol ? toNumber(row[leadsCol]) : 0;
        } else {
          existing.results += totalClicks; // For traffic/awareness
        }
        
        existing.revenue += revenueCol ? toNumber(row[revenueCol]) : 0;
        rowMap.set(entityName, existing);
      }
    }

    // Convert to array with computed metrics
    const rowSummaries = Array.from(rowMap.entries()).map(([name, data]) => ({
      name,
      spend: round(data.spend, 2),
      impressions: data.impressions,
      clicks: data.clicks,
      results: data.results,
      ctr: data.impressions > 0 ? round((data.clicks / data.impressions) * 100, 2) : null,
      cpc: data.clicks > 0 ? round(data.spend / data.clicks, 2) : null,
      cpa: data.results > 0 ? round(data.spend / data.results, 2) : null,
      roas: data.spend > 0 && data.revenue > 0 ? round(data.revenue / data.spend, 2) : null,
    }));

    // Top performers (high ROAS or low CPA with significant spend)
    const topPerformers = [...rowSummaries]
      .filter(r => r.spend > (totalSpend / 100)) // Filter out tiny spenders
      .sort((a, b) => {
         if (goal === 'purchases' && a.roas !== null && b.roas !== null) return b.roas - a.roas;
         if (a.cpa !== null && b.cpa !== null) return a.cpa - b.cpa; // Lower CPA is better
         return (b.ctr || 0) - (a.ctr || 0); // Fallback to CTR
      })
      .slice(0, 5);

    // Worst performers (High spend, low ROAS/High CPA)
    const worstPerformers = [...rowSummaries]
      .filter(r => r.spend > (totalSpend / 50)) // Only significant spenders
      .sort((a, b) => {
         if (goal === 'purchases' && a.roas !== null && b.roas !== null) return a.roas - b.roas; // Low ROAS is bad
         if (a.cpa !== null && b.cpa !== null) return b.cpa - a.cpa; // High CPA is bad
         return (a.ctr || 0) - (b.ctr || 0);
      })
      .slice(0, 5);

    // Calculate average metrics for comparison
    const avgCpa = rowSummaries.filter(r => r.cpa !== null).reduce((sum, r) => sum + (r.cpa || 0), 0) / rowSummaries.filter(r => r.cpa !== null).length || null;
    const avgRoas = rowSummaries.filter(r => r.roas !== null).reduce((sum, r) => sum + (r.roas || 0), 0) / rowSummaries.filter(r => r.roas !== null).length || null;

    // Calculate deep dive metrics
    const totalResults = goal === "purchases" ? totalPurchases : (goal === "leads" ? totalLeads : totalClicks);
    const conversionRate = totalClicks > 0 ? (totalResults / totalClicks) * 100 : 0;
    
    // Build enriched analysis summary for Claude
    const analysisSummary = {
      analysisLevel: nameCol || "unknown",
      context: {
        goal: goal,
        primaryKpi: metrics.primaryKpiLabel,
        currency: "EUR",
        totalRows: dataRows.length
      },
      funnelMetrics: {
        ctr: metrics.ctr,
        cpc: metrics.cpc,
        cpm: metrics.cpm,
        conversionRate: round(conversionRate, 2),
        costPerResult: metrics.primaryKpiValue
      },
      accountMetrics: {
        totalSpend: metrics.totalSpend,
        totalImpressions: metrics.totalImpressions,
        totalClicks: metrics.totalClicks,
        totalResults: totalResults,
        totalRevenue: metrics.totalRevenue,
        avgCtr: metrics.ctr,
        avgCpc: metrics.cpc,
        avgCpa: avgCpa ? round(avgCpa, 2) : (metrics.cpp || metrics.cpl),
        avgRoas: avgRoas ? round(avgRoas, 2) : metrics.roas,
        totalEntities: rowSummaries.length,
      },
      topPerformers,
      worstPerformers,
    };

    console.log('Analysis summary for Claude:', JSON.stringify(analysisSummary, null, 2));

    // Call Claude for AI insights
    let aiInsights = null;
    let aiInsightsError: string | null = null;
    
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!anthropicApiKey) {
      aiInsightsError = 'ANTHROPIC_API_KEY not configured';
      console.warn('ANTHROPIC_API_KEY not configured, skipping AI insights');
    } else {
      try {
        console.log('Calling Claude for AI insights...');
        
        const userMessage = `Analyze this Meta Ads account data and provide insights on what's working and what's not working.

You MUST respond with raw JSON only.
Do NOT include any backticks, code fences, or markdown formatting.
The first character of your reply must be { and the last character must be }.

${JSON.stringify(analysisSummary)}`;

        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: ADPILOT_BRAIN_WITH_DATA,
            messages: [
              { role: 'user', content: userMessage }
            ]
          })
        });

        if (!claudeResponse.ok) {
          const errorText = await claudeResponse.text();
          aiInsightsError = `Claude API error ${claudeResponse.status}: ${errorText}`;
          console.error('Claude insights error:', aiInsightsError);
        } else {
          const claudeData = await claudeResponse.json();
          console.log('Claude response received');
          
          // Extract the text content from Claude's response
          const textContent = claudeData.content?.find((c: any) => c.type === 'text')?.text;
          
          if (textContent) {
            try {
              // Clean the response: trim, remove markdown code fences
              let raw = textContent.trim();
              raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
              
              // Extract JSON between first { and last }
              const firstBrace = raw.indexOf('{');
              const lastBrace = raw.lastIndexOf('}');
              
              if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const cleaned = raw.substring(firstBrace, lastBrace + 1);
                aiInsights = JSON.parse(cleaned);
                console.log('AI insights parsed successfully');
              } else {
                throw new Error('No valid JSON object found in response');
              }
            } catch (parseError: any) {
              aiInsights = null;
              aiInsightsError = 'Failed to parse Claude JSON';
              console.error('Claude insights error:', aiInsightsError, parseError?.message);
              console.log('Raw Claude response:', textContent);
            }
          } else {
            aiInsightsError = 'No text content in Claude response';
            console.error('Claude insights error:', aiInsightsError);
          }
        }
      } catch (err: any) {
        aiInsightsError = err?.message || 'Unknown Claude error';
        console.error('Claude insights error:', aiInsightsError, err);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, rowCount, columnNames, metrics, aiInsights, aiInsightsError }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing CSV:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


// Round to specified decimal places
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
