# Graph Report - cifraya  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 363 nodes · 479 edges · 42 communities (16 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc1a68de`
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
- Community 28
- Community 29
- Community 30
- Community 41

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `react` - 14 edges
3. `scripts` - 11 edges
4. `api()` - 8 edges
5. `loadAdmin()` - 8 edges
6. `reverseNumber()` - 8 edges
7. `@prisma/client` - 8 edges
8. `compilerOptions` - 8 edges
9. `"Campaign"` - 7 edges
10. `addPhotos()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `"CampaignPhoto"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20260930000002_campaign_photos/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"PricePackage"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20261001000000_packages_and_winners/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"NumberProposal"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20261001000001_payment_proofs_and_random_selection/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"PaymentProof"` --references--> `"Reservation"`  [EXTRACTED]
  prisma/migrations/20261001000001_payment_proofs_and_random_selection/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `adminAuthorized()` --calls--> `verifyAdminSession()`  [EXTRACTED]
  apps/api/src/server.ts → apps/api/src/adminSession.ts

## Import Cycles
- None detected.

## Communities (42 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (48): addPhotos(), AdminReservation, api(), ApiError, createRaffle(), currentServerTime(), expireAdminSession(), formatNumber() (+40 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (45): issueAdminSession(), verifyAdminSession(), chooseBaseNumbers(), invertedValues(), reverseNumber(), composeLotteryNumber(), inversePrizeNumber(), normalizePrizeInput() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (29): Stream, devDependencies, prisma, @prisma/client, tsx, @types/node, typescript, name (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (23): dependencies, lucide-react, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): dependencies, fastify, @fastify/cors, @fastify/static, @prisma/client, zod, devDependencies, tsx (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (11): AdminParticipantDetail(), money(), numberLabel(), ParticipantResponse, Reservation, statusLabel(), AdminReservationReview(), Detail (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (10): AdminRaffleDetail(), publishWinner(), adminRequest(), currency(), History, numberLabel(), NumberRow, Overview (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.26
Nodes (8): "Campaign", "EntryNumber", "Reservation", "CampaignPhoto", "PricePackage", "Winner", "NumberProposal", "PaymentProof"

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (3): database, proof, require

### Community 10 - "Community 10"
Cohesion: 0.36
Nodes (8): createEmailWorker(), drain(), kick(), emailConfigured(), enqueuePaymentEmail(), escapeHtml(), paymentEmail(), retryableEmailStatus()

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, module, moduleResolution, resolveJsonModule, skipLibCheck, strict, target

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.json

### Community 14 - "Community 14"
Cohesion: 0.47
Nodes (5): date(), labels, money(), Order, OrderDetail()

### Community 15 - "Community 15"
Cohesion: 0.47
Nodes (5): MoreWinners(), positionName, prizeFor(), WinnerResult, WinnersPodium()

### Community 16 - "Community 16"
Cohesion: 0.50
Nodes (3): inventory, inventorySet, times

## Knowledge Gaps
- **130 isolated node(s):** `EditableRaffle`, `AdminReservation`, `LookupResult`, `NumberProposal`, `Raffle` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 192 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Community 1` to `Community 9`, `Community 10`, `Community 2`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `react` connect `Community 0` to `Community 3`, `Community 6`, `Community 7`, `Community 14`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `EditableRaffle`, `AdminReservation`, `LookupResult` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05217391304347826 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.052083333333333336 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._