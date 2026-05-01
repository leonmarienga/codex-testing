export type TagScoreRow = {
  tagKey: string;
  score: number;
};

export type ProductCandidate = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  tagKey: string;
  tagWeight: number;
};

export type RankedProduct = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  score: number;
  reasons: string[];
};

export function aggregateTagScores(rows: TagScoreRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.tagKey, (map.get(row.tagKey) ?? 0) + row.score);

  return [...map.entries()]
    .map(([tagKey, score]) => ({ tagKey, score }))
    .sort((a, b) => b.score - a.score);
}

export function rankProducts(
  tagScores: { tagKey: string; score: number }[],
  candidates: ProductCandidate[]
): RankedProduct[] {
  const scoreMap = new Map(tagScores.map((t) => [t.tagKey, t.score]));
  const byProduct = new Map<string, RankedProduct>();

  for (const c of candidates) {
    const tagScore = scoreMap.get(c.tagKey) ?? 0;
    if (tagScore <= 0) continue;

    const contribution = tagScore * c.tagWeight;
    const existing = byProduct.get(c.productId);

    if (!existing) {
      byProduct.set(c.productId, {
        productId: c.productId,
        slug: c.slug,
        name: c.name,
        priceCents: c.priceCents,
        score: contribution,
        reasons: [c.tagKey],
      });
    } else {
      existing.score += contribution;
      if (!existing.reasons.includes(c.tagKey)) existing.reasons.push(c.tagKey);
    }
  }

  return [...byProduct.values()].sort((a, b) => b.score - a.score);
}

export function pickRecommendations(ranked: RankedProduct[]) {
  if (!ranked.length) return { primary: null, addons: [] as RankedProduct[] };

  return {
    primary: ranked[0],
    addons: ranked.slice(1, 3),
  };
}
