import ApiService from "./apiService";

export interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

/** Matches Backend/models/Contact.js */
export type ContactMessageStatus = "new" | "in-progress" | "resolved";

export interface ContactMessage {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const contactApi = {
  submit: (payload: ContactPayload) => {
    return ApiService.post("/api/contact", payload);
  },

  getAll: () => {
    return ApiService.get<ContactMessage[]>("/api/contact");
  },
};

/** Admin + super admin only — GET/PATCH /api/admin/contact-messages (Bearer token required) */
export const adminContactApi = {
  getAll: () =>
    ApiService.get<ContactMessage[]>("/api/admin/contact-messages"),
  getById: (id: string) =>
    ApiService.get<ContactMessage>(`/api/admin/contact-messages/${id}`),
  updateStatus: (id: string, status: ContactMessageStatus) =>
    ApiService.patch<ContactMessage>(`/api/admin/contact-messages/${id}/status`, {
      status,
    }),
  deleteMessage: (id: string) =>
    ApiService.delete<{ message?: string }>(`/api/admin/contact-messages/${id}`),
};
