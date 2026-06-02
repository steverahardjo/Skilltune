import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { mastra } from "../src/services/mastra";

const READABLE_EXT = new Set([
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".yaml",
  ".yml",
  ".html",
  ".typ",
  ".tex",
  ".typst",
  ".log",
]);
const BATCH_SIZE = 3;
const MAX_CHARS = 1500;

async function readDir(
  path: string,
): Promise<{ name: string; content: string }[]> {
  const files: { name: string; content: string }[] = [];

  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const fp = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await walk(fp);
      } else if (
        entry.isFile() &&
        !entry.name.startsWith(".") &&
        READABLE_EXT.has(
          entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase(),
        )
      ) {
        try {
          const raw = await readFile(fp, "utf-8");
          const content = raw.slice(0, MAX_CHARS).trim();
          if (content) files.push({ name: entry.name, content });
        } catch {
          /* skip */
        }
      }
    }
  }

  await walk(path);
  return files.slice(0, 10);
}

async function main() {
  const dirPath = "/home/holyknight101/Documents/resume/";
  const apiKey = process.argv[3] || process.env.DEEPSEEK_API_KEY;

  if (!dirPath) {
    console.error(
      "Usage: bun scripts/test-profile.ts <directory-path> [deepseek-api-key]",
    );
    console.error("  e.g. bun scripts/test-profile.ts ~/career sk-xxx");
    process.exit(1);
  }
  if (!apiKey) {
    console.error(
      "Error: DEEPSEEK_API_KEY not set. Pass it as second arg or set env var.",
    );
    process.exit(1);
  }

  process.env.DEEPSEEK_API_KEY = apiKey;

  console.log(`Reading files from: ${dirPath}`);
  const files = await readDir(dirPath);
  console.log(
    `Found ${files.length} readable files: ${files.map((f) => f.name).join(", ")}`,
  );
  if (files.length === 0) {
    console.log("No files found.");
    process.exit(0);
  }

  const agent = mastra.getAgentById("profiling-agent");

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(files.length / BATCH_SIZE);

    const text = batch
      .map((f) => `\n--- ${f.name} ---\n${f.content}`)
      .join("\n");
    const prompt =
      batchNum === 1
        ? `First batch (${batchNum}/${total}). Build a profile from these files. Store everything in working memory:\n${text}`
        : `Batch ${batchNum}/${total}. Update working memory with any new info from these files:\n${text}`;

    const kb = (Buffer.byteLength(prompt, "utf-8") / 1024).toFixed(1);
    console.log(`\n=== Batch ${batchNum}/${total} (${kb} KB) ===`);

    const result = await agent.generate(prompt, {
      memory: { thread: "profile-session", resource: "test-user" },
    });
    console.log(result.text);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Fatal:", e.message ?? e);
  process.exit(1);
});
