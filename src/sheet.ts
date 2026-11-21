// Лист персонажа D&D 5e. Данные лежат в метаданных токена и синхронизируются у всех игроков.
import OBR from "@owlbear-rodeo/sdk";
import { CHANNEL_ROLL, META_CHARACTER } from "./constants";
import { rollD20, rollFormula, type RollMode } from "./dice";
import { catalogState, inventoryDerived, inventorySignature, renderCatalogResults, renderInventory } from "./inventory";
import { CATALOG, ENCHANTABLE, enchant } from "./catalog";
import { ABILITY_TIPS, ACTION_TIPS, CONDITION_TIPS, PATH_TIPS, SKILL_TIPS } from "./tips";
import {
  ABILITIES, ABILITY_KEYS, ARMORS, ARMOR_PROPS, ARMOR_TYPES, AR_METHODS, CONDITIONS, DEFENSE_LEVELS, GUARD, SHIELD_PROPS, SHIELDS, SKILLS, SKILL_KEYS,
  fmt, initiative, mod, normalize, passive, profBonus, saveBonus, skillBonus, spellStats,
  CONTAINER_PRESETS, ZONES, defaultHands, itemList, newItem,
  type BodyZone, type InvItem,
  type Ability, type Character, type ProfLevel, type Skill,
} from "./types";

const itemId = new URLSearchParams(location.search).get("item")!;
const app = document.querySelector<HTMLDivElement>("#app")!;

let state: Character;
let saveTimer: number | undefined;
let lastJson = "";

// ---------- работа с путями "hp.cur", "attacks.0.name" ----------
const getPath = (obj: any, path: string) => path.split(".").reduce((o, k) => o?.[k], obj);
function setPath(obj: any, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop()!;
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

// ---------- сохранение ----------
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    saveTimer = undefined;
    const snapshot = structuredClone(state);
    lastJson = JSON.stringify(snapshot);
    await OBR.scene.items.updateItems([itemId], (items) => {
      items[0].metadata[META_CHARACTER] = snapshot;
    });
  }, 250);
}
/** Изменить состояние кодом (кнопки) и сохранить */
function mutate(fn: (c: Character) => void) {
  fn(state);
  fill();
  scheduleSave();
}

// ---------- шаблоны ----------
const field = (label: string, path: string, type: "text" | "num" = "text", cls = "") =>
  `<label class="field ${cls}"><span>${label}</span><input data-path="${path}" data-type="${type}" ${type === "num" ? 'type="number"' : ""}></label>`;
const area = (label: string, path: string, rows = 4) =>
  `<label class="field wide"><span>${label}</span><textarea data-path="${path}" data-type="text" rows="${rows}"></textarea></label>`;
const abilitySelect = (path: string, withNone = true) =>
  `<select data-path="${path}" data-type="text">${withNone ? '<option value="none">—</option>' : ""}${ABILITY_KEYS.map(
    (a) => `<option value="${a}">${ABILITIES[a].short}</option>`,
  ).join("")}</select>`;

