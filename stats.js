const fmtTime = (s) => {
  s = Math.round(s);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};
const fmtInt = (n) =>
  n == null ? "n/a" : Math.round(n).toLocaleString("en-US");
const ROWS = [
  ["Build time", "wall_s", fmtTime, "min"],
  ["Model-active time", "model_s", fmtTime, null, true],
  ["Tool-active time", "tool_s", fmtTime, null, true],
  ["Tokens written", "out_tokens", fmtInt, null],
  ["of which thinking", "reasoning_tokens", fmtInt, null, true],
  ["Effective speed (tok/s)", "eff_tps", (v) => fmtInt(v), "max"],
  ["Input tokens, all calls", "in_tokens", fmtInt, null],
  ["Largest input, one call", "peak_ctx", fmtInt, null],
  ["Model calls", "calls", fmtInt, null],
  ["Tool calls", "tool_calls", fmtInt, null],
  ["Screenshot returns / reviews", "screenshots", fmtInt, null],
  ["Context compactions", "compactions", fmtInt, null],
  ["Git commits", "commits", fmtInt, null],
  [
    "Code size",
    "code_kb",
    (v, s) => `${v} KiB · ${fmtInt(s.code_lines)} lines`,
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
          return `<td class="${target !== null && v === target ? "best" : ""}">${v == null ? "n/a" : (c.key === "gpt-5.6-terra" && ["model_s", "eff_tps"].includes(key) ? "≈ " : "") + fmt(v, c.stats)}</td>`;
        })
        .join("") +
      "</tr>";
  }
  document.getElementById("stats").innerHTML = html + "</tbody>";

  const gemini = cols.find((run) => run.agents);
  document.getElementById("agents").hidden = !gemini;
  if (gemini) {
    const rows = ROWS.filter(([, key]) => key in gemini.agents[0]);
    document.getElementById("agentStats").innerHTML =
      "<thead><tr><th>Metric</th>" +
      gemini.agents.map((a) => "<th>" + a.name + "</th>").join("") +
      "</tr></thead><tbody>" +
      rows
        .map(
          ([label, key]) =>
            "<tr><td>" +
            label +
            "</td>" +
            gemini.agents
              .map((a) => "<td>" + fmtInt(a[key]) + "</td>")
              .join("") +
            "</tr>",
        )
        .join("") +
      "</tbody>";
  }

  const notes = [
    "Build time runs from the game prompt to the final answer. Model and tool times cover recorded activity. Parallel intervals within a category count once. Models and tools can overlap, and idle time can fall outside both.",
    "Effective speed divides recorded output tokens by model-active seconds. It includes prompt processing and network waits. Gemini’s rate covers two agents working concurrently. Engine decode speed measures a different part of the run.",
    "Input includes cached tokens where reported. Output includes thinking where reported. Tokenizers differ across providers. Hermes does not split reasoning from its output or include separate vision-helper tokens in its main API totals.",
    "Screenshot returns count images delivered in browser or file-tool results, including automatic frames and repeat views. Hermes counts successful vision analyses. A capture on disk alone does not count.",
    "Code size uses the final committed JavaScript, HTML and CSS, including development-server code. Dependencies and documentation are excluded.",
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
        `${r.name}: the prompt referred to “the game” in place of the localhost test URL.`,
      );
  }
  document.getElementById("notes").innerHTML = notes
    .map((n) => `<li>${n}</li>`)
    .join("");
}
