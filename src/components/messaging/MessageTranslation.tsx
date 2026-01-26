import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
  { code: "af", name: "Afrikaans" },
  { code: "zu", name: "Zulu" },
  { code: "xh", name: "Xhosa" },
];

interface MessageTranslationProps {
  messageContent: string;
  onTranslated: (translatedText: string) => void;
}

export function MessageTranslation({ messageContent, onTranslated }: MessageTranslationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null);

  const translateMessage = async (langCode: string) => {
    setIsTranslating(true);
    setTargetLanguage(langCode);

    try {
      // Using a simple translation approach - in production, use a proper translation API
      // For now, we'll use a basic simulation with the browser's translation hints
      const langName = LANGUAGES.find((l) => l.code === langCode)?.name || langCode;
      
      // Simple placeholder - in production, integrate with Google Translate, DeepL, etc.
      const translated = `[Translated to ${langName}]: ${messageContent}`;
      
      setTranslatedText(translated);
      onTranslated(translated);
      toast.success(`Translated to ${langName}`);
    } catch (error: any) {
      toast.error(`Translation failed: ${error.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Languages className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Translate to</h4>
          <div className="grid grid-cols-2 gap-1">
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.code}
                variant={targetLanguage === lang.code ? "secondary" : "ghost"}
                size="sm"
                className="justify-start text-xs h-7"
                onClick={() => translateMessage(lang.code)}
                disabled={isTranslating}
              >
                {isTranslating && targetLanguage === lang.code ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : null}
                {lang.name}
              </Button>
            ))}
          </div>
          {translatedText && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">{translatedText}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
