import { CheckCircle2 } from "lucide-react";

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

const WizardProgress = ({ currentStep, totalSteps }: WizardProgressProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                  step < currentStep
                    ? "bg-accent text-accent-foreground"
                    : step === currentStep
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{step}</span>
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  step <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Step {step}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={`h-0.5 flex-1 mx-2 transition-all ${
                  step < currentStep ? "bg-accent" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WizardProgress;
