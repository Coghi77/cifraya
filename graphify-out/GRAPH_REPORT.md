# Graph Report - cifraya  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 339 nodes · 442 edges · 36 communities (15 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `219afa20`
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
- Community 24
- Community 25
- Community 26
- Community 35

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `scripts` - 11 edges
3. `react` - 11 edges
4. `api()` - 8 edges
5. `loadAdmin()` - 8 edges
6. `reverseNumber()` - 8 edges
7. `compilerOptions` - 8 edges
8. `@prisma/client` - 8 edges
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

## Communities (36 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (40): addPhotos(), AdminReservation, api(), ApiError, createRaffle(), currentServerTime(), expireAdminSession(), formatNumber() (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (37): issueAdminSession(), verifyAdminSession(), chooseBaseNumbers(), invertedValues(), reverseNumber(), inversePrizeNumber(), normalizePrizeInput(), prizeList (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (29): Stream, devDependencies, prisma, @prisma/client, tsx, @types/node, typescript, name (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (23): dependencies, lucide-react, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (16): EditableRaffle, EditRaffle(), ManualNumbers(), NumberRow, date(), labels, money(), Order (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (21): dependencies, fastify, @fastify/cors, @fastify/static, @prisma/client, zod, devDependencies, tsx (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (8): createReservationExpirer(), ticketPrefixRange(), ticketSearchWhere(), db, @prisma/client, database, proof, require

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (11): AdminParticipantDetail(), money(), numberLabel(), ParticipantResponse, Reservation, statusLabel(), AdminReservationReview(), Detail (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.26
Nodes (8): "Campaign", "EntryNumber", "Reservation", "CampaignPhoto", "PricePackage", "Winner", "NumberProposal", "PaymentProof"

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (9): AdminRaffleDetail(), publishWinner(), adminRequest(), currency(), History, numberLabel(), NumberRow, Overview (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.36
Nodes (8): createEmailWorker(), drain(), kick(), emailConfigured(), enqueuePaymentEmail(), escapeHtml(), paymentEmail(), retryableEmailStatus()

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, module, moduleResolution, resolveJsonModule, skipLibCheck, strict, target

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.json

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (3): inventory, inventorySet, times

## Knowledge Gaps
- **129 isolated node(s):** `AdminReservation`, `LookupResult`, `NumberProposal`, `Raffle`, `Reservation` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 182 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Community 6` to `Community 1`, `Community 2`, `Community 11`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `react` connect `Community 4` to `Community 8`, `Community 0`, `Community 10`, `Community 3`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `AdminReservation`, `LookupResult`, `NumberProposal` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06708595387840671 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06802721088435375 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._