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
export interface InvItem {
  name: string; weight: number; volume: number; qty: number; notes: string;
  hands?: number; // сколько рук занимает в руках (1 или 2)
  bonus?: { zone: "belt" | "back"; cells: number }; // ремни/перевязи: доп. место на теле, когда надеты
}
export type BodyZone = "hands" | "belt" | "back" | "worn";
export type CarryZone = "none" | "hands" | "belt" | "back";
export interface Container {
  name: string; strength: number; cols: number; rows: number; weight: number; items: InvItem[];
  magic?: boolean; // магическое хранилище: содержимое не добавляет вес персонажу
  zone?: CarryZone; // где носится на теле
  bodySize?: number; // сколько места занимает в зоне (в руках — число рук)
}
export type Size = "tiny" | "medium" | "large" | "huge" | "gargantuan";
export const SIZES: Record<Size, { name: string; mult: number }> = {
  tiny: { name: "Крошечный", mult: 0.5 },
  medium: { name: "Маленький / Средний", mult: 1 },
  large: { name: "Большой", mult: 2 },
  huge: { name: "Огромный", mult: 4 },
  gargantuan: { name: "Громадный", mult: 8 },
};
// Зоны тела (хоумрул под систему объёма):
// руки — 2 руки, двуручный предмет занимает обе; пояс и спина — ячейки, расширяются ремнями и перевязями; надето — без лимита.
export const ZONES: Record<BodyZone, { name: string; hint: string }> = {
  hands: { name: "В руках", hint: "2 руки. Двуручное оружие и большие предметы (больше 6 ячеек) занимают обе руки. Универсальное — 1 или 2, как держите." },
  belt: { name: "На поясе", hint: "Ячейки на поясе: кошели, ножны, оружие на петле, флаконы. Базово 4, ремни и перевязи добавляют места." },
  back: { name: "На спине", hint: "Ячейки на спине: рюкзак, колчан, оружие за спиной. Базово 4, наплечные ремни добавляют места." },
  worn: { name: "Надето", hint: "Доспех, одежда, кольца, плащи, ремни. Объём не ограничен, вес учитывается." },
};
export interface Inventory {
  size: Size; carryBonus: number;
  zones: Record<BodyZone, InvItem[]>;
  zoneBase: { belt: number; back: number };
  containers: Container[];
  loose?: InvItem[]; // старый формат — переносится в «Надето»
}

/** Список предметов по адресу: "z:hands" / "z:belt" / "z:back" / "z:worn" / "c:3" */
export function itemList(inv: Inventory, loc: string): InvItem[] {
  if (loc.startsWith("c:")) return inv.containers[Number(loc.slice(2))]?.items ?? inv.zones.worn;
  return inv.zones[loc.slice(2) as BodyZone] ?? inv.zones.worn;
}

