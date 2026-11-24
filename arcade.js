const $ = (selector) => document.querySelector(selector);
const letters = GAMES.map((game) => game.letter);
const options = Object.entries(NAMES).sort((a, b) => a[1].localeCompare(b[1]));
// Keep ballots when updating the presentation. A changed lineup or key starts a fresh ballot.
const storageKey = "snakeoff.arcade." + ROUND;
function readBallot() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) return saved;
    if (ROUND === "2026-11-six-gemma") {
      return {
        guesses: JSON.parse(localStorage.getItem("snakeoff7.guesses")),
        favorite: JSON.parse(localStorage.getItem("snakeoff7.fav")),
        shown: JSON.parse(localStorage.getItem("snakeoff7.revealed")),
      };
    }
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  return {};
}
const ballot = readBallot();
const guesses = {};
for (const letter of letters) {
  const key = ballot.guesses?.[letter];
  if (Object.hasOwn(NAMES, key) && !Object.values(guesses).includes(key))
    guesses[letter] = key;
}
let favorite = letters.includes(ballot.favorite) ? ballot.favorite : null;
const visited = new Set(
  Array.isArray(ballot.visited)
    ? ballot.visited.filter((l) => letters.includes(l))
    : [],
);
let revealed = null;
let current = null;
const dialog = $("#dialog");
function save() {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        guesses,
        favorite,
        visited: [...visited],
        shown: !!revealed,
      }),
    );
  } catch {}
}
function showDialog(kicker, title, content) {
  $("#dKicker").textContent = kicker;
  $("#dTitle").textContent = title;
  $("#dBody").replaceChildren(content);
  if (!dialog.open) dialog.showModal();
}
function button(label, className, action) {
  const node = document.createElement("button");
  node.textContent = label;
  node.className = className;
  node.addEventListener("click", action);
  return node;
}
function choose(letter) {
  if (revealed) return;
  const content = document.createElement("div");
  for (const [key, name] of options) {
    const owner = letters.find((l) => guesses[l] === key);
    const selected = owner === letter;
    const item = button(name, "option", () => {
      if (owner) delete guesses[owner];
      guesses[letter] = key;
      finishPick();
    });
    item.setAttribute("aria-pressed", String(selected));
    const status = document.createElement("small");
    status.textContent = selected
      ? "âœ“ Selected"
      : owner
        ? "Move from " + owner
        : "Available";
    item.append(status);
    content.append(item);
  }
  if (guesses[letter])
    content.append(
      button("Clear this guess", "clear", () => {
        delete guesses[letter];
        finishPick();
      }),
    );
  showDialog("YOUR BALLOT", "Who built Game " + letter + "?", content);
  function finishPick() {
    dialog.close();
    save();
    render();
    if (current) $("#screen iframe")?.focus();
    else
      document
        .getElementById("guess-" + letter)
        ?.focus({ preventScroll: true });
  }
}
function card(game) {
  const l = game.letter;
  const answer = revealed?.[l];
  const pick = guesses[l];
  const node = document.createElement("article");
  node.className = "card";
  node.innerHTML = `<a class="preview" href="#play-${l}" aria-label="Play Game ${l}"><img alt="" src="round-7/${l.toLowerCase()}/preview.webp"><span class="chip">${l}</span></a>
    <div class="info"><div class="cardline"><h3>Game ${l}</h3><button class="fav" aria-label="Favorite Game ${l}" title="Favorite Game ${l}" aria-pressed="${favorite === l}">${favorite === l ? "â˜…" : "â˜†"}</button></div>
    <p class="meta"></p><div class="cardfoot"><a class="btn" href="#play-${l}" aria-label="Play Game ${l}">â–¶ &nbsp;Play</a></div></div>`;
  node.querySelector(".fav").addEventListener("click", () => {
    favorite = favorite === l ? null : l;
    save();
    for (const [index, star] of document.querySelectorAll(".fav").entries()) {
      const chosen = letters[index] === favorite;
      star.setAttribute("aria-pressed", String(chosen));
      star.textContent = chosen ? "â˜…" : "â˜†";
    }
  });
  node.querySelector(".meta").textContent = answer
    ? answer.name + " Â· " + answer.harness
    : visited.has(l)
      ? "Visited"
      : "Unplayed";
  if (answer) {
    const verdict = document.createElement("span");
    verdict.className = "meta verdict";
    verdict.textContent = pick
      ? pick === answer.key
        ? "âœ“ Correct"
        : "Guessed " + NAMES[pick]
      : "No guess";
    node.querySelector(".cardfoot").append(verdict);
  } else {
    const picker = button(pick ? NAMES[pick] : "Choose model", "choose", () =>
      choose(l),
    );
    picker.id = "guess-" + l;
    picker.setAttribute(
      "aria-label",
      "Choose model for Game " + l + (pick ? ", currently " + NAMES[pick] : ""),
    );
    node.querySelector(".cardfoot").append(picker);
  }
  return node;
}
function render() {
  $("#games").replaceChildren(...GAMES.map(card));
  const count = Object.keys(guesses).length;
  $("#count").textContent = count + " / " + letters.length + " guesses";
  $("#ticks").innerHTML = letters
    .map((l) => '<i class="' + (guesses[l] ? "full" : "") + '"></i>')
    .join("");
  const next = letters.find((l) => !visited.has(l));
  $("#start").href = next ? "#play-" + next : "#arcade";
  $("#start").textContent = !visited.size
    ? "â–¶  Start playtest"
    : next
      ? "â–¶  Continue playtest"
      : "Review your ballot";
  $("#reveal").textContent = revealed ? "Hide answers" : "Reveal results";
  $("#revealTitle").textContent = revealed
    ? letters.filter((l) => guesses[l] === revealed[l].key).length +
      " of " +
      letters.length +
      " correct"
    : "Ready for the reveal?";
  $("#summary").textContent = revealed
    ? "Your picks and the models behind each game are shown above."
    : "See who built each game and compare their runs.";
  $("#results").hidden = !revealed;
  if (revealed) {
    renderStats();
    const times = Object.values(revealed)
      .filter((run) => Number.isFinite(run.stats.wall_s))
      .sort((a, b) => a.stats.wall_s - b.stats.wall_s);
    $("#facts").textContent = times.length
      ? times[0].name +
        " finished first in " +
        fmtTime(times[0].stats.wall_s) +
        ". The longest run took " +
        fmtTime(times.at(-1).stats.wall_s) +
        "."
      : "";
  }
  if (current) {
    $("#pickInGame").hidden = !!revealed;
    $("#pickInGame").textContent = guesses[current]
      ? "Guess: " + NAMES[guesses[current]]
      : "Choose model";
  }
}
function route() {
  const game = GAMES.find((g) => location.hash === "#play-" + g.letter);
  $("#lobby").hidden = !!game;
  $("#player").hidden = !game;
  const screen = $("#screen");
  if (!game) {
    const prior = current;
    current = null;
    screen.replaceChildren();
    document.title = "Snake-Off â€” The blind AI arcade";
    render();
    if (prior) {
      const tile = document.querySelector(
        '.preview[href="#play-' + prior + '"]',
      );
      tile.focus({ preventScroll: true });
      tile.scrollIntoView({ block: "center", behavior: "instant" });
    }
    return;
  }
  if (current === game.letter) return;
  current = game.letter;
  visited.add(current);
  save();
  const index = letters.indexOf(current);
  const next = letters[index + 1];
  $("#playing").textContent =
    "Game " + current + " Â· " + (index + 1) + "/" + letters.length;
  $("#nextGame").textContent = next ? "Next game Â· " + next : "Review ballot";
  $("#nextGame").href = next ? "#play-" + next : "#arcade";
  document.title = "Game " + current + " Â· Snake-Off";
  render();
  const frame = document.createElement("iframe");
  frame.title = "Game " + current;
  frame.src = game.href;
  frame.addEventListener("load", () => {
    if (frame.isConnected && !dialog.open) frame.contentWindow.focus();
  });
  screen.replaceChildren(frame);
}
$("#pickInGame").addEventListener("click", () => choose(current));
$("#reveal").addEventListener("click", () => {
  if (revealed) {
    revealed = null;
    save();
    render();
    return;
  }
  const content = document.createElement("div");
  const text = document.createElement("p");
  text.textContent =
    "You have picked " +
    Object.keys(guesses).length +
    " of " +
    letters.length +
    " models. Revealing shows every answer and unlocks the run comparison.";
  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(
    button("Keep guessing", "btn", () => dialog.close()),
    button("Reveal all", "btn primary", async () => {
      if (await loadResults()) {
        dialog.close();
        $("#revealTitle").scrollIntoView({ block: "start" });
      }
    }),
  );
  content.append(text, actions);
  showDialog("END PLAYTEST", "Reveal the models?", content);
});
for (const control of document.querySelectorAll("[data-prompt]"))
  control.addEventListener("click", () => {
    showDialog(
      "THE EXPERIMENT",
      "One shared prompt",
      $("#prompt").content.cloneNode(true),
    );
  });
