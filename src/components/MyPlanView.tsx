import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  Compass,
  Heart,
  Moon,
  Flame,
  Footprints,
  X,
  Check,
  Clock,
  Calendar as CalendarIcon,
  TrendingUp,
  Sliders,
  ShieldCheck,
  Pause,
  Play,
  HelpCircle,
  BarChart2,
  AlertCircle,
  Info,
  RotateCcw,
  MessageSquare,
  Trash2,
  ArrowUp,
  CornerDownRight
} from 'lucide-react';
import { FurryNovaStaticAvatar } from './Avatar3D/FurryNovaStaticAvatar';


// ============================================================================
// 1. DATA MODELS & UNIFIED ACTIVITY DATASET
// ============================================================================

type RhythmTimeframe = '7d' | 'month';
type SecondaryModuleType = 'activity' | 'rhythm' | 'direction' | 'memory' | 'health' | null;

// --- A. Unified Activity Record Model ---
// Supports Active (with distinct sessionsCount & durationMinutes), Mindful Rest, or No Record
type DayRecordType = 'active' | 'rest' | 'none';

interface DayActivityRecord {
  date: string; // 'YYYY-MM-DD'
  type: DayRecordType;
  title?: string;
  durationMinutes?: number;
  sessionsCount?: number; // Number of completed activities/sessions on this active day (>= 1)
  note?: string;
  isSample?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getDeviceTodayState() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  return {
    year: y,
    month: m,
    day: d,
    dateStr: formatDateKey(y, m, d)
  };
}

// Build unified 6-month sample dataset centered around real device date
// Used by BOTH Activity Monthly Grid AND Your Rhythm (6-month trend curve + 7d/Month stats)
function createInitialActivityLogs(baseYear: number, baseMonth: number, baseDay: number): Record<string, DayActivityRecord> {
  const logs: Record<string, DayActivityRecord> = {};

  // Historical 5 months prior to current month (offsets -5 to -1)
  const historicalMonthPatterns: {
    offset: number;
    activeDays: number[];
    doubleSessionDays: number[];
    restDays: number[];
  }[] = [
    {
      offset: -8,
      activeDays: [3, 8, 13, 18, 23, 27],
      doubleSessionDays: [13],
      restDays: [10, 21]
    },
    {
      offset: -7,
      activeDays: [2, 6, 11, 15, 19, 24, 28],
      doubleSessionDays: [15],
      restDays: [8, 22]
    },
    {
      offset: -6,
      activeDays: [1, 5, 9, 12, 16, 20, 24, 27, 30],
      doubleSessionDays: [12, 24],
      restDays: [7, 18, 26]
    },
    {
      offset: -5,
      activeDays: [2, 5, 9, 13, 17, 21, 25, 28],
      doubleSessionDays: [13, 25],
      restDays: [7, 19]
    },
    {
      offset: -4,
      activeDays: [1, 4, 7, 10, 12, 15, 18, 21, 24, 27, 30],
      doubleSessionDays: [7, 21],
      restDays: [6, 16, 25]
    },
    {
      offset: -3,
      activeDays: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29],
      doubleSessionDays: [11, 23],
      restDays: [4, 15, 24]
    },
    {
      offset: -2,
      activeDays: [1, 3, 5, 7, 10, 12, 14, 16, 19, 21, 23, 25, 28, 30],
      doubleSessionDays: [5, 16, 25],
      restDays: [6, 13, 20, 27]
    },
    {
      offset: -1,
      activeDays: [2, 3, 5, 7, 9, 12, 14, 15, 18, 20, 21, 24, 26, 28, 30],
      doubleSessionDays: [7, 15, 26],
      restDays: [6, 13, 19, 27, 31]
    }
  ];

  for (const pattern of historicalMonthPatterns) {
    const mDate = new Date(baseYear, baseMonth + pattern.offset, 1);
    const y = mDate.getFullYear();
    const m = mDate.getMonth();
    const maxDays = new Date(y, m + 1, 0).getDate();

    for (const d of pattern.activeDays) {
      if (d <= maxDays) {
        const isDouble = pattern.doubleSessionDays.includes(d);
        const isStretch = d % 3 === 0;
        logs[formatDateKey(y, m, d)] = {
          date: formatDateKey(y, m, d),
          type: 'active',
          title: isDouble
            ? '15-min walk + 5-min evening stretch'
            : isStretch
            ? '5-min living room stretch'
            : '15-min mindful walk',
          durationMinutes: isDouble ? 20 : isStretch ? 5 : 15,
          sessionsCount: isDouble ? 2 : 1,
          note: 'Sample historical activity',
          isSample: true
        };
      }
    }

    for (const d of pattern.restDays) {
      if (d <= maxDays) {
        logs[formatDateKey(y, m, d)] = {
          date: formatDateKey(y, m, d),
          type: 'rest',
          title: 'Mindful rest day',
          durationMinutes: 0,
          sessionsCount: 0,
          note: 'Sample restorative day',
          isSample: true
        };
      }
    }
  }

  // Populate current month up to baseDay
  const currentActiveDays = [1, 2, 4, 6, 8, 9, 11, 13, 15, 16, 18, 20, 22, 24, 26, 28];
  const currentDoubleDays = [2, 11, 20];
  const currentRestDays = [3, 10, 17, 23];

  for (const d of currentActiveDays) {
    if (d <= baseDay) {
      const isDouble = currentDoubleDays.includes(d);
      const isWalk = d % 2 === 0 || d === 1;
      logs[formatDateKey(baseYear, baseMonth, d)] = {
        date: formatDateKey(baseYear, baseMonth, d),
        type: 'active',
        title: isDouble
          ? '15-min walk + 5-min desk stretch'
          : isWalk
          ? '15-min mindful walk'
          : '5-min living room stretch',
        durationMinutes: isDouble ? 20 : isWalk ? 15 : 5,
        sessionsCount: isDouble ? 2 : 1,
        note: d === baseDay ? 'Completed after lunch' : 'Light gentle pacing',
        isSample: true
      };
    }
  }

  for (const d of currentRestDays) {
    if (d <= baseDay) {
      logs[formatDateKey(baseYear, baseMonth, d)] = {
        date: formatDateKey(baseYear, baseMonth, d),
        type: 'rest',
        title: 'Mindful rest day',
        durationMinutes: 0,
        sessionsCount: 0,
        note: 'Intentional recovery pause — no guilt',
        isSample: true
      };
    }
  }

  // Ensure Today has an active sample record by default
  const todayKey = formatDateKey(baseYear, baseMonth, baseDay);
  if (!logs[todayKey]) {
    logs[todayKey] = {
      date: todayKey,
      type: 'active',
      title: '15-min mindful walk',
      durationMinutes: 15,
      sessionsCount: 1,
      note: 'Post-lunch outdoor walk',
      isSample: true
    };
  }

  return logs;
}

// --- B. Dynamic Rhythm Computation Types ---
interface MonthlyTrendPoint {
  key: string;
  month: string;
  activeDays: number;
  completedSessions: number;
  totalMinutes: number;
}

interface DailyBarItem {
  label: string;
  minutes: number;
  sessions: number;
  status: 'done' | 'rest' | 'light' | 'none';
}

interface RecentSummaryData {
  rangeLabel: string;
  activeDaysCount: number;
  completedCount: number; // Total completed sessions/activities
  activeMinutes: number;
  restDaysCount: number;
  novaObservation: string;
  dailyBreakdown: DailyBarItem[];
}

// --- C. Your Direction Dataset ---
interface DirectionPresetGoal {
  id: string;
  title: string;
  description: string;
  defaultApproach: string;
  tailoredReason: string;
}

const PRESET_DIRECTION_GOALS: DirectionPresetGoal[] = [
  {
    id: 'energy',
    title: 'Rebuild steady daily energy',
    description: 'Focus on low-friction movement after meals and gentle afternoon decompression.',
    defaultApproach: '10–15 min light outdoor walks after lunch + 5 min desk stretches on busy days',
    tailoredReason: 'Matched to your preference for zero-equipment afternoon resets and flexible rest days.',
  },
  {
    id: 'sleep',
    title: 'Unwind for deeper evening rest',
    description: 'Release physical shoulder and neck tension before bedtime for smoother sleep onset.',
    defaultApproach: '5–10 min evening floor stretches + 15 min screen-free wind-down audio',
    tailoredReason: 'Designed around your 7h 24m sleep baseline to ease late-evening mental restlessness.',
  },
  {
    id: 'mobility',
    title: 'Ease desk stiffness & posture fatigue',
    description: 'Counteract long sitting blocks with brief micro-mobility breaks.',
    defaultApproach: '5 min neck & shoulder mobility flow twice a week + gentle midday walks',
    tailoredReason: 'Built for high-meeting workdays where leaving home for a full workout feels overwhelming.',
  },
];

interface DirectionState {
  status: 'active' | 'paused';
  goalId: string;
  goalTitle: string;
  description: string;
  executionApproach: string;
  tailoredReason: string;
  nextReviewDate: string;
  reviewDaysLeft: number;
}

// --- D. What Nova Knows (Memory Dataset) ---
export type MemoryCategory = 'matters' | 'feels_right' | 'check';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  summary: string;
  learnedFrom: string;
  howItHelps: string;
  updatedAt: string;
  isConfirmed: boolean;
}

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-walk-window',
    category: 'feels_right',
    title: 'Preferred midday walking window is 1:15 PM – 1:45 PM',
    summary: 'Short 15-minute outdoor walks right after lunch feel easiest to start and help clear afternoon screen fatigue.',
    learnedFrom: 'Observed from completed post-lunch walks over the past two weeks.',
    howItHelps: 'Nova schedules outdoor walk suggestions after 1:00 PM instead of early mornings.',
    updatedAt: 'Updated 2 days ago',
    isConfirmed: true
  },
  {
    id: 'mem-home-stretch',
    category: 'feels_right',
    title: 'Prefers low-friction living room stretches over gym routines',
    summary: 'No-mat, no-workout-clothes 5-minute stretches in the living room work best when workdays run late.',
    learnedFrom: 'You chose “5-minute stretch at home” as your Plan B on busy workdays.',
    howItHelps: 'When energy or time is low, Nova defaults to standing or seated home stretches with zero setup.',
    updatedAt: 'Updated 5 days ago',
    isConfirmed: true
  },
  {
    id: 'mem-steady-energy',
    category: 'matters',
    title: 'Gradual nervous system reset without guilt or pace targets',
    summary: 'Building a calm, sustainable daily rhythm matters more than hitting calorie, step, or streak targets.',
    learnedFrom: 'Shared during your initial onboarding conversation with Nova.',
    howItHelps: 'Nova keeps all suggestions pressure-free and treats rest days as positive progress.',
    updatedAt: 'Saved Oct 28',
    isConfirmed: true
  },
  {
    id: 'mem-neck-tension',
    category: 'matters',
    title: 'Relieving afternoon neck and shoulder stiffness from desk work',
    summary: 'Long blocks of laptop work cause upper-back tightness by late afternoon.',
    learnedFrom: 'You mentioned “My shoulders feel super tight after meetings” in chat last week.',
    howItHelps: 'Prioritizes gentle shoulder rolls and upper-back decompression in your Plan B audio guides.',
    updatedAt: 'Saved Nov 1',
    isConfirmed: true
  },
  {
    id: 'mem-rainy-days',
    category: 'check',
    title: 'Switch to indoor breathing & mobility on rainy or cold days?',
    summary: 'It looks like you prefer staying indoors when temperatures drop below 12°C or when it rains.',
    learnedFrom: 'Noticed you switched outdoor walks to indoor Plan B on two rainy afternoons.',
    howItHelps: 'If confirmed, Nova will automatically suggest indoor sessions whenever wet or chilly weather is detected.',
    updatedAt: 'New observation',
    isConfirmed: false
  },
  {
    id: 'mem-sunday-recharge',
    category: 'check',
    title: 'Keep Sundays as a protected, notification-free rest day?',
    summary: 'You usually take Sundays off from structured plans to recharge quietly at home.',
    learnedFrom: 'Observed from your past Sundays marked as Mindful Rest.',
    howItHelps: 'If confirmed, Nova will default Sundays to a quiet rest state without prompting for workouts.',
    updatedAt: 'New observation',
    isConfirmed: false
  }
];

interface MemoryChatProposal {
  mode: 'update' | 'add';
  targetMemoryId?: string;
  newTitle: string;
  newSummary: string;
  newCategory: MemoryCategory;
}

interface MemoryChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  proposal?: MemoryChatProposal;
  proposalAccepted?: boolean;
}

