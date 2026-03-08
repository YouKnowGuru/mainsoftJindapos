# Dhisum Tseyig POS Platform

A complete web platform for distributing and licensing Dhisum Tseyig POS software for small businesses in Bhutan.

## Features

- **Marketing Website**: Landing page, features, pricing, documentation, and contact
- **Download System**: Windows installer and portable version downloads
- **License Management**: Generate, activate, and validate license keys
- **Device Locking**: Secure license activation tied to specific devices
- **Admin Dashboard**: Manage licenses, customers, and view statistics
- **Update System**: Version checking and update notifications for desktop app
- **API Endpoints**: RESTful API for Electron app integration

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **File Storage**: AWS S3 / Cloudflare R2

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- AWS S3 or Cloudflare R2 account (for file storage)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dhisum-tseyig-platform
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your credentials:
```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=http://localhost:3000
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_region
AWS_BUCKET_NAME=your_bucket_name
AWS_ENDPOINT_URL=your_s3_endpoint (for R2)
```

5. Seed the admin user:
```bash
npx ts-node scripts/seed-admin.ts
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
dhisum-tseyig-platform/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── admin/         # Admin API endpoints
│   │   ├── auth/          # NextAuth configuration
│   │   ├── contact/       # Contact form API
│   │   ├── download/      # Download URL generation
│   │   ├── license/       # License verification/activation
│   │   ├── stats/         # Dashboard statistics
│   │   └── updates/       # Update system API
│   ├── admin/             # Admin dashboard pages
│   ├── (public)/          # Public pages
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── layout/           # Layout components
│   └── ui/               # UI components (shadcn)
├── lib/                  # Utility functions
│   ├── auth/            # Authentication config
│   ├── db/              # Database connection
│   ├── models/          # Mongoose models
│   ├── rate-limit/      # Rate limiting
│   ├── s3/              # S3/R2 client
│   └── validation/      # Zod schemas
├── types/               # TypeScript types
└── scripts/             # Utility scripts
```

## API Endpoints

### Public Endpoints

- `POST /api/license/verify` - Verify license validity
- `POST /api/license/activate` - Activate a license
- `GET /api/updates/latest` - Get latest version info
- `GET /api/download` - Get download URL
- `POST /api/contact` - Submit contact form

### Admin Endpoints (Requires Authentication)

- `GET /api/admin/licenses` - List all licenses
- `POST /api/admin/licenses` - Create new license
- `PATCH /api/admin/licenses` - Update license
- `DELETE /api/admin/licenses/:id` - Delete license
- `POST /api/admin/licenses/extend` - Extend license expiry
- `GET /api/admin/customers` - List all customers
- `POST /api/admin/customers` - Create new customer
- `DELETE /api/admin/customers/:id` - Delete customer
- `GET /api/stats` - Get dashboard statistics

## License Key Format

License keys follow the format: `DTS-XXXX-XXXX-XXXX`

Example: `DTS-9F3A-K4LM-72PQ`

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### MongoDB Atlas

1. Create a cluster
2. Configure network access
3. Create database user
4. Get connection string

### Cloudflare R2 / AWS S3

1. Create bucket
2. Configure CORS
3. Get API credentials
4. Upload installer files

## Security Considerations

- All API endpoints use HTTPS
- Admin passwords are hashed with bcrypt
- Rate limiting on sensitive endpoints
- Input validation with Zod
- Device-locked license activation
- Session-based authentication

## Support

For support, email support@dhisumtseyig.com or call +975 17XX XXXX.

## License

Copyright (c) 2024 Dhisum Tseyig. All rights reserved.