/** Справочник Challenge Mode — только для чтения, ничего не считает */
function reference() {
  const dis = (b: boolean) => (b ? "помеха" : "—");
  const armorRows = Object.entries(ARMORS).filter(([k]) => k !== "none" && k !== "custom").map(([, a]) =>
    `<tr><td>${a.name}</td><td>${ARMOR_TYPES[a.type]}</td><td>${a.base}${a.type === "light" ? " + ЛОВ" : a.type === "medium" ? " + ЛОВ (макс. 2)" : ""}</td>
     <td>${a.strReq ? `СИЛ ${a.strReq}` : "—"}</td><td>${dis(a.stealthDis)}</td><td>${dis(a.acroDis)}</td></tr>`).join("");
  const shieldRows = Object.entries(SHIELDS).filter(([k]) => k !== "none").map(([, sh]) =>
    `<tr><td>${sh.name}</td><td>+${sh.ac}</td><td>${sh.props.map((p) => SHIELD_PROPS[p].split(":")[0]).join(", ") || "—"}</td>
     <td>${sh.strReq ? `СИЛ ${sh.strReq}` : "—"}</td><td>${dis(sh.stealthDis)}</td><td>${dis(sh.acroDis)}</td></tr>`).join("");
  const list = (o: Record<string, string>) => `<ul class="props">${Object.values(o).map((t) => `<li>${t}</li>`).join("")}</ul>`;
  return `<details class="ref"><summary>Справочник брони (Challenge Mode)</summary>
    <h4>Класс уклонения</h4>
    <ul class="props"><li>Без доспеха и лёгкий: 10 + ЛОВ</li><li>Средний: 10 + ЛОВ (макс. 2)</li><li>Тяжёлый: 10</li><li>Щит прибавляется и к КУ, и к КД</li></ul>
    <h4>Снижение урона (СУ)</h4>${list(AR_METHODS)}
    <h4>Доспехи</h4><table><tr><th>Доспех</th><th>Тип</th><th>КД</th><th>Сила</th><th>Скрытн.</th><th>Акроб.</th></tr>${armorRows}</table>
    <h4>Щиты</h4><table><tr><th>Щит</th><th>КД</th><th>Свойства</th><th>Сила</th><th>Скрытн.</th><th>Акроб.</th></tr>${shieldRows}</table>
    <h4>Свойства щитов</h4>${list(SHIELD_PROPS)}
    <h4>Свойства доспехов</h4>${list(ARMOR_PROPS)}
    <h4>Очки защиты</h4><p class="hint">В свой ход каждые 15 фт перемещения → 1 очко до начала следующего хода. Реакция не нужна.</p>${list(GUARD)}
    <h4>Защита (Defense)</h4><ul class="props">${["2", "1", "-1", "-2"].map((k) => `<li>${DEFENSE_LEVELS[k].name}</li>`).join("")}</ul>
  </details>`;
}

