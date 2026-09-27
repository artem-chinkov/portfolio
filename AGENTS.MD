# AGENTS.md — Context-Saving Settings (GPT-6 Astra)

## Token Budget

1. Your context is expensive. Do not duplicate files or request excessive terminal logs.
2. Instead of reading raw build/test logs, use condensed projections (distilled outputs): only the status and specific error lines.
3. Do not write lengthy code explanations. Provide only the finished diff or a compact code block.

## Reasoning Management

1. For simple refactoring tasks and syntax fixes, enforce the lowest planning effort (`reasoning.effort = low`).
2. Do not generate speculative code (code "for the future" or "just in case"). Write strictly what solves the current bug/task.

## Interaction Rules

- If you lack the information needed to solve a task, stop and ask one precise question instead of guessing and generating incorrect alternatives (which wastes input tokens on corrections).

## Portfolio Implementation

- Codex coordinates implementation and reviews the final result. Use available Codex sub-agents for isolated content, build, and QA work. Do not configure OpenRouter or assume external/free models are available.
- Give each sub-agent explicit file ownership; do not edit the same files concurrently.
- Use React, TypeScript, Vite, and locally bundled Nunito with Cyrillic support throughout the interface.
- Treat PROMT.MD as the brief, LINKS.MD as the current project destinations, and the approved plan as the resolution of earlier conflicting requirements.
- Maintain one shared implementation for all eight language/role routes, with static HTML metadata for GitHub Pages.
- Preserve source facts and the meaning of metrics. The four supplied Russian PDF resumes are used for both interface languages.
- Validate type checking, production build, responsive layouts, keyboard access, links, and the modal/carousel interactions before publishing through GitHub Actions.
- Never commit API keys, credentials, temporary Figma asset URLs, dependencies, or generated build/test output.
