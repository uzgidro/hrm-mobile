// Pure mapping of what a face fetched into the rows it draws: title, caption, optional badge and
// the route a tap opens (the same detail screen the module's own list opens). No React here;
// the caller passes `t` so labels follow the language.
import dayjs from 'dayjs';
import type { Href } from 'expo-router';
import type { TFunction } from 'i18next';
import type { Tone } from '@/ui/Chip';
import { leaveRangeText, leaveTypeLabel } from '@/utils/leaveStatus';
import { letterDisplayNumber, letterStatusMeta, letterTypeLabel } from '@/utils/letterStatus';
import { statusMeta, type StatusKind } from '@/utils/orderStatus';
import { ticketPriorityKey, ticketStatusKey } from '@/utils/supportStatus';
import type { FaceRaw } from './faceQueries';

export interface FaceRow {
  key: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; tone: Tone };
  /** Person rows lead with a portrait. */
  person?: { name: string; thumb?: string | null; uri?: string | null };
  href: Href;
}

export interface FaceView {
  rows: FaceRow[];
  /** One line above the rows (e.g. how many letters wait for me). */
  note?: string;
}

const MAX_LEN = 90;
/** Collapses whitespace and cuts very long free text (the row still ellipsises by lines). */
export function clip(s?: string | null, n = MAX_LEN): string {
  const v = (s ?? '').replace(/\s+/g, ' ').trim();
  return v.length > n ? `${v.slice(0, n)}…` : v;
}

const dm = (d?: string | null) => (d ? dayjs(d).format('D MMM') : '');
const hhmm = (s?: string | null) => (s ? s.slice(0, 5) : '');
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' · ');
const daysFromToday = (d?: string | null) => (d ? dayjs(d).startOf('day').diff(dayjs().startOf('day'), 'day') : 0);
const timeSpan = (from?: string | null, to?: string | null) => (from ? (to ? `${hhmm(from)}–${hhmm(to)}` : hhmm(from)) : null);
const route = (pathname: string, id?: number | string): Href =>
  (id === undefined ? pathname : { pathname, params: { id: String(id) } }) as Href;

/** Status kinds of the order / letter utils → badge tones. */
export function kindTone(kind: StatusKind): Tone {
  switch (kind) {
    case 'pending': return 'warning';
    case 'info': return 'info';
    case 'success': return 'success';
    case 'error': return 'danger';
    default: return 'neutral';
  }
}

/** Holiday occurrence on or after today; a yearly holiday is projected to its next date. */
export function upcomingHolidays<T extends { date_from: string; date_to: string; is_repeatable?: boolean | null }>(
  items: T[],
  limit: number,
  now = dayjs(),
): { h: T; from: dayjs.Dayjs; to: dayjs.Dayjs }[] {
  const today = now.startOf('day');
  return items
    .map((h) => {
      let from = dayjs(h.date_from);
      const span = dayjs(h.date_to).diff(from, 'day');
      if (h.is_repeatable) {
        from = from.year(today.year());
        if (from.add(span, 'day').isBefore(today)) from = from.add(1, 'year');
      }
      return { h, from, to: from.add(span, 'day') };
    })
    .filter((x) => !x.to.isBefore(today))
    .sort((a, b) => a.from.valueOf() - b.from.valueOf())
    .slice(0, limit);
}

