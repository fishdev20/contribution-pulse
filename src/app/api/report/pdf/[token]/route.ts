import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { APP_NAME, APP_SLUG } from "@/config/branding";
import { prisma } from "@/server/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const share = await prisma.publicShare.findUnique({ where: { token } });
  if (!share || share.revokedAt || (share.expiresAt && share.expiresAt < new Date())) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const activities = await prisma.dailyActivity.findMany({
    where: {
      userId: share.userId,
      date: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90) },
    },
  });

  const totals = activities.reduce(
    (acc, row) => {
      acc.commits += row.commitCount;
      acc.merges += row.mergeCount;
      acc.prs += row.prCount;
      acc.pipelines += row.pipelineCount;
      return acc;
    },
    { commits: 0, merges: 0, prs: 0, pipelines: 0 },
  );

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 790;
  const line = (text: string) => {
    page.drawText(text, { x: 50, y, size: 12, font });
    y -= 22;
  };

  line(`${APP_NAME} - Contribution Verification Report`);
  line(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  line("Verification stamp: Data pulled via official APIs; only aggregate counts stored.");
  y -= 16;
  line(`Commits: ${totals.commits}`);
  line(`Merge requests: ${totals.merges}`);
  line(`Pull requests: ${totals.prs}`);
  line(`Pipelines: ${totals.pipelines}`);

  const bytes = await pdf.save();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${APP_SLUG}-${token.slice(0, 8)}.pdf`,
    },
  });
}