function template() {
  return `
  <header>
    <div class="grid g4">
      ${field("Имя", "name", "text", "span2")}
      ${field("Класс", "cls")}
      ${field("Уровень", "level", "num")}
      ${field("Раса", "race")}
      ${field("Предыстория", "background")}
      ${field("Мировоззрение", "alignment")}
      ${field("Опыт", "xp", "num")}
    </div>
    <div class="bar">
      <span class="pill">Бонус мастерства <b data-derived="prof"></b></span>
    </div>
    <nav class="tabs">
      ${[["main", "Характеристики"], ["combat", "Бой"], ["spells", "Заклинания"], ["traits", "Черты"], ["inv", "Инвентарь"]]
        .map(([id, t], i) => `<button data-action="tab" data-tab="${id}" class="${i ? "" : "on"}">${t}</button>`).join("")}
    </nav>
  </header>

  <section data-tab-page="main">
    <div class="abilities">
      ${ABILITY_KEYS.map((a) => `
        <div class="ab">
          <div class="ab-name">${ABILITIES[a].name}</div>
          <button class="ab-mod" data-action="check" data-ab="${a}" data-derived="mod-${a}" title="Проверка"></button>
          <input class="ab-score" data-path="abilities.${a}" data-type="num" type="number">
          <label class="ab-save"><input type="checkbox" data-path="saves.${a}" data-type="bool">
            <button data-action="save" data-ab="${a}" title="Спасбросок">Спас <b data-derived="save-${a}"></b></button></label>
        </div>`).join("")}
    </div>
    <h3>Навыки <small>(клик по кружку: нет → владение → компетентность)</small></h3>
    <div class="skills">
      ${SKILL_KEYS.map((s) => `
        <div class="skill">
          <button class="prof" data-action="prof" data-skill="${s}" data-derived="pl-${s}"></button>
          <button class="link" data-action="skill" data-skill="${s}">${SKILLS[s].name} <small>${ABILITIES[SKILLS[s].ab].short}</small></button>
          <b data-derived="sk-${s}"></b>
        </div>`).join("")}
    </div>
    <div class="bar">
      <label class="pill"><input type="checkbox" data-path="jack" data-type="bool"> Мастер на все руки</label>
      <span class="pill">Пасс. Внимательность <b data-derived="pp"></b></span>
      <span class="pill">Пасс. Проницательность <b data-derived="pi"></b></span>
      <span class="pill">Пасс. Анализ <b data-derived="pa"></b></span>
    </div>
  </section>

  <section data-tab-page="combat" hidden>
    <div class="grid g4 stats">
      ${field("Класс уклонения (КУ)", "armor.ec", "num")}
      ${field("Класс доспеха (КД)", "armor.ac", "num")}
      ${field("Снижение урона (СУ)", "armor.ar", "num")}
      <div class="field"><span>Инициатива</span><button data-action="init" data-derived="init"></button></div>
    </div>
    <p class="hint">Атака ниже КУ — уклонение · от КУ до КД — по броне, урон − СУ · выше КД — полный урон</p>
    <div class="grid g4">
      ${field("Доспех", "armor.name", "text", "span2")}
      ${field("Щит", "armor.shield")}
      ${field("Скорость, фт", "speed", "num")}
    </div>
    <div class="grid g4">
      ${field("Инициатива (доп.)", "initMisc", "num")}
      <div class="field span2"><span>Очки защиты</span>
        <div class="bar tight"><button data-action="guard" data-d="-1">−</button><b class="big" data-derived="guard"></b><button data-action="guard" data-d="1">+</button></div></div>
    </div>
    ${area("Свойства брони и щита, Защита (Defense), прочее", "armor.notes", 3)}
    ${reference()}

    <h3>Хиты</h3>
    <div class="grid g3">
      ${field("Текущие", "hp.cur", "num")}
      ${field("Максимум", "hp.max", "num")}
      ${field("Временные", "hp.temp", "num")}
    </div>

    <div class="grid g2">
      <div>
        <h3>Кости хитов</h3>
        <div class="bar">
          <select data-path="hitDie" data-type="num">${[6, 8, 10, 12].map((d) => `<option value="${d}">d${d}</option>`).join("")}</select>
          <label class="field inline"><span>Потрачено</span><input data-path="hitDiceUsed" data-type="num" type="number" class="tiny"></label>
          <span>из <b data-derived="lvl"></b></span>
          <button data-action="hitdie">Бросить</button>
        </div>
      </div>
      <div>
        <h3>Спасброски от смерти</h3>
        <div class="bar">
          <span>Успехи</span>${[1, 2, 3].map((i) => `<button class="pip" data-action="death" data-kind="s" data-n="${i}" data-derived="ds-${i}"></button>`).join("")}
          <span>Провалы</span>${[1, 2, 3].map((i) => `<button class="pip bad" data-action="death" data-kind="f" data-n="${i}" data-derived="df-${i}"></button>`).join("")}
          <button data-action="deathroll">Бросок</button>
        </div>
      </div>
    </div>
    <div class="bar">
      <label class="field inline"><span>Истощение</span>
        <select data-path="exhaustion" data-type="num">${[0, 1, 2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join("")}</select></label>
    </div>
  </section>

  <section data-tab-page="spells" hidden>
    <div id="spellNotes"></div>
    <button data-action="note-add">+ Поле</button>
  </section>

  <section data-tab-page="traits" hidden>
    ${area("Умения и особенности", "text.features", 8)}
    ${area("Прочие владения и языки", "text.profs", 4)}
    <div class="grid g2">
      ${area("Черты характера", "text.personality", 3)}
      ${area("Идеалы", "text.ideals", 3)}
      ${area("Привязанности", "text.bonds", 3)}
      ${area("Слабости", "text.flaws", 3)}
    </div>
    ${area("Заметки", "text.notes", 5)}
  </section>

  <section data-tab-page="inv" hidden><div id="inv"></div></section>`;
}

