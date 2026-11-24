# Snake-Off

Six AI coding agents got the same one-shot prompt: build a 3D snake game in Three.js. Play them blind, guess which AI made which, then hit Reveal.

**Play it:** https://bmanzzs.github.io/snake-off-redesign/ (arrow keys, WASD, or touch steering)

## The contestants

- Gemma 4 31B on Ollama, 4-bit (Google's QAT build), running locally on a home NAS with two Tesla V100s (added a day later)
- Qwen 3.8 27B on a V100-tuned llama.cpp build, 6-bit, same NAS
- Inkling 2 Mini 26B on a V100-tuned llama.cpp build, 4-bit, same NAS (one card; added a day later)
- Claude Sonnet 5.5 (Claude Code)
- Claude Opus 4.6 (Claude Code)
- GPT-5.6 Terra, high effort (Codex)

Which one is Game A to F is hidden behind the Reveal button on the page, along with stats for each run: build time, tokens written and read, speed, tool calls, screenshots, commits and code size.

## The rules

Every agent got the same prompt (shown on the page). There were no follow-ups, no hints and no human edits. Each one could write files, run commands, open its own game in a browser and look at screenshots. The local runs used the Hermes agent in a sandbox with an offline browser.

Each folder `a` to `f` is the game exactly as its agent left it, plus the Three.js 0.187.0 files it loads (MIT license, included).

## Updating the comparison

This standalone redesign shares history with [the original experiment](https://github.com/bmanzzs/snake-off). GitHub Pages serves the root of `main` directly.

When Gemini’s run is ready, place the original game in its anonymous folder. Update the letter/path list and the model choices in `runs.js`, the matching letter entries in `results.json`, and each thumbnail in `assets/game-<letter>.webp`. Shuffle the assignments together so returning visitors cannot identify the new model by elimination. Change `ROUND` for the new lineup to keep ballots from different rounds separate. Keep unavailable measurements as JSON null. The player, picker, score and table derive their size from the roster.
