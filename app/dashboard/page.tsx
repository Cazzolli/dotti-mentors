import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import ChannelCard from "@/components/ChannelCard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as any).role === "ADMIN") redirect("/admin");

  const userId = (session.user as any).id;

  const channels = await db.channel.findMany({
    where: { studentId: userId },
    include: { _count: { select: { videos: true, comments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="STUDENT" userName={session.user?.name ?? ""} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Meus Canais</h1>
              <p className="text-sm text-gray-500">
                {channels.length} {channels.length !== 1 ? "canais" : "canal"} cadastrado{channels.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/canais/novo"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Adicionar Canal
            </Link>
          </div>

          {channels.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <p className="text-lg mb-2">Nenhum canal ainda</p>
              <p className="text-sm mb-6">Adicione seu canal do YouTube para começar.</p>
              <Link
                href="/canais/novo"
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Adicionar Canal
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((ch: any) => (
                <ChannelCard key={ch.id} channel={ch} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
