interface ScanMessage {
  type: "SCAN_PAGE"
}

interface FillMessage {
  type: "FILL_FORM"
  fields: Record<string, string>
}

interface ScanResponse {
  title: string
  url: string
  text: string
}

interface FormField {
  name: string
  id: string
  type: string
  label: string
  placeholder: string
  tagName: string
  options: string[]
}

interface ExtractResponse {
  url: string
  fields: FormField[]
}

const MAX_CHARS = 12000

function extractText(): ScanResponse {
  const title = document.title.trim()
  const body = document.body.innerText

  const cleaned = body
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .slice(0, MAX_CHARS)
    .trim()

  console.log(
    `[content] Extracted ${cleaned.length} chars from "${title}"`
  )

  return { title, url: location.href, text: cleaned }
}

function getLabel(el: HTMLElement): string {
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label?.textContent) return label.textContent.trim()
  }
  let parent = el.closest("label")
  if (parent?.textContent) return parent.textContent.replace(el.textContent || "", "").trim()
  parent = el.parentElement
  if (parent?.textContent) {
    const text = parent.textContent.trim()
    if (text.length < 80) return text
  }
  const aria = el.getAttribute("aria-label")
  if (aria) return aria
  return ""
}

function extractFormFields(): ExtractResponse {
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image']), select, textarea"
  )

  const fields: FormField[] = []

  for (const el of inputs) {
    const tag = el.tagName.toLowerCase()
    const type = el.getAttribute("type") || (tag === "select" ? "select" : tag === "textarea" ? "textarea" : "text")
    const name = el.getAttribute("name") || el.getAttribute("id") || ""
    const id = el.getAttribute("id") || ""
    const placeholder = el.getAttribute("placeholder") || ""
    const label = getLabel(el)

    const options: string[] = []
    if (tag === "select") {
      const sel = el as HTMLSelectElement
      for (const opt of sel.options) {
        if (opt.value) options.push(opt.value)
      }
    }

    fields.push({
      name: name.slice(0, 100),
      id: id.slice(0, 100),
      type,
      label: label.slice(0, 200),
      placeholder: placeholder.slice(0, 200),
      tagName: tag,
      options,
    })
  }

  console.log(`[content] Extracted ${fields.length} form fields`)
  return { url: location.href, fields }
}

function fillFormFields(values: Record<string, string>): { filled: number; errors: string[] } {
  const errors: string[] = []
  let filled = 0

  for (const [key, value] of Object.entries(values)) {
    if (!value) continue
    const el = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[name="${key}"], [id="${key}"]`
    )
    if (!el) {
      errors.push(`Field not found: ${key}`)
      continue
    }

    try {
      const tag = el.tagName.toLowerCase()
      if (tag === "select") {
        const sel = el as HTMLSelectElement
        const match = Array.from(sel.options).find(
          (o) => o.value.toLowerCase() === value.toLowerCase() ||
                 o.textContent?.toLowerCase().includes(value.toLowerCase())
        )
        if (match) {
          sel.value = match.value
          sel.dispatchEvent(new Event("change", { bubbles: true }))
        } else {
          errors.push(`No option matching "${value}" for ${key}`)
          continue
        }
      } else {
        const input = el as HTMLInputElement
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, "value"
        )!.set!
        nativeInputValueSetter.call(input, value)
        input.dispatchEvent(new Event("input", { bubbles: true }))
        input.dispatchEvent(new Event("change", { bubbles: true }))
      }
      filled++
    } catch (e) {
      errors.push(`Failed to fill ${key}: ${e}`)
    }
  }

  return { filled, errors }
}

chrome.runtime.onMessage.addListener(
  (message: ScanMessage | FillMessage, _sender, sendResponse) => {
    if (message.type === "SCAN_PAGE") {
      sendResponse(extractText())
      return true
    }
    if (message.type === "FILL_FORM") {
      sendResponse(fillFormFields(message.fields))
      return true
    }
    return false
  }
)
