// Вкладка «Инвентарь» (заготовка): переносимый вес, предметы на себе, контейнеры с сеткой ячеек
import { CATALOG, CATEGORIES, ENCHANTABLE, MASTERY, type CatKey } from "./catalog";
import { CONTAINER_PRESETS, SIZES, carryCapacity, itemsVolume, itemsWeight, totalCarried, type Character, type InvItem } from "./types";

// Состояние поиска по каталогу (живёт между перерисовками вкладки)
export const catalogState = { query: "", cat: "" as CatKey | "", target: -1, bonus: 0 };

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
      <label class="field"><span>Размер</span><select data-path="inventory.size" data-type="text">
        ${Object.entries(SIZES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("")}</select></label>
      <label class="field"><span>Доп. кг</span><input data-path="inventory.carryBonus" data-type="num" type="number" step="any"></label>
    </div>
    <p class="hint" data-inv="carryText"></p>

    <details class="catalog" ${catalogState.query || catalogState.cat ? "open" : ""}>
      <summary>Каталог предметов D&D 2024 (${CATALOG.length})</summary>
      <div class="grid g5">
        <label class="field span2"><span>Поиск</span><input data-cat="query" placeholder="меч, верёвка, зелье…" value="${catalogState.query.replace(/"/g, "&quot;")}"></label>
        <label class="field"><span>Категория</span><select data-cat="cat"><option value="">Все</option>
          ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${catalogState.cat === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="field"><span>Куда положить</span><select data-cat="target"><option value="-1">На себе</option>
          ${inv.containers.map((ct, k) => `<option value="${k}" ${catalogState.target === k ? "selected" : ""}>${ct.name || "Контейнер " + (k + 1)}</option>`).join("")}</select></label>
        <label class="field" data-tip="Магический бонус для оружия, боеприпасов, доспехов и щитов. Добавляет «+N» к названию и эффект с редкостью в заметки. Остальные предметы не меняются."><span>Магия</span><select data-cat="bonus">
          ${[0, 1, 2, 3].map((b) => `<option value="${b}" ${catalogState.bonus === b ? "selected" : ""}>${b ? "+" + b : "—"}</option>`).join("")}</select></label>
      </div>
      <div class="cat-results" data-inv="catResults"></div>
    </details>

    <h3>На себе <small>(в руках, на поясе, надето — без контейнера)</small></h3>
    ${itemRows(inv.loose, "inventory.loose", -1, inv.containers)}
    <button data-action="inv-additem" data-c="-1">+ Предмет</button>

    <h3>Контейнеры</h3>
    ${inv.containers.map((ct, k) => `
      <div class="container-card">
        <div class="grid g6">
          <label class="field span2"><span>Название</span><input data-path="inventory.containers.${k}.name" data-type="text"></label>
          <label class="field"><span>Прочность, кг</span><input data-path="inventory.containers.${k}.strength" data-type="num" type="number" step="any" min="0"></label>
          <label class="field"><span>Столбцы</span><input data-path="inventory.containers.${k}.cols" data-type="num" type="number" min="1" max="100"></label>
          <label class="field"><span>Строки</span><input data-path="inventory.containers.${k}.rows" data-type="num" type="number" min="1" max="100"></label>
          <label class="field"><span>Свой вес, кг</span><input data-path="inventory.containers.${k}.weight" data-type="num" type="number" step="any" min="0"></label>
        </div>
        <label class="pill magic-flag" data-tip="Магическое хранилище: содержимое не добавляет вес персонажу, учитывается только вес самого контейнера"><input type="checkbox" data-path="inventory.containers.${k}.magic" data-type="bool"> Магическое (содержимое ничего не весит)</label>
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
      ${Object.entries(CONTAINER_PRESETS).filter(([, p]) => !p.magic).map(([key, p]) => `<button data-action="inv-addc" data-preset="${key}" data-tip="${p.name}: выдерживает ${p.strength} кг, ${p.cols}×${p.rows} = ${p.cols * p.rows} ячеек, весит ${p.weight} кг. ${p.hint}">${key === "custom" ? "Свой" : p.name}</button>`).join("")}
    </div>
    <div class="bar">
      <span>Магические:</span>
      ${Object.entries(CONTAINER_PRESETS).filter(([, p]) => p.magic).map(([key, p]) => `<button class="magic" data-action="inv-addc" data-preset="${key}" data-tip="${p.hint}">${p.name.split(" — ")[0]}</button>`).join("")}
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
  const cap = carryCapacity(c);
  setBar(q("carry"), carried, cap, `${kg(carried)} / ${kg(cap)}`);
  const ct = q("carryText");
  if (ct) ct.textContent = `Грузоподъёмность = Сила ${c.abilities.str} × 7,5 кг${SIZES[inv.size]?.mult !== 1 ? ` × ${SIZES[inv.size]?.mult} (размер)` : ""}${inv.carryBonus ? ` ${inv.carryBonus > 0 ? "+" : "−"} ${Math.abs(inv.carryBonus)}` : ""} = ${kg(cap)}. Толкать, тащить, поднимать — до ${kg(cap * 2)}.`;
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
    if (cells > 400) {
      grid.style.gridTemplateColumns = "";
      grid.classList.add("big");
      grid.textContent = `${cells} яч. — сетка слишком большая, смотрите полосу`;
      return;
    }
    grid.classList.remove("big");
    const size = (ct.cols || 1) > 10 ? 12 : (ct.cols || 1) > 6 ? 16 : 22;
    grid.style.gridTemplateColumns = `repeat(${Math.max(1, ct.cols || 1)}, ${size}px)`;
    grid.style.setProperty("--cell", `${size}px`);
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

/** Результаты поиска по каталогу */
export function renderCatalogResults(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>('[data-inv="catResults"]');
  if (!box) return;
  const q = catalogState.query.trim().toLowerCase();
  const found = CATALOG.map((it, idx) => ({ it, idx }))
    .filter(({ it }) => (!catalogState.cat || it.cat === catalogState.cat) && (!q || it.name.toLowerCase().includes(q) || it.notes.toLowerCase().includes(q)));
  const shown = found.slice(0, 60);
  box.innerHTML = shown.length
    ? shown.map(({ it, idx }) => `
      <div class="cat-row" data-tip="${[it.notes || it.name, MASTERY[it.notes.match(/Мастерство: (\w+)/)?.[1] ?? ""] ?? ""].filter(Boolean).join(". ").replace(/"/g, "&quot;")}">
        <span class="cat-name">${it.name}<small>${CATEGORIES[it.cat]}${it.notes ? " · " + it.notes : ""}</small></span>
        <span class="cat-num">${kg(it.kg)}</span><span class="cat-num">${it.preset ? "контейнер" : it.vol + " яч."}</span>
        <button data-action="inv-addcat" data-idx="${idx}">+</button>
      </div>`).join("") + (found.length > shown.length ? `<p class="hint">…и ещё ${found.length - shown.length}. Уточните поиск.</p>` : "")
    : `<p class="hint">Ничего не найдено.</p>`;
}
