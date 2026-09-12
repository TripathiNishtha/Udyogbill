import { ManualVolume } from './types';
import masterData from './master-manual-data.json';

export * from './types';
export const MASTER_MANUAL_VOLUMES: ManualVolume[] = masterData as ManualVolume[];

export function getTopicById(topicId: string) {
  for (const vol of MASTER_MANUAL_VOLUMES) {
    const topic = vol.topics.find((t) => t.id === topicId);
    if (topic) return { volume: vol, topic };
  }
  return null;
}

export function getAllTopics() {
  return MASTER_MANUAL_VOLUMES.flatMap((v) => v.topics.map((t) => ({ ...t, volumeTitle: v.title })));
}
