// Фоновый скрипт: работает всё время, пока открыта комната. Регистрирует пункт контекстного меню.
import OBR from "@owlbear-rodeo/sdk";
import { CHANNEL_ROLL, ID, asset } from "./constants";
import type { RollMessage } from "./types";

OBR.onReady(() => {
  // Всплывашка с результатом броска у всех игроков — даже если панель бросков закрыта
  OBR.broadcast.onMessage(CHANNEL_ROLL, ({ data }) => {
    const m = data as RollMessage;
    const crit = m.crit === "success" ? " — КРИТ!" : m.crit === "fail" ? " — провал!" : "";
    OBR.notification.show(`${m.who ?? m.player}: ${m.label} → ${m.total}${crit}`, m.crit === "fail" ? "WARNING" : "INFO");
  });

  // Лист персонажа доступен для любого токена (слои персонажей и маунтов)
  OBR.contextMenu.create({
    id: `${ID}/open-sheet`,
    icons: [
      {
        icon: asset("icon.svg"),
        label: "Лист персонажа",
        filter: {
          max: 1,
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
          ],
        },
      },
    ],
    onClick: (ctx) =>
      OBR.popover.open({
        id: `${ID}/sheet`,
        url: asset(`sheet.html?item=${encodeURIComponent(ctx.items[0].id)}`),
        width: 620,
        height: 760,
      }),
  });
});
