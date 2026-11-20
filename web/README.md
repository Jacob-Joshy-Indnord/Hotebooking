<!--
File: web/README.md

Developer guide for the RoomBook web UI, the Next.js frontend in this
folder. It explains how to install dependencies, run the dev server
against the FastAPI service through the /api rewrite (API_ORIGIN), run the
Vitest + React Testing Library suite, typecheck and build. It lists the
pages (sign-in, My bookings with cancel, Utilisation report) and where
their code and tests live under src/. It also records the interpretations
agreed with the manager: API key in sessionStorage sent as X-API-Key, role
detection by probing the admin report endpoint, "Room #<id>" display, the
assumed cancel endpoint path, and report dates as UTC days. It contains no
code or functions.
-->
# RoomBook web

Next.js 15 (App Router, TypeScript, Tailwind CSS v4) UI over the RoomBook FastAPI service.
The UI holds no business rules: it renders API results and error codes.

## Commands

```bash
npm install
API_ORIGIN=http://127.0.0.1:8000 npm run dev   # http://0.0.0.0:8080, /api/* → FastAPI
npm test                                       # Vitest + React Testing Library, API mocked
npm run typecheck
npm run build && npm start
```

## Pages

| Route | Who | Code | Tests |
| --- | --- | --- | --- |
| `/sign-in` | everyone | `src/components/SignInForm.tsx` | `SignInForm.test.tsx` |
| `/bookings` | signed-in users | `src/components/MyBookings.tsx` | `MyBookings.test.tsx`, `CancelBooking.test.tsx` |
| `/reports/utilisation` | admins | `src/components/UtilisationReport.tsx` | `UtilisationReport.test.tsx`, `AdminAccess.test.tsx` |

The API client is `src/lib/api.ts`; the session (key and role) is in `src/lib/session.ts`.

## Agreed interpretations

- The per-user API key is pasted once, checked with `GET /bookings/mine`, kept in `sessionStorage` and sent as `X-API-Key`. Sign out clears it.
- There is no identity endpoint, so the role is found at sign-in by calling `GET /reports/utilisation` for today: 200 means admin, anything else means staff. The role only hides navigation; the report page also handles a 403, and the API enforces access.
- My bookings keeps the API order (upcoming ascending, then past most recent first) and shows times in the browser's time zone. Rooms show as `Room #<id>`, because the API returns only `room_id`.
- Cancel calls `POST /bookings/{id}/cancel` (task-szGIMuZv__4, not yet built: it returns 404 until then, which the UI shows as an error). The path is defined only in `cancelBooking()`.
- Report dates are whole UTC days sent as `YYYY-MM-DD`, both inclusive.
