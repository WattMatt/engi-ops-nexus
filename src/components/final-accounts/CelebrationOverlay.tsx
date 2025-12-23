import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2 } from "lucide-react";

interface CelebrationOverlayProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function CelebrationOverlay({ isVisible, onComplete }: CelebrationOverlayProps) {
  const fireConfetti = useCallback(() => {
    // Initial burst from both sides
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // Multiple bursts for a grand celebration
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      origin: { x: 0.2, y: 0.7 },
    });

    fire(0.2, {
      spread: 60,
      origin: { x: 0.5, y: 0.7 },
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      origin: { x: 0.8, y: 0.7 },
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      origin: { x: 0.5, y: 0.6 },
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.7 },
    });

    // Second wave after a short delay
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.3, y: 0.6 },
        zIndex: 9999,
      });
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.7, y: 0.6 },
        zIndex: 9999,
      });
    }, 250);

    // Stars burst
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { x: 0.5, y: 0.5 },
        shapes: ["star"],
        colors: ["#FFD700", "#FFA500", "#FF6347"],
        zIndex: 9999,
      });
    }, 500);
  }, []);

  useEffect(() => {
    if (isVisible) {
      fireConfetti();
      
      // Complete callback after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, fireConfetti, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-background rounded-2xl p-8 shadow-2xl animate-scale-in text-center max-w-md mx-4">
        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-14 w-14 text-green-600 animate-bounce" />
        </div>
        <h2 className="text-3xl font-bold text-green-600 mb-2">
          Section Approved!
        </h2>
        <p className="text-lg text-muted-foreground mb-4">
          Thank you for your review
        </p>
        <div className="flex justify-center gap-1">
          <span className="text-2xl animate-bounce" style={{ animationDelay: "0ms" }}>🎉</span>
          <span className="text-2xl animate-bounce" style={{ animationDelay: "100ms" }}>✨</span>
          <span className="text-2xl animate-bounce" style={{ animationDelay: "200ms" }}>🎊</span>
        </div>
      </div>
    </div>
  );
}
