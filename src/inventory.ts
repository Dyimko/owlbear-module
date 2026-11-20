// Вкладка «Инвентарь» (заготовка): переносимый вес, предметы на себе, контейнеры с сеткой ячеек
import { CONTAINER_PRESETS, itemsVolume, itemsWeight, totalCarried, type Character, type InvItem } from "./types";

const kg = (n: number) => `${Math.round(n * 100) / 100} кг`;
const hue = (i: number) => (i * 67 + 200) % 360;

function itemRows(items: InvItem[], base: string, c: number, containers: { name: string }[]) {
  if (!items.length) return `<p class="hint">Пусто.</p>`;
  const moveOpts = (cur: number) =>
    `<option value="">→</option>` +
    (cur !== -1 ? `<option value="-1">На себе</option>` : "") +
    containers.map((ct, k) => (k === cur ? "" : `<option value="${k}">${ct.name || "Контейнер " + (k + 1)}</option>`)).join("");
  return `<div class="inv-row head"><span></span><span>Предмет</span><span>Вес, кг</span><span>Объём</span><span>Кол.</span><span>Заметки</span><span></span></div>` +
    items.map((_, i) => `
    <div class="inv-row">
      <span class="swatch" style="background:hsl(${hue(i)} 55% 55%)"></span>
      <input data-path="${base}.${i}.name" data-type="text">
      <input data-path="${base}.${i}.weight" data-type="num" type="number" step="any" min="0">
      <input data-path="${base}.${i}.volume" data-type="num" type="number" step="1" min="0">
      <input data-path="${base}.${i}.qty" data-type="num" type="number" step="1" min="0">
      <input data-path="${base}.${i}.notes" data-type="text">
      <span class="atk-btns">
        <select class="move" data-move-c="${c}" data-move-i="${i}" title="Переместить в другой контейнер">${moveOpts(c)}</select>
        <button data-action="inv-delitem" data-c="${c}" data-i="${i}" class="danger">×</button>
      </span>
    </div>`).join("");
}

export function renderInventory(c: Character) {
  const inv = c.inventory;
  return `
    <div class="grid g4">
      <div class="field span2"><span>Переносимый вес (всё на персонаже)</span><div class="bar-track" data-inv="carry"><div></div><b></b></div></div>
      <label class="field"><span>Могу нести, кг</span><input data-path="inventory.carryMax" data-type="num" type="number" step="any" min="0"></label>
    </div>

    <h3>На себе <small>(в руках, на поясе, надето — без контейнера)</small></h3>
    ${itemRows(inv.loose, "inventory.loose", -1, inv.containers)}
    <button data-action="inv-additem" data-c="-1">+ Предмет</button>

    <h3>Контейнеры</h3>
    ${inv.containers.map((ct, k) => `
      <div class="container-card">
        <div class="grid g6">
          <label class="field span2"><span>Название</span><input data-path="inventory.containers.${k}.name" data-type="text"></label>
          <label class="field"><span>Прочность, кг</span><input data-path="inventory.containers.${k}.strength" data-type="num" type="number" step="any" min="0"></label>
          <label class="field"><span>Столбцы</span><input data-path="inventory.containers.${k}.cols" data-type="num" type="number" min="1" max="12"></label>
          <label class="field"><span>Строки</span><input data-path="inventory.containers.${k}.rows" data-type="num" type="number" min="1" max="20"></label>
          <label class="field"><span>Свой вес, кг</span><input data-path="inventory.containers.${k}.weight" data-type="num" type="number" step="any" min="0"></label>
        </div>
        <div class="container-body">
          <div class="cells" data-inv="grid-${k}"></div>
          <div class="container-side">
            <div class="field"><span>Вес содержимого</span><div class="bar-track" data-inv="w-${k}"><div></div><b></b></div></div>
            <div class="field"><span>Занято ячеек</span><div class="bar-track" data-inv="v-${k}"><div></div><b></b></div></div>
            <p class="hint warn" data-inv="warn-${k}"></p>
            <button data-action="inv-delc" data-c="${k}" class="danger">Удалить контейнер</button>
          </div>
        </div>
        ${itemRows(ct.items, `inventory.containers.${k}.items`, k, inv.containers)}
        <button data-action="inv-additem" data-c="${k}">+ Предмет в «${ct.name || "контейнер"}»</button>
      </div>`).join("") || `<p class="hint">Контейнеров пока нет.</p>`}
    <div class="bar">
      <span>Добавить контейнер:</span>
      ${Object.entries(CONTAINER_PRESETS).map(([key, p]) => `<button data-action="inv-addc" data-preset="${key}" title="${p.name}: ${p.strength} кг, ${p.cols}×${p.rows} = ${p.cols * p.rows} ячеек">${key === "custom" ? "Свой" : p.name}</button>`).join("")}
    </div>`;
}

/** Структура (сколько предметов и контейнеров) — чтобы понять, когда перерисовать вкладку */
export const inventorySignature = (c: Character) =>
  `${c.inventory.loose.length}|${c.inventory.containers.map((ct) => ct.items.length).join(",")}`;

function setBar(el: HTMLElement | null, value: number, max: number, text: string) {
  if (!el) return;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  const fill = el.querySelector<HTMLDivElement>("div")!;
  fill.style.width = `${pct}%`;
  el.classList.toggle("over", value > max);
  el.querySelector("b")!.textContent = text;
}

/** Обновляет полоски и сетки без перерисовки полей ввода */
export function inventoryDerived(root: HTMLElement, c: Character) {
  const inv = c.inventory;
  const q = (k: string) => root.querySelector<HTMLElement>(`[data-inv="${k}"]`);
  const carried = totalCarried(inv);
  setBar(q("carry"), carried, inv.carryMax, `${kg(carried)} / ${kg(inv.carryMax)}`);
  inv.containers.forEach((ct, k) => {
    const w = itemsWeight(ct.items);
    const v = itemsVolume(ct.items);
    const cells = Math.max(0, (ct.cols || 0) * (ct.rows || 0));
    setBar(q(`w-${k}`), w, ct.strength, `${kg(w)} / ${kg(ct.strength)}`);
    setBar(q(`v-${k}`), v, cells, `${v} / ${cells}`);
    const warns: string[] = [];
    if (w > ct.strength) warns.push(`Перегруз на ${kg(w - ct.strength)}`);
    if (v > cells) warns.push(`Не влезает ${v - cells} яч.`);
    const warnEl = q(`warn-${k}`);
    if (warnEl) warnEl.textContent = warns.join(" · ");
    // Сетка: ячейки заполняются по порядку предметов, цвет = предмет
    const grid = q(`grid-${k}`);
    if (!grid) return;
    grid.style.gridTemplateColumns = `repeat(${Math.max(1, ct.cols || 1)}, 22px)`;
    const filled: string[] = [];
    ct.items.forEach((it, i) => {
      const n = Math.max(0, (it.volume || 0) * (it.qty || 0));
      for (let j = 0; j < n; j++) filled.push(`<span class="cell" style="background:hsl(${hue(i)} 55% 55%)" data-tip="${(it.name || "Предмет").replace(/"/g, "&quot;")}: ${it.weight} кг × ${it.qty}, ${it.volume} яч. каждый"></span>`);
    });
    const html = filled.slice(0, cells);
    for (let j = filled.length; j < cells; j++) html.push(`<span class="cell empty"></span>`);
    grid.innerHTML = html.join("");
  });
}
