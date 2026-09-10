import { getDb as getLibDb } from "../lib/db";
import * as schema from "./schema";

export function getDb() {
  return getLibDb();
}

export { schema };
