import Link from "next/link";

export const metadata = { title: "Политика конфиденциальности — FORMA" };

export default function Privacy() {
  return (
    <main className="wrap section min-h-dvh">
      <Link href="/" className="link-line eyebrow">
        ← На главную
      </Link>
      <h1 className="display mt-16 max-w-4xl">Политика конфиденциальности</h1>
      <p className="lead mt-8 max-w-2xl text-muted">
        Текст документа будет добавлен владельцем сайта перед запуском и&nbsp;подключением формы заявок.
      </p>
    </main>
  );
}
