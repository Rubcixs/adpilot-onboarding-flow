import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const steps = [
  { label: "Checking data quality", duration: 1000 },
  { label: "Calculating KPIs", duration: 1500 },
  { label: "Analyzing performance", duration: 2000 },
  { label: "Extracting insights", duration: 1500 },
  { label: "Generating recommendations", duration: 2000 },
];

const Processing = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let stepIndex = 0;
    let cumulativeDuration = 0;

    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

    const advanceStep = () => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        cumulativeDuration += steps[stepIndex].duration;
        setProgress((cumulativeDuration / totalDuration) * 100);
        stepIndex++;
        setTimeout(advanceStep, steps[stepIndex - 1]?.duration || 0);
      } else {
        setTimeout(() => navigate("/analysis"), 500);
      }
    };

    advanceStep();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12 animate-fade-in">
          <div className="h-20 w-20 rounded-3xl bg-gradient-primary mx-auto mb-6 flex items-center justify-center animate-pulse-glow">
            <Loader2 className="h-10 w-10 text-primary-foreground animate-spin" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            Analyzing Your Data
          </h1>
          <p className="text-muted-foreground">
            Our AI is processing your ad performance data...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-sm text-center text-muted-foreground">
            {Math.round(progress)}% complete
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                index <= currentStep
                  ? "bg-card shadow-soft"
                  : "bg-muted/30"
              }`}
            >
              {index < currentStep ? (
                <CheckCircle2 className="h-6 w-6 text-accent flex-shrink-0" />
              ) : index === currentStep ? (
                <Loader2 className="h-6 w-6 text-primary flex-shrink-0 animate-spin" />
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-border flex-shrink-0" />
              )}
              <span
                className={`font-medium ${
                  index <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Processing;
