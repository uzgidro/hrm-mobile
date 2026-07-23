import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  SUPPORT_TICKETS,
  SUPPORT_TICKET_RATE,
  SUPPORT_TICKET_REOPEN,
} from '@/api/urls';
import type { PickedFile } from '@/components/AttachmentField';
import type { SupportTicket } from '@/types';
import { supportKeys } from './queries';

export interface CreateTicketForm {
  priority: 'urgent' | 'normal' | 'low';
  description: string;
  uge_number?: string;
  room_number?: string;
}

export interface RateTicketForm {
  rating: number;
  note?: string | null;
}

// Create is multipart/form-data (the backend reads Form fields, not a JSON body)
// with optional image/video attachments under the `files` field — one append per
// file, matching the web SupportTicketDrawer.
export function createTicket(form: CreateTicketForm, files: PickedFile[] = []): Promise<SupportTicket> {
  const fd = new FormData();
  fd.append('priority', form.priority);
  fd.append('description', form.description.trim());
  if (form.uge_number?.trim()) fd.append('uge_number', form.uge_number.trim());
  if (form.room_number?.trim()) fd.append('room_number', form.room_number.trim());
  files.forEach((f) => {
    fd.append('files', {
      uri: f.uri,
      name: f.name,
      type: f.mimeType || 'application/octet-stream',
    } as unknown as Blob);
  });
  return apiClient
    .post<SupportTicket>(SUPPORT_TICKETS, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
}

export function rateTicket(id: number, form: RateTicketForm): Promise<unknown> {
  return apiClient
    .post(SUPPORT_TICKET_RATE(id), { rating: form.rating, note: form.note ?? null })
    .then((r) => r.data);
}

export function reopenTicket(id: number): Promise<unknown> {
  return apiClient.post(SUPPORT_TICKET_REOPEN(id)).then((r) => r.data);
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { form: CreateTicketForm; files?: PickedFile[] }) =>
      createTicket(args.form, args.files),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

export function useRateTicket(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: RateTicketForm) => rateTicket(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

export function useReopenTicket(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reopenTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  });
}
