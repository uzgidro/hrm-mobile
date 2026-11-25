// True once the server answered the work queue: the arrival wizard (and the rest of the simplified
// flow) exists there. While unknown or on an older server it is false and the classic sheets are used.
import { useQuery } from '@tanstack/react-query';
import { todayQuery } from './api';

export function useSimpleAvailable(enabled = true): boolean {
  const q = useQuery(todayQuery(enabled));
  return !!q.data;
}
