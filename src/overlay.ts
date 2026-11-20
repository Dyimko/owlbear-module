// Статы на токене: полоса хитов, Класс уклонения (EC), Класс доспеха (AC) и инициатива.
// Рисуются ЛОКАЛЬНО у каждого игрока (OBR.scene.local) и привязаны к токену — двигаются вместе с ним.
// Если ГМ или владелец токена скрыл статы — их видят только ГМ и владелец (полупрозрачными).
import OBR, { buildShape, buildText, type Item, type Image } from "@owlbear-rodeo/sdk";
import { ID, META_CHARACTER } from "./constants";
import { initiative, normalize, type Character } from "./types";

export const META_HIDDEN = `${ID}/statsHidden`;
const META_OVERLAY = `${ID}/overlay`; // на локальных элементах: id токена

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

let me = { id: "", role: "PLAYER" as "GM" | "PLAYER" };
const drawn = new Map<string, string>(); // tokenId -> подпись того, что нарисовано

function signature(token: Image, c: Character, show: boolean, dim: boolean) {
  return JSON.stringify([
    show, dim, c.hp.cur, c.hp.max, c.hp.temp, c.armor.ec, c.armor.ac, initiative(c),
    token.scale, token.image.width, token.image.height, token.grid.dpi, token.grid.offset,
  ]);
}

