import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import WizardProgress from "@/components/WizardProgress";

const Step4 = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState([2000]);
  const [budgetNotSure, setBudgetNotSure] = useState(false);
  const [expectedResults, setExpectedResults] = useState("");
  const [resultsNotSure, setResultsNotSure] = useState(false);
  const [hasRunAds, setHasRunAds] = useState("");

  const handleNext = () => {
    navigate("/wizard/results");
  };

  const handleBack = () => {
    navigate("/wizard/step-3");
  };

  const isValid = (budget[0] > 0 || budgetNotSure) && hasRunAds;

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
              <span className="text-xl font-display font-semibold text-foreground">
                AdPilot
              </span>
            </div>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <WizardProgress currentStep={4} totalSteps={4} />

        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            Budget & Expectations
          </h1>
          <p className="text-muted-foreground">
            Last step - tell us about your budget and experience
          </p>
        </div>

        <Card className="p-8">
          <div className="space-y-8">
            {/* Budget */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-foreground">
                  Monthly advertising budget
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={budgetNotSure}
                    onChange={(e) => setBudgetNotSure(e.target.checked)}
                    className="rounded border-border"
                  />
                  Not sure
                </label>
              </div>

              {!budgetNotSure && (
                <>
                  <Slider
                    value={budget}
                    onValueChange={setBudget}
                    min={500}
                    max={10000}
                    step={100}
                    className="mb-3"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">$500</span>
                    <span className="font-semibold text-foreground text-lg">
                      ${budget[0].toLocaleString()}/month
                    </span>
                    <span className="text-muted-foreground">$10,000+</span>
                  </div>
                </>
              )}
            </div>

            {/* Expected Results */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Expected results per month
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resultsNotSure}
                    onChange={(e) => setResultsNotSure(e.target.checked)}
                    className="rounded border-border"
                  />
                  Not sure
                </label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                How many sales, leads, or bookings do you hope to get?
              </p>
              {!resultsNotSure && (
                <Input
                  type="number"
                  value={expectedResults}
                  onChange={(e) => setExpectedResults(e.target.value)}
                  placeholder="e.g., 50"
                  className="text-base"
                />
              )}
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Have you run ads before?
              </label>
              <RadioGroup value={hasRunAds} onValueChange={setHasRunAds}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="yes" />
                    <Label htmlFor="yes" className="font-normal cursor-pointer">
                      Yes, I have experience with ads
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no" />
                    <Label htmlFor="no" className="font-normal cursor-pointer">
                      No, I'm completely new to this
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="notsure" id="notsure" />
                    <Label htmlFor="notsure" className="font-normal cursor-pointer">
                      Not sure
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isValid}
              className="flex-1 bg-accent hover:bg-accent-glow"
            >
              Generate My Plan
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Step4;
