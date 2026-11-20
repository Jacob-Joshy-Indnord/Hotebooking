/**
 * File: web/src/app/reports/utilisation/page.tsx
 *
 * Route for /reports/utilisation, the admin-only Utilisation report (tasks
 * task-o7w7zuWCezc and task-xR5tK2uAzH2). It wraps the UtilisationReport
 * client component in RequireAuth, so signed-out visitors go to /sign-in.
 * The admin guard is inside UtilisationReport: staff who open this URL
 * directly see an access-denied screen, and any 403 from the API also turns
 * into that screen with no data. The date-range form, validation and the
 * per-room table are in src/components/UtilisationReport.tsx, where they are
 * unit tested.
 *
 * Exports: metadata (page title) and the default UtilisationReportPage
 * component. No other functions.
 */
import type { Metadata } from "next";
import { RequireAuth } from "@/components/RequireAuth";
import { UtilisationReport } from "@/components/UtilisationReport";

export const metadata: Metadata = { title: "Utilisation report · RoomBook" };

export default function UtilisationReportPage() {
  return (
    <RequireAuth>
      <UtilisationReport />
    </RequireAuth>
  );
}
