import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";
import { Loader } from "./components/Loader";
import { Navbar } from "./components/Navbar";
import { AmbientBackground } from "./components/MotionKit";
import { LanguageProvider } from "./i18n";
import { defaultLangTarget, readStoredLang } from "./lang-preference";
import { HomeBilingual } from "./pages/HomeBilingual";
import { Page } from "./pages/Page";
import { Resources } from "./pages/Resources";
import { Contact } from "./pages/Contact";
import { Legal } from "./pages/Legal";

const ToolsIndex = lazy(() => import("@/features/toolbox/ToolsIndex"));
const ToolRouter = lazy(() => import("@/features/toolbox/ToolRouter"));
const SharePage = lazy(() => import("@/features/toolbox/SharePage"));
const AssistantPage = lazy(() => import("@/features/assistant"));
const BiolabPage = lazy(() => import("@/features/biolab"));
const CapabilitiesPage = lazy(() => import("@/features/capabilities"));
const PerformanceLabPage = lazy(() => import("@/features/lab/performance"));
const ArchitectPage = lazy(() => import("@/features/architect"));
const AssistantWidget = lazy(() => import("@/features/assistant/AssistantWidget").then((module) => ({ default: module.AssistantWidget })));
const ShellRoot = lazy(() => import("@/features/shell/ShellRoot").then((module) => ({ default: module.ShellRoot })));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: "auto" }), [pathname]);
  return null;
}
function Site() {
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28 });
  return (
    <LanguageProvider>
      <ScrollTop />
      <AmbientBackground />
      <motion.div
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-[var(--bright)]"
      />
      <Navbar />
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={location}>
            <Route index element={<HomeBilingual />} />
            <Route path="services" element={<Page kind="services" />} />
            <Route path="products" element={<Page kind="products" />} />
            <Route
              path="products/pentestor"
              element={<Page kind="pentestor" />}
            />
            <Route path="products/crm" element={<Page kind="crm" />} />
            <Route path="projects" element={<Page kind="projects" />} />
            <Route path="resources" element={<Resources />} />
            <Route
              path="library"
              element={<Navigate to="../resources" replace />}
            />
            <Route path="academy" element={<Page kind="academy" />} />
            <Route path="about" element={<Page kind="about" />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Legal kind="privacy" />} />
            <Route path="terms" element={<Legal kind="terms" />} />
            <Route path="security" element={<Legal kind="security" />} />
            <Route
              path="tools"
              element={
                <Suspense fallback={<div className="min-h-[60vh]" />}>
                  <ToolsIndex />
                </Suspense>
              }
            />
            <Route
              path="tools/:slug"
              element={
                <Suspense fallback={<div className="min-h-[60vh]" />}>
                  <ToolRouter />
                </Suspense>
              }
            />
            <Route
              path="assistant"
              element={
                <Suspense fallback={<div className="min-h-[60vh]" />}>
                  <AssistantPage />
                </Suspense>
              }
            />
            <Route
              path="capabilities"
              element={
                <Suspense fallback={<div className="min-h-[60vh]" />}>
                  <CapabilitiesPage />
                </Suspense>
              }
            />
            <Route
              path="lab/performance"
              element={
                <Suspense fallback={<div className="min-h-[60vh]" />}>
                  <PerformanceLabPage />
                </Suspense>
              }
            />
            <Route
              path="architect"
              element={
                <Suspense fallback={<div className="min-h-[60vh]" />}>
                  <ArchitectPage />
                </Suspense>
              }
            />
            <Route
              path="biolab"
              element={
                <Suspense fallback={<div className="min-h-[60vh]" />}>
                  <BiolabPage />
                </Suspense>
              }
            />
            <Route
              path="share/:id"
              element={
                <Suspense fallback={<div className="min-h-[60vh]" />}>
                  <SharePage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <Suspense fallback={null}>
        <ShellRoot />
        <AssistantWidget />
      </Suspense>
    </LanguageProvider>
  );
}
export default function App() {
  const [loading, setLoading] = useState(true);
  return (
    <BrowserRouter>
      <AnimatePresence>
        {loading && <Loader onComplete={() => setLoading(false)} />}
      </AnimatePresence>
      {!loading && (
        <Routes>
          <Route path="/" element={<Navigate to={`/${defaultLangTarget(readStoredLang())}`} replace />} />
          <Route path="/:lang/*" element={<Site />} />
          <Route path="*" element={<Navigate to={`/${defaultLangTarget(readStoredLang())}`} replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
