import { join } from "node:path"
import { mkdir } from "node:fs/promises"

const SKILL_DIR = join(process.cwd(), ".mastra", "skills")
const SKILL_FILE = join(SKILL_DIR, "resume-skill.md")

export function getSkillPath(): string {
  return SKILL_FILE
}

export async function getSkillContent(): Promise<string | null> {
  try {
    return await Bun.file(SKILL_FILE).text()
  } catch {
    return null
  }
}

export async function skillExists(): Promise<boolean> {
  const content = await getSkillContent()
  return content !== null && content.trim().length > 0
}

export async function saveSkill(content: string): Promise<string> {
  await mkdir(SKILL_DIR, { recursive: true })
  await Bun.write(SKILL_FILE, content)
  return SKILL_FILE
}

export function buildSkillPrompt(
  resumeContent: string,
  userConfig: { name: string; targetRoles: string; industry: string }
): string {
  return `Extract a structured summary of this person's professional profile from their resume.
Output the result as a SKILL.md file — a concise, structured document that another agent
can use to understand this person's background when tailoring resumes.

GROUP: ${userConfig.name}
TARGET ROLES: ${userConfig.targetRoles}
INDUSTRY: ${userConfig.industry}

RESUME CONTENT:
--- resume ---
${resumeContent.slice(0, 5000)}
--- end resume ---

Produce the SKILL.md. Include these sections as level-2 headings (##):

1. ## Professional Summary — one paragraph covering seniority, expertise, and target roles
2. ## Core Skills — categorized list of technical skills, tools, and domains
3. ## Work Experience — concise entries with: company, title, dates, 1-2 line highlights
4. ## Education — degrees, certificates, relevant coursework
5. ## Key Projects / Achievements — notable projects, publications, awards
6. ## Target Alignment — how this person's background maps to their target roles/industry

Keep it compact — the full document should be under 1500 words.
Focus on facts from the resume. Do not fabricate or embellish.
Output ONLY the SKILL.md content (no preamble, no markdown fences).`
}
