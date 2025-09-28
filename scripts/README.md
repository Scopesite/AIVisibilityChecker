# Production Scripts

## Setup Production Pro Account

To set up a pro account in the production environment:

1. Open a terminal in your production Replit environment
2. Run one of the following commands:

```bash
# If tsx is available:
npx tsx scripts/setup-production-pro.ts

# Alternative if tsx is not available:
node --loader tsx/esm scripts/setup-production-pro.ts
```

This script will:
- Set up dan@scopesite.co.uk with pro subscription status
- Grant 200 credits for testing and video creation (90-day expiry) 
- Check existing balance/subscription to avoid duplicates
- Use deterministic identifiers for true idempotency protection

**Safety Features:**
- ✅ Safe to run multiple times - won't duplicate credits or subscriptions
- ✅ Checks existing state before making changes
- ✅ Uses deterministic transaction references for idempotency
- ✅ Handles existing accounts gracefully

**After running:** Refresh your browser to see the updated credits and pro status.