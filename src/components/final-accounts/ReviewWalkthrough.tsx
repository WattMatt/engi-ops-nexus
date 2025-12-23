import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Eye, 
  ClipboardCheck,
  HelpCircle
} from "lucide-react";

interface ReviewWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

const steps = [
  {
    title: "Welcome to the Review Portal",
    description: "This portal allows you to review and approve the final account section. Follow this quick guide to understand the process.",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    title: "Step 1: Review Section Details",
    description: "Start by reviewing the section information at the top. This shows the account, bill, section details, and current status of your review.",
    icon: Eye,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    title: "Step 2: Check Financial Summary",
    description: "Review the financial summary cards showing Contract Value, Final Value, Variation amount, and percentage change. Green indicates savings, red indicates overruns.",
    icon: ClipboardCheck,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    title: "Step 3: Review Line Items",
    description: "Examine each line item in the table. Click the comment icon (💬) on any row to add comments or queries about specific items.",
    icon: MessageSquare,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  {
    title: "Step 4: Add Comments",
    description: "Use the global comments section to add general feedback, or use item-level comments for specific queries. All comments are visible to the project team.",
    icon: MessageSquare,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  {
    title: "Step 5: Make Your Decision",
    description: "Once you've reviewed everything, either Approve the section if you're satisfied, or Raise a Dispute if you have concerns that need resolution.",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
];

export function ReviewWalkthrough({ isOpen, onClose, onDontShowAgain }: ReviewWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const Icon = step.icon;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">How to Review</DialogTitle>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
        </DialogHeader>

        <Progress value={progress} className="h-1.5 mb-4" />

        <div className="py-4">
          <div className={`w-16 h-16 rounded-full ${step.bgColor} flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`h-8 w-8 ${step.color}`} />
          </div>
          
          <h3 className="text-lg font-semibold text-center mb-2">{step.title}</h3>
          <p className="text-center text-muted-foreground">{step.description}</p>

          {/* Visual indicators for specific steps */}
          {currentStep === 2 && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                <span className="text-green-600 font-medium">+R 50,000</span>
                <p className="text-xs text-muted-foreground">Credit (Savings)</p>
              </div>
              <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
                <span className="text-red-600 font-medium">-R 25,000</span>
                <p className="text-xs text-muted-foreground">Debit (Overrun)</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">Click this icon on any row to add a comment</span>
            </div>
          )}

          {currentStep === 5 && (
            <div className="mt-4 flex gap-2 justify-center">
              <div className="flex items-center gap-1 px-3 py-2 rounded bg-green-100 dark:bg-green-900/30 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Approve</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-2 rounded bg-red-100 dark:bg-red-900/30 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Dispute</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDontShowAgain}
            >
              Don't show again
            </Button>
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pt-2">
          {steps.map((_, idx) => (
            <button
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              onClick={() => setCurrentStep(idx)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WalkthroughTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button 
      variant="secondary" 
      size="sm" 
      onClick={onClick} 
      className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
    >
      <HelpCircle className="h-4 w-4" />
      How to Review
    </Button>
  );
}
