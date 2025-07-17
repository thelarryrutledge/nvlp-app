# NVLP Deployment Overview

Comprehensive deployment guide for the NVLP monorepo covering all applications and environments.

## Table of Contents

- [Deployment Architecture](#deployment-architecture)
- [Quick Deployment Guide](#quick-deployment-guide)
- [Environment Configuration](#environment-configuration)
- [Component-Specific Deployment](#component-specific-deployment)
- [CI/CD Automation](#cicd-automation)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Deployment Architecture

### System Overview

```
NVLP Production Infrastructure

┌─────────────────────────────────────────────────────────────┐
│                        NVLP System                         │
├─────────────────────────────────────────────────────────────┤
│  Mobile Apps          │  Backend Services  │  Infrastructure │
│  ┌─────────────────┐  │  ┌──────────────┐  │  ┌────────────┐ │
│  │ iOS App Store   │  │  │ Supabase     │  │  │ GitHub     │ │
│  │ - NVLPMobile    │  │  │ - Edge Funcs │  │  │ - Code     │ │
│  │ - Version sync  │  │  │ - PostgreSQL │  │  │ - CI/CD    │ │
│  └─────────────────┘  │  │ - Auth       │  │  │ - Secrets  │ │
│  ┌─────────────────┐  │  │ - Storage    │  │  └────────────┘ │
│  │ Google Play     │  │  └──────────────┘  │  ┌────────────┐ │
│  │ - NVLPMobile    │  │  ┌──────────────┐  │  │ Monitoring │ │
│  │ - AAB/APK       │  │  │ Vercel       │  │  │ - Logs     │ │
│  └─────────────────┘  │  │ - Backups    │  │  │ - Analytics│ │
│                       │  │ - Additional │  │  │ - Alerts   │ │
│                       │  └──────────────┘  │  └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Targets

| Component | Platform | Method | Documentation |
|-----------|----------|--------|---------------|
| **Mobile iOS** | App Store Connect | Xcode Archive | [Mobile Deployment Guide](../../apps/mobile/docs/DEPLOYMENT_GUIDE.md) |
| **Mobile Android** | Google Play Console | Gradle Bundle | [Mobile Deployment Guide](../../apps/mobile/docs/DEPLOYMENT_GUIDE.md) |
| **API Functions** | Supabase Edge | Supabase CLI | [API Deployment Guide](../../apps/api/docs/DEPLOYMENT.md) |
| **Database** | Supabase | Migrations | [API Deployment Guide](../../apps/api/docs/DEPLOYMENT.md) |

## Quick Deployment Guide

### Prerequisites Checklist

```bash
# ✅ Environment Setup
□ Node.js 18+ installed
□ pnpm installed and configured
□ Supabase CLI authenticated
□ Mobile development tools (iOS/Android)
□ Production environment variables configured

# ✅ Access & Credentials
□ Apple Developer account (iOS)
□ Google Play Console account (Android)
□ Supabase project access
□ Code signing certificates
□ App Store/Play Store metadata

# ✅ Code Quality
□ All tests passing
□ TypeScript validation clean
□ Linting checks passed
□ Production build successful
```

### Deployment Commands Quick Reference

```bash
# 🚀 Complete Production Deployment

# 1. Build all packages and validate
pnpm build:production
pnpm test && pnpm lint && pnpm type-check

# 2. Deploy API (backend services)
cd apps/api && pnpm deploy

# 3. Build mobile apps for distribution
cd apps/mobile
pnpm build:ios:prod          # iOS Archive
pnpm build:android:bundle    # Android App Bundle

# 4. Upload mobile apps (manual process)
# iOS: Upload via Xcode or altool
# Android: Upload via Play Console
```

## Environment Configuration

### Development vs Production

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| **Development** | Local development | `.env` files, local Supabase |
| **Staging** | Testing & validation | `.env.staging`, staging Supabase |
| **Production** | Live deployment | Platform environment variables |

### Required Environment Variables

#### Mobile App Production
```bash
# apps/mobile/.env.production
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
API_BASE_URL=https://your-project.supabase.co/functions/v1

# App Identifiers
BUNDLE_ID=com.nvlp.mobile
PACKAGE_NAME=com.nvlp.mobile
```

#### API Functions
```bash
# Configured in Supabase Dashboard > Edge Functions > Environment Variables
JWT_SECRET=your-jwt-secret
ENABLE_AUDIT_LOGGING=true
EXTERNAL_API_KEY=your-external-api-key-if-needed
```

### Security Best Practices

1. **Never commit production secrets** to git
2. **Use platform-specific secret management**:
   - GitHub Secrets for CI/CD
   - Supabase Dashboard for Edge Functions
   - Xcode/Android Keychain for mobile certificates
3. **Rotate credentials regularly**
4. **Use least-privilege access** for all accounts
5. **Monitor for credential leaks** in logs and code

## Component-Specific Deployment

### Mobile App Deployment

#### iOS Deployment Process

```bash
# 1. Prepare iOS build
cd apps/mobile
pnpm build:validate:ios

# 2. Build production archive
pnpm build:ios:prod

# 3. Open in Xcode for distribution
open ios/NVLPMobile.xcworkspace

# 4. Archive and upload to App Store Connect
# (via Xcode Organizer or command line tools)
```

**Requirements:**
- Valid Apple Developer account
- Distribution certificate and provisioning profile
- App Store Connect app configuration
- Xcode 15+ on macOS

**Key Configuration:**
- Bundle ID: `com.nvlp.mobile`
- Deployment Target: iOS 15.0+
- New Architecture: Enabled
- Version sync from package.json

#### Android Deployment Process

```bash
# 1. Prepare Android build
cd apps/mobile
pnpm build:validate:android

# 2. Build signed App Bundle
pnpm build:android:bundle

# 3. Upload to Google Play Console
# Manual upload via Play Console web interface
# File: android/app/build/outputs/bundle/release/app-release.aab
```

**Requirements:**
- Google Play Console account
- Upload keystore properly configured
- Play Console app configuration
- Android SDK 35

**Key Configuration:**
- Package Name: `com.nvlp.mobile`
- Target SDK: 35, Min SDK: 24
- ProGuard: Enabled
- Version sync from package.json

### API Deployment Process

```bash
# 1. Validate API code
cd apps/api
pnpm type-check && pnpm lint

# 2. Deploy all functions
pnpm deploy

# 3. Verify deployment
curl https://your-project.supabase.co/functions/v1/health

# 4. Test authenticated endpoints
curl -H "Authorization: Bearer $JWT_TOKEN" \
     https://your-project.supabase.co/functions/v1/dashboard
```

**Available Functions:**
- `auth` - Authentication endpoints
- `dashboard` - Dashboard data aggregation
- `transactions` - Transaction management
- `envelopes` - Envelope operations
- `reports` - Financial reporting
- `export` - Data export functionality
- `notifications` - User notifications
- `audit` - Audit logging
- `health` - Health check endpoint

### Database Schema Deployment

```bash
# 1. Review migration status
supabase db status

# 2. Apply pending migrations
supabase db push

# 3. Regenerate TypeScript types
cd apps/api && pnpm db:types

# 4. Update packages with new types
cd ../.. && pnpm build:packages
```

## CI/CD Automation

### GitHub Actions Workflows

#### Mobile App CI/CD

```yaml
# .github/workflows/mobile-deployment.yml
name: Mobile Deployment

on:
  push:
    tags: ['v*']

jobs:
  ios:
    runs-on: macos-latest
    steps:
      - name: Build and Deploy iOS
        run: |
          pnpm install --frozen-lockfile
          cd apps/mobile
          pnpm build:ios:prod
          # Upload to App Store Connect

  android:
    runs-on: ubuntu-latest
    steps:
      - name: Build and Deploy Android
        run: |
          pnpm install --frozen-lockfile
          cd apps/mobile
          pnpm build:android:bundle
          # Upload to Google Play Console
```

#### API Deployment CI/CD

```yaml
# .github/workflows/api-deployment.yml
name: API Deployment

on:
  push:
    branches: [main]
    paths: ['supabase/functions/**', 'apps/api/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy API Functions
        run: |
          cd apps/api
          pnpm deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Deployment Triggers

| Trigger | Action | Target |
|---------|--------|--------|
| **Tag push** (`v*`) | Build and distribute mobile apps | App Store, Play Store |
| **Main branch push** | Deploy API functions | Supabase Edge Functions |
| **Manual trigger** | Emergency deployments | All components |
| **Scheduled** | Dependency updates | Development environment |

### Secret Management

#### GitHub Secrets Required

```bash
# iOS Deployment
IOS_TEAM_ID=your-apple-team-id
ASC_API_KEY=app-store-connect-api-key
IOS_CERTIFICATE=base64-encoded-certificate
IOS_PROVISIONING_PROFILE=base64-encoded-profile

# Android Deployment
KEYSTORE_PASSWORD=android-keystore-password
KEY_PASSWORD=android-key-password
PLAY_SERVICE_ACCOUNT=play-console-service-account-json

# API Deployment
SUPABASE_ACCESS_TOKEN=supabase-access-token
SUPABASE_PROJECT_REF=your-project-reference
```

## Monitoring and Maintenance

### Health Monitoring

#### API Health Checks

```bash
# Automated health monitoring
curl https://your-project.supabase.co/functions/v1/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.2.3",
  "services": {
    "database": "connected",
    "auth": "operational",
    "functions": "deployed"
  }
}
```

#### Mobile App Monitoring

**iOS Monitoring:**
- App Store Connect analytics
- Crash reports in Xcode Organizer
- Customer reviews and ratings

**Android Monitoring:**
- Google Play Console vitals
- Android vitals for performance
- Crash reports and ANRs

### Performance Monitoring

#### Key Metrics to Track

| Component | Metrics | Tools |
|-----------|---------|-------|
| **Mobile Apps** | Launch time, memory usage, crash rate | App Store/Play Console Analytics |
| **API Functions** | Response time, error rate, throughput | Supabase Analytics |
| **Database** | Query performance, connection count | Supabase Dashboard |

#### Alerting Setup

```bash
# Supabase Function Monitoring
# Configure alerts in Supabase Dashboard:
# - Function error rate > 5%
# - Function response time > 2s
# - Database connection failures

# Mobile App Monitoring
# Configure alerts in app stores:
# - Crash rate > 2%
# - App launch failures
# - Poor user reviews
```

### Update and Maintenance Schedule

#### Regular Maintenance Tasks

**Weekly:**
- Review error logs and crash reports
- Monitor performance metrics
- Check for security updates

**Monthly:**
- Dependency updates
- Database performance optimization
- Mobile app store optimization

**Quarterly:**
- Security audit
- Performance benchmarking
- Documentation updates

## Troubleshooting

### Common Deployment Issues

#### Mobile App Issues

**iOS Build Failures:**
```bash
# Clean build and retry
rm -rf ios/build ios/Pods ios/Podfile.lock
cd ios && pod install && cd ..
pnpm build:ios:prod
```

**Android Build Failures:**
```bash
# Clean gradle and retry
cd android && ./gradlew clean && cd ..
pnpm build:android:bundle
```

**Code Signing Issues:**
- Verify certificates are valid and not expired
- Check provisioning profiles match app ID
- Ensure keystore passwords are correct

#### API Deployment Issues

**Function Deployment Failures:**
```bash
# Check function syntax
deno lint supabase/functions/[function-name]/

# Verify imports and dependencies
deno check supabase/functions/[function-name]/index.ts

# Redeploy specific function
supabase functions deploy [function-name]
```

**Database Migration Issues:**
```bash
# Check migration status
supabase db status

# Reset database (development only)
supabase db reset

# Apply specific migration
supabase db push --include-all
```

### Emergency Procedures

#### Rollback Procedures

**API Rollback:**
```bash
# Revert to previous working version
git checkout [working-commit] -- supabase/functions/
supabase functions deploy

# Or rollback specific function
git checkout [working-commit] -- supabase/functions/[function-name]/
supabase functions deploy [function-name]
```

**Mobile App Hotfix:**
```bash
# Create hotfix branch from production tag
git checkout v1.2.3
git checkout -b hotfix/critical-fix

# Apply minimal fix and test
pnpm test && pnpm build:production

# Fast-track deployment
# iOS: Emergency App Store review
# Android: Staged rollout for quick validation
```

#### Incident Response

1. **Immediate Response** (0-15 minutes):
   - Assess impact and affected users
   - Check monitoring dashboards
   - Implement immediate mitigation if possible

2. **Investigation** (15-60 minutes):
   - Identify root cause
   - Document timeline and impact
   - Determine fix strategy

3. **Resolution** (1-4 hours):
   - Implement and test fix
   - Deploy through appropriate channels
   - Verify resolution

4. **Post-Incident** (24-48 hours):
   - Conduct post-mortem
   - Update documentation
   - Implement preventive measures

### Getting Help

#### Documentation References

- **[Mobile Deployment Guide](../../apps/mobile/docs/DEPLOYMENT_GUIDE.md)** - Detailed mobile deployment
- **[API Deployment Guide](../../apps/api/docs/DEPLOYMENT.md)** - API deployment specifics
- **[Production Build Guide](../PRODUCTION_BUILD.md)** - Build process details
- **[Development Setup](./SETUP_GUIDE.md)** - Environment configuration

#### Support Channels

- **Platform Documentation**: Supabase, Apple Developer, Google Play
- **Community Support**: React Native, Supabase communities
- **Emergency Contacts**: Platform support for critical issues

---

This deployment overview provides a comprehensive guide for deploying all components of the NVLP system. For detailed component-specific instructions, refer to the linked documentation guides.