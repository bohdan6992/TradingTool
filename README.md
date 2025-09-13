# TradingTool — повністю готовий продукт (Next.js + Tailwind + Netlify + Neon)

## Запуск локально
1) Створи БД у Neon, скопіюй `DATABASE_URL` (з `sslmode=require`).
2) `npm i`
3) `cp .env.example .env.local` → встав `DATABASE_URL=...`
4) `npm run dev`
5) Один раз відкрий `http://localhost:3000/api/init` (створить таблиці та додасть 3 стратегії).

## Деплой на Netlify
- Підключи репозиторій.
- У **Site settings → Environment variables** додай `DATABASE_URL`.
- Build command: `npm run build`
- Publish: `.next` (Netlify Next.js plugin вже додано в `netlify.toml`).
- Після деплою зайди на `/api/init` один раз.

## API
- `GET /api/strategies` — список стратегій
- `POST /api/strategies` — {name, description?, icon?}
- `GET /api/strategies/:id` — одна стратегія
- `PUT /api/strategies/:id`
- `DELETE /api/strategies/:id`

- `GET /api/trades?strategy_id=ID`
- `POST /api/trades` — form-data або JSON: {strategy_id, ticker, trade_date, entry_amount, result, screenshot_url?}
- `GET /api/trades/:id`, `PUT /api/trades/:id`, `DELETE /api/trades/:id`

## UI
- Головна: список стратегій, перемикач теми, анімації.
- Сторінка стратегії: графіки (Recharts), форма додавання статистики, журнал.


## Admin & Cloudinary
- Адмін-екран: `/admin` — створення/редагування/видалення стратегій (без авторизації).
- Завантаження іконок у **Cloudinary** (необов'язково):
  1) Створи безкоштовний акаунт на cloudinary.com
  2) У налаштуваннях створити **Unsigned Upload Preset**
  3) Додай у `.env`:
     ```
     CLOUDINARY_CLOUD_NAME=your_cloud
     CLOUDINARY_UPLOAD_PRESET=unsigned_preset_name
     ```
  4) На сторінці `/admin` кнопка “Завантажити іконку” завантажить файл і підставить URL у форму.
