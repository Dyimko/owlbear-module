// Единый префикс для всех ключей метаданных и каналов — так данные не пересекутся с другими расширениями
export const ID = "com.my-system";

export const META_CHARACTER = `${ID}/character`;
export const CHANNEL_ROLL = `${ID}/roll`;

/** Полный URL файла рядом с manifest.json (работает на любом хостинге) */
export const asset = (path: string) => new URL(path, window.location.href).href;

/** Открыть лист персонажа токена в отдельном окне */
export async function openSheet(OBR: typeof import("@owlbear-rodeo/sdk").default, itemId: string) {
  await OBR.popover.open({
    id: `${ID}/sheet`,
    url: asset(`sheet.html?item=${encodeURIComponent(itemId)}`),
    width: 620,
    height: 760,
  });
}
