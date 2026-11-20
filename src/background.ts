// Фоновый скрипт: работает всё время, пока открыта комната. Регистрирует пункт контекстного меню.
import OBR from "@owlbear-rodeo/sdk";
import { CHANNEL_ROLL, ID, asset, openSheet } from "./constants";
import type { RollMessage } from "./types";
import { registerStatsMenu, startOverlay } from "./overlay";

OBR.onReady(() => {
  // Хиты, EC, AC и инициатива на токенах (у каждого игрока свои локальные надписи)
  startOverlay();
  registerStatsMenu(asset("icon.svg"), asset("menu.html"));

  // Всплывашка с результатом броска у всех игроков — даже если панель бросков закрыта
  OBR.broadcast.onMessage(CHANNEL_ROLL, ({ data }) => {
    const m = data as RollMessage;
    const crit = m.crit === "success" ? " — КРИТ!" : m.crit === "fail" ? " — провал!" : "";
    OBR.notification.show(`${m.who ?? m.player}: ${m.label} → ${m.total}${crit}`, m.crit === "fail" ? "WARNING" : "INFO");
  });

  // Лист персонажа доступен для любого токена-картинки
  OBR.contextMenu.create({
    id: `${ID}/open-sheet`,
    icons: [
      {
        icon: asset("icon.svg"),
        label: "Лист персонажа",
        filter: { max: 1, every: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    onClick: (ctx) => openSheet(OBR, ctx.items[0].id),
  });
});
