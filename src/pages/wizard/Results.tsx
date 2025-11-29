import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Download, Target, Users, Lightbulb, CheckCircle2, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface BudgetAllocation {
  platform: string;
  budget: string;
  percentage: number;
  reason: string;
}

interface Campaign {
  name: string;
  budget: string;
  description: string;
  adSets?: { name: string; description: string }[];
}

interface Audience {
  label: string;
  value: string;
}

interface CreativeAngle {
  angle: string;
  description: string;
}

interface Plan {
  forecasts?: {
    sales?: string;
    cpa?: string;
    roas?: string;
  };
  budgetAllocation?: BudgetAllocation[];
  campaigns?: Campaign[];
  audiences?: Audience[];
  creativeAngles?: CreativeAngle[];
  checklist?: string[];
  summary?: string;
}

interface LocationState {
  plan?: Plan;
  userInput?: UserInput;
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const { plan, userInput } = state || {};

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
            {plan?.summary || "Here's a customized advertising plan based on your business, goals, and budget. This is your starting point - you can always adjust as you learn what works."}
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
                {plan?.forecasts?.sales || "Calculating..."}
              </p>
              <p className="text-sm text-accent-foreground/80">Sales per month</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-accent-foreground mb-1">
                {plan?.forecasts?.cpa || "Calculating..."}
              </p>
              <p className="text-sm text-accent-foreground/80">Cost per sale (CPA)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-accent-foreground mb-1">
                {plan?.forecasts?.roas || "Calculating..."}
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
            {(plan?.budgetAllocation && plan.budgetAllocation.length > 0) ? (
              plan.budgetAllocation.map((item, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{item.platform}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">{item.budget}</p>
                      <Badge variant="outline">{item.percentage}%</Badge>
                    </div>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Budget allocation will be calculated based on your goals.
              </p>
            )}
          </div>
        </Card>

        {/* Campaign Structure */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Campaign Structure
          </h2>
          <div className="space-y-4">
            {(plan?.campaigns && plan.campaigns.length > 0) ? (
              plan.campaigns.map((campaign, i) => (
                <div key={i} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{campaign.name}</p>
                    {campaign.budget && <Badge>{campaign.budget}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {campaign.description}
                  </p>
                  {campaign.adSets && campaign.adSets.length > 0 && (
                    <div className="pl-4 space-y-2 border-l-2 border-primary/30">
                      {campaign.adSets.map((adSet, j) => (
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
              <p className="text-muted-foreground text-center py-4">
                Campaign structure recommendations coming soon.
              </p>
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
            {(plan?.audiences && plan.audiences.length > 0) ? (
              plan.audiences.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="font-medium text-foreground">{item.value}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground col-span-2 text-center py-4">
                Audience targeting will be based on your customer profile.
              </p>
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
            {(plan?.creativeAngles && plan.creativeAngles.length > 0) ? (
              plan.creativeAngles.map((item, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-medium text-foreground mb-1">{item.angle}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Creative suggestions will be tailored to your business.
              </p>
            )}
          </div>
        </Card>

        {/* Setup Checklist */}
        <Card className="p-6">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Setup Checklist
          </h2>
          <div className="space-y-2">
            {(plan?.checklist && plan.checklist.length > 0) ? (
              plan.checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-5 w-5 rounded border-2 border-border flex-shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Setup checklist will be generated based on your plan.
              </p>
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
