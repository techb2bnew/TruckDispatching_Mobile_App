// Types for the Truck Dispatch Training API (see /api/docs). Nested objects are loosely typed
// in the server spec, so every field the UI does not strictly need is optional.

export interface User {
  id: string;
  studentId: string | null;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  avatar: string | null;
  courseStartDate: string | null;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoadPlace {
  locationId?: string;
  city?: string;
  state?: string;
  dayOffset?: number;
  time?: string;
  startAt?: string;
  endAt?: string;
}

export interface CompanyCard {
  id: string;
  name: string;
  phone?: string;
  mcNumber?: string;
  location?: { city?: string; stateOrProvince?: string };
  creditScore?: number | null;
  daysToPay?: number;
  rating?: number;
  reviewCount?: number;
}

export interface ApiLoad {
  id: string;
  referenceId: string;
  route: string;
  trip: {
    origin: LoadPlace;
    destination: LoadPlace;
    tripMiles: number;
    appointmentType: 'Appointment' | 'FCFS';
  };
  rate: {
    total: number | null;
    ratePerMile: number | null;
    perMileEstimated: boolean;
    callForRate: boolean;
  };
  warning?: { code: string; message: string; status: string } | null;
  similar?: boolean;
  equipment: {
    loadType?: string;
    truckType?: string;
    lengthFt?: number;
    weightLbs?: number;
    commodity?: string;
    code?: string;
    label?: string;
  };
  companyId: string;
  company?: CompanyCard;
  contact?: { phone: string; email: string | null };
  comments?: string | null;
  marketRate?: { available: boolean; value: number | null };
  resources?: { insurance?: string | null };
  meta?: { status?: string; isPrivate?: boolean; booking?: 'book' | 'bid' | null; ageMinutes?: number; requiresInsurance?: boolean };
  derived?: { ratePerMile: number | null; deadheadMiles: number | null; totalMiles: number | null; effectiveRpm: number | null };
}

export interface LoadsPage {
  items: ApiLoad[];
  total: number;
  similarTotal?: number;
  page: number;
  limit: number;
  sort?: string;
}

export interface LoadsQuery {
  text?: string;
  page?: number;
  limit?: number;
  sort?: string;
  minRate?: number;
  maxRate?: number;
  minMiles?: number;
  maxMiles?: number;
  companyId?: string;
}

/** Broker email thread. `messages` items are untyped in the server spec, see `mailMessages()` in broker.ts. */
export interface BrokerSession {
  id: string;
  loadId: string;
  companyId: string;
  subject: string;
  state: string;
  agreedPrice: number | null;
  listedRate: number;
  summary: string | null;
  version: number;
  dealReady: boolean;
  confirmedAt: string | null;
  canConfirm: boolean;
  agreementConfirmed: boolean;
  messages?: Record<string, unknown>[];
  /** Set while a broker reply is queued (the text is hidden until deliverAt). */
  pendingReply?: { deliverAt?: string; secondsLeft?: number } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MailMessage {
  id: string;
  from: 'student' | 'broker';
  body: string;
  subject?: string;
  ts: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  dutyStatus: 'on_duty' | 'driving' | 'on_break' | 'off_duty';
  remainingHosMinutes: number;
  availability: 'available' | 'on_load' | 'unavailable';
  yearsExperience: number;
  hue: number;
  locationId: string;
  location?: { city?: string; state?: string };
  truckId: string | null;
}

export interface DriversPage {
  items: Driver[];
  page: number;
  limit: number;
  total: number;
}

export type CallType = 'BROKER' | 'DRIVER';

export interface Call {
  id: string;
  type: CallType;
  phase?: 'ASSIGNMENT' | 'TRACKING' | null;
  driverId?: string | null;
  truckId?: string | null;
  dispatchId?: string | null;
  status: 'ACTIVE' | 'ENDED';
  loadId?: string | null;
  brokerSessionId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationSec?: number | null;
  endReason?: 'HANGUP' | 'TIMEOUT' | 'DEAL_CLOSED' | 'FINISHED' | 'ERROR' | null;
  maxDurationSec: number;
  secondsLeft?: number;
}

export interface CallTurn {
  id: string;
  role: string;
  text: string;
  at: string;
}

export interface CallDetail extends Call {
  driver?: Record<string, unknown> | null;
  broker?: Record<string, unknown> | null;
  turns?: CallTurn[];
}

export interface StartCallBody {
  type: CallType;
  loadId?: string;
  driverId?: string;
  truckId?: string;
  dispatchSlug?: string;
}

export interface CallTurnResult {
  reply: string;
  state?: string;
  loadId?: string | null;
  currentOffer?: number | null;
  agreedPrice?: number | null;
  sessionOver: boolean;
  callEnded: boolean;
  canConfirm?: boolean;
  phase?: string;
  outcome?: string | null;
  scorecard?: Record<string, unknown> | null;
}

export interface DriverBriefingBody {
  loadId: string;
  driverId: string;
  truckId?: string;
  message: string;
}

export interface DriverBriefingReply {
  sessionKey: string;
  reply: string;
  outcome: string | null;
  sessionOver: boolean;
  turn: number | null;
  scorecard: Record<string, unknown> | null;
}

export interface LoadBroker {
  company: CompanyCard;
  contact: { name: string; title?: string; company?: string; phone?: string; email?: string };
  persona?: Record<string, unknown> | null;
  situation?: Record<string, unknown>;
}

/** What the Profile screen shows, read from GET /api/profile ({ progress, stats, course, achievements }). */
export interface ProfileStats {
  xp?: number;
  level?: number;
  stars?: number;
  pct?: number;
  xpIntoLevel?: number;
  xpForNextLevel?: number;
  rank?: string;
  decisions?: number;
  mistakes?: number;
  hintsUsed?: number;
  trainingDay?: number;
  totalDays?: number;
  /** earned = the server set awardedAt. */
  achievements: { title: string; detail?: string; earned: boolean }[];
}

export interface JourneyDayView {
  day: number;
  status: 'COMPLETED' | 'CURRENT' | 'AVAILABLE' | 'LOCKED_DATE' | 'LOCKED_PREREQ';
  title: string;
  zone?: string;
  stars: number;
  lockedReason?: string;
  availableOn?: string;
  description?: string;
  minutes?: number;
  rewardXp?: number;
  rewardStars?: number;
  milestone: boolean;
  objectives: { label: string; done: boolean }[];
  primaryRoute?: string;
}

/** What the Journey screen shows, read from GET /api/journey. */
export interface JourneyView {
  days: JourneyDayView[];
  currentDay: number | null;
  completedCount: number;
  totalDays: number;
  allComplete: boolean;
  demoMode: boolean;
  simulatorOpen: boolean;
  simulatorOpensOn?: string;
  /** The day being played, with its objectives and which are done. */
  active: { day?: number; objectives: { label: string; done: boolean }[] } | null;
  xp?: number;
  level?: number;
  stars?: number;
}
