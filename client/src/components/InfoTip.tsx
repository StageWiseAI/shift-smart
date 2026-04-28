import { useState, useRef, useEffect } from "react";
import { HelpCircle, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTipProps {
  title: string;
  content: string;
  className?: string;
}

export function InfoTip({ title, content, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Calculate position when opening
  function calcPos() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popW = 288; // w-72
    const padding = 12;
    const viewW = window.innerWidth;

    // Ideal: align right edge of popover with button
    let left = rect.right - popW;
    // Clamp within screen
    if (left < padding) left = padding;
    if (left + popW > viewW - padding) left = viewW - popW - padding;

    const top = rect.bottom + 8 + window.scrollY;
    setPos({ top, left });
  }

  function open_() {
    calcPos();
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        stopSpeech();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => { if (!open) stopSpeech(); }, [open]);

  function stopSpeech() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  function toggleSpeech() {
    if (speaking) { stopSpeech(); return; }
    if (!window.speechSynthesis) return;
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(`${title}. ${content}`);
    utterance.lang = "en-AU";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : open_(); }}
        className="p-0.5 rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label={`Info: ${title}`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && pos && (
        <div
          ref={popoverRef}
          className="fixed z-[999] w-72 rounded-xl border border-border bg-card shadow-xl p-4"
          style={{ top: pos.top, left: pos.left }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
            <button
              onClick={() => setOpen(false)}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>

          {typeof window !== "undefined" && "speechSynthesis" in window && (
            <button
              onClick={toggleSpeech}
              className={cn(
                "mt-3 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors",
                speaking
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {speaking
                ? <><VolumeX className="h-3 w-3" /> Stop reading</>
                : <><Volume2 className="h-3 w-3" /> Read aloud</>
              }
            </button>
          )}
        </div>
      )}
    </span>
  );
}
