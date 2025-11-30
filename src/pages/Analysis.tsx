import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Target, Lightbulb, FileSpreadsheet, Banknote, Megaphone, Activity, ArrowRight, Users, Monitor, Calendar, Info, Smartphone, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Metrics {
  totalSpend: number | null;
  totalImpressions: number | null;
  totalClicks: number | null;
  totalPurchases: number | null;
  totalLeads: number | null;
  totalRevenue: number | null;
  ctr: number | null;
  cpc: number | null;
  cpp: number | null;
  cpl: number | null;
  cpm: number | null;
  roas: number | null;
  goal?: string;
  primaryKpiKey?: string;
  primaryKpiLabel?: string;
  primaryKpiValue?: number | null;
  resultsLabel?: string;
  resultsValue?: number | null;
}

interface InsightItem {
  title: string;
  detail: string;
}

interface AIInsights {
  insights: {
    healthScore?: number;
    quickVerdict: string;
    quickVerdictTone: "positive" | "negative" | "mixed";
    bestPerformers: { id: string; reason: string }[];
    needsAttention: { id: string; reason: string }[];
    whatsWorking: InsightItem[];
    whatsNotWorking: InsightItem[];
    deepAnalysis?: {
      funnelHealth: { status: string; title: string; description: string; metricToWatch: string };
      opportunities: { title: string; description: string }[];
      moneyWasters: { title: string; description: string }[];
      creativeFatigue: { title: string; description: string }[];
    };
    segmentAnalysis?: {
      demographics: { title: string; finding: string };
      placement: { title: string; finding: string };
      time: { title: string; finding: string };
    } | null;
  };
}


interface LocationState {
  rowCount?: number;
  columnNames?: string[];
  platform?: string;
  dataLevel?: string;
  metrics?: Metrics;
  aiInsights?: AIInsights | null;
  aiInsightsError?: string | null;
}

