import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for AI analysis
const ADPILOT_BRAIN_WITH_DATA = `You are AdPilot, an expert AI advertising analyst. You analyze Meta Ads performance data and provide actionable insights.

Your task: Given CSV metrics and sample rows, identify what's working and what's not working in this ad account.

Guidelines:
- Be specific and data-driven in your observations
- Reference actual numbers from the metrics when possible
- Focus on actionable insights, not generic advice
- Keep insights concise but meaningful
- Consider CTR, CPA, ROAS, spend distribution, and conversion patterns

You MUST respond with ONLY valid JSON in this exact format:
{
  "insights": {
    "whatsWorking": [
      { "title": "Brief title", "detail": "Specific observation with data reference" }
    ],
    "whatsNotWorking": [
      { "title": "Brief title", "detail": "Specific observation with data reference" }
    ]
  }
}

Each array should have 3-5 items maximum. Be specific to the data provided.`;

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
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalResults = 0;
    let totalRevenue = 0;

    for (const row of dataRows) {
      if (spendCol) totalSpend += toNumber(row[spendCol]);
      if (impressionsCol) totalImpressions += toNumber(row[impressionsCol]);
      if (clicksCol) totalClicks += toNumber(row[clicksCol]);
      if (purchasesCol) totalResults += toNumber(row[purchasesCol]);
      if (revenueCol) totalRevenue += toNumber(row[revenueCol]);
    }

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : null;
    const cpa = totalResults > 0 ? totalSpend / totalResults : null;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : null;

    // Compute derived metrics
    const metrics = {
      totalSpend: spendCol ? round(totalSpend, 2) : null,
      totalImpressions: impressionsCol ? totalImpressions : null,
      totalClicks: clicksCol ? totalClicks : null,
      totalResults: purchasesCol ? totalResults : null,
      totalRevenue: revenueCol ? round(totalRevenue, 2) : null,
      ctr: ctr ? round(ctr, 2) : null,
      cpc: cpc ? round(cpc, 2) : null,
      cpa: cpa ? round(cpa, 2) : null,
      roas: roas ? round(roas, 2) : null,
    };

    console.log('Computed metrics:', metrics);

    // --- Build campaign-level summaries for Claude ---
    // Group data by campaign name
    const campaignMap = new Map<string, { spend: number; impressions: number; clicks: number; results: number; revenue: number }>();
    const campaignNameCol = columns.includes("Campaign name") ? "Campaign name" : null;

    if (campaignNameCol) {
      for (const row of dataRows) {
        const campName = String(row[campaignNameCol] ?? "").trim();
        if (!campName) continue;

        const existing = campaignMap.get(campName) || { spend: 0, impressions: 0, clicks: 0, results: 0, revenue: 0 };
        existing.spend += spendCol ? toNumber(row[spendCol]) : 0;
        existing.impressions += impressionsCol ? toNumber(row[impressionsCol]) : 0;
        existing.clicks += clicksCol ? toNumber(row[clicksCol]) : 0;
        existing.results += purchasesCol ? toNumber(row[purchasesCol]) : 0;
        existing.revenue += revenueCol ? toNumber(row[revenueCol]) : 0;
        campaignMap.set(campName, existing);
      }
    }

    // Convert to array with computed metrics
    const campaignSummaries = Array.from(campaignMap.entries()).map(([name, data]) => ({
      name,
      spend: round(data.spend, 2),
      impressions: data.impressions,
      clicks: data.clicks,
      results: data.results,
      ctr: data.impressions > 0 ? round((data.clicks / data.impressions) * 100, 2) : null,
      cpc: data.clicks > 0 ? round(data.spend / data.clicks, 2) : null,
      cpa: data.results > 0 ? round(data.spend / data.results, 2) : null,
      roas: data.spend > 0 ? round(data.revenue / data.spend, 2) : null,
    }));

    // Top 10 campaigns by spend
    const topCampaigns = [...campaignSummaries]
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);

    // Worst 10 campaigns: highest CPA (where results > 0) or lowest ROAS
    const worstCampaigns = [...campaignSummaries]
      .filter(c => c.results && c.results > 0) // only campaigns with conversions
      .sort((a, b) => {
        // Sort by CPA descending (worst first), fallback to ROAS ascending
        if (a.cpa !== null && b.cpa !== null) return b.cpa - a.cpa;
        if (a.roas !== null && b.roas !== null) return a.roas - b.roas;
        return 0;
      })
      .slice(0, 10);

    // Build compact analysis summary for Claude
    const analysisSummary = {
      accountMetrics: {
        totalSpend: metrics.totalSpend,
        totalImpressions: metrics.totalImpressions,
        totalClicks: metrics.totalClicks,
        totalResults: metrics.totalResults,
        totalRevenue: metrics.totalRevenue,
        avgCtr: metrics.ctr,
        avgCpc: metrics.cpc,
        avgCpa: metrics.cpa,
        avgRoas: metrics.roas,
        totalCampaigns: campaignSummaries.length,
        totalRows: dataRows.length,
      },
      topCampaigns,
      worstCampaigns,
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
