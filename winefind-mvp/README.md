# Vintly (Wine Find–style MVP)

Demo web app implementing the Wine Find pocket-sommelier loop:

**scan label/menu → scores + tasting notes + market price → taste profile → Find Wine → markup / smart savings**

Reference app: [Wine Find on the App Store](https://apps.apple.com/app/id6740998562).

## Run

```bash
cd winefind-mvp
npm install
npm run dev
npm test
npm run build
```

## Plan coverage

| Plan item | Location |
| --- | --- |
| Product brief | [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md), `/brief` |
| Wine catalog | [src/data/wines.ts](./src/data/wines.ts) |
| Label scan | `/scan` + `src/lib/scan.ts` |
| Menu scan | `/menu` |
| Wine detail | `/wine/:id` |
| Smart savings | markup on detail + menu list |
| Taste profile | `/profile` |
| Find Wine | `/find` |
| Notes / history | detail + profile |
| Auth + sync | `/account` (localStorage) |
| Premium / IAP | `/account` demo unlock |
| Compliance | `/compliance`, `/privacy` |
| QA | `npm test` |
| Launch | [LAUNCH.md](./LAUNCH.md) |
| Similar shops | [SIMILAR.md](./SIMILAR.md) |
| Google Scholar articles | [ARTICLES.md](./ARTICLES.md) |

## Stack

Vite · React 19 · TypeScript · React Router · Vitest
