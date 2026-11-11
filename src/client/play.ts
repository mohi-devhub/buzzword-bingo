// Toggles visitor bingo cells, restores local state, and announces completed lines.
// Uses the same fixed card logic while keeping game state off the network.
import { evaluateBingo } from "../bingo.js";
const card = document.querySelector<HTMLElement>("[data-play-card]");
const buttons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-cell]"),
);
const storageKey = `buzzword-bingo:play:${card?.dataset.version}`;
let marked = new Set<string>();
try {
  const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (Array.isArray(saved))
    marked = new Set(
      saved.filter((value): value is string => typeof value === "string"),
    );
} catch {
  /* A blocked storage area does not prevent a local round. */
}
function update() {
  const bingo = evaluateBingo(marked);
  buttons.forEach((button, index) => {
    const hit = bingo.cells[index]?.hit ?? false;
    button.classList.toggle("hit", hit);
    button.setAttribute("aria-pressed", String(hit));
    const label = button.querySelector(".cell-count");
    if (label && button.dataset.phrase)
      label.textContent = hit ? "spotted ✓" : "tap to dab";
  });
  const hits = document.querySelector("[data-game-hits]");
  const line = document.querySelector("[data-game-line]");
  const message = document.querySelector("[data-game-message]");
  if (hits)
    hits.textContent = String(
      bingo.cells.filter((cell) => cell.hit && cell.phraseId !== null).length,
    );
  if (line) line.textContent = String(bingo.bestLine.hits);
  if (message)
    message.textContent = bingo.hasBingo
      ? "BINGO. Naturally."
      : marked.size
        ? "Keep your eyes peeled."
        : "Eyes down.";
  try {
    localStorage.setItem(storageKey, JSON.stringify([...marked]));
  } catch {
    /* The round still works without persistence. */
  }
}
buttons.forEach((button) =>
  button.addEventListener("click", () => {
    const phrase = button.dataset.phrase;
    if (!phrase) return;
    if (marked.has(phrase)) marked.delete(phrase);
    else marked.add(phrase);
    update();
  }),
);
document.querySelector("[data-game-reset]")?.addEventListener("click", () => {
  marked.clear();
  update();
});
update();
