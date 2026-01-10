# Google AdSense Implementation

> **Publisher ID:** `pub-8374343652873511`  
> **Deployment:** Cloudflare Workers via OpenNext  
> **Goal:** Non-intrusive ad experience with minimal code changes

---

## Implementation Status

### Completed

- [x] `public/ads.txt` - Publisher authorization file
- [x] `public/robots.txt` - Crawler access configuration
- [x] AdSense script in root layout (`src/app/layout.tsx`)
- [x] Site-wide footer with Privacy Policy link
- [x] Privacy Policy page (`/privacy`)
- [x] Terms of Service page (`/terms`)
- [x] Contact page (`/contact`)
- [x] Reusable AdUnit component (`src/components/ads/AdUnit.tsx`)

### Pending (After Approval)

- [ ] Configure Auto ads (conservative settings)
- [ ] Set up Funding Choices for EEA/UK consent (GDPR)
- [ ] Add manual ad units where desired
- [ ] Monitor Core Web Vitals impact

---

## Files

### `public/ads.txt`

```
google.com, pub-8374343652873511, DIRECT, f08c47fec0942fa0
```

This file declares authorization to sell ad inventory via Google.

### `public/robots.txt`

Allows all crawlers except for `/api/` routes.

### `src/app/layout.tsx`

AdSense script injected in `<head>` via Next.js `<Script>` component with `afterInteractive` strategy.

### `src/components/ads/AdUnit.tsx`

Reusable React component for manual ad placement:

```tsx
import { AdUnit } from "@/components/ads";

// Get slot ID from AdSense when creating a new ad unit
<AdUnit slot="1234567890" />
```

### `src/components/shell/SiteFooter.tsx`

Site-wide footer with links to Privacy Policy, Terms, and Contact.

---

## Verification URLs

| URL | Expected |
|-----|----------|
| `/ads.txt` | Shows publisher authorization |
| `/privacy` | Privacy policy page loads |
| `/terms` | Terms of service page loads |
| `/contact` | Contact page loads |
| Any page | Footer visible with legal links |

---

## AdSense Configuration (After Approval)

### Recommended Auto Ads Settings

| Setting | Recommendation |
|---------|----------------|
| Auto ads | ON (configured conservatively) |
| In-page ads | ON |
| Anchor ads | OFF (intrusive) |
| Side rail ads | OFF (distracting) |
| Vignette ads | OFF (full-page interstitials) |
| Ad load | Minimum |

### Manual Ad Placement Options

Use the `AdUnit` component for precise placement:

```tsx
import { AdUnit } from "@/components/ads";

// In a page or component
<AdUnit slot="YOUR_SLOT_ID" format="horizontal" />
```

**Suggested Locations:**

1. Between content sections (e.g., below hero, between feature lists)
2. Within footer area (above copyright)
3. Sidebar (if applicable)

Avoid ads:

- Above the fold on mobile
- That cause layout shift (use min-height reservations)
- That interrupt reading flow

---

## GDPR Compliance

For users in EEA/UK/Switzerland:

1. In AdSense dashboard: **Privacy & messaging**
2. Create a GDPR consent message
3. Google automatically serves consent dialogs to EEA/UK users

---

## CSP Headers (If Needed)

If Content Security Policy is enforced, include:

```
script-src 'self' https://pagead2.googlesyndication.com https://www.googletagservices.com https://tpc.googlesyndication.com;
frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com;
img-src 'self' data: https://pagead2.googlesyndication.com https://www.google.com;
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ads.txt` returns 404 | File not in `public/` | Verify file exists and redeploy |
| Script not loading | CSP blocking | Add required domains to CSP |
| Ads not showing | Not approved yet | Wait for AdSense review |
| Core Web Vitals degraded | Ads causing CLS | Reduce ad density, reserve space |

---

## Updating Publisher ID

If the publisher ID changes:

1. Update `ADSENSE_PUBLISHER_ID` in `src/app/layout.tsx`
2. Update `public/ads.txt`
3. Update this documentation
4. Deploy and wait for re-verification

