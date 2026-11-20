// Лист персонажа D&D 5e. Данные лежат в метаданных токена и синхронизируются у всех игроков.
import OBR from "@owlbear-rodeo/sdk";
import { CHANNEL_ROLL, META_CHARACTER } from "./constants";
import { rollD20, rollFormula, type RollMode } from "./dice";
import { catalogState, inventoryDerived, inventorySignature, renderCatalogResults, renderInventory } from "./inventory";
import { CATALOG } from "./catalog";
import { ABILITY_TIPS, ACTION_TIPS, CONDITION_TIPS, PATH_TIPS, SKILL_TIPS } from "./tips";
import {
  ABILITIES, ABILITY_KEYS, ARMORS, ARMOR_PROPS, ARMOR_TYPES, AR_METHODS, CONDITIONS, DEFENSE_LEVELS, GUARD, SHIELD_PROPS, SHIELDS, SKILLS, SKILL_KEYS,
  fmt, initiative, mod, normalize, passive, profBonus, saveBonus, skillBonus, spellStats,
  CONTAINER_PRESETS, newItem,
  type Ability, type Character, type ProfLevel, type Skill,
} from "./types";

const itemId = new URLSearchParams(location.search).get("item")!;
const app = document.querySelector<HTMLDivElement>("#app")!;

let state: Character;
let rollMode: RollMode = "normal";
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
    <ul class="props"><li>Без доспеха и лёгкий: 10 + ЛОВ</li><li>Средний: 10 + ЛОВ (макс. 2)</li><li>Тяжёлый: 10</li><li>Щит прибавляется и к EC, и к AC</li></ul>
    <h4>Снижение урона (AR)</h4>${list(AR_METHODS)}
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
      <label class="pill"><input type="checkbox" data-path="inspiration" data-type="bool"> Вдохновение</label>
      <div class="seg" id="mode">
        <button data-action="mode" data-mode="dis">Помеха</button>
        <button data-action="mode" data-mode="normal" class="on">Обычный</button>
        <button data-action="mode" data-mode="adv">Преим.</button>
      </div>
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
      ${field("Класс уклонения (EC)", "armor.ec", "num")}
      ${field("Класс доспеха (AC)", "armor.ac", "num")}
      ${field("Снижение урона (AR)", "armor.ar", "num")}
      <div class="field"><span>Инициатива</span><button data-action="init" data-derived="init"></button></div>
    </div>
    <p class="hint">Атака ниже EC — уклонение · от EC до AC — по броне, урон − AR · выше AC — полный урон</p>
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

    <h3>Атаки <small>(бонус и урон вписываются вручную)</small></h3>
    <div id="attacks"></div>
    <button data-action="addatk">+ Атака</button>

    <h3>Состояния</h3>
    <div class="conds">
      ${CONDITIONS.map((c) => `<label><input type="checkbox" data-path="conditions.${c}" data-type="bool"> ${c}</label>`).join("")}
    </div>
  </section>

  <section data-tab-page="spells" hidden>
    <div class="grid g3">
      <label class="field"><span>Базовая характеристика</span>${abilitySelect("spell.ability")}</label>
      <div class="field"><span>Сл спасброска</span><b class="big" data-derived="sdc"></b></div>
      <div class="field"><span>Бонус атаки</span><button data-action="spellatk" data-derived="satk"></button></div>
    </div>
    <h3>Ячейки <small>(потрачено / всего)</small></h3>
    <div class="slots">
      ${Array.from({ length: 9 }, (_, i) => `
        <div class="slot"><b>${i + 1}</b>
          <input data-path="spell.slots.${i}.used" data-type="num" type="number" min="0">
          <span>/</span>
          <input data-path="spell.slots.${i}.max" data-type="num" type="number" min="0">
          <button data-action="useslot" data-l="${i}" title="Потратить ячейку">−1</button>
        </div>`).join("")}
    </div>
    ${area("Заговоры и заклинания", "spell.list", 12)}
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

