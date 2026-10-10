import "server-only";
import { readEnvironment } from "./environment";

export function getEnvironment() { return readEnvironment(process.env); }