function renderNotes() {
  const box = app.querySelector<HTMLDivElement>("#spellNotes")!;
  box.innerHTML = state.spellNotes.map((_, i) => `
    <div class="note-card">
      <div class="note-head">
        <input class="note-title" data-path="spellNotes.${i}.title" data-type="text" placeholder="Название поля">
        <button data-action="note-del" data-i="${i}" class="danger" data-tip="Удалить поле">×</button>
      </div>
      <textarea data-path="spellNotes.${i}.text" data-type="text" rows="8"></textarea>
    </div>`).join("") || `<p class="hint">Полей нет — добавьте кнопкой ниже.</p>`;
}

// ---------- подсказки при наведении ----------
function tipFor(el: HTMLElement): string | undefined {
  const path = el.dataset.path;
  if (path) {
    if (path.startsWith("abilities.")) return "Значение характеристики (обычно 8–20, максимум 20 без магии). " + ABILITY_TIPS[path.split(".")[1] as Ability];
    if (path.startsWith("saves.")) return ACTION_TIPS.saveProf;
    if (path.startsWith("conditions.")) return CONDITION_TIPS[path.slice(11)];
    if (path.startsWith("spell.slots.")) return ACTION_TIPS.slots;
    if (/^attacks\.\d+\.bonus$/.test(path)) return ACTION_TIPS.atkBonus;
    if (/^attacks\.\d+\.damage$/.test(path)) return ACTION_TIPS.atkDamage;
    if (path.startsWith("inventory.")) {
      const f = path.split(".").pop()!;
      const isItem = path.includes(".items.") || path.includes(".zones.");
      const T: Record<string, string> = {
        name: isItem ? "Название предмета." : "Название контейнера: рюкзак, ножны, сумка…",
        weight: isItem ? "Вес одного предмета в кг." : "Собственный вес пустого контейнера, кг. Входит в переносимый вес.",
        volume: "Объём одного предмета — сколько ячеек он занимает в контейнере.",
        qty: "Количество. Вес и объём умножаются на него.",
        notes: "Заметки: свойства, заряды, состояние.",
        strength: "Прочность — сколько кг содержимого выдерживает контейнер.",
        cols: "Ширина сетки в ячейках. Вместимость = столбцы × строки.",
        rows: "Высота сетки в ячейках. Вместимость = столбцы × строки.",
        hands: "Сколько рук занимает предмет: двуручное — 2, универсальное — как держите.",
      };
      return T[f] ?? PATH_TIPS[path];
    }
    if (/^attacks\.\d+\.name$/.test(path)) return "Название оружия или атаки.";
    if (/^attacks\.\d+\.type$/.test(path)) return "Тип урона (колющий, рубящий, дробящий…) и свойства оружия.";
    return PATH_TIPS[path];
  }
  const a = el.dataset.action;
  if (a === "check") return ABILITY_TIPS[el.dataset.ab as Ability];
  if (a === "skill") {
    const sk = el.dataset.skill as Skill;
    return `${SKILLS[sk].name} (${ABILITIES[SKILLS[sk].ab].name}): ${SKILL_TIPS[sk]} Клик — проверка: d20 + модификатор + владение.`;
  }
  if (a === "prof") return ACTION_TIPS.skillProf;
  if (a === "mode") return ACTION_TIPS[`mode-${el.dataset.mode}`];
  if (a === "spellatk") return ACTION_TIPS.satk;
  if (a && ACTION_TIPS[a]) return ACTION_TIPS[a];
  const der = el.dataset.derived;
  if (der === "prof") return ACTION_TIPS.prof;
  if (der === "sdc") return ACTION_TIPS.sdc;
  if (der === "guard") return ACTION_TIPS.guard;
  if (der && ["pp", "pi", "pa"].includes(der)) return ACTION_TIPS.passive;
  if (der?.startsWith("sk-")) return ACTION_TIPS.passive.replace("Пассивное значение = 10 +", "Итоговый бонус навыка = модификатор характеристики + владение. Пассивное = 10 +");
  return undefined;
}

