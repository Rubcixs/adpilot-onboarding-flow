import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Download, Target, Users, Lightbulb, CheckCircle2, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState } from "react";

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
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  
  // Try multiple possible locations for userInput
  const plan = state?.plan;
  const userInput = state?.userInput || (state as any)?.completeData || {};
  
  // Robust data access with fail-safes
  const budget = typeof userInput?.monthlyBudget === 'number' ? userInput.monthlyBudget : 0;
  const hasBudget = budget > 0;
  
  console.log("Location state:", state);
  console.log("User Input:", userInput);
  console.log("Budget:", budget, "Has Budget:", hasBudget);

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

  // Get currency symbol based on country
  const getCurrencySymbol = (country: string | undefined) => {
    const euroCountries = ["Germany", "France", "Spain", "Italy", "Netherlands", "Belgium", "Austria", "Portugal", "Ireland", "Finland", "Greece", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "PT", "IE", "FI", "GR"];
    const gbpCountries = ["United Kingdom", "UK", "GB"];
    
    if (euroCountries.some(c => country?.toLowerCase().includes(c.toLowerCase()))) return "€";
    if (gbpCountries.some(c => country?.toLowerCase().includes(c.toLowerCase()))) return "£";
    return "$";
  };

  const currencySymbol = getCurrencySymbol(userInput?.country);

  const formatBudget = (budget: number | string | undefined) => {
    if (budget === undefined || budget === "not-sure") return null; // Return null to hide from header
    if (typeof budget === "number") return `${currencySymbol}${budget.toLocaleString()}/month`;
    return budget;
  };

  const formatCurrency = (value: string | number | undefined) => {
    if (!value) return null;
    const numStr = String(value).replace(/[^0-9.-]/g, "");
    const num = parseFloat(numStr);
    if (isNaN(num)) return value;
    return `${currencySymbol}${num.toLocaleString()}`;
  };

  // Extract data with fallbacks for different key casings
  const forecasts = aiData?.Forecasts || aiData?.forecasts || {};
  const campaignStructure = aiData?.Campaign_Structure || aiData?.campaign_structure || aiData?.campaigns || [];
  const targeting = aiData?.Targeting_Rules || aiData?.Targeting || aiData?.targeting || aiData?.audiences || [];
  const budgetAllocation = aiData?.Budget_Allocation || aiData?.budget_allocation || aiData?.budgetAllocation || [];
  const creativeAngles = aiData?.Creative_Plan || aiData?.creative_plan || aiData?.Creative_Angles || aiData?.creative_angles || aiData?.creativeAngles || [];
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
          : { 
              angle: item.angle || item.name || item.title || item.concept || "Creative", 
              description: item.description || item.detail || item.explanation || item.hook || item.message || "" 
            }
      )
    : [];

  // Normalize checklist
  const normalizedChecklist = Array.isArray(checklist)
    ? checklist.map((item: any) => typeof item === 'string' ? item : item.task || item.item || JSON.stringify(item))
    : [];

  // Download Launch Brief as detailed text file
  const handleDownloadStrategy = () => {
    const roadmap = aiData?.Execution_Roadmap || aiData?.execution_roadmap || aiData?.roadmap || aiData?.Roadmap || [];
    const executionSteps = Array.isArray(roadmap) 
      ? roadmap.map((step: any) => `[ ] ${typeof step === 'string' ? step : step.step || step.title || step.action || JSON.stringify(step)}`).join('\n    ')
      : 'See dashboard for steps';

    const creativeStrategy = normalizedCreatives.length > 0
      ? normalizedCreatives.map((c: any) => `\n    * Angle: ${c.angle}\n      Why: ${c.description}`).join('')
      : '\n    * Angle: Problem/Solution\n      Why: Address customer pain points directly\n    * Angle: Social Proof\n      Why: Showcase testimonials and results';

    const budgetBreakdown = displayBudgetAllocation.map((item: any) => {
      const percentage = item.percentage || 50;
      const amount = hasBudget ? Math.round((percentage / 100) * budget) : null;
      const platformName = item.platform || item.name || item.channel || 'Campaign';
      return `    - ${platformName}: ${percentage}% (approx. ${amount ? `${currencySymbol}${amount}` : 'TBD'})`;
    }).join('\n');

    const targetingInfo = aiData?.Targeting || aiData?.targeting || {};
    const primaryTarget = typeof targetingInfo === 'object' && !Array.isArray(targetingInfo) 
      ? targetingInfo.primary || targetingInfo.focus || 'Broad targeting recommended'
      : normalizedAudiences[0]?.value || 'Broad targeting';
    const exclusions = typeof targetingInfo === 'object' && !Array.isArray(targetingInfo)
      ? targetingInfo.exclusions || targetingInfo.exclude || 'Past purchasers (30 days)'
      : 'Past purchasers (30 days)';

    const checklistItems = (normalizedChecklist.length > 0 ? normalizedChecklist : [
      "Create your ad account (Meta Business Manager)",
      "Install tracking pixel on your website",
      "Set up conversion tracking",
      "Prepare 3-5 ad creative variations",
      "Write compelling ad copy",
      "Set up your target audiences",
      "Launch with a small test budget first",
    ]).map((item: string) => `    [ ] ${item}`).join('\n');

    const content = `
🚀 ADPILOT LAUNCH BRIEF
========================
Generated for: ${userInput?.businessName || userInput?.businessType || 'My Business'}
Target Market: ${userInput?.country || 'Global'}
Main Goal: ${userInput?.goal || 'Increase conversions'}
Total Monthly Budget: ${hasBudget ? `${currencySymbol}${budget.toLocaleString()}` : 'Not Set'}

═══════════════════════════════════════════════════════════

💰 BUDGET STRATEGY
------------------
Your budget should be split to balance growth and returns:

${budgetBreakdown}

═══════════════════════════════════════════════════════════

🎯 AUDIENCE TARGETING
---------------------
Primary Focus: ${primaryTarget}
Who to exclude: ${exclusions}

═══════════════════════════════════════════════════════════

🎨 CREATIVE ANGLES (The "Secret Sauce")
---------------------------------------
Don't just run generic ads. Test these specific concepts:
${creativeStrategy}

═══════════════════════════════════════════════════════════

📅 EXECUTION PLAN
-----------------
    ${executionSteps}

═══════════════════════════════════════════════════════════

✅ SETUP CHECKLIST
------------------
${checklistItems}

═══════════════════════════════════════════════════════════

📊 NEXT STEPS
-------------
1. Complete the setup checklist above
2. Launch with a small test budget (${hasBudget ? `${currencySymbol}${Math.round(budget * 0.2)}` : '20% of budget'}) first
3. Monitor performance for 3-5 days
4. Optimize based on initial results
5. Scale what's working

═══════════════════════════════════════════════════════════
(c) ${new Date().getFullYear()} AdPilot AI | Generated ${new Date().toLocaleDateString()}
`.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AdPilot_Launch_Brief.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
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
                {forecasts.cpa || forecasts.CPA || forecasts.cost_per_result || `${currencySymbol}20-40`}
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
            Recommended Budget Allocation{formatBudget(userInput.monthlyBudget) ? ` (${formatBudget(userInput.monthlyBudget)})` : ""}
          </h2>
          <div className="space-y-3">
            {displayBudgetAllocation.map((item: any, i: number) => {
              const percentage = item.percentage || 50;
              const allocatedAmount = hasBudget ? Math.round((percentage / 100) * budget) : null;
              return (
                <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{item.platform || item.name || item.channel}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.reason || item.description || ""}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg text-foreground">
                        {hasBudget ? formatCurrency(allocatedAmount) : `${percentage}%`}
                      </span>
                      <p className="text-xs text-muted-foreground">({percentage}% of budget)</p>
                    </div>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
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
                  <p className="font-medium text-foreground">
                    {userInput.customer === "notsure" || !userInput.customer 
                      ? "Broad Targeting (AI Recommended)" 
                      : userInput.customer}
                  </p>
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
                  <p className="font-medium text-foreground mb-1">{item.angle || item.title || item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description || item.detail || item.explanation || "Creative angle for your campaigns"}
                  </p>
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
            {(normalizedChecklist.length > 0 ? normalizedChecklist : [
              "Create your ad account (Meta Business Manager)",
              "Install tracking pixel on your website",
              "Set up conversion tracking",
              "Prepare 3-5 ad creative variations",
              "Write compelling ad copy",
              "Set up your target audiences",
              "Launch with a small test budget first",
            ]).map((item: string, i: number) => {
              const itemId = `checklist-${i}`;
              const isChecked = checkedItems.includes(itemId);
              const toggleItem = () => {
                setCheckedItems(prev => 
                  isChecked ? prev.filter(id => id !== itemId) : [...prev, itemId]
                );
              };
              return (
                <div 
                  key={i} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={toggleItem}
                >
                  <Checkbox 
                    id={itemId}
                    checked={isChecked}
                    onCheckedChange={toggleItem}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label 
                    htmlFor={itemId}
                    className={`text-sm cursor-pointer ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                  >
                    {item}
                  </label>
                </div>
              );
            })}
          </div>
          
          {/* Download Strategy Button */}
          <div className="mt-6 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={handleDownloadStrategy}
            >
              📄 Download Step-by-Step Blueprint
            </Button>
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
