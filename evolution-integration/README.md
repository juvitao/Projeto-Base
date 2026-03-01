# Evolution API Integration Pack

Extracted from **Lever System** for reuse in other projects.

## Structure

```
evolution-integration/
├── edge-functions/
│   ├── whatsapp-evolution/index.ts  ← Core: create/connect/send/status (397 lines)
│   ├── send-whatsapp/index.ts       ← Simplified send with retry (123 lines)
│   ├── diagnose-whatsapp/index.ts   ← Diagnostics & test message (109 lines)
│   ├── setup-lead-trigger/index.ts  ← DB trigger for auto-notify leads (220 lines)
│   ├── receive-external-lead/index.ts ← Webhook to receive leads (108 lines)
│   └── import-existing-leads/index.ts ← Batch import leads (122 lines)
├── frontend/
│   ├── useWhatsApp.ts               ← React hook: chats, messages, send (326 lines)
│   ├── WhatsApp.tsx                  ← Full chat UI page (328 lines)
│   └── Connections.tsx               ← Connection management UI (1259 lines)
├── api/
│   └── notify-lead.js               ← Vercel serverless proxy (40 lines)
├── migrations/
│   └── create_whatsapp_connections.sql ← Table + RLS (51 lines)
└── scripts/
    └── probe_evolution.js            ← Endpoint discovery script (51 lines)
```

## Environment Variables Required

| Variable | Where | Description |
|---|---|---|
| `EVOLUTION_API_URL` | Supabase Secrets | e.g. `https://evo.jotabot.site` |
| `EVOLUTION_API_KEY` | Supabase Secrets | API key from Evolution dashboard |
| `SUPABASE_URL` | Supabase auto | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase auto | Service role key |
| `COMERCIAL_WHATSAPP_NUMBER` | Supabase Secrets | Number that receives lead notifications |

## API Server

Uses **Evolution API v2.x** with **WHATSAPP-BAILEYS** integration.
