import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aggregateTagScores, rankProducts, pickRecommendations } from "@/lib/quiz-engine";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Quiz session not found" }, { status: 404 });
    }

    const optionPairs = session.answers.map((a) => ({ questionKey: a.questionKey, optionValue: a.optionValue }));

    const options = await prisma.quizOption.findMany({
      where: {
        OR: optionPairs.map((p) => ({ question: { key: p.questionKey }, value: p.optionValue })),
      },
      include: { scores: { include: { tag: true } } },
    });

    const tagScoreRows = options.flatMap((o) => o.scores.map((s) => ({ tagKey: s.tag.key, score: s.score })));
    const aggregated = aggregateTagScores(tagScoreRows);

    const candidates = await prisma.product.findMany({ where: { isActive: true }, include: { tags: { include: { tag: true } } } });
    const flattened = candidates.flatMap((p) =>
      p.tags.map((pt) => ({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        tagKey: pt.tag.key,
        tagWeight: pt.weight,
      }))
    );

    const ranked = rankProducts(aggregated, flattened);
    const result = pickRecommendations(ranked);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to compute recommendations" }, { status: 500 });
  }
}
