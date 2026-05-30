import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";
import { ChartSkeleton } from "@/components/common/StateBlocks";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:block">
          <div className="sticky top-14">
            <Sidebar />
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="presentation">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              className={cn(
                "absolute left-0 top-0 h-full w-60 border-r border-border bg-card shadow-lg",
              )}
            >
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Suspense fallback={<ChartSkeleton height={420} />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
