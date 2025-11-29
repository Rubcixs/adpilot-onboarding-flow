import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WizardProgress from "@/components/WizardProgress";

const Step3 = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState("");
  const [customCustomer, setCustomCustomer] = useState("");
  const [offer, setOffer] = useState("");
  const [customOffer, setCustomOffer] = useState("");

  const handleNext = () => {
    navigate("/wizard/step-4");
  };

  const handleBack = () => {
    navigate("/wizard/step-2");
  };

  const isValid = (customer || customCustomer) && (offer || customOffer);

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
        <WizardProgress currentStep={3} totalSteps={4} />

        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            Who and what?
          </h1>
          <p className="text-muted-foreground">
            Help us understand your ideal customer and main offer
          </p>
        </div>

        <Card className="p-8">
          <div className="space-y-8">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Who is your ideal customer?
              </label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type your own below" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youngadults">Young adults (18-30)</SelectItem>
                  <SelectItem value="parents">Parents with kids</SelectItem>
                  <SelectItem value="professionals">Business professionals</SelectItem>
                  <SelectItem value="seniors">Seniors (55+)</SelectItem>
                  <SelectItem value="students">Students</SelectItem>
                  <SelectItem value="entrepreneurs">Entrepreneurs</SelectItem>
                  <SelectItem value="fitness">Fitness enthusiasts</SelectItem>
                  <SelectItem value="notsure">Not sure</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={customCustomer}
                onChange={(e) => {
                  setCustomCustomer(e.target.value);
                  if (e.target.value) setCustomer("");
                }}
                placeholder="Or describe your own customer type..."
                className="mt-3"
              />
            </div>

            {/* Offer */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                What is your main offer?
              </label>
              <Select value={offer} onValueChange={setOffer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type your own below" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Physical product</SelectItem>
                  <SelectItem value="digital">Digital product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="subscription">Subscription/Membership</SelectItem>
                  <SelectItem value="course">Online course</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="event">Event/Workshop</SelectItem>
                  <SelectItem value="notsure">Not sure</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={customOffer}
                onChange={(e) => {
                  setCustomOffer(e.target.value);
                  if (e.target.value) setOffer("");
                }}
                placeholder="Or describe your own offer..."
                className="mt-3"
              />
            </div>

            {/* Help Text */}
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <p className="text-sm text-foreground">
                💡 <strong>Tip:</strong> The more specific you are, the better we can tailor your media plan. 
                But don't worry if you're not 100% sure - we'll provide recommendations you can adjust later.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button onClick={handleNext} disabled={!isValid} className="flex-1">
              Continue
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Step3;
