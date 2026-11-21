// Встроенная панель «Статы» в контекстном меню токена (правый клик): быстро править хиты, КУ, КД
// и скрывать статы от игроков. Видна ГМ и владельцу токена.
import OBR from "@owlbear-rodeo/sdk";
import { META_CHARACTER } from "./constants";
import { META_HIDDEN } from "./overlay";
import { initiative, normalize, type Character } from "./types";

const app = document.querySelector<HTMLDivElement>("#app")!;
let itemId = "";
let state: Character;
let hidden = false;
let saveTimer: number | undefined;
let lastJson = "";

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const FIELDS: [string, (c: Character) => number, (c: Character, v: number) => void][] = [
  ["hp.cur", (c) => c.hp.cur, (c, v) => (c.hp.cur = v)],
  ["hp.max", (c) => c.hp.max, (c, v) => (c.hp.max = v)],
  ["hp.temp", (c) => c.hp.temp, (c, v) => (c.hp.temp = v)],
  ["armor.ec", (c) => c.armor.ec, (c, v) => (c.armor.ec = v)],
  ["armor.ac", (c) => c.armor.ac, (c, v) => (c.armor.ac = v)],
];

function render() {
  app.innerHTML = `
    <input class="name" data-f="name" placeholder="Имя" title="Имя персонажа">
    <div class="card">
      <div class="hp" title="Хиты: текущие / максимум">
        <span class="lbl">Хиты</span>
        <input type="number" data-f="hp.cur"><span class="slash">/</span><input type="number" data-f="hp.max">
      </div>
      <div class="stats">
        <div class="stat temp" title="Временные хиты: теряются первыми"><div class="badge circle"><input type="number" data-f="hp.temp"></div><span class="lbl">Врем.</span></div>
        <div class="stat ec" title="Класс уклонения: атака ниже — промах"><div class="badge circle"><input type="number" data-f="armor.ec"></div><span class="lbl">КУ</span></div>
        <div class="stat ac" title="Класс доспеха: атака выше — полный урон, от КУ до КД — урон минус СУ"><div class="badge shield"><input type="number" data-f="armor.ac"></div><span class="lbl">КД</span></div>
        <div class="stat init" title="Инициатива: ЛОВ + доп. бонус (меняется в листе)"><div class="badge circle"><b data-init></b></div><span class="lbl">Иниц.</span></div>
      </div>
    </div>
    <button class="toggle" data-toggle></button>`;
  fill();
}

function fill() {
  app.querySelectorAll<HTMLInputElement>("[data-f]").forEach((el) => {
    if (el === document.activeElement) return;
    const f = el.dataset.f!;
    el.value = f === "name" ? state.name : String(FIELDS.find(([k]) => k === f)![1](state));
  });
  app.querySelector("[data-init]")!.textContent = fmt(initiative(state));
  const t = app.querySelector<HTMLButtonElement>("[data-toggle]")!;
  t.textContent = hidden ? "🙈 Скрыто от игроков" : "👁 Видно всем";
  t.classList.toggle("hidden-on", hidden);
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    saveTimer = undefined;
    const snap = structuredClone(state);
    lastJson = JSON.stringify(snap);
    await OBR.scene.items.updateItems([itemId], (items) => {
      items[0].metadata[META_CHARACTER] = snap;
    });
  }, 250);
}

async function load() {
  const sel = await OBR.player.getSelection();
  itemId = sel?.[0] ?? "";
  const [item] = itemId ? await OBR.scene.items.getItems([itemId]) : [];
  if (!item) return void (app.innerHTML = `<p class="hint">Выберите один токен</p>`);
  state = normalize(item.metadata[META_CHARACTER], item.name);
  hidden = item.metadata[META_HIDDEN] === true;
  lastJson = JSON.stringify(item.metadata[META_CHARACTER] ?? null);
  render();
}

OBR.onReady(async () => {
  await load();
  app.addEventListener("input", (e) => {
    const el = e.target as HTMLInputElement;
    const f = el.dataset.f;
    if (!f || !state) return;
    if (f === "name") state.name = el.value;
    else FIELDS.find(([k]) => k === f)![2](state, el.value === "" ? 0 : Number(el.value));
    save();
  });
  app.addEventListener("click", async (e) => {
    if (!(e.target as HTMLElement).closest("[data-toggle]")) return;
    hidden = !hidden;
    fill();
    await OBR.scene.items.updateItems([itemId], (items) => {
      items[0].metadata[META_HIDDEN] = hidden;
    });
  });
  OBR.scene.items.onChange((items) => {
    const it = items.find((i) => i.id === itemId);
    if (!it || !state) return;
    hidden = it.metadata[META_HIDDEN] === true;
    const json = JSON.stringify(it.metadata[META_CHARACTER] ?? null);
    if (json !== lastJson && saveTimer === undefined) {
      lastJson = json;
      state = normalize(it.metadata[META_CHARACTER], it.name);
    }
    fill();
  });
  OBR.player.onChange((p) => {
    if ((p.selection?.[0] ?? "") !== itemId) load();
  });
});
