# GYMZONE

GYMZONE is a React/Vite storefront with a separate Express/MongoDB API. The frontend keeps the current sample catalog available for browsing; when the API is connected, product data and inventory are loaded from MongoDB.

## Requirements

- Node.js 18.18 or newer and npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string

## Configure and run the backend

Open PowerShell and prepare the backend environment:

```powershell
cd "D:\doodle blue project\GYMZONE\backend"
Copy-Item .env.example .env
notepad .env
npm install
```

In `backend/.env`, set `MONGO_URI` to your MongoDB connection string and replace `JWT_SECRET` with a private random value at least 32 characters long. Set a unique `ADMIN_EMAIL` and an `ADMIN_PASSWORD` at least 12 characters long. Never commit `.env`.

For signup verification and password-reset codes, set `EMAIL_USER` to your Gmail address and `EMAIL_PASS` to a Gmail App Password (not your account password). The backend verifies SMTP at startup. If these values are missing or invalid, OTP requests fail without creating an account or changing a password. Never commit real email credentials.

Create the first administrator, then start the API:

```powershell
npm run create-admin
npm run dev
```

The API listens on `http://localhost:5000`. Sample products are inserted when the database connects. Existing products are not overwritten on later starts.

## Run the frontend

In a second PowerShell window:

```powershell
cd "D:\doodle blue project\GYMZONE\frontend"
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Vite proxies `/api` requests to the backend.

## Implemented

- Product listing and product detail endpoints, with the shared sample catalog in `frontend/src/data/products.js`
- Signup email verification with pending registrations, hashed 6-digit OTPs, 5-minute expiry, attempt limits, and 60-second resend cooldown
- Forgot-password OTP verification and single-use, short-lived reset authorization; new passwords are bcrypt-hashed
- Customer order history and order placement with server-side prices and stock checks
- Cash on delivery only; orders stay `pending`, and no payment is simulated or marked paid
- Admin product create/edit/archive, customer enable/disable, and order status management at `/admin`
- Cart and wishlist persistence in browser local storage
- Local product photography under `frontend/public/assets/products`; the image/source mapping is listed in `ATTRIBUTION.txt`

## Setup notes and limitations

- The first administrator must be created with `npm run create-admin`. Public registration always creates a customer account.
- Gmail SMTP credentials are required for signup verification and password reset. OTPs are never returned by API responses or written to logs.
- Online card payments are not implemented. Checkout supports genuine cash-on-delivery orders only.
- If MongoDB is not available, the storefront explicitly reports the API error and remains browseable using its local sample catalog. Login, admin and order operations require the API and MongoDB.

## Main API routes

- `GET /api/health`
- `GET /api/products` and `GET /api/products/:id`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/send-verify-otp`, `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`, `POST /api/auth/verify-reset-otp`, `POST /api/auth/reset-password`
- `POST /api/orders`, `GET /api/orders/mine`
- Admin-only product, customer and order management routes under `/api/admin`
