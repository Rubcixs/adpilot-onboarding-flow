import { ArrowRight, Upload, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const navigate = useNavigate();
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestClaude = async () => {
    setIsTesting(true);
    setTestResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-claude");
      if (error) throw error;
      setTestResponse(data?.message || JSON.stringify(data));
      toast.success("Claude API test successful!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setTestResponse(`Error: ${message}`);
      toast.error("Claude API test failed");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
              <span className="text-xl font-display font-semibold text-foreground">
                AdPilot
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6">
            AI-Powered Ad Planning
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get expert-level ad insights and recommendations in minutes.
            Whether you have data or not, we've got you covered.
          </p>
        </div>

        {/* Two Path Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* CSV Upload Path */}
          <Card
            className="p-8 hover:shadow-elevated transition-all duration-300 cursor-pointer group border-2 hover:border-primary"
            onClick={() => navigate("/upload")}
          >
            <div className="mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-3">
                I Have Data
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Upload your ad performance CSV from Meta, Google, TikTok, or other platforms.
                Get instant analysis, insights, and actionable recommendations.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                Performance analysis & KPIs
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                What's working & what's not
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                AI-powered recommendations
              </div>
            </div>

            <Button className="w-full group-hover:shadow-glow" size="lg">
              Analyze My Data
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>

          {/* Rookie Wizard Path */}
          <Card
            className="p-8 hover:shadow-elevated transition-all duration-300 cursor-pointer group border-2 hover:border-accent"
            onClick={() => navigate("/wizard/step-1")}
          >
            <div className="mb-6">
              <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <Sparkles className="h-7 w-7 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-3">
                I'm Just Starting
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                No historical data? No problem. Answer a few simple questions and we'll
                create a complete media plan tailored to your business.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Simple, jargon-free questions
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Full media plan with targeting
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Budget allocation & setup guide
              </div>
            </div>

            <Button
              className="w-full bg-accent hover:bg-accent-glow group-hover:shadow-glow"
              size="lg"
            >
              Build My Plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </div>

        {/* Trust Badge */}
        <div className="text-center mt-16 text-sm text-muted-foreground">
          <p>Powered by AI • Industry benchmarks • Expert insights</p>
        </div>

        {/* Temporary Test Button */}
        <div className="mt-8 p-6 border border-dashed border-border rounded-lg max-w-md mx-auto bg-card/50">
          <p className="text-sm text-muted-foreground mb-3 text-center">
            🧪 Dev Test: Claude API Connection
          </p>
          <Button
            onClick={handleTestClaude}
            disabled={isTesting}
            variant="outline"
            className="w-full"
          >
            {isTesting ? "Testing..." : "Test Claude API"}
          </Button>
          {testResponse && (
            <div className="mt-4 p-3 rounded bg-muted text-sm text-foreground break-words">
              {testResponse}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Landing;
