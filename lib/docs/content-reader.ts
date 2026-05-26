import { promises as fs } from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { DocEntry } from './types'

const PUBLIC_DOCS_PATH = path.join(process.cwd(), 'content', 'public-docs')
const PRIVATE_DOCS_PATH = path.join(process.cwd(), 'content', 'private-docs')

function resolveTitle(filename: string, frontmatterTitle?: string): string {
  if (frontmatterTitle) return frontmatterTitle
  return filename.replace(/\.md$/, '').replace(/_/g, ' ')
}

async function listDocs(directory: string, isPrivate: boolean): Promise<DocEntry[]> {
  try {
    const entries = await fs.readdir(directory)
    const files = entries.filter((f) => f.endsWith('.md'))

    const docs = await Promise.all(
      files.map(async (filename) => {
        const slug = filename.replace(/\.md$/, '')
        const filePath = path.join(directory, filename)
        const raw = await fs.readFile(filePath, 'utf-8')
        const parsed = matter(raw)

        return {
          slug,
          title: resolveTitle(filename, parsed.data.title),
          order: typeof parsed.data.order === 'number' ? parsed.data.order : 999,
          content: parsed.content,
          isPrivate,
          description: parsed.data.description,
        }
      })
    )

    return docs.sort((a, b) => a.order - b.order)
  } catch {
    return []
  }
}

export async function getPublicDocList(): Promise<DocEntry[]> {
  return listDocs(PUBLIC_DOCS_PATH, false)
}

export async function getPrivateDocList(): Promise<DocEntry[]> {
  return listDocs(PRIVATE_DOCS_PATH, true)
}

export async function getDocBySlug(slug: string, isPrivate = false): Promise<DocEntry | null> {
  const directory = isPrivate ? PRIVATE_DOCS_PATH : PUBLIC_DOCS_PATH
  const filePath = path.join(directory, `${slug}.md`)

  try {
    await fs.access(filePath)
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = matter(raw)

    return {
      slug,
      title: resolveTitle(`${slug}.md`, parsed.data.title),
      order: typeof parsed.data.order === 'number' ? parsed.data.order : 999,
      content: parsed.content,
      isPrivate,
      description: parsed.data.description,
    }
  } catch {
    return null
  }
}
