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

    // Direct column name mapping - use exact names from CSV
    function getColIndex(name: string): number | null {
      const idx = columnNames.indexOf(name);
      return idx >= 0 ? idx : null;
    }

    const spendCol = getColIndex("Amount spent (EUR)");
    const impressionsCol = getColIndex("Impressions");
    const clicksCol = getColIndex("Clicks (all)");
    const resultsCol = getColIndex("Purchases");
    const revenueCol = getColIndex("Purchases conversion value");

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
      
      if (hasSpend) totalSpend += toNumber(row[spendCol!]);
      if (hasImpressions) totalImpressions += toNumber(row[impressionsCol!]);
      if (hasClicks) totalClicks += toNumber(row[clicksCol!]);
      if (hasResults) totalResults += toNumber(row[resultsCol!]);
      if (hasRevenue) totalRevenue += toNumber(row[revenueCol!]);
    }

    // Compute derived metrics
    const metrics = {
      totalSpend: hasSpend ? round(totalSpend, 2) : null,
      totalImpressions: hasImpressions ? totalImpressions : null,
      totalClicks: hasClicks ? totalClicks : null,
      totalResults: hasResults ? totalResults : null,
      totalRevenue: hasRevenue ? round(totalRevenue, 2) : null,
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

// Parse a string to number, handling EU and US formats, thousand separators, currency
function toNumber(value: any): number {
  if (value === null || value === undefined || value === '' || value === '-') return 0;
  if (typeof value === 'number') return value;
  let s = String(value).trim();
  // Remove spaces, currency symbols
  s = s.replace(/\s/g, '').replace(/[€$]/g, '');
  // Handle EU format: 1.234,56 -> remove dots, replace comma with dot
  if (s.includes(',') && s.includes('.')) {
    // If both exist, assume EU format: dots are thousand separators
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    // Only comma: could be EU decimal (123,45) or US thousand (1,234)
    // If comma is followed by exactly 2 digits at end, treat as decimal
    if (/,\d{2}$/.test(s)) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
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
