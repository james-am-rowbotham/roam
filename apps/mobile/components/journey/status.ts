import type { StatusVariant } from '../ui';

type JourneyStatus = 'planned' | 'active' | 'completed' | 'abandoned';

// Journey status → chip label + colour. Green = done, blue = active/current,
// neutral = upcoming/inactive (§16 convention).
export function journeyStatusChip(status: JourneyStatus): {
  label: string;
  variant: StatusVariant;
} {
  switch (status) {
    case 'active':
      return { label: 'Active', variant: 'info' };
    case 'completed':
      return { label: 'Completed', variant: 'success' };
    case 'abandoned':
      return { label: 'Abandoned', variant: 'neutral' };
    default:
      return { label: 'Planned', variant: 'neutral' };
  }
}
