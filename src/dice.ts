import OBR from "@owlbear-rodeo/sdk";
import { CHANNEL_ROLL } from "./constants";
import type { RollMessage } from "./types";

export type RollMode = "normal" | "adv" | "dis";

export const rollDie = (sides: number) => 1 + Math.floor(Math.random() * sides);

async function share(msg: Omit<RollMessage, "player" | "color">) {
  const full: RollMessage = { player: await OBR.player.getName(), color: await OBR.player.getColor(), ...msg };
  await OBR.broadcast.sendMessage(CHANNEL_ROLL, full, { destination: "ALL" });
  return full;
}

const sign = (n: number) => (n >= 0 ? `+ ${n}` : `− ${-n}`);

/** Проверка/спасбросок/атака: d20 + бонус, с преимуществом или помехой */
export async function rollD20(bonus: number, label: string, mode: RollMode = "normal", who?: string) {
  const rolls = mode === "normal" ? [rollDie(20)] : [rollDie(20), rollDie(20)];
  const kept = mode === "adv" ? Math.max(...rolls) : mode === "dis" ? Math.min(...rolls) : rolls[0];
  const tag = mode === "adv" ? " (преим.)" : mode === "dis" ? " (помеха)" : "";
  return share({
    who,
    label: label + tag,
    detail: `[${rolls.join(", ")}] → ${kept} ${sign(bonus)}`,
    total: kept + bonus,
    crit: kept === 20 ? "success" : kept === 1 ? "fail" : undefined,
  });
}

/** Разбор формулы вида "2d6+1d4+3" или "1d8-1". Возвращает null, если формула некорректна. */
export function evalFormula(formula: string, critDouble = false) {
  const clean = formula.replace(/\s+/g, "").toLowerCase().replace(/к/g, "d");
  if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(clean)) return null;
  let total = 0;
  const parts: string[] = [];
  for (const [, op, term] of clean.matchAll(/([+-]?)(\d*d\d+|\d+)/g)) {
    const s = op === "-" ? -1 : 1;
    if (term.includes("d")) {
      const [n, d] = term.split("d");
      const count = (Number(n) || 1) * (critDouble ? 2 : 1);
      const rs = Array.from({ length: count }, () => rollDie(Number(d)));
      total += s * rs.reduce((a, b) => a + b, 0);
      parts.push(`${s < 0 ? "−" : ""}${count}d${d}[${rs.join(", ")}]`);
    } else {
      total += s * Number(term);
      parts.push(`${s < 0 ? "−" : ""}${term}`);
    }
  }
  return { total, detail: parts.join(" + ").replace(/\+ −/g, "− ") };
}

export async function rollFormula(formula: string, label: string, who?: string, crit = false) {
  const r = evalFormula(formula, crit);
  if (!r) {
    OBR.notification.show(`Неверная формула: ${formula}`, "ERROR");
    return null;
  }
  return share({ who, label: label + (crit ? " (крит)" : ""), detail: r.detail, total: r.total });
}
