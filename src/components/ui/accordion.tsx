'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/* ─── Accordion ─── */
function Accordion({
  type = "single",
  defaultValue,
  className,
  children,
  ...props
}: {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
    if (!defaultValue) return new Set()
    if (Array.isArray(defaultValue)) return new Set(defaultValue)
    return new Set([defaultValue])
  })

  const toggleItem = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev)
        if (next.has(value)) {
          next.delete(value)
        } else {
          if (type === "single") {
            next.clear()
          }
          next.add(value)
        }
        return next
      })
    },
    [type]
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn("divide-y divide-base-300", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

const AccordionContext = React.createContext<{
  openItems: Set<string>
  toggleItem: (value: string) => void
  type: "single" | "multiple"
}>({ openItems: new Set(), toggleItem: () => { }, type: "single" })

/* ─── AccordionItem Context (propagates value + trigger/content IDs) ─── */
const AccordionItemContext = React.createContext<{
  value: string
  triggerId: string
  contentId: string
}>({ value: "", triggerId: "", contentId: "" })

function AccordionItem({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  // E1 — generate stable IDs so the trigger's aria-controls points at
  // the content's id, and the content's aria-labelledby points back at
  // the trigger. This is what screen readers need to announce the
  // expand/collapse state and to programmatically navigate the sections.
  const reactId = React.useId()
  const triggerId = `acc-trigger-${reactId}`
  const contentId = `acc-content-${reactId}`
  const isOpen = useAccordionContext().openItems.has(value)

  return (
    <AccordionItemContext.Provider value={{ value, triggerId, contentId }}>
      <div
        data-state={isOpen ? "open" : "closed"}
        className={cn("collapse collapse-arrow", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

function useAccordionContext() {
  return React.useContext(AccordionContext)
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { openItems, toggleItem } = useAccordionContext()
  const { value, triggerId, contentId } = React.useContext(AccordionItemContext)
  const isOpen = openItems.has(value)

  return (
    <>
      {/* DaisyUI's collapse-arrow is driven by a hidden checkbox; we keep
          it for the visual animation but mark it presentational so AT
          doesn't double-announce (button + checkbox = confusing).
          DaisyUI also renders the chevron via CSS ::after on the
          collapse-title, so we don't render an explicit icon here. */}
      <input
        type="checkbox"
        checked={isOpen}
        onChange={() => toggleItem(value)}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        id={triggerId}
        onClick={() => toggleItem(value)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cn(
          "collapse-title flex items-start justify-between gap-4 text-left text-sm font-medium min-h-0 py-4",
          className
        )}
        {...props}
      >
        {children}
      </button>
    </>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { triggerId, contentId, value } = React.useContext(AccordionItemContext)
  const isOpen = useAccordionContext().openItems.has(value)

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      // aria-hidden on the wrapper keeps AT from wandering into collapsed
      // content. DaisyUI's CSS also hides it visually via max-height:0,
      // but aria-hidden is the explicit signal AT respects.
      aria-hidden={!isOpen}
      className={cn("collapse-content", className)}
      {...props}
    >
      <div className="pt-0 pb-4">{children}</div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
