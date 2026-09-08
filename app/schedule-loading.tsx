import { PlannerUnavailable } from '@/components/PlannerUnavailable';

/** 실제 run API가 연결되기 전에는 진행률이나 자동 완료를 표시하지 않는다. */
export default function ScheduleLoadingScreen() {
  return <PlannerUnavailable />;
}