// Formatting helpers
const formatCurrency = (value: number | null): string => {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number | null): string => {
  if (value === null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

const formatPercent = (value: number | null): string => {
  if (value === null) return "—";
  return `${value.toFixed(2)}%`;
};

const formatRoas = (value: number | null): string => {
  if (value === null) return "—";
  return `${value.toFixed(2)}x`;
};

const formatPrimaryKpi = (value: number | null, kpiKey?: string): string => {
  if (value === null || value === undefined) return "—";
  
  // Currency format for cost metrics
  if (kpiKey === "cpl" || kpiKey === "cpp" || kpiKey === "cpc" || kpiKey === "cpm") {
    return formatCurrency(value);
  }
  
  // ROAS as plain number
  if (kpiKey === "roas") {
    return value.toFixed(2);
  }
  
  // Default: number with 2 decimals
  return value.toFixed(2);
};

const Analysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const metrics = state?.metrics;
  const aiInsights = state?.aiInsights;
  const aiInsightsError = state?.aiInsightsError;
  
  // Use insights directly from navigation state
  const insights = aiInsights?.insights;
  const hasAiInsights = !!insights;
  const whatsWorking = insights?.whatsWorking || [];
  const whatsNotWorking = insights?.whatsNotWorking || [];

  // Format primary KPI for display (simple version without Campaign type)

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
              <span className="text-xl font-display font-semibold text-foreground">
                AdPilot
              </span>
            </div>
            <Button variant="outline">Export Report</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Performance Analysis
          </h1>
          <p className="text-muted-foreground">
            {state?.platform || "Meta Ads"} • {state?.dataLevel || "Campaign Level"} • Last 30 days
          </p>
        </div>

        {/* CSV Summary Card */}
        {state?.rowCount !== undefined && state?.columnNames && (
          <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  CSV Data Summary
                </h3>
                <p className="text-foreground mb-1">
                  <span className="text-muted-foreground">Total rows:</span>{" "}
                  <span className="font-semibold">{state.rowCount}</span>
                </p>
                <p className="text-foreground">
                  <span className="text-muted-foreground">Columns:</span>{" "}
                  <span className="font-medium">{state.columnNames.join(", ")}</span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Debug Metrics Card */}
        {metrics && (
          <Card className="p-6 mb-6 bg-muted/30 border-muted">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground mb-3">
                  Debug Metrics
                </h3>
                <pre className="text-xs font-mono whitespace-pre-wrap bg-background/50 p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Spend</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {formatCurrency(metrics?.totalSpend ?? null)}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  {metrics?.primaryKpiLabel || "Primary KPI"}
                </p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {formatPrimaryKpi(
                    metrics?.primaryKpiValue ?? (metrics?.primaryKpiKey ? (metrics as any)[metrics.primaryKpiKey] : null),
                    metrics?.primaryKpiKey
                  )}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  {metrics?.roas !== null && metrics?.roas !== undefined
                    ? "ROAS"
                    : metrics?.resultsLabel || "Results"}
                </p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {metrics?.roas !== null && metrics?.roas !== undefined
                    ? formatRoas(metrics.roas)
                    : metrics?.resultsValue !== null && metrics?.resultsValue !== undefined
                    ? formatNumber(metrics.resultsValue)
                    : "—"}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">CTR</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {formatPercent(metrics?.ctr ?? null)}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Impressions</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {formatNumber(metrics?.totalImpressions ?? null)}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Clicks</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {formatNumber(metrics?.totalClicks ?? null)}
                </p>
              </Card>
            </div>

            {/* Health Score & Verdict */}
            <Card className="p-6 border-l-4 border-l-primary relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Score Circle (Clean, no icon) */}
                <div className="relative flex-shrink-0">
                  <div className={`h-24 w-24 rounded-full flex items-center justify-center border-4 text-3xl font-bold font-display
                    ${(insights?.healthScore || 0) >= 80 ? 'border-green-500 text-green-600' : 
                      (insights?.healthScore || 0) >= 50 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'}`}>
                    {insights?.healthScore ?? "?"}
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background px-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Score
                    </span>
                  </div>
                </div>
                
                {/* Text Section with Icon next to Badge */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">AI Verdict</h3>
                    
                    {/* Status Badge */}
                    {insights?.quickVerdictTone === 'positive' && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Healthy</Badge>}
                    {insights?.quickVerdictTone === 'mixed' && <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Stable</Badge>}
                    {insights?.quickVerdictTone === 'negative' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Critical</Badge>}

                    {/* Info Icon & Tooltip */}
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center justify-center rounded-full hover:bg-muted/50 p-1 transition-colors">
                            <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="start" className="w-[300px] sm:w-[400px] p-4 text-sm bg-popover border shadow-xl z-50">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-base border-b pb-2">How is this calculated?</h4>
                            <p className="text-muted-foreground">The Health Score (0-100) is an AI-weighted metric based on:</p>
                            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                              <li><strong>Efficiency (40%):</strong> comparing your ROAS/CPA against industry benchmarks.</li>
                              <li><strong>Funnel Health (30%):</strong> analyzing the drop-off from Click to Purchase.</li>
                              <li><strong>Consistency (30%):</strong> checking for stability in results over time.</li>
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <p className="text-foreground/80 leading-relaxed text-lg">
                    {insights?.quickVerdict || "Waiting for analysis..."}
                  </p>
                </div>
              </div>
            </Card>

            {/* Best & Worst Performers */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Best Performers
                </h3>
                <div className="space-y-3">
                  {insights?.bestPerformers?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium text-foreground">{item.id}</span>
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                        {item.reason}
                      </Badge>
                    </div>
                  ))}
                  {!insights?.bestPerformers?.length && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No specific top performers identified.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-warning" />
                  Needs Attention
                </h3>
                <div className="space-y-3">
                  {insights?.needsAttention?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium text-foreground">{item.id}</span>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        {item.reason}
                      </Badge>
                    </div>
                  ))}
                  {!insights?.needsAttention?.length && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No campaigns need attention.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab - Deep Dive Dashboard */}
          <TabsContent value="insights" className="space-y-6">
            {!hasAiInsights ? (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-2">
                      {aiInsightsError ? "Failed to Load Insights" : "Analyzing Data..."}
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      {aiInsightsError || "Please wait while we generate your deep dive analysis."}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                {/* MAIN DEEP DIVE - Always show if deepAnalysis exists */}
                {insights?.deepAnalysis ? (
                  <>
                    {/* 1. Funnel Health */}
                    {insights.deepAnalysis.funnelHealth && (
                      <Card className={`p-6 border-l-4 ${
                        insights.deepAnalysis.funnelHealth.status === 'Broken' 
                          ? 'border-l-destructive' 
                          : insights.deepAnalysis.funnelHealth.status === 'Warning' 
                          ? 'border-l-warning' 
                          : 'border-l-accent'
                      }`}>
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Activity className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-display font-semibold text-foreground">
                                {insights.deepAnalysis.funnelHealth.title}
                              </h3>
                              <Badge variant={
                                insights.deepAnalysis.funnelHealth.status === 'Broken' 
                                  ? 'destructive' 
                                  : 'default'
                              }>
                                {insights.deepAnalysis.funnelHealth.status}
                              </Badge>
                            </div>
                            <p className="text-foreground leading-relaxed mb-3">
                              {insights.deepAnalysis.funnelHealth.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md w-fit">
                              <Target className="h-4 w-4" />
                              <span>Fix Metric: <strong>{insights.deepAnalysis.funnelHealth.metricToWatch}</strong></span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* SEGMENT / PATTERN ANALYSIS */}
                    {insights.segmentAnalysis && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        
                        {/* Demographics Card */}
                        <Card className="p-5 border-l-4 border-l-purple-500 bg-purple-50/5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                              <Users className="h-5 w-5" />
                            </div>
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Demographics</h4>
                          </div>
                          <p className="font-medium text-foreground text-sm leading-relaxed">
                            {insights.segmentAnalysis.demographics.finding}
                          </p>
                        </Card>

                        {/* Placement Card */}
                        <Card className="p-5 border-l-4 border-l-blue-500 bg-blue-50/5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                              <Smartphone className="h-5 w-5" />
                            </div>
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Placement</h4>
                          </div>
                          <p className="font-medium text-foreground text-sm leading-relaxed">
                            {insights.segmentAnalysis.placement.finding}
                          </p>
                        </Card>

                        {/* Time Card */}
                        <Card className="p-5 border-l-4 border-l-orange-500 bg-orange-50/5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                              <CalendarClock className="h-5 w-5" />
                            </div>
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Best Time</h4>
                          </div>
                          <p className="font-medium text-foreground text-sm leading-relaxed">
                            {insights.segmentAnalysis.time.finding}
                          </p>
                        </Card>
                        
                      </div>
                    )}

                    {/* 2. Financial Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Opportunities */}
                      <Card className="p-6">
                        <h3 className="font-display font-semibold text-accent mb-4 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Profit Opportunities
                        </h3>
                        <div className="space-y-3">
                          {insights.deepAnalysis.opportunities?.map((item, i) => (
                            <div key={i} className="bg-accent/5 p-3 rounded-lg border border-accent/20">
                              <p className="font-medium text-foreground text-sm mb-1">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                          ))}
                          {(!insights.deepAnalysis.opportunities || insights.deepAnalysis.opportunities.length === 0) && (
                            <p className="text-sm text-muted-foreground">No specific opportunities found.</p>
                          )}
                        </div>
                      </Card>

                      {/* Money Wasters */}
                      <Card className="p-6">
                        <h3 className="font-display font-semibold text-destructive mb-4 flex items-center gap-2">
                          <Banknote className="h-5 w-5" />
                          Budget Leaks
                        </h3>
                        <div className="space-y-3">
                          {insights.deepAnalysis.moneyWasters?.map((item, i) => (
                            <div key={i} className="bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                              <p className="font-medium text-foreground text-sm mb-1">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                          ))}
                          {(!insights.deepAnalysis.moneyWasters || insights.deepAnalysis.moneyWasters.length === 0) && (
                            <p className="text-sm text-muted-foreground">Budget spend looks efficient.</p>
                          )}
                        </div>
                      </Card>
                    </div>

                    {/* 3. Creative Fatigue */}
                    {insights.deepAnalysis.creativeFatigue && insights.deepAnalysis.creativeFatigue.length > 0 && (
                      <Card className="p-6 border-warning/50 bg-warning/5">
                        <h3 className="font-display font-semibold text-warning mb-4 flex items-center gap-2">
                          <Megaphone className="h-5 w-5" />
                          Creative Fatigue Warnings
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {insights.deepAnalysis.creativeFatigue.map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="h-2 w-2 mt-2 rounded-full bg-warning flex-shrink-0" />
                              <div>
                                <p className="font-medium text-foreground text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center border rounded-xl bg-muted/20">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-foreground font-medium">Detailed deep dive could not be generated from this data.</p>
                    <p className="text-sm text-muted-foreground mt-1">The AI may need more complete metrics to generate insights.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-accent" />
                Quick Wins
              </h3>
              <div className="space-y-4">
                {[
                  {
                    title: "Increase retargeting budget by 30%",
                    impact: "High",
                    effort: "Low",
                    description: "Your retargeting campaigns have the highest ROAS. Reallocate budget from underperforming broad campaigns."
                  },
                  {
                    title: "Pause or refresh static image ads",
                    impact: "Medium",
                    effort: "Low",
                    description: "Static creatives showing ad fatigue. Either create new variations or shift budget to video."
                  },
                  {
                    title: "Add mobile-specific landing pages",
                    impact: "High",
                    effort: "Medium",
                    description: "Mobile traffic is strong but could convert better with optimized mobile landing experiences."
                  },
                ].map((rec, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-foreground">{rec.title}</p>
                      <div className="flex gap-2">
                        <Badge className="bg-accent/10 text-accent border-accent/20">
                          Impact: {rec.impact}
                        </Badge>
                        <Badge variant="outline">
                          Effort: {rec.effort}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">
                Structural Changes
              </h3>
              <div className="space-y-4">
                {[
                  {
                    title: "Implement audience exclusions to reduce overlap",
                    impact: "High",
                    effort: "Medium",
                    description: "Prevent your retargeting and prospecting campaigns from competing for the same users."
                  },
                  {
                    title: "Create lookalike audiences from best customers",
                    impact: "High",
                    effort: "Medium",
                    description: "Build 1-2% lookalikes from your highest LTV customers to improve cold acquisition efficiency."
                  },
                ].map((rec, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-foreground">{rec.title}</p>
                      <div className="flex gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          Impact: {rec.impact}
                        </Badge>
                        <Badge variant="outline">
                          Effort: {rec.effort}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">
                Creative Ideas & Tests
              </h3>
              <div className="space-y-4">
                {[
                  {
                    title: "Test user-generated content (UGC) style videos",
                    impact: "Medium",
                    effort: "High",
                    description: "Authentic, UGC-style content often outperforms polished brand content, especially on TikTok and Instagram."
                  },
                  {
                    title: "A/B test different video lengths (15s vs 30s vs 60s)",
                    impact: "Medium",
                    effort: "Medium",
                    description: "Find the optimal video length for your audience and placement mix."
                  },
                ].map((rec, i) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-foreground">{rec.title}</p>
                      <div className="flex gap-2">
                        <Badge className="bg-secondary/50 text-foreground">
                          Impact: {rec.impact}
                        </Badge>
                        <Badge variant="outline">
                          Effort: {rec.effort}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Raw Data Tab */}
          <TabsContent value="raw">
            <Card className="p-6">
              <div className="p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display font-semibold text-foreground mb-2">
                  Raw Data Viewer
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Detailed row-by-row data will be displayed here in a future update. For now, review the Overview and Insights tabs for your analysis.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analysis;