/** Сколько рук нужно предмету по умолчанию */
export const defaultHands = (it: { notes?: string; volume?: number }) =>
  /Двуручное(?! \(если)/.test(it.notes ?? "") || (it.volume ?? 0) > 6 ? 2 : 1;

/** Занятость зон тела */
export function zoneUsage(inv: Inventory) {
  const on = (z: CarryZone) => inv.containers.filter((c) => (c.zone ?? "none") === z);
  const bonus = (z: "belt" | "back") =>
    inv.zones.worn.reduce((s, i) => s + (i.bonus?.zone === z ? (i.bonus.cells || 0) * (i.qty || 1) : 0), 0);
  return {
    hands: {
      used: inv.zones.hands.reduce((s, i) => s + (i.hands ?? defaultHands(i)) * (i.qty || 0), 0) + on("hands").reduce((s, c) => s + (c.bodySize || 1), 0),
      cap: 2,
    },
    belt: { used: itemsVolume(inv.zones.belt) + on("belt").reduce((s, c) => s + (c.bodySize || 0), 0), cap: (inv.zoneBase?.belt ?? 4) + bonus("belt") },
    back: { used: itemsVolume(inv.zones.back) + on("back").reduce((s, c) => s + (c.bodySize || 0), 0), cap: (inv.zoneBase?.back ?? 4) + bonus("back") },
  };
}
/** Грузоподъёмность 2024: Сила × 15 фунтов (× 7,5 кг) × множитель размера + доп. */
export const carryCapacity = (c: { abilities: { str: number }; inventory: Inventory }) =>
  c.abilities.str * 7.5 * (SIZES[c.inventory.size]?.mult ?? 1) + (c.inventory.carryBonus || 0);

// Контейнеры D&D 2024 (вместимость по PHB, 1 фунт = 0,5 кг). Ячейки: 1 куб. фут = 24 ячейки.
// Где PHB не даёт предела веса (ведро, бочка), он посчитан по пропорции рюкзака: 30 фунтов на куб. фут.
type Preset = Omit<Container, "items"> & { hint: string; parts?: Omit<Container, "items">[] };
export const CONTAINER_PRESETS: Record<string, Preset> = {
  backpack: { name: "Рюкзак", strength: 15, cols: 4, rows: 6, weight: 2.5, zone: "back", bodySize: 4, hint: "PHB: до 30 фунтов в 1 куб. футе" },
  sack: { name: "Мешок", strength: 15, cols: 4, rows: 6, weight: 0.25, zone: "back", bodySize: 4, hint: "PHB: до 30 фунтов в 1 куб. футе" },
  pouch: { name: "Кошель", strength: 3, cols: 2, rows: 2, weight: 0.5, zone: "belt", bodySize: 1, hint: "PHB: до 6 фунтов в 1/5 куб. фута" },
  basket: { name: "Корзина", strength: 20, cols: 6, rows: 8, weight: 1, zone: "hands", bodySize: 2, hint: "PHB: до 40 фунтов в 2 куб. футах" },
  bucket: { name: "Ведро", strength: 7.5, cols: 3, rows: 4, weight: 1, zone: "hands", bodySize: 1, hint: "PHB: ½ куб. фута (3 галлона)" },
  barrel: { name: "Бочка", strength: 60, cols: 8, rows: 12, weight: 35, zone: "none", bodySize: 0, hint: "PHB: 4 куб. фута твёрдого или 40 галлонов жидкости" },
  chest: { name: "Сундук", strength: 150, cols: 16, rows: 18, weight: 12.5, zone: "none", bodySize: 0, hint: "PHB: до 300 фунтов в 12 куб. футах" },
  quiver: { name: "Колчан", strength: 1, cols: 1, rows: 3, weight: 0.5, zone: "back", bodySize: 1, hint: "PHB: 20 стрел" },
  boltCase: { name: "Футляр для болтов", strength: 1, cols: 1, rows: 3, weight: 0.5, zone: "belt", bodySize: 1, hint: "PHB: 20 арбалетных болтов" },
  scrollCase: { name: "Футляр для карт и свитков", strength: 0.5, cols: 1, rows: 2, weight: 0.5, zone: "belt", bodySize: 1, hint: "PHB: 10 листов бумаги или 5 листов пергамента" },
  sheath: { name: "Ножны", strength: 2, cols: 1, rows: 5, weight: 0.5, zone: "belt", bodySize: 1, hint: "Хоумрул: одно оружие до 5 ячеек" },
  custom: { name: "Контейнер", strength: 10, cols: 3, rows: 3, weight: 1, zone: "none", bodySize: 0, hint: "Свой контейнер" },
  // Магические хранилища (DMG 2024): содержимое ничего не весит, весит только сам предмет
  bagOfHolding: { name: "Сумка хранения", strength: 250, cols: 32, rows: 48, weight: 2.5, magic: true,
    zone: "back", bodySize: 2, hint: "Необычный. До 500 фунтов и 64 куб. футов, всегда весит 5 фунтов. Достать предмет — действие «Использование»" },
  haversack: { name: "Удобный рюкзак Хеварда — центр", strength: 250, cols: 32, rows: 48, weight: 2.5, magic: true,
    zone: "back", bodySize: 4, hint: "Редкий. Центральный карман 500 фунтов / 64 куб. фута, два боковых по 200 фунтов / 25 куб. футов. Всегда весит 5 фунтов. Достать — действие или бонусное действие",
    parts: [
      { name: "Удобный рюкзак Хеварда — левый карман", strength: 100, cols: 20, rows: 30, weight: 0, magic: true },
      { name: "Удобный рюкзак Хеварда — правый карман", strength: 100, cols: 20, rows: 30, weight: 0, magic: true },
    ] },
  portableHole: { name: "Переносная дыра", strength: 99999, cols: 80, rows: 85, weight: 0, magic: true,
    zone: "belt", bodySize: 1, hint: "Редкий. Цилиндр 6 фт в диаметре и 10 фт глубиной (~282 куб. фута), предел веса не указан. Сложенная — как платок" },
  efficientQuiver: { name: "Эффективный колчан — стрелы и болты", strength: 99999, cols: 1, rows: 9, weight: 1, magic: true,
    zone: "back", bodySize: 1, hint: "Необычный. Три отделения: 60 стрел или болтов, 18 метательных копий, 6 длинных предметов (луки, посохи, копья). Всегда весит 2 фунта",
    parts: [
      { name: "Эффективный колчан — метательные копья", strength: 99999, cols: 6, rows: 12, weight: 0, magic: true },
      { name: "Эффективный колчан — длинные предметы", strength: 99999, cols: 6, rows: 10, weight: 0, magic: true },
    ] },
};
export const newItem = (): InvItem => ({ name: "Предмет", weight: 1, volume: 1, qty: 1, notes: "" });

export const itemsWeight = (items: InvItem[]) => items.reduce((s, i) => s + (i.weight || 0) * (i.qty || 0), 0);
export const itemsVolume = (items: InvItem[]) => items.reduce((s, i) => s + (i.volume || 0) * (i.qty || 0), 0);
/** Всё, что несёт персонаж: предметы на себе + контейнеры с содержимым */
export const totalCarried = (inv: Inventory) =>
  Object.values(inv.zones).reduce((s, items) => s + itemsWeight(items), 0) + inv.containers.reduce((s, c) => s + (c.weight || 0) + (c.magic ? 0 : itemsWeight(c.items)), 0);

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
  inventory: {
    size: "medium", carryBonus: 0, containers: [],
    zones: { hands: [], belt: [], back: [], worn: [] },
    zoneBase: { belt: 4, back: 4 },
  },
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
  if (c.inventory.loose?.length) { c.inventory.zones.worn.push(...c.inventory.loose); }
  delete c.inventory.loose;
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