$(".close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  if (
    event.target === dialog &&
    (event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom)
  )
    dialog.close();
});
for (const control of document.querySelectorAll("[data-key]")) {
  control.addEventListener("click", () => {
    const gameWindow = $("#screen iframe")?.contentWindow;
    if (!gameWindow) return;
    const key = "Arrow" + control.dataset.key;
    gameWindow.focus();
    for (const type of ["keydown", "keyup"]) {
      gameWindow.document.dispatchEvent(
        new gameWindow.KeyboardEvent(type, {
          key,
          code: key,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  });
}
const modelCount = new Intl.NumberFormat("en-US").format(letters.length);
$("#pitch").textContent =
  modelCount +
  " AI models got one prompt: build 3D Snake. Play their games blind. Can you tell who built which?";
async function loadResults() {
  try {
    const response = await fetch("results.json");
    if (!response.ok) throw new Error("Run data unavailable");
    const data = await response.json();
    if (
      !letters.every((l) => data[l]?.stats && Object.hasOwn(NAMES, data[l].key))
    )
      throw new Error("Incomplete run");
    revealed = data;
    save();
    render();
    return true;
  } catch {
    const message = document.createElement("p");
    message.textContent =
      "The run data could not be loaded. Close this message and try Reveal results again.";
    showDialog("RUN DATA", "Couldnâ€™t load results", message);
    return false;
  }
}
window.addEventListener("hashchange", route);
route();
if (ballot.shown) loadResults();
