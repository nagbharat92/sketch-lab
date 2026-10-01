import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { RoughBox } from "@/components/ui/rough-ink"

/**
 * FontCombobox — a hand-drawn text field that also lets you browse the ENTIRE
 * Google Fonts library from the keyboard: click the field and press ↑/↓ to cycle
 * through every family, or type to filter. Each highlighted family is previewed
 * live (the parent loads just that ONE face on demand), so nothing ever tries to
 * download the whole library — only names are held in memory; faces load lazily.
 *
 * The list is rendered in a PORTAL (fixed-positioned under the input) because the
 * field lives inside the pairings carousel, whose `overflow-x-auto` would clip a
 * normally-positioned dropdown. The active row is highlighted imperatively so
 * arrowing never re-renders the ~1900-item list.
 */

interface FontComboboxProps {
  label: string
  /** The applied family name (also what the input shows when closed). */
  value: string
  placeholder: string
  /** The full list of family names to browse (plain strings; no faces loaded). */
  fonts: readonly string[]
  /** roughjs seed for the field's hand-drawn outline. */
  seed: number
  /** Called live as the highlight moves and on commit — the parent applies it. */
  onChange: (family: string) => void
}

// The dropdown is rendered inline (absolutely positioned right below the field),
// NOT in a portal: the pairings carousel that once required portalling (its
// overflow-x-auto would have clipped the menu) is gone, so nothing clips it and
// it stays attached to the field with zero positioning JS.

export function FontCombobox({ label, value, placeholder, fonts, seed, onChange }: FontComboboxProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [filterQuery, setFilterQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const anchorRef = useRef<HTMLLabelElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const openValueRef = useRef(value)

  const listId = useId()

  // The list to browse: everything when unfiltered, else a case-insensitive
  // substring match. Cheap — these are plain strings, no faces.
  const filtered = useMemo<readonly string[]>(() => {
    const q = filterQuery.trim().toLowerCase()
    return q ? fonts.filter((f) => f.toLowerCase().includes(q)) : fonts
  }, [fonts, filterQuery])

  // Preview the highlighted family live (the parent loads that one face).
  const preview = useCallback((family: string) => onChange(family), [onChange])

  const openList = useCallback(() => {
    openValueRef.current = value
    // Open as a clean search box: the current family stays highlighted in the
    // list (and applied in the specimen), so typing always filters from scratch
    // instead of appending to the committed name.
    setFilterQuery("")
    setDraft("")
    setActiveIndex(Math.max(0, fonts.indexOf(value)))
    setOpen(true)
  }, [value, fonts])

  const close = useCallback(() => {
    setOpen(false)
    setFilterQuery("")
  }, [])

  const commit = useCallback(
    (i: number) => {
      const family = filtered[i]
      if (family) onChange(family)
      close()
    },
    [filtered, onChange, close],
  )

  // Close on a pointer press outside the field and the popover.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (anchorRef.current?.contains(t) || popoverRef.current?.contains(t)) return
      close()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, close])

  // Highlight the active row imperatively + scroll it into view, so cycling
  // never re-renders the (large) list.
  useEffect(() => {
    const ul = listRef.current
    if (!ul) return
    const prev = ul.querySelector('[aria-selected="true"]')
    if (prev) {
      prev.setAttribute("aria-selected", "false")
      prev.classList.remove("bg-sidebar-accent")
    }
    const el = ul.children[activeIndex] as HTMLElement | undefined
    if (el) {
      el.setAttribute("aria-selected", "true")
      el.classList.add("bg-sidebar-accent")
      el.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex, filtered, open])

  const move = (dir: 1 | -1) => {
    if (!filtered.length) return
    const next = Math.min(Math.max(activeIndex + dir, 0), filtered.length - 1)
    setActiveIndex(next)
    setDraft(filtered[next]) // show the highlighted name without re-filtering
    preview(filtered[next])
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (!open) openList()
        else move(1)
        break
      case "ArrowUp":
        e.preventDefault()
        if (open) move(-1)
        break
      case "Enter":
        e.preventDefault()
        if (open) commit(activeIndex)
        break
      case "Escape":
        if (open) {
          e.preventDefault()
          onChange(openValueRef.current)
          close()
        }
        break
      case "Tab":
        if (open) close()
        break
    }
  }

  // Stable row handlers — read the row's index off the DOM so the memoised list
  // items never need to change when only the highlight moves.
  const handleHover = useCallback((e: React.MouseEvent<HTMLLIElement>) => {
    setActiveIndex(Number(e.currentTarget.dataset.index))
  }, [])
  const handlePick = useCallback(
    (e: React.MouseEvent<HTMLLIElement>) => {
      e.preventDefault() // keep focus on the input (don't blur → close early)
      commit(Number(e.currentTarget.dataset.index))
    },
    [commit],
  )

  const items = useMemo(
    () =>
      filtered.map((name, i) => (
        <li
          key={name}
          id={`${listId}-${i}`}
          role="option"
          aria-selected="false"
          data-index={i}
          onMouseEnter={handleHover}
          onMouseDown={handlePick}
          className="flex h-8 cursor-pointer items-center truncate px-3 text-sm text-sidebar-foreground/80"
        >
          {name}
        </li>
      )),
    [filtered, listId, handleHover, handlePick],
  )

  return (
    <label ref={anchorRef} className="relative flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="relative block text-border">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered.length ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={open ? draft : value}
          placeholder={placeholder}
          onFocus={openList}
          onClick={() => {
            if (!open) openList()
          }}
          onChange={(e) => {
            setDraft(e.target.value)
            setFilterQuery(e.target.value)
            setActiveIndex(0)
            if (!open) setOpen(true)
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-xs bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:text-foreground"
        />
        <RoughBox seed={seed} radius={12} inset={2} className="text-border" />
      </span>

      {open && (
        <div ref={popoverRef} className="absolute inset-x-0 top-full z-50 mt-1">
          <div className="relative rounded-xs" style={{ boxShadow: "var(--shadow-drawer)" }}>
            {/* Fill clipped to the rounded corners; the ink stroke sits OUTSIDE
                the clip (sibling) so its hand-drawn wobble isn't cut off. The
                sidepanel surface (bg-sidebar) with the restrained rounded-xs
                corners we use on the rows/fields, not the sidepanel's rounded-xl. */}
            <div className="overflow-hidden rounded-xs bg-sidebar text-sidebar-foreground">
              {filtered.length ? (
                <ul
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  aria-label={label}
                  className="max-h-72 overflow-y-auto py-2 [scrollbar-width:thin]"
                >
                  {items}
                </ul>
              ) : (
                <p className="px-3 py-3 text-sm text-sidebar-foreground/60">No matching family.</p>
              )}
            </div>
            {/* Same stroke treatment as the sidepanel (boiling ink, bowing 1) but
                the restrained 12px corner (rounded-xs) → ink at 12-3 = 9px,
                concentric and matching the rows/fields. */}
            <RoughBox seed={seed + 100} radius={12} inset={3} boil bowing={1} className="text-sidebar-foreground/70" />
          </div>
        </div>
      )}
    </label>
  )
}