/** Ставит data-tip на элементы и на их подписи (весь блок .field / label реагирует на наведение) */
function applyTips(root: ParentNode = app) {
  root.querySelectorAll<HTMLElement>("[data-path], [data-action], [data-derived]").forEach((el) => {
    const tip = tipFor(el);
    if (!tip) return;
    el.dataset.tip = tip;
    const holder = el.closest<HTMLElement>("label.field, .field, .pill, .conds label");
    if (holder && !holder.dataset.tip && !holder.querySelector("[data-action]:not([data-action=prof])")) holder.dataset.tip = tip;
  });
}

const tipBox = document.createElement("div");
tipBox.className = "tooltip";
tipBox.hidden = true;
document.body.appendChild(tipBox);
let tipTarget: HTMLElement | null = null;
document.addEventListener("mouseover", (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
  if (t === tipTarget) return;
  tipTarget = t;
  if (!t) return void (tipBox.hidden = true);
  tipBox.textContent = t.dataset.tip!;
  tipBox.hidden = false;
});
document.addEventListener("mousemove", (e) => {
  if (tipBox.hidden) return;
  const pad = 12;
  const w = tipBox.offsetWidth, h = tipBox.offsetHeight;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + w > innerWidth - 4) x = Math.max(4, e.clientX - w - pad);
  if (y + h > innerHeight - 4) y = Math.max(4, e.clientY - h - pad);
  tipBox.style.left = `${x}px`;
  tipBox.style.top = `${y}px`;
});
document.addEventListener("mouseleave", () => { tipBox.hidden = true; tipTarget = null; });

let invSig = "";
function renderInv() {
  const box = app.querySelector<HTMLDivElement>("#inv")!;
  box.innerHTML = renderInventory(state);
  invSig = inventorySignature(state);
  renderCatalogResults(box);
  applyTips(box);
}

// ---------- синхронизация полей с состоянием ----------
function fill() {
  if (app.querySelectorAll("#spellNotes .note-card").length !== state.spellNotes.length) renderNotes();
  if (inventorySignature(state) !== invSig) renderInv();
  app.querySelectorAll<HTMLInputElement>("[data-path]").forEach((el) => {
    if (el === document.activeElement) return;
    const v = getPath(state, el.dataset.path!);
    if (el.dataset.type === "bool") el.checked = !!v;
    else el.value = v ?? "";
  });
  derived();
}

function derived() {
  const c = state;
  inventoryDerived(app.querySelector("#inv")!, c);
  const set = (k: string, v: string, cls?: [string, boolean]) => {
    app.querySelectorAll<HTMLElement>(`[data-derived="${k}"]`).forEach((el) => {
      el.textContent = v;
      if (cls) el.classList.toggle(cls[0], cls[1]);
    });
  };
  set("prof", fmt(profBonus(c.level)));
  for (const a of ABILITY_KEYS) {
    set(`mod-${a}`, fmt(mod(c.abilities[a])));
    set(`save-${a}`, fmt(saveBonus(c, a)));
  }
  for (const s of SKILL_KEYS) {
    set(`sk-${s}`, fmt(skillBonus(c, s)));
    set(`pl-${s}`, ["○", "●", "◉"][c.skills[s]], ["on", c.skills[s] > 0]);
  }
  set("pp", String(passive(c, "perception")));
  set("pi", String(passive(c, "insight")));
  set("pa", String(passive(c, "investigation")));
  set("init", fmt(initiative(c)));
  set("guard", String(c.armor.guard));
  set("lvl", String(c.level));
  const sp = spellStats(c);
  set("sdc", sp ? String(sp.dc) : "—");
  set("satk", sp ? fmt(sp.attack) : "—");
}

