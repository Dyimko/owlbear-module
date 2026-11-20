// Модель листа персонажа D&D 5e. Хранится в метаданных токена (item.metadata[META_CHARACTER]).
// Инвентарь и броня — кастомные, будут добавлены позже.

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type ProfLevel = 0 | 1 | 2; // нет / владение / компетентность

export const ABILITIES: Record<Ability, { name: string; short: string }> = {
  str: { name: "Сила", short: "СИЛ" },
  dex: { name: "Ловкость", short: "ЛОВ" },
  con: { name: "Телосложение", short: "ТЕЛ" },
  int: { name: "Интеллект", short: "ИНТ" },
  wis: { name: "Мудрость", short: "МДР" },
  cha: { name: "Харизма", short: "ХАР" },
};
export const ABILITY_KEYS = Object.keys(ABILITIES) as Ability[];

export const SKILLS = {
  acrobatics: { name: "Акробатика", ab: "dex" },
  investigation: { name: "Анализ", ab: "int" },
  athletics: { name: "Атлетика", ab: "str" },
  perception: { name: "Внимательность", ab: "wis" },
  survival: { name: "Выживание", ab: "wis" },
  performance: { name: "Выступление", ab: "cha" },
  intimidation: { name: "Запугивание", ab: "cha" },
  history: { name: "История", ab: "int" },
  sleightOfHand: { name: "Ловкость рук", ab: "dex" },
  arcana: { name: "Магия", ab: "int" },
  medicine: { name: "Медицина", ab: "wis" },
  deception: { name: "Обман", ab: "cha" },
  nature: { name: "Природа", ab: "int" },
  insight: { name: "Проницательность", ab: "wis" },
  religion: { name: "Религия", ab: "int" },
  stealth: { name: "Скрытность", ab: "dex" },
  persuasion: { name: "Убеждение", ab: "cha" },
  animalHandling: { name: "Уход за животными", ab: "wis" },
} as const satisfies Record<string, { name: string; ab: Ability }>;
export type Skill = keyof typeof SKILLS;
export const SKILL_KEYS = Object.keys(SKILLS) as Skill[];

export const CONDITIONS = [
  "Ослеплённый", "Очарованный", "Оглохший", "Испуганный", "Схваченный", "Недееспособный", "Невидимый",
  "Парализованный", "Окаменевший", "Отравленный", "Сбитый с ног", "Опутанный", "Ошеломлённый", "Бессознательный",
  "Кровотечение", "Ослаблен",
];
export const CONDITION_HINTS: Record<string, string> = {
  "Кровотечение": "1d4 некротического урона в начале каждого хода, пока хиты не восстановлены хотя бы на 1. Действием — Медицина Сл 10, чтобы остановить (у себя или соседа).",
  "Ослаблен": "Помеха на атаки, проверки и спасброски Силы, Ловкости и Телосложения.",
};

// ---- Броня: Challenge Mode Armor System (The Dungeon Coach, «Martial Gear & Combat Overhaul») ----
// Класс уклонения (EC) и КД (AC) образуют диапазон EC–AC:
//   атака < EC — уклонение, 0 урона; EC ≤ атака ≤ AC — попадание по броне, урон уменьшается на AR; атака > AC — полный урон.
// EC: без доспеха и лёгкий — 10 + ЛОВ; средний — 10 + ЛОВ (макс. 2); тяжёлый — 10. Щит повышает и EC, и AC.
export type ArmorType = "none" | "light" | "medium" | "heavy";
export const ARMOR_TYPES: Record<ArmorType, string> = { none: "без доспеха", light: "лёгкий", medium: "средний", heavy: "тяжёлый" };

