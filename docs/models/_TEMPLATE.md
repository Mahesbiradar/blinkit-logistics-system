# <Model name>

## Purpose
<1-2 sentences: what real-world thing this represents and why it exists>

## Source files
- Model: <path>
- Migration/Schema: <path>
- Controller/Service: <path>
- Routes: <path>
- Validators: <path>
- Tests: <path or "none">

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
<e.g. has_many / belongs_to / many_to_many>

## Indexes
<list with column(s) and whether unique>

## Validations & business rules
- <bullet each rule, including ones enforced in code rather than DB>

## State / status (if applicable)
<list states and allowed transitions, or "N/A">

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|

## Lifecycle hooks / side effects
<callbacks, events emitted, jobs queued, or "none">

## Open questions / known limitations
<anything inconsistent, TODO comments found, or design choices that look intentional but aren't documented>
