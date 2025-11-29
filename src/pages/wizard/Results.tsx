import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, Target, Users, Lightbulb, CheckCircle2, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Results = () => {
  const navigate = useNavigate();

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
            Here's a customized advertising plan based on your business, goals, and budget. 
            This is your starting point - you can always adjust as you learn what works.
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
              <p className="font-medium text-foreground">E-commerce (Organic Skincare)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Main Goal</p>
              <p className="font-medium text-foreground">More Sales</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Target Market</p>
              <p className="font-medium text-foreground">United States</p>
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
              <p className="text-3xl font-display font-bold text-accent-foreground mb-1">35-65</p>
              <p className="text-sm text-accent-foreground/80">Sales per month</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-accent-foreground mb-1">$25-40</p>
              <p className="text-sm text-accent-foreground/80">Cost per sale (CPA)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-accent-foreground mb-1">2.5-4x</p>
              <p className="text-sm text-accent-foreground/80">Return on ad spend</p>
            </div>
          </div>
          <p className="text-xs text-accent-foreground/70 text-center mt-4">
            * Estimates based on industry benchmarks for organic skincare e-commerce
          </p>
        </Card>

        {/* Budget Allocation */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Recommended Budget Allocation ($2,000/month)
          </h2>
          <div className="space-y-3">
            {[
              { platform: "Meta Ads (Facebook/Instagram)", budget: "$1,200", percentage: 60, reason: "Best for e-commerce visual products" },
              { platform: "Google Shopping Ads", budget: "$600", percentage: 30, reason: "High-intent product searches" },
              { platform: "TikTok Ads", budget: "$200", percentage: 10, reason: "Test platform for younger audience" },
            ].map((item, i) => (
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
            ))}
          </div>
        </Card>

        {/* Campaign Structure */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Campaign Structure (Meta Ads Example)
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-foreground">Campaign 1: Prospecting</p>
                <Badge>$720/month (60%)</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Find new customers interested in organic skincare
              </p>
              <div className="pl-4 space-y-2 border-l-2 border-primary/30">
                <div className="text-sm">
                  <p className="font-medium text-foreground">Ad Set: Lookalike Audiences</p>
                  <p className="text-xs text-muted-foreground">Based on website visitors & existing customers</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground">Ad Set: Interest Targeting</p>
                  <p className="text-xs text-muted-foreground">Skincare, organic beauty, wellness interests</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-foreground">Campaign 2: Retargeting</p>
                <Badge>$480/month (40%)</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Re-engage people who visited your site
              </p>
              <div className="pl-4 space-y-2 border-l-2 border-accent/30">
                <div className="text-sm">
                  <p className="font-medium text-foreground">Ad Set: Cart Abandoners</p>
                  <p className="text-xs text-muted-foreground">Dynamic product ads with 10% discount offer</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground">Ad Set: Product Viewers</p>
                  <p className="text-xs text-muted-foreground">Remind them about products they viewed</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Audiences */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Target Audiences
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: "Age Range", value: "25-45 years old" },
              { label: "Gender", value: "All genders (slight female skew expected)" },
              { label: "Interests", value: "Organic products, skincare, wellness, sustainability" },
              { label: "Behaviors", value: "Online shoppers, engaged beauty buyers" },
              { label: "Income", value: "Middle to upper-middle class" },
              { label: "Device", value: "Mobile-first (70% mobile, 30% desktop)" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Creative Angles */}
        <Card className="p-6 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            Creative Angles & Concepts
          </h2>
          <div className="space-y-3">
            {[
              {
                angle: "Before/After Results",
                description: "Show real customer transformations with your products. Video testimonials work great here.",
              },
              {
                angle: "Ingredient Education",
                description: "Highlight the natural, organic ingredients and their benefits. Appeal to conscious consumers.",
              },
              {
                angle: "Problem/Solution",
                description: "Address common skin concerns (dry skin, aging, etc.) and position your products as the solution.",
              },
              {
                angle: "Lifestyle & Values",
                description: "Showcase the lifestyle and values your brand represents - sustainability, self-care, natural beauty.",
              },
              {
                angle: "Limited Offers",
                description: "Use urgency with limited-time bundles, seasonal offers, or first-purchase discounts.",
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="font-medium text-foreground mb-1">{item.angle}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Setup Checklist */}
        <Card className="p-6">
          <h2 className="font-display font-semibold text-foreground mb-4">
            Setup Checklist
          </h2>
          <div className="space-y-2">
            {[
              "Install Meta Pixel on your website",
              "Set up conversion tracking for purchases",
              "Create business accounts on Meta & Google",
              "Prepare 5-10 ad creatives (images/videos)",
              "Write 3-5 ad copy variations",
              "Set up retargeting audiences",
              "Create lookalike audiences from existing data",
              "Set daily budgets and campaign limits",
              "Plan your first week of testing",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-5 w-5 rounded border-2 border-border flex-shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
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