export interface ArmorPreset { name: string; type: ArmorType; base: number; strReq: number; stealthDis: boolean; acroDis: boolean }
export const ARMORS: Record<string, ArmorPreset> = {
  none: { name: "Без доспеха", type: "none", base: 10, strReq: 0, stealthDis: false, acroDis: false },
  padded: { name: "Стёганый", type: "light", base: 11, strReq: 0, stealthDis: false, acroDis: true },
  leather: { name: "Кожаный", type: "light", base: 11, strReq: 0, stealthDis: false, acroDis: false },
  studded: { name: "Проклёпанная кожа", type: "light", base: 12, strReq: 0, stealthDis: false, acroDis: false },
  hide: { name: "Шкурный", type: "medium", base: 12, strReq: 0, stealthDis: false, acroDis: false },
  chainShirt: { name: "Кольчужная рубаха", type: "medium", base: 13, strReq: 0, stealthDis: false, acroDis: false },
  scale: { name: "Чешуйчатый", type: "medium", base: 14, strReq: 0, stealthDis: true, acroDis: false },
  breastplate: { name: "Кираса", type: "medium", base: 14, strReq: 0, stealthDis: false, acroDis: true },
  halfPlate: { name: "Полулаты", type: "medium", base: 15, strReq: 0, stealthDis: true, acroDis: true },
  ring: { name: "Колечный", type: "heavy", base: 14, strReq: 0, stealthDis: true, acroDis: false },
  chain: { name: "Кольчуга", type: "heavy", base: 16, strReq: 13, stealthDis: true, acroDis: true },
  splint: { name: "Наборный", type: "heavy", base: 17, strReq: 15, stealthDis: true, acroDis: true },
  plate: { name: "Латы", type: "heavy", base: 18, strReq: 15, stealthDis: true, acroDis: true },
  custom: { name: "Свой доспех", type: "light", base: 11, strReq: 0, stealthDis: false, acroDis: false },
};

export const SHIELD_PROPS: Record<string, string> = {
  bulky: "Громоздкий: можно держать двумя руками; в одной руке — скорость −10 фт и помеха на проверки Ловкости",
  deployable: "Разворачиваемый: действием поставить в соседней клетке как стену 5 фт, даёт укрытие ¾; поднять — действием",
  defensive: "Оборонительный: помеха на ваши атаки, если вы перемещались с начала хода",
  deflecting: "Отражающий: при приёме Shield Block против дальнобойной атаки бонус щита к КД удваивается",
  mountedDefense: "Конный: бонус щита к КД получает и ваш скакун",
  offensive: "Атакующий: кость урона щита — d8 вместо d4",
  protective: "Защитный: бонус щита к КД добавляется к спасброскам Ловкости от площадного урона",
  shieldWall: "Стена щитов: +1 КД, если рядом (5 фт) союзник со щитом с тем же свойством; захват и проход через вас — с помехой",
  stable: "Устойчивый: рукой со щитом можно поднимать, толкать, открывать, бить безоружно и заряжать боеприпасы",
  thrown: "Метательный: дальнобойная атака щитом (15/30), та же характеристика, что и в ближнем бою",
};
export interface ShieldPreset { name: string; ac: number; props: string[]; strReq: number; stealthDis: boolean; acroDis: boolean }
export const SHIELDS: Record<string, ShieldPreset> = {
  none: { name: "Без щита", ac: 0, props: [], strReq: 0, stealthDis: false, acroDis: false },
  light: { name: "Лёгкий щит", ac: 1, props: ["stable"], strReq: 0, stealthDis: false, acroDis: false },
  buckler: { name: "Баклер", ac: 2, props: ["defensive"], strReq: 0, stealthDis: false, acroDis: true },
  deflector: { name: "Отражатель", ac: 1, props: ["deflecting"], strReq: 0, stealthDis: false, acroDis: false },
  disk: { name: "Дисковый баклер", ac: 1, props: ["thrown"], strReq: 0, stealthDis: false, acroDis: false },
  medium: { name: "Средний щит", ac: 2, props: [], strReq: 0, stealthDis: false, acroDis: false },
  cavalry: { name: "Кавалерийский щит", ac: 2, props: ["mountedDefense"], strReq: 0, stealthDis: true, acroDis: false },
  kite: { name: "Каплевидный щит", ac: 2, props: ["offensive"], strReq: 0, stealthDis: false, acroDis: true },
  tower: { name: "Башенный щит", ac: 3, props: ["shieldWall"], strReq: 13, stealthDis: true, acroDis: true },
  heavy: { name: "Тяжёлый щит", ac: 4, props: ["bulky", "defensive", "protective"], strReq: 15, stealthDis: true, acroDis: true },
  bulwark: { name: "Бастион", ac: 4, props: ["bulky", "deployable", "shieldWall"], strReq: 15, stealthDis: true, acroDis: true },
};

