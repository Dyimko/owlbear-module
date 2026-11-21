// Геометрия статов на токене — без зависимостей от SDK (рисуется и в превью)
// ---------- Геометрия (чистые функции — их же рисует превью в тестах) ----------
type Cmd = number[];
export interface Spec {
  kind: "path" | "circle" | "text";
  x: number; y: number; w: number; h: number; z: number;
  commands?: Cmd[]; fill?: string; fillOpacity?: number; stroke?: string; strokeOpacity?: number; strokeWidth?: number;
  text?: string; fontSize?: number; textColor?: string;
}
const M = 0, L = 1, Q = 2, Z = 5;
/** Прямоугольник со скруглёнными углами (контур от 0,0) */
function pill(w: number, h: number, r = Math.min(h / 2, w / 2)): Cmd[] {
  return [[M, r, 0], [L, w - r, 0], [Q, w, 0, w, r], [L, w, h - r], [Q, w, h, w - r, h], [L, r, h], [Q, 0, h, 0, h - r], [L, 0, r], [Q, 0, 0, r, 0], [Z]];
}
/** Геральдический щит w×h */
function shield(w: number, h: number): Cmd[] {
  return [[M, 0, 0], [Q, w / 2, h * 0.12, w, 0], [L, w, h * 0.45], [Q, w, h * 0.82, w / 2, h], [Q, 0, h * 0.82, 0, h * 0.45], [Z]];
}

export interface OverlayStats { cur: number; max: number; temp: number; ec: number; ac: number; init: number }
export function overlaySpecs(bounds: { minX: number; maxX: number; maxY: number; cx: number; size: number }, st: OverlayStats, dim: boolean): Spec[] {
  const { size } = bounds;
  const o = dim ? 0.45 : 1;
  const out: Spec[] = [];
  const outline = "#14121c";
  const sw = size * 0.018;
  const label = (x: number, y: number, w: number, h: number, text: string, fs: number, z: number) =>
    out.push({ kind: "text", x, y, w, h, z, text, fontSize: fs, textColor: "#ffffff", stroke: outline, strokeOpacity: 0.85 * o, strokeWidth: size * 0.012, fillOpacity: o });

  // Полоса хитов: тёмная подложка + цветная заливка, скруглённые края
  const barW = size * 0.84, barH = size * 0.15;
  const barX = bounds.cx - barW / 2, barY = bounds.maxY - barH * 0.7;
  out.push({ kind: "path", x: barX, y: barY, w: barW, h: barH, z: 1, commands: pill(barW, barH), fill: "#1d1b26", fillOpacity: 0.88 * o, stroke: outline, strokeOpacity: 0.9 * o, strokeWidth: sw });
  const pct = st.max > 0 ? Math.max(0, Math.min(1, st.cur / st.max)) : 0;
  if (pct > 0) {
    const fw = Math.max(barH, barW * pct);
    const color = pct > 0.5 ? "#d94a3f" : pct > 0.25 ? "#b8322b" : "#861719";
    out.push({ kind: "path", x: barX, y: barY, w: fw, h: barH, z: 2, commands: pill(fw, barH), fill: color, fillOpacity: 0.95 * o, strokeWidth: 0 });
  }
  if (st.temp > 0) {
    // временные хиты — голубая полоска под баром
    const tw = Math.max(barH * 0.3, barW * Math.min(1, st.temp / Math.max(1, st.max)));
    out.push({ kind: "path", x: barX + barW * 0.04, y: barY + barH * 0.92, w: tw * 0.92, h: barH * 0.28, z: 0, commands: pill(tw * 0.92, barH * 0.28), fill: "#5ec8e8", fillOpacity: 0.95 * o, stroke: outline, strokeOpacity: 0.8 * o, strokeWidth: sw * 0.6 });
  }
  label(barX, barY, barW, barH, `${st.cur} / ${st.max}${st.temp ? `  +${st.temp}` : ""}`, barH * 0.72, 3);

  // Значки над полосой: инициатива слева, КУ (круг) и КД (щит) справа
  const d = size * 0.25;
  const cy = barY - d * 0.42;
  const circle = (cx: number, fill: string, text: string, z: number) => {
    out.push({ kind: "circle", x: cx, y: cy, w: d, h: d, z, fill, fillOpacity: 0.96 * o, stroke: outline, strokeOpacity: 0.9 * o, strokeWidth: sw });
    label(cx - d / 2, cy - d / 2, d, d, text, d * (text.length > 2 ? 0.4 : 0.5), z + 1);
  };
  circle(bounds.minX + d * 0.55, "#d9822b", (st.init >= 0 ? "+" : "") + st.init, 10);
  circle(bounds.maxX - d * 1.55, "#4a9a4a", String(st.ec), 12);
  const shW = d * 0.95, shH = d * 1.1, shX = bounds.maxX - d * 0.55 - shW / 2, shY = cy - shH / 2;
  out.push({ kind: "path", x: shX, y: shY, w: shW, h: shH, z: 14, commands: shield(shW, shH), fill: "#3f78d1", fillOpacity: 0.96 * o, stroke: outline, strokeOpacity: 0.9 * o, strokeWidth: sw });
  label(shX, shY - shH * 0.06, shW, shH, String(st.ac), d * (String(st.ac).length > 2 ? 0.4 : 0.5), 15);
  return out;
}

