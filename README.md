# DAVID V1 — DjamelBot Engine

> **Copyright © 2025 DJAMEL — All rights reserved**

## Overview

DAVID V1 is a high-performance Facebook Messenger bot engine built from the ground up by **DJAMEL**, integrating the best features of WHITE-V3 and Jarfis architectures into a unified, production-ready system.

## Features

- 🔥 **Custom Djamel-fca Library** — Supports c3c, JSON, Netscape, Header String cookies
- 🛡️ **20 Protection Layers** — Stealth, Keep-Alive, MQTT Health Check, Rate Limiting, and more
- ⚡ **GoatBot-Compatible Engine** — Full `global.GoatBot` pattern with MQTT + HTTP Long-Poll fallback
- 🌐 **iOS-Style Dashboard** — Real-time stats, cookie upload, command management
- 🎮 **9 Built-in Commands** — angel, divel, nick, nm, chats, groupimg, song, tik, uptime

## Commands

| Command | Description |
|---------|-------------|
| `/angel` | رسائل تلقائية دورية للغروبات |
| `/divel` | رسائل دورية مع انتظار عشوائي |
| `/nick`  | تغيير كنية جميع الأعضاء باستمرار |
| `/nm`    | قفل اسم الغروب |
| `/chats` | إدارة المحادثات والغروبات |
| `/groupimg` | تغيير وقفل صورة الغروب |
| `/song`  | البحث وتنزيل الأغاني من YouTube |
| `/tiktok` | تنزيل فيديو TikTok بدون علامة مائية |
| `/uptime` | وقت تشغيل البوت مع الإحصائيات |

## Setup

1. Add your Facebook cookies in `account.txt` or via the dashboard
2. Edit `config.json` with your settings
3. Run with `npm start`

## Architecture

```
index.js (Watchdog)
└── Goat.js (Main Engine)
    ├── Djamel-fca/ (Custom FCA Library)
    ├── src/engine/ (Core, Loader, Handler)
    ├── src/commands/ (9 Commands)
    ├── src/protection/ (20 Layers)
    └── src/dashboard/ (iOS-style Dashboard)
```

## Author

**DJAMEL** — Built with ❤️ for the community.
