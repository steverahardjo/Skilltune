import { $ } from "bun"
import { rm, exists } from "node:fs/promises"
import { join } from "node:path"

const EXT_DIR = "extension"
const SRC_DIR = "src"

async function main() {
  console.log("[1/4] Cleaning output dir...")
  for (const sub of ["popup", "background", "content"]) {
    await rm(join(EXT_DIR, sub), { recursive: true, force: true })
  }

  console.log("[2/4] Building popup (React)...")
  await $`bun build ${SRC_DIR}/popup/index.html \
    --outdir=${EXT_DIR}/popup \
    --target=browser \
    --minify \
    --define 'process.env.NODE_ENV="production"'`

  console.log("[3/4] Building service worker...")
  await $`bun build ${SRC_DIR}/background/service-worker.ts \
    --outdir=${EXT_DIR}/background \
    --target=browser \
    --minify \
    --define 'DEV_MODE="false"'`

  console.log("[4/4] Building content script...")
  await $`bun build ${SRC_DIR}/content/content-script.ts \
    --outdir=${EXT_DIR}/content \
    --target=browser \
    --minify`

  if (await exists(join(SRC_DIR, "options"))) {
    console.log("[+1] Building options page...")
    await $`bun build ${SRC_DIR}/options/index.html \
      --outdir=${EXT_DIR}/options \
      --target=browser \
      --minify \
      --define 'process.env.NODE_ENV="production"'`
  }

  console.log("Done! Load extension/ directory in chrome://extensions")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
