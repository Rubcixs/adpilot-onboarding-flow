import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Download, Target, Users, Lightbulb, CheckCircle2, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

interface UserInput {
  businessName?: string;
  businessType?: string;
  country?: string;
  goal?: string;
  priority?: string;
  customer?: string;
  customCustomer?: string;
  offer?: string;
  customOffer?: string;
  productPrice?: number;
  monthlyBudget?: number | string;
  expectedResults?: number | string;
  experience?: string;
}

interface LocationState {
  plan?: any; // Raw API response from Claude
  userInput?: UserInput;
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const { plan, userInput } = state || {};

  // Parse the raw AI response to extract the actual data
  const aiData = useMemo(() => {
    if (!plan) return null;
    
    try {
      // Handle raw Claude API response format
      const aiResponseString = plan?.content?.[0]?.text || (typeof plan === 'string' ? plan : JSON.stringify(plan));
      
      // Clean up markdown code blocks if present
      const cleanJson = aiResponseString
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      const parsed = JSON.parse(cleanJson);
      console.log("Parsed AI Data:", parsed);
      return parsed;
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.log("Raw plan object:", plan);
      return null;
    }
  }, [plan]);

  // Handle missing data
  if (!plan || !userInput) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">
            No Plan Data Found
          </h2>
          <p className="text-muted-foreground mb-6">
            It looks like you haven't completed the wizard yet. Please start from the beginning to generate your media plan.
          </p>
          <Button onClick={() => navigate("/wizard/step1")}>
            Start Wizard
          </Button>
        </Card>
      </div>
    );
  }

  const formatBudget = (budget: number | string | undefined) => {
    if (budget === undefined || budget === "not-sure") return "Not specified";
    if (typeof budget === "number") return `$${budget.toLocaleString()}/month`;
    return budget;
  };

  // Extract data with fallbacks for different key casings
  const forecasts = aiData?.Forecasts || aiData?.forecasts || {};
  const campaignStructure = aiData?.Campaign_Structure || aiData?.campaign_structure || aiData?.campaigns || [];
  const targeting = aiData?.Targeting_Rules || aiData?.Targeting || aiData?.targeting || aiData?.audiences || [];
  const budgetAllocation = aiData?.Budget_Allocation || aiData?.budget_allocation || aiData?.budgetAllocation || [];
  const creativeAngles = aiData?.Creative_Angles || aiData?.creative_angles || aiData?.creativeAngles || [];
  const checklist = aiData?.Checklist || aiData?.checklist || aiData?.setup_checklist || [];
  const summary = aiData?.Summary || aiData?.summary || aiData?.overview || "";

  // Default budget allocation if not provided
  const defaultBudgetAllocation = [
    { platform: "Prospecting Campaigns", budget: "70%", percentage: 70, reason: "Find new customers" },
    { platform: "Retargeting Campaigns", budget: "30%", percentage: 30, reason: "Convert warm audiences" },
  ];

  const displayBudgetAllocation = budgetAllocation.length > 0 ? budgetAllocation : defaultBudgetAllocation;

  // Normalize campaign structure to array format
  const normalizedCampaigns = Array.isArray(campaignStructure) 
    ? campaignStructure 
    : typeof campaignStructure === 'string' 
      ? [{ name: "Campaign Strategy", description: campaignStructure }]
      : Object.entries(campaignStructure).map(([name, value]) => ({
          name,
          description: typeof value === 'string' ? value : JSON.stringify(value),
        }));

  // Normalize targeting to array format
  const normalizedAudiences = Array.isArray(targeting)
    ? targeting.map((item: any) => 
        typeof item === 'string' 
          ? { label: "Audience", value: item }
          : { label: item.label || item.name || "Audience", value: item.value || item.description || JSON.stringify(item) }
      )
    : typeof targeting === 'object'
      ? Object.entries(targeting).map(([label, value]) => ({
          label,
          value: typeof value === 'string' ? value : JSON.stringify(value),
        }))
      : [];

  // Normalize creative angles
  const normalizedCreatives = Array.isArray(creativeAngles)
    ? creativeAngles.map((item: any) =>
        typeof item === 'string'
          ? { angle: item, description: "" }
          : { angle: item.angle || item.name || item.title || "Creative", description: item.description || item.detail || "" }
      )
    : [];

  // Normalize checklist
  const normalizedChecklist = Array.isArray(checklist)
    ? checklist.map((item: any) => typeof item === 'string' ? item : item.task || item.item || JSON.stringify(item))
    : [];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
              <span className="text-xl font-display font-semibold text-foreground">
                AdPilot
              </span>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Success Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-accent/20 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Your Media Plan is Ready!
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {summary || "Here's a customized advertising plan based on your business, goals, and budget. This is your starting point - you can always adjust as you learn what works."}
          </p>
        </div>

        {/* Business Summary */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Business Summary
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Business Type</p>
              <p className="font-medium text-foreground">
                {userInput.businessType || "Not specified"}
                {userInput.businessName && ` (${userInput.businessName})`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Main Goal</p>
              <p className="font-medium text-foreground">{userInput.goal || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Target Market</p>
              <p className="font-medium text-foreground">{userInput.country || "Not specified"}</p>
            </div>
          </div>
        </Card>

        {/* Estimated Results */}
        <Card className="p-6 mb-6 bg-gradient-accent border-accent">
          <h2 className="font-display font-semibold text-accent-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estimated Monthly Results
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-accent-foreground mb-1">
                {forecasts.conversions || forecasts.sales || forecasts.Conversions || forecasts.Sales || "25-50"}
              </p>
              <p className="text-sm text-accent-foreground/80">
                {userInput.goal === "More leads" ? "Leads per month" : "Sales per month"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-accent-foreground mb-1">
                {forecasts.cpa || forecasts.CPA || forecasts.cost_per_result || "$20-40"}
              </p>
              <p className="text-sm text-accent-foreground/80">
                {userInput.goal === "More leads" ? "Cost per lead" : "Cost per sale (CPA)"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-accent-foreground mb-1">
                {forecasts.roas || forecasts.ROAS || forecasts.return_on_ad_spend || "2-4x"}
              </p>
              <p className="text-sm text-accent-foreground/80">Return on ad spend</p>
            </div>
          </div>
          <p className="text-xs text-accent-foreground/70 text-center mt-4">
            * Estimates based on industry benchmarks for {userInput.businessType || "your industry"}
          </p>
        </Card>

        {/* Budget Allocation */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Recommended Budget Allocation ({formatBudget(userInput.monthlyBudget)})
          </h2>
          <div className="space-y-3">
            {displayBudgetAllocation.map((item: any, i: number) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{item.platform || item.name || item.channel}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.reason || item.description || ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">{item.budget || `${item.percentage}%`}</p>
                    <Badge variant="outline">{item.percentage || 50}%</Badge>
                  </div>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${item.percentage || 50}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Campaign Structure */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Campaign Structure
          </h2>
          <div className="space-y-4">
            {normalizedCampaigns.length > 0 ? (
              normalizedCampaigns.map((campaign: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{campaign.name || campaign.title || `Campaign ${i + 1}`}</p>
                    {campaign.budget && <Badge>{campaign.budget}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {campaign.description || campaign.objective || campaign.goal || ""}
                  </p>
                  {campaign.adSets && campaign.adSets.length > 0 && (
                    <div className="pl-4 space-y-2 border-l-2 border-primary/30">
                      {campaign.adSets.map((adSet: any, j: number) => (
                        <div key={j} className="text-sm">
                          <p className="font-medium text-foreground">{adSet.name}</p>
                          <p className="text-xs text-muted-foreground">{adSet.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium text-foreground">Prospecting Campaign (70%)</p>
                  <p className="text-sm text-muted-foreground">Find new customers using interest and lookalike targeting</p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="font-medium text-foreground">Retargeting Campaign (30%)</p>
                  <p className="text-sm text-muted-foreground">Re-engage website visitors and warm audiences</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Audiences */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Target Audiences
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {normalizedAudiences.length > 0 ? (
              normalizedAudiences.map((item: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="font-medium text-foreground">{item.value}</p>
                </div>
              ))
            ) : (
              <>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Primary Audience</p>
                  <p className="font-medium text-foreground">{userInput.customer || "Based on your customer profile"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Location</p>
                  <p className="font-medium text-foreground">{userInput.country || "Your target market"}</p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Creative Angles */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            Creative Angles & Concepts
          </h2>
          <div className="space-y-3">
            {normalizedCreatives.length > 0 ? (
              normalizedCreatives.map((item: any, i: number) => (
                <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium text-foreground mb-1">{item.angle}</p>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                </div>
              ))
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium text-foreground mb-1">Problem/Solution</p>
                  <p className="text-sm text-muted-foreground">Address customer pain points and show your solution</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium text-foreground mb-1">Social Proof</p>
                  <p className="text-sm text-muted-foreground">Showcase testimonials and customer results</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium text-foreground mb-1">Limited Offer</p>
                  <p className="text-sm text-muted-foreground">Create urgency with time-limited promotions</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Setup Checklist */}
        <Card className="p-6">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Setup Checklist
          </h2>
          <div className="space-y-2">
            {normalizedChecklist.length > 0 ? (
              normalizedChecklist.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-5 w-5 rounded border-2 border-border flex-shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))
            ) : (
              <>
                {[
                  "Create your ad account (Meta Business Manager)",
                  "Install tracking pixel on your website",
                  "Set up conversion tracking",
                  "Prepare 3-5 ad creative variations",
                  "Write compelling ad copy",
                  "Set up your target audiences",
                  "Launch with a small test budget first",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-5 w-5 rounded border-2 border-border flex-shrink-0" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button size="lg" className="gap-2" onClick={() => navigate("/")}>
            <CheckCircle2 className="h-5 w-5" />
            Got It - Let's Start!
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Ready to launch? Start implementing your plan today!
          </p>
        </div>
      </main>
    </div>
  );
};

export default Results;
