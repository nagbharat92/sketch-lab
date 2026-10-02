/**
 * pages.ts — Sketch Lab content data
 *
 * Single source of truth for sidebar navigation and all canvas page content.
 *
 * Structure:
 *   FolderNode  — grouping container. Has children. No canvas view of its own.
 *   PageNode    — content item. Has a canvas view. Always a leaf node.
 *
 * Authoring content:
 *   Every PageNode has a `blocks` array — an ordered list of typed content blocks.
 *   Add, remove, or reorder blocks freely. The canvas renders whatever is in the array.
 *
 *   Standard block types:
 *     iframe   — live project preview (4:3 aspect ratio, contained width)
 *     stats    — horizontal metadata strip (tools, year, links)
 *     text     — optional title + markdown body
 *     image    — full-width image (any URL, including Google Drive)
 *     video    — YouTube embed (use /embed/VIDEO_ID format)
 *     divider  — visual separator between sections
 *
 *   Escape hatch:
 *     custom   — maps to a registered React component via componentId
 *                use only when no standard block type fits
 *
 *   To add a new block type: see the Block union type below.
 *
 * To add a new project:
 *   Add a PageNode to the appropriate FolderNode's children array.
 *
 * To add a new category:
 *   Add a FolderNode at the top level of sidebarData.
 */

import { type LucideIcon } from 'lucide-react'
import { contentTree } from 'virtual:content-pages'

// ─── Block types ──────────────────────────────────────────────────────────────

/**
 * IframeBlock — embeds a live URL as the hero preview card.
 * Renders with a 4:3 aspect ratio, contained width, no browser chrome.
 * Omit this block for pages with no live URL.
 */
export type IframeBlock = {
  type: 'iframe'
  url: string
  caption?: string
}

/**
 * StatsBlock — a horizontal metadata strip.
 * Items are label-only. Provide href to make an item a link.
 *
 * Example:
 *   items: [
 *     { label: 'React' },
 *     { label: '2025' },
 *     { label: 'GitHub', href: 'https://github.com/...' },
 *   ]
 */
export type StatsBlock = {
  type: 'stats'
  items: Array<{
    label: string
    href?: string
  }>
}

/**
 * TextBlock — a written section.
 * title is optional. body is Markdown: bold, italic, links, lists, inline code.
 * One TextBlock per authored section — no need to split individual paragraphs.
 */
export type TextBlock = {
  type: 'text'
  title?: string
  body: string
}

/**
 * ImageBlock — a full-width image.
 * src can be any publicly accessible URL, including Google Drive direct-share links.
 */
export type ImageBlock = {
  type: 'image'
  src: string
  alt?: string
  caption?: string
}

/**
 * VideoBlock — embeds a YouTube video at 16:9 aspect ratio.
 * Use the embed URL format: https://www.youtube.com/embed/VIDEO_ID
 * Not the watch URL (/watch?v=...) — the embed URL (/embed/...).
 */
export type VideoBlock = {
  type: 'video'
  embedUrl: string
  caption?: string
}

/**
 * DividerBlock — a visual pause between sections.
 * No content. Renders as a subtle full-width horizontal separator.
 */
export type DividerBlock = {
  type: 'divider'
}

/**
 * CustomBlock — escape hatch for content with unique display requirements.
 * componentId maps to a registered React component in the block renderer (PRD 05).
 * props is an optional bag of data passed to the component.
 *
 * Registered componentIds:
 *   'lab-home'     — introduction and visual links to the labs
 *
 * Use sparingly. Reach for a standard block type first.
 */
export type CustomBlock = {
  type: 'custom'
  componentId: string
  props?: Record<string, unknown>
}

/**
 * Block — the union of all content block types.
 *
 * To add a new block type in the future:
 *   1. Define a new exported type following the pattern above.
 *   2. Add it to this union.
 *   3. Add a renderer case in the ProjectCanvas block renderer (PRD 05).
 *   Nothing else changes.
 */
export type Block =
  | IframeBlock
  | StatsBlock
  | TextBlock
  | ImageBlock
  | VideoBlock
  | DividerBlock
  | CustomBlock

// ─── Node types ───────────────────────────────────────────────────────────────

export type PageNode = {
  id: string
  type: 'page'
  name: string
  year?: number       // metadata — kept separate from blocks for filtering/sorting
  featured?: boolean  // reserved — not used in UI yet
  icon?: LucideIcon   // optional sidebar glyph — defaults to a file icon when unset
  blocks?: Block[]    // ordered content blocks — undefined means no canvas content
}

export type FolderNode = {
  id: string
  type: 'folder'
  name: string
  children: SidebarNode[]
}

export type SidebarNode = FolderNode | PageNode

// ─── Data ─────────────────────────────────────────────────────────────────────

export const labPages = contentTree.filter((node): node is PageNode => node.type === 'page')

export const sidebarData: SidebarNode[] = [
  {
    id: 'home',
    type: 'page',
    name: 'Home',
    blocks: [
      {
        type: 'custom',
        componentId: 'lab-home',
      },
    ],
  },

  ...contentTree,

]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find a PageNode anywhere in the tree by id.
 * Returns null if not found or if the id belongs to a folder.
 */
export function findPage(nodes: SidebarNode[], id: string): PageNode | null {
  for (const node of nodes) {
    if (node.type === 'page' && node.id === id) return node
    if (node.type === 'folder') {
      const found = findPage(node.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Collect the ids of all folder nodes in the tree.
 * Used to set the initial expanded state — all folders start open.
 */
export function collectFolderIds(nodes: SidebarNode[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.type === 'folder') {
      ids.push(node.id)
      ids.push(...collectFolderIds(node.children))
    }
  }
  return ids
}

/**
 * Returns the ids of all ancestor FolderNodes that contain the page with the
 * given id. Used to auto-expand the sidebar when restoring a page from the URL.
 * Returns an empty array if the page is at the root or not found.
 */
export function findAncestorFolderIds(
  nodes: SidebarNode[],
  pageId: string,
  ancestors: string[] = []
): string[] {
  for (const node of nodes) {
    if (node.type === 'folder') {
      const found = findAncestorFolderIds(node.children, pageId, [...ancestors, node.id])
      if (found.length > 0) return found
    } else if (node.id === pageId) {
      return ancestors
    }
  }
  return []
}
