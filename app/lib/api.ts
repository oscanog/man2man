/**
 * Convex API export
 * 
 * This file re-exports the API from convexAPI.ts.
 * Use this file to import the Convex API throughout your app.
 * 
 * Usage:
 *   import { api } from "@/lib/api";
 *   const data = useQuery(api.users.getByDevice, { deviceId });
 *   const createUser = useMutation(api.users.upsert);
 */

export { api, type FunctionReference } from "./convexAPI";
