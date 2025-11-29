import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Target, Lightbulb, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Metrics {
  totalSpend: number | null;
  totalImpressions: number | null;
  totalClicks: number | null;
  totalResults: number | null;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
}

interface LocationState {
  rowCount?: number;
  columnNames?: string[];
  platform?: string;
  dataLevel?: string;
  metrics?: Metrics;
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

const Analysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const metrics = state?.metrics;

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
                <p className="text-sm text-muted-foreground mb-1">CPA</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {formatCurrency(metrics?.cpa ?? null)}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">ROAS</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {formatRoas(metrics?.roas ?? null)}
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

            {/* Quick Verdict */}
            <Card className="p-6 bg-accent/5 border-accent">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    Quick Verdict
                  </h3>
                  <p className="text-foreground leading-relaxed">
                    Your campaigns are performing well overall with a strong ROAS of 3.2x. 
                    However, there's significant room for improvement in creative performance 
                    and audience targeting. Consider implementing the recommendations in the next tab.
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
                  {["Summer Sale Campaign", "New Customer Acquisition", "Retargeting - Cart Abandoners"].map((name, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                        ROAS {(4.5 - i * 0.3).toFixed(1)}x
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-warning" />
                  Needs Attention
                </h3>
                <div className="space-y-3">
                  {["Brand Awareness", "Cold Audience - Broad", "Video Views Campaign"].map((name, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        ROAS {(1.2 + i * 0.2).toFixed(1)}x
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent" />
                What's Working
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="font-medium text-foreground mb-2">
                    🎯 Retargeting campaigns show exceptional ROAS (4.5x)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cart abandoners and website visitors respond very well to retargeting with dynamic product ads.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="font-medium text-foreground mb-2">
                    📱 Mobile placements outperform desktop by 35%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Consider increasing budget allocation to mobile-first campaigns and optimizing for mobile UX.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="font-medium text-foreground mb-2">
                    🎨 Video creatives have 2.5x higher engagement
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Short-form video content (15-30s) is driving significantly better CTR and conversion rates.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                What's Not Working
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                  <p className="font-medium text-foreground mb-2">
                    ⚠️ Broad audience campaigns have high CPA ($45 avg)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cold, broad targeting is consuming budget without strong returns. Need better audience refinement.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                  <p className="font-medium text-foreground mb-2">
                    📉 Brand awareness campaign shows low conversion rate (0.8%)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Traffic from brand awareness campaigns isn't converting. Consider adjusting messaging or landing pages.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                  <p className="font-medium text-foreground mb-2">
                    🖼️ Static image ads underperforming vs video (40% lower CTR)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Static creatives are showing ad fatigue. Refresh needed or shift budget to video content.
                  </p>
                </div>
              </div>
            </Card>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-foreground">Campaign</th>
                      <th className="text-right p-3 font-medium text-foreground">Spend</th>
                      <th className="text-right p-3 font-medium text-foreground">Impressions</th>
                      <th className="text-right p-3 font-medium text-foreground">Clicks</th>
                      <th className="text-right p-3 font-medium text-foreground">CTR</th>
                      <th className="text-right p-3 font-medium text-foreground">CPA</th>
                      <th className="text-right p-3 font-medium text-foreground">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Summer Sale Campaign", "$3,200", "320K", "8,960", "2.8%", "$18.50", "4.5x"],
                      ["New Customer Acquisition", "$2,800", "420K", "10,500", "2.5%", "$22.00", "3.8x"],
                      ["Retargeting - Cart", "$1,500", "85K", "2,550", "3.0%", "$16.20", "4.2x"],
                      ["Brand Awareness", "$2,400", "580K", "11,600", "2.0%", "$45.00", "1.2x"],
                      ["Cold - Broad Targeting", "$1,800", "380K", "7,600", "2.0%", "$42.50", "1.4x"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/50">
                        <td className="p-3 text-foreground">{row[0]}</td>
                        <td className="p-3 text-right text-foreground">{row[1]}</td>
                        <td className="p-3 text-right text-muted-foreground">{row[2]}</td>
                        <td className="p-3 text-right text-muted-foreground">{row[3]}</td>
                        <td className="p-3 text-right text-muted-foreground">{row[4]}</td>
                        <td className="p-3 text-right text-muted-foreground">{row[5]}</td>
                        <td className="p-3 text-right font-medium text-foreground">{row[6]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Analysis;
