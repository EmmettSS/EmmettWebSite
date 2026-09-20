import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { motion } from "motion/react";
import { Reveal } from "../components/MotionKit";
import { useI18n } from "../i18n";
import { Footer } from "../components/Footer";
const copy = {
  en: {
    eyebrow: "START A CONVERSATION",
    title: "Bring us the",
    accent: "hard problem.",
    intro:
      "Tell us what is stuck and what good could look like. We will respond with a point of view—not a generic sales sequence.",
    labels: [
      "Name",
      "Email",
      "Company",
      "Project type",
      "Budget range",
      "Message",
    ],
    place: [
      "Your name",
      "you@company.com",
      "Company name",
      "Select a project type",
      "Select a range",
      "What are you trying to change?",
    ],
    types: [
      "AI product",
      "Platform engineering",
      "Security system",
      "Product rescue",
    ],
    budgets: ["Under €10k", "€10k–€30k", "€30k–€75k", "€75k+"],
    send: "Send the signal",
    sending: "Sending…",
    success: "Signal received.",
    successCopy:
      "We will review the context and get back to you within 48 hours.",
    error: "Please complete the required fields with a valid email.",
  },
  fa: {
    eyebrow: "شروع همکاری با امت",
    title: "از چالش شما تا",
    accent: "یک راه‌حل واقعی.",
    intro:
      "کمی از مسئله، هدف و شرایط پروژه برایمان بنویسید. تیم امت درخواست شما را بررسی می‌کند و با یک نگاه اولیه و مسیر پیشنهادی برمی‌گردد.",
    labels: [
      "نام و نام خانوادگی",
      "ایمیل",
      "مجموعه",
      "نوع پروژه",
      "محدوده بودجه",
      "شرح مسئله",
    ],
    place: [
      "نام شما",
      "you@company.com",
      "نام مجموعه",
      "نوع پروژه را انتخاب کنید",
      "یک محدوده انتخاب کنید",
      "می‌خواهید چه چیزی را تغییر دهید؟",
    ],
    types: [
      "محصول هوشمند",
      "مهندسی پلتفرم",
      "سامانه امنیتی",
      "نجات و بازطراحی محصول",
    ],
    budgets: ["کمتر از €10k", "€10k تا €30k", "€30k تا €75k", "بیشتر از €75k"],
    send: "ارسال درخواست همکاری",
    sending: "در حال ارسال…",
    success: "درخواست شما به دست ما رسید.",
    successCopy:
      "زمینه پروژه را بررسی می‌کنیم و حداکثر تا 48 ساعت آینده پاسخ می‌دهیم.",
    error: "لطفاً فیلدهای ضروری و یک ایمیل معتبر وارد کنید.",
  },
};
export function Contact() {
  const { lang } = useI18n();
  const t = copy[lang];
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
      !String(f.get("name") || "").trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.get("email") || "")) ||
      !String(f.get("message") || "").trim()
    ) {
      setState("error");
      return;
    }
    setState("loading");
    setTimeout(() => setState("success"), 900);
  };
  return (
    <main className="relative min-h-screen bg-[var(--deep)]/92 pt-16 text-[var(--text)]">
      <section className="relative mx-auto max-w-[1280px] px-6 py-24 lg:px-12 lg:py-36">
        <div className="grid gap-16 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="eyebrow">
              <span />
              {t.eyebrow}
            </div>
            <h1 className="hero-title !text-[clamp(3.2rem,6vw,6rem)]">
              {t.title}
              <br />
              <em>{t.accent}</em>
            </h1>
            <p className="hero-copy">{t.intro}</p>
          </div>
          <Reveal>
            {state === "success" ? (
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="grid min-h-[540px] place-items-center rounded-3xl border border-[var(--line)] bg-[#0d281d]/90 p-10 text-center"
              >
                <div>
                  <CheckCircle2 className="mx-auto h-14 w-14 text-[var(--bright)]" />
                  <h2 className="mt-7 text-4xl">{t.success}</h2>
                  <p className="mt-4 max-w-md text-white/50">{t.successCopy}</p>
                </div>
              </motion.div>
            ) : (
              <form
                onSubmit={submit}
                noValidate
                className="rounded-3xl border border-[var(--line)] bg-[#0d281d]/90 p-6 shadow-2xl backdrop-blur-xl lg:p-9"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  {t.labels.slice(0, 5).map((l, i) => (
                    <label key={l} className={i === 4 ? "sm:col-span-2" : ""}>
                      <span className="mb-2 block text-sm text-white/55">
                        {l}
                      </span>
                      {i === 3 ? (
                        <select name="type" className="field">
                          <option value="">{t.place[i]}</option>
                          {t.types.map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      ) : i === 4 ? (
                        <select name="budget" className="field">
                          <option value="">{t.place[i]}</option>
                          {t.budgets.map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={
                            i === 0 ? "name" : i === 1 ? "email" : "company"
                          }
                          type={i === 1 ? "email" : "text"}
                          placeholder={t.place[i]}
                          className="field"
                        />
                      )}
                    </label>
                  ))}
                </div>
                <label className="mt-5 block">
                  <span className="mb-2 block text-sm text-white/55">
                    {t.labels[5]}
                  </span>
                  <textarea
                    name="message"
                    rows={6}
                    placeholder={t.place[5]}
                    className="field resize-none"
                  />
                </label>
                {state === "error" && (
                  <p role="alert" className="mt-4 text-sm text-red-300">
                    {t.error}
                  </p>
                )}
                <button
                  disabled={state === "loading"}
                  className="primary-btn mt-6 w-full justify-center"
                >
                  {state === "loading" ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {t.sending}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t.send}
                    </>
                  )}
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
      <Footer />
    </main>
  );
}
