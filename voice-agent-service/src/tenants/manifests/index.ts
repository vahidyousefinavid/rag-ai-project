import { TenantManifest } from '../tenant.types';
import { vehiclePartsManifest } from './vehicle-parts.manifest';

/**
 * The tenant registry. Onboarding a new business = adding one manifest here — the
 * agent core (src/agent) never changes.
 */
export const TENANT_MANIFESTS: Record<string, TenantManifest> = {
  [vehiclePartsManifest.id]: vehiclePartsManifest,
};
