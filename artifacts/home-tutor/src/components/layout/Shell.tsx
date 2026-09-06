import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useActiveStudent } from "@/hooks/use-active-student";
import { BookOpen, Brain, LayoutDashboard, Library, Settings, CalendarSync, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/study", label: "Study", icon: Brain },
  { href: "/progress", label: "Progress", icon: BookOpen },
  { href: "/materials", label: "Materials", icon: Library },
  { href: "/revision", label: "Revision", icon: CalendarSync },
  { href: "/syllabus", label: "Syllabus", icon: FileText },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { student, isLoading } = useActiveStudent();
  const [role, setRole] = useState<"parent" | "student" | null>(null);
  useEffect(() => { fetch("/api/auth/me").then((response) => response.ok ? response.json() : null).then((data) => setRole(data?.user?.role ?? null)); }, []);
  const visibleNavItems = role === "student" ? navItems.filter((item) => !["/materials", "/syllabus"].includes(item.href)) : navItems;
  if (role === "student" && ["/materials", "/syllabus", "/settings"].includes(location)) {
    return <main className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold text-primary">This page is for parents</h1><Link href="/user-portal" className="mt-4 inline-block text-primary underline">Return to your learning portal</Link></div></main>;
  }

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-col hidden md:flex z-10 shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold font-serif shadow-inner">
            H
          </div>
          <span className="font-bold text-xl tracking-tight text-primary">Home Tutor</span>
        </div>
        
        <div className="p-4 flex-1 flex flex-col gap-4">
          <div className="px-3 py-3 bg-muted/50 rounded-xl flex items-center gap-3 shadow-inner">
            {isLoading ? (
               <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            ) : (
               <>
                 <Avatar className="ring-2 ring-background shadow-sm">
                   <AvatarImage src={student?.avatar} />
                   <AvatarFallback className="bg-secondary text-secondary-foreground">{student?.name?.[0] || '?'}</AvatarFallback>
                 </Avatar>
                 <div className="flex flex-col">
                   <span className="text-sm font-semibold leading-none">{student?.name || "No Student"}</span>
                   <span className="text-xs text-muted-foreground mt-1 font-medium">{student ? student.grade : "Setup profile"}</span>
                 </div>
               </>
            )}
          </div>

          <nav className="flex flex-col gap-1.5 mt-2">
            {visibleNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium relative overflow-hidden group",
                  isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}>
                  {isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-md" />}
                  <item.icon className={cn("w-4 h-4 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {role !== "student" && <div className="p-4 border-t border-border">
          <Link href="/settings" className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium",
            location === "/settings" ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}>
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>}
      </aside>
      
      <main className="flex-1 flex flex-col overflow-hidden relative bg-background/50">
        <div className="flex-1 overflow-auto p-4 pb-24 md:p-8">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(31,42,68,0.08)] backdrop-blur md:hidden">
         {[...visibleNavItems, ...(role === "student" ? [] : [{ href: "/settings", label: "Settings", icon: Settings }])].map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-16 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
