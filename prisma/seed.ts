import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tags = [
    { key: "sleep_support", label: "Sleep Support" },
    { key: "daily_energy", label: "Daily Energy" },
    { key: "recovery_support", label: "Recovery Support" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({ where: { key: tag.key }, update: {}, create: tag });
  }

  const products = [
    { slug: "calm-pm", name: "Calm PM", tagKey: "sleep_support", priceCents: 3499 },
    { slug: "daily-lift", name: "Daily Lift", tagKey: "daily_energy", priceCents: 2999 },
    { slug: "recover-plus", name: "Recover Plus", tagKey: "recovery_support", priceCents: 3999 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        description: `${p.name} daily support formula`,
        priceCents: p.priceCents,
      },
    });
    const tag = await prisma.tag.findUniqueOrThrow({ where: { key: p.tagKey } });
    await prisma.productTag.upsert({
      where: { productId_tagId: { productId: product.id, tagId: tag.id } },
      update: { weight: 3 },
      create: { productId: product.id, tagId: tag.id, weight: 3 },
    });
  }

  const question = await prisma.quizQuestion.upsert({
    where: { key: "goal" },
    update: {},
    create: { key: "goal", prompt: "What is your primary goal?", type: "single_choice", sortOrder: 1 },
  });

  const options = [
    { value: "sleep", label: "Sleep support", tagKey: "sleep_support", score: 5 },
    { value: "energy", label: "Daily energy", tagKey: "daily_energy", score: 5 },
    { value: "recovery", label: "Recovery support", tagKey: "recovery_support", score: 5 },
  ];

  for (const o of options) {
    const option = await prisma.quizOption.upsert({
      where: { questionId_value: { questionId: question.id, value: o.value } },
      update: { label: o.label },
      create: { questionId: question.id, value: o.value, label: o.label, sortOrder: 1 },
    });
    const tag = await prisma.tag.findUniqueOrThrow({ where: { key: o.tagKey } });
    await prisma.quizOptionScore.upsert({
      where: { optionId_tagId: { optionId: option.id, tagId: tag.id } },
      update: { score: o.score },
      create: { optionId: option.id, tagId: tag.id, score: o.score },
    });
  }

  console.log("Seeded core quiz and product data");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
