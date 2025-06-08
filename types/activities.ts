import { Timestamp } from 'firebase/firestore';

export interface ActivityType {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
} 