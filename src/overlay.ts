// Статы на токене: полоса хитов, Класс уклонения (EC), Класс доспеха (AC) и инициатива.
// Рисуются ЛОКАЛЬНО у каждого игрока (OBR.scene.local) и привязаны к токену — двигаются вместе с ним.
// Если ГМ или владелец токена скрыл статы — их видят только ГМ и владелец (полупрозрачными).
import OBR, { buildPath, buildShape, buildText, type Item, type Image, type PathCommand } from "@owlbear-rodeo/sdk";
import { ID, META_CHARACTER } from "./constants";
import { initiative, normalize, type Character } from "./types";
import { overlaySpecs } from "./overlayGeom";

export const META_HIDDEN = `${ID}/statsHidden`;
const META_OVERLAY = `${ID}/overlay`; // на локальных элементах: id токена


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
  const specs = overlaySpecs({ minX: b.min.x, maxX: b.max.x, maxY: b.max.y, cx: b.center.x, size },
    { cur: c.hp.cur, max: c.hp.max, temp: c.hp.temp, ec: c.armor.ec, ac: c.armor.ac, init: initiative(c) }, dim);
  const tag = { [META_OVERLAY]: token.id };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common = (x: any) => x.attachedTo(token.id).layer("ATTACHMENT").locked(true).disableHit(true)
    .disableAttachmentBehavior(["ROTATION", "SCALE"]).metadata(tag).visible(token.visible);
  return specs.map((sp) => {
    if (sp.kind === "text") {
      return common(buildText().textType("PLAIN").plainText(sp.text!).width(sp.w).height(sp.h).position({ x: sp.x, y: sp.y })
        .textAlign("CENTER").textAlignVertical("MIDDLE").fontSize(sp.fontSize!).fontWeight(800).padding(0)
        .fillColor(sp.textColor!).fillOpacity(sp.fillOpacity ?? 1).strokeColor(sp.stroke!).strokeOpacity(sp.strokeOpacity ?? 1).strokeWidth(sp.strokeWidth ?? 0))
        .zIndex(sp.z).build();
    }
    if (sp.kind === "circle") {
      return common(buildShape().shapeType("CIRCLE").width(sp.w).height(sp.h).position({ x: sp.x, y: sp.y })
        .fillColor(sp.fill!).fillOpacity(sp.fillOpacity ?? 1).strokeColor(sp.stroke ?? "#000").strokeOpacity(sp.strokeOpacity ?? 0).strokeWidth(sp.strokeWidth ?? 0))
        .zIndex(sp.z).build();
    }
    return common(buildPath().commands(sp.commands as PathCommand[]).position({ x: sp.x, y: sp.y })
      .fillColor(sp.fill!).fillOpacity(sp.fillOpacity ?? 1).strokeColor(sp.stroke ?? "#000").strokeOpacity(sp.strokeOpacity ?? 0).strokeWidth(sp.strokeWidth ?? 0))
      .zIndex(sp.z).build();
  });
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

/** Панель «Статы» в контекстном меню токена (правый клик) — для ГМ и владельца токена */
export async function registerStatsMenu(icon: string, url: string) {
  const mine = { key: "createdUserId", value: await OBR.player.getId() };
  const image = { key: "type", value: "IMAGE" };
  await OBR.contextMenu.create({
    id: `${ID}/stats-menu`,
    icons: [
      { icon, label: "Статы", filter: { max: 1, roles: ["GM"], every: [image] } },
      { icon, label: "Статы", filter: { max: 1, every: [image, mine] } },
    ],
    embed: { url, height: 190 },
  });
}

/** (не используется: скрытие теперь в панели «Статы») Пункты «Скрыть / Показать статы» */
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
