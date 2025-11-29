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
      const name = String(row[nameCol] ?? "").trim();
      if (!name) return false;   // no name -> summary / total row

      // Optional extra guard: if spendCol exists and is 0, we can also drop it
      if (spendCol) {
        const spend = toNumber(row[spendCol]);
        // Uncomment next line if you want to drop pure zero rows:
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

    // Collect sample rows (first 10) for AI analysis - only key columns to reduce token usage
    const keyColumns = [
      "Campaign name", "Ad set name", "Ad name",
      "Amount spent (EUR)", "Impressions", "Clicks (all)",
      "CTR (all)", "CPC (all) (EUR)", "Purchases", "Purchases conversion value"
    ];
    const availableKeyColumns = keyColumns.filter(col => columnNames.includes(col));
    const sampleRows = dataRows.slice(0, 10).map(row => {
      const sample: Record<string, string> = {};
      availableKeyColumns.forEach(col => {
        sample[col] = row[col] || '';
      });
      return sample;
    });

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
        
        const userMessage = JSON.stringify({
          metrics,
          columnNames,
          sampleRows,
          rowCount
        });

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
              // Parse the JSON response from Claude
              aiInsights = JSON.parse(textContent);
              console.log('AI insights parsed successfully');
            } catch (parseError: any) {
              aiInsightsError = `JSON parse error: ${parseError?.message || 'Invalid JSON from Claude'}`;
              console.error('Claude insights error:', aiInsightsError);
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
