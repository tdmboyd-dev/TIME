# TIME — AI ecosystem handoff

Baseline: `0fed2d69cc91c52a2c8e8aefbc1a48a6ae8b49fb`. Existing default: `master`. Repository: https://github.com/tdmboyd-dev/TIME.

Read existing AGENTS/work order/current handoff first. This file is integration context, not an additional work order or grant.

## Architecture and source anchors

Role: financial-domain. The current repair is honest containment, not an operational emergency brake. Do not connect live execution to Tevin until accepted.

Source anchors: `frontend/src/app/admin/page.tsx`, `scripts/test-emergency-truth.cjs`, `backend`, `src`. Paths are source locators, not an assertion that all internals were read. See the central path/hash ledger for inventory; human-read scope is narrower.

Inputs: Trusted account entitlement, market data/provenance, analysis request and separately authorized financial command.

Outputs: Analysis and actual broker/order/fill receipts where implemented; no inferred execution from UI status.

Declared root package scripts (source declarations; not all were executed):

```json
{
  "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
  "dev:backend": "ts-node-dev --respawn --transpile-only src/backend/index.ts",
  "dev:frontend": "cd frontend && npm run dev",
  "build": "tsc && cd frontend && npm run build",
  "build:backend": "tsc",
  "build:frontend": "cd frontend && npm run build",
  "start": "node dist/backend/index.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "lint": "eslint src --ext .ts,.tsx",
  "format": "prettier --write \"src/**/*.{ts,tsx}\"",
  "typecheck": "tsc --noEmit",
  "mobile:start": "cd mobile && npm start",
  "mobile:ios": "cd mobile && npm run ios",
  "mobile:android": "cd mobile && npm run android",
  "mobile:install": "cd mobile && npm install",
  "mobile:prebuild": "cd mobile && npm run prebuild",
  "mobile:build:ios": "cd mobile && npm run build:ios",
  "mobile:build:android": "cd mobile && npm run build:android"
}
```

## Current repair and proof

Removed simulated close/safe confirmation. Isolated component harness proves information dialog opens/dismisses with zero dispatch/timer effects.

This cycle: 1/1 passed for isolated component/handler harness. This is not whole-product acceptance.

## Next implementation contract

Work item `ECO-017`: Real server-owned inhibit/cancel/close/reconcile coordinator with durable account-scoped receipts, paper/live separation and separate live authorization.

Before dispatch bind principal, tenant/workspace/resource, canonical domain action, input/artifact revision digest, idempotency/correlation, account/recipient/cost ceiling and grant expiration where applicable. Resolve risk using server-owned action policy, not caller labels. Exact fields must adapt to existing ONE/domain contracts, not duplicate them.

Negative acceptance: wrong actor/tenant/scope, modified payload/target, expired/replayed approval, duplicate request, lost response, cancellation and restart. Domain owner retains authoritative receipt; unknown outcomes are reconciled before retry. Rights and consent follow the actual artifact/model/use.

Rollback: Preserve original source/data; revert only owned source change; reconcile external effects before retry or compensation.

## Integration truth

The new source catalog lists this repository as catalogued, with runtimeVerified=false and no executable tools. Local read-only discovery through ONE/API-MCP has separate integration proof. No discovery response authorizes execution or proves this domain is deployed. No callable MCP endpoint is asserted here; add an admitted adapter only after domain acceptance.

Highest-value measured upgrade: Unified financial evidence and risk ledger, with unknown outcomes reconciled before retries; measure partial-fill, cancellation and duplicate-order scenarios.
