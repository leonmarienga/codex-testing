import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emailCapture, answers } = body as {
      emailCapture?: string;
      answers: { questionKey: string; optionValue: string }[];
    };

    if (!answers?.length) {
      return NextResponse.json({ error: "No answers provided" }, { status: 400 });
    }

    const session = await prisma.quizSession.create({
      data: {
        emailCapture: emailCapture ?? null,
        answers: {
          createMany: {
            data: answers.map((a) => ({ questionKey: a.questionKey, optionValue: a.optionValue })),
          },
        },
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch {
    return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
  }
}