export function buildFace(raw: FaceRaw, t: TFunction, limit = 4): FaceView {
  switch (raw.page) {
    case 'orders':
      return {
        rows: raw.data.slice(0, limit).map((o) => {
          const meta = statusMeta(o.status);
          return {
            key: String(o.id),
            title: join(o.category_rel?.name || t('orders.fallbackTitle'), o.act_number ? `№${o.act_number}` : null),
            subtitle: join(clip(o.summary || o.description, 60), dm(o.act_date)) || undefined,
            badge: { label: meta.label, tone: kindTone(meta.kind) },
            href: route('/order-detail', o.id),
          };
        }),
      };

    case 'letters': {
      const { items, awaiting } = raw.data;
      return {
        note: awaiting > 0 ? t('dashboard.faces.awaiting', { count: awaiting }) : undefined,
        rows: items.slice(0, limit).map((l) => {
          const meta = letterStatusMeta(l);
          const num = letterDisplayNumber(l);
          return {
            key: String(l.id),
            title: join(letterTypeLabel(l.letter_type), num ? `№${num}` : null),
            subtitle: join(clip(l.description, 60), dm(l.letter_date)) || undefined,
            badge: { label: meta.label, tone: kindTone(meta.kind) },
            href: route('/letter-detail', l.id),
          };
        }),
      };
    }

    case 'requests':
      return {
        rows: raw.data.slice(0, limit).map((r) => ({
          key: String(r.id),
          title: r.employee?.legal_name || '—',
          subtitle: join(r.type ? leaveTypeLabel(t, r.type) : t('leaves.typeFallback'), leaveRangeText(r.start_date, r.end_date, 'D MMM')),
          person: r.employee ? { name: r.employee.legal_name ?? '', thumb: r.employee.photo_thumb_path, uri: r.employee.photo_path } : undefined,
          href: route('/leave-detail', r.id),
        })),
      };

    case 'ijro':
      return {
        rows: raw.data.slice(0, limit).map((r) => {
          const diff = daysFromToday(r.deadline_date);
          return {
            key: String(r.id),
            title: clip(r.description || r.task_index || `#${r.id}`),
            subtitle: r.employee?.legal_name || undefined,
            badge:
              diff < 0
                ? { label: t('ijro.daysLate', { count: -diff }), tone: 'danger' }
                : diff === 0
                  ? { label: t('dashboard.faces.today'), tone: 'warning' }
                  : { label: t('ijro.daysLeft', { count: diff }), tone: 'neutral' },
            href: route('/ijro'),
          };
        }),
      };

    case 'chrono':
      return {
        rows: raw.data.slice(0, limit).map((r) => {
          const late = (r.delay_days ?? 0) > 0;
          return {
            key: String(r.id),
            title: clip(r.title),
            subtitle: join(r.doc_number, dm(r.deadline)) || undefined,
            badge: late
              ? { label: t('chrono.daysLate', { count: r.delay_days }), tone: 'danger' }
              : r.days_left != null
                ? { label: t('chrono.daysLeft', { count: r.days_left }), tone: r.days_left <= 2 ? 'warning' : 'neutral' }
                : undefined,
            href: { pathname: '/topshiriq', params: { id: String(r.id) } } as Href,
          };
        }),
      };

    case 'zoom':
      return {
        rows: raw.data.slice(0, limit).map((m) => ({
          key: String(m.id),
          title: clip(m.topic || m.agenda || `#${m.id}`),
          subtitle: join(m.start_at ? dayjs(m.start_at).format('DD.MM HH:mm') : null, m.requested_by?.legal_name) || undefined,
          badge: m.is_live
            ? { label: t('dashboard.faces.live'), tone: 'danger' }
            : m.status === 'pending'
              ? { label: t('dashboard.faces.zoomPending'), tone: 'warning' }
              : undefined,
          href: route('/zoom'),
        })),
      };

    case 'support':
      return {
        rows: raw.data.slice(0, limit).map((k) => ({
          key: String(k.id),
          title: clip(k.description || `#${k.id}`),
          subtitle: join(k.uge_number, k.room_number, k.priority !== 'normal' ? t(ticketPriorityKey(k.priority)) : null, dm(k.created_at)) || undefined,
          badge: { label: t(ticketStatusKey(k.status)), tone: k.status === 'open' ? 'warning' : 'info' },
          href: route('/texnik-yordam-detail', k.id),
        })),
      };

    case 'projects':
      return {
        rows: raw.data.slice(0, limit).map((w) => {
          const late = !!w.deadline && daysFromToday(w.deadline) < 0 && (w.pending_cards_count ?? 0) > 0;
          return {
            key: String(w.id),
            title: w.name || `#${w.id}`,
            subtitle: t('dashboard.faces.projectProgress', { done: w.completed_cards_count ?? 0, total: w.cards_count ?? 0 }),
            badge: w.deadline ? { label: dm(w.deadline), tone: late ? 'danger' : 'neutral' } : undefined,
            href: route('/loyiha-detail', w.id),
          };
        }),
      };

    case 'documents':
      return {
        rows: raw.data.slice(0, limit).map((f) => {
          const name = f.original_filename || f.file_filename || `#${f.id}`;
          return {
            key: String(f.id),
            title: name,
            subtitle: join(dm(f.updated_at || f.created_at), f.created_by?.legal_name) || undefined,
            href: { pathname: '/hujjat-viewer', params: { id: String(f.id), name } } as Href,
          };
        }),
      };

    case 'vehicles':
      return {
        rows: raw.data.slice(0, limit).map((r) => ({
          key: String(r.id),
          title: r.employee_name || r.requested_by?.legal_name || `#${r.id}`,
          subtitle:
            join(
              (r.destination_names ?? []).join(', ') || clip(r.purpose, 40),
              r.start_date ? (r.end_date && r.end_date !== r.start_date ? `${dm(r.start_date)} – ${dm(r.end_date)}` : dm(r.start_date)) : null,
            ) || undefined,
          href: route('/avtopark'),
        })),
      };

    case 'guests':
      return {
        rows: raw.data.slice(0, limit).map((g) => ({
          key: String(g.id),
          title: g.legal_name || `#${g.id}`,
          subtitle: join(g.organization_name, g.host_employee_name) || undefined,
          person: { name: g.legal_name ?? '', thumb: g.photo_thumb_path, uri: g.photo_path },
          badge: g.last_visit_time ? { label: dayjs(g.last_visit_time).format('HH:mm'), tone: 'success' } : undefined,
          href: route('/mehmon-detail', g.id),
        })),
      };

    case 'duty':
      return {
        rows: raw.data.slice(0, limit).map((p) => ({
          key: p.key,
          title: p.name,
          subtitle: p.group || undefined,
          person: { name: p.name, thumb: p.photo },
          badge: timeSpan(p.from, p.to) ? { label: timeSpan(p.from, p.to)!, tone: 'brand' } : undefined,
          href: route('/navbatchilik'),
        })),
      };

    case 'chairman':
      return {
        rows: raw.data.slice(0, limit).map((k) => ({
          key: String(k.id),
          title: clip(k.title || k.description || `#${k.id}`),
          subtitle: clip(k.participants, 60) || undefined,
          badge: timeSpan(k.start_time, k.end_time) ? { label: timeSpan(k.start_time, k.end_time)!, tone: 'brand' } : undefined,
          href: route('/chairman-tasks'),
        })),
      };

    case 'trainings': {
      const { items, expiring } = raw.data;
      return {
        rows: items.slice(0, limit).map((r) => {
          const when = expiring ? r.certificate_expires_at : r.start_date;
          return {
            key: String(r.id),
            title: r.employee_name || `#${r.id}`,
            subtitle: clip(r.program_name, 70) || undefined,
            person: { name: r.employee_name ?? '', thumb: r.employee_photo_thumb_path },
            badge: when ? { label: dm(when), tone: expiring ? 'warning' : 'info' } : undefined,
            href: route('/malaka-oshirish'),
          };
        }),
      };
    }

    case 'learning':
      return {
        rows: raw.data.slice(0, limit).map((e) => ({
          key: String(e.id),
          title: e.course_title || `#${e.course_id}`,
          subtitle: e.deadline ? `${t('dashboard.faces.deadline')}: ${dm(e.deadline)}` : e.provider || undefined,
          badge: e.completed_at
            ? { label: t('dashboard.faces.done'), tone: 'success' }
            : { label: `${Math.round(e.progress ?? 0)}%`, tone: 'brand' },
          href: route('/kurs-player', e.id),
        })),
      };

    case 'sanatorium': {
      const { today, arrivals, departures } = raw.data;
      const guest = (s: (typeof arrivals)[number], kind: 'in' | 'out'): FaceRow => ({
        key: `${kind}-${s.id}`,
        title: s.guest?.full_name || `#${s.id}`,
        subtitle: join(s.room?.number ? `${t('dashboard.faces.room')} ${s.room.number}` : null, `${dm(s.planned_from)} – ${dm(s.planned_to)}`),
        badge:
          kind === 'out'
            ? { label: s.planned_to === today ? t('dashboard.faces.departure') : dm(s.planned_to), tone: 'warning' }
            : s.planned_from < today
              ? { label: t('dashboard.faces.lateArrival'), tone: 'danger' }
              : { label: t('dashboard.faces.arrival'), tone: 'success' },
        href: route('/sanatorium-stay', s.id),
      });
      // Today's arrivals and departures first, then the late arrivals.
      return {
        rows: [
          ...arrivals.filter((s) => s.planned_from >= today).map((s) => guest(s, 'in')),
          ...departures.map((s) => guest(s, 'out')),
          ...arrivals.filter((s) => s.planned_from < today).map((s) => guest(s, 'in')),
        ].slice(0, limit),
      };
    }

    case 'holidays':
      return {
        rows: upcomingHolidays(raw.data, limit).map(({ h, from, to }) => {
          const left = from.diff(dayjs().startOf('day'), 'day');
          return {
            key: String(h.id ?? `${h.name}${from.format()}`),
            title: h.name || '—',
            subtitle: from.isSame(to, 'day') ? from.format('D MMM') : `${from.format('D MMM')} – ${to.format('D MMM')}`,
            badge: left <= 0 ? { label: t('dashboard.faces.today'), tone: 'success' } : { label: t('dashboard.home.daysLeft', { count: left }), tone: 'neutral' },
            href: route('/bayramlar'),
          };
        }),
      };

    case 'employees': {
      const s = raw.data;
      const stat = (key: string, label: string, value: number, tone: Tone): FaceRow => ({
        key,
        title: label,
        badge: { label: String(value), tone },
        href: route('/employees-list'),
      });
      return {
        rows: [
          stat('total', t('dashboard.faces.headcount'), s.total, 'brand'),
          stat('hired', t('dashboard.faces.hiredYear'), s.hired_year, 'success'),
          stat('birth', t('dashboard.faces.noBirthDate'), s.no_birth_date, s.no_birth_date > 0 ? 'warning' : 'neutral'),
          stat('pos', t('dashboard.faces.noPosition'), s.no_position, s.no_position > 0 ? 'warning' : 'neutral'),
        ].slice(0, limit),
      };
    }

    case 'directory':
      return {
        rows: raw.data.slice(0, limit).map((p) => ({
          key: String(p.id),
          title: p.legal_name || `#${p.id}`,
          subtitle: join(p.phone_number, p.job_position_name) || undefined,
          person: { name: p.legal_name ?? '', thumb: p.photo_thumb_path, uri: p.photo_path },
          badge: p.internal_phone_number && /\d/.test(p.internal_phone_number) ? { label: p.internal_phone_number, tone: 'brand' } : undefined,
          href: route('/phone-directory'),
        })),
      };
  }
}