// ---------- ввод ----------
function onInput(e: Event) {
  const el = e.target as HTMLInputElement;
  if (el.dataset.moveFrom !== undefined) {
    if (e.type === "change" && el.value !== "") moveItem(el);
    return;
  }
  if (el.dataset.cat) {
    // «change» у поля поиска срабатывает при уходе фокуса — перерисовка в этот момент съедала клик по «+»
    if (e.type === "change" && el.dataset.cat === "query") return;
    if (el.dataset.cat === "query") catalogState.query = el.value;
    if (el.dataset.cat === "cat") catalogState.cat = el.value as typeof catalogState.cat;
    if (el.dataset.cat === "target") catalogState.target = el.value;
    if (el.dataset.cat === "bonus") catalogState.bonus = Number(el.value);
    return renderCatalogResults(app.querySelector("#inv")!);
  }
  const path = el.dataset.path;
  if (!path) return;
  let v: unknown = el.value;
  if (el.dataset.type === "bool") v = el.checked;
  else if (el.dataset.type === "num") v = el.value === "" ? 0 : Number(el.value);
  setPath(state, path, v);
  derived();
  scheduleSave();
}

/** Добавить контейнер(ы) по заготовке; у составных (рюкзак Хеварда, колчан) — несколько отделений */
function addContainers(key: string) {
  const p = CONTAINER_PRESETS[key] ?? CONTAINER_PRESETS.custom;
  const { hint: _h, parts, ...main } = p;
  mutate((c) => {
    c.inventory.containers.push({ ...main, items: [] });
    for (const part of parts ?? []) c.inventory.containers.push({ ...part, items: [] });
  });
}

/** Переместить предмет между зонами тела и контейнерами */
function moveItem(el: HTMLInputElement) {
  const from = el.dataset.moveFrom!, i = Number(el.dataset.moveI), to = el.value;
  mutate((c) => {
    const [it] = itemList(c.inventory, from).splice(i, 1);
    if (!it) return;
    if (to === "z:hands" && it.hands === undefined) it.hands = defaultHands(it);
    itemList(c.inventory, to).push(it);
  });
  renderInv();
  fill();
}

/** Человекочитаемое название места */
const locName = (c: Character, loc: string) =>
  loc.startsWith("c:") ? c.inventory.containers[Number(loc.slice(2))]?.name ?? "контейнер" : ZONES[loc.slice(2) as BodyZone]?.name ?? "на себе";

const who = () => state.name || undefined;

