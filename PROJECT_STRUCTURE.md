# Dhisum Tseyig Platform - Project Structure

## Overview

Complete Next.js application for POS software distribution and licensing.

## Directory Structure

```
dhisum-tseyig-platform/
├── app/                          # Next.js App Router
│   ├── (public pages)
│   │   ├── page.tsx             # Landing page
│   │   ├── features/page.tsx    # Features page
│   │   ├── pricing/page.tsx     # Pricing page
│   │   ├── download/page.tsx    # Download page
│   │   ├── docs/page.tsx        # Documentation page
│   │   ├── contact/page.tsx     # Contact page
│   │   └── license-activate/page.tsx  # License activation
│   │
│   ├── admin/                    # Admin dashboard
│   │   ├── layout.tsx           # Admin layout with sidebar
│   │   ├── login/page.tsx       # Admin login
│   │   ├── dashboard/page.tsx   # Dashboard overview
│   │   ├── licenses/
│   │   │   ├── page.tsx         # License list
│   │   │   └── create/page.tsx  # Create license
│   │   ├── customers/
│   │   │   ├── page.tsx         # Customer list
│   │   │   └── [id]/page.tsx    # Customer detail
│   │   └── settings/page.tsx    # Admin settings
│   │
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth config
│   │   ├── license/
│   │   │   ├── verify/route.ts  # Verify license
│   │   │   └── activate/route.ts # Activate license
│   │   ├── admin/
│   │   │   ├── licenses/route.ts        # License CRUD
│   │   │   ├── licenses/[id]/route.ts   # Single license
│   │   │   ├── licenses/extend/route.ts # Extend expiry
│   │   │   └── customers/
│   │   │       ├── route.ts             # Customer CRUD
│   │   │       └── [id]/route.ts        # Single customer
│   │   ├── updates/
│   │   │   ├── route.ts         # Update management
│   │   │   └── latest/route.ts  # Get latest version
│   │   ├── download/route.ts    # Download URLs
│   │   ├── contact/route.ts     # Contact form
│   │   └── stats/route.ts       # Dashboard stats
│   │
│   ├── globals.css              # Global styles
│   └── layout.tsx               # Root layout
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── accordion.tsx
│   │   ├── alert.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── textarea.tsx
│   │
│   ├── layout/                  # Layout components
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   │
│   ├── admin/                   # Admin components
│   │   ├── AdminSidebar.tsx
│   │   └── StatCard.tsx
│   │
│   └── providers/
│       └── SessionProvider.tsx
│
├── lib/                         # Utility functions
│   ├── utils.ts                 # General utilities
│   ├── db/
│   │   └── mongodb.ts           # MongoDB connection
│   ├── models/                  # Mongoose models
│   │   ├── License.ts
│   │   ├── Customer.ts
│   │   ├── Update.ts
│   │   ├── Admin.ts
│   │   └── index.ts
│   ├── auth/
│   │   ├── auth.config.ts       # NextAuth config
│   │   └── auth.middleware.ts   # Auth middleware
│   ├── rate-limit/
│   │   └── rate-limit.ts        # Rate limiting
│   ├── s3/
│   │   └── s3-client.ts         # S3/R2 client
│   └── validation/
│       └── schemas.ts           # Zod schemas
│
├── types/                       # TypeScript types
│   └── next-auth.d.ts
│
├── scripts/                     # Utility scripts
│   └── seed-admin.ts            # Seed admin user
│
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
├── .gitignore
└── README.md
```

## Key Features

### Public Pages
- `/` - Landing page with hero, features, pricing
- `/features` - Detailed feature list
- `/pricing` - Pricing plans (Starter, Pro, Lifetime)
- `/download` - Download Windows installer/portable
- `/docs` - Documentation and quick start guide
- `/contact` - Contact form
- `/license-activate` - License activation page

### Admin Dashboard
- `/admin/login` - Admin authentication
- `/admin/dashboard` - Statistics and overview
- `/admin/licenses` - License management
- `/admin/customers` - Customer management
- `/admin/settings` - Account settings

### API Endpoints

#### Public
- `POST /api/license/verify` - Verify license
- `POST /api/license/activate` - Activate license
- `GET /api/updates/latest` - Get latest version
- `GET /api/download` - Get download URL
- `POST /api/contact` - Submit contact form

#### Admin (Authenticated)
- `GET /api/admin/licenses` - List licenses
- `POST /api/admin/licenses` - Create license
- `PATCH /api/admin/licenses` - Update license
- `DELETE /api/admin/licenses/:id` - Delete license
- `POST /api/admin/licenses/extend` - Extend expiry
- `GET /api/admin/customers` - List customers
- `POST /api/admin/customers` - Create customer
- `DELETE /api/admin/customers/:id` - Delete customer
- `GET /api/stats` - Dashboard statistics

## Database Collections

### licenses
```javascript
{
  _id: ObjectId,
  licenseKey: String,      // DTS-XXXX-XXXX-XXXX
  customerName: String,
  email: String,
  companyName: String,
  plan: String,            // starter | pro | lifetime
  status: String,          // active | inactive | expired | suspended
  deviceId: String,        // Device fingerprint
  expiryDate: Date,
  activationDate: Date,
  activationCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### customers
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  company: String,
  phone: String,
  createdAt: Date,
  updatedAt: Date
}
```

### updates
```javascript
{
  _id: ObjectId,
  version: String,
  notes: String,
  downloadUrl: String,
  isLatest: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### admins
```javascript
{
  _id: ObjectId,
  username: String,
  passwordHash: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# AWS S3 / Cloudflare R2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=auto
AWS_BUCKET_NAME=...
AWS_ENDPOINT_URL=https://...

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

3. Seed admin user:
```bash
npm run seed
```

4. Run development server:
```bash
npm run dev
```

5. Open http://localhost:3000

## Deployment

### Vercel
1. Connect GitHub repository
2. Add environment variables
3. Deploy

### MongoDB Atlas
1. Create cluster
2. Add connection IP
3. Create database user
4. Get connection string

### Cloudflare R2
1. Create bucket
2. Configure CORS
3. Generate API tokens
4. Upload installer files
