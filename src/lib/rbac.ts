import { Role, MODULE_ACCESS } from "@/types";

const ALL_PROTECTED_PATHS = Object.values(MODULE_ACCESS).flat();

export function hasAccess(role: Role, path: string): boolean {
  const allowedPaths = MODULE_ACCESS[role] ?? [];

  // If the path starts with any of the role's allowed paths, grant access
  if (allowedPaths.some((allowed) => path.startsWith(allowed))) {
    return true;
  }

  // If the path is not under any protected module, it's a shared/public path — allow
  const isProtected = ALL_PROTECTED_PATHS.some((p) => path.startsWith(p));
  return !isProtected;
}
