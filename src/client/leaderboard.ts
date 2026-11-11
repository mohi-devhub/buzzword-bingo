// Switches cohort tabs and sorts saved company rows by exact density values.
// Keeps all filtering local while preserving keyboard navigation and honest zero scores.
const tabs = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-cohort-tab]"),
);
function selectTab(tab: HTMLButtonElement) {
  for (const candidate of tabs) {
    const selected = candidate === tab;
    candidate.setAttribute("aria-selected", String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(
      candidate.getAttribute("aria-controls") || "",
    );
    if (panel) panel.hidden = !selected;
  }
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + tabs.length - 1) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    const target = tabs[next];
    if (target) {
      selectTab(target);
      target.focus();
    }
  });
});

document
  .querySelectorAll<HTMLElement>(".leaderboard-panel")
  .forEach((panel) => {
    const rows = Array.from(
      panel.querySelectorAll<HTMLTableRowElement>("[data-row]"),
    );
    const body = panel.querySelector("tbody");
    const selector = panel.querySelector("select");
    const buttons = Array.from(
      panel.querySelectorAll<HTMLButtonElement>("[data-order]"),
    );
    let order = "most";
    function update() {
      const key = selector?.value || "density";
      const value = (row: HTMLTableRowElement) =>
        Number(row.getAttribute(`data-${key}`));
      rows.sort(
        (a, b) =>
          (order === "most" ? value(b) - value(a) : value(a) - value(b)) ||
          (a.dataset.slug || "").localeCompare(b.dataset.slug || ""),
      );
      rows.forEach((row, index) => {
        row.hidden = index >= Number(panel.dataset.limit);
        const rank = row.querySelector("[data-rank]");
        const score = row.querySelector("[data-score]");
        if (rank) rank.textContent = String(index + 1).padStart(2, "0");
        if (score) score.textContent = value(row).toFixed(2);
        row
          .querySelector(".density-col")
          ?.classList.toggle("zero-density", value(row) === 0);
        body?.append(row);
      });
      panel
        .querySelector("th.density-col")
        ?.setAttribute(
          "aria-sort",
          order === "most" ? "descending" : "ascending",
        );
      const arrow = panel.querySelector("[data-sort-arrow]");
      if (arrow) arrow.classList.toggle("ascending", order === "least");
      buttons.forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.order === order),
        ),
      );
      const note = panel.querySelector<HTMLElement>(".least-note");
      if (note) note.hidden = order !== "least";
    }
    buttons.forEach((button) =>
      button.addEventListener("click", () => {
        order = button.dataset.order || "most";
        update();
      }),
    );
    selector?.addEventListener("change", update);
  });
