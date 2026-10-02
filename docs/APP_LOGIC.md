# Application logic map

This file is a high-level map only. The detailed clinical invariants in `AGENTS.md` and the deterministic regression tests are authoritative.

## Working night

The operational night is interpreted in `Europe/Malta` and runs from 19:00 to 07:00. Before 07:00 belongs to the previous operational date; after the duty closes, daytime selection advances to the next roster night. DST handover uses elapsed-time equality rather than hard-coded annual dates.

## Canonical plan

Night, Changes, Breaks, summaries and copied/shared operational views must derive from the same effective plan. Standard six-person staffing is automatic. Five-person and seven-person exceptions preserve the established decision rules, and incomplete plans remain explicitly provisional.

## Writes

Shared staffing, allocation and override mutations use the protected version-aware RPC boundary and include the running application version. Offline data is a read-only fallback, not a mutation queue. Stale or conflicting writes must refresh and require review rather than silently overwriting newer data.

## UI routing

Night, Changes, Breaks and Chat are the stable destinations. The centre Actions control routes users into those existing workflows and must not become a parallel mutation system.

## Testing

Date boundaries, rotation integrity, staffing counts, concurrency, update safety and source ownership are deterministic regression concerns. Visual-only work should avoid touching these rules and should use the fast verification path before browser review.
