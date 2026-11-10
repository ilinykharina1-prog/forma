"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Button, EASE, Headline } from "@/components/ui/motion";
import { LeadErrors, LeadPayload, submitLead, validateLead } from "@/lib/lead";
import { t } from "@/content/site";

type Status = "idle" | "loading" | "success" | "error";
const EMPTY: LeadPayload = { name: "", phone: "", email: "", house: "", comment: "" };

const FIELDS: { name: keyof LeadPayload; label: string; type?: string; autoComplete?: string; inputMode?: "tel" | "email"; area?: boolean; optional?: boolean }[] = [
  { name: "name", label: "Ваше имя", autoComplete: "name" },
  { name: "phone", label: "Телефон", type: "tel", inputMode: "tel", autoComplete: "tel" },
  { name: "email", label: "Электронная почта", type: "email", inputMode: "email", autoComplete: "email" },
  { name: "house", label: "Какой дом планируете построить?" },
  { name: "comment", label: "Дополнительный комментарий", area: true, optional: true },
];

export function Contact() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [trap, setTrap] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateLead(values);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`lead-${first}`)?.focus();
      return;
    }
    setStatus("loading");
    try {
      await submitLead({ ...values, website: trap });
      setStatus("success");
      setValues(EMPTY);
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="wrap section">
      <div className="grid-12 gap-y-16">
        <div className="col-span-12 lg:col-span-5">
          <Headline className="display">Расскажите о&nbsp;доме</Headline>
          <p className="lead mt-6 max-w-md text-muted">{t("Оставьте контакты и пару слов об идее — обсудим участок, задачи и следующий шаг.")}</p>
        </div>

        <div className="col-span-12 lg:col-span-6 lg:col-start-7">
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div key="ok" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} className="border-t border-ink pt-8">
                <h3 className="text-[clamp(2rem,3.4vw,3rem)] leading-[1.1] tracking-tight">Заявка отправлена</h3>
                <p className="mt-4 text-muted">{t("Спасибо! Мы свяжемся с вами, чтобы обсудить проект.")}</p>
                <button type="button" className="link-line mt-8 min-h-11" onClick={() => setStatus("idle")}>
                  Отправить ещё одну заявку
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={onSubmit} noValidate exit={{ opacity: 0 }} className="space-y-8">
                {FIELDS.map((f) => {
                  const id = `lead-${f.name}`;
                  const err = errors[f.name];
                  const props = {
                    id,
                    name: f.name,
                    value: values[f.name],
                    "aria-invalid": err ? (true as const) : undefined,
                    "aria-describedby": err ? `${id}-err` : undefined,
                    autoComplete: f.autoComplete,
                    className: "field",
                    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                      setValues((v) => ({ ...v, [f.name]: e.target.value }));
                      if (err) setErrors((x) => ({ ...x, [f.name]: undefined }));
                    },
                  };
                  return (
                    <div key={f.name}>
                      <label htmlFor={id} className="text-sm text-muted">
                        {f.label}
                        {f.optional && <span> — по желанию</span>}
                      </label>
                      {f.area ? <textarea {...props} rows={3} className="field resize-none" /> : <input {...props} type={f.type ?? "text"} inputMode={f.inputMode} />}
                      {err && (
                        <p id={`${id}-err`} className="mt-2 text-sm text-[#a4452f]">
                          {err}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Ловушка для спам-ботов: поле скрыто от людей и от экранных дикторов */}
                <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label htmlFor="lead-website">Сайт</label>
                  <input id="lead-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
                </div>

                {status === "error" && (
                  <p role="alert" className="border-l border-[#a4452f] pl-4 text-[#a4452f]">
                    {t("Не удалось отправить заявку. Попробуйте ещё раз чуть позже или свяжитесь с нами напрямую.")}
                  </p>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                  <Button type="submit" disabled={status === "loading"} className="sm:min-w-64">
                    {status === "loading" ? "Отправляем…" : "Отправить заявку"}
                  </Button>
                  <p className="text-sm text-muted">
                    Нажимая кнопку, вы соглашаетесь с&nbsp;
                    <Link href="/privacy" className="underline underline-offset-2">
                      политикой конфиденциальности
                    </Link>
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
