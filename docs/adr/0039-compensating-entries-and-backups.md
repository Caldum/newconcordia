# 0039 · Compensating entries and backups

Date: 2026-10-31 · Status: Accepted

## Context

Specification v3.1 section 12.6: automatic backups, PostgreSQL PITR, verified periodic restores, financial
reversal by compensating entries; the financial log is public and immutable.

## Decisions

1. **Reversal is a new transaction.** `admin_compensate` posts the original's legs crossed (kind
   `compensation`, key per original), once per original, with a reason; it is audited and listed. The ledger is
   append-only and stays so.
2. **Supply stays consistent.** Reversing a mint credits the issuer and is recorded as a burn; reversing a burn
   debits the sink and is recorded as a mint, so issuer and sink still equal the supply records.
3. **Scope.** Money only. Goods, offices and other state are fixed by their own procedures. Transactions that touch
   an escrow are refused: holds are released or captured through their own functions.
4. **Backups** are Supabase's daily backups plus PITR (an owner step). A monthly restore drill into a new project
   checks that currencies sum to zero, counts citizens and the latest job slot; it is logged in the runbook.

## Consequences

- The admin page has a compensation section with a preview of the legs.
- Rollback: header of `20261031090000_compensations.sql`.
