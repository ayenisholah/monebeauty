import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await destroySession();
  redirect(`/${locale}/admin/kirjaudu`);
}

