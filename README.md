# FORMA — сайт архитектурно-строительной компании

Next.js (App Router), TypeScript, Tailwind CSS, Three.js / React Three Fiber, GSAP ScrollTrigger, Framer Motion.

```bash
npm install
npm run dev      # http://localhost:3210
npm run build
npm start        # порт берётся из PORT, по умолчанию 3210
```

Сайт запускается как приложение Node.js: статическая выгрузка не подходит, потому что форме нужен сервер.

## 3D-сцена

GLB-моделей в проекте нет: дом собран процедурно из геометрий Three.js (`src/three`).

- `core.ts` — шкала скролла и анимация деталей;
- `house.ts` — группы дома: `foundation`, `groundWalls`, `columns`, `floorSlab`, `upperWalls`, `roofStructure`, `roofCovering`, `windows`, `doors`, `facade`, `terrace`;
- `landscape.ts` — `terrain`, `landscaping`;
- `world.ts` — свет, небо, туман и камера.

Отладка: `/?q=low` — мобильное качество сцены, `/?fallback` — статичная версия без WebGL.

Если появится `public/assets/3d/house.glb`, назовите объекты так же, как группы выше: логика этапов останется прежней.

## Изображения

В `public/assets/images` нет настоящих фотографий.

- `final-house`, `hero-house`, `about`, `project-01…03`, `service-architecture` — изображения, сгенерированные нейросетью.
- Этапы стройки (`stages/*`), остальные услуги и материалы — кадры из этой же 3D-сцены.

Чтобы заменить изображение, положите файл с тем же именем.

## Что заполнить перед запуском

1. `src/content/site.ts` → `CONTACTS`: телефон, почта, адрес, соцсети.
2. Переменные окружения на хостинге → `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` (или `CRM_WEBHOOK_URL`): куда приходят заявки (`src/app/api/lead/route.ts`). Пока они пусты, форма показывает ошибку отправки. Защита от спама: скрытое поле-ловушка и не больше пяти заявок за десять минут с одного адреса.
3. `src/app/privacy/page.tsx`: текст политики конфиденциальности.
4. Проекты в портфолио — демонстрационные концепты, площади и описания условные.
