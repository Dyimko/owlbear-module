// Единый префикс для всех ключей метаданных и каналов — так данные не пересекутся с другими расширениями
export const ID = "com.my-system";

export const META_CHARACTER = `${ID}/character`;
export const CHANNEL_ROLL = `${ID}/roll`;

/** Полный URL файла рядом с manifest.json (работает и на localhost, и на хостинге) */
export const asset = (path: string) => new URL(path, window.location.href).href;
