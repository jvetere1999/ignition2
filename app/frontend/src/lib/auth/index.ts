/**
 * Auth module - Backend API based authentication
 *
 * All auth logic lives in the Rust backend at api.ecent.online.
 * Frontend performs 0% auth logic beyond storing and forwarding cookies.
 */

// API functions for direct auth operations
export {
  getSession,
  getProviders,
  getSignInUrl,
  signOut,
  verifyAge,
  acceptTos,
  type AuthUser,
  type SessionResponse,
  type AuthProvider as AuthProviderInfo,  // Renamed to avoid conflict with component
} from './api-auth';

// React context and hooks (for client components)
export {
  AuthProvider,
  SessionProvider,
  useAuth,
  useRequireAuth,
} from './AuthProvider';

// NOTE: Server-side auth uses next/headers and CANNOT be re-exported here.
// Server components must import directly:
//   import { auth } from '@/lib/auth/server';
