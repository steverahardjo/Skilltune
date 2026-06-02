# Licensing

## Project License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

```
Resume Adjuster — Chrome extension for tailoring resumes to job postings
Copyright (C) 2026  <Author Name>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

### Why AGPL-3.0?

- **Network use is distribution**: The extension invokes backend LLM and Typst services. AGPL ensures that if the processing backend is deployed as a service, its source code must also be made available to users.
- **Copyleft**: Any derivative works (forks, modifications distributed publicly) must remain open under the same terms.
- **Chrome Web Store compliance**: AGPL-3.0 is compatible with Chrome Web Store distribution; the source must be made available alongside the extension listing.

## Third-Party Dependencies

| Dependency | License | Usage |
|---|---|---|
| React | MIT | Popup/options UI |
| React DOM | MIT | Popup/options UI rendering |
| Bun | MIT | Build tooling, dev server |
| Typst CLI | Apache-2.0 | Resume template compilation |
| Chrome Extensions API | BSD-style | Extension runtime |

## LLM API Usage

This extension integrates with third-party LLM providers (OpenAI, Anthropic, or self-hosted). Users must provide their own API keys. The extension does not bundle or redistribute any LLM model weights.

- **Data sent to LLM APIs**: Job posting text, resume content. Users should review the privacy policy of their chosen LLM provider.
- **Self-hosted option**: The extension supports local LLM backends via OpenAI-compatible endpoints. No data leaves the user's machine in this configuration.

## Typst Integration

Typst is invoked as a local CLI tool or via its WebAssembly build. No separate license is required beyond Typst's Apache-2.0 terms. Resume templates authored by the user remain under the user's chosen license.

## Attribution

If you redistribute this extension or create a derivative work, you must:
1. Retain the original copyright notice
2. State significant changes made
3. Make source code available under AGPL-3.0
4. Include a copy of the license
