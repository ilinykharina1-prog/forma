export interface LeadPayload {
  name: string;
  phone: string;
  email: string;
  house: string;
  comment: string;
}

export type LeadErrors = Partial<Record<keyof LeadPayload, string>>;

export function validateLead(v: LeadPayload): LeadErrors {
  const errors: LeadErrors = {};
  if (!v.name || v.name.trim().length < 2) errors.name = "Напишите, как к вам обращаться";
  const digits = (v.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) errors.phone = "Проверьте номер телефона";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v.email ?? "").trim())) errors.email = "Проверьте адрес почты";
  if (!v.house || v.house.trim().length < 3) errors.house = "Расскажите хотя бы в паре слов";
  const limits: [keyof LeadPayload, number][] = [["name", 100], ["phone", 40], ["email", 120], ["house", 1000], ["comment", 2000]];
  for (const [key, max] of limits) if ((v[key] ?? "").length > max) errors[key] = `Слишком длинно: не больше ${max} символов`;
  return errors;
}

/** website — скрытое поле-ловушка для ботов, человек его не видит и не заполняет. */
export async function submitLead(payload: LeadPayload & { website?: string }) {
  const response = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`lead_${response.status}`);
}
