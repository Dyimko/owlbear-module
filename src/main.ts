// Popover (кнопка расширения слева вверху): список токенов на сцене — клик открывает лист персонажа
import OBR from "@owlbear-rodeo/sdk";
import { META_CHARACTER, openSheet } from "./constants";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>Листы персонажей</h1>
  <div id="tokens" class="tokens"><p class="hint">Загрузка сцены…</p></div>
  <p class="hint">Правый клик по токену → «Статы» — быстрые хиты, КУ и КД. «Лист персонажа» — полный лист.</p>
`;

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

async function renderTokens() {
  const box = document.querySelector<HTMLDivElement>("#tokens")!;
  if (!(await OBR.scene.isReady())) return void (box.innerHTML = `<p class="hint">Откройте сцену, чтобы увидеть токены.</p>`);
  const items = await OBR.scene.items.getItems(
    (i) => i.type === "IMAGE" && (i.layer === "CHARACTER" || i.layer === "MOUNT"),
  );
  if (!items.length) return void (box.innerHTML = `<p class="hint">На сцене нет токенов персонажей.</p>`);
  items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  box.innerHTML = items
    .map((i) => {
      const c = i.metadata[META_CHARACTER] as { name?: string; level?: number; cls?: string; hp?: { cur: number; max: number } } | undefined;
      const title = esc(c?.name || i.name || "Без имени");
      const sub = c ? esc([c.cls, c.level ? `${c.level} ур.` : "", c.hp ? `${c.hp.cur}/${c.hp.max} хп` : ""].filter(Boolean).join(" · ")) : "лист не заполнен";
      return `<button class="token" data-id="${i.id}"><b>${title}</b><small>${sub}</small></button>`;
    })
    .join("");
}

OBR.onReady(() => {
  renderTokens();
  OBR.scene.onReadyChange(() => renderTokens());
  OBR.scene.items.onChange(() => renderTokens());
  document.querySelector("#tokens")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-id]");
    if (b) openSheet(OBR, b.dataset.id!);
  });
});
