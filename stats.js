const fmtTime = (s) => {
  s = Math.round(s);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};
const fmtInt = (n) =>
  n == null ? "n/a" : Math.round(n).toLocaleString("en-US");
const fmtK = (n) =>
  n == null
    ? "n/a"
    : n >= 1e6
      ? (n / 1e6).toFixed(1) + "M"
      : Math.round(n / 1000) + "K";

const ROWS = [
  ["Build time", "wall_s", fmtTime, "min"],
  ["waiting on the model", "model_s", fmtTime, null, true],
  ["running tools (browser, npm, git)", "tool_s", fmtTime, null, true],
  ["Tokens written", "out_tokens", fmtInt, null],
  ["of which thinking", "reasoning_tokens", fmtInt, null, true],
  ["Effective speed (tok/s)", "eff_tps", (v) => fmtInt(v), "max"],
  ["Tokens read, all calls", "in_tokens", fmtK, null],
  ["Biggest context", "peak_ctx", fmtK, null],
  ["Model calls", "calls", fmtInt, null],
  ["Tool calls", "tool_calls", fmtInt, null],
  ["Screenshots looked at", "screenshots", fmtInt, null],
  ["Context compactions", "compactions", fmtInt, null],
  ["Git commits", "commits", fmtInt, null],
  [
    "Code size",
    "code_kb",
    (v, s) => `${v} KB · ${fmtInt(s.code_lines)} lines`,
    null,
  ],
];

function renderStats() {
  const letters = GAMES.map((g) => g.letter);
  const cols = letters.map((L) => revealed[L]);
  let html =
    "<thead><tr><th></th>" +
    cols
      .map((c, i) => `<th>Game ${letters[i]}<small>${c.name}</small></th>`)
      .join("") +
    "</tr></thead><tbody>";
  for (const [label, key] of [
    ["Creator", "maker"],
    ["Coding agent", "harness"],
    ["Run environment", "where"],
  ]) {
    html +=
      "<tr><td>" +
      label +
      "</td>" +
      cols.map((run) => "<td>" + run[key] + "</td>").join("") +
      "</tr>";
  }
  for (const [label, key, fmt, best, sub] of ROWS) {
    const vals = cols.map((c) => c.stats[key]);
    const nums = vals.filter((v) => typeof v === "number");
    const target =
      best === "min"
        ? Math.min(...nums)
        : best === "max"
          ? Math.max(...nums)
          : null;
    html +=
      `<tr class="${sub ? "sub" : ""}"><td>${label}</td>` +
      cols
        .map((c, i) => {
          const v = vals[i];
          return `<td class="${target !== null && v === target ? "best" : ""}">${v == null ? "n/a" : fmt(v, c.stats)}</td>`;
        })
        .join("") +
      "</tr>";
  }
  document.getElementById("stats").innerHTML = html + "</tbody>";

  const notes = [
    "Effective speed is tokens written divided by time spent waiting on the model, so it also counts reading the prompt and network time. The cloud models' raw writing speed is higher than shown.",
    "Each company counts tokens with its own tokenizer, so token numbers are close but not exact across models.",
    "The local runs think out loud inside their output; that thinking isn't split out.",
  ];
  for (const L of letters) {
    const r = revealed[L];
    if (r.note) notes.push(`${r.name}: ${r.note}`);
    if (r.engine)
      notes.push(
        `${r.name}: raw writing speed on the NAS was ${fmtInt(r.engine.decode_tps)} tok/s, reading ${fmtInt(r.engine.prompt_tps)} tok/s, with ${Math.round(100 * r.engine.draft_accept)}% of its guess-ahead (speculative) tokens accepted.`,
      );
    if (r.prompt_changes && r.prompt_changes.length)
      notes.push(
        `${r.name}: the test URL in the prompt was swapped for "the game", since its app had no server at that address. A 67-second false start (wrong folder) isn't counted. Codex also packs several actions into one tool call, so its tool count is low by design.`,
      );
  }
  document.getElementById("notes").innerHTML = notes
    .map((n) => `<li>${n}</li>`)
    .join("");
}