export const ARMOR_PROPS: Record<string, string> = {
  bulky: "Громоздкая: нельзя спрятаться на виду; помеха на Атлетику, Акробатику и проверки Телосложения (плавание, лазание, бег); +1 истощение после долгого отдыха в ней",
  decorative: "Декоративная: преимущество на Выступление и Убеждение перед военными и на церемониях",
  endure: "Стойкая: урон выбранного типа уменьшается на бонус мастерства",
  ergonomic: "Эргономичная: можно спать в ней без штрафов",
  muffled: "Приглушённая: снимает помеху на Скрытность (и на Акробатику, если она шла вместе)",
  pocketed: "С карманами: скрытые отделения для мелочей и скрываемого оружия",
  quickRelease: "Быстросъёмная: снять доспех — действием",
  weighted: "Утяжелённая: преимущество на проверки и спасброски против перемещения и сбивания с ног",
};

export const GUARD: Record<ArmorType, string> = {
  none: "Защита без доспеха: при нацеливании атаки отойти на 5 фт (оставаясь в досягаемости) — атака с помехой",
  light: "Лёгкая защита: при нацеливании атаки отойти на 5 фт (оставаясь в досягаемости) — атака с помехой",
  medium: "Средняя защита: при нацеливании атаки +2 к КД против этой атаки",
  heavy: "Тяжёлая защита: при попадании атаки урон автоматически уменьшается на бонус мастерства",
};

export const DEFENSE_LEVELS: Record<string, { name: string; ac: number }> = {
  "2": { name: "Укреплён (+5 КД)", ac: 5 },
  "1": { name: "Защищён (+2 КД)", ac: 2 },
  "0": { name: "—", ac: 0 },
  "-1": { name: "Незащищён (−2 КД)", ac: -2 },
  "-2": { name: "Открыт (−5 КД)", ac: -5 },
};

export type ArMethod = "dc" | "prof" | "glancing";
export const AR_METHODS: Record<ArMethod, string> = {
  dc: "Метод DC: AR = КД доспеха − 10",
  prof: "По бонусу мастерства: лёгкий ½, средний ×1, тяжёлый ×2",
  glancing: "Скользящие удары: в диапазоне — половина урона (не меньше 1)",
};

// Всё в бою вводится вручную — таблицы выше только справочник.
export interface ArmorState {
  name: string; // доспех
  shield: string; // щит
  ec: number; // класс уклонения
  ac: number; // класс доспеха
  ar: number; // снижение урона
  guard: number; // очки защиты
  notes: string; // свойства, защита (Defense), прочее
}

// ---- Инвентарь: вес + объём ----
// У каждого предмета есть вес (кг) и объём (ячейки). Контейнеры (рюкзак, ножны, сумки) имеют
// прочность — сколько кг выдерживают, и вместимость — сетку ячеек (столбцы × строки).
// Лист только показывает суммы; ограничения не навязываются — решаете сами.
export interface InvItem { name: string; weight: number; volume: number; qty: number; notes: string }
export interface Container { name: string; strength: number; cols: number; rows: number; weight: number; items: InvItem[] }
export interface Inventory { carryMax: number; loose: InvItem[]; containers: Container[] }

export const CONTAINER_PRESETS: Record<string, Omit<Container, "items">> = {
  backpack: { name: "Рюкзак", strength: 30, cols: 4, rows: 6, weight: 2 },
  sheath: { name: "Ножны", strength: 5, cols: 1, rows: 5, weight: 1 },
  pouch: { name: "Поясная сумка", strength: 5, cols: 2, rows: 2, weight: 0.5 },
  quiver: { name: "Колчан", strength: 3, cols: 1, rows: 4, weight: 0.5 },
  custom: { name: "Контейнер", strength: 10, cols: 3, rows: 3, weight: 1 },
};
export const newItem = (): InvItem => ({ name: "Предмет", weight: 1, volume: 1, qty: 1, notes: "" });

export const itemsWeight = (items: InvItem[]) => items.reduce((s, i) => s + (i.weight || 0) * (i.qty || 0), 0);
export const itemsVolume = (items: InvItem[]) => items.reduce((s, i) => s + (i.volume || 0) * (i.qty || 0), 0);
/** Всё, что несёт персонаж: предметы на себе + контейнеры с содержимым */
export const totalCarried = (inv: Inventory) =>
  itemsWeight(inv.loose) + inv.containers.reduce((s, c) => s + (c.weight || 0) + itemsWeight(c.items), 0);

export interface Attack {
  name: string;
  bonus: number; // итоговый бонус атаки — вписывается вручную
  damage: string; // формула урона, напр. "1d8+3"
  type: string; // тип урона / заметки
}

