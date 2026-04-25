import ApiService from "./apiService";

export type InboxStatus = "open" | "closed" | "pending";

export interface InboxMessage {
  id: string;
  conversationId?: string;
  senderType: "customer" | "admin";
  senderName: string;
  senderEmail: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export interface InboxConversationListItem {
  id: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  status: InboxStatus;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string | null;
  preview: string;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface InboxConversationDetail extends InboxConversationListItem {
  messages: InboxMessage[];
}

export interface CreateInboxBody {
  customerName: string;
  customerEmail?: string;
  subject: string;
  text: string;
  senderName?: string;
  senderEmail?: string;
}

export interface AppendMessageBody {
  text: string;
  senderType: "customer" | "admin";
  senderName?: string;
  senderEmail?: string;
}

export const inboxApi = {
  list: (search?: string) => {
    const q = search?.trim();
    const suffix = q ? `?search=${encodeURIComponent(q)}` : "";
    return ApiService.get<InboxConversationListItem[]>(`/api/inbox${suffix}`);
  },

  getById: (id: string) => ApiService.get<InboxConversationDetail>(`/api/inbox/${id}`),

  create: (body: CreateInboxBody) =>
    ApiService.post<InboxConversationDetail>("/api/inbox", body),

  appendMessage: (id: string, body: AppendMessageBody) =>
    ApiService.post<InboxConversationDetail>(`/api/inbox/${id}/messages`, body),

  markRead: (id: string) => ApiService.patch<InboxConversationListItem>(`/api/inbox/${id}/read`, {}),

  updateStatus: (id: string, status: InboxStatus) =>
    ApiService.patch<InboxConversationListItem>(`/api/inbox/${id}/status`, { status }),
};
