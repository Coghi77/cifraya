# Graph Report - cifraya  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 219 nodes · 279 edges · 15 communities (13 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f408ac8b`
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

## Communities (15 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (28): devDependencies, tsx, typescript, tsx, name, private, type, version (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (22): api(), App(), addPhotos(), createRaffle(), goHome(), goPublic(), loadAdmin(), loadRaffles() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (24): dependencies, lucide-react, react, react-dom, devDependencies, @types/react, @types/react-dom, typescript (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (17): AdminReservationReview(), Detail, money(), AdminReservation, EntryNumber, formatNumber(), LookupResult, money() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (15): AdminParticipantDetail(), money(), numberLabel(), ParticipantResponse, Reservation, statusLabel(), AdminRaffleDetail(), publishWinner() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (15): devDependencies, prisma, @prisma/client, tsx, @types/node, typescript, @prisma/client, tsx (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.26
Nodes (8): "Campaign", "EntryNumber", "Reservation", "CampaignPhoto", "PricePackage", "Winner", "NumberProposal", "PaymentProof"

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

### Community 12 - "Community 12"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

## Knowledge Gaps
- **111 isolated node(s):** `Detail`, `AdminReservation`, `EntryNumber`, `LookupResult`, `NumberProposal` (+106 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 133 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `Community 6` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.319) - this node is a cross-community bridge._
- **Why does `react` connect `Community 4` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 1` to `Community 3`, `Community 4`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **What connects `Detail`, `AdminReservation`, `EntryNumber` to the rest of the system?**
  _111 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._