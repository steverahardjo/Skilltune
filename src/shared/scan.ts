import { scanPage } from "../services/scanner"

export async function scanCurrentPage(): Promise<{ screenshot: string }> {
  return scanPage()
}
