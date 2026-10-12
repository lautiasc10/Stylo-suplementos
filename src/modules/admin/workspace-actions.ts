"use server";
import { readAdminWorkspace } from "./workspace";

export async function refreshAdminWorkspace() {
  return readAdminWorkspace();
}
