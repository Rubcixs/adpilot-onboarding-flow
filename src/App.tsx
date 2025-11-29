import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Processing from "./pages/Processing";
import Analysis from "./pages/Analysis";
import Step1 from "./pages/wizard/Step1";
import Step2 from "./pages/wizard/Step2";
import Step3 from "./pages/wizard/Step3";
import Step4 from "./pages/wizard/Step4";
import Results from "./pages/wizard/Results";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/wizard/step-1" element={<Step1 />} />
          <Route path="/wizard/step-2" element={<Step2 />} />
          <Route path="/wizard/step-3" element={<Step3 />} />
          <Route path="/wizard/step-4" element={<Step4 />} />
          <Route path="/wizard/results" element={<Results />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
