import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch, Redirect,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { Shell } from "@/components/layout/Shell";
import Dashboard from "@/pages/dashboard";
import Study from "@/pages/study";
import Progress from "@/pages/progress";
import Materials from "@/pages/materials";
import Revision from "@/pages/revision";
import Syllabus from "@/pages/syllabus";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkAppearance = {
  theme: shadcn, cssLayerName: "clerk",
  options: { logoPlacement: "inside" as const, logoLinkUrl: basePath || "/", logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: { colorPrimary: "#167D77", colorForeground: "#19313a", colorMutedForeground: "#5c6b70", colorBackground: "#ffffff", colorInput: "#f8faf9", colorInputForeground: "#19313a", colorDanger: "#b42318", colorNeutral: "#d7e1df", fontFamily: "Inter, sans-serif", borderRadius: "0.75rem" },
  elements: { rootBox: "w-full flex justify-center", cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl", card: "!shadow-none !border-0 !bg-transparent !rounded-none", footer: "!shadow-none !border-0 !bg-transparent !rounded-none", headerTitle: "text-primary", headerSubtitle: "text-slate-600", socialButtonsBlockButtonText: "text-slate-800", formFieldLabel: "text-slate-800", footerActionLink: "text-primary", footerActionText: "text-slate-600", dividerText: "text-slate-500", identityPreviewEditButton: "text-primary", formFieldSuccessText: "text-emerald-700", alertText: "text-slate-800", logoBox: "mb-4", logoImage: "h-12 w-12", socialButtonsBlockButton: "border-slate-200", formButtonPrimary: "bg-primary hover:bg-primary/90", formFieldInput: "border-slate-200", footerAction: "border-t border-slate-100", dividerLine: "bg-slate-200", alert: "bg-slate-50", otpCodeFieldInput: "border-slate-200", formFieldRow: "", main: "" },
};
import Landing from "@/pages/landing";

function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path; }
function HomeRedirect() { return <><Show when="signed-in"><Redirect to="/user-portal" /></Show><Show when="signed-out"><Landing /></Show></>; }
function SignInPage() { return <div className="min-h-screen flex items-center justify-center p-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>; }
function SignUpPage() { return <div className="min-h-screen flex items-center justify-center p-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>; }

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/user-portal" component={Dashboard} />
          <Route path="/study" component={Study} />
          <Route path="/progress" component={Progress} />
          <Route path="/materials" component={Materials} />
          <Route path="/revision" component={Revision} />
          <Route path="/syllabus" component={Syllabus} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}
function OnboardingGate() {
  const { isLoaded } = useUser();
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState("");
  useEffect(() => { if (isLoaded) fetch("/api/auth/me").then((r) => r.ok ? r.json() : Promise.reject()).then((data) => setRole(data.user?.role ?? "")).catch(() => setError("We could not load your account. Please refresh and try again.")); }, [isLoaded]);
  useEffect(() => { if (role === "student") fetch("/api/students").then((r) => r.ok ? r.json() : []).then((students) => { if (students.length) setRole("student-ready"); }); }, [role]);
  if (!isLoaded || role === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading your account</div>;
  if (role === "parent" || role === "student-ready") return <Router />;
  if (role === "student") return <div className="min-h-screen grid place-items-center p-6 bg-background"><div className="w-full max-w-md text-center"><img src={`${basePath}/logo.svg`} className="h-14 mx-auto mb-5" /><h1 className="text-3xl font-serif font-bold text-primary">Link your learner profile</h1><p className="mt-3 text-muted-foreground">Ask your parent for the one-time code from their Home Tutor settings.</p><input value={linkCode} onChange={(event) => setLinkCode(event.target.value)} className="mt-6 w-full rounded-lg border border-border p-3" placeholder="Enter link code" /><button onClick={async () => { const response = await fetch("/api/students/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: linkCode.trim() }) }); if (response.ok) setRole("student-ready"); else setError("That code is invalid, expired, or already used."); }} disabled={!linkCode.trim()} className="mt-3 w-full rounded-lg bg-primary p-3 text-primary-foreground disabled:opacity-50">Link profile</button>{error && <p className="mt-4 text-sm text-destructive">{error}</p>}</div></div>;
  const choose = async (selected: "parent" | "student") => {
    setError(null);
    const response = await fetch("/api/auth/onboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: selected }) });
    if (!response.ok) { setError("Your role could not be saved. Please try again."); return; }
    setRole(selected);
  };
  return <div className="min-h-screen grid place-items-center p-6 bg-background"><div className="max-w-xl text-center"><img src={`${basePath}/logo.svg`} className="h-14 mx-auto mb-5" /><h1 className="text-3xl font-serif font-bold text-primary">Choose your Home Tutor role</h1><p className="mt-3 text-muted-foreground">Parents manage learner profiles. Students link to a profile with a one-time code from their parent.</p><div className="mt-7 grid sm:grid-cols-2 gap-4"><button onClick={() => choose("parent")} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary"><strong className="block text-primary">I am a parent</strong><span className="text-sm text-muted-foreground">Create profiles and review progress.</span></button><button onClick={() => choose("student")} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary"><strong className="block text-primary">I am a student</strong><span className="text-sm text-muted-foreground">Link your profile and start studying.</span></button></div>{error && <p className="mt-4 text-sm text-destructive">{error}</p>}</div></div>;
}
function ProtectedRouter() { return <><Show when="signed-in"><OnboardingGate /></Show><Show when="signed-out"><Redirect to="/" /></Show></>; }

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const ClerkCacheInvalidator = () => {
    const { addListener } = useClerk(); const previous = useRef<string | null | undefined>(undefined);
    useEffect(() => addListener(({ user }) => { if (previous.current !== undefined && previous.current !== (user?.id ?? null)) queryClient.clear(); previous.current = user?.id ?? null; }), [addListener]);
    return null;
  };
  return (
    <WouterRouter base={basePath}>
      <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}>
        <QueryClientProvider client={queryClient}><ClerkCacheInvalidator /><TooltipProvider><Switch><Route path="/" component={HomeRedirect} /><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route component={ProtectedRouter} /></Switch><Toaster /></TooltipProvider></QueryClientProvider>
      </ClerkProvider>
    </WouterRouter>
  );
}

export default App;