export interface Character {
  name: string;
  cls: string;
  level: number;
  race: string;
  background: string;
  alignment: string;
  xp: number;
  abilities: Record<Ability, number>;
  saves: Record<Ability, boolean>;
  skills: Record<Skill, ProfLevel>;
  jack: boolean; // «Мастер на все руки»: +½ владения к проверкам без владения
  inspiration: boolean;
  armor: ArmorState;
  speed: number;
  initMisc: number;
  hp: { cur: number; max: number; temp: number };
  hitDie: number; // кость хитов: 6/8/10/12
  hitDiceUsed: number;
  death: { s: number; f: number };
  exhaustion: number;
  conditions: Record<string, boolean>;
  attacks: Attack[];
  spell: { ability: Ability | "none"; slots: { max: number; used: number }[]; list: string };
  inventory: Inventory;
  text: { features: string; profs: string; personality: string; ideals: string; bonds: string; flaws: string; notes: string };
}

export const defaultCharacter = (name = ""): Character => ({
  name,
  cls: "",
  level: 1,
  race: "",
  background: "",
  alignment: "",
  xp: 0,
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  saves: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
  skills: Object.fromEntries(SKILL_KEYS.map((k) => [k, 0])) as Record<Skill, ProfLevel>,
  jack: false,
  inspiration: false,
  armor: { name: "", shield: "", ec: 10, ac: 10, ar: 0, guard: 0, notes: "" },
  speed: 30,
  initMisc: 0,
  hp: { cur: 10, max: 10, temp: 0 },
  hitDie: 8,
  hitDiceUsed: 0,
  death: { s: 0, f: 0 },
  exhaustion: 0,
  conditions: {},
  attacks: [],
  spell: { ability: "none", slots: Array.from({ length: 9 }, () => ({ max: 0, used: 0 })), list: "" },
  inventory: { carryMax: 50, loose: [], containers: [] },
  text: { features: "", profs: "", personality: "", ideals: "", bonds: "", flaws: "", notes: "" },
});

/** Дополняет старые/неполные данные значениями по умолчанию */
export function normalize(raw: unknown, name: string): Character {
  const base = defaultCharacter(name);
  const merge = (a: any, b: any): any => {
    if (Array.isArray(a)) return Array.isArray(b) ? b : a;
    if (a && typeof a === "object") {
      const out: any = { ...a };
      if (b && typeof b === "object") for (const k of Object.keys(b)) out[k] = k in a ? merge(a[k], b[k]) : b[k];
      return out;
    }
    return b === undefined || b === null ? a : b;
  };
  const c = merge(base, raw) as Character;
  if (c.spell.slots.length !== 9) c.spell.slots = base.spell.slots;
  for (const k of ["name", "shield", "notes"] as const) if (typeof c.armor[k] !== "string") c.armor[k] = "";
  return c;
}

// ---- Правила 5e ----
export const mod = (score: number) => Math.floor((score - 10) / 2);
export const profBonus = (level: number) => 2 + Math.floor((Math.max(1, level) - 1) / 4);
export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function skillBonus(c: Character, s: Skill) {
  const p = profBonus(c.level);
  const lvl = c.skills[s];
  const extra = lvl === 2 ? p * 2 : lvl === 1 ? p : c.jack ? Math.floor(p / 2) : 0;
  return mod(c.abilities[SKILLS[s].ab]) + extra;
}
export const saveBonus = (c: Character, a: Ability) => mod(c.abilities[a]) + (c.saves[a] ? profBonus(c.level) : 0);
export const initiative = (c: Character) =>
  mod(c.abilities.dex) + c.initMisc + (c.jack ? Math.floor(profBonus(c.level) / 2) : 0);
export const passive = (c: Character, s: Skill) => 10 + skillBonus(c, s);

export function spellStats(c: Character) {
  if (c.spell.ability === "none") return null;
  const m = mod(c.abilities[c.spell.ability]);
  const p = profBonus(c.level);
  return { dc: 8 + p + m, attack: p + m };
}

// ---- Сообщение о броске (рассылается всем) ----
export interface RollMessage {
  player: string;
  color: string;
  who?: string; // имя персонажа
  label: string; // что бросали
  detail: string; // как получилось: "[14, 7] → 14 + 5"
  total: number;
  crit?: "success" | "fail";
}
