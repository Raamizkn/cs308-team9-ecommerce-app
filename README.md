# PixelVault Store

A modern e-commerce platform built with Next.js, React, and TypeScript, featuring a comprehensive product catalog, shopping cart, checkout process, and administrative functionalities.

## Features

*   **Product Catalog:** Browse and search for pixel art products across various categories.
*   **Shopping Cart:** Add, update, and remove items from your cart.
*   **User Authentication:** Secure user login and registration.
*   **User Profiles:** View and manage user profile information.
*   **Order Management:** View order history and details.
*   **Admin Panel:** (Implied from `app/admin` routes) Manage products, orders, sales, and support.
*   **Discount Campaigns:** Apply discount codes to purchases.
*   **Product Reviews:** Users can leave ratings and reviews for products.
*   **Wishlist:** Save products for later.
*   **Chat Support:** (Implied from `app/admin/chat` and `app/api/chat`)
*   **Refund Requests:** (Implied from `app/api/refunds` and `scripts/01-create-tables.sql`)

## Technologies Used

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, PostCSS
*   **UI Components:** Radix UI, Shadcn UI
*   **Database:** PostgreSQL (with Supabase integration)
*   **Authentication:** Supabase Auth
*   **State Management:** React Context (for cart)
*   **Form Handling:** React Hook Form, Zod
*   **Charting:** Recharts
*   **Carousel:** Embla Carousel
*   **Other Libraries:** `clsx`, `date-fns`, `lucide-react`, `next-themes`, `sonner`, `vaul`

## Setup

### Prerequisites

*   Node.js (version 18 or higher)
*   pnpm (or npm/yarn)
*   A PostgreSQL database (e.g., using Supabase)

### Environment Variables

Create a `.env.local` file in the root directory and add the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase project URL and anonymous key.

### Database Setup

Run these SQL scripts **in order** in your Supabase Dashboard → SQL Editor:

1.  **Create Tables:**
    Run `scripts/01-create-tables.sql` - Creates all database tables

2.  **Seed Categories:**
    Run `scripts/02-seed-categories.sql` - Adds product categories

3.  **Seed Products:**
    Run `scripts/03-seed-products.sql` - Adds sample products

4.  **Seed Discount Campaigns:**
    Run `scripts/04-seed-discount-campaigns.sql` - Adds discount codes

5.  **Add Stock Functions:**
    Run `scripts/05-add-stock-function.sql` - Adds stock management functions

6.  **Setup Login (Profiles Table):**
    Run `scripts/06-setup-profiles-and-auth.sql` - Creates profiles table and auto-signup trigger

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd pixelvault-store
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    # or npm install
    # or yarn install
    ```

## Running the Development Server

```bash
pnpm dev
# or npm run dev
# or yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
.
├── app/                  # Next.js application routes, API routes, and pages
├── components/           # Reusable React components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and Supabase client setup
├── public/               # Static assets
├── scripts/              # SQL scripts for database setup and seeding
├── styles/               # Global styles
└── ...                   # Other configuration files
```