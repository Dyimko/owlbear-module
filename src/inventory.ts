// Вкладка «Инвентарь» (заготовка): переносимый вес, предметы на себе, контейнеры с сеткой ячеек
import { CATALOG, CATEGORIES, ENCHANTABLE, MASTERY, type CatKey } from "./catalog";
import {
  CONTAINER_PRESETS, SIZES, ZONES, carryCapacity, defaultHands, itemsVolume, itemsWeight, totalCarried, zoneUsage,
  type BodyZone, type Character, type InvItem, type Inventory,
} from "./types";

// Состояние поиска по каталогу (живёт между перерисовками вкладки)
export const catalogState = { query: "", cat: "" as CatKey | "", target: "z:worn", bonus: 0 };
const ZONE_KEYS = Object.keys(ZONES) as BodyZone[];

/** Все места, куда можно положить предмет: зоны тела + контейнеры */
const locations = (inv: Inventory) => [
  ...ZONE_KEYS.map((z) => ({ loc: `z:${z}`, name: ZONES[z].name })),
  ...inv.containers.map((ct, k) => ({ loc: `c:${k}`, name: ct.name || "Контейнер " + (k + 1) })),
];

const kg = (n: number) => `${Math.round(n * 100) / 100} кг`;
const hue = (i: number) => (i * 67 + 200) % 360;

function itemRows(items: InvItem[], base: string, loc: string, inv: Inventory) {
  if (!items.length) return `<p class="hint">Пусто.</p>`;
  const hands = loc === "z:hands";
  const moveOpts = `<option value="">→</option>` + locations(inv).filter((l) => l.loc !== loc).map((l) => `<option value="${l.loc}">${l.name}</option>`).join("");
  return `<div class="inv-row head ${hands ? "with-hands" : ""}"><span></span><span>Предмет</span><span>Вес, кг</span><span>Объём</span><span>Кол.</span>${hands ? "<span>Руки</span>" : ""}<span>Заметки</span><span></span></div>` +
    items.map((it, i) => `
    <div class="inv-row ${hands ? "with-hands" : ""}">
      <span class="swatch" style="background:hsl(${hue(i)} 55% 55%)"></span>
      <input data-path="${base}.${i}.name" data-type="text">
      <input data-path="${base}.${i}.weight" data-type="num" type="number" step="any" min="0">
      <input data-path="${base}.${i}.volume" data-type="num" type="number" step="1" min="0">
      <input data-path="${base}.${i}.qty" data-type="num" type="number" step="1" min="0">
      ${hands ? `<select data-path="${base}.${i}.hands" data-type="num" data-tip="Сколько рук занимает: двуручное — 2, универсальное — как держите">
        <option value="1" ${(it.hands ?? defaultHands(it)) === 1 ? "selected" : ""}>1</option><option value="2" ${(it.hands ?? defaultHands(it)) === 2 ? "selected" : ""}>2</option></select>` : ""}
      <input data-path="${base}.${i}.notes" data-type="text">
      <span class="atk-btns">
        <select class="move" data-move-from="${loc}" data-move-i="${i}" title="Переместить">${moveOpts}</select>
        <button data-action="inv-delitem" data-loc="${loc}" data-i="${i}" class="danger">×</button>
      </span>
    </div>`).join("");
}

