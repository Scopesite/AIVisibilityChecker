# AI Visibility Checker

A comprehensive web application that analyzes business visibility across AI assistants like ChatGPT, Gemini, Claude, and others. Built with React frontend, Express backend, PostgreSQL database, and Stripe payment integration.

## Features

- **AI Visibility Analysis**: Scan websites to check how well they appear in AI assistant responses
- **Credit-Based System**: Purchase credit packs for unlimited scans
- **User Authentication**: Secure login with session management
- **Payment Processing**: Stripe integration for one-time credit purchases
- **Real-time Analytics**: Track scan history and results
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Payments**: Stripe
- **Deployment**: Vercel
- **Authentication**: Session-based with secure cookies

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (recommend Neon)
- Stripe account
- Environment variables configured

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Scopesite/AIVisibilityChecker.git
cd AIVisibilityChecker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Run database migrations:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database Configuration (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.neon.tech/db?sslmode=require
DIRECT_DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require

# Stripe Configuration (One-time Credit Packs)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_STARTER=price_1SC2H9C2FmRRiMA00mPKscMq
STRIPE_PRICE_PRO=price_1SC2RhC2FmRRiMA0xispN39L

# Application Configuration
SESSION_SECRET=your-session-secret-here
FREE_SCAN_SALT=your-free-scan-salt-here
APP_BASE_URL=https://your-app.vercel.app

# Optional: External APIs
OPENAI_API_KEY=your-openai-api-key-here
RESEND_API_KEY=re_xxx
BUILTWITH_API_KEY=builtwith_xxx

# Feature Flags
FEATURE_MAGIC_LINK=true
FEATURE_PASSWORD_AUTH=false

# Port (for local development)
PORT=5000
```

## Stripe Setup

This application uses **one-time credit pack purchases** only. No subscriptions are configured.

### Products & Pricing

The application uses two existing Stripe products:

1. **Starter Pack** (50 credits, £29.00)
   - Product ID: `prod_T8IsXTZ0kh19YM`
   - Price ID: `price_1SC2H9C2FmRRiMA00mPKscMq`

2. **Pro Pack** (250 credits, £99.00)
   - Product ID: `prod_T8J3zw0YKZyfu6`
   - Price ID: `price_1SC2RhC2FmRRiMA0xispN39L`

### Webhook Configuration

Configure your Stripe webhook endpoint to handle these events:

- `checkout.session.completed` - Processes successful purchases
- `payment_intent.succeeded` - Backup verification for payments

**Webhook URL**: `https://your-app.vercel.app/api/webhooks/stripe`

### Credit System

- Customers can purchase credit packs multiple times
- Each purchase adds credits to their account:
  - Starter Pack → +50 credits
  - Pro Pack → +250 credits
- Credits are granted idempotently (no double-granting)
- All transactions are logged for audit purposes

### Testing

Use Stripe's test mode with test cards:
- Success: `4242424242424242`
- Decline: `4000000000000002`

## Database Schema

The application uses the following main tables:

- `users` - User accounts and authentication
- `user_credits` - Credit balances and subscription status
- `billing_transactions` - Payment audit trail
- `credit_ledger` - Detailed credit transaction log
- `schema_analysis` - Scan results and analytics
- `daily_usage` - Usage tracking and limits

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Scans
- `POST /api/scan` - Perform AI visibility scan
- `GET /api/scan/history` - Get scan history
- `GET /api/scan/:id` - Get specific scan results

### Credits
- `GET /api/credits` - Get user credit balance
- `POST /api/credits/purchase` - Create Stripe checkout session

### Webhooks
- `POST /api/webhooks/stripe` - Handle Stripe webhook events

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables in Production

Ensure all environment variables are configured in your Vercel project settings, especially:
- Database URLs
- Stripe keys (use live keys for production)
- Session secrets
- Webhook secrets

## Development

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and helpers
├── server/                # Express backend
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   └── storage.ts        # Database operations
├── shared/               # Shared types and schemas
└── scripts/              # Build and deployment scripts
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Push database schema changes

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [support@scopesite.com](mailto:support@scopesite.com) or create an issue in the GitHub repository.
