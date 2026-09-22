import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeEmailToken } from "@/lib/email-tokens";
import { appUrl } from "@/lib/url";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const destination = new URL("/verify-email", appUrl());

  const userId = await consumeEmailToken(token, "VERIFY_EMAIL");
  if (!userId) {
    destination.searchParams.set("status", "invalid");
    return NextResponse.redirect(destination);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  destination.searchParams.set("status", "success");
  return NextResponse.redirect(destination);
}
