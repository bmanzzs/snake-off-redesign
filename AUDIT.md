# Snake-Off measurement audit

Rechecked on November 24, 2026 against the original run records. The figures below omit game letters so they can be read before a playtest.

| Entry | Wall time | Output tokens | Model calls | Tool calls | Screenshot returns or reviews | Git commits |
|---|---:|---:|---:|---:|---:|---:|
| Gemini 3.8 Flash run, both agents | 35m 06s | 142,562 | 191 | 198 | 121 | 5 |
| Gemma 4 31B | 15m 04s | 12,127 | 27 | 26 | 4 | 2 |
| Qwen 3.8 27B, fast | 31m 02s | 92,559 | 73 | 90 | 11 | 3 |
| Inkling 2 Mini 26B | 29m 48s | 44,002 | 82 | 81 | 13 | 1 |
| Claude Sonnet 5.5 | 9m 30s | 79,542 | 68 | 154 | 31 | 7 |
| Claude Opus 4.6 | 20m 53s | 53,511 | 134 | 147 | 46 | 2 |
| GPT-5.6 Terra | 5m 37s | 11,093 | 26 | 25 | 6 | 3 |

## How the records were reconciled

- **Hermes** — The game prompt and first final answer in each session database define the run window. Sum the matching main-model API usage lines inside that window. The previous collector also picked up post-answer calls, raising the published output totals for Gemma (13,938), Qwen (93,814), and Inkling (50,486). Count each dispatched tool ID once across the original and compacted histories. This reduces Qwen’s 113 tool-result rows to 90 calls and Inkling’s 103 rows to 81. Only successful vision results count toward screenshot reviews. Gemma made 10 terminal calls among its 26 total tool calls.
- **Claude Code** — Group transcript fragments by API response and match their request IDs. Count reported usage once per response, including input cache creation and reads. Match tool-use and tool-result IDs, merging overlapping tool intervals. Sonnet’s tool-active time falls from 123 to 81 seconds. Count actual browser image returns, including images attached to actions other than explicit screenshot commands. Both models’ published output-token totals were confirmed.
- **Codex** — The completed game rollout contains 26 usage updates with advancing cumulative totals. Its final cumulative usage confirms 11,093 output tokens. Matching tool calls to their results gives 25 calls and six image returns. The separate wrong-folder attempt is excluded. Direct inference timing was unavailable, so the displayed model time and effective speed carry an approximation mark.
- **Antigravity** — The coding trajectory and its linked browser-test trajectory contain 54 and 137 metered responses respectively. Sum each response’s input, cache reads and cache writes for input volume. Recorded output includes reasoning. The coding agent produced 38,605 tokens, including 11,662 thinking tokens. The tester produced 103,957, including 73,392 thinking tokens. It also recorded six context-compaction checkpoints. Tool totals include dispatched attempts. Tool time uses completed intervals. The tester saved 118 screenshot files. Across both trajectories there were 121 image returns, including repeat reads.
- **Time and throughput** — Wall time spans the game prompt through the final answer. Within a category, overlapping observed intervals count once. Tools can run during a model interval, and the harness can spend time outside both categories. For Gemini this produces a run-level effective throughput across concurrent workers. Local main-model token totals exclude separate vision-helper inference. Token counts across vendors use different tokenizers.
- **Engine summaries** — Inkling’s raw decode rate of 66.15 tok/s was reproduced from the archived engine log. Qwen’s 117.85 tok/s was confirmed against the original five-game and six-game published summaries. Its historical raw engine log was unavailable to recompute that figure.
- **Source size and commits** — Count commits touching the game project and read authored HTML, JS, MJS, CJS and CSS from the final Git blobs. Include tracked development servers. Omit dependencies, docs and lockfiles. This removes working-tree line-ending differences, bringing Sonnet’s measured size from 37.4 to 36.5 KiB. Final game commits used for the check were `05e5de9` (Gemini), `dc1f571` (Gemma), `f7ac37f` (Qwen), `901201c` (Inkling), `3fa7647` (Sonnet), `6c20aab` (Opus) and `ecaf086` (Terra).
