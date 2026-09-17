import { requireSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TRPCProvider } from "@/components/providers/trpc-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <TRPCProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={session.name} role={session.role} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/20 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </TRPCProvider>
  );
}
