import type { TeamApplication, TeamInput } from "./team";

export const teamPreviewKey = "stylo.team-applications-preview.v1";
export function readTeamPreview(): TeamApplication[] {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem(teamPreviewKey) ?? "[]",
    );
    return Array.isArray(data)
      ? data.filter((row): row is TeamApplication =>
          Boolean(
            row &&
            typeof row.id === "string" &&
            typeof row.email === "string" &&
            typeof row.status === "string",
          ),
        )
      : [];
  } catch {
    return [];
  }
}
export function addTeamPreview(input: TeamInput) {
  const rows = readTeamPreview();
  const now = new Date().toISOString();
  if (
    rows.some(
      (row) =>
        row.email === input.email &&
        Date.now() - Date.parse(row.created_at) < 15 * 60_000,
    )
  )
    return;
  const { consent: _consent, ...fields } = input;
  rows.unshift({
    ...fields,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    status: "new",
    notes: "",
  });
  localStorage.setItem(teamPreviewKey, JSON.stringify(rows.slice(0, 200)));
}
