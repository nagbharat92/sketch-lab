import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FadeInUp } from "@/components/ui/fade-in-up"
import { RoughLine } from "@/components/ui/rough-ink"
import type { TextBlock } from "@/data/pages"
import { JustifiedParagraph } from "@/components/ui/justified-paragraph"

export function TextBlockRenderer({ block, index }: { block: TextBlock; index: number }) {
  return (
    <FadeInUp i={index}>
      {block.title && (
        <h2 className="text-[1.5rem] leading-tight font-sans font-bold tracking-tight text-foreground mb-(--text-gap)">
          {block.title}
        </h2>
      )}
      <div className="text-block-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <JustifiedParagraph className="text-(length:--content-body-size) leading-relaxed text-foreground/80 mb-(--text-gap) last:mb-0">
                {children}
              </JustifiedParagraph>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic">{children}</em>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground transition-colors duration-150"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-(--list-indent) mb-(--text-gap) text-foreground/80 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-(--list-indent) mb-(--text-gap) text-foreground/80 space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="text-(length:--content-body-size) leading-relaxed">{children}</li>,
            code: ({ children }) => (
              <code className="px-(--code-px) py-(--code-py) rounded-md bg-muted font-mono text-(length:--content-body-size)">
                {children}
              </code>
            ),
            hr: () => <RoughLine className="my-(--hr-gap) text-muted-foreground" />,
          }}
        >
          {block.body}
        </ReactMarkdown>
      </div>
    </FadeInUp>
  )
}
