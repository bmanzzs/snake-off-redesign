# Snake-Off

Seven AI coding agents got the same one-shot prompt: build a 3D snake game in Three.js. Play them blind, guess which AI made which, then hit Reveal.

**Play it:** https://bmanzzs.github.io/snake-off-redesign/ (arrow keys, WASD, or touch steering)

## The contestants

- Gemma 4 31B on Ollama, 4-bit (Google's QAT build), running locally on a home NAS with two Tesla V100s (added a day later)
- Qwen 3.8 27B on a V100-tuned llama.cpp build, 6-bit, same NAS
- Inkling 2 Mini 26B on a V100-tuned llama.cpp build, 4-bit, same NAS (one card; added a day later)
- Claude Sonnet 5.5 (Claude Code)
- Claude Opus 4.6 (Claude Code)
- GPT-5.6 Terra, high effort (Codex)
- Gemini 3.8 Flash, High (Antigravity)

Which one is Game A to G is hidden behind the Reveal button on the page, along with stats for each run: build time, tokens written and read, speed, tool calls, screenshots, commits and code size.

## The rules

Every agent got the shared game brief shown on the page. The reveal records small test-URL wording differences. There were no follow-ups, no hints and no human edits. Each one could write files, run commands, open its own game in a browser and look at screenshots. The local runs used the Hermes agent in a sandbox with an offline browser.

Each game folder under `round-7-shuffle-2/` is the game exactly as its agent left it, plus the Three.js 0.187.0 files it loads (MIT license, included).

## Updating the comparison

This standalone redesign shares history with [the original experiment](https://github.com/bmanzzs/snake-off). GitHub Pages serves the root of `main` directly.

The active roster is in `runs.js`. The reveal reads `results.json`, including the breakdown for Gemini’s browser tester. Each game directory contains its own preview image. A new lineup gets a fresh round ID and shuffled letters.

The [measurement audit](AUDIT.md) explains the source records, corrections, and limits.
