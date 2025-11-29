import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Store, ShoppingCart, Phone, Smartphone, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WizardProgress from "@/components/WizardProgress";

const businessTypes = [
  { id: "ecommerce", label: "E-commerce", icon: ShoppingCart, description: "Sell products online" },
  { id: "leads", label: "Lead Generation", icon: Phone, description: "Generate leads/inquiries" },
  { id: "local", label: "Local Business", icon: Store, description: "Physical location" },
  { id: "app", label: "App", icon: Smartphone, description: "Mobile or web app" },
  { id: "other", label: "Other", icon: Building, description: "Something else" },
];

const Step1 = () => {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [businessType, setBusinessType] = useState("");

  const handleNext = () => {
    navigate("/wizard/step-2");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
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
        <WizardProgress currentStep={1} totalSteps={4} />

        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            Tell us about your business
          </h1>
          <p className="text-muted-foreground">
            No worries if you're not sure about anything - you can always say "Not sure"
          </p>
        </div>

        <Card className="p-8">
          <div className="space-y-8">
            {/* Business Name/Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                What do you sell or offer?
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Organic skincare products, Yoga classes, Marketing services..."
                className="text-base"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Where do you sell?
              </label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                  <SelectItem value="de">Germany</SelectItem>
                  <SelectItem value="fr">France</SelectItem>
                  <SelectItem value="notsure">Not sure yet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                What type of business is this?
              </label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {businessTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setBusinessType(type.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        businessType === type.id
                          ? "border-primary bg-primary/5 shadow-soft"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 mb-2 ${
                          businessType === type.id ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <p className="font-medium text-foreground mb-1">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleNext} disabled={!businessName || !country || !businessType} className="flex-1">
              Continue
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Step1;