async function onClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!btn) return;
  const d = btn.dataset;
  const c = state;
  switch (d.action) {
    case "tab":
      app.querySelectorAll("[data-action=tab]").forEach((b) => b.classList.toggle("on", b === btn));
      app.querySelectorAll<HTMLElement>("[data-tab-page]").forEach((p) => (p.hidden = p.dataset.tabPage !== d.tab));
      break;
    case "check":
      await rollD20(mod(c.abilities[d.ab as Ability]), `Проверка: ${ABILITIES[d.ab as Ability].name}`, "normal", who());
      break;
    case "save":
      e.preventDefault(); // не переключать чекбокс владения
      await rollD20(saveBonus(c, d.ab as Ability), `Спасбросок: ${ABILITIES[d.ab as Ability].name}`, "normal", who());
      break;
    case "skill":
      await rollD20(skillBonus(c, d.skill as Skill), SKILLS[d.skill as Skill].name, "normal", who());
      break;
    case "prof":
      mutate((c) => void (c.skills[d.skill as Skill] = (((c.skills[d.skill as Skill] + 1) % 3) as ProfLevel)));
      break;
    case "init":
      await rollD20(initiative(c), "Инициатива", "normal", who());
      break;
    case "guard":
      mutate((c) => void (c.armor.guard = Math.max(0, c.armor.guard + Number(d.d))));
      break;
    case "hitdie":
      await rollFormula(`1d${c.hitDie}${fmt(mod(c.abilities.con))}`, "Кость хитов", who());
      break;
    case "death": {
      const k = d.kind as "s" | "f";
      const n = Number(d.n);
      mutate((c) => void (c.death[k] = c.death[k] >= n ? n - 1 : n));
      break;
    }
    case "deathroll":
      await rollD20(0, "Спасбросок от смерти", "normal", who());
      break;
    case "note-add":
      mutate((c) => c.spellNotes.push({ title: "Новое поле", text: "" }));
      break;
    case "note-del": {
      const n = c.spellNotes[Number(d.i)];
      if (n.text.trim() && !confirm(`Удалить поле «${n.title}» с текстом?`)) return;
      mutate((c) => c.spellNotes.splice(Number(d.i), 1));
      renderNotes();
      fill();
      break;
    }
    case "inv-addc":
      addContainers(d.preset!);
      break;
    case "inv-delc": {
      const k = Number(d.c);
      const ct = c.inventory.containers[k];
      if (ct.items.length && !confirm(`Удалить «${ct.name}» вместе с ${ct.items.length} предметами?`)) return;
      mutate((c) => c.inventory.containers.splice(k, 1));
      renderInv();
      fill();
      break;
    }
    case "inv-additem":
      mutate((c) => itemList(c.inventory, d.loc!).push(newItem()));
      break;
    case "inv-addcat": {
      const it = CATALOG[Number(d.idx)];
      if (it.preset) {
        addContainers(it.preset);
        OBR.notification.show(`${it.name} добавлен(а) в контейнеры`, "SUCCESS");
        break;
      }
      const b = ENCHANTABLE.includes(it.cat) ? catalogState.bonus : 0;
      const item = b
        ? { name: `${it.name} +${b}`, weight: it.kg, volume: it.vol, qty: 1, notes: [enchant(it.cat, b), it.notes].filter(Boolean).join(" · ") }
        : { name: it.name, weight: it.kg, volume: it.vol, qty: 1, notes: it.notes };
      const full: InvItem = { ...item, ...(it.bonus ? { bonus: { ...it.bonus } } : {}) };
      // ремни и перевязи сами идут в «Надето», иначе — туда, куда выбрано
      const t = it.bonus ? "z:worn" : catalogState.target.startsWith("c:") && !c.inventory.containers[Number(catalogState.target.slice(2))] ? "z:worn" : catalogState.target;
      if (t === "z:hands") full.hands = defaultHands(full);
      mutate((c) => itemList(c.inventory, t).push(full));
      OBR.notification.show(`${full.name} → ${locName(c, t)}`, "SUCCESS");
      break;
    }
    case "inv-delitem":
      mutate((c) => itemList(c.inventory, d.loc!).splice(Number(d.i), 1));
      renderInv();
      fill();
      break;
  }
}

// ---------- запуск ----------
OBR.onReady(async () => {
  const [item] = await OBR.scene.items.getItems([itemId]);
  if (!item) return void (app.textContent = "Токен не найден");
  const raw = item.metadata[META_CHARACTER];
  state = normalize(raw, item.name);
  lastJson = JSON.stringify(raw ?? null);

  app.innerHTML = template();
  renderNotes();
  renderInv();
  applyTips();
  fill();
  app.addEventListener("input", onInput);
  app.addEventListener("change", onInput);
  app.addEventListener("click", onClick);

  // Чужие изменения (другой игрок или ГМ редактирует тот же лист)
  OBR.scene.items.onChange((items) => {
    const it = items.find((i) => i.id === itemId);
    if (!it) return void (app.textContent = "Токен удалён");
    const json = JSON.stringify(it.metadata[META_CHARACTER] ?? null);
    if (json === lastJson || saveTimer !== undefined) return;
    lastJson = json;
    state = normalize(it.metadata[META_CHARACTER], it.name);
    fill();
  });
});
