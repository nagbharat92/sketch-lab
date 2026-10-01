import { cn } from "@/lib/utils"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

export function LabCredits({ className }: { className?: string }) {
  return (
    <JustifiedParagraph className={cn("text-sm leading-relaxed text-muted-foreground", className)}>
      Made with curiosity by Bharat Nag. These are my experiments with AI,
      exploring a more playful side of UI.
    </JustifiedParagraph>
  )
}