function zoneSection(z: BodyZone, inv: Inventory) {
  const base = z === "belt" || z === "back"
    ? `<label class="field inline zone-base" data-tip="Базовое место в зоне без ремней. Надетые ремни и перевязи добавляют сверху."><span>База</span><input data-path="inventory.zoneBase.${z}" data-type="num" type="number" min="0" class="tiny"></label>`
    : "";
  return `
    <div class="zone">
      <div class="zone-head" data-tip="${ZONES[z].hint}">
        <b>${ZONES[z].name}</b>
        ${z !== "worn" ? `<div class="bar-track zone-bar" data-inv="zone-${z}"><div></div><b></b></div>` : `<span class="hint">без лимита</span>`}
        ${base}
      </div>
      <div class="zone-chips" data-inv="chips-${z}"></div>
      ${itemRows(inv.zones[z], `inventory.zones.${z}`, `z:${z}`, inv)}
      <button data-action="inv-additem" data-loc="z:${z}">+ Предмет</button>
    </div>`;
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
        <label class="field"><span>Куда положить</span><select data-cat="target">
          ${locations(inv).map((l) => `<option value="${l.loc}" ${catalogState.target === l.loc ? "selected" : ""}>${l.name}</option>`).join("")}</select></label>
        <label class="field" data-tip="Магический бонус для оружия, боеприпасов, доспехов и щитов. Добавляет «+N» к названию и эффект с редкостью в заметки. Остальные предметы не меняются."><span>Магия</span><select data-cat="bonus">
          ${[0, 1, 2, 3].map((b) => `<option value="${b}" ${catalogState.bonus === b ? "selected" : ""}>${b ? "+" + b : "—"}</option>`).join("")}</select></label>
      </div>
      <div class="cat-results" data-inv="catResults"></div>
    </details>

    <h3>На себе</h3>
    ${ZONE_KEYS.map((z) => zoneSection(z, inv)).join("")}

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
        <div class="bar">
          <label class="field inline" data-tip="Где носится контейнер. Занимает место в этой зоне тела: на поясе и спине — ячейки, в руках — руки."><span>Носится</span><select data-path="inventory.containers.${k}.zone" data-type="text">
            <option value="none">Не на себе (лежит)</option><option value="belt">На поясе</option><option value="back">На спине</option><option value="hands">В руках</option></select></label>
          <label class="field inline" data-tip="Сколько места занимает в зоне: ячеек на поясе/спине или рук (1–2), если в руках."><span>Место</span><input data-path="inventory.containers.${k}.bodySize" data-type="num" type="number" min="0" class="tiny"></label>
          <label class="pill magic-flag" data-tip="Магическое хранилище: содержимое не добавляет вес персонажу, учитывается только вес самого контейнера"><input type="checkbox" data-path="inventory.containers.${k}.magic" data-type="bool"> Магическое</label>
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
        ${itemRows(ct.items, `inventory.containers.${k}.items`, `c:${k}`, inv)}
        <button data-action="inv-additem" data-loc="c:${k}">+ Предмет в «${ct.name || "контейнер"}»</button>
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
  `${ZONE_KEYS.map((z) => c.inventory.zones[z].length).join(",")}|${c.inventory.containers.map((ct) => ct.items.length).join(",")}`;

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
  // Зоны тела
  const use = zoneUsage(inv);
  setBar(q("zone-hands"), use.hands.used, use.hands.cap, `${use.hands.used} / ${use.hands.cap} руки`);
  setBar(q("zone-belt"), use.belt.used, use.belt.cap, `${use.belt.used} / ${use.belt.cap} яч.`);
  setBar(q("zone-back"), use.back.used, use.back.cap, `${use.back.used} / ${use.back.cap} яч.`);
  for (const z of ["hands", "belt", "back"] as const) {
    const chips = q(`chips-${z}`);
    if (!chips) continue;
    const list = inv.containers.filter((ct) => (ct.zone ?? "none") === z);
    chips.innerHTML = list.map((ct) => `<span class="chip">${ct.name} · ${ct.bodySize || 0} ${z === "hands" ? "рук." : "яч."}</span>`).join("");
  }
  const wornBonus = q("chips-worn");
  if (wornBonus) {
    const b = inv.zones.worn.filter((i) => i.bonus?.cells);
    wornBonus.innerHTML = b.map((i) => `<span class="chip">${i.name}: +${(i.bonus!.cells || 0) * (i.qty || 1)} яч. ${i.bonus!.zone === "belt" ? "на поясе" : "на спине"}</span>`).join("");
  }

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
