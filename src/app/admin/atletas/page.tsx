import { TeamInbox } from "@/components/admin/team-inbox";
import { readTeamInbox } from "@/modules/storefront/team-inbox-actions";

export default async function TeamInboxPage() {
  const initial = await readTeamInbox();
  return <TeamInbox initial={initial} />;
}
