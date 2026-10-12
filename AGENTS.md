# Repository Guidance

This file applies to the entire `deck.gl` repository. More specific `AGENTS.md` files in
subdirectories may add local guidance.

## Setup Commands

- Install dependencies from the repo root: `yarn`
- Build packages: `yarn build`
- Run lint: `yarn lint`
- Run all tests: `yarn test`
- Run headless tests: `yarn test-headless`
- Run render tests: `yarn test-render`
- Run browser tests: `yarn test-browser`
- Run website checks: `yarn test-website`
- Use the exact script names from `package.json`; do not substitute spaced forms such as
  `yarn test headless`.

## Before Committing

- Run the most relevant tests for the changed packages, integrations, examples, or docs.
- Run `yarn lint` for JavaScript and TypeScript changes. If lint failures are unrelated existing
  issues, call that out explicitly instead of hiding it.
- If dependencies or package metadata changed, run `yarn` in the repo root and include any
  `yarn.lock` updates.
- Do not reformat files you are not otherwise changing. Keep formatting-only churn separate from
  logic changes when practical.

## Ready For Merge

When asked to "get ready for merge", do a full merge-readiness pass:

- Audit the public API surface touched by the change. Add or update TSDoc for every new or changed
  public class, function, method, property, and type.
- Do a documentation pass when behavior, public API, examples, or migration guidance changed.
  Include relevant module docs, examples, sidebars, `docs/whats-new.md`, and upgrade or migration
  guide content.
- Keep upgrade guides focused on breaking changes, removals, and deprecations. Put new-feature
  notes in the appropriate module docs or release notes instead.
- Run `yarn` in the repo root so workspace metadata and `yarn.lock` are up to date, especially
  after any `package.json` change.
- Run `yarn build` as the repo-wide type, declaration, and package build gate.
- Run `yarn lint` for the final lint and formatting gate, then review the resulting diff.
- Run the relevant tests for the changed packages, examples, integrations, and docs/website wiring.
  Typical commands are `yarn test`, `yarn test-headless`, `yarn test-render`, `yarn test-browser`,
  and `yarn test-website`.
- For website or docs changes, run the website check from the repo root with `yarn test-website`.
- Prepare a copyable Markdown PR description based on the branch diff compared to `master`. Start
  with the PR goals, then list the actual changes and validation.
- In the final handoff, call out which merge-readiness gates passed, which were not run, and any
  remaining risk or unrelated pre-existing failures.

## Code Style

- Prefer TypeScript and ES module syntax.
- Match the surrounding file style. In source files, use single quotes and semicolons.
- Never abbreviate variable names. Use camelCase for variables, functions, and fields; PascalCase
  for types and classes; and CAPITAL_CASE for constants.
- Prefer verb-noun names for functions and methods.
- File names should be kebab-case unless an existing local convention differs.

## Dependencies

- Be conservative with new external dependencies. Add one only when it provides meaningful
  capability, not just a small utility.
- Prefer vis.gl ecosystem packages when they fit the layering. Lower-level math or utility modules
  should not depend on deck.gl.
- Prefer math.gl modules for math helpers.
- Avoid lodash-style dependencies for simple operations.

## Investigation

- Do not fix problems by adding caches. Investigate why the problem occurs and address the root
  cause.

## Google Drive Build 交付規範（所有 Agent 必須遵守）
- 此 Git Repo 專屬交付位置為 Google Drive `AI Project/deck.gl/`（資料夾名稱必須等同 Repository；AI Project ID: `1Yhfro6Ss5TSCXCVIZIHEu5h7V1gL8b27`）。不可在 `AI Project/` 根目錄散放 Build 或每次 Build 新增頂層版本資料夾。
- **最新完整、已測試可執行的 Build 直接放專案資料夾根目錄**，同時附 ZIP／安裝包、SHA-256、完整分卷與必要還原／使用說明；多平台最新版可並存。先驗證上傳後的檔名、parent、大小及校驗；缺 ZIP／分片、只有 SHA 等不完整版本不得取代前一完整最新版。
- **僅有重要功能、架構、相容性、美術里程碑差異才新增 `vX.Y.Z-說明/` 版本子資料夾**；普通舊 Build 移往 `歷史封存/`（不刪檔）。不要每次發布都新建版本資料夾。
- 新開發一定提交／推送 GitHub；昂貴 Actions 建置僅必要手動 `workflow_dispatch` 或正式 `release: published`，避免每次 push main 都觸發。每次交付回報 Drive 專案資料夾連結、版本、校驗檔與實測結果。
**English for Codex:** Current verified build(s) belong at `AI Project/deck.gl/`; milestone versions use `vX.Y.Z-description/`, routine old builds use `歷史封存/` non-destructively. Never promote incomplete uploads.
