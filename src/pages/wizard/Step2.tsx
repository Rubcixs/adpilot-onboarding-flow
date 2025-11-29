import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ShoppingBag, Users, Calendar, Download, TrendingUp, Zap, Scale, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import WizardProgress from "@/components/WizardProgress";

const goals = [
  { id: "sales", label: "More Sales", icon: ShoppingBag, description: "Direct purchases" },
  { id: "leads", label: "More Leads", icon: Users, description: "Contact forms, inquiries" },
  { id: "bookings", label: "More Bookings", icon: Calendar, description: "Appointments, reservations" },
  { id: "installs", label: "App Installs", icon: Download, description: "Mobile or web app" },
  { id: "awareness", label: "Brand Awareness", icon: TrendingUp, description: "Visibility & recognition" },
  { id: "notsure", label: "Not Sure", icon: Scale, description: "Help me decide" },
];

const priorities = [
  { id: "fast", label: "Fast Results", icon: Zap, description: "Quick wins matter most" },
  { id: "balanced", label: "Balanced", icon: Scale, description: "Mix of short & long-term" },
  { id: "longterm", label: "Long-term", icon: Clock, description: "Building for the future" },
  { id: "notsure", label: "Not Sure", icon: Scale, description: "Help me decide" },
];

const Step2 = () => {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [priority, setPriority] = useState("");

  const handleNext = () => {
    navigate("/wizard/step-3");
  };

  const handleBack = () => {
    navigate("/wizard/step-1");
  };

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
        <WizardProgress currentStep={2} totalSteps={4} />

        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            What's your main goal?
          </h1>
          <p className="text-muted-foreground">
            This helps us recommend the right campaign types and budgets
          </p>
        </div>

        <Card className="p-8 mb-6">
          <label className="block text-sm font-medium text-foreground mb-3">
            What do you want to achieve?
          </label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setGoal(item.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    goal === item.id
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 mb-2 ${
                      goal === item.id ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <p className="font-medium text-foreground mb-1">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-8">
          <label className="block text-sm font-medium text-foreground mb-3">
            How important are fast results?
          </label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {priorities.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setPriority(item.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    priority === item.id
                      ? "border-accent bg-accent/5 shadow-soft"
                      : "border-border hover:border-accent/50 hover:bg-accent/5"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 mb-2 ${
                      priority === item.id ? "text-accent" : "text-muted-foreground"
                    }`}
                  />
                  <p className="font-medium text-foreground mb-1">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mt-8">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button onClick={handleNext} disabled={!goal || !priority} className="flex-1">
              Continue
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Step2;
