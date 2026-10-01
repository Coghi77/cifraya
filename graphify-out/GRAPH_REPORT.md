# Graph Report - cifraya  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 220 nodes · 279 edges · 14 communities (12 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8a33eb9`
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

## God Nodes (most connected - your core abstractions)
1. `App()` - 30 edges
2. `compilerOptions` - 15 edges
3. `scripts` - 10 edges
4. `compilerOptions` - 8 edges
5. `api()` - 7 edges
6. `loadAdmin()` - 7 edges
7. `"Campaign"` - 7 edges
8. `loadRaffles()` - 6 edges
9. `AdminRaffleDetail()` - 6 edges
10. `react` - 6 edges

## Surprising Connections (you probably didn't know these)
- `"CampaignPhoto"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20260930000002_campaign_photos/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"PricePackage"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20261001000000_packages_and_winners/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"NumberProposal"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20261001000001_payment_proofs_and_random_selection/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"PaymentProof"` --references--> `"Reservation"`  [EXTRACTED]
  prisma/migrations/20261001000001_payment_proofs_and_random_selection/migration.sql → prisma/migrations/20260930000000_initial/migration.sql
- `"Winner"` --references--> `"Campaign"`  [EXTRACTED]
  prisma/migrations/20261001000000_packages_and_winners/migration.sql → prisma/migrations/20260930000000_initial/migration.sql

## Import Cycles
- None detected.

## Communities (14 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (32): devDependencies, tsx, typescript, tsx, name, private, scripts, build (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (24): AdminParticipantDetail(), money(), numberLabel(), ParticipantResponse, Reservation, statusLabel(), AdminReservationReview(), Detail (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (22): api(), App(), addPhotos(), createRaffle(), goHome(), goPublic(), loadAdmin(), loadRaffles() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (24): dependencies, lucide-react, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (16): adminSessions, app, broadcast(), campaignInput, db, expireReservations(), failedLogins, packageSelect (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.26
Nodes (8): "Campaign", "EntryNumber", "Reservation", "CampaignPhoto", "PricePackage", "Winner", "NumberProposal", "PaymentProof"

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (9): AdminRaffleDetail(), publishWinner(), adminRequest(), currency(), History, numberLabel(), NumberRow, Overview (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (10): scripts, build, db:deploy, db:generate, db:migrate, db:seed, dev, dev:api (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, module, moduleResolution, resolveJsonModule, skipLibCheck, strict, target

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.json

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (6): dependencies, fastify, @fastify/cors, @fastify/static, @prisma/client, zod

## Knowledge Gaps
- **112 isolated node(s):** `Detail`, `AdminReservation`, `EntryNumber`, `LookupResult`, `NumberProposal` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.319) - this node is a cross-community bridge._
- **Why does `react` connect `Community 1` to `Community 3`, `Community 7`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **What connects `Detail`, `AdminReservation`, `EntryNumber` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07954545454545454 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._