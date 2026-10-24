"use server";

import { requireAdmin } from "@/modules/admin/access";
import { teamStatuses, type TeamApplication } from "./team";

export type TeamInboxData = {
  rows: TeamApplication[];
  total: number;
  error: string;
};
export async function readTeamInbox(
  input: { query?: string; status?: string; page?: number } = {},
): Promise<TeamInboxData> {
  const { client } = await requireAdmin();
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(input.page) || 1)),
  );
  const text = String(input.query ?? "")
    .trim()
    .slice(0, 120);
  let request = client
    .from("team_applications")
    .select(
      "id,created_at,updated_at,kind,name,email,instagram,discipline,message,status,notes",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (input.status && Object.hasOwn(teamStatuses, input.status))
    request = request.eq("status", input.status);
  // Search travels in the action's POST body, never in a URL. A single SDK
  // filter keeps PostgREST syntax out of user input; '%' and '_' are literal.
  if (text)
    request = request.ilike(
      text.includes("@") ? "email" : "name",
      `%${text.replace(/[\\%_]/g, "\\$&")}%`,
    );
  const { data, count, error } = await request.range(
    (page - 1) * 25,
    page * 25 - 1,
  );
  if (error)
    return {
      rows: [],
      total: 0,
      error:
        "No pudimos cargar las consultas. Comprobá la migración del Team y reintentá.",
    };
  return { rows: data as TeamApplication[], total: count ?? 0, error: "" };
}
