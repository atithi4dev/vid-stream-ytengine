import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import ChatPanel from "../components/ChatPanel";

export default function MainLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainRef = useRef(null);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isChatOpen = searchParams.get("chat") === "open";
  const isHomeRoute = location.pathname === "/";
  const pullThreshold = 72;

  const openChat = () => {
    const next = new URLSearchParams(searchParams);
    next.set("chat", "open");
    setSearchParams(next, { replace: true });
  };

  const closeChat = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("chat");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const isCtrlM = (event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === "m";
      if (!isCtrlM) return;

      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingField = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      if (isTypingField) return;

      event.preventDefault();
      openChat();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: 0, behavior: "auto" });
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    });

    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  const isMobileViewport = () => window.innerWidth < 1024;

  const handleTouchStart = (event) => {
    if (!isMobileViewport() || isRefreshing) return;
    const scrollTop = mainRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      isPullingRef.current = false;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY || 0;
    isPullingRef.current = true;
  };

  const handleTouchMove = (event) => {
    if (!isPullingRef.current || isRefreshing) return;

    const scrollTop = mainRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = event.touches[0]?.clientY || 0;
    const delta = currentY - touchStartYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    const dampedPull = Math.min(110, delta * 0.45);
    setPullDistance(dampedPull);

    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current || isRefreshing) return;
    isPullingRef.current = false;

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(56);

      let settled = false;
      const finishRefresh = () => {
        if (settled) return;
        settled = true;
        setIsRefreshing(false);
        setPullDistance(0);
      };

      window.dispatchEvent(
        new CustomEvent("app:pull-refresh", {
          detail: {
            path: location.pathname,
            complete: finishRefresh,
          },
        })
      );

      window.setTimeout(finishRefresh, 1400);
      return;
    }

    setPullDistance(0);
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          ref={mainRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-24 sm:px-4 lg:px-8 lg:pb-6"
        >
          <div
            className={`pointer-events-none sticky top-0 z-20 -mt-1 mb-2 flex justify-center transition-opacity duration-150 lg:hidden ${(pullDistance > 0 || isRefreshing) ? "opacity-100" : "opacity-0"}`}
            style={{ height: `${pullDistance}px` }}
          >
            <div className="h-8 rounded-full border border-slate-300 bg-white/95 px-3 text-xs font-medium text-slate-600 shadow dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 flex items-center">
              {isRefreshing ? "Refreshing..." : pullDistance >= pullThreshold ? "Release to refresh" : "Pull to refresh"}
            </div>
          </div>
          <Outlet />
        </main>
      </div>

      {isChatOpen && !isHomeRoute && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px] lg:hidden" onClick={closeChat} />

          <aside className="fixed right-0 top-16 bottom-16 z-40 w-full max-w-[560px] border-l border-slate-200 bg-white/95 p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-950/95 lg:bottom-0 lg:w-[520px]">
            <ChatPanel className="h-full min-h-0" onClose={closeChat} />
          </aside>
        </>
      )}
    </div>
  );
}
