import { useEffect, useState } from "react";
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
import { HomeBilingual } from "./pages/HomeBilingual";
import { Page } from "./pages/Page";
import { Resources } from "./pages/Resources";
import { Contact } from "./pages/Contact";

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
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
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
          <Route path="/" element={<Navigate to="/en" replace />} />
          <Route path="/:lang/*" element={<Site />} />
          <Route path="*" element={<Navigate to="/en" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
