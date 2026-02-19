/**
 * Convex API export
 * 
 * This file re-exports the generated API from the backend-convex folder.
 * 
 * IMPORTANT: To use the actual Convex API with full type safety:
 * 
 * 1. Navigate to the backend-convex folder:
 *    cd ../backend-convex
 * 
 * 2. Run the Convex dev server to generate types:
 *    npx convex dev
 * 
 * 3. Update the import below to point to the generated API:
 *    export { api } from "../../backend-convex/convex/_generated/api";
 * 
 * For now, this file exports a stub that allows the app to compile.
 * You'll need to update tsconfig.json with a path alias for the actual import:
 * 
 *   "compilerOptions": {
 *     "paths": {
 *       "@convex-api": ["../backend-convex/convex/_generated/api"]
 *     }
 *   }
 */

// Stub API for development - replace with actual generated API
const locationSessionEndpoints = {
  create: "locationSessions/create" as const,
  join: "locationSessions/join" as const,
  get: "locationSessions/get" as const,
  getByCode: "locationSessions/getByCode" as const,
  getActiveForUser: "locationSessions/getActiveForUser" as const,
  close: "locationSessions/close" as const,
  getAllActive: "locationSessions/getAllActive" as const,
}

export const api = {
  users: {
    upsert: "users/upsert" as const,
    getByDevice: "users/getByDevice" as const,
    heartbeat: "users/heartbeat" as const,
    setOffline: "users/setOffline" as const,
    getOnlineUsers: "users/getOnlineUsers" as const,
  },
  locationSessions: locationSessionEndpoints,
  sessions: locationSessionEndpoints,
  locations: {
    update: "locations/update" as const,
    getPartnerLocation: "locations/getPartnerLocation" as const,
    getMyLocation: "locations/getMyLocation" as const,
    getHistory: "locations/getHistory" as const,
    getBothLocations: "locations/getBothLocations" as const,
  },
};

// Type helper for function references
export type FunctionReference<Type extends "query" | "mutation" | "action" = "query" | "mutation" | "action"> = {
  _type: Type;
  _args: Record<string, unknown>;
  _return: unknown;
  toString(): string;
};
