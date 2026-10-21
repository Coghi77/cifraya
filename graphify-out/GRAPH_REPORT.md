# Graph Report - cifraya  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 413 nodes · 573 edges · 50 communities (20 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fa224957`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 33
- Community 34
- Community 35
- Community 49

## God Nodes (most connected - your core abstractions)
1. `react` - 19 edges
2. `compilerOptions` - 15 edges
3. `scripts` - 11 edges
4. `@prisma/client` - 10 edges
5. `createReservation()` - 9 edges
6. `reverseNumber()` - 9 edges
7. `api()` - 8 edges
8. `loadAdmin()` - 8 edges
9. `preparePhoto()` - 8 edges
10. `lucide-react` - 8 edges

## Surprising Connections (you probably didn't know these)
- `createRaffle()` --calls--> `toDrawDate()`  [EXTRACTED]
  apps/web/src/App.tsx → apps/web/src/DrawScheduleEditor.tsx
- `createRaffle()` --calls--> `cardPackages()`  [EXTRACTED]
  apps/web/src/App.tsx → apps/web/src/StickerCardEditor.tsx
- `submit()` --calls--> `preparePhoto()`  [EXTRACTED]
  apps/web/src/AdminSale.tsx → apps/web/src/preparePhoto.ts
- `createReservation()` --calls--> `enqueuePaymentEmail()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/paymentEmails.ts
- `inversePrizeNumber()` --calls--> `reverseNumber()`  [EXTRACTED]
  apps/api/src/prizes.ts → apps/api/src/invertedNumbers.ts

## Import Cycles
- None detected.

## Communities (50 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (40): addPhotos(), AdminReservation, api(), ApiError, createRaffle(), currentServerTime(), expireAdminSession(), formatNumber() (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (23): AdminParticipantDetail(), money(), numberLabel(), ParticipantResponse, Reservation, statusLabel(), AdminReservationReview(), Detail (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (29): Stream, devDependencies, prisma, @prisma/client, tsx, @types/node, typescript, name (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (21): AdminRaffleDetail(), publishWinner(), adminRequest(), currency(), History, numberLabel(), NumberRow, Overview (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (25): dependencies, exceljs, fastify, @fastify/cors, @fastify/static, @prisma/client, zod, devDependencies (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (20): issueAdminSession(), verifyAdminSession(), drawFields, resolveDrawSchedule(), composeLotteryNumber(), createPublicCache(), adminAuthorized(), app (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (23): dependencies, lucide-react, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (12): BrandSelect(), numberCountOptions, Option, DrawMode, DrawScheduleEditor(), fromDrawDate(), toDrawDate(), EditableRaffle (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (3): database, proof, require

### Community 10 - "Community 10"
Cohesion: 0.26
Nodes (8): "Campaign", "EntryNumber", "Reservation", "CampaignPhoto", "PricePackage", "Winner", "NumberProposal", "PaymentProof"

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (6): createReservationExpirer(), raffleSales(), SaleRow, salesWorkbook(), db, @prisma/client

### Community 12 - "Community 12"
Cohesion: 0.36
Nodes (8): createEmailWorker(), drain(), kick(), emailConfigured(), enqueuePaymentEmail(), escapeHtml(), paymentEmail(), retryableEmailStatus()

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (7): inversePrizeNumber(), normalizePrizeInput(), prizeList, validPrizeSources(), campaignInput, input, zod

### Community 14 - "Community 14"
Cohesion: 0.28
Nodes (8): broadcast(), createReservation(), emailWorker, expireReservations, sessionKey(), timer, purchaseOffer(), validStickerQuantity()

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, module, moduleResolution, resolveJsonModule, skipLibCheck, strict, target

### Community 16 - "Community 16"
Cohesion: 0.57
Nodes (6): chooseBaseNumbers(), invertedValues(), reverseNumber(), HOLD_MS, selectable(), selectNumbers()

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.json

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (3): contentSecurityPolicy, registerSecurityHeaders(), fastify

### Community 20 - "Community 20"
Cohesion: 0.50
Nodes (3): inventory, inventorySet, times

## Knowledge Gaps
- **137 isolated node(s):** `AdminReservation`, `LookupResult`, `NumberProposal`, `Raffle`, `Reservation` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Community 11` to `Community 2`, `Community 4`, `Community 5`, `Community 9`, `Community 12`, `Community 16`, `Community 21`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `react` connect `Community 1` to `Community 0`, `Community 3`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `AdminReservation`, `LookupResult`, `NumberProposal` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06848357791754019 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06341463414634146 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._