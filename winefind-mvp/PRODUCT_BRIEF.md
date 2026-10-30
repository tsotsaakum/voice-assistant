# Vintly — Product Brief (Wine Find–style MVP)

## Vision
A pocket sommelier for restaurants and retail: scan a label or wine list, see critic scores and true market price, map your palate, and find the right bottle by taste — without overpaying.

## Audience
- Diners choosing from a restaurant wine list under time pressure
- Shoppers comparing shelf price to market value
- Learners building a taste profile and tasting notes (18+)

## Age gate
Users must confirm they are **18 or older** before entering the app. Alcohol content is frequent and intentional (App Store Food & Drink / 18+ equivalent).

## Core jobs
1. **Instant Scan** — Photograph a label (or pick a demo label) → match wine → scores, tasting notes, region, market price.
2. **Menu Scan** — Load a restaurant wine list → batch scores + menu vs market markup.
3. **Taste Profile** — Like/rate wines → flavor map → personalized recommendations.
4. **Find Wine** — Natural language (“crisp white, oysters, under $30”) → ranked matches, optionally constrained to the active scanned menu.
5. **Smart Savings** — Flag markups (fair / steep / extreme; extreme ≈ 7× retail).

## Freemium gates (Wine Find–aligned)
| Feature | Free | Premium ($4.99/mo or $49.99/yr demo) |
| --- | --- | --- |
| Label scans | 3 / week | Unlimited |
| Menu scan | 1 demo list | Unlimited + saved lists |
| Wine detail + basic markup | Yes | Yes + extreme-markup alerts |
| Find Wine | 3 queries / day | Unlimited + menu-constrained |
| Taste profile & notes | Yes (local) | Sync badge + unlimited history |
| Auth / saved wines | Local account | Premium sync flag |

## Out of scope for this MVP
- Native iOS App Store binary / real StoreKit
- Production OCR/ML vision backend (demo uses catalog matching + simulated confidence)
- Live merchant checkout

## Success criteria
- User can complete: age gate → onboarding → scan → detail → markup → Find Wine → note → taste profile
- Premium gate blocks excess free scans with clear upgrade path
- QA suite covers wrong/empty scan, markup tiers, Find Wine ranking, uniqueness of PIN-like free limits

## Competitive context
Peers: Vivino, Wine-Searcher, CellarTracker, Decanta (SA), Palé (SA), SommelierX.  
Shops: Vivino Marketplace, Wine-Searcher merchants, Wine.com, Cybercellar, Wine Cellar SA, Port2Port.
