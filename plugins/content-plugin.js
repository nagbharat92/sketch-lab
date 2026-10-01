import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = 'src/data/content'
const VIRTUAL_ID = 'virtual:content-pages'
const RESOLVED_ID = '\0virtual:content-pages'

export default function contentPlugin() {
  return {
    name: 'sketch-lab-content',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },

    load(id) {
      if (id !== RESOLVED_ID) return
      return generateModule()
    },

    configureServer(server) {
      const contentDir = path.resolve(CONTENT_DIR)

      // Ensure directory exists before watching
      if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true })
      }

      server.watcher.add(contentDir)

      const reload = (file) => {
        if (!file.endsWith('.md')) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('change', reload)
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
    },
  }
}

// ─── Module generation ─────────────────────────────────────────────────────

function generateModule() {
  const contentDir = path.resolve(CONTENT_DIR)
  if (!fs.existsSync(contentDir)) {
    return 'export const contentTree = []'
  }
  const tree = walkDirectory(contentDir)
  return `export const contentTree = ${JSON.stringify(tree, null, 2)}`
}

// ─── Directory walker ──────────────────────────────────────────────────────

function walkDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const folders = []
  const pages = []

  for (const entry of entries) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue

    if (entry.isDirectory()) {
      const children = walkDirectory(path.join(dir, entry.name))
      if (children.length > 0) {
        folders.push({
          id: entry.name,
          type: 'folder',
          name: toTitleCase(entry.name),
          children,
        })
      }
    } else if (entry.name.endsWith('.md')) {
      const raw = fs.readFileSync(path.join(dir, entry.name), 'utf-8')
      const filename = entry.name.replace(/\.md$/, '')
      const result = parseContentFile(raw, filename)
      pages.push(result)
    }
  }

  // Sort pages: explicit order first, then alphabetical by name
  pages.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.page.name.localeCompare(b.page.name)
  })

  // Sort folders alphabetically
  folders.sort((a, b) => a.name.localeCompare(b.name))

  // Return folders first, then pages (pages are unwrapped from the helper object)
  return [...folders, ...pages.map((p) => p.page)]
}

// ─── Markdown file parser ──────────────────────────────────────────────────

function parseContentFile(raw, filename) {
  const { data: fm, content } = matter(raw)

  const blocks = []

  // ── Resolve name: explicit name > title > filename ──
  const resolvedName = fm.name ?? fm.title ?? toTitleCase(filename)

  // ── Resolve year: explicit year > extracted from date ──
  const resolvedYear = fm.year ?? (fm.date ? new Date(fm.date).getFullYear() : undefined)

  // ── 1. Iframe block ──
  // Explicit `iframe` wins; otherwise derive from `links.live`
  const iframeUrl = fm.iframe ?? fm.links?.live
  if (iframeUrl) {
    blocks.push({ type: 'iframe', url: iframeUrl })
  }

  // ── 2. Stats block ──
  // Explicit `stats` wins; otherwise build from tags + date year + links
  if (fm.stats && fm.stats.length > 0) {
    blocks.push({
      type: 'stats',
      items: fm.stats.map((s) => {
        if (typeof s === 'string') return { label: s }
        if (typeof s === 'number') return { label: String(s) }
        return s
      }),
    })
  } else {
    const statsItems = []

    // Tags → label-only stats items
    if (Array.isArray(fm.tags)) {
      for (const tag of fm.tags) {
        statsItems.push({ label: String(tag) })
      }
    }

    // Year from date
    if (fm.date) {
      statsItems.push({ label: String(new Date(fm.date).getFullYear()) })
    }

    // Links → clickable stats items
    if (fm.links) {
      if (fm.links.live) {
        statsItems.push({ label: 'View Project', href: fm.links.live })
      }
      if (fm.links.github) {
        statsItems.push({ label: 'GitHub', href: fm.links.github })
      }
    }

    if (statsItems.length > 0) {
      blocks.push({ type: 'stats', items: statsItems })
    }
  }

  // ── 3. Custom component block ──
  // Escape hatch: `custom: <componentId>` renders a registered React component
  // (see the REGISTRY in src/components/blocks/custom-block.tsx). Handy for
  // interactive experiments that don't fit a standard block type.
  if (fm.custom) {
    blocks.push({ type: 'custom', componentId: String(fm.custom) })
  }

  // ── 4. Parse body into blocks ──
  blocks.push(...parseBody(content))

  return {
    page: {
      id: fm.id ?? filename,
      type: 'page',
      name: resolvedName,
      ...(resolvedYear != null ? { year: resolvedYear } : {}),
      ...(fm.featured != null ? { featured: fm.featured } : {}),
      blocks,
    },
    order: fm.order ?? Infinity,
  }
}

// ─── Body parser ───────────────────────────────────────────────────────────

function parseBody(body) {
  const blocks = []
  const lines = body.split('\n')

  let currentTitle = undefined
  let currentLines = []

  function flushText() {
    const text = currentLines.join('\n').trim()
    if (text) {
      const block = { type: 'text', body: text }
      if (currentTitle) block.title = currentTitle
      blocks.push(block)
    }
    currentTitle = undefined
    currentLines = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip blank lines that aren't inside a text accumulation
    if (trimmed === '' && currentLines.length === 0 && currentTitle == null) {
      continue
    }

    // Divider: --- (three or more hyphens, nothing else)
    if (/^-{3,}$/.test(trimmed)) {
      flushText()
      blocks.push({ type: 'divider' })
      continue
    }

    // Heading: ## Title (only h2)
    const headingMatch = trimmed.match(/^##\s+(.+)$/)
    if (headingMatch) {
      flushText()
      currentTitle = headingMatch[1]
      continue
    }

    // Image: ![alt](src) — must be the entire line
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      flushText()
      const alt = imgMatch[1] || undefined
      const src = imgMatch[2]
      const imageBlock = { type: 'image', src }
      if (alt) imageBlock.alt = alt

      // Check next non-blank line for > caption
      if (i + 1 < lines.length) {
        const nextTrimmed = lines[i + 1].trim()
        const captionMatch = nextTrimmed.match(/^>\s*(.+)$/)
        if (captionMatch) {
          imageBlock.caption = captionMatch[1]
          i++ // skip caption line
        }
      }
      blocks.push(imageBlock)
      continue
    }

    // Video: [video](url) — must be the entire line (case-insensitive "video")
    const videoMatch = trimmed.match(/^\[video\]\(([^)]+)\)$/i)
    if (videoMatch) {
      flushText()
      const videoBlock = { type: 'video', embedUrl: videoMatch[1] }

      // Check next non-blank line for > caption
      if (i + 1 < lines.length) {
        const nextTrimmed = lines[i + 1].trim()
        const captionMatch = nextTrimmed.match(/^>\s*(.+)$/)
        if (captionMatch) {
          videoBlock.caption = captionMatch[1]
          i++
        }
      }
      blocks.push(videoBlock)
      continue
    }

    // Regular line — accumulate for text block
    currentLines.push(line)
  }

  // Flush any remaining text
  flushText()

  return blocks
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function toTitleCase(kebab) {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
