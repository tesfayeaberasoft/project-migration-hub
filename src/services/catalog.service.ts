import type { HotelService, PriceRequest, ServiceCategory } from "@/types";
import { api } from "./http";

export interface ServiceInput {
  name: string;
  category: ServiceCategory;
  price: number;
  available: boolean;
  priceReason?: string | undefined;
}

export const catalogService = {
  list: () => api.get<HotelService[]>("/services"),
  create: (input: ServiceInput) => api.post<HotelService>("/services", input),
  /** Price changes are queued for Finance Manager approval. */
  update: (id: string, input: Partial<ServiceInput>) => api.put<HotelService>(`/services/${id}`, input),
  priceRequests: () => api.get<PriceRequest[]>("/price-requests"),
  approvePrice: (id: string) => api.post<PriceRequest>(`/price-requests/${id}/approve`),
  rejectPrice: (id: string) => api.post<PriceRequest>(`/price-requests/${id}/reject`),
};
