# Shopkeeper Admin

A separate Angular admin application in the Ionic workspace. It uses NgRx for administrator session and admin data state, and calls the existing protected Node APIs.

## Run Locally

From the workspace root:

```powershell
npm --prefix .\ngRx_App run start:shopkeeper
```

Open `http://localhost:4300`. The Angular dev proxy forwards `/api` to the backend at `http://localhost:3000`.

Build it with:

```powershell
npm --prefix .\ngRx_App run build:shopkeeper
```

## Create the First Administrator

There is no public admin registration endpoint. Create or promote an administrator from a trusted local shell; do not place the password in source control:

```powershell
$env:ADMIN_NAME = 'Shop Admin'
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = 'use-a-long-random-password'
npm --prefix .\shopping_node_backend run admin:create
Remove-Item Env:ADMIN_NAME,Env:ADMIN_EMAIL,Env:ADMIN_PASSWORD
```

The command uses the backend's `MONGO_URI` from its `.env` unless one is already supplied in the shell.

## Admin Workspaces

- Overview: recent orders, delivered revenue, customer/product counts, and top products.
- Orders: search orders and advance status through fulfillment.
- Inventory: add, edit, and archive products, including price, stock, category, and image URLs.
- Categories: add, edit, show, and hide product categories.
- Customers: search the customer directory and review verification status.
- Delivery team: create rider accounts and review availability, deliveries, and earnings.
- Payments: review gateway attempts, COD collection, failures, and refunds.

Admin routes require an administrator JWT. The application stores that token separately from the customer app session.
