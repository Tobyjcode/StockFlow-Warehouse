# StockFlow Frontend (React + Vite)

Frontend for StockFlow warehouse system.

## Scripts

- `npm run dev` – start local development server
- `npm run build` – production build
- `npm run preview` – preview production build

## Run locally

1. Start backend first (`http://localhost:5212`)
2. In this folder:
   - `npm install`
   - `npm run dev`

The Vite proxy forwards API calls to backend:

- `/api`
- `/login`
- `/register`
- `/logout`

## Main pages

- `/` Home
- `/warehouses` Warehouse status
- `/products` Product management
- `/orders` Order creation + list
- `/auth` Register/login/logout

## Auth note

Access token is stored in browser local storage by the frontend API helper and attached as `Authorization: Bearer <token>` on requests.
