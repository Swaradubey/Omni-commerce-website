import ApiService from './apiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IssueType =
  | 'order_not_delivered'
  | 'wrong_product_received'
  | 'refund_issue'
  | 'payment_issue'
  | 'cancel_order_issue'
  | 'order_tracking_issue'
  | 'return_replacement_issue'
  | 'other';

export type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  _id: string;
  user: string | { _id: string; name: string; email: string; role: string };
  userName?: string;
  userEmail?: string;
  order?: string | { _id: string; orderId: string; totalPrice: number; orderStatus: string; createdAt: string };
  orderRef?: string;
  subject: string;
  issueType: IssueType;
  description: string;
  status: TicketStatus;
  adminResponse?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  subject: string;
  issueType: IssueType;
  description: string;
  /** Optional Mongo _id of the linked order */
  orderId?: string;
}

// ─── Human-readable labels ────────────────────────────────────────────────────

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  order_not_delivered: 'Order Not Delivered',
  wrong_product_received: 'Wrong Product Received',
  refund_issue: 'Refund Issue',
  payment_issue: 'Payment Issue',
  cancel_order_issue: 'Cancel Order Issue',
  order_tracking_issue: 'Order Tracking Issue',
  return_replacement_issue: 'Return / Replacement Issue',
  other: 'Other',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

// ─── API calls ────────────────────────────────────────────────────────────────

/** Create a new support ticket (authenticated user) */
export async function createSupportTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
  const res = await ApiService.post<SupportTicket>('/support-tickets', payload);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to submit support ticket');
  }
  return res.data;
}

/** Get the logged-in user's own tickets */
export async function getMyTickets(): Promise<SupportTicket[]> {
  const res = await ApiService.get<SupportTicket[]>('/support-tickets/my');
  if (!res.success) {
    throw new Error(res.message || 'Failed to load your tickets');
  }
  return res.data ?? [];
}

/** Admin: get all tickets with optional status filter */
export async function getAdminTickets(params?: {
  status?: TicketStatus;
  page?: number;
  limit?: number;
}): Promise<{ data: SupportTicket[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await ApiService.get<SupportTicket[]>(`/support-tickets/admin${query}`);
  if (!res.success) {
    throw new Error(res.message || 'Failed to load support tickets');
  }
  return { data: res.data ?? [], total: (res as any).total ?? 0 };
}

/** Admin: update ticket status and optionally add a reply */
export async function updateTicketStatus(
  ticketId: string,
  payload: { status: TicketStatus; adminResponse?: string }
): Promise<SupportTicket> {
  const res = await ApiService.patch<SupportTicket>(
    `/support-tickets/${ticketId}/status`,
    payload
  );
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to update ticket');
  }
  return res.data;
}
