---
name: image-prompt-refiner
description: Refine image-generation and image-editing requests before any image tool call. Use whenever the user wants to create, edit, restyle, extend, or concept an image, illustration, poster, thumbnail, logo, cover, mockup, or similar visual asset. Always ask 3-6 targeted clarification questions first unless the user explicitly says to skip questions, then synthesize the answers into a production-ready prompt and only after that continue to the actual image skill or tool.
---

# Image Prompt Refiner

## Overview

Run a short prompt-discovery interview before any image generation or image editing work.
Reduce vague prompts, surface hidden constraints early, and hand off a cleaner prompt to the actual image workflow.

## Workflow

1. Confirm the image objective before any image tool call.
2. Ask one concise batch of 3-6 questions.
3. Wait for the user's answers.
4. Synthesize a final prompt with explicit assumptions and constraints.
5. Only then continue to the image-generation or image-editing skill/tool.

If the user explicitly says "decide for me", "no questions", or equivalent, skip the interview, state the assumptions you are making, and proceed.

## Question Set

Pick the smallest useful set, but always cover at least 3 categories:

- Goal: what the image is for and where it will be used.
- Subject: who or what must appear.
- Style: realism, illustration, 3D, editorial, brand direction, era, mood.
- Composition: framing, camera angle, background, number of subjects, layout.
- Text and branding: exact text, logo usage, colors, forbidden wording.
- Output specs: aspect ratio, resolution, number of variations, transparent background or not.
- Constraints: what must be preserved, what to avoid, reference images, compliance or brand limits.

For image editing, always ask what must remain unchanged.
For brand or marketing assets, always ask about exact copy and brand constraints.
For person-based images, always ask whether likeness should match a reference.

## Interview Style

- Ask all questions in a single compact message, not one by one.
- Keep phrasing direct and concrete.
- Prefer grouped questions over a long checklist.
- Avoid asking about details the user already supplied.
- If the prompt is already strong, ask only the missing high-impact questions.

Use this pattern when helpful:

```text
Antes de gerar, preciso fechar 4 pontos:
1. Qual é o objetivo da imagem e onde ela vai ser usada?
2. Qual estilo visual você quer seguir?
3. O que obrigatoriamente precisa aparecer e o que deve ser evitado?
4. Qual formato de saída você quer: proporção, resolução e quantidade de variações?
```

## Prompt Handoff Format

After the user replies, produce a compact handoff block for the downstream image workflow:

- Final prompt: the main production-ready prompt.
- Output specs: aspect ratio, resolution, number of images, transparency if needed.
- Keep unchanged: only for edits or continuations.
- Avoid: optional negative guidance when useful.
- Assumptions: only include when you had to infer missing details.

Do not call the image tool before this handoff is ready.

## Guardrails

- Do not ask zero questions unless the user explicitly opts out.
- Do not ask more than 6 questions in the first round.
- Do not fragment the conversation into many tiny follow-ups if one bundled message can solve it.
- Do not hide assumptions; name them before proceeding.
- When the user is in a hurry, offer a "quick default" path with minimal questions.