function renderAttacks() {
  const box = app.querySelector<HTMLDivElement>("#attacks")!;
  box.innerHTML = state.attacks.length
    ? `<div class="atk head"><span>Название</span><span>Бонус</span><span>Урон</span><span>Тип / заметки</span><span></span></div>` +
      state.attacks.map((_, i) => `
        <div class="atk">
          <input data-path="attacks.${i}.name" data-type="text">
          <input data-path="attacks.${i}.bonus" data-type="num" type="number">
          <input data-path="attacks.${i}.damage" data-type="text" placeholder="1d8+3">
          <input data-path="attacks.${i}.type" data-type="text">
          <span class="atk-btns">
            <button data-action="atk" data-i="${i}">Атака</button>
            <button data-action="dmg" data-i="${i}">Урон</button>
            <button data-action="delatk" data-i="${i}" class="danger">×</button>
          </span>
        </div>`).join("")
    : `<p class="hint">Атак пока нет.</p>`;
  applyTips(box);
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
      const isItem = path.includes(".items.") || path.includes(".loose.");
      const T: Record<string, string> = {
        name: isItem ? "Название предмета." : "Название контейнера: рюкзак, ножны, сумка…",
        weight: isItem ? "Вес одного предмета в кг." : "Собственный вес пустого контейнера, кг. Входит в переносимый вес.",
        volume: "Объём одного предмета — сколько ячеек он занимает в контейнере.",
        qty: "Количество. Вес и объём умножаются на него.",
        notes: "Заметки: свойства, заряды, состояние.",
        strength: "Прочность — сколько кг содержимого выдерживает контейнер.",
        cols: "Ширина сетки в ячейках. Вместимость = столбцы × строки.",
        rows: "Высота сетки в ячейках. Вместимость = столбцы × строки.",
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
  if (app.querySelectorAll("#attacks .atk:not(.head)").length !== state.attacks.length) renderAttacks();
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
  if (el.dataset.moveC !== undefined && e.type === "change" && el.value !== "") return moveItem(el);
  if (el.dataset.cat) {
    // «change» у поля поиска срабатывает при уходе фокуса — перерисовка в этот момент съедала клик по «+»
    if (e.type === "change" && el.dataset.cat === "query") return;
    if (el.dataset.cat === "query") catalogState.query = el.value;
    if (el.dataset.cat === "cat") catalogState.cat = el.value as typeof catalogState.cat;
    if (el.dataset.cat === "target") catalogState.target = Number(el.value);
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

/** Переместить предмет между «на себе» (-1) и контейнерами */
function moveItem(el: HTMLInputElement) {
  const from = Number(el.dataset.moveC), i = Number(el.dataset.moveI), to = Number(el.value);
  mutate((c) => {
    const list = (k: number) => (k === -1 ? c.inventory.loose : c.inventory.containers[k].items);
    const [it] = list(from).splice(i, 1);
    if (it) list(to).push(it);
  });
  renderInv();
  fill();
}

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
    case "mode":
      rollMode = d.mode as RollMode;
      app.querySelectorAll("#mode button").forEach((b) => b.classList.toggle("on", b === btn));
      break;
    case "check":
      await rollD20(mod(c.abilities[d.ab as Ability]), `Проверка: ${ABILITIES[d.ab as Ability].name}`, rollMode, who());
      break;
    case "save":
      e.preventDefault(); // не переключать чекбокс владения
      await rollD20(saveBonus(c, d.ab as Ability), `Спасбросок: ${ABILITIES[d.ab as Ability].name}`, rollMode, who());
      break;
    case "skill":
      await rollD20(skillBonus(c, d.skill as Skill), SKILLS[d.skill as Skill].name, rollMode, who());
      break;
    case "prof":
      mutate((c) => void (c.skills[d.skill as Skill] = (((c.skills[d.skill as Skill] + 1) % 3) as ProfLevel)));
      break;
    case "init":
      await rollD20(initiative(c), "Инициатива", rollMode, who());
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
    case "addatk":
      mutate((c) => c.attacks.push({ name: "Новая атака", bonus: 0, damage: "1d6", type: "" }));
      break;
    case "delatk":
      mutate((c) => c.attacks.splice(Number(d.i), 1));
      renderAttacks();
      fill();
      break;
    case "atk": {
      const a = c.attacks[Number(d.i)];
      await rollD20(a.bonus || 0, `Атака: ${a.name}`, rollMode, who());
      break;
    }
    case "dmg": {
      const a = c.attacks[Number(d.i)];
      await rollFormula(a.damage, `Урон: ${a.name}${a.type ? ` (${a.type})` : ""}`, who());
      break;
    }
    case "inv-addc": {
      const p = CONTAINER_PRESETS[d.preset!] ?? CONTAINER_PRESETS.custom;
      mutate((c) => c.inventory.containers.push({ ...p, items: [] }));
      break;
    }
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
      mutate((c) => (Number(d.c) === -1 ? c.inventory.loose : c.inventory.containers[Number(d.c)].items).push(newItem()));
      break;
    case "inv-addcat": {
      const it = CATALOG[Number(d.idx)];
      const t = catalogState.target < c.inventory.containers.length ? catalogState.target : -1;
      mutate((c) => (t === -1 ? c.inventory.loose : c.inventory.containers[t].items).push({ name: it.name, weight: it.kg, volume: it.vol, qty: 1, notes: it.notes }));
      OBR.notification.show(`${it.name} → ${t === -1 ? "на себе" : c.inventory.containers[t].name}`, "SUCCESS");
      break;
    }
    case "inv-delitem":
      mutate((c) => (Number(d.c) === -1 ? c.inventory.loose : c.inventory.containers[Number(d.c)].items).splice(Number(d.i), 1));
      renderInv();
      fill();
      break;
    case "spellatk": {
      const sp = spellStats(c);
      if (sp) await rollD20(sp.attack, "Атака заклинанием", rollMode, who());
      break;
    }
    case "useslot": {
      const s = c.spell.slots[Number(d.l)];
      if (s.used >= s.max) return void OBR.notification.show(`Нет свободных ячеек ${Number(d.l) + 1} круга`, "WARNING");
      mutate(() => void s.used++);
      break;
    }
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
  renderAttacks();
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
