// Popover: общий лог бросков и быстрые кубики (кнопка расширения сверху слева)
import OBR from "@owlbear-rodeo/sdk";
import { CHANNEL_ROLL } from "./constants";
import { rollFormula } from "./dice";
import type { RollMessage } from "./types";

const DICE = [4, 6, 8, 10, 12, 20, 100];

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>Броски</h1>
  <div class="row wrap">${DICE.map((d) => `<button data-die="${d}">d${d}</button>`).join("")}</div>
  <form id="f" class="row"><input id="formula" placeholder="2d6+3"><button>Бросить</button></form>
  <p class="hint">Лист персонажа: правый клик по токену → «Лист персонажа».</p>
  <h2>Лог</h2>
  <ul id="log"></ul>
`;

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

OBR.onReady(() => {
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
