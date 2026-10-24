export const teamStatuses = {
  new: "Nueva",
  reviewing: "En revisión",
  contacted: "Contactada",
  closed: "Cerrada",
} as const;
export const teamKinds = {
  athlete: "Atleta",
  teacher: "Profesor/a",
  both: "Atleta y profesor/a",
} as const;
export type TeamKind = keyof typeof teamKinds;
export type TeamStatus = keyof typeof teamStatuses;
export type TeamApplication = {
  id: string;
  created_at: string;
  updated_at: string;
  kind: TeamKind;
  name: string;
  email: string;
  instagram: string;
  discipline: string;
  message: string;
  status: TeamStatus;
  notes: string;
};
export type TeamInput = Pick<
  TeamApplication,
  "name" | "email" | "instagram" | "discipline" | "message" | "kind"
> & { consent: boolean };
export type TeamRequestState = {
  status: "idle" | "success" | "error";
  message: string;
  values?: TeamInput;
};

export function validateTeamInput(input: TeamInput): string | null {
  if (!Object.hasOwn(teamKinds, input.kind))
    return "Elegí si consultás como atleta, profesor/a o ambos.";
  if (input.name.length < 2 || input.name.length > 120)
    return "Revisá tu nombre y apellido.";
  if (
    input.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
  )
    return "Revisá tu email.";
  if (input.discipline.length < 2 || input.discipline.length > 120)
    return "Contanos cuál es tu disciplina o actividad.";
  if (input.instagram.length > 80 || input.message.length > 2000)
    return "El perfil o el mensaje es demasiado largo.";
  if (!input.consent)
    return "Necesitamos tu autorización para gestionar esta consulta.";
  return null;
}

export const teamSuccess =
  "Recibimos tu consulta. El equipo de STYLO va a revisarla.";