// --- E. Health Data Metrics ---
interface HealthMetricDefinition {
  id: string;
  name: string;
  sampleValue: string;
  unit: string;
  source: string;
  lastUpdated: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const HEALTH_METRICS_DEFINITIONS: HealthMetricDefinition[] = [
  {
    id: 'rhr',
    name: 'Resting Heart Rate',
    sampleValue: '62',
    unit: 'bpm',
    source: 'Apple Watch (Sample)',
    lastUpdated: 'Today, 8:30 AM',
    icon: Heart,
    iconColor: 'text-[#E11D48]',
    iconBg: 'bg-[#FFE4E6]',
  },
  {
    id: 'sleep',
    name: 'Sleep Duration',
    sampleValue: '7h 24m',
    unit: 'avg',
    source: 'Apple Health (Sample)',
    lastUpdated: 'Today, 7:15 AM',
    icon: Moon,
    iconColor: 'text-[#5E5BAE]',
    iconBg: 'bg-[#EDEBF9]',
  },
  {
    id: 'energy',
    name: 'Active Energy',
    sampleValue: '285',
    unit: 'kcal',
    source: 'Apple Health (Sample)',
    lastUpdated: 'Today, 9:20 AM',
    icon: Flame,
    iconColor: 'text-[#EA580C]',
    iconBg: 'bg-[#FFEDD5]',
  },
  {
    id: 'steps',
    name: 'Step Count',
    sampleValue: '5,420',
    unit: 'steps',
    source: 'iPhone Motion (Sample)',
    lastUpdated: 'Today, 9:35 AM',
    icon: Footprints,
    iconColor: 'text-[#0D9488]',
    iconBg: 'bg-[#CCFBF1]',
  },
];

// ============================================================================
// 2. VISUAL CHART SUB-COMPONENTS (DRIVEN BY UNIFIED ACTIVITY LOGS)
// ============================================================================

function MonthlyTrendCurve({
  series,
  compact = false
}: {
  series: MonthlyTrendPoint[];
  compact?: boolean;
}) {
  const maxVal = Math.max(18, ...series.map((s) => s.activeDays), 1) + 2;
  const minVal = 0;
  const width = 280;
  const height = compact ? 68 : 96;
  const padX = 18;
  const padY = compact ? 14 : 18;

  const points = series.map((item, idx) => {
    const x = padX + (idx / Math.max(1, series.length - 1)) * (width - padX * 2);
    const y =
      height -
      padY -
      ((item.activeDays - minVal) / Math.max(1, maxVal - minVal)) * (height - padY * 2);
    return { x, y, ...item };
  });

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible select-none"
        aria-label="Monthly active days trend curve"
      >
        <defs>
          <linearGradient id="rhythmTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5E5BAE" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#5E5BAE" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line
          x1={padX}
          y1={height / 2}
          x2={width - padX}
          y2={height / 2}
          stroke="#26263F"
          strokeOpacity="0.06"
          strokeDasharray="3 3"
        />

        <path d={areaPath} fill="url(#rhythmTrendFill)" />

        <path
          d={linePath}
          fill="none"
          stroke="#5E5BAE"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((pt, idx) => {
          const isLatest = idx === points.length - 1;
          return (
            <g key={pt.key}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isLatest ? 4.5 : 3}
                className={
                  isLatest
                    ? 'fill-[#FF7A32] stroke-white stroke-2'
                    : 'fill-[#5E5BAE] stroke-white stroke-[1.5]'
                }
              />
              {(!compact || isLatest || idx === 0 || idx === 2 || idx === 4) && (
                <text
                  x={pt.x}
                  y={pt.y - 7}
                  textAnchor="middle"
                  className={`text-[9px] font-bold ${
                    isLatest ? 'fill-[#5E5BAE]' : 'fill-[#7A7895]'
                  }`}
                >
                  {pt.activeDays}d
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-between px-1.5 mt-1 text-[10px] font-medium text-[#7A7895]">
        {series.map((item, idx) => (
          <span
            key={item.key}
            className={idx === series.length - 1 ? 'text-[#5E5BAE] font-bold' : ''}
          >
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActiveMinutesBarChart({
  items,
  timeframe
}: {
  items: DailyBarItem[];
  timeframe: RhythmTimeframe;
}) {
  const maxVal = Math.max(timeframe === '7d' ? 20 : 60, ...items.map((i) => i.minutes), 1);

  return (
    <div className="pt-2">
      <div className="flex items-end justify-between gap-2 h-24 px-2 pt-4 border-b border-[#26263F]/[0.06]">
        {items.map((bar, idx) => {
          const heightPct =
            bar.minutes === 0
              ? bar.status === 'rest'
                ? 14
                : 6
              : Math.max(22, Math.round((bar.minutes / maxVal) * 100));
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[9.5px] font-semibold text-[#7A7895]">
                {bar.minutes > 0 ? `${bar.minutes}m` : bar.status === 'rest' ? 'Rest' : '–'}
              </span>
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full max-w-[24px] rounded-t-[8px] transition-all duration-300 ${
                  bar.status === 'done'
                    ? 'bg-[#5E5BAE]'
                    : bar.status === 'light'
                    ? 'bg-[#8E8CD6]'
                    : bar.status === 'rest'
                    ? 'bg-[#E59980]/70'
                    : 'bg-[#26263F]/10'
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 px-2 mt-1.5">
        {items.map((bar, idx) => (
          <span key={idx} className="flex-1 text-center text-[10px] font-medium text-[#7A7895]">
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 3. MAIN COMPONENT: PLAN VIEW (MERGED MY PLAN + MEMORY)
// ============================================================================

interface MyPlanViewProps {
  phoneFrameRef?: React.RefObject<HTMLDivElement | null>;
}

export function MyPlanView({ phoneFrameRef }: MyPlanViewProps) {
  // Real device date state with automatic local midnight & background-resume sync
  const [deviceToday, setDeviceToday] = useState(getDeviceTodayState);

  // 1. Activity Monthly State & Unified Activity Logs
  const [viewYear, setViewYear] = useState<number>(deviceToday.year);
  const [viewMonth, setViewMonth] = useState<number>(deviceToday.month);
  const [pickerYear, setPickerYear] = useState<number>(deviceToday.year);
  const [slideDirection, setSlideDirection] = useState<number>(0);

  // Track whether user is currently viewing the live current month so cross-month rollovers auto-advance
  const isViewingCurrentMonthRef = useRef<boolean>(true);
  useEffect(() => {
    isViewingCurrentMonthRef.current =
      viewYear === deviceToday.year && viewMonth === deviceToday.month;
  }, [viewYear, viewMonth, deviceToday.year, deviceToday.month]);

  // Sync deviceToday at local midnight and when returning from background (visibilitychange / focus)
  useEffect(() => {
    const syncDateWithSystem = () => {
      const next = getDeviceTodayState();
      setDeviceToday((prev) => {
        if (prev.dateStr === next.dateStr) return prev;
        // If user was viewing the previous current month and month rolled over, auto-switch to new current month
        if (
          isViewingCurrentMonthRef.current &&
          (prev.year !== next.year || prev.month !== next.month)
        ) {
          setViewYear(next.year);
          setViewMonth(next.month);
          setPickerYear(next.year);
        }
        return next;
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncDateWithSystem();
      }
    };

    window.addEventListener('focus', syncDateWithSystem);
    document.addEventListener('visibilitychange', handleVisibility);

    // Schedule timer for next local midnight
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1
    );
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());
    const midnightTimer = window.setTimeout(syncDateWithSystem, msUntilMidnight);

    return () => {
      window.removeEventListener('focus', syncDateWithSystem);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearTimeout(midnightTimer);
    };
  }, [deviceToday.dateStr]);

  const [activityLogs, setActivityLogs] = useState<Record<string, DayActivityRecord>>(() =>
    createInitialActivityLogs(deviceToday.year, deviceToday.month, deviceToday.day)
  );

  // Month Picker Modal & Day Detail Modal States
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [activeDayModalDate, setActiveDayModalDate] = useState<string | null>(null);
  const [dayDraftType, setDayDraftType] = useState<DayRecordType>('active');
  const [dayDraftTitle, setDayDraftTitle] = useState<string>('');
  const [dayDraftDuration, setDayDraftDuration] = useState<number>(15);
  const [dayDraftSessions, setDayDraftSessions] = useState<number>(1);
  const [dayDraftNote, setDayDraftNote] = useState<string>('');
  const [dayUpdateToast, setDayUpdateToast] = useState<string | null>(null);

  // 2. Your Rhythm Filter State
  const [rhythmFilter, setRhythmFilter] = useState<RhythmTimeframe>('7d');

  // 3. Secondary Sheet Navigation ('activity' | 'rhythm' | 'direction' | 'memory' | 'health' | null)
  const [selectedModule, setSelectedModule] = useState<SecondaryModuleType>(null);

  // 4. Methodology Info Popup State (Inside Your Rhythm Secondary Sheet)
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  // 5. Your Direction State & Edit Mode / Nova Direction Chat Mode
  const [direction, setDirection] = useState<DirectionState>({
    status: 'active',
    goalId: 'energy',
    goalTitle: PRESET_DIRECTION_GOALS[0].title,
    description: PRESET_DIRECTION_GOALS[0].description,
    executionApproach: PRESET_DIRECTION_GOALS[0].defaultApproach,
    tailoredReason: PRESET_DIRECTION_GOALS[0].tailoredReason,
    nextReviewDate: 'Nov 30, 2026',
    reviewDaysLeft: 12,
  });

  const [isEditingDirection, setIsEditingDirection] = useState<boolean>(false);
  const [directionDraft, setDirectionDraft] = useState<DirectionState>(direction);
  const [directionToast, setDirectionToast] = useState<boolean>(false);

  // Conversational Direction Adjustment with Nova (References memory without creating/modifying memories)
  const [isDirectionChatOpen, setIsDirectionChatOpen] = useState<boolean>(false);
  const [directionChatInput, setDirectionChatInput] = useState<string>('');
  const [directionChatMessages, setDirectionChatMessages] = useState<
    {
      id: string;
      sender: 'ai' | 'user';
      text: string;
      proposedDirection?: {
        goalTitle: string;
        description: string;
        executionApproach: string;
        tailoredReason: string;
      };
      accepted?: boolean;
    }[]
  >([]);
  const directionChatEndRef = useRef<HTMLDivElement>(null);

  // 6. What Nova Knows (Memory State & Sheets)
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<MemoryItem | null>(null);
  const [isMemoryInfoModalOpen, setIsMemoryInfoModalOpen] = useState<boolean>(false);

  // Conversational Memory Sheet (Supports editing an existing memory OR supplementing/adding a new memory)
  const [isMemoryChatOpen, setIsMemoryChatOpen] = useState<boolean>(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [memoryChatMessages, setMemoryChatMessages] = useState<MemoryChatMessage[]>([]);
  const [memoryChatInput, setMemoryChatInput] = useState<string>('');
  const memoryChatEndRef = useRef<HTMLDivElement>(null);

  // 7. Apple Health Connection Toggle (Frontend Demo Simulation)
  const [isAppleHealthConnected, setIsAppleHealthConnected] = useState<boolean>(true);

  // Scroll chat containers to bottom
  useEffect(() => {
    if (isMemoryChatOpen) {
      memoryChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [memoryChatMessages, isMemoryChatOpen]);

  useEffect(() => {
    if (isDirectionChatOpen) {
      directionChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [directionChatMessages, isDirectionChatOpen]);

  // ============================================================================
  // 4. UNIFIED DATA DERIVATIONS (ACTIVITY + YOUR RHYTHM + NOVA OBSERVATION)
  // ============================================================================

  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const isCurrentMonth = viewYear === deviceToday.year && viewMonth === deviceToday.month;

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const currentMonthRecords = useMemo(
    () => Object.values(activityLogs).filter((r) => r.date.startsWith(monthPrefix)),
    [activityLogs, monthPrefix]
  );

  // Distinguish Active Days (活动天数) vs Completed Activities / Sessions (活动次数)
  const activeDaysCount = useMemo(
    () => currentMonthRecords.filter((r) => r.type === 'active').length,
    [currentMonthRecords]
  );
  const completedSessionsInMonth = useMemo(
    () =>
      currentMonthRecords
        .filter((r) => r.type === 'active')
        .reduce((sum, r) => sum + (r.sessionsCount ?? 1), 0),
    [currentMonthRecords]
  );
  const restDaysCount = useMemo(
    () => currentMonthRecords.filter((r) => r.type === 'rest').length,
    [currentMonthRecords]
  );
  const totalMinutes = useMemo(
    () =>
      currentMonthRecords
        .filter((r) => r.type === 'active')
        .reduce((acc, cur) => acc + (cur.durationMinutes || 0), 0),
    [currentMonthRecords]
  );

  // 6-Month Trend Series derived directly from activityLogs ending at viewed month (or deviceToday month)
  const monthlyTrendSeries: MonthlyTrendPoint[] = useMemo(() => {
    const series: MonthlyTrendPoint[] = [];
    for (let offset = -5; offset <= 0; offset++) {
      const mDate = new Date(viewYear, viewMonth + offset, 1);
      const y = mDate.getFullYear();
      const m = mDate.getMonth();
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      const records = Object.values(activityLogs).filter((r) => r.date.startsWith(prefix));
      const activeRecs = records.filter((r) => r.type === 'active');

      series.push({
        key: prefix,
        month: SHORT_MONTH_NAMES[m],
        activeDays: activeRecs.length,
        completedSessions: activeRecs.reduce((s, r) => s + (r.sessionsCount ?? 1), 0),
        totalMinutes: activeRecs.reduce((s, r) => s + (r.durationMinutes || 0), 0)
      });
    }
    return series;
  }, [activityLogs, viewYear, viewMonth]);

  // Dynamic 7-Day and Month Rhythm Summaries derived from the exact same activityLogs
  const rhythmSummaries: Record<RhythmTimeframe, RecentSummaryData> = useMemo(() => {
    // Determine anchor end date for 7d window:
    // If viewing current month, use max(deviceToday.dateStr, latest logged date in current month)
    // so logging on any day in the month or past 7 days reflects immediately.
    let anchorDateObj = new Date(deviceToday.year, deviceToday.month, deviceToday.day);
    if (!isCurrentMonth) {
      if (currentMonthRecords.length > 0) {
        const maxLoggedInViewedMonth = [...currentMonthRecords]
          .map((r) => r.date)
          .sort()
          .pop()!;
        const [ly, lm, ld] = maxLoggedInViewedMonth.split('-').map(Number);
        anchorDateObj = new Date(ly, lm - 1, ld);
      } else {
        const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
        anchorDateObj = new Date(viewYear, viewMonth, lastDay);
      }
    } else if (currentMonthRecords.length > 0) {
      const maxLoggedDateStr = [...currentMonthRecords]
        .map((r) => r.date)
        .sort()
        .pop();
      if (maxLoggedDateStr && maxLoggedDateStr > deviceToday.dateStr) {
        const [ly, lm, ld] = maxLoggedDateStr.split('-').map(Number);
        anchorDateObj = new Date(ly, lm - 1, ld);
      }
    }

    // 1. Compute 7-Day Window
    let sevenDayActiveDays = 0;
    let sevenDaySessions = 0;
    let sevenDayMinutes = 0;
    let sevenDayRestDays = 0;
    const sevenDayBars: DailyBarItem[] = [];

    for (let i = 6; i >= 0; i--) {
      const dObj = new Date(
        anchorDateObj.getFullYear(),
        anchorDateObj.getMonth(),
        anchorDateObj.getDate() - i
      );
      const dKey = formatDateKey(dObj.getFullYear(), dObj.getMonth(), dObj.getDate());
      const rec = activityLogs[dKey];
      const dayLabel = SHORT_WEEKDAYS[dObj.getDay()];

      if (rec?.type === 'active') {
        const mins = rec.durationMinutes ?? 15;
        const sess = rec.sessionsCount ?? 1;
        sevenDayActiveDays += 1;
        sevenDaySessions += sess;
        sevenDayMinutes += mins;
        sevenDayBars.push({
          label: dayLabel,
          minutes: mins,
          sessions: sess,
          status: mins <= 5 ? 'light' : 'done'
        });
      } else if (rec?.type === 'rest') {
        sevenDayRestDays += 1;
        sevenDayBars.push({
          label: dayLabel,
          minutes: 0,
          sessions: 0,
          status: 'rest'
        });
      } else {
        sevenDayBars.push({
          label: dayLabel,
          minutes: 0,
          sessions: 0,
          status: 'none'
        });
      }
    }

    const sevenDayObservation =
      sevenDayActiveDays === 0 && sevenDayRestDays === 0
        ? 'No activities logged in this 7-day window yet. Tap any date on the Activity calendar to log an activity or rest day.'
        : `In this 7-day window, you logged ${sevenDayActiveDays} active ${
            sevenDayActiveDays === 1 ? 'day' : 'days'
          } (${sevenDaySessions} ${
            sevenDaySessions === 1 ? 'activity' : 'activities'
          }, ${sevenDayMinutes} min) and ${sevenDayRestDays} mindful rest ${
            sevenDayRestDays === 1 ? 'day' : 'days'
          }.`;

    // 2. Compute Month Window (Viewed Month: viewYear - viewMonth)
    const weekBuckets: DailyBarItem[] = [
      { label: 'Wk 1', minutes: 0, sessions: 0, status: 'none' },
      { label: 'Wk 2', minutes: 0, sessions: 0, status: 'none' },
      { label: 'Wk 3', minutes: 0, sessions: 0, status: 'none' },
      { label: 'Wk 4', minutes: 0, sessions: 0, status: 'none' }
    ];
    const weekHasRest = [false, false, false, false];

    for (const rec of currentMonthRecords) {
      const dayNum = Number(rec.date.split('-')[2] || 1);
      const bucketIdx = Math.min(3, Math.floor((dayNum - 1) / 7));
      if (rec.type === 'active') {
        weekBuckets[bucketIdx].minutes += rec.durationMinutes ?? 15;
        weekBuckets[bucketIdx].sessions += rec.sessionsCount ?? 1;
      } else if (rec.type === 'rest') {
        weekHasRest[bucketIdx] = true;
      }
    }

    for (let b = 0; b < 4; b++) {
      if (weekBuckets[b].minutes > 0) {
        weekBuckets[b].status = weekBuckets[b].minutes <= 15 ? 'light' : 'done';
      } else if (weekHasRest[b]) {
        weekBuckets[b].status = 'rest';
      }
    }

    const monthObservation =
      activeDaysCount === 0 && restDaysCount === 0
        ? `No records logged in ${MONTH_NAMES[viewMonth]} ${viewYear} yet.`
        : `In ${MONTH_NAMES[viewMonth]}, you’ve recorded ${activeDaysCount} active ${
            activeDaysCount === 1 ? 'day' : 'days'
          } across ${completedSessionsInMonth} completed ${
            completedSessionsInMonth === 1 ? 'activity' : 'activities'
          } (${totalMinutes} min total) and ${restDaysCount} mindful rest ${
            restDaysCount === 1 ? 'day' : 'days'
          }.`;

    return {
      '7d': {
        rangeLabel: isCurrentMonth ? 'Past 7 days' : `${ SHORT_MONTH_NAMES[viewMonth] } (last 7d)`,
        activeDaysCount: sevenDayActiveDays,
        completedCount: sevenDaySessions,
        activeMinutes: sevenDayMinutes,
        restDaysCount: sevenDayRestDays,
        novaObservation: sevenDayObservation,
        dailyBreakdown: sevenDayBars
      },
      month: {
        rangeLabel: `${MONTH_NAMES[viewMonth]} ${viewYear}`,
        activeDaysCount,
        completedCount: completedSessionsInMonth,
        activeMinutes: totalMinutes,
        restDaysCount,
        novaObservation: monthObservation,
        dailyBreakdown: weekBuckets
      }
    };
  }, [
    activityLogs,
    currentMonthRecords,
    deviceToday,
    isCurrentMonth,
    viewYear,
    viewMonth,
    activeDaysCount,
    completedSessionsInMonth,
    totalMinutes,
    restDaysCount
  ]);

  const currentRecentData = rhythmSummaries[rhythmFilter];

  // --- Computed Memories (Confirmed vs Pending Check) ---
  const confirmedMemories = useMemo(
    () => memories.filter((m) => m.isConfirmed),
    [memories]
  );
  const checkMemories = useMemo(
    () => memories.filter((m) => !m.isConfirmed),
    [memories]
  );
  const mattersMemories = useMemo(
    () => memories.filter((m) => m.category === 'matters' && m.isConfirmed),
    [memories]
  );
  const feelsRightMemories = useMemo(
    () => memories.filter((m) => m.category === 'feels_right' && m.isConfirmed),
    [memories]
  );

  // Level-1 "What Nova knows" strictly shows ONLY confirmed memories (up to 3)
  const representativeConfirmedMemories = useMemo(
    () => confirmedMemories.slice(0, 3),
    [confirmedMemories]
  );

  // --- Computed Top Nova Observation (Strictly Data-Driven, <= 2 lines, No Repeated Counts) ---
  const { novaTopObservation, isNovaObservationSample } = useMemo(() => {
    const sevenDaySummary = rhythmSummaries['7d'];
    const totalRecentRecordedDays =
      currentMonthRecords.length > 0
        ? currentMonthRecords.length
        : sevenDaySummary.activeDaysCount + sevenDaySummary.restDaysCount;

    // Insufficient data fallback
    if (totalRecentRecordedDays < 3) {
      return {
        novaTopObservation: 'I’m getting to know your rhythm.',
        isNovaObservationSample: false
      };
    }

    const recordsToAnalyze =
      currentMonthRecords.length >= 3
        ? currentMonthRecords
        : Object.values(activityLogs).slice(-7);

    const activeRecs = recordsToAnalyze.filter((r) => r.type === 'active');
    const restRecs = recordsToAnalyze.filter((r) => r.type === 'rest');
    const walkRecs = activeRecs.filter((r) => /\bwalk(s|ing)?\b/i.test(r.title || ''));
    const stretchRecs = activeRecs.filter((r) => /\bstretch(es|ing)?\b/i.test(r.title || ''));
    const otherActiveCount = activeRecs.filter(
      (r) =>
        !/\bwalk(s|ing)?\b/i.test(r.title || '') &&
        !/\bstretch(es|ing)?\b/i.test(r.title || '')
    ).length;

    const walkCount = walkRecs.length;
    const stretchCount = stretchRecs.length;

    // Only use "Short walks" when every walk record is a single-session walk with confirmed duration <= 15 min
    const allWalksConfirmedShort =
      walkCount > 0 &&
      walkRecs.every(
        (r) =>
          (r.sessionsCount ?? 1) === 1 &&
          typeof r.durationMinutes === 'number' &&
          r.durationMinutes > 0 &&
          r.durationMinutes <= 15
      );
    const walkLabel = allWalksConfirmedShort ? 'Short walks' : 'Walks';

    const hasSampleRecords = recordsToAnalyze.some((r) => r.isSample);

    let text = '';
    if (activeRecs.length > 0 && walkCount > 0 && walkCount >= stretchCount && walkCount >= otherActiveCount) {
      if (restRecs.length > 0 && stretchCount > 0) {
        text = `${walkLabel}, stretches, and rest days are shaping your rhythm.`;
      } else if (restRecs.length > 0) {
        text = `${walkLabel} and rest days have been anchoring your rhythm.`;
      } else if (stretchCount > 0) {
        text = `${walkLabel} and stretches have been anchoring your rhythm.`;
      } else {
        text = `${walkLabel} have been a steady part of your rhythm.`;
      }
    } else if (
      activeRecs.length > 0 &&
      stretchCount > 0 &&
      stretchCount > walkCount &&
      stretchCount >= otherActiveCount
    ) {
      if (restRecs.length > 0) {
        text = 'Stretches and rest days have been anchoring your rhythm.';
      } else {
        text = 'Stretches have been a steady part of your rhythm.';
      }
    } else if (activeRecs.length > 0) {
      if (restRecs.length > 0) {
        text = 'Steady activity and rest days are balancing your rhythm.';
      } else {
        text = 'Steady activity has been anchoring your recent rhythm.';
      }
    } else {
      text = 'Mindful rest days are giving you space to recharge.';
    }

    return {
      novaTopObservation: text,
      isNovaObservationSample: hasSampleRecords
    };
  }, [currentMonthRecords, rhythmSummaries, activityLogs]);

  const hasSampleInCurrentMonth = useMemo(
    () => currentMonthRecords.some((r) => r.isSample),
    [currentMonthRecords]
  );

  // --- Handlers for Month Switching ---
  const handlePrevMonth = () => {
    setSlideDirection(-1);
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSlideDirection(1);
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectMonth = (targetYear: number, targetMonth: number) => {
    const currentTotal = viewYear * 12 + viewMonth;
    const targetTotal = targetYear * 12 + targetMonth;
    setSlideDirection(targetTotal >= currentTotal ? 1 : -1);
    setViewYear(targetYear);
    setViewMonth(targetMonth);
    setIsMonthPickerOpen(false);
  };

  const handleJumpToThisMonth = () => {
    const latestToday = getDeviceTodayState();
    setDeviceToday(latestToday);
    const currentTotal = viewYear * 12 + viewMonth;
    const todayTotal = latestToday.year * 12 + latestToday.month;
    setSlideDirection(todayTotal >= currentTotal ? 1 : -1);
    setViewYear(latestToday.year);
    setViewMonth(latestToday.month);
  };

  // --- Handlers for Day Detail & Record Correction ---
  const handleOpenDayDetail = (dateStr: string) => {
    const existing = activityLogs[dateStr];
    setActiveDayModalDate(dateStr);
    if (existing) {
      setDayDraftType(existing.type);
      setDayDraftTitle(
        existing.title || (existing.type === 'rest' ? 'Mindful rest day' : '15-min mindful walk')
      );
      setDayDraftDuration(existing.durationMinutes ?? (existing.type === 'active' ? 15 : 0));
      setDayDraftSessions(existing.sessionsCount ?? (existing.type === 'active' ? 1 : 0));
      setDayDraftNote(existing.note || '');
    } else {
      setDayDraftType('active');
      setDayDraftTitle('15-min mindful walk');
      setDayDraftDuration(15);
      setDayDraftSessions(1);
      setDayDraftNote('');
    }
  };

  const handleSaveDayRecord = () => {
    if (!activeDayModalDate) return;
    if (dayDraftType === 'active' && !dayDraftTitle.trim()) return;

    setActivityLogs((prev) => {
      const next = { ...prev };
      if (dayDraftType === 'none') {
        delete next[activeDayModalDate];
      } else {
        next[activeDayModalDate] = {
          date: activeDayModalDate,
          type: dayDraftType,
          title: dayDraftType === 'rest' ? 'Mindful rest day' : dayDraftTitle.trim(),
          durationMinutes: dayDraftType === 'rest' ? 0 : dayDraftDuration,
          sessionsCount: dayDraftType === 'rest' ? 0 : dayDraftSessions,
          note:
            dayDraftNote.trim() ||
            (dayDraftType === 'rest' ? 'Restorative recovery day' : 'Logged manually'),
          isSample: false
        };
      }
      return next;
    });

    const label =
      dayDraftType === 'none'
        ? 'Record cleared — rhythm updated'
        : dayDraftType === 'rest'
        ? 'Rest day saved — rhythm updated'
        : 'Activity saved — rhythm updated';
    setDayUpdateToast(label);
    setTimeout(() => setDayUpdateToast(null), 2600);
    setActiveDayModalDate(null);
  };

  // --- Handlers for Direction ---
  const handleStartEditDirection = () => {
    setDirectionDraft(direction);
    setIsEditingDirection(true);
  };

  const handleConfirmDirectionChanges = () => {
    setDirection(directionDraft);
    setIsEditingDirection(false);
    setDirectionToast(true);
    setTimeout(() => setDirectionToast(false), 2800);
  };

  const handleCancelDirectionChanges = () => {
    setDirectionDraft(direction);
    setIsEditingDirection(false);
  };

  const handleTogglePausePlan = () => {
    const nextStatus = direction.status === 'active' ? 'paused' : 'active';
    const updated = { ...direction, status: nextStatus as 'active' | 'paused' };
    setDirection(updated);
    setDirectionDraft(updated);
    setDirectionToast(true);
    setTimeout(() => setDirectionToast(false), 2800);
  };

  const handleOpenDirectionChat = () => {
    const referencedMem =
      confirmedMemories[0]?.title || 'your preference for midday walks and low-friction stretches';
    setDirectionChatInput('');
    setDirectionChatMessages([
      {
        id: `dir-ai-init-${Date.now()}`,
        sender: 'ai',
        text: `Right now your direction is “${direction.goalTitle}” (${direction.executionApproach}). Keeping in mind what I know about you — ${referencedMem.toLowerCase()} — how would you like to adjust your focus or pace?`
      }
    ]);
    setIsDirectionChatOpen(true);
  };

  const handleSendDirectionChat = (textOverride?: string) => {
    const raw = (textOverride ?? directionChatInput).trim();
    if (!raw) return;

    const userMsg = {
      id: `dir-user-${Date.now()}`,
      sender: 'user' as const,
      text: raw
    };

    const lower = raw.toLowerCase();
    let proposed = {
      goalTitle: direction.goalTitle,
      description: direction.description,
      executionApproach: raw,
      tailoredReason: 'Updated in conversation with Nova, referencing your known rhythm preferences.'
    };

    if (
      lower.includes('sleep') ||
      lower.includes('evening') ||
      lower.includes('night') ||
      lower.includes('unwind')
    ) {
      proposed = {
        goalTitle: 'Unwind for deeper evening rest',
        description:
          'Release physical shoulder and neck tension before bedtime for smoother sleep onset.',
        executionApproach: '5–10 min evening floor stretches + 15 min screen-free wind-down audio',
        tailoredReason:
          'Aligned with your known preference for low-friction home stretches and calm recovery.'
      };
    } else if (
      lower.includes('stiff') ||
      lower.includes('neck') ||
      lower.includes('shoulder') ||
      lower.includes('desk')
    ) {
      proposed = {
        goalTitle: 'Ease desk stiffness & posture fatigue',
        description: 'Counteract long sitting blocks with brief micro-mobility breaks.',
        executionApproach: '5 min neck & shoulder mobility flow twice a week + gentle midday walks',
        tailoredReason:
          'References your afternoon shoulder stiffness memory while keeping sessions short.'
      };
    } else if (
      lower.includes('3') ||
      lower.includes('lighter') ||
      lower.includes('gentle') ||
      lower.includes('slow')
    ) {
      proposed = {
        goalTitle: direction.goalTitle,
        description: direction.description,
        executionApproach:
          '3 light 10-min afternoon walks per week + guilt-free rest days whenever work runs late',
        tailoredReason:
          'Softened weekly frequency to match your no-pressure, nervous-system-first approach.'
      };
    }

    const aiMsg = {
      id: `dir-ai-${Date.now() + 1}`,
      sender: 'ai' as const,
      text: 'Here is the updated direction I drafted for you. It references your preferences without overwriting your saved memories. Would you like to apply it?',
      proposedDirection: proposed,
      accepted: false
    };

    setDirectionChatMessages((prev) => [...prev, userMsg, aiMsg]);
    if (!textOverride) setDirectionChatInput('');
  };

  const handleAcceptDirectionProposal = (msgId: string) => {
    const targetMsg = directionChatMessages.find((m) => m.id === msgId);
    if (!targetMsg || !targetMsg.proposedDirection) return;

    const { goalTitle, description, executionApproach, tailoredReason } =
      targetMsg.proposedDirection;
    const nextDir: DirectionState = {
      ...direction,
      goalTitle,
      description,
      executionApproach,
      tailoredReason
    };
    setDirection(nextDir);
    setDirectionDraft(nextDir);
    setDirectionChatMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, accepted: true } : m))
    );
    setDirectionToast(true);
    setTimeout(() => {
      setIsDirectionChatOpen(false);
    }, 550);
    setTimeout(() => setDirectionToast(false), 2800);
  };

  // --- Handlers for What Nova Knows (Memory) ---
  const showMemoryFeedback = (text: string) => {
    setDayUpdateToast(text);
    setTimeout(() => setDayUpdateToast(null), 2600);
  };

  const handleConfirmPendingMemory = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMemories((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              category: 'feels_right',
              isConfirmed: true,
              updatedAt: 'Confirmed just now'
            }
          : m
      )
    );
    if (selectedMemory?.id === id) {
      setSelectedMemory((prev) =>
        prev
          ? { ...prev, category: 'feels_right', isConfirmed: true, updatedAt: 'Confirmed just now' }
          : null
      );
    }
    showMemoryFeedback('Memory confirmed and saved');
  };

  const handleDismissPendingMemory = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (selectedMemory?.id === id) {
      setSelectedMemory(null);
    }
    showMemoryFeedback('Observation discarded');
  };

  const handleDeleteMemoryConfirmed = () => {
    if (!memoryToDelete) return;
    const targetId = memoryToDelete.id;
    setMemories((prev) => prev.filter((m) => m.id !== targetId));
    if (selectedMemory?.id === targetId) {
      setSelectedMemory(null);
    }
    if (editingMemory?.id === targetId) {
      setEditingMemory(null);
      setIsMemoryChatOpen(false);
    }
    setMemoryToDelete(null);
    showMemoryFeedback('Removed from What Nova knows');
  };

  const handleStartTalkToNovaMemory = (item?: MemoryItem | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMemory(null);
    setEditingMemory(item || null);
    setMemoryChatInput('');

    if (item) {
      setMemoryChatMessages([
        {
          id: `mem-ai-init-${Date.now()}`,
          sender: 'ai',
          text: `Right now I have this noted: “${item.title}.” How should we update or refine this so it fits you better?`
        }
      ]);
    } else {
      setMemoryChatMessages([
        {
          id: `mem-ai-init-${Date.now()}`,
          sender: 'ai',
          text: `What would you like me to remember, update, or correct about your routine, preferences, or life state? I’ll always confirm with you before saving.`
        }
      ]);
    }
    setIsMemoryChatOpen(true);
  };

  const buildMemoryProposal = (
    userText: string,
    currentItem: MemoryItem | null
  ): MemoryChatProposal => {
    const lower = userText.toLowerCase();

    if (currentItem) {
      if (
        lower.includes('evening') ||
        lower.includes('night') ||
        lower.includes('after dinner') ||
        lower.includes('7 pm')
      ) {
        return {
          mode: 'update',
          targetMemoryId: currentItem.id,
          newTitle: 'Prefers gentle evening walks or wind-downs after 6:30 PM',
          newSummary: 'Evening hours after work feel calmer and more realistic than midday windows.',
          newCategory: currentItem.category === 'check' ? 'feels_right' : currentItem.category
        };
      }
      if (lower.includes('morning') || lower.includes('9 am') || lower.includes('before work')) {
        return {
          mode: 'update',
          targetMemoryId: currentItem.id,
          newTitle: 'Prefers a quiet 10-minute morning walk before 9:30 AM',
          newSummary: 'Starting the day with light movement before meetings feels freshest.',
          newCategory: currentItem.category === 'check' ? 'feels_right' : currentItem.category
        };
      }
      if (
        lower.includes('10 min') ||
        lower.includes('shorter') ||
        lower.includes('5 min') ||
        lower.includes('brief')
      ) {
        return {
          mode: 'update',
          targetMemoryId: currentItem.id,
          newTitle: 'Keep sessions brief (5–10 minutes) on normal workdays',
          newSummary:
            'Shorter 5-to-10 minute micro-sessions feel much more approachable than 15-minute blocks.',
          newCategory: currentItem.category === 'check' ? 'feels_right' : currentItem.category
        };
      }
      return {
        mode: 'update',
        targetMemoryId: currentItem.id,
        newTitle: userText.length > 68 ? `${userText.slice(0, 65)}...` : userText,
        newSummary: `Updated directly from your conversation with Nova: “${userText}”`,
        newCategory: currentItem.category === 'check' ? 'feels_right' : currentItem.category
      };
    }

    if (lower.includes('morning') || lower.includes('before work')) {
      return {
        mode: 'add',
        newTitle: 'Enjoys quiet 10-minute morning walks before work starts',
        newSummary:
          'Gentle morning fresh air before opening laptops helps set a steady tone for the day.',
        newCategory: 'feels_right'
      };
    }
    if (
      lower.includes('knee') ||
      lower.includes('back') ||
      lower.includes('joint') ||
      lower.includes('low-impact')
    ) {
      return {
        mode: 'add',
        newTitle: 'Keep movements gentle and low-impact for joint comfort',
        newSummary: 'Avoids high-impact jumping or deep knee strain in favor of smooth mobility.',
        newCategory: 'matters'
      };
    }
    if (lower.includes('evening') || lower.includes('sleep') || lower.includes('after 8')) {
      return {
        mode: 'add',
        newTitle: 'Prefers calm, screen-free wind-downs after 8:30 PM',
        newSummary: 'Protecting late evenings for quiet relaxation supports deeper rest.',
        newCategory: 'feels_right'
      };
    }

    return {
      mode: 'add',
      newTitle: userText.length > 68 ? `${userText.slice(0, 65)}...` : userText,
      newSummary: `Shared with Nova: “${userText}”`,
      newCategory: 'feels_right'
    };
  };

  const handleSendMemoryChat = (textOverride?: string) => {
    const raw = (textOverride ?? memoryChatInput).trim();
    if (!raw) return;

    const userMsg: MemoryChatMessage = {
      id: `mem-user-${Date.now()}`,
      sender: 'user',
      text: raw
    };

    const proposal = buildMemoryProposal(raw, editingMemory);

    const aiMsg: MemoryChatMessage = {
      id: `mem-ai-${Date.now() + 1}`,
      sender: 'ai',
      text:
        proposal.mode === 'update'
          ? 'Got it. Before I update this memory, please confirm if this looks accurate:'
          : 'Thanks for sharing that. Before I save this to your memory, please confirm if this looks right:',
      proposal,
      proposalAccepted: false
    };

    setMemoryChatMessages((prev) => [...prev, userMsg, aiMsg]);
    if (!textOverride) setMemoryChatInput('');
  };

  const handleConfirmMemoryProposal = (messageId: string) => {
    const targetMsg = memoryChatMessages.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.proposal) return;

    const { mode, targetMemoryId, newTitle, newSummary, newCategory } = targetMsg.proposal;

    if (mode === 'update' && targetMemoryId) {
      setMemories((prev) =>
        prev.map((m) =>
          m.id === targetMemoryId
            ? {
                ...m,
                title: newTitle,
                summary: newSummary,
                category: newCategory,
                isConfirmed: true,
                learnedFrom: 'Refined directly in conversation with Nova.',
                updatedAt: 'Updated just now'
              }
            : m
        )
      );
      showMemoryFeedback('Memory updated after your confirmation');
    } else {
      const newItem: MemoryItem = {
        id: `mem-custom-${Date.now()}`,
        category: newCategory,
        title: newTitle,
        summary: newSummary,
        learnedFrom: 'Shared directly in conversation with Nova.',
        howItHelps: 'Nova will factor this preference into your future daily suggestions and pacing.',
        updatedAt: 'Saved just now',
        isConfirmed: true
      };
      setMemories((prev) => [newItem, ...prev]);
      showMemoryFeedback('New memory saved after your confirmation');
    }

    setMemoryChatMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, proposalAccepted: true } : m))
    );

    setTimeout(() => {
      setIsMemoryChatOpen(false);
      setEditingMemory(null);
    }, 550);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-5 pt-2 pb-[96px] flex flex-col gap-3 sm:gap-3.5 z-10 scrollbar-none select-none">
      {/* Toast Notifications */}
      <AnimatePresence>
        {directionToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#5E5BAE] text-white px-4 py-2.5 rounded-[18px] text-xs font-semibold shadow-md flex items-center justify-between z-20 shrink-0"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Direction updated</span>
            </div>
            <span className="text-[11px] text-white/80">Saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dayUpdateToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#5E5BAE] text-white px-4 py-2.5 rounded-[18px] text-xs font-semibold shadow-md flex items-center justify-between z-20 shrink-0"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{dayUpdateToast}</span>
            </div>
            <span className="text-[11px] text-white/80">Updated</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 1. Nova's One-Sentence Observation (Data-Driven + Sample Tag) */}
      {/* ============================================================ */}
      <section
        id="plan-nova-observation"
        aria-label="Nova's observation"
        className="bg-white rounded-[24px] p-4 sm:p-4.5 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex items-start gap-3.5"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#F4EEFE] to-[#FDF1F5] border border-black/[0.04] shadow-2xs overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
          <FurryNovaStaticAvatar size={36} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[#1C1C1E] leading-snug tracking-[-0.01em]">
            “{novaTopObservation}”
          </p>
          {isNovaObservationSample && (
            <span className="inline-block mt-1.5 text-[10.5px] font-medium text-[#6C6C70] bg-[#F2F2F7] px-2.5 py-0.5 rounded-full">
              Based on sample data
            </span>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. Module: Activity (Compact Grid + History Entry + This month) */}
      {/* ============================================================ */}
      <section
        id="plan-module-activity"
        className="bg-white rounded-[24px] p-4 sm:p-4.5 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-3 relative"
        aria-label="Activity Monthly Records"
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <span className="text-[17px] font-bold text-[#1C1C1E] tracking-[-0.02em] shrink-0">Activity</span>
            <button
              type="button"
              onClick={() => {
                setPickerYear(viewYear);
                setIsMonthPickerOpen(true);
              }}
              className="flex items-center gap-1 text-[11.5px] sm:text-[12px] font-semibold text-[#1C1C1E] bg-[#F2F2F7] hover:bg-[#E5E5EA] active:scale-95 px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0"
              aria-label="Select month"
            >
              <span>
                {isCurrentMonth ? MONTH_NAMES[viewMonth] : SHORT_MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <ChevronDown className="w-3 h-3 text-[#5E5BAE] opacity-85 shrink-0" />
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isCurrentMonth && (
              <button
                type="button"
                id="activity-this-month-btn"
                onClick={handleJumpToThisMonth}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#5E5BAE] bg-[#5E5BAE]/10 hover:bg-[#5E5BAE]/18 active:scale-95 px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0"
                aria-label="Return to this month"
              >
                <RotateCcw className="w-2.5 h-2.5 stroke-[2.2]" />
                <span className="hidden min-[380px]:inline">This month</span>
                <span className="min-[380px]:hidden">Now</span>
              </button>
            )}

            {/* Lightweight Activity History Entry */}
            <button
              type="button"
              id="activity-history-entry-btn"
              onClick={() => setSelectedModule('activity')}
              className="flex items-center gap-0.5 text-[11.5px] font-semibold text-[#5E5BAE] hover:text-[#4B4895] bg-[#F2F2F7] hover:bg-[#E5E5EA] px-2.5 py-1 rounded-full transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
              aria-label="Open Activity History"
            >
              <span>History</span>
              <ChevronRight className="w-3 h-3 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Weekday indicators */}
        <div className="grid grid-cols-7 gap-1.5 text-center select-none pt-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayInitial, idx) => (
            <span key={idx} className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-wider">
              {dayInitial}
            </span>
          ))}
        </div>

        {/* Compact Monthly Illuminated Dot Grid */}
        <div className="relative select-none overflow-hidden touch-pan-y">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0, x: slideDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x > 40) handlePrevMonth();
              else if (info.offset.x < -40) handleNextMonth();
            }}
            className="grid grid-cols-7 gap-1.5 cursor-grab active:cursor-grabbing py-1"
          >
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-prefix-${idx}`} className="aspect-square w-full" />
            ))}

            {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((dayNum) => {
              const dStr = formatDateKey(viewYear, viewMonth, dayNum);
              const record = activityLogs[dStr];
              const isToday =
                viewYear === deviceToday.year &&
                viewMonth === deviceToday.month &&
                dayNum === deviceToday.day;
              const isFuture =
                viewYear > deviceToday.year ||
                (viewYear === deviceToday.year && viewMonth > deviceToday.month) ||
                (viewYear === deviceToday.year &&
                  viewMonth === deviceToday.month &&
                  dayNum > deviceToday.day);

              return (
                <button
                  type="button"
                  key={dStr}
                  onClick={() => handleOpenDayDetail(dStr)}
                  aria-label={`${dStr}: ${record?.type || 'no record'}`}
                  className={`aspect-square w-full max-w-[34px] mx-auto rounded-[8px] flex items-center justify-center transition-all duration-150 relative cursor-pointer active:scale-88 ${
                    isToday ? 'ring-2 ring-[#5E5BAE] ring-offset-2 ring-offset-white' : ''
                  } ${
                    record?.type === 'active'
                      ? 'bg-[#5E5BAE] shadow-[0_2px_6px_rgba(94,91,174,0.25)] hover:brightness-105'
                      : record?.type === 'rest'
                      ? 'bg-[#E59980] shadow-[0_2px_6px_rgba(229,153,128,0.25)] hover:brightness-105'
                      : isFuture
                      ? 'bg-[#F2F2F7]/70 border border-dashed border-[#D1D1D6] hover:bg-[#E5E5EA]'
                      : 'bg-[#F2F2F7] hover:bg-[#E5E5EA]'
                  }`}
                >
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-1 right-1 shadow-xs pointer-events-none" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Status Legend & Sample Data Label */}
        <div className="pt-2.5 border-t border-black/[0.05] flex items-center justify-between text-[11px] text-[#6C6C70]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#5E5BAE]" />
              <span className="text-[#1C1C1E] font-medium">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#E59980]" />
              <span className="text-[#1C1C1E] font-medium">Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#E5E5EA]" />
              <span>No record</span>
            </div>
          </div>
          {hasSampleInCurrentMonth && (
            <span className="text-[10.5px] font-medium text-[#6C6C70] bg-[#F2F2F7] px-2 py-0.5 rounded-full">
              Sample data
            </span>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. Module: Your rhythm (Synced with Activity Logs; distinguishes Active days vs Activities) */}
      {/* ============================================================ */}
      <section
        id="plan-module-rhythm"
        onClick={() => setSelectedModule('rhythm')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('rhythm')}
        aria-label="View Your rhythm details"
        className="group bg-white hover:bg-[#FAFAFC] active:scale-[0.99] transition-all duration-200 rounded-[24px] p-4 sm:p-4.5 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-3 relative cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-bold text-[#1C1C1E] tracking-[-0.02em]">Your rhythm</span>
          <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#5E5BAE] group-hover:translate-x-0.5 transition-all stroke-[2.2]" />
        </div>

        {/* 6-Month Trend Curve (Active days per month) with explicit "6-month trend" tag */}
        <div className="bg-[#F2F2F7]/75 px-3.5 py-2.5 rounded-[18px] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-[#1C1C1E]">6-month trend</span>
            <span className="text-[10.5px] font-medium text-[#6C6C70]">Active days</span>
          </div>
          <MonthlyTrendCurve series={monthlyTrendSeries} compact={true} />
        </div>

        {/* Recent Stats Header + 7 days / Month Toggle (Explicitly scopes toggle to recent stats below) */}
        <div className="flex flex-col gap-2 pt-1 border-t border-black/[0.05]">
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[12px] font-semibold text-[#1C1C1E] truncate">
              {currentRecentData.rangeLabel}
            </span>

            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#E5E5EA] p-0.5 rounded-full inline-flex shrink-0"
            >
              <button
                type="button"
                onClick={() => setRhythmFilter('7d')}
                className={`px-2.5 py-1 text-[11px] rounded-full transition-all cursor-pointer ${
                  rhythmFilter === '7d'
                    ? 'bg-white text-[#1C1C1E] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                    : 'text-[#6C6C70] font-medium hover:text-[#1C1C1E]'
                }`}
              >
                7 days
              </button>
              <button
                type="button"
                onClick={() => setRhythmFilter('month')}
                className={`px-2.5 py-1 text-[11px] rounded-full transition-all cursor-pointer ${
                  rhythmFilter === 'month'
                    ? 'bg-white text-[#1C1C1E] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                    : 'text-[#6C6C70] font-medium hover:text-[#1C1C1E]'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Recent Stats: Explicitly distinguishes Active days (活动天数) vs Activities (活动次数) + Duration */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#F2F2F7]/75 px-2.5 py-2.5 rounded-[16px] flex flex-col justify-between min-h-[64px]">
              <span className="text-[11px] font-medium text-[#6C6C70]">Active days</span>
              <div className="flex items-baseline gap-1 mt-1 tabular-nums">
                <span className="text-[20px] font-bold text-[#1C1C1E] tracking-[-0.02em] leading-none">
                  {currentRecentData.activeDaysCount}
                </span>
                <span className="text-[10.5px] font-medium text-[#8E8E93]">days</span>
              </div>
            </div>

            <div className="bg-[#F2F2F7]/75 px-2.5 py-2.5 rounded-[16px] flex flex-col justify-between min-h-[64px]">
              <span className="text-[11px] font-medium text-[#6C6C70]">Activities</span>
              <div className="flex items-baseline gap-1 mt-1 tabular-nums">
                <span className="text-[20px] font-bold text-[#1C1C1E] tracking-[-0.02em] leading-none">
                  {currentRecentData.completedCount}
                </span>
                <span className="text-[10.5px] font-medium text-[#8E8E93]">done</span>
              </div>
            </div>

            <div className="bg-[#F2F2F7]/75 px-2.5 py-2.5 rounded-[16px] flex flex-col justify-between min-h-[64px]">
              <span className="text-[11px] font-medium text-[#6C6C70]">Duration</span>
              <div className="flex items-baseline gap-1 mt-1 tabular-nums">
                <span className="text-[20px] font-bold text-[#1C1C1E] tracking-[-0.02em] leading-none">
                  {currentRecentData.activeMinutes}
                </span>
                <span className="text-[10.5px] font-medium text-[#8E8E93]">min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. Module: Your direction (Goal, 1-line approach, next review) */}
      {/* ============================================================ */}
      <section
        id="plan-module-direction"
        onClick={() => setSelectedModule('direction')}
        className="group bg-white hover:bg-[#FAFAFC] active:scale-[0.99] transition-all duration-200 rounded-[24px] p-4 sm:p-4.5 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05),0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer flex flex-col gap-2.5 relative"
        role="button"
        tabIndex={0}
        aria-label="View Your direction details"
        onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('direction')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-[#1C1C1E] tracking-[-0.02em]">Your direction</span>
            {direction.status === 'paused' && (
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#C27838]/15 text-[#C27838]">
                Paused
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#5E5BAE] group-hover:translate-x-0.5 transition-all stroke-[2.2]" />
        </div>

        <div className="flex flex-col gap-1">
          <h4 className="text-[16px] font-bold text-[#1C1C1E] tracking-[-0.015em] leading-snug">
            {direction.goalTitle}
          </h4>
          <p className="text-[13px] text-[#6C6C70] truncate leading-normal">
            {direction.executionApproach}
          </p>
        </div>

        <div className="pt-2 border-t border-black/[0.05] flex items-center justify-between text-[11.5px] text-[#6C6C70]">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 stroke-[2] shrink-0 text-[#5E5BAE]" />
            <span>
              Next review: <strong className="text-[#1C1C1E] font-semibold">{direction.nextReviewDate}</strong>
            </span>
          </span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. Module: What Nova knows (Confirmed Memories ONLY + Separate Pending Prompt) */}
      {/* ============================================================ */}
      <section
        id="plan-module-memory"
        aria-label="What Nova knows"
        className="bg-white rounded-[24px] p-4 sm:p-4.5 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-2.5 relative"
      >
        <button
          type="button"
          onClick={() => setSelectedModule('memory')}
          className="w-full flex items-center justify-between text-left group cursor-pointer"
          aria-label="View all memories in What Nova knows"
        >
          <span className="text-[17px] font-bold text-[#1C1C1E] tracking-[-0.02em]">What Nova knows</span>
          <div className="flex items-center gap-1 text-[12px] font-semibold text-[#5E5BAE]">
            <span>All ({confirmedMemories.length})</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform stroke-[2.2]" />
          </div>
        </button>

        {/* Confirmed Memories List (Strictly isConfirmed === true, 2–3 representative items) */}
        {representativeConfirmedMemories.length === 0 ? (
          <div
            onClick={() => setSelectedModule('memory')}
            className="bg-[#F2F2F7]/75 rounded-[16px] p-3.5 text-[12.5px] text-[#6C6C70] cursor-pointer"
          >
            No confirmed preferences saved yet. Talk to Nova to share what works for you.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {representativeConfirmedMemories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMemory(item)}
                className="w-full bg-[#F2F2F7]/75 hover:bg-[#E5E5EA]/80 active:scale-[0.99] transition-all px-3.5 py-2.5 rounded-[16px] flex items-center justify-between gap-2.5 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5E5BAE] shrink-0" />
                  <span className="text-[13.5px] font-semibold text-[#1C1C1E] truncate">
                    {item.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#5E5BAE] shrink-0 stroke-[2.2]" />
              </button>
            ))}
          </div>
        )}

        {/* Separate Prompt for Pending / Unconfirmed Items */}
        {checkMemories.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedModule('memory')}
            className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#5E5BAE]/15 flex items-center justify-between text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#5E5BAE] shrink-0 stroke-[2.2]" />
              <span className="text-[12px] font-semibold text-[#5E5BAE] truncate">
                Can I check something? ({checkMemories.length} pending)
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#5E5BAE] group-hover:translate-x-0.5 transition-transform shrink-0 stroke-[2.2]" />
          </button>
        )}

        {/* Conversational Entry: Modify, Supplement, or Correct via Nova */}
        <div className="pt-1 flex items-center justify-between">
          <button
            type="button"
            id="plan-memory-talk-btn"
            onClick={() => handleStartTalkToNovaMemory(null)}
            className="w-full py-2.5 px-3.5 rounded-[16px] bg-[#5E5BAE]/[0.08] hover:bg-[#5E5BAE]/[0.14] active:scale-[0.99] text-[#5E5BAE] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Talk to Nova to update or add</span>
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. Module: Health data (Only 2 core metrics + source status) */}
      {/* ============================================================ */}
      <section
        id="plan-module-health"
        onClick={() => setSelectedModule('health')}
        className="group bg-white hover:bg-[#FAFAFC] active:scale-[0.99] transition-all duration-200 rounded-[24px] p-4 sm:p-4.5 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05),0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer flex flex-col gap-3 relative"
        role="button"
        tabIndex={0}
        aria-label="View Health data details"
        onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('health')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold text-[#1C1C1E] tracking-[-0.02em]">Health data</span>
            <span
              className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isAppleHealthConnected
                  ? 'text-[#E11D48] bg-[#FFE4E6]/85'
                  : 'text-[#6C6C70] bg-[#F2F2F7]'
              }`}
            >
              <Heart className="w-2.5 h-2.5 fill-current" />
              {isAppleHealthConnected ? 'Sample sync' : 'Not connected'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#5E5BAE] group-hover:translate-x-0.5 transition-all stroke-[2.2]" />
        </div>

        {/* 2 Core Metrics Only on Level-1 (Resting Heart Rate & Sleep Duration) */}
        <div className="grid grid-cols-2 gap-2.5">
          {HEALTH_METRICS_DEFINITIONS.slice(0, 2).map((metric) => {
            const displayValue = isAppleHealthConnected
              ? metric.sampleValue
              : metric.id === 'rhr'
              ? 'Not connected'
              : 'No data';
            const displayUnit = isAppleHealthConnected ? metric.unit : '';

            return (
              <div
                key={metric.id}
                className="bg-[#F2F2F7]/75 px-3.5 py-3 rounded-[18px] flex flex-col justify-between gap-1.5 min-h-[72px]"
              >
                <span className="text-[11.5px] font-medium text-[#6C6C70] leading-snug">
                  {metric.name}
                </span>

                <div className="flex items-baseline gap-1 flex-wrap tabular-nums">
                  <span
                    className={`font-bold text-[#1C1C1E] tracking-[-0.02em] leading-none ${
                      isAppleHealthConnected ? 'text-[22px]' : 'text-[13px] text-[#8E8E93]'
                    }`}
                  >
                    {displayValue}
                  </span>
                  {displayUnit && (
                    <span className="text-[11px] text-[#8E8E93] font-medium">{displayUnit}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECONDARY DETAIL SHEETS (Rendered via React Portal)           */}
      {/* ============================================================ */}
      {(() => {
        const sheetPortalContent = (
          <AnimatePresence>
            {selectedModule && (
              <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    setSelectedModule(null);
                    setIsEditingDirection(false);
                  }}
                  className="absolute inset-0 bg-black/25 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="relative w-full max-h-[88%] bg-white/95 backdrop-blur-2xl rounded-t-[32px] p-5 sm:p-6 shadow-2xl border-t border-white/90 overflow-y-auto z-10 flex flex-col gap-4 text-[#1C1C1E]"
                  id="my-plan-secondary-sheet"
                >
                  {/* Sheet Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] shrink-0">
                    <div>
                      <h3 className="text-[18px] font-bold text-[#1C1C1E] tracking-[-0.02em]">
                        {selectedModule === 'activity' && 'Activity History'}
                        {selectedModule === 'rhythm' && 'Your rhythm'}
                        {selectedModule === 'direction' && 'Your direction'}
                        {selectedModule === 'memory' && 'What Nova knows'}
                        {selectedModule === 'health' && 'Health data'}
                      </h3>
                      <span className="text-[11.5px] text-[#6C6C70]">
                        {selectedModule === 'activity' && 'Monthly action log & intervals'}
                        {selectedModule === 'rhythm' && 'Long-term trends & recent summary'}
                        {selectedModule === 'direction' && 'Long-term focus & conversational pacing'}
                        {selectedModule === 'memory' && 'Preferences & context Nova remembers'}
                        {selectedModule === 'health' && 'Apple Health integration & metrics'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {selectedModule === 'memory' && (
                        <button
                          type="button"
                          onClick={() => setIsMemoryInfoModalOpen(true)}
                          className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#5E5BAE] transition-colors cursor-pointer"
                          aria-label="How memory works"
                        >
                          <HelpCircle className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModule(null);
                          setIsEditingDirection(false);
                        }}
                        className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#6C6C70] hover:text-[#1C1C1E] transition-colors cursor-pointer"
                        aria-label="Return to Plan"
                      >
                        <X className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 1: YOUR RHYTHM                           */}
                  {/* ======================================================= */}
                  {selectedModule === 'rhythm' && (
                    <div className="flex flex-col gap-4 text-xs text-[#3C3C43]">
                      <div className="flex items-center justify-between bg-[#F2F2F7]/80 p-1 rounded-full border border-black/[0.04]">
                        <span className="text-xs font-semibold text-[#1C1C1E] pl-3">
                          Time range ({currentRecentData.rangeLabel})
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRhythmFilter('7d')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              rhythmFilter === '7d'
                                ? 'bg-white text-[#1C1C1E] shadow-2xs'
                                : 'text-[#6C6C70] hover:text-[#1C1C1E]'
                            }`}
                          >
                            7 days
                          </button>
                          <button
                            type="button"
                            onClick={() => setRhythmFilter('month')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              rhythmFilter === 'month'
                                ? 'bg-white text-[#1C1C1E] shadow-2xs'
                                : 'text-[#6C6C70] hover:text-[#1C1C1E]'
                            }`}
                          >
                            Month
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#F4EEFE]/75 p-3.5 rounded-[18px] border border-[#5E5BAE]/15 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <Sparkles className="w-3.5 h-3.5 text-[#5E5BAE]" />
                          <span>Nova noticed</span>
                        </div>
                        <p className="text-[12.5px] leading-relaxed text-[#1C1C1E]">
                          “{currentRecentData.novaObservation}”
                        </p>
                      </div>

                      {/* 4 Distinct Metrics: Active Days vs Activities vs Active Time vs Rest Days */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-[#F2F2F7]/75 p-2.5 rounded-[16px] border border-black/[0.03] flex flex-col justify-between min-h-[64px]">
                          <span className="text-[10px] font-medium text-[#6C6C70]">Active days</span>
                          <div className="mt-1">
                            <span className="text-[17px] font-bold text-[#1C1C1E] leading-none">
                              {currentRecentData.activeDaysCount}
                            </span>
                            <span className="text-[9.5px] text-[#8E8E93] block mt-0.5">days</span>
                          </div>
                        </div>

                        <div className="bg-[#F2F2F7]/75 p-2.5 rounded-[16px] border border-black/[0.03] flex flex-col justify-between min-h-[64px]">
                          <span className="text-[10px] font-medium text-[#6C6C70]">Activities</span>
                          <div className="mt-1">
                            <span className="text-[17px] font-bold text-[#5E5BAE] leading-none">
                              {currentRecentData.completedCount}
                            </span>
                            <span className="text-[9.5px] text-[#8E8E93] block mt-0.5">sessions</span>
                          </div>
                        </div>

                        <div className="bg-[#F2F2F7]/75 p-2.5 rounded-[16px] border border-black/[0.03] flex flex-col justify-between min-h-[64px]">
                          <span className="text-[10px] font-medium text-[#6C6C70]">Duration</span>
                          <div className="mt-1">
                            <span className="text-[17px] font-bold text-[#1C1C1E] leading-none">
                              {currentRecentData.activeMinutes}
                            </span>
                            <span className="text-[9.5px] text-[#8E8E93] block mt-0.5">minutes</span>
                          </div>
                        </div>

                        <div className="bg-[#F2F2F7]/75 p-2.5 rounded-[16px] border border-black/[0.03] flex flex-col justify-between min-h-[64px]">
                          <span className="text-[10px] font-medium text-[#6C6C70]">Rest days</span>
                          <div className="mt-1">
                            <span className="text-[17px] font-bold text-[#E59980] leading-none">
                              {currentRecentData.restDaysCount}
                            </span>
                            <span className="text-[9.5px] text-[#8E8E93] block mt-0.5">rests</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-[22px] border border-black/[0.04] shadow-2xs flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <BarChart2 className="w-3.5 h-3.5 text-[#5E5BAE]" />
                            <span className="font-bold text-[#1C1C1E] text-[12.5px]">
                              Active minutes ({rhythmFilter === '7d' ? 'by day' : 'by week'})
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-[#5E5BAE]">
                            {currentRecentData.activeMinutes} min total
                          </span>
                        </div>

                        <ActiveMinutesBarChart
                          items={currentRecentData.dailyBreakdown}
                          timeframe={rhythmFilter}
                        />

                        <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[10.5px] text-[#6C6C70]">
                          <span>Purple bars: Active sessions</span>
                          <span className="text-[#E59980]">Peach bars: Rest days</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-[22px] border border-black/[0.04] shadow-2xs flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-[#5E5BAE]" />
                            <span className="font-bold text-[#1C1C1E] text-[12.5px]">
                              Monthly active days (6-month trend)
                            </span>
                          </div>
                          <span className="text-[11px] text-[#6C6C70]">
                            {monthlyTrendSeries[0]?.month} – {monthlyTrendSeries[monthlyTrendSeries.length - 1]?.month} {viewYear}
                          </span>
                        </div>

                        <MonthlyTrendCurve series={monthlyTrendSeries} compact={false} />
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMethodologyOpen(true)}
                        className="w-full py-2.5 px-3 rounded-[16px] bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-black/[0.04] text-[11.5px] font-medium text-[#6C6C70] hover:text-[#1C1C1E] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
                        <span>Data source & calculation methodology</span>
                      </button>
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 2: YOUR DIRECTION                        */}
                  {/* ======================================================= */}
                  {selectedModule === 'direction' && (
                    <div className="flex flex-col gap-4 text-xs text-[#6C6C70]">
                      {!isEditingDirection && (
                        <>
                          <div className="flex items-center justify-between p-4 rounded-[22px] bg-white border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)]">
                            <div>
                              <span className="text-[10.5px] uppercase font-bold text-[#8E8E93] tracking-wider block">
                                Plan Status
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    direction.status === 'active' ? 'bg-[#5E5BAE]' : 'bg-[#C27838]'
                                  }`}
                                />
                                <span className="text-[14px] font-bold text-[#1C1C1E]">
                                  {direction.status === 'active' ? 'Active & Paced' : 'Paused for Recovery'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleTogglePausePlan}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                                direction.status === 'active'
                                  ? 'bg-[#F4EEFE] text-[#5E5BAE] border-[#5E5BAE]/20 hover:bg-[#EDE5FB]'
                                  : 'bg-[#5E5BAE] text-white border-transparent'
                              }`}
                            >
                              {direction.status === 'active' ? (
                                <>
                                  <Pause className="w-3 h-3 stroke-[2.4]" />
                                  <span>Pause Plan</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Resume Plan</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="p-4 rounded-[22px] bg-white border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Compass className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Current Goal</span>
                            </div>
                            <h4 className="text-[16px] font-bold text-[#1C1C1E] leading-tight">
                              {direction.goalTitle}
                            </h4>
                            <p className="text-[12.5px] leading-relaxed text-[#6C6C70]">
                              {direction.description}
                            </p>
                          </div>

                          <div className="p-4 rounded-[22px] bg-white border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Current Execution Approach</span>
                            </div>
                            <p className="text-[13px] font-medium text-[#1C1C1E] leading-relaxed">
                              {direction.executionApproach}
                            </p>
                          </div>

                          <div className="p-4 rounded-[22px] bg-[#F4EEFE]/75 border border-[#5E5BAE]/15 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Sparkles className="w-3.5 h-3.5 text-[#5E5BAE]" />
                              <span>Informed by what Nova knows</span>
                            </div>
                            <p className="text-[12.5px] leading-relaxed text-[#1C1C1E]">
                              {direction.tailoredReason}
                            </p>
                          </div>

                          <div className="p-3.5 rounded-[18px] bg-[#F2F2F7]/75 border border-black/[0.04] flex items-center justify-between text-xs text-[#8E8E93]">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 stroke-[2]" />
                              <span>
                                Next review: <strong className="text-[#1C1C1E]">{direction.nextReviewDate}</strong>
                              </span>
                            </div>
                            <span>{direction.reviewDaysLeft} days remaining</span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={handleOpenDirectionChat}
                              className="w-full py-3 rounded-[18px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                              <span>Talk to Nova to adjust direction</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleStartEditDirection}
                              className="w-full py-2.5 rounded-[16px] bg-white hover:bg-[#FAFAFC] text-[#5E5BAE] border border-[#5E5BAE]/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            >
                              <Sliders className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Select preset or edit manually</span>
                            </button>
                          </div>
                        </>
                      )}

                      {isEditingDirection && (
                        <div className="flex flex-col gap-4">
                          <div className="bg-[#F4EEFE] p-3 rounded-[18px] border border-[#5E5BAE]/20 text-xs text-[#5E5BAE] flex items-center gap-2">
                            <Sliders className="w-4 h-4 stroke-[2] shrink-0" />
                            <span>Adjusting direction. Changes apply only after you confirm below.</span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="font-bold text-[#1C1C1E] text-xs">
                              Select Health Focus Goal:
                            </span>
                            <div className="space-y-2">
                              {PRESET_DIRECTION_GOALS.map((preset) => {
                                const isSelected = directionDraft.goalId === preset.id;
                                return (
                                  <div
                                    key={preset.id}
                                    onClick={() => {
                                      setDirectionDraft((prev) => ({
                                        ...prev,
                                        goalId: preset.id,
                                        goalTitle: preset.title,
                                        description: preset.description,
                                        executionApproach: preset.defaultApproach,
                                        tailoredReason: preset.tailoredReason
                                      }));
                                    }}
                                    className={`p-3.5 rounded-[18px] border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-white border-[#5E5BAE] shadow-2xs ring-1 ring-[#5E5BAE]/20'
                                        : 'bg-white border-black/[0.04] hover:bg-[#FAFAFC]'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`text-[13px] font-bold ${
                                          isSelected ? 'text-[#5E5BAE]' : 'text-[#1C1C1E]'
                                        }`}
                                      >
                                        {preset.title}
                                      </span>
                                      {isSelected && <Check className="w-4 h-4 text-[#5E5BAE] stroke-[2.5]" />}
                                    </div>
                                    <p className="text-[11.5px] text-[#6C6C70] mt-1 leading-relaxed">
                                      {preset.description}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-[#1C1C1E] text-xs">
                              Execution Approach:
                            </span>
                            <textarea
                              rows={2}
                              value={directionDraft.executionApproach}
                              onChange={(e) =>
                                setDirectionDraft((prev) => ({ ...prev, executionApproach: e.target.value }))
                              }
                              className="w-full bg-[#F2F2F7] p-3 rounded-[16px] border border-black/[0.06] text-xs text-[#1C1C1E] outline-none focus:border-[#5E5BAE] focus:bg-white transition-all resize-none shadow-2xs"
                              placeholder="Describe your execution pace and time window..."
                            />
                          </div>

                          <div className="flex items-center justify-between p-3.5 rounded-[18px] bg-white border border-black/[0.04] shadow-2xs">
                            <span className="font-bold text-[#1C1C1E] text-xs">
                              Plan Status:
                            </span>
                            <div className="bg-[#F2F2F7] p-0.5 rounded-full inline-flex border border-black/[0.04]">
                              <button
                                type="button"
                                onClick={() => setDirectionDraft((prev) => ({ ...prev, status: 'active' }))}
                                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                                  directionDraft.status === 'active'
                                    ? 'bg-[#5E5BAE] text-white font-bold shadow-2xs'
                                    : 'text-[#8E8E93] font-medium'
                                }`}
                              >
                                Active
                              </button>
                              <button
                                type="button"
                                onClick={() => setDirectionDraft((prev) => ({ ...prev, status: 'paused' }))}
                                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                                  directionDraft.status === 'paused'
                                    ? 'bg-[#C27838] text-white font-bold shadow-2xs'
                                    : 'text-[#8E8E93] font-medium'
                                }`}
                              >
                                Paused
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 pt-2">
                            <button
                              type="button"
                              onClick={handleCancelDirectionChanges}
                              className="flex-1 py-3 rounded-[16px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-semibold border border-black/[0.04] active:scale-[0.98] transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmDirectionChanges}
                              className="flex-1 py-3 rounded-[16px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Confirm Changes</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 3: WHAT NOVA KNOWS (All Memories Sheet)  */}
                  {/* ======================================================= */}
                  {selectedModule === 'memory' && (
                    <div className="flex flex-col gap-4 text-xs text-[#6C6C70]">
                      <button
                        type="button"
                        onClick={() => handleStartTalkToNovaMemory(null)}
                        className="w-full p-3.5 rounded-[20px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                        <span>Talk to Nova to add, refine, or correct</span>
                      </button>

                      {/* Group 1: What matters to you */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 px-1">
                          <Compass className="w-3.5 h-3.5 text-[#5E5BAE] stroke-[2.2]" />
                          <span className="text-[13px] font-bold text-[#1C1C1E]">What matters to you</span>
                        </div>
                        {mattersMemories.length === 0 ? (
                          <div className="bg-[#F2F2F7]/75 rounded-[18px] p-3.5 border border-black/[0.04] text-xs text-[#8E8E93]">
                            No long-term focus items saved right now.
                          </div>
                        ) : (
                          mattersMemories.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedMemory(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedMemory(item)}
                              className="group bg-white hover:bg-[#FAFAFC] rounded-[20px] p-3.5 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-1.5 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[13.5px] font-bold text-[#1C1C1E] leading-snug">
                                  {item.title}
                                </h4>
                                <ChevronRight className="w-4 h-4 text-[#5E5BAE] shrink-0 mt-0.5 stroke-[2.2]" />
                              </div>
                              <p className="text-[12px] text-[#6C6C70] leading-relaxed line-clamp-2">
                                {item.summary}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Group 2: What feels right */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 px-1">
                          <Heart className="w-3.5 h-3.5 text-[#5E5BAE] stroke-[2.2]" />
                          <span className="text-[13px] font-bold text-[#1C1C1E]">What feels right</span>
                        </div>
                        {feelsRightMemories.length === 0 ? (
                          <div className="bg-[#F2F2F7]/75 rounded-[18px] p-3.5 border border-black/[0.04] text-xs text-[#8E8E93]">
                            No rhythm preferences saved right now.
                          </div>
                        ) : (
                          feelsRightMemories.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedMemory(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedMemory(item)}
                              className="group bg-white hover:bg-[#FAFAFC] rounded-[20px] p-3.5 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-1.5 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[13.5px] font-bold text-[#1C1C1E] leading-snug">
                                  {item.title}
                                </h4>
                                <ChevronRight className="w-4 h-4 text-[#5E5BAE] shrink-0 mt-0.5 stroke-[2.2]" />
                              </div>
                              <p className="text-[12px] text-[#6C6C70] leading-relaxed line-clamp-2">
                                {item.summary}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Group 3: Can I check something? */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#5E5BAE] stroke-[2.2]" />
                            <span className="text-[13px] font-bold text-[#1C1C1E]">Can I check something?</span>
                          </div>
                          {checkMemories.length > 0 && (
                            <span className="text-[10px] font-bold text-[#5E5BAE] bg-[#F4EEFE] px-2 py-0.5 rounded-full border border-[#5E5BAE]/20">
                              {checkMemories.length} new
                            </span>
                          )}
                        </div>
                        {checkMemories.length === 0 ? (
                          <div className="bg-[#F2F2F7]/75 rounded-[18px] p-3.5 border border-black/[0.04] text-xs text-[#8E8E93] flex items-center gap-2">
                            <Check className="w-4 h-4 text-[#5E5BAE] shrink-0" />
                            <span>All caught up — no pending observations to check.</span>
                          </div>
                        ) : (
                          checkMemories.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedMemory(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedMemory(item)}
                              className="bg-[#F4EEFE]/75 hover:bg-[#F4EEFE] rounded-[20px] p-3.5 border border-[#5E5BAE]/20 shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-2.5 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[13.5px] font-bold text-[#1C1C1E] leading-snug">
                                  {item.title}
                                </h4>
                                <ChevronRight className="w-4 h-4 text-[#5E5BAE] shrink-0 mt-0.5 stroke-[2.2]" />
                              </div>
                              <p className="text-[12px] text-[#6C6C70] leading-relaxed">
                                {item.summary}
                              </p>
                              <div className="pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleConfirmPendingMemory(item.id, e)}
                                  className="flex-1 py-2 px-3 rounded-[12px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-semibold shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Yes, save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleStartTalkToNovaMemory(item, e)}
                                  className="py-2 px-3 rounded-[12px] bg-white hover:bg-[#FAFAFC] text-[#5E5BAE] border border-[#5E5BAE]/20 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 stroke-[2]" />
                                  <span>Talk</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDismissPendingMemory(item.id, e)}
                                  className="py-2 px-2.5 rounded-[12px] bg-black/[0.04] hover:bg-black/[0.08] text-[#8E8E93] text-xs font-medium cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {memories.length < INITIAL_MEMORIES.length && (
                        <button
                          type="button"
                          onClick={() => {
                            setMemories(INITIAL_MEMORIES);
                            showMemoryFeedback('Sample memories restored');
                          }}
                          className="self-center text-[11px] font-semibold text-[#8E8E93] hover:text-[#5E5BAE] flex items-center gap-1 py-1 px-3 rounded-full bg-white border border-black/[0.06] shadow-2xs transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore sample memories</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 4: HEALTH DATA (Apple Health Details)    */}
                  {/* ======================================================= */}
                  {selectedModule === 'health' && (
                    <div className="flex flex-col gap-4 text-xs text-[#6C6C70]">
                      <div className="p-4 rounded-[22px] bg-white border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center shrink-0">
                              <Heart className="w-4 h-4 fill-current" />
                            </div>
                            <div>
                              <h4 className="text-[14px] font-bold text-[#1C1C1E]">
                                Apple Health Connection
                              </h4>
                              <span className="text-[11px] text-[#8E8E93]">
                                {isAppleHealthConnected ? 'Sample sync active (Demo)' : 'Not connected'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsAppleHealthConnected(!isAppleHealthConnected)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                              isAppleHealthConnected
                                ? 'bg-[#FFE4E6]/40 text-[#E11D48] border-[#E11D48]/30 hover:bg-[#FFE4E6]/60'
                                : 'bg-[#5E5BAE] text-white border-transparent shadow-2xs'
                            }`}
                          >
                            {isAppleHealthConnected ? 'Disconnect' : 'Connect Demo'}
                          </button>
                        </div>

                        <div className="p-3 rounded-[16px] bg-[#F2F2F7]/75 border border-black/[0.04] text-[11.5px] leading-relaxed text-[#6C6C70]">
                          {isAppleHealthConnected ? (
                            <span className="flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 text-[#5E5BAE] shrink-0 mt-0.5" />
                              <span>Frontend demo mode: Displays sample metrics with explicit attribution. No real HealthKit data is accessed.</span>
                            </span>
                          ) : (
                            <span className="flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-[#8E8E93] shrink-0 mt-0.5" />
                              <span>Apple Health is not connected. All indicators display “Not connected / No data” rather than false zero counts.</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <span className="font-bold text-[#1C1C1E] text-xs">
                          Biometric Baseline Indicators
                        </span>

                        <div className="space-y-2.5">
                          {HEALTH_METRICS_DEFINITIONS.map((metric) => {
                            const IconComponent = metric.icon;
                            const isConnected = isAppleHealthConnected;
                            const valueText = isConnected
                              ? metric.sampleValue
                              : metric.id === 'rhr'
                              ? 'Not connected'
                              : 'No data';
                            const unitText = isConnected ? metric.unit : '';
                            const lastUpdatedText = isConnected ? metric.lastUpdated : 'Not synced';
                            const sourceText = isConnected ? metric.source : 'None';

                            return (
                              <div
                                key={metric.id}
                                className="p-3.5 rounded-[20px] bg-white border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-6 h-6 rounded-full ${metric.iconBg} ${metric.iconColor} flex items-center justify-center shrink-0`}
                                    >
                                      <IconComponent className="w-3.5 h-3.5 stroke-[2.2]" />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#1C1C1E]">
                                      {metric.name}
                                    </span>
                                  </div>

                                  <div className="flex items-baseline gap-1">
                                    <span
                                      className={`font-bold text-[#1C1C1E] ${
                                        isConnected ? 'text-[17px]' : 'text-[12px] text-[#8E8E93]'
                                      }`}
                                    >
                                      {valueText}
                                    </span>
                                    {unitText && (
                                      <span className="text-[11px] text-[#8E8E93]">{unitText}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-1.5 border-t border-black/[0.04] flex items-center justify-between text-[10.5px] text-[#8E8E93]">
                                  <span>
                                    Source: <strong className="text-[#1C1C1E] font-medium">{sourceText}</strong>
                                  </span>
                                  <span>Updated: {lastUpdatedText}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-4 rounded-[22px] bg-white border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                          <span>How Plan B uses health data</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-[#6C6C70]">
                          Plan B reads resting heart rate and sleep consistency solely to detect physiological fatigue and automatically soften daily recommendations into gentle 5-minute living room stretches.
                        </p>
                      </div>

                      <div className="p-4 rounded-[22px] bg-[#F4EEFE]/75 border border-[#5E5BAE]/15 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <Sparkles className="w-3.5 h-3.5 text-[#5E5BAE]" />
                          <span>No Apple Health? No problem.</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-[#1C1C1E]">
                          Plan B is completely functional without Apple Health or wearable sensors. Daily check-ins with Nova and manual progress tracking give you the complete experience.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 5: ACTIVITY HISTORY                      */}
                  {/* ======================================================= */}
                  {selectedModule === 'activity' && (
                    <div className="flex flex-col gap-4 text-xs text-[#6C6C70]">
                      <div className="p-4 rounded-[22px] bg-white border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#5E5BAE]/10 text-[#5E5BAE] flex items-center justify-center font-bold">
                              <CalendarIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-[14px] font-bold text-[#1C1C1E]">
                                {MONTH_NAMES[viewMonth]} {viewYear}
                              </h4>
                              <span className="text-[11px] text-[#8E8E93]">
                                Monthly pacing & log overview
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setPickerYear(viewYear);
                              setIsMonthPickerOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F4EEFE] hover:bg-[#EDE5FB] text-[#5E5BAE] border border-[#5E5BAE]/15 transition-all cursor-pointer"
                          >
                            Switch month
                          </button>
                        </div>

                        {/* Explicitly distinguishes Active days vs Activities vs Rests vs Duration */}
                        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-black/[0.04] text-center">
                          <div className="bg-[#F2F2F7]/80 p-2 rounded-[14px]">
                            <span className="text-[15px] font-bold text-[#5E5BAE] block leading-none">
                              {activeDaysCount}
                            </span>
                            <span className="text-[9.5px] text-[#8E8E93] mt-0.5 block">active days</span>
                          </div>
                          <div className="bg-[#F2F2F7]/80 p-2 rounded-[14px]">
                            <span className="text-[15px] font-bold text-[#1C1C1E] block leading-none">
                              {completedSessionsInMonth}
                            </span>
                            <span className="text-[9.5px] text-[#8E8E93] mt-0.5 block">activities</span>
                          </div>
                          <div className="bg-[#F2F2F7]/80 p-2 rounded-[14px]">
                            <span className="text-[15px] font-bold text-[#E59980] block leading-none">
                              {restDaysCount}
                            </span>
                            <span className="text-[9.5px] text-[#8E8E93] mt-0.5 block">rest days</span>
                          </div>
                          <div className="bg-[#F2F2F7]/80 p-2 rounded-[14px]">
                            <span className="text-[15px] font-bold text-[#1C1C1E] block leading-none">
                              {totalMinutes}m
                            </span>
                            <span className="text-[9.5px] text-[#8E8E93] mt-0.5 block">duration</span>
                          </div>
                        </div>
                      </div>

                      {/* Logged Records List */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1C1C1E] text-xs">
                            Recorded Days ({currentMonthRecords.length})
                          </span>
                          <span className="text-[10.5px] text-[#8E8E93]">
                            Tap edit to modify or clear
                          </span>
                        </div>

                        {currentMonthRecords.length === 0 ? (
                          <div className="p-6 text-center rounded-[20px] bg-white border border-black/[0.04] text-[#8E8E93] shadow-2xs">
                            No activity or rest recorded yet for this month. Tap any day on the calendar grid to log an action.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...currentMonthRecords]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((rec) => {
                                const dObj = new Date(rec.date + 'T00:00:00');
                                const isToday = rec.date === deviceToday.dateStr;
                                const dateLabel = dObj.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  weekday: 'short'
                                });
                                const sessCount = rec.sessionsCount ?? 1;

                                return (
                                  <div
                                    key={rec.date}
                                    className="p-3.5 rounded-[18px] bg-white border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex items-center justify-between gap-3"
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <div
                                        className={`w-3 h-3 rounded-[4px] mt-1 shrink-0 ${
                                          rec.type === 'active' ? 'bg-[#5E5BAE]' : 'bg-[#E59980]'
                                        }`}
                                      />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-[#1C1C1E] text-[13px]">
                                            {dateLabel}
                                          </span>
                                          {isToday && (
                                            <span className="bg-[#5E5BAE] text-white text-[9.5px] px-1.5 py-0.2 rounded-full font-bold">
                                              Today
                                            </span>
                                          )}
                                          {rec.isSample && (
                                            <span className="text-[9.5px] text-[#8E8E93] bg-[#F2F2F7] px-1.5 py-0.2 rounded-full">
                                              Sample
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[12px] text-[#6C6C70] mt-0.5 truncate">
                                          {rec.type === 'active' ? (
                                            <span>
                                              {rec.title} • {sessCount}{' '}
                                              {sessCount === 1 ? 'activity' : 'activities'} •{' '}
                                              {rec.durationMinutes}m
                                            </span>
                                          ) : (
                                            <span>{rec.title || 'Mindful rest day'}</span>
                                          )}
                                        </div>
                                        {rec.note && (
                                          <div className="text-[11px] text-[#8E8E93] mt-0.5 italic truncate">
                                            “{rec.note}”
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenDayDetail(rec.date)}
                                      className="px-2.5 py-1 rounded-[10px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[11px] font-semibold text-[#5E5BAE] shrink-0 transition-colors cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(sheetPortalContent, phoneFrameRef.current);
        }
        return sheetPortalContent;
      })()}

      {/* ============================================================ */}
      {/* SINGLE MEMORY ITEM DETAIL SHEET (Portal to Phone Frame)      */}
      {/* ============================================================ */}
      {(() => {
        const memoryDetailPortal = (
          <AnimatePresence>
            {selectedMemory && (
              <div className="absolute inset-0 z-55 flex flex-col justify-end pointer-events-auto overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedMemory(null)}
                  className="absolute inset-0 bg-black/30 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 290 }}
                  className="relative w-full max-h-[86%] bg-white/95 backdrop-blur-2xl rounded-t-[32px] p-6 shadow-2xl border-t border-black/[0.04] overflow-y-auto z-10 flex flex-col gap-4 text-[#1C1C1E]"
                  id="memory-detail-sheet"
                >
                  <div className="flex items-start justify-between gap-3 pb-2 border-b border-black/[0.05]">
                    <div>
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5E5BAE] bg-[#F4EEFE] border border-[#5E5BAE]/20 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                        {selectedMemory.category === 'matters' && 'What matters to you'}
                        {selectedMemory.category === 'feels_right' && 'What feels right'}
                        {selectedMemory.category === 'check' && 'Can I check something?'}
                      </span>
                      <h3 className="text-[17px] font-bold text-[#1C1C1E] leading-snug">
                        {selectedMemory.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMemory(null)}
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] shrink-0 cursor-pointer transition-colors"
                      aria-label="Close memory detail"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="p-4 rounded-[20px] bg-[#F2F2F7]/75 border border-black/[0.04] flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
                      Memory Summary
                    </span>
                    <p className="text-[13px] text-[#1C1C1E] leading-relaxed">
                      {selectedMemory.summary}
                    </p>
                  </div>

                  <div className="p-4 rounded-[20px] bg-[#F2F2F7]/75 border border-black/[0.04] flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                      <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>How Nova learned this</span>
                    </div>
                    <p className="text-[12.5px] text-[#6C6C70] leading-relaxed">
                      {selectedMemory.learnedFrom}
                    </p>
                    <span className="text-[10.5px] text-[#8E8E93] mt-0.5">
                      {selectedMemory.updatedAt}
                    </span>
                  </div>

                  <div className="p-4 rounded-[20px] bg-[#F4EEFE]/75 border border-[#5E5BAE]/15 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                      <Sparkles className="w-3.5 h-3.5 text-[#5E5BAE]" />
                      <span>How this helps your plan</span>
                    </div>
                    <p className="text-[12.5px] text-[#1C1C1E] leading-relaxed">
                      {selectedMemory.howItHelps}
                    </p>
                  </div>

                  {!selectedMemory.isConfirmed && (
                    <div className="p-3.5 rounded-[18px] bg-white border border-[#5E5BAE]/25 shadow-2xs flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1C1C1E]">
                        Does this feel accurate?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmPendingMemory(selectedMemory.id)}
                          className="px-3 py-1.5 rounded-[12px] bg-[#5E5BAE] text-white text-xs font-semibold cursor-pointer shadow-2xs hover:bg-[#524FA0]"
                        >
                          Yes, save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissPendingMemory(selectedMemory.id)}
                          className="px-2.5 py-1.5 rounded-[12px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#8E8E93] text-xs font-medium cursor-pointer"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleStartTalkToNovaMemory(selectedMemory)}
                      className="w-full py-3 rounded-[18px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                      <span>Talk to Nova about this</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemoryToDelete(selectedMemory)}
                      className="w-full py-2.5 rounded-[16px] bg-white hover:bg-[#FFE4E6]/40 text-[#E11D48] border border-[#E11D48]/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      <span>Remove from memory</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(memoryDetailPortal, phoneFrameRef.current);
        }
        return memoryDetailPortal;
      })()}

      {/* ============================================================ */}
      {/* TALK TO NOVA MEMORY CONVERSATION SHEET (Update / Add / Correct) */}
      {/* ============================================================ */}
      {(() => {
        const quickMemoryChips = editingMemory
          ? [
              'Prefer evenings after 6:30 PM instead',
              'Keep it shorter (5–10 minutes)',
              'Prefer quiet morning walks before work'
            ]
          : [
              'I prefer quiet 10-minute morning walks before work',
              'Keep movements low-impact for joint comfort',
              'I like calm screen-free wind-downs after 8:30 PM'
            ];

        const memoryChatPortal = (
          <AnimatePresence>
            {isMemoryChatOpen && (
              <div className="absolute inset-0 z-60 flex flex-col justify-end pointer-events-auto overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setIsMemoryChatOpen(false);
                    setEditingMemory(null);
                  }}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 290 }}
                  className="relative w-full h-[82%] bg-white/95 backdrop-blur-2xl rounded-t-[32px] shadow-2xl border-t border-black/[0.04] z-10 flex flex-col overflow-hidden text-[#1C1C1E]"
                  id="memory-talk-sheet"
                >
                  <div className="px-6 pt-5 pb-3 border-b border-black/[0.05] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#E5DDFB] to-[#F3EEFE] border border-white shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
                        <FurryNovaStaticAvatar size={36} className="w-full h-full" />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-[#1C1C1E] leading-tight">
                          Talk to Nova
                        </h4>
                        <span className="text-[11px] text-[#8E8E93] block">
                          {editingMemory
                            ? 'Refine memory • Confirms before saving'
                            : 'Add or update what Nova knows'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMemoryChatOpen(false);
                        setEditingMemory(null);
                      }}
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] cursor-pointer transition-colors"
                      aria-label="Close conversation"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  {editingMemory && (
                    <div className="mx-6 mt-3 px-3.5 py-2 rounded-[14px] bg-[#F2F2F7]/75 border border-black/[0.04] flex items-center gap-2 text-[11.5px] text-[#6C6C70] shrink-0">
                      <CornerDownRight className="w-3.5 h-3.5 text-[#5E5BAE] shrink-0" />
                      <span className="truncate font-medium">{editingMemory.title}</span>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 scrollbar-none">
                    {memoryChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.sender === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[88%] rounded-[20px] px-4 py-3 text-[13px] leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-[#5E5BAE] text-white rounded-br-[6px]'
                              : 'bg-[#F2F2F7]/90 text-[#1C1C1E] border border-black/[0.04] rounded-bl-[6px] shadow-2xs'
                          }`}
                        >
                          {msg.text}
                        </div>

                        {msg.proposal && (
                          <div className="mt-2.5 w-full max-w-[92%] bg-white rounded-[20px] p-4 border border-[#5E5BAE]/25 shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5E5BAE]">
                                {msg.proposal.mode === 'update'
                                  ? 'Proposed Memory Update'
                                  : 'Proposed New Memory'}
                              </span>
                              <span className="text-[10px] text-[#8E8E93] bg-[#F2F2F7] px-2 py-0.5 rounded-full border border-black/5">
                                Needs confirmation
                              </span>
                            </div>

                            <h5 className="text-[13.5px] font-bold text-[#1C1C1E] leading-snug">
                              {msg.proposal.newTitle}
                            </h5>
                            <p className="text-[12px] text-[#6C6C70] leading-relaxed">
                              {msg.proposal.newSummary}
                            </p>

                            {msg.proposalAccepted ? (
                              <div className="py-2 px-3 rounded-[12px] bg-[#F4EEFE] text-[#5E5BAE] text-xs font-bold flex items-center justify-center gap-1.5 border border-[#5E5BAE]/20">
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>Confirmed & Saved</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmMemoryProposal(msg.id)}
                                  className="flex-1 py-2.5 px-3 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Confirm & Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsMemoryChatOpen(false);
                                    setEditingMemory(null);
                                  }}
                                  className="py-2.5 px-3 rounded-[14px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#8E8E93] text-xs font-semibold cursor-pointer"
                                >
                                  Keep as is
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {memoryChatMessages.length === 1 && (
                      <div className="pt-1 flex flex-col items-start gap-1.5">
                        <span className="text-[11px] text-[#8E8E93] pl-1">
                          Quick ways to {editingMemory ? 'adjust' : 'share'}:
                        </span>
                        {quickMemoryChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleSendMemoryChat(chip)}
                            className="text-left text-xs font-semibold text-[#5E5BAE] bg-white hover:bg-[#FAFAFC] px-3.5 py-2 rounded-[16px] border border-[#5E5BAE]/20 shadow-2xs transition-all active:scale-98 cursor-pointer"
                          >
                            “{chip}”
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={memoryChatEndRef} />
                  </div>

                  <div className="p-4 bg-white/90 backdrop-blur-md border-t border-black/[0.06] flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={memoryChatInput}
                      onChange={(e) => setMemoryChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMemoryChat()}
                      placeholder="Tell Nova what feels right for you..."
                      className="flex-1 bg-[#F2F2F7] px-4 py-2.5 rounded-full text-xs text-[#1C1C1E] placeholder-[#8E8E93] border border-black/[0.06] focus:outline-none focus:border-[#5E5BAE] focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendMemoryChat()}
                      disabled={!memoryChatInput.trim()}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        memoryChatInput.trim()
                          ? 'bg-[#5E5BAE] text-white cursor-pointer shadow-xs'
                          : 'bg-black/10 text-black/30 cursor-not-allowed'
                      }`}
                      aria-label="Send message"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(memoryChatPortal, phoneFrameRef.current);
        }
        return memoryChatPortal;
      })()}

      {/* ============================================================ */}
      {/* TALK TO NOVA DIRECTION ADJUSTMENT SHEET                      */}
      {/* ============================================================ */}
      {(() => {
        const directionChips = [
          'Keep it to 3 light days a week',
          'Focus on unwinding for deeper evening rest',
          'Ease afternoon neck & desk stiffness'
        ];

        const directionChatPortal = (
          <AnimatePresence>
            {isDirectionChatOpen && (
              <div className="absolute inset-0 z-60 flex flex-col justify-end pointer-events-auto overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDirectionChatOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 290 }}
                  className="relative w-full h-[80%] bg-white/95 backdrop-blur-2xl rounded-t-[32px] shadow-2xl border-t border-black/[0.04] z-10 flex flex-col overflow-hidden text-[#1C1C1E]"
                  id="direction-talk-sheet"
                >
                  <div className="px-6 pt-5 pb-3 border-b border-black/[0.05] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#E5DDFB] to-[#F3EEFE] border border-white shadow-xs overflow-hidden shrink-0 flex items-center justify-center">
                        <FurryNovaStaticAvatar size={36} className="w-full h-full" />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-[#1C1C1E] leading-tight">
                          Adjust direction with Nova
                        </h4>
                        <span className="text-[11px] text-[#8E8E93] block">
                          References your memory • Confirms before updating
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDirectionChatOpen(false)}
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] cursor-pointer transition-colors"
                      aria-label="Close direction chat"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 scrollbar-none">
                    {directionChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.sender === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[88%] rounded-[20px] px-4 py-3 text-[13px] leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-[#5E5BAE] text-white rounded-br-[6px]'
                              : 'bg-[#F2F2F7]/90 text-[#1C1C1E] border border-black/[0.04] rounded-bl-[6px] shadow-2xs'
                          }`}
                        >
                          {msg.text}
                        </div>

                        {msg.proposedDirection && (
                          <div className="mt-2.5 w-full max-w-[92%] bg-white rounded-[20px] p-4 border border-[#5E5BAE]/25 shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05)] flex flex-col gap-2">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5E5BAE]">
                              Proposed Direction Update
                            </span>
                            <h5 className="text-[14px] font-bold text-[#1C1C1E] leading-snug">
                              {msg.proposedDirection.goalTitle}
                            </h5>
                            <p className="text-[12px] text-[#6C6C70] leading-relaxed">
                              {msg.proposedDirection.executionApproach}
                            </p>

                            {msg.accepted ? (
                              <div className="py-2 px-3 rounded-[12px] bg-[#F4EEFE] text-[#5E5BAE] text-xs font-bold flex items-center justify-center gap-1.5 border border-[#5E5BAE]/20">
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>Direction Updated</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptDirectionProposal(msg.id)}
                                  className="flex-1 py-2.5 px-3 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Confirm Direction</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsDirectionChatOpen(false)}
                                  className="py-2.5 px-3 rounded-[14px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#8E8E93] text-xs font-semibold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {directionChatMessages.length === 1 && (
                      <div className="pt-1 flex flex-col items-start gap-1.5">
                        <span className="text-[11px] text-[#8E8E93] pl-1">
                          Quick ways to adjust your direction:
                        </span>
                        {directionChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleSendDirectionChat(chip)}
                            className="text-left text-xs font-semibold text-[#5E5BAE] bg-white hover:bg-[#FAFAFC] px-3.5 py-2 rounded-[16px] border border-[#5E5BAE]/20 shadow-2xs transition-all active:scale-98 cursor-pointer"
                          >
                            “{chip}”
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={directionChatEndRef} />
                  </div>

                  <div className="p-4 bg-white/90 backdrop-blur-md border-t border-black/[0.06] flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={directionChatInput}
                      onChange={(e) => setDirectionChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendDirectionChat()}
                      placeholder="Describe how you’d like to pace your plan..."
                      className="flex-1 bg-[#F2F2F7] px-4 py-2.5 rounded-full text-xs text-[#1C1C1E] placeholder-[#8E8E93] border border-black/[0.06] focus:outline-none focus:border-[#5E5BAE] focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendDirectionChat()}
                      disabled={!directionChatInput.trim()}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        directionChatInput.trim()
                          ? 'bg-[#5E5BAE] text-white cursor-pointer shadow-xs'
                          : 'bg-black/10 text-black/30 cursor-not-allowed'
                      }`}
                      aria-label="Send direction adjustment"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(directionChatPortal, phoneFrameRef.current);
        }
        return directionChatPortal;
      })()}

      {/* ============================================================ */}
      {/* DELETE MEMORY CONFIRMATION MODAL                             */}
      {/* ============================================================ */}
      {(() => {
        const deleteModalPortal = (
          <AnimatePresence>
            {memoryToDelete && (
              <div className="absolute inset-0 z-65 flex items-center justify-center p-6 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMemoryToDelete(null)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  className="relative bg-white/95 backdrop-blur-2xl rounded-[26px] p-5 border border-black/[0.04] shadow-2xl z-10 w-full max-w-[310px] flex flex-col gap-3.5 text-[#1C1C1E]"
                >
                  <div className="flex items-center gap-2 text-[#E11D48]">
                    <Trash2 className="w-4 h-4 stroke-[2.2]" />
                    <h4 className="text-[15px] font-bold text-[#1C1C1E]">Remove this memory?</h4>
                  </div>

                  <p className="text-xs text-[#6C6C70] leading-relaxed">
                    Nova will stop using <strong>“{memoryToDelete.title}”</strong> when personalizing your suggestions.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMemoryToDelete(null)}
                      className="flex-1 py-2.5 rounded-[14px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-xs font-semibold text-[#1C1C1E] cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteMemoryConfirmed}
                      className="flex-1 py-2.5 rounded-[14px] bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(deleteModalPortal, phoneFrameRef.current);
        }
        return deleteModalPortal;
      })()}

      {/* ============================================================ */}
      {/* HOW MEMORY WORKS INFO MODAL                                  */}
      {/* ============================================================ */}
      {(() => {
        const memoryInfoPortal = (
          <AnimatePresence>
            {isMemoryInfoModalOpen && (
              <div className="absolute inset-0 z-65 flex items-center justify-center p-6 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMemoryInfoModalOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  className="relative bg-white/95 backdrop-blur-2xl rounded-[24px] p-5 border border-black/[0.04] shadow-2xl z-10 w-full max-w-[320px] flex flex-col gap-3.5 text-[#1C1C1E]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.05]">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#5E5BAE]" />
                      <h4 className="text-[15px] font-bold text-[#1C1C1E]">How Memory works</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMemoryInfoModalOpen(false)}
                      className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] cursor-pointer transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-[#6C6C70] leading-relaxed">
                    <p>
                      <strong className="text-[#1C1C1E] font-semibold block mb-0.5">
                        • Transparent & under your control
                      </strong>
                      Nova only remembers practical rhythm preferences and goals that help tailor your daily suggestions.
                    </p>
                    <p>
                      <strong className="text-[#1C1C1E] font-semibold block mb-0.5">
                        • Nothing changes without your confirmation
                      </strong>
                      New observations wait in “Can I check something?” until you approve them, and conversational edits always show a confirmation preview first.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMemoryInfoModalOpen(false)}
                    className="w-full py-2.5 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-semibold shadow-2xs mt-1 transition-colors cursor-pointer"
                  >
                    Got it
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(memoryInfoPortal, phoneFrameRef.current);
        }
        return memoryInfoPortal;
      })()}

      {/* ============================================================ */}
      {/* Lightweight Methodology Modal (Inside Your Rhythm)           */}
      {/* ============================================================ */}
      {(() => {
        const infoModalContent = (
          <AnimatePresence>
            {isMethodologyOpen && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-6 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMethodologyOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="relative bg-white/95 backdrop-blur-2xl rounded-[24px] p-5 border border-black/[0.04] shadow-2xl z-10 w-full max-w-[320px] flex flex-col gap-3.5 text-[#1C1C1E]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.05]">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-[#5E5BAE]" />
                      <h4 className="text-[15px] font-bold text-[#1C1C1E]">How it’s measured</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMethodologyOpen(false)}
                      className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] cursor-pointer transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-[#6C6C70] leading-relaxed">
                    <div>
                      <strong className="text-[#1C1C1E] font-semibold block mb-0.5">
                        • Active days (days)
                      </strong>
                      Count of unique calendar days with at least 1 logged activity.
                    </div>

                    <div>
                      <strong className="text-[#1C1C1E] font-semibold block mb-0.5">
                        • Activities (sessions)
                      </strong>
                      Total number of completed activity sessions across those active days.
                    </div>

                    <div>
                      <strong className="text-[#1C1C1E] font-semibold block mb-0.5">
                        • Duration (minutes) & Rest days
                      </strong>
                      Cumulative minutes of completed sessions, plus logged restorative rest days.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMethodologyOpen(false)}
                    className="w-full py-2.5 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-semibold shadow-2xs mt-1 transition-colors cursor-pointer"
                  >
                    Got it
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(infoModalContent, phoneFrameRef.current);
        }
        return infoModalContent;
      })()}

      {/* ============================================================ */}
      {/* Month Picker Modal                                           */}
      {/* ============================================================ */}
      {(() => {
        const monthPickerModalContent = (
          <AnimatePresence>
            {isMonthPickerOpen && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-5 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMonthPickerOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  className="relative bg-white/95 backdrop-blur-2xl rounded-[26px] p-5 border border-black/[0.04] shadow-2xl z-10 w-full max-w-[325px] flex flex-col gap-3 text-[#1C1C1E]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.05]">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-[#5E5BAE]" />
                      <h4 className="text-[15px] font-bold text-[#1C1C1E]">Select Month</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMonthPickerOpen(false)}
                      className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] cursor-pointer transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#F2F2F7]/80 rounded-[14px]">
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y - 1)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#5E5BAE] hover:bg-black/5 active:scale-95 rounded-[8px] transition-all cursor-pointer"
                      aria-label="Previous year"
                    >
                      ‹ {pickerYear - 1}
                    </button>
                    <span className="text-[13px] font-bold text-[#1C1C1E]">
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y + 1)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#5E5BAE] hover:bg-black/5 active:scale-95 rounded-[8px] transition-all cursor-pointer"
                      aria-label="Next year"
                    >
                      {pickerYear + 1} ›
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-0.5">
                    {MONTH_NAMES.map((monthName, idx) => {
                      const isSelected = pickerYear === viewYear && idx === viewMonth;
                      const isCurrent =
                        pickerYear === deviceToday.year && idx === deviceToday.month;
                      const mPrefix = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                      const mRecords = Object.values(activityLogs).filter((r) =>
                        r.date.startsWith(mPrefix)
                      );
                      const mActive = mRecords.filter((r) => r.type === 'active').length;
                      const mRest = mRecords.filter((r) => r.type === 'rest').length;

                      return (
                        <button
                          key={`${pickerYear}-${idx}`}
                          type="button"
                          onClick={() => handleSelectMonth(pickerYear, idx)}
                          className={`w-full p-2.5 rounded-[16px] text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#5E5BAE] text-white font-bold shadow-2xs'
                              : 'bg-[#F2F2F7]/75 hover:bg-[#E5E5EA] text-[#1C1C1E] border border-black/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[13px]">{monthName}</span>
                            {isCurrent && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#F4EEFE] text-[#5E5BAE] border border-[#5E5BAE]/20'
                                }`}
                              >
                                Current
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[11px] ${
                              isSelected ? 'text-white/80' : 'text-[#8E8E93]'
                            }`}
                          >
                            {mActive} active • {mRest} rest
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(monthPickerModalContent, phoneFrameRef.current);
        }
        return monthPickerModalContent;
      })()}

      {/* ============================================================ */}
      {/* Day Detail & Correction Modal (Log, Correct, or Clear Record) */}
      {/* ============================================================ */}
      {(() => {
        const currentRecord = activeDayModalDate ? activityLogs[activeDayModalDate] : null;
        let formattedDateString = '';
        let isSelectedDayToday = false;

        if (activeDayModalDate) {
          const dObj = new Date(activeDayModalDate + 'T00:00:00');
          formattedDateString = dObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          isSelectedDayToday = activeDayModalDate === deviceToday.dateStr;
        }

        const isSaveDisabled = dayDraftType === 'active' && !dayDraftTitle.trim();

        const dayModalContent = (
          <AnimatePresence>
            {activeDayModalDate && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-5 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveDayModalDate(null)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  className="relative bg-white/95 backdrop-blur-2xl rounded-[26px] p-5 border border-black/[0.04] shadow-2xl z-10 w-full max-w-[340px] flex flex-col gap-3.5 text-[#1C1C1E] max-h-[88%] overflow-y-auto"
                >
                  <div className="flex items-start justify-between pb-2 border-b border-black/[0.05]">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-[15px] font-bold text-[#1C1C1E]">
                          {formattedDateString}
                        </h4>
                        {isSelectedDayToday && (
                          <span className="bg-[#5E5BAE] text-white text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8E8E93] block mt-0.5">
                        {currentRecord?.isSample
                          ? 'Sample record • Demo data'
                          : currentRecord
                          ? 'Logged in local session'
                          : 'No record yet • Tap below to log'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveDayModalDate(null)}
                      className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#1C1C1E] cursor-pointer shrink-0 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div
                    className={`p-3.5 rounded-[18px] border flex flex-col gap-1 ${
                      currentRecord?.type === 'active'
                        ? 'bg-[#F4EEFE]/75 border-[#5E5BAE]/20 text-[#1C1C1E]'
                        : currentRecord?.type === 'rest'
                        ? 'bg-[#FFE4E6]/50 border-[#E11D48]/20 text-[#1C1C1E]'
                        : 'bg-[#F2F2F7]/75 border-black/[0.04] text-[#8E8E93]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                        Current Record Status
                      </span>
                      {currentRecord?.type === 'active' && (
                        <span className="text-[11px] font-bold text-[#5E5BAE]">
                          {currentRecord.sessionsCount ?? 1}{' '}
                          {(currentRecord.sessionsCount ?? 1) === 1 ? 'activity' : 'activities'} •{' '}
                          {currentRecord.durationMinutes} min
                        </span>
                      )}
                      {currentRecord?.type === 'rest' && (
                        <span className="text-[11px] font-bold text-[#E11D48]">
                          Mindful rest
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-[#1C1C1E] mt-0.5">
                      {currentRecord?.type === 'active' &&
                        (currentRecord.title || 'Active session')}
                      {currentRecord?.type === 'rest' &&
                        (currentRecord.title || 'Mindful rest day')}
                      {(!currentRecord || currentRecord.type === 'none') &&
                        'No activity or rest recorded for this day'}
                    </div>
                    {currentRecord?.note && (
                      <p className="text-[11.5px] text-[#6C6C70] italic mt-0.5">
                        “{currentRecord.note}”
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#1C1C1E]">
                      Log or Correct Record
                    </span>

                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F2F2F7] rounded-[14px] border border-black/[0.04]">
                      <button
                        type="button"
                        onClick={() => {
                          setDayDraftType('active');
                          if (dayDraftType === 'rest' || !dayDraftTitle.trim()) {
                            setDayDraftTitle('15-min mindful walk');
                            setDayDraftDuration(15);
                            setDayDraftSessions(1);
                          }
                        }}
                        className={`py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'active'
                            ? 'bg-[#5E5BAE] text-white shadow-2xs font-bold'
                            : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                        }`}
                      >
                        Active
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDayDraftType('rest');
                          setDayDraftTitle('Mindful rest day');
                          setDayDraftDuration(0);
                          setDayDraftSessions(0);
                        }}
                        className={`py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'rest'
                            ? 'bg-[#E11D48] text-white shadow-2xs font-bold'
                            : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                        }`}
                      >
                        Rest
                      </button>

                      <button
                        type="button"
                        onClick={() => setDayDraftType('none')}
                        className={`py-1.5 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'none'
                            ? 'bg-white text-[#1C1C1E] shadow-2xs font-bold'
                            : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                        }`}
                      >
                        Clear
                      </button>
                    </div>

                    {dayDraftType === 'active' && (
                      <div className="flex flex-col gap-2 pt-1">
                        <span className="text-[11px] font-medium text-[#8E8E93]">
                          Quick Presets
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { title: '15-min mindful walk', dur: 15, sess: 1 },
                            { title: '5-min desk stretch', dur: 5, sess: 1 },
                            { title: 'Walk + evening stretch', dur: 20, sess: 2 },
                            { title: '10-min breath reset', dur: 10, sess: 1 }
                          ].map((preset) => (
                            <button
                              key={preset.title}
                              type="button"
                              onClick={() => {
                                setDayDraftTitle(preset.title);
                                setDayDraftDuration(preset.dur);
                                setDayDraftSessions(preset.sess);
                              }}
                              className={`p-2 rounded-[12px] text-left text-[11px] font-semibold border transition-all cursor-pointer ${
                                dayDraftTitle === preset.title
                                  ? 'bg-[#F4EEFE] border-[#5E5BAE] text-[#5E5BAE] shadow-2xs'
                                  : 'bg-white border-black/[0.05] text-[#1C1C1E] hover:bg-[#FAFAFC]'
                              }`}
                            >
                              <div className="truncate">{preset.title}</div>
                              <span className="text-[10px] text-[#8E8E93] block mt-0.5">
                                {preset.sess} {preset.sess === 1 ? 'activity' : 'activities'} • {preset.dur} min
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-medium text-[#8E8E93]">
                              Activities (Sessions)
                            </label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3].map((sess) => (
                                <button
                                  key={sess}
                                  type="button"
                                  onClick={() => setDayDraftSessions(sess)}
                                  className={`flex-1 py-1 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                                    dayDraftSessions === sess
                                      ? 'bg-[#5E5BAE] text-white border-[#5E5BAE]'
                                      : 'bg-white text-[#1C1C1E] border-black/[0.05] hover:bg-[#FAFAFC]'
                                  }`}
                                >
                                  {sess}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-medium text-[#8E8E93]">
                              Duration
                            </label>
                            <div className="flex items-center gap-1">
                              {[5, 15, 20, 30].map((dur) => (
                                <button
                                  key={dur}
                                  type="button"
                                  onClick={() => setDayDraftDuration(dur)}
                                  className={`flex-1 py-1 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                                    dayDraftDuration === dur
                                      ? 'bg-[#5E5BAE] text-white border-[#5E5BAE]'
                                      : 'bg-white text-[#1C1C1E] border-black/[0.05] hover:bg-[#FAFAFC]'
                                  }`}
                                >
                                  {dur}m
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 mt-1">
                          <label className="text-[11px] font-medium text-[#8E8E93]">
                            Activity Title
                          </label>
                          <input
                            type="text"
                            value={dayDraftTitle}
                            onChange={(e) => setDayDraftTitle(e.target.value)}
                            placeholder="Select a preset above or type here..."
                            className="w-full px-3 py-2 rounded-[12px] bg-[#F2F2F7] border border-black/[0.06] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#5E5BAE] focus:bg-white transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    {dayDraftType === 'rest' && (
                      <div className="p-3 rounded-[16px] bg-[#FFE4E6]/50 border border-[#E11D48]/20 text-[11.5px] leading-relaxed text-[#1C1C1E]">
                        <p>
                          <strong>Rest is an active health choice.</strong> In Plan B, restorative days count toward your consistent wellbeing and prevent cumulative fatigue.
                        </p>
                      </div>
                    )}

                    {dayDraftType !== 'none' && (
                      <div className="flex flex-col gap-1 mt-1">
                        <label className="text-[11px] font-medium text-[#8E8E93]">
                          Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={dayDraftNote}
                          onChange={(e) => setDayDraftNote(e.target.value)}
                          placeholder="e.g. Followed Plan B pacing calmly"
                          className="w-full px-3 py-2 rounded-[12px] bg-[#F2F2F7] border border-black/[0.06] text-xs text-[#1C1C1E] focus:outline-none focus:border-[#5E5BAE] focus:bg-white transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  {isSaveDisabled && (
                    <p className="text-[11px] text-[#5E5BAE] font-medium text-center">
                      Select a preset or enter an activity name to save
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-black/[0.05]">
                    <button
                      type="button"
                      onClick={() => setActiveDayModalDate(null)}
                      className="flex-1 py-2.5 rounded-[14px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-xs font-semibold text-[#1C1C1E] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isSaveDisabled}
                      onClick={handleSaveDayRecord}
                      className={`flex-1 py-2.5 rounded-[14px] text-xs font-semibold shadow-sm transition-colors ${
                        isSaveDisabled
                          ? 'bg-[#5E5BAE]/40 text-white/70 cursor-not-allowed'
                          : 'bg-[#5E5BAE] hover:bg-[#524FA0] text-white cursor-pointer'
                      }`}
                    >
                      {dayDraftType === 'none' ? 'Clear Record' : 'Save Record'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(dayModalContent, phoneFrameRef.current);
        }
        return dayModalContent;
      })()}
    </div>
  );
}
