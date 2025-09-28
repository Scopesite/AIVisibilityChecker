# Railway Deployment Guide

## 🚂 Quick Deploy to Railway

This repository is ready for direct deployment to Railway. Follow these steps:

### 1. Deploy from GitHub

1. Go to [Railway](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Select this repository: `Scopesite/AIVisibilityChecker`
4. Railway will automatically detect the Node.js project and deploy

### 2. Environment Variables

Add these environment variables in Railway dashboard:

**Required Variables:**
```
DATABASE_URL=postgresql://neondb_owner:npg_[YOUR_PASSWORD]@ep-[YOUR_ENDPOINT].us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=DhWYap2UK/ZMNr/Q8ONITURvwtvQW4
FREE_SCAN_SALT=production-free-scan-salt-2024
OPENAI_API_KEY=sk-svcacct-cI3Tp3T1ArzFhWnCLOm[YOUR_KEY]
STRIPE_SECRET_KEY=sk_live_51R7PXtC2FmRRiMA01QJ4T[YOUR_KEY]
STRIPE_WEBHOOK_SECRET=whsec_wQXJUuFR8HSaHofaKFSJCpG8[YOUR_SECRET]
STRIPE_PRICE_STARTER=price_1SC2H9C2FmRRiMA00mPKscMq
STRIPE_PRICE_PRO=price_1SC2RhC2FmRRiMA0xispN39L
VITE_STRIPE_PUBLIC_KEY=pk_live_51R7PXtC2FmRRiMA0Rf9Ip[YOUR_KEY]
RESEND_API_KEY=re_123456789_abcdefghijklmnopq[YOUR_KEY]
```

**Optional Variables:**
```
NODE_ENV=production
PORT=5000
FEATURE_MAGIC_LINK=false
FEATURE_PASSWORD_AUTH=true
```

### 3. Database Setup

✅ **Database is already configured!**
- Neon PostgreSQL database is set up and migrated
- All 14 tables are ready
- Connection string is in `DATABASE_URL`

### 4. Custom Domain (Optional)

1. In Railway dashboard, go to your service
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### 5. Health Check

Once deployed, verify the application is working:
```bash
curl https://your-app.railway.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-09-28T20:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "database": "configured",
  "openai": "configured",
  "stripe": "configured"
}
```

## 🎯 Why Railway?

- ✅ **Native Express.js support** - No serverless conversion needed
- ✅ **Persistent connections** - Perfect for real-time features
- ✅ **Simple deployment** - Just connect GitHub and deploy
- ✅ **Auto-scaling** - Handles traffic spikes automatically
- ✅ **Built-in monitoring** - Logs, metrics, and health checks

## 🔧 Build Configuration

Railway will automatically:
1. Detect Node.js project
2. Run `npm install`
3. Execute `npm run build`
4. Start with `npm start`

The application will be available on port 5000 (or Railway's assigned port).

## 📊 Expected Results

After deployment, you'll have:
- ✅ **Frontend**: React app served at root URL
- ✅ **API**: All endpoints available at `/api/*`
- ✅ **Database**: Connected to Neon PostgreSQL
- ✅ **Payments**: Stripe integration working
- ✅ **Health Check**: Available at `/api/health`

The loading screen issue will be resolved because the Express server will run continuously on Railway, unlike Vercel's serverless limitations.
