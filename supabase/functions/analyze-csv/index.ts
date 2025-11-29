import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Build normalized header map
    const headerMap: Record<string, number> = {};
    columnNames.forEach((name, idx) => {
      const normalized = normalizeHeader(name);
      headerMap[normalized] = idx;
    });

    console.log('Normalized headers:', Object.keys(headerMap).join(', '));

    // Resolve columns using normalized headers
    const spendCol = 
      headerMap['amountspent'] ??
      headerMap['amountspentall'] ??
      headerMap['amountspenteur'] ??
      headerMap['amountspentusd'] ??
      headerMap['spend'] ??
      null;

    const impressionsCol = headerMap['impressions'] ?? null;

    const clicksCol =
      headerMap['clicksall'] ??
      headerMap['linkclicksall'] ??
      headerMap['linkclicks'] ??
      headerMap['clicks'] ??
      null;

    const resultsCol =
      headerMap['purchases'] ??
      headerMap['results'] ??
      headerMap['conversions'] ??
      headerMap['leads'] ??
      headerMap['websitepurchases'] ??
      headerMap['metapurchases'] ??
      null;

    const revenueCol =
      headerMap['purchasesconvvalue'] ??
      headerMap['purchaseconvvalue'] ??
      headerMap['convvalue'] ??
      headerMap['totalconvvalue'] ??
      headerMap['websitepurchasesconvvalue'] ??
      headerMap['metapurchaseconvvalue'] ??
      headerMap['revenue'] ??
      null;

    console.log('Column indices:', { spendCol, impressionsCol, clicksCol, resultsCol, revenueCol });

    // Parse data rows and compute sums
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalResults = 0;
    let totalRevenue = 0;

    let hasSpend = spendCol !== null;
    let hasImpressions = impressionsCol !== null;
    let hasClicks = clicksCol !== null;
    let hasResults = resultsCol !== null;
    let hasRevenue = revenueCol !== null;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      
      if (hasSpend) totalSpend += parseNumber(row[spendCol!]);
      if (hasImpressions) totalImpressions += parseNumber(row[impressionsCol!]);
      if (hasClicks) totalClicks += parseNumber(row[clicksCol!]);
      if (hasResults) totalResults += parseNumber(row[resultsCol!]);
      if (hasRevenue) totalRevenue += parseNumber(row[revenueCol!]);
    }

    // Compute derived metrics
    const metrics = {
      totalSpend: hasSpend ? round(totalSpend, 2) : null,
      totalImpressions: hasImpressions ? totalImpressions : null,
      totalClicks: hasClicks ? totalClicks : null,
      totalResults: hasResults ? totalResults : null,
      ctr: (hasClicks && hasImpressions && totalImpressions > 0) 
        ? round((totalClicks / totalImpressions) * 100, 2) 
        : null,
      cpc: (hasSpend && hasClicks && totalClicks > 0) 
        ? round(totalSpend / totalClicks, 2) 
        : null,
      cpa: (hasSpend && hasResults && totalResults > 0) 
        ? round(totalSpend / totalResults, 2) 
        : null,
      roas: (hasRevenue && hasSpend && totalSpend > 0) 
        ? round(totalRevenue / totalSpend, 2) 
        : null,
    };

    console.log('Computed metrics:', metrics);

    return new Response(
      JSON.stringify({ ok: true, rowCount, columnNames, metrics }),
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

// Normalize header names to remove special characters and simplify matching
function normalizeHeader(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\(\)\[\]€$,%]/g, '')  // remove spaces, brackets, currency, % etc.
    .replace(/conversionvalue/g, 'convvalue'); // simplify some patterns
}

// Parse a string to number, handling commas and empty values
function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, '.').replace(/[^\d.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

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
