// Popover: общий лог бросков и быстрые кубики (кнопка расширения сверху слева)
import OBR from "@owlbear-rodeo/sdk";
import { CHANNEL_ROLL, META_CHARACTER, openSheet } from "./constants";
import { rollFormula } from "./dice";
import type { RollMessage } from "./types";

const DICE = [4, 6, 8, 10, 12, 20, 100];

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>Листы персонажей</h1>
  <div id="tokens" class="tokens"><p class="hint">Загрузка сцены…</p></div>
  <p class="hint">Или: выделить токен → значок «Лист персонажа» в появившемся меню (правый клик).</p>
  <h1>Броски</h1>
  <div class="row wrap">${DICE.map((d) => `<button data-die="${d}">d${d}</button>`).join("")}</div>
  <form id="f" class="row"><input id="formula" placeholder="2d6+3"><button>Бросить</button></form>
  <h2>Лог</h2>
  <ul id="log"></ul>
`;

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

async function renderTokens() {
  const box = document.querySelector<HTMLDivElement>("#tokens")!;
  if (!(await OBR.scene.isReady())) return void (box.innerHTML = `<p class="hint">Откройте сцену, чтобы увидеть токены.</p>`);
  const items = await OBR.scene.items.getItems(
    (i) => i.type === "IMAGE" && (i.layer === "CHARACTER" || i.layer === "MOUNT"),
  );
  if (!items.length) return void (box.innerHTML = `<p class="hint">На сцене нет токенов персонажей.</p>`);
  items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  box.innerHTML = items
    .map((i) => {
      const c = i.metadata[META_CHARACTER] as { name?: string; level?: number; cls?: string } | undefined;
      const title = esc(c?.name || i.name || "Без имени");
      const sub = c ? esc([c.cls, c.level ? `${c.level} ур.` : ""].filter(Boolean).join(" · ")) : "лист не заполнен";
      return `<button class="token" data-id="${i.id}"><b>${title}</b><small>${sub}</small></button>`;
    })
    .join("");
}

OBR.onReady(() => {
  renderTokens();
  OBR.scene.onReadyChange(() => renderTokens());
  OBR.scene.items.onChange(() => renderTokens());
  document.querySelector("#tokens")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-id]");
    if (b) openSheet(OBR, b.dataset.id!);
  });

  const log = document.querySelector<HTMLUListElement>("#log")!;
  const input = document.querySelector<HTMLInputElement>("#formula")!;

  document.querySelectorAll<HTMLButtonElement>("[data-die]").forEach((btn) =>
    btn.addEventListener("click", () => rollFormula(`1d${btn.dataset.die}`, `d${btn.dataset.die}`)),
  );
  document.querySelector("#f")!.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim()) rollFormula(input.value, input.value);
  });

  OBR.broadcast.onMessage(CHANNEL_ROLL, ({ data }) => {
    const m = data as RollMessage;
    const li = document.createElement("li");
    if (m.crit) li.className = m.crit;
    li.innerHTML = `<div><b style="color:${esc(m.color)}">${esc(m.who ?? m.player)}</b> · ${esc(m.label)}</div>
      <div class="roll"><span>${esc(m.detail)}</span><b>${m.total}</b></div>`;
    log.prepend(li);
  });
});
