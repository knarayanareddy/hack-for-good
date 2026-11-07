/**
 * Staff regional grid: counts of radar risks and questions per region x theme. Counts only: no expert or answer data.
 * Port of benchmark core/grid.js.
 *
 * A card (question) takes its own region/theme, falling back to its risk's (via riskId). A cell with fewer than
 * MIN_CELL risks is descriptive only: it is marked, never hidden. Pure: no storage, no clock.
 */

export const MIN_CELL = 10;
const LIVE = new Set(["open", "closed"]);

export type GridRisk = { id: string; region: string | null; theme: string | null };
export type GridCard = { region?: string | null; theme?: string | null; riskId?: string | null; status?: string };
export type GridCell = { region: string; theme: string; risks: number; cards: number; live: number; open: number; small: boolean };

export function buildGrid(risks: GridRisk[], cards: GridCard[], regions: string[], themes: string[]) {
  const riskById = new Map(risks.map((r) => [r.id, r]));
  const key = (region: string, theme: string) => `${region}\u0000${theme}`;
  const counts = new Map<string, { risks: number; cards: number; live: number; open: number }>();
  for (const region of regions) for (const theme of themes) counts.set(key(region, theme), { risks: 0, cards: 0, live: 0, open: 0 });
  const unplaced = { risks: 0, cards: 0 };

  for (const risk of risks) {
    const cell = risk.region && risk.theme ? counts.get(key(risk.region, risk.theme)) : undefined;
    if (cell) cell.risks += 1;
    else unplaced.risks += 1;
  }
  for (const card of cards) {
    if (card.status === "retired") continue;
    const risk = card.riskId ? riskById.get(card.riskId) : undefined;
    const region = card.region || risk?.region || null;
    const theme = card.theme || risk?.theme || null;
    const cell = region && theme ? counts.get(key(region, theme)) : undefined;
    if (!cell) {
      unplaced.cards += 1;
      continue;
    }
    cell.cards += 1;
    if (LIVE.has(card.status ?? "")) cell.live += 1;
    if (card.status === "open") cell.open += 1;
  }

  const cells: GridCell[] = [];
  for (const region of regions) {
    for (const theme of themes) {
      const c = counts.get(key(region, theme))!;
      cells.push({ region, theme, ...c, small: c.risks < MIN_CELL });
    }
  }
  return { regions, themes, cells, minCell: MIN_CELL, unplaced };
}