async function buildFor(token: Image, c: Character, dim: boolean): Promise<Item[]> {
  const b = await OBR.scene.items.getItemBounds([token.id]);
  const size = Math.min(b.width, b.height);
  const opacity = dim ? 0.45 : 1;
  const tag = { [META_OVERLAY]: token.id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common = <T,>(x: T): T => (x as any).attachedTo(token.id).layer("ATTACHMENT").locked(true).disableHit(true)
      .disableAttachmentBehavior(["ROTATION", "SCALE"]).metadata(tag).visible(token.visible);

  const items: Item[] = [];

  // Полоса хитов снизу
  const barW = size * 0.9, barH = size * 0.17;
  const barX = b.center.x - barW / 2, barY = b.max.y - barH * 0.55;
  const pct = c.hp.max > 0 ? Math.max(0, Math.min(1, c.hp.cur / c.hp.max)) : 0;
  items.push(common(buildShape().shapeType("RECTANGLE").width(barW).height(barH).position({ x: barX, y: barY })
    .fillColor("#3a1a1a").fillOpacity(0.85 * opacity).strokeColor("#000").strokeOpacity(0.5 * opacity).strokeWidth(size * 0.01)).zIndex(1).build());
  if (pct > 0) {
    items.push(common(buildShape().shapeType("RECTANGLE").width(barW * pct).height(barH).position({ x: barX, y: barY })
      .fillColor(pct > 0.5 ? "#d9433f" : pct > 0.25 ? "#e07a2b" : "#9e1b1b").fillOpacity(0.95 * opacity).strokeWidth(0)).zIndex(2).build());
  }
  const hpText = `${c.hp.cur}/${c.hp.max}${c.hp.temp ? ` +${c.hp.temp}` : ""}`;
  items.push(common(buildText().textType("PLAIN").plainText(hpText).width(barW).height(barH).position({ x: barX, y: barY })
    .textAlign("CENTER").textAlignVertical("MIDDLE").fontSize(barH * 0.78).fontWeight(700).padding(0)
    .fillColor("#ffffff").fillOpacity(opacity).strokeColor("#000000").strokeOpacity(0.6 * opacity).strokeWidth(size * 0.006)).zIndex(3).build());

  // Кружки: EC (зелёный) и AC (синий) справа над полосой, инициатива (оранжевый) слева
  const d = size * 0.27;
  const bubble = (cx: number, cy: number, color: string, text: string, z: number) => {
    items.push(common(buildShape().shapeType("CIRCLE").width(d).height(d).position({ x: cx, y: cy })
      .fillColor(color).fillOpacity(0.92 * opacity).strokeColor("#ffffff").strokeOpacity(0.7 * opacity).strokeWidth(size * 0.012)).zIndex(z).build());
    items.push(common(buildText().textType("PLAIN").plainText(text).width(d).height(d).position({ x: cx - d / 2, y: cy - d / 2 })
      .textAlign("CENTER").textAlignVertical("MIDDLE").fontSize(d * (text.length > 2 ? 0.42 : 0.55)).fontWeight(700).padding(0)
      .fillColor("#ffffff").fillOpacity(opacity).strokeColor("#000000").strokeOpacity(0.5 * opacity).strokeWidth(size * 0.005)).zIndex(z + 1).build());
  };
  const by = barY - d * 0.45;
  bubble(b.max.x - d * 0.45, by, "#3f7fd1", String(c.armor.ac), 10); // AC
  bubble(b.max.x - d * 1.5, by, "#5a9a3a", String(c.armor.ec), 12); // EC
  bubble(b.min.x + d * 0.45, by, "#c8762a", fmt(initiative(c)), 14); // инициатива
  return items;
}

async function sync(all?: Item[]) {
  if (!(await OBR.scene.isReady())) return;
  const items = all ?? (await OBR.scene.items.getItems());
  const tokens = items.filter((i): i is Image => i.type === "IMAGE" && !!i.metadata[META_CHARACTER]);
  const alive = new Set(tokens.map((t) => t.id));

  // убрать оверлеи удалённых токенов
  const gone = [...drawn.keys()].filter((id) => !alive.has(id));
  if (gone.length) {
    const local = await OBR.scene.local.getItems((i) => gone.includes(i.metadata[META_OVERLAY] as string));
    await OBR.scene.local.deleteItems(local.map((i) => i.id));
    gone.forEach((id) => drawn.delete(id));
  }

  for (const token of tokens) {
    const c = normalize(token.metadata[META_CHARACTER], token.name);
    const hidden = token.metadata[META_HIDDEN] === true;
    const privileged = me.role === "GM" || token.createdUserId === me.id;
    const show = !hidden || privileged;
    const sig = signature(token, c, show, hidden);
    if (drawn.get(token.id) === sig) continue;
    drawn.set(token.id, sig);
    const old = await OBR.scene.local.getItems((i) => i.metadata[META_OVERLAY] === token.id);
    if (old.length) await OBR.scene.local.deleteItems(old.map((i) => i.id));
    if (show) await OBR.scene.local.addItems(await buildFor(token, c, hidden));
  }
}

let queued: Item[] | undefined;
let running = false;
async function schedule(items?: Item[]) {
  queued = items;
  if (running) return;
  running = true;
  try {
    while (true) {
      const batch = queued;
      queued = undefined;
      await sync(batch);
      if (queued === undefined) break;
    }
  } finally {
    running = false;
  }
}

export async function startOverlay() {
  me = { id: await OBR.player.getId(), role: await OBR.player.getRole() };
  OBR.player.onChange((p) => {
    if (p.role !== me.role) {
      me.role = p.role;
      drawn.clear();
      schedule();
    }
  });
  OBR.scene.onReadyChange((ready) => {
    drawn.clear();
    if (ready) schedule();
  });
  OBR.scene.items.onChange((items) => schedule(items));
  schedule();
}

/** Пункты контекстного меню «Скрыть / Показать статы» для ГМ и владельца токена */
export async function registerHideMenu(icon: string) {
  const hasSheet = { key: ["metadata", META_CHARACTER], value: undefined, operator: "!=" as const };
  const isHidden = { key: ["metadata", META_HIDDEN], value: true };
  const notHidden = { key: ["metadata", META_HIDDEN], value: true, operator: "!=" as const };
  const mine = { key: "createdUserId", value: await OBR.player.getId() };
  await OBR.contextMenu.create({
    id: `${ID}/toggle-stats`,
    icons: [
      { icon, label: "Скрыть статы от игроков", filter: { roles: ["GM"], every: [hasSheet, notHidden] } },
      { icon, label: "Показать статы игрокам", filter: { roles: ["GM"], every: [hasSheet, isHidden] } },
      { icon, label: "Скрыть статы от игроков", filter: { every: [hasSheet, mine, notHidden] } },
      { icon, label: "Показать статы игрокам", filter: { every: [hasSheet, mine, isHidden] } },
    ],
    onClick: (ctx) => {
      const allHidden = ctx.items.every((i) => i.metadata[META_HIDDEN] === true);
      OBR.scene.items.updateItems(ctx.items, (items) => {
        for (const i of items) i.metadata[META_HIDDEN] = !allHidden;
      });
    },
  });
}
