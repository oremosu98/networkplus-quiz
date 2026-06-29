# Decision Log
Running log of project decisions (notes tagged `#decision`). Capture new ones from the Decision template.

## Auto (Dataview)
```dataview
TABLE status, cert, updated FROM #decision SORT updated DESC
```

### Manual (fallback if Dataview off)
- [[ADR-001-m5-supabase-session-cookies]]
- [[ADR-002-rbac-admin-surface]]
