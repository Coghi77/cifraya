# Graph Report - cifraya  (2026-10-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 296 nodes · 393 edges · 26 communities (12 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b191fe4e`
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
- Community 19
- Community 25

## God Nodes (most connected - your core abstractions)
1. `App()` - 31 edges
2. `compilerOptions` - 15 edges
3. `scripts` - 11 edges
4. `react` - 9 edges
5. `api()` - 8 edges
6. `loadAdmin()` - 8 edges
7. `compilerOptions` - 8 edges
8. `reverseNumber()` - 7 edges
9. `"Campaign"` - 7 edges
10. `addPhotos()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `App()` --indirect_call--> `startRealtime()`  [INFERRED]
  apps/web/src/App.tsx → apps/web/src/realtime.ts
- `"CampaignPhoto"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20260930000002_campaign_photos/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"PricePackage"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20261001000000_packages_and_winners/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"NumberProposal"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20261001000001_payment_proofs_and_random_selection/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"PaymentProof"` --references--> `"Reservation"`  [EXTRACTED]
  prisma/migrations/20261001000001_payment_proofs_and_random_selection/migration.sql → prisma/migrations/20260930000000_initial/migration.sql

## Import Cycles
- None detected.

## Communities (26 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (39): issueAdminSession(), verifyAdminSession(), chooseBaseNumbers(), invertedValues(), reverseNumber(), inversePrizeNumber(), normalizePrizeInput(), prizeList (+31 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (27): AdminReservation, coverOf(), formatNumber(), InvertedChoice(), LookupResult, money(), NumberProposal, offersFor() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (28): dependencies, lucide-react, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (29): Stream, devDependencies, prisma, @prisma/client, tsx, @types/node, typescript, name (+21 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (23): api(), ApiError, App(), addPhotos(), createRaffle(), expireAdminSession(), generateNumbers(), goHome() (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (21): dependencies, fastify, @fastify/cors, @fastify/static, @prisma/client, zod, devDependencies, tsx (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (15): AdminParticipantDetail(), money(), numberLabel(), ParticipantResponse, Reservation, statusLabel(), AdminRaffleDetail(), publishWinner() (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.26
Nodes (8): "Campaign", "EntryNumber", "Reservation", "CampaignPhoto", "PricePackage", "Winner", "NumberProposal", "PaymentProof"

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, module, moduleResolution, resolveJsonModule, skipLibCheck, strict, target

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.json

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (3): inventory, inventorySet, times

## Knowledge Gaps
- **121 isolated node(s):** `EditableRaffle`, `AdminReservation`, `LookupResult`, `NumberProposal`, `Raffle` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 159 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `@prisma/client` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `react` connect `Community 1` to `Community 2`, `Community 6`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `App()` (e.g. with `onPopState()` and `refresh()`) actually correct?**
  _`App()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `EditableRaffle`, `AdminReservation`, `LookupResult` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05656565656565657 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07539118065433854 - nodes in this community are weakly interconnected._