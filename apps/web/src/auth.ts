import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const authority = import.meta.env.VITE_OIDC_AUTHORITY as string | undefined;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
const apiScope = import.meta.env.VITE_OIDC_API_SCOPE as string | undefined;

export const authenticationConfigured = Boolean(authority && clientId && apiScope);
export const usesDevelopmentIdentity =
  import.meta.env.DEV && !authenticationConfigured;

function createManager(): UserManager | null {
  if (!authority || !clientId || !apiScope) return null;
  return new UserManager({
    authority,
    client_id: clientId,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: window.location.origin,
    response_type: "code",
    scope: `openid profile email ${apiScope}`,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: false,
    monitorSession: false,
    loadUserInfo: false,
  });
}

const manager = createManager();

export async function completeSignInRedirect(): Promise<void> {
  if (window.location.pathname !== "/auth/callback") return;
  if (!manager) throw new Error("O login OIDC ainda não foi configurado.");
  await manager.signinRedirectCallback();
  window.history.replaceState({}, document.title, "/");
}

export async function getAccessToken(): Promise<string | null> {
  if (!manager) return null;
  const user = await manager.getUser();
  if (user && !user.expired && typeof user.expires_in === "number" && user.expires_in > 60) {
    return user.access_token;
  }

  if (user) await manager.removeUser();
  return null;
}

export async function beginSignIn(): Promise<void> {
  if (!manager) throw new Error("O login OIDC ainda não foi configurado.");
  await manager.signinRedirect();
}

export async function signOut(): Promise<void> {
  if (!manager) return;
  const user = await manager.getUser();
  if (user) await manager.signoutRedirect({ id_token_hint: user.id_token });
}
