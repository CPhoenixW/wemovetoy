import { SetMetadata } from "@nestjs/common";

/**
 * Keep the role type structural so this common package does not depend on a
 * generated Prisma client at compile time.
 */
export type AppRole = "USER" | "DEALER" | "ADMIN";

export const ROLES_KEY = "roles";

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
