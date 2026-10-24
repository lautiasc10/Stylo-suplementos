"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/modules/admin/access";
import {
  teamStatuses,
  teamSuccess,
  validateTeamInput,
  type TeamInput,
  type TeamRequestState,
} from "./team";

export async function submitTeamApplication(
  _previous: TeamRequestState,
  form: FormData,
): Promise<TeamRequestState> {
  if (String(form.get("website") ?? "").trim())
    return { status: "success", message: teamSuccess };
  const text = (key: string) =>
    typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
  const input: TeamInput = {
    kind: text("kind") as TeamInput["kind"],
    name: text("name"),
    email: text("email").toLowerCase(),
    instagram: text("instagram"),
    discipline: text("discipline"),
    message: text("message"),
    consent: form.get("consent") === "on",
  };
  const fail = (message: string): TeamRequestState => ({
    status: "error",
    message,
    values: input,
  });
  const invalid = validateTeamInput(input);
  if (invalid) return fail(invalid);
  const client = await createSupabaseServerClient();
  if (!client)
    return fail(
      "El formulario no está disponible en este momento. Tus datos no se guardaron.",
    );
  try {
    const { data, error } = await client.rpc("submit_team_application", {
      p_payload: input,
    });
    if (error || !data)
      return fail(
        error?.code === "P0001"
          ? "Esperá unos minutos antes de volver a enviar una consulta."
          : "No pudimos guardar tu consulta. Intentá nuevamente más tarde.",
      );
    return { status: "success", message: teamSuccess };
  } catch {
    return fail(
      "No pudimos guardar tu consulta. Intentá nuevamente más tarde.",
    );
  }
}

export async function reviewTeamApplication(form: FormData) {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? ""),
    status = String(form.get("status") ?? ""),
    notes = String(form.get("notes") ?? "").trim();
  const version = String(form.get("updatedAt") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !Object.hasOwn(teamStatuses, status) ||
    notes.length > 2000 ||
    !Number.isFinite(Date.parse(version))
  )
    return { error: "Revisá los datos de la consulta." };
  const { error } = await client.rpc("review_team_application", {
    p_id: id,
    p_status: status,
    p_notes: notes,
    p_expected_updated_at: version,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "La consulta cambió en otra sesión. Recargá antes de guardar."
          : "No pudimos guardar los cambios.",
    };
  revalidatePath("/admin/atletas");
  return { error: "" };
}
