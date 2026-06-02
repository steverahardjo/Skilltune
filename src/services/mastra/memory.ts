import { Memory } from "@mastra/memory"
import { LibSQLStore } from "@mastra/libsql"
import { z } from "zod"
import { join } from "node:path"

const userProfileSchema = z.object({
  fullName: z.string().optional(),
  targetRoles: z.string().optional(),
  industry: z.string().optional(),
  technicalSkills: z.array(z.string()).optional(),
  yearsOfExperience: z.number().optional(),
  education: z.string().optional(),
  achievements: z.array(z.string()).optional(),
  softSkills: z.array(z.string()).optional(),
  summary: z.string().optional(),
  jobPosting: z
    .object({
      title: z.string().optional(),
      company: z.string().optional(),
      requiredSkills: z.array(z.string()).optional(),
      preferredSkills: z.array(z.string()).optional(),
      experienceLevel: z.string().optional(),
      keyRequirements: z.array(z.string()).optional(),
      responsibilities: z.array(z.string()).optional(),
      niceToHave: z.array(z.string()).optional(),
      educationRequirement: z.string().optional(),
      locationType: z.string().optional(),
      salaryRange: z.string().optional(),
      summary: z.string().optional(),
    })
    .optional(),
})

const dbPath = join(process.cwd(), ".mastra", "memory.db")

export const memory = new Memory({
  storage: new LibSQLStore({
    id: "resume-adjuster",
    url: `file:${dbPath}`,
  }),
  options: {
    workingMemory: {
      enabled: true,
      scope: "resource",
      schema: userProfileSchema,
    },
  },
})
