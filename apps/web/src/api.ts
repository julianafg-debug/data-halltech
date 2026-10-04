import type { AppContext, Category, RequestSummary, ServiceRequest } from "./types";
import { getAccessToken } from "./auth";

interface ApiErrorBody {
  message?: string;
  field_errors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("Não foi possível conectar à Central Hall. Verifique sua conexão.", 0);
  }

  if (!response.ok) {
    const body = await response.json().catch((): ApiErrorBody => ({}));
    throw new ApiError(
      body.message ?? "Ocorreu um erro ao processar sua solicitação.",
      response.status,
      body.field_errors ?? [],
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  getContext: () => apiRequest<AppContext>("/api/v1/me"),
  getCategories: (condominiumId: string) =>
    apiRequest<{ items: Category[] }>(`/api/v1/condominiums/${condominiumId}/categories`),
  getRequests: (condominiumId: string, cursor?: string | null) => {
    const query = new URLSearchParams({ limit: "30" });
    if (cursor) query.set("cursor", cursor);
    return apiRequest<{
      items: ServiceRequest[];
      summary: RequestSummary;
      next_cursor: string | null;
    }>(
      `/api/v1/condominiums/${condominiumId}/service-requests?${query.toString()}`,
    );
  },
  createRequest: (
    condominiumId: string,
    input: {
      unit_id: string | null;
      location_label: string | null;
      category_id: string;
      subject: string;
      description: string;
    },
    idempotencyKey: string,
  ) =>
    apiRequest<ServiceRequest>(
      `/api/v1/condominiums/${condominiumId}/service-requests`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(input),
      },
    ),
};
