import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { 
  Mic, 
  Calendar, 
  Sliders, 
  Compass,
  ArrowUp,
  Check,
  ChevronRight,
  ChevronDown,
  X,
  Play,
  Volume2,
  Clock,
  Sparkles,
  Wifi,
  CornerDownRight,
  Bookmark,
  CloudSun,
  Footprints,
  Heart
} from 'lucide-react';

import { MyPlanView } from './components/MyPlanView';
import { DiscoverView } from './components/DiscoverView';
import { NovaAvatar3D } from './components/Avatar3D/NovaAvatar3D';
import { FurryNovaStaticAvatar } from './components/Avatar3D/FurryNovaStaticAvatar';

import thumbImageUrl from './assets/images/mindful_walk_thumb_1793264566501.jpg';

const THUMB_IMAGE_URL = thumbImageUrl;

// Plan Information Model
interface PlanItem {
  id: string;
  title: string;
  subtitle: string;
  detailTitle: string;
  audioTitle: string;
  audioSubtitle: string;
  tip1: string;
  tip2: string;
  thumbnailUrl: string;
}

const DEFAULT_WALK_PLAN: PlanItem = {
  id: 'walk',
  title: 'Take a 15-minute walk',
  subtitle: 'After lunch could be a good time, based on your usual routine.',
  detailTitle: '15-minute Mindful Walk',
  audioTitle: 'Morning Tree Trail Audio',
  audioSubtitle: 'Gentle birdsong & calming rhythm • 15:00',
  tip1: 'Best window: right after lunch (1:15 PM) to aid light digestion and mental reset.',
  tip2: 'Zero pace requirement. Walk as slowly as you like—just let your eyes rest from screens.',
  thumbnailUrl: THUMB_IMAGE_URL
};

const STRETCH_PLAN: PlanItem = {
  id: 'stretch',
  title: '5-minute stretch at home',
  subtitle: 'Gentle body reset in your living room whenever you have a moment.',
  detailTitle: '5-minute Home Gentle Stretch',
  audioTitle: 'Living Room Calming Flow',
  audioSubtitle: 'Soft breathing cues & relaxing chime • 5:00',
  tip1: 'No mat or workout clothes required. Stand or sit comfortably near your desk or couch.',
  tip2: 'Focus on loosening tense shoulders, neck, and lower back with deep, unhurried breaths.',
  thumbnailUrl: THUMB_IMAGE_URL
};

const TOMORROW_WALK_PLAN: PlanItem = {
  id: 'tomorrow',
  title: '15-minute walk (Moved to tomorrow)',
  subtitle: 'Rescheduled for tomorrow morning. Take today to rest without guilt.',
  detailTitle: 'Rescheduled Walk for Tomorrow',
  audioTitle: 'Quiet Evening Wind-down Audio',
  audioSubtitle: 'Calm ambient tone to release the day • 10:00',
  tip1: 'Planned for tomorrow at 9:30 AM before your calendar fills up.',
  tip2: 'Today is officially a recharge window. Rest is an essential part of the journey.',
  thumbnailUrl: THUMB_IMAGE_URL
};

const REST_DAY_PLAN: PlanItem = {
  id: 'rest',
  title: 'Mindful rest day',
  subtitle: 'Activity paused for today. Give yourself permission to unwind completely.',
  detailTitle: 'Rest & Recovery Day',
  audioTitle: 'Gentle Evening Soundscape',
  audioSubtitle: 'Peaceful rain & soft piano • 20:00',
  tip1: 'Stay hydrated and give your body space to recuperate.',
  tip2: 'No checklists tonight. Nova will check back in tomorrow morning.',
  thumbnailUrl: THUMB_IMAGE_URL
};

// Chat Action Chip
interface ChatActionOption {
  label: string;
  action: 'accept' | 'show_another' | 'focus_input' | 'keep_plan';
  targetPlan?: PlanItem;
  primary?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  options?: ChatActionOption[];
  disabled?: boolean;
  selectedOptionLabel?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'Today' | 'Plan' | 'Discover'>('Today');
  
  // Current active plan & card states: 'suggested' | 'accepted' | 'completed'
  const [currentPlan, setCurrentPlan] = useState<PlanItem>(DEFAULT_WALK_PLAN);
  const [planState, setPlanState] = useState<'suggested' | 'accepted' | 'completed'>('suggested');
  // Today home defaults to ambient normal state (card collapsed into bubble next to Nova)
  const [isPlanCardOpen, setIsPlanCardOpen] = useState<boolean>(false);
  const [showSampleDataNote, setShowSampleDataNote] = useState<boolean>(false);
  
  // Avatar mode: '3d' procedural fur character (default for test) or '2d' legacy image
  const [avatarMode, setAvatarMode] = useState<'3d' | '2d'>('3d');

  // "Find another way" light hint for first-time users (disappears once Plan B is tapped)
  const [showPlanBHint, setShowPlanBHint] = useState<boolean>(true);

  // Discover tab saved bookmarks state
  const [savedItemIds, setSavedItemIds] = useState<string[]>(['walk-mindful', 'desk-decompression']);
  const [isSavedSheetOpen, setIsSavedSheetOpen] = useState<boolean>(false);

  const handleToggleSave = useCallback((id: string) => {
    setSavedItemIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  }, []);

  // Hold-to-complete animation state (3 seconds = 3000ms)
  const HOLD_DURATION_MS = 3000;
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isAccessibleConfirmOpen, setIsAccessibleConfirmOpen] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const hasCompletedRef = useRef<boolean>(false);

  // Detail Sheet state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Chat modal overlay state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sheetInput, setSheetInput] = useState('');
  const [inputPlaceholder, setInputPlaceholder] = useState('Type your response…');
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Media Thumbnail continuous transition refs and states
  const cardThumbnailRef = useRef<HTMLButtonElement>(null);
  const detailSheetRef = useRef<HTMLDivElement>(null);
  const detailHeaderRef = useRef<HTMLDivElement>(null);
  const detailMediaHeroRef = useRef<HTMLDivElement>(null);
  const floatingMediaRef = useRef<HTMLDivElement>(null);
  const [detailSheetMeasuredHeight, setDetailSheetMeasuredHeight] = useState<number>(0);
  const [detailHeaderHeight, setDetailHeaderHeight] = useState<number>(74);
  const [detailTransitionPhase, setDetailTransitionPhase] = useState<'idle' | 'opening' | 'open' | 'closing'>('idle');
  const [detailSourceRect, setDetailSourceRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [detailClosingStartRect, setDetailClosingStartRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Layout and transition geometry refs
  const phoneFrameRef = useRef<HTMLDivElement>(null);
  const homeAvatarRef = useRef<HTMLDivElement>(null);
  const chatSheetRef = useRef<HTMLDivElement>(null);
  const planCardRef = useRef<HTMLDivElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const [cardContentHeight, setCardContentHeight] = useState<number | null>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(136);
  const shouldReduceMotion = useReducedMotion();

  const [frameSize, setFrameSize] = useState<{ width: number; height: number }>({ width: 393, height: 844 });
  const [sheetMeasuredHeight, setSheetMeasuredHeight] = useState<number>(0);

  // Exact bottom offset for expanded suggestion card: strictly above Talk to Nova input with guaranteed spacing (>= 14px)
  const cardBottomOffset = Math.max(bottomBarHeight + 14, 150);

  // Maximum card height to guarantee it stays strictly above Talk to Nova and leaves Nova's face visible
  const maxCardAllowedHeight = useMemo(() => {
    // Leave room for top status bar + header + Nova's face
    // On short screens (< 680px), leave at least 195px; on regular screens, leave 240px
    const topReserved = frameSize.height < 680 ? 195 : 240;
    return Math.max(180, frameSize.height - cardBottomOffset - topReserved);
  }, [frameSize.height, cardBottomOffset]);

  // Transition state: 'idle' (resting on home) | 'opening' | 'open' (docked at drawer) | 'closing'
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'opening' | 'open' | 'closing'>('idle');

  // Live tracked position for the single persistent Avatar on Today home
  const [homeAvatarRect, setHomeAvatarRect] = useState<{ top: number; left: number; width: number; height: number }>({
    top: 145,
    left: (393 - 230) / 2,
    width: 230,
    height: 230,
  });

  // Typing posture state for Nova
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Measure live rect of homeAvatar inside phoneFrame at this exact instant
  const getLiveHomeAvatarRect = useCallback(() => {
    if (homeAvatarRef.current && phoneFrameRef.current) {
      const fRect = phoneFrameRef.current.getBoundingClientRect();
      const hRect = homeAvatarRef.current.getBoundingClientRect();
      if (fRect.width > 0 && fRect.height > 0 && hRect.width > 0 && hRect.height > 0) {
        return {
          top: hRect.top - fRect.top,
          left: hRect.left - fRect.left,
          width: hRect.width,
          height: hRect.height,
        };
      }
    }
    const fWidth = phoneFrameRef.current?.clientWidth || 393;
    const defaultSize = frameSize.height < 700 ? 200 : 230;
    return {
      top: frameSize.height < 700 ? 120 : 145,
      left: (fWidth - defaultSize) / 2,
      width: defaultSize,
      height: defaultSize,
    };
  }, [frameSize.height]);

  // Measure live rect of cardThumbnail inside phoneFrame at this exact instant
  const getLiveThumbnailRect = useCallback(() => {
    if (cardThumbnailRef.current && phoneFrameRef.current) {
      const fRect = phoneFrameRef.current.getBoundingClientRect();
      const tRect = cardThumbnailRef.current.getBoundingClientRect();
      if (fRect.width > 0 && fRect.height > 0 && tRect.width > 0 && tRect.height > 0) {
        return {
          top: tRect.top - fRect.top,
          left: tRect.left - fRect.left,
          width: tRect.width,
          height: tRect.height,
        };
      }
    }
    const fWidth = phoneFrameRef.current?.clientWidth || 393;
    return {
      top: 360,
      left: fWidth - 24 - 48,
      width: 48,
      height: 48,
    };
  }, []);

  // Measure live rect of the detail media hero inside phoneFrame
  const getLiveDetailMediaRect = useCallback(() => {
    if (detailMediaHeroRef.current && phoneFrameRef.current) {
      const fRect = phoneFrameRef.current.getBoundingClientRect();
      const mRect = detailMediaHeroRef.current.getBoundingClientRect();
      if (fRect.width > 0 && mRect.width > 0 && mRect.height > 0) {
        return {
          top: mRect.top - fRect.top,
          left: mRect.left - fRect.left,
          width: mRect.width,
          height: mRect.height,
        };
      }
    }
    const fWidth = phoneFrameRef.current?.clientWidth || 393;
    const effHeight = detailSheetMeasuredHeight > 0
      ? detailSheetMeasuredHeight
      : Math.min(frameSize.height * 0.75, 580);
    const sTop = frameSize.height - effHeight;
    return {
      top: sTop + detailHeaderHeight + 16,
      left: 24,
      width: Math.max(fWidth - 48, 200),
      height: 144,
    };
  }, [detailSheetMeasuredHeight, detailHeaderHeight, frameSize]);

  // Update frame dimensions and bottom bar whenever phoneFrameRef or bottomBarRef resizes
  useEffect(() => {
    const frameEl = phoneFrameRef.current;
    if (!frameEl) return;
    const updateSize = () => {
      const rect = frameEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setFrameSize({ width: rect.width, height: rect.height });
      }
      if (bottomBarRef.current) {
        const bHeight = bottomBarRef.current.offsetHeight;
        if (bHeight > 0) {
          setBottomBarHeight(bHeight);
        }
      }
      const liveHome = getLiveHomeAvatarRect();
      if (liveHome && liveHome.width > 0 && liveHome.height > 0) {
        setHomeAvatarRect(liveHome);
      }
    };
    updateSize();

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(frameEl);
    if (bottomBarRef.current) {
      ro.observe(bottomBarRef.current);
    }
    if (homeAvatarRef.current) {
      ro.observe(homeAvatarRef.current);
    }
    window.addEventListener('resize', updateSize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [activeTab, getLiveHomeAvatarRect]);

  // Synchronize home avatar position on frameSize or tab changes
  useEffect(() => {
    const updateHome = () => {
      const rect = getLiveHomeAvatarRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        setHomeAvatarRect(rect);
      }
    };
    updateHome();
    const timer = setTimeout(updateHome, 60);
    return () => clearTimeout(timer);
  }, [frameSize, activeTab, getLiveHomeAvatarRect]);

  // Dynamically observe chatSheet height when open or resizing
  useEffect(() => {
    const sheetEl = chatSheetRef.current;
    if (!sheetEl) return;
    const updateSheet = () => {
      if (sheetEl.clientHeight > 0) {
        setSheetMeasuredHeight(sheetEl.clientHeight);
      }
    };
    updateSheet();
    const ro = new ResizeObserver(() => updateSheet());
    ro.observe(sheetEl);
    return () => ro.disconnect();
  }, [isChatOpen]);

  // Dynamically observe detailSheet height when open or resizing
  useEffect(() => {
    const sheetEl = detailSheetRef.current;
    if (!sheetEl) return;
    const updateSheet = () => {
      if (sheetEl.clientHeight > 0) {
        setDetailSheetMeasuredHeight(sheetEl.clientHeight);
      }
    };
    updateSheet();
    const ro = new ResizeObserver(() => updateSheet());
    ro.observe(sheetEl);
    return () => ro.disconnect();
  }, [isDetailOpen]);

  // Dynamically observe detailHeader height to accommodate long titles
  useEffect(() => {
    const headerEl = detailHeaderRef.current;
    if (!headerEl) return;
    const updateHeader = () => {
      if (headerEl.clientHeight > 0) {
        setDetailHeaderHeight(headerEl.clientHeight);
      }
    };
    updateHeader();
    const ro = new ResizeObserver(() => updateHeader());
    ro.observe(headerEl);
    return () => ro.disconnect();
  }, [isDetailOpen]);

  // Dynamically observe planCard content height to animate height smoothly downward
  useEffect(() => {
    const el = cardContentRef.current;
    if (!el) return;
    const updateHeight = () => {
      if (el.offsetHeight > 0) {
        setCardContentHeight(el.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(() => updateHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [planState, currentPlan, isPlanCardOpen]);

  // Target coordinates for Nova docked at top edge of chat sheet
  const drawerAvatarSize = frameSize.height < 700 ? 112 : 124;
  const drawerWidth = drawerAvatarSize;
  const drawerHeight = drawerAvatarSize;
  const drawerLeft = (frameSize.width - drawerWidth) / 2;
  const effectiveSheetHeight = sheetMeasuredHeight > 0
    ? sheetMeasuredHeight
    : Math.min(frameSize.height * 0.74, 580);
  const sheetTop = frameSize.height - effectiveSheetHeight;
  // Nova peeks naturally over the rounded drawer edge: ~52% above, lower body resting inside the pt-14 header space
  const drawerTop = sheetTop - drawerAvatarSize * 0.52;

  // Target coordinates for media banner in detail sheet
  const effectiveDetailSheetHeight = detailSheetMeasuredHeight > 0
    ? detailSheetMeasuredHeight
    : Math.min(frameSize.height * 0.75, 580);
  const detailSheetTop = frameSize.height - effectiveDetailSheetHeight;
  const targetMediaTop = detailSheetTop + detailHeaderHeight + 16;
  const targetMediaLeft = 24;
  const targetMediaWidth = Math.max(frameSize.width - 48, 200);
  const targetMediaHeight = 144;

  // Open & Close triggers for Continuous Detail Transition
  const openDetailWithTransition = useCallback(() => {
    // If mid-flight during closing, measure current floating position or thumbnail
    let startRect = getLiveThumbnailRect();
    if (floatingMediaRef.current && detailTransitionPhase === 'closing' && phoneFrameRef.current) {
      const fRect = phoneFrameRef.current.getBoundingClientRect();
      const mRect = floatingMediaRef.current.getBoundingClientRect();
      if (mRect.width > 0 && mRect.height > 0) {
        startRect = {
          top: mRect.top - fRect.top,
          left: mRect.left - fRect.left,
          width: mRect.width,
          height: mRect.height,
        };
      }
    }
    setDetailSourceRect(startRect);
    setDetailClosingStartRect(null);
    setIsDetailOpen(true);
    setDetailTransitionPhase('opening');
  }, [getLiveThumbnailRect, detailTransitionPhase]);

  const closeDetailWithTransition = useCallback(() => {
    const liveThumbRect = getLiveThumbnailRect();
    let liveMediaRect = getLiveDetailMediaRect();

    // If mid-flight during opening, capture live mid-flight position
    if (floatingMediaRef.current && detailTransitionPhase === 'opening' && phoneFrameRef.current) {
      const fRect = phoneFrameRef.current.getBoundingClientRect();
      const mRect = floatingMediaRef.current.getBoundingClientRect();
      if (mRect.width > 0 && mRect.height > 0) {
        liveMediaRect = {
          top: mRect.top - fRect.top,
          left: mRect.left - fRect.left,
          width: mRect.width,
          height: mRect.height,
        };
      }
    }

    setDetailSourceRect(liveThumbRect);
    setDetailClosingStartRect(liveMediaRect);
    setIsDetailOpen(false);
    setDetailTransitionPhase('closing');
  }, [getLiveThumbnailRect, getLiveDetailMediaRect, detailTransitionPhase]);

  // Handle escape key to close detail modal or expanded suggestion card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDetailOpen) {
          closeDetailWithTransition();
        } else if (!isChatOpen && isPlanCardOpen) {
          setIsPlanCardOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailOpen, isChatOpen, isPlanCardOpen, closeDetailWithTransition]);

  // Coordinated Transition Open / Close triggers
  const openChatWithTransition = useCallback((chatSetup?: () => void) => {
    const liveRect = getLiveHomeAvatarRect();
    if (liveRect && liveRect.width > 0) {
      setHomeAvatarRect(liveRect);
    }
    if (chatSetup) chatSetup();
    setIsChatOpen(true);
    setTransitionPhase('opening');
  }, [getLiveHomeAvatarRect]);

  const closeChatWithTransition = useCallback(() => {
    const liveRect = getLiveHomeAvatarRect();
    if (liveRect && liveRect.width > 0) {
      setHomeAvatarRect(liveRect);
    }
    setIsChatOpen(false);
    setTransitionPhase('closing');
    setIsTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, [getLiveHomeAvatarRect]);

  // Monitor user scrolling: if user scrolls up, do not force scroll down on new messages
  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 80;
  }, []);

  // Auto-scroll chat to latest message only if user is already near bottom
  useEffect(() => {
    if (!isChatOpen) return;
    if (isNearBottomRef.current) {
      const timer = setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, isChatOpen]);

  // Adjust scroll when virtual keyboard / visualViewport shifts
  useEffect(() => {
    if (!isChatOpen || typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportChange = () => {
      if (isNearBottomRef.current) {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };
    window.visualViewport.addEventListener('resize', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
    };
  }, [isChatOpen]);

  // 1. Initial State Handlers
  // "Sounds good" directly accepts current recommendation into "YOUR PLAN"
  const handleSoundsGood = () => {
    hasCompletedRef.current = false;
    isHoldingRef.current = false;
    setPlanState('accepted');
    setHoldProgress(0);
  };

  // Click "Plan B" on initial suggestion: Opens chat with proactive alternative
  const handleInitialPlanB = () => {
    openChatWithTransition(() => {
      setShowPlanBHint(false);
      setInputPlaceholder('Tell Nova what changed…');
      isNearBottomRef.current = true;
      setChatMessages([
        {
          id: 'msg-init-alt',
          sender: 'ai',
          text: 'How about a 5-minute stretch at home instead?',
          options: [
            {
              label: 'Sounds good',
              action: 'accept',
              targetPlan: STRETCH_PLAN
            },
            {
              label: 'Show me another option',
              action: 'show_another'
            },
            {
              label: 'Tell Nova what changed',
              action: 'focus_input'
            }
          ]
        }
      ]);
    });
  };

  // 2. Accepted State Handlers
  // Click "Plan B" on already accepted plan: Proactively offers alternative while keeping current plan until accepted
  const handleAcceptedPlanB = () => {
    openChatWithTransition(() => {
      setInputPlaceholder('Tell Nova what changed…');
      isNearBottomRef.current = true;
      const alternative = currentPlan.id === 'walk' ? STRETCH_PLAN : TOMORROW_WALK_PLAN;
      const alternativeText = currentPlan.id === 'walk'
        ? 'How about a 5-minute stretch at home instead?'
        : 'Would moving your walk to tomorrow work better?';

      setChatMessages([
        {
          id: 'msg-accepted-alt',
          sender: 'ai',
          text: alternativeText,
          options: [
            {
              label: 'Sounds good',
              action: 'accept',
              targetPlan: alternative
            },
            {
              label: 'Show me another option',
              action: 'show_another'
            },
            {
              label: 'Tell Nova what changed',
              action: 'focus_input'
            }
          ]
        }
      ]);
    });
  };

  // "Not today" on accepted plan: opens dialogue without auto-modifying or canceling
  const handleNotToday = () => {
    openChatWithTransition(() => {
      setInputPlaceholder('Tell Nova what changed…');
      isNearBottomRef.current = true;
      setChatMessages([
        {
          id: 'msg-not-today',
          sender: 'ai',
          text: 'Totally fine! Rest days are just as healthy. Shall we take today off and reset tomorrow?',
          options: [
            {
              label: 'Sounds good (Take today off)',
              action: 'accept',
              targetPlan: REST_DAY_PLAN
            },
            {
              label: 'Keep plan for now',
              action: 'keep_plan'
            },
            {
              label: 'Tell Nova what changed',
              action: 'focus_input'
            }
          ]
        }
      ]);
    });
  };

  // 3. Option Action Handler inside chat
  const handleOptionClick = (option: ChatActionOption, messageId?: string) => {
    isNearBottomRef.current = true;
    if (option.action === 'accept' && option.targetPlan) {
      // User accepts alternative: update plan in background, switch to accepted state, keep drawer open
      hasCompletedRef.current = false;
      isHoldingRef.current = false;
      setCurrentPlan(option.targetPlan);
      setPlanState('accepted');
      setHoldProgress(0);

      // Determine Nova confirmation copy matching the accepted alternative
      let replyText = 'Sounds good. I’ve added the 5-minute stretch to your plan.';
      if (option.targetPlan.id === 'tomorrow' || option.targetPlan.id === 'tomorrow_walk') {
        replyText = 'Sounds good. I’ve moved your walk to tomorrow.';
      } else if (option.targetPlan.id === 'rest') {
        replyText = 'Sounds good. I’ve updated today to a rest day.';
      } else if (option.targetPlan.id === 'stretch') {
        replyText = 'Sounds good. I’ve added the 5-minute stretch to your plan.';
      } else {
        replyText = `Sounds good. I’ve updated your plan to ${option.targetPlan.title.toLowerCase()}.`;
      }

      const now = Date.now();
      setChatMessages((prev) => [
        ...prev.map((m) =>
          m.id === messageId
            ? { ...m, disabled: true, selectedOptionLabel: option.label }
            : { ...m, disabled: true }
        ),
        {
          id: `usr-${now}`,
          sender: 'user',
          text: 'Sounds good.'
        },
        {
          id: `ai-${now + 1}`,
          sender: 'ai',
          text: replyText
        }
      ]);
      // Chat drawer remains OPEN so user can continue chatting; no setIsChatOpen(false)
    } else if (option.action === 'show_another') {
      // Show next alternative option: disable prior cards, record user's choice
      setChatMessages((prev) => {
        const disabledPrev = prev.map((m) =>
          m.id === messageId
            ? { ...m, disabled: true, selectedOptionLabel: option.label }
            : { ...m, disabled: true }
        );
        const hasTomorrowWalk = prev.some((m) =>
          m.options?.some((o) => o.targetPlan?.id === 'tomorrow' || o.targetPlan?.id === 'tomorrow_walk')
        );

        const nextAiMsg: ChatMessage = !hasTomorrowWalk
          ? {
              id: `ai-${Date.now() + 1}`,
              sender: 'ai',
              text: 'Would moving your walk to tomorrow work better?',
              options: [
                {
                  label: 'Sounds good',
                  action: 'accept',
                  targetPlan: TOMORROW_WALK_PLAN
                },
                {
                  label: 'Show me another option',
                  action: 'show_another'
                },
                {
                  label: 'Tell Nova what changed',
                  action: 'focus_input'
                }
              ]
            }
          : {
              id: `ai-${Date.now() + 1}`,
              sender: 'ai',
              text: 'How about taking today as a gentle rest day? No pressure at all—we can reset tomorrow.',
              options: [
                {
                  label: 'Sounds good (Take today off)',
                  action: 'accept',
                  targetPlan: REST_DAY_PLAN
                },
                {
                  label: 'Tell Nova what changed',
                  action: 'focus_input'
                }
              ]
            };

        return [
          ...disabledPrev,
          {
            id: `usr-${Date.now()}`,
            sender: 'user',
            text: 'Show me another option'
          },
          nextAiMsg
        ];
      });
    } else if (option.action === 'focus_input') {
      // Keep conversation open, disable option card, Nova replies with pure prompt, focus input
      setInputPlaceholder('Tell Nova what changed…');
      isNearBottomRef.current = true;
      const now = Date.now();
      setChatMessages((prev) => [
        ...prev.map((m) =>
          m.id === messageId
            ? { ...m, disabled: true, selectedOptionLabel: option.label }
            : { ...m, disabled: true }
        ),
        {
          id: `usr-${now}`,
          sender: 'user',
          text: 'Tell Nova what changed'
        },
        {
          id: `ai-${now + 1}`,
          sender: 'ai',
          text: 'Of course. What changed for you today?'
        }
      ]);
      setTimeout(() => {
        chatInputRef.current?.focus();
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 120);
    } else if (option.action === 'keep_plan') {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, disabled: true, selectedOptionLabel: option.label }
            : m
        )
      );
      closeChatWithTransition();
    }
  };

  // Handle typing input and reset typing state timer
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSheetInput(val);
    if (val.trim().length > 0) {
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2400);
    } else {
      setIsTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  };

  // 4. Send freeform chat message
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetInput.trim()) return;
    const text = sheetInput.trim();
    setSheetInput('');
    setIsTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isNearBottomRef.current = true;

    setChatMessages((prev) => [
      ...prev.map((m) => ({ ...m, disabled: true })),
      {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text
      },
      {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: "Got it! Listening to your body is what matters most. How about a 5-minute breather or taking today off?",
        options: [
          {
            label: 'Sounds good (5-min stretch)',
            action: 'accept',
            targetPlan: STRETCH_PLAN
          },
          {
            label: 'Take today off',
            action: 'accept',
            targetPlan: REST_DAY_PLAN
          },
          {
            label: 'Keep current plan',
            action: 'keep_plan'
          }
        ]
      }
    ]);
  };

  // Hold-to-complete logic (3 seconds = 3000ms)
  const cancelHold = useCallback(() => {
    if (planState === 'completed' || hasCompletedRef.current) return;
    if (holdTimerRef.current) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    isHoldingRef.current = false;
    setIsHolding(false);
    setHoldProgress(0);
    holdStartRef.current = 0;
  }, [planState]);

  const startHold = useCallback((e?: React.SyntheticEvent | Event) => {
    if (planState === 'completed') return;
    // Only accept primary mouse click (button === 0) if mouse event
    if (e && 'button' in e && (e as React.MouseEvent).button !== 0) return;

    if (holdTimerRef.current) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    isHoldingRef.current = true;
    hasCompletedRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);
    holdStartRef.current = performance.now();

    const update = () => {
      if (!isHoldingRef.current) return;
      const elapsed = performance.now() - holdStartRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        // Successfully held for the full 3 seconds
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          isHoldingRef.current = false;
          setIsHolding(false);
          setHoldProgress(100);
          setPlanState('completed');
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(50); } catch (_) {}
          }
        }
      } else {
        holdTimerRef.current = requestAnimationFrame(update);
      }
    };

    holdTimerRef.current = requestAnimationFrame(update);
  }, [planState]);

  // Handle touch moving outside button boundary (finger slide out)
  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!isHoldingRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isInside =
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom;
    if (!isInside) {
      cancelHold();
    }
  };

  // Keyboard accessibility: Enter or Space activates confirmation dialog
  const handleDoneKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (planState === 'completed') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cancelHold();
      setIsAccessibleConfirmOpen(true);
    }
  };

  // Screen reader / assistive technology click: detail === 0
  const handleDoneClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Assistive technology (screen reader) or keyboard synthesized click
    if (e.detail === 0 && planState !== 'completed' && !hasCompletedRef.current) {
      cancelHold();
      setIsAccessibleConfirmOpen(true);
      return;
    }
    // Standard mouse click or touch tap: do nothing;
    // cancelHold() already reset progress to 0 on release.
  };

  // Global listeners when user is actively holding: mouseup, touchend, blur, window visibility
  useEffect(() => {
    if (!isHolding) return;

    const handleWindowBlur = () => cancelHold();
    const handleVisibility = () => {
      if (document.hidden) cancelHold();
    };
    const handleGlobalMouseUp = () => cancelHold();
    const handleGlobalTouchEnd = () => cancelHold();

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [isHolding, cancelHold]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
    };
  }, []);

  // Handle push message action
  const handleTellPlanB = () => {
    openChatWithTransition(() => {
      setChatMessages([
        {
          id: 'msg-push',
          sender: 'user',
          text: "About yesterday's walk..."
        },
        {
          id: 'ai-push',
          sender: 'ai',
          text: "I'm listening! Did you get a chance to step outside, or did life get in the way?",
          options: [
            {
              label: 'Did 5-minute stretch instead',
              action: 'accept',
              targetPlan: STRETCH_PLAN
            },
            {
              label: 'Life got busy, took rest',
              action: 'accept',
              targetPlan: REST_DAY_PLAN
            },
            {
              label: 'Tell Nova what changed',
              action: 'focus_input'
            }
          ]
        }
      ]);
    });
  };

  // SVG circular progress calculation (enlarged by ~1.4x, radius 34)
  const circleRadius = 34;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (holdProgress / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#E5E5EA] flex items-center justify-center p-0 sm:py-6 font-sans antialiased select-none text-[#1C1C1E]">
      {/* 393 × 852 px Native Smartphone Frame */}
      <div 
        ref={phoneFrameRef}
        className="w-full max-w-[393px] h-[100dvh] sm:h-[844px] sm:max-h-[852px] bg-[#F2F2F7] relative flex flex-col justify-between overflow-hidden sm:rounded-[44px] sm:shadow-[0_28px_72px_-16px_rgba(28,28,30,0.18)] sm:border sm:border-white/90"
      >
        
        {/* Apple Health Style Top Pink-Lavender Gradient transitioning smoothly to #F2F2F7 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Primary vertical top wash: soft pink-lavender at top fading into #F2F2F7 by ~45% */}
          <div className="absolute top-0 inset-x-0 h-[380px] bg-gradient-to-b from-[#DDD2FC]/85 via-[#F3D1EE]/55 to-transparent" />
          {/* Left soft periwinkle-lavender bloom */}
          <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-radial from-[#C9BEFC]/75 via-[#DDD5FC]/35 to-transparent blur-2xl" />
          {/* Right soft rose-pink bloom */}
          <div className="absolute -top-16 -right-14 w-72 h-72 rounded-full bg-radial from-[#FAD0E5]/80 via-[#F6DCEB]/40 to-transparent blur-2xl" />
          {/* Subtle central aura behind companion */}
          <div className="absolute top-[36%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-radial from-[#E6DEFC]/65 via-[#F7DFEE]/40 to-transparent blur-2xl" />
          {/* Gentle lower ambient blooms so floating bottom glass controls subtly refract soft lavender-pink color */}
          <div className="absolute -bottom-8 -left-8 w-64 h-44 rounded-full bg-radial from-[#DDD2FC]/55 via-[#E8DDFC]/25 to-transparent blur-2xl" />
          <div className="absolute -bottom-8 -right-8 w-64 h-44 rounded-full bg-radial from-[#FAD0E5]/55 via-[#F6DFED]/25 to-transparent blur-2xl" />
        </div>

        {/* Continuous Unified 3D Nova Avatar (Flies seamlessly between Home and Chat Drawer) */}
        {activeTab === 'Today' && (
          <motion.div
            id="today-unified-avatar-container"
            className={`absolute flex items-center justify-center select-none ${
              isChatOpen || transitionPhase !== 'idle' ? 'z-50 pointer-events-auto' : 'z-25 pointer-events-auto'
            }`}
            initial={false}
            animate={{
              top: isChatOpen ? drawerTop : homeAvatarRect.top,
              left: isChatOpen ? drawerLeft : homeAvatarRect.left,
              width: isChatOpen ? drawerWidth : homeAvatarRect.width,
              height: isChatOpen ? drawerHeight : homeAvatarRect.height,
            }}
            transition={
              shouldReduceMotion
                ? { duration: 0.05 }
                : {
                    duration: isChatOpen ? 0.42 : 0.36,
                    ease: isChatOpen ? [0.32, 0.72, 0, 1] : [0.25, 1, 0.5, 1],
                  }
            }
            onAnimationComplete={() => {
              if (!isChatOpen) {
                setTransitionPhase('idle');
              } else {
                setTransitionPhase('open');
              }
            }}
          >
            {/* Soft lilac & warm blush halo behind character (subtler when docked) */}
            <motion.div 
              animate={{ opacity: isChatOpen ? 0.35 : 0.85, scale: isChatOpen ? 0.85 : 1 }}
              transition={{ duration: isChatOpen ? 0.25 : 0.32 }}
              className="absolute inset-1 rounded-full bg-radial from-[#F4EEFE]/90 via-[#FDF1F5]/45 to-transparent blur-2xl pointer-events-none -z-10" 
            />

            <div className="w-full h-full relative flex items-center justify-center pointer-events-auto">
              {avatarMode === '3d' ? (
                <NovaAvatar3D
                  isActiveTab={activeTab === 'Today'}
                  className="w-full h-full"
                  mode="3d"
                  isListening={isChatOpen && (isTyping || sheetInput.trim().length > 0)}
                  onBoop={() => {
                    // gentle boop feedback
                  }}
                />
              ) : (
                <FurryNovaStaticAvatar
                  size={isChatOpen ? drawerWidth : homeAvatarRect.width}
                  isListening={isChatOpen && (isTyping || sheetInput.trim().length > 0)}
                  className="w-full h-full"
                />
              )}
            </div>
          </motion.div>
        )}

        {/* Continuous Shared-Element Media Transition Element */}
        {detailTransitionPhase !== 'idle' && detailSourceRect && (
          <motion.div
            key={detailTransitionPhase === 'closing' ? 'closing' : 'opening'}
            ref={floatingMediaRef}
            initial={
              detailTransitionPhase === 'opening'
                ? {
                    top: detailSourceRect.top,
                    left: detailSourceRect.left,
                    width: detailSourceRect.width,
                    height: detailSourceRect.height,
                    borderRadius: 16,
                  }
                : (detailClosingStartRect
                    ? {
                        top: detailClosingStartRect.top,
                        left: detailClosingStartRect.left,
                        width: detailClosingStartRect.width,
                        height: detailClosingStartRect.height,
                        borderRadius: 22,
                      }
                    : {
                        top: targetMediaTop,
                        left: targetMediaLeft,
                        width: targetMediaWidth,
                        height: targetMediaHeight,
                        borderRadius: 22,
                      })
            }
            animate={{
              top: isDetailOpen ? targetMediaTop : detailSourceRect.top,
              left: isDetailOpen ? targetMediaLeft : detailSourceRect.left,
              width: isDetailOpen ? targetMediaWidth : detailSourceRect.width,
              height: isDetailOpen ? targetMediaHeight : detailSourceRect.height,
              borderRadius: isDetailOpen ? 22 : 16,
            }}
            transition={
              shouldReduceMotion
                ? { duration: 0.05 }
                : {
                    duration: isDetailOpen ? 0.40 : 0.36,
                    ease: isDetailOpen ? [0.32, 0.72, 0, 1] : [0.25, 1, 0.5, 1],
                  }
            }
            onAnimationComplete={() => {
              if (isDetailOpen) {
                setDetailTransitionPhase('open');
              } else {
                setDetailTransitionPhase('idle');
              }
            }}
            className={`absolute z-[55] overflow-hidden border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.14)] pointer-events-none transition-opacity duration-75 ${
              detailTransitionPhase === 'open' ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {/* The image */}
            <img
              src={currentPlan.thumbnailUrl}
              alt={currentPlan.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover absolute inset-0"
            />

            {/* Thumbnail Play Badge (Center): fades out as it expands */}
            <motion.div
              animate={{ opacity: isDetailOpen ? 0 : 1 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.16 }}
              className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none"
            >
              <div className="w-5 h-5 rounded-full bg-white/95 flex items-center justify-center shadow-xs">
                <Play className="w-2.5 h-2.5 fill-[#26263F] text-[#26263F] ml-0.5" />
              </div>
            </motion.div>

            {/* Detail Audio Banner Info (Bottom): fades in as it expands toward target */}
            <motion.div
              animate={{ opacity: isDetailOpen ? 1 : 0 }}
              transition={{
                duration: shouldReduceMotion ? 0.05 : 0.24,
                delay: shouldReduceMotion ? 0 : (isDetailOpen ? 0.16 : 0),
              }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4 pointer-events-none"
            >
              <div className="flex items-center justify-between w-full text-white">
                <div>
                  <div className="text-xs font-bold leading-tight">{currentPlan.audioTitle}</div>
                  <div className="text-[10.5px] text-white/85 mt-0.5">{currentPlan.audioSubtitle}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#5E5BAE] text-white flex items-center justify-center shadow-xs">
                  {isPlayingAudio ? (
                    <Volume2 className="w-4 h-4 stroke-[2.4] text-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 1. iOS Status Bar (44px Height Standard Safe Area) */}
        <div className="pt-3.5 pb-1 px-7 flex items-center justify-between text-xs font-semibold text-[#1C1C1E] select-none shrink-0 z-30">
          <span className="tracking-tight">9:41</span>
          <div className="flex items-center gap-1.5">
            {/* Cellular signal bars */}
            <svg className="w-4 h-3 fill-current" viewBox="0 0 17 12">
              <rect x="0" y="9" width="2.5" height="3" rx="0.5" />
              <rect x="4" y="6" width="2.5" height="6" rx="0.5" />
              <rect x="8" y="3" width="2.5" height="9" rx="0.5" />
              <rect x="12" y="0" width="2.5" height="12" rx="0.5" />
            </svg>
            <Wifi className="w-3.5 h-3.5 stroke-[2.4]" />
            {/* Battery icon */}
            <div className="w-5 h-2.5 border border-[#1C1C1E] rounded-[3px] p-0.5 flex items-center">
              <div className="w-full h-full bg-[#1C1C1E] rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* 2. Top Header Bar (Apple HIG Large Title Hierarchy) */}
        <header 
          onClick={() => {
            if (activeTab === 'Today' && isPlanCardOpen) {
              setIsPlanCardOpen(false);
            }
          }}
          className="px-5 pt-1 pb-1.5 flex items-center justify-between shrink-0 z-20"
        >
          <span className="text-[28px] sm:text-[30px] font-bold tracking-[-0.024em] text-[#1C1C1E] leading-tight">
            {activeTab === 'Today' ? 'Plan B' : activeTab}
          </span>
          {activeTab === 'Discover' && (
            <button
              type="button"
              id="top-saved-btn"
              onClick={() => setIsSavedSheetOpen(true)}
              className="liquid-glass-bubble flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#5E5BAE] transition-all cursor-pointer active:scale-95 min-h-[34px]"
              aria-label="View saved items"
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>Saved ({savedItemIds.length})</span>
            </button>
          )}
        </header>

        {/* 3. Main Body Content: Today View */}
        <div 
          className={`flex-1 relative overflow-hidden px-4 sm:px-6 pt-1 pb-[128px] flex-col items-center justify-start ${
            activeTab === 'Today' ? 'flex' : 'hidden'
          }`}
        >
          {/* Click-outside backdrop: transparent hit-area across entire screen, with soft glass blur ONLY below Nova */}
          <AnimatePresence>
            {isPlanCardOpen && (
              <>
                {/* Full-screen click-outside dismiss target */}
                <motion.div
                  key="today-card-backdrop-dismiss"
                  id="today-card-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
                  onClick={() => setIsPlanCardOpen(false)}
                  className="absolute inset-0 z-15 cursor-pointer"
                  aria-label="Close suggestion card"
                />

                {/* Soft glass blur: ONLY below Nova's face (top-[260px] downwards) so Nova remains crystal clear */}
                <motion.div
                  key="today-card-backdrop-blur"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0.05 : 0.24 }}
                  style={{
                    bottom: `${bottomBarHeight}px`,
                  }}
                  className="absolute inset-x-0 top-[260px] sm:top-[280px] z-15 bg-white/30 backdrop-blur-md pointer-events-none"
                />
              </>
            )}
          </AnimatePresence>

          {/* Unified Companion Cluster (Bubble + Nova + Greeting + Telemetry as a balanced centered whole) */}
          <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center my-auto relative z-20 py-1">
            
            {/* 1. Today's Suggestion Speech Bubble: Close to Nova, fades out when card expands */}
            <div 
              className={`w-full flex justify-center shrink-0 mb-0.5 sm:mb-1 transition-all duration-200 ${
                isPlanCardOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
              }`}
            >
              <div className="relative">
                <button
                  id="today-top-suggestion-btn"
                  type="button"
                  onClick={() => setIsPlanCardOpen(true)}
                  aria-expanded={isPlanCardOpen}
                  aria-label={`Open today's suggestion: ${currentPlan.title}`}
                  className="liquid-glass-bubble relative z-10 px-4 py-2 rounded-[22px] text-left flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.98] transition-all max-w-[344px] shadow-[0_4px_16px_rgba(94,91,174,0.08)] group select-none"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {planState === 'completed' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#5E5BAE]/10 text-[#5E5BAE] text-[10px] font-bold shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>DONE</span>
                      </span>
                    ) : planState === 'accepted' ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#5E5BAE]/10 text-[#5E5BAE] text-[10px] font-bold shrink-0">
                        READY
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5E5BAE] shrink-0 animate-pulse" />
                    )}
                    <span className="text-[13.5px] sm:text-[14px] font-semibold text-[#1C1C1E] tracking-[-0.01em] truncate">
                      {currentPlan.title}
                    </span>
                  </div>

                  <div className="w-5 h-5 rounded-full liquid-glass-icon-well group-hover:bg-[#5E5BAE]/14 text-[#5E5BAE] flex items-center justify-center shrink-0 transition-colors ml-1">
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2.4]" />
                  </div>
                </button>

                {/* Downward Speech Bubble Tail pointing towards Nova */}
                <div 
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 overflow-hidden pointer-events-none z-10"
                  aria-hidden="true"
                >
                  <div className="w-2.5 h-2.5 bg-white/90 backdrop-blur-md rotate-45 mx-auto -translate-y-1.5 border-r border-b border-black/[0.06] shadow-xs" />
                </div>
              </div>
            </div>

            {/* 2. 3D Nova Avatar Layout Anchor / Spacer (Single persistent 3D Avatar is rendered in today-unified-avatar-container) */}
            <div 
              ref={homeAvatarRef}
              aria-hidden="true"
              className={`relative flex items-center justify-center shrink-0 pointer-events-none opacity-0 select-none ${
                frameSize.height < 700 
                  ? 'w-[200px] h-[200px]' 
                  : 'w-[230px] h-[230px] sm:w-[248px] sm:h-[248px]'
              }`}
            />

            {/* 3. Nova Nickname & Greeting (Tightly unified with Nova, discreet 3D toggle) */}
            <div className="flex flex-col items-center text-center mt-1 sm:mt-1.5 shrink-0">
              <div className="flex items-center justify-center gap-1.5">
                <h2 className="text-[20px] font-bold text-[#1C1C1E] tracking-[-0.024em] select-none leading-none">
                  Nova
                </h2>
                {/* 弱化 3D 调试开关: Discreet, understated pill */}
                <button
                  type="button"
                  onClick={() => setAvatarMode(prev => prev === '3d' ? '2d' : '3d')}
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-medium text-[#8E8E93]/70 hover:text-[#5E5BAE] bg-black/[0.03] hover:bg-[#5E5BAE]/10 active:scale-95 transition-all cursor-pointer select-none border border-black/[0.04]"
                  title={avatarMode === '3d' ? "Switch to 2D Nova" : "Switch to 3D Fur Avatar"}
                  aria-label="Toggle 3D/2D Avatar"
                >
                  {avatarMode === '3d' ? '3D' : '2D'}
                </button>
              </div>

              <div className="mt-1 px-4 max-w-[320px]">
                <p className="text-[13.5px] sm:text-[14px] font-normal text-[#6C6C70] leading-snug tracking-[-0.01em]">
                  Hope your morning is going a little easier.
                </p>
              </div>
            </div>

            {/* 4. Ambient Telemetry: Distinct grouping, low contrast watermark, legible values and sample data */}
            <div className="w-full flex flex-col items-center mt-3.5 sm:mt-4 pt-0.5 shrink-0">
              <div className="flex items-center justify-center flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 select-none">
                {/* Weather */}
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <CloudSun className="w-3.5 h-3.5 text-[#8E8E93]/65 stroke-[1.6] shrink-0" />
                  <span className="text-[14.5px] sm:text-[15px] font-light text-[#3C3C43]/70 tabular-nums tracking-tight">18°C</span>
                  <span className="text-[11.5px] sm:text-[12px] font-light text-[#8E8E93]/75 hidden min-[370px]:inline">Cloudy</span>
                </span>

                <span className="text-black/10 select-none shrink-0" aria-hidden="true">·</span>

                {/* Steps */}
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <Footprints className="w-3.5 h-3.5 text-[#8E8E93]/65 stroke-[1.6] shrink-0" />
                  <span className="text-[14.5px] sm:text-[15px] font-light text-[#3C3C43]/70 tabular-nums tracking-tight">3,420</span>
                  <span className="text-[11.5px] sm:text-[12px] font-light text-[#8E8E93]/75">steps</span>
                </span>

                <span className="text-black/10 select-none shrink-0" aria-hidden="true">·</span>

                {/* Heart rate */}
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <Heart className="w-3.5 h-3.5 text-[#FF2D55]/45 stroke-[1.6] shrink-0" />
                  <span className="text-[14.5px] sm:text-[15px] font-light text-[#3C3C43]/70 tabular-nums tracking-tight">68</span>
                  <span className="text-[11.5px] sm:text-[12px] font-light text-[#8E8E93]/75">bpm</span>
                </span>

                <span className="text-black/10 select-none shrink-0" aria-hidden="true">·</span>

                {/* Sample data toggle */}
                <button
                  type="button"
                  onClick={() => setShowSampleDataNote(prev => !prev)}
                  className="text-[11px] sm:text-[11.5px] font-light text-[#8E8E93]/75 hover:text-[#1C1C1E] underline decoration-[#8E8E93]/35 underline-offset-3 cursor-pointer transition-colors shrink-0"
                  title="Sample values shown before sensor connection"
                >
                  Sample data
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showSampleDataNote && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] font-light text-[#8E8E93] text-center pt-2 px-4 max-w-[320px] leading-snug overflow-hidden"
                  >
                    Sample values for preview — live weather and wearable health sensors are not connected yet.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 3. Floating Suggestion Card: Emerges below Nova, with ample space from bottom bar */}
          <AnimatePresence>
            {isPlanCardOpen && (
              <motion.div
                key="today-floating-plan-card"
                id="expanded-plan-card"
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 32, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 20, scale: 0.96 }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0.05 }
                    : { duration: 0.32, ease: [0.32, 0.72, 0, 1] }
                }
                style={{
                  bottom: `${cardBottomOffset}px`,
                  maxHeight: `${maxCardAllowedHeight}px`,
                }}
                className="absolute inset-x-4 sm:inset-x-6 z-30 flex flex-col items-center justify-end pointer-events-none"
              >
                <div 
                  ref={planCardRef}
                  className="w-full max-w-[360px] rounded-[28px] overflow-hidden today-suggestion-card shadow-[0_16px_40px_rgba(38,38,63,0.18)] border border-white/95 flex flex-col pointer-events-auto max-h-full"
                >
                  {/* Top Pinned Card Header: Label + Close Button + Title & Media Thumbnail */}
                  <div className="p-4 sm:p-5 pb-2.5 sm:pb-3 w-full shrink-0 border-b border-black/[0.04]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="relative h-4 flex-1 select-none">
                        <span 
                          className={`text-[11px] font-bold uppercase tracking-wider text-[#5E5BAE] absolute inset-0 transition-opacity ${
                            shouldReduceMotion ? 'duration-75' : 'duration-200'
                          } ${
                            planState === 'suggested' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                          }`}
                        >
                          Today’s suggestion
                        </span>
                        <span 
                          className={`text-[11px] font-bold uppercase tracking-wider text-[#5E5BAE] absolute inset-0 transition-opacity ${
                            shouldReduceMotion ? 'duration-75' : 'duration-250 delay-100'
                          } ${
                            planState !== 'suggested' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                          }`}
                        >
                          YOUR PLAN
                        </span>
                      </div>

                      {/* Close Card Button: Pinned to top-right, never scrolled out */}
                      <button
                        type="button"
                        id="close-plan-card-btn"
                        onClick={() => setIsPlanCardOpen(false)}
                        className="-mr-1 -mt-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[#6C6C70] hover:text-[#1C1C1E] bg-[#F2F2F7] hover:bg-[#E5E5EA] active:scale-95 transition-all cursor-pointer shrink-0"
                        aria-label="Close suggestion card"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
                      </button>
                    </div>

                    {/* Title & Thumbnail Row */}
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[17px] sm:text-[18px] font-bold tracking-[-0.02em] text-[#1C1C1E] leading-snug flex-1">
                        {currentPlan.title}
                      </h2>

                      {/* Rich Media Thumbnail Entry (Only in Accepted State, fades in softly) */}
                      <div 
                        className={`transition-all duration-300 ${
                          planState !== 'suggested'
                            ? 'opacity-100 scale-100 pointer-events-auto'
                            : 'opacity-0 scale-90 pointer-events-none w-0 h-0 overflow-hidden'
                        }`}
                      >
                        {planState !== 'suggested' && (
                          <button
                            ref={cardThumbnailRef}
                            type="button"
                            onClick={openDetailWithTransition}
                            className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-[15px] overflow-hidden shrink-0 border border-white/80 shadow-[0_2px_8px_rgba(38,38,63,0.06)] group active:scale-95 transition-all cursor-pointer"
                            title="View plan guide"
                            aria-label="View plan guide"
                          >
                            <div
                              className={`w-full h-full relative transition-opacity duration-150 ${
                                detailTransitionPhase !== 'idle' || isDetailOpen ? 'opacity-0' : 'opacity-100'
                              }`}
                            >
                              <img
                                src={currentPlan.thumbnailUrl}
                                alt="Plan preview"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-white/95 flex items-center justify-center shadow-xs">
                                  <Play className="w-2.5 h-2.5 fill-[#26263F] text-[#26263F] ml-0.5" />
                                </div>
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Content Container: Internal scrolling on short screens */}
                  <div 
                    ref={cardContentRef} 
                    className="p-4 sm:p-5 pt-3 sm:pt-3.5 w-full flex-1 overflow-y-auto overscroll-contain flex flex-col gap-3 sm:gap-3.5 ios-scrollbar"
                  >

                    {/* 2. SUGGESTED EXTRA: Subtitle + Initial Action Buttons */}
                    <AnimatePresence initial={false}>
                      {planState === 'suggested' && (
                        <motion.div
                          key="suggested-extra"
                          initial={{ opacity: 1, height: 'auto' }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={
                            shouldReduceMotion
                              ? { opacity: 0, height: 0 }
                              : {
                                  opacity: 0,
                                  height: 0,
                                  transition: {
                                    opacity: { duration: 0.18, ease: "easeOut" },
                                    height: { duration: 0.34, ease: [0.32, 0.72, 0, 1] }
                                  }
                                }
                          }
                          className="overflow-hidden flex flex-col gap-3 pt-1"
                        >
                          <p className="text-[13.5px] sm:text-[14px] text-[#6C6C70] leading-relaxed">
                            {currentPlan.subtitle}
                          </p>

                          <div className="flex flex-col gap-2 pt-1 pb-0.5">
                            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                              <button
                                type="button"
                                onClick={handleSoundsGood}
                                className="h-11 sm:h-12 px-4 rounded-[16px] bg-[#5E5BAE] hover:bg-[#524FA0] active:bg-[#484591] active:scale-[0.98] text-white text-[14px] font-semibold shadow-[0_4px_14px_rgba(94,91,174,0.22)] transition-all flex items-center justify-center text-center min-h-[44px] cursor-pointer"
                              >
                                Sounds good
                              </button>
                              <button
                                type="button"
                                onClick={handleInitialPlanB}
                                className="h-11 sm:h-12 w-full px-4 rounded-[16px] bg-[#F2F2F7] hover:bg-[#E5E5EA] active:scale-[0.98] text-[#1C1C1E] text-[14px] font-semibold transition-all flex items-center justify-center text-center min-h-[44px] cursor-pointer"
                              >
                                Plan B
                              </button>
                            </div>
                            {showPlanBHint && (
                              <span className="text-[11px] text-[#8E8E93] text-center select-none animate-in fade-in font-normal tracking-tight">
                                Find another way
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 3. ACCEPTED EXTRA: Circular Done Button + Auxiliary Operations */}
                    <AnimatePresence initial={false}>
                      {planState !== 'suggested' && (
                        <motion.div
                          key="accepted-extra"
                          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                          transition={{
                            duration: shouldReduceMotion ? 0.05 : 0.32,
                            delay: shouldReduceMotion ? 0 : 0.1,
                            ease: [0.32, 0.72, 0, 1]
                          }}
                          className="flex flex-col gap-3 pt-1"
                        >
                          {/* Horizontally Centered Circular Done Button + "Hold to complete" */}
                          <div className="flex flex-col items-center justify-center py-0.5">
                            <div className="relative w-[68px] h-[68px] sm:w-[72px] sm:h-[72px] flex items-center justify-center">
                              <svg className="w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 76 76">
                                <circle
                                  cx="38"
                                  cy="38"
                                  r={circleRadius}
                                  className="stroke-[#EAE7F6]/80"
                                  strokeWidth="4"
                                  fill="transparent"
                                />
                                <circle
                                  cx="38"
                                  cy="38"
                                  r={circleRadius}
                                  className={`stroke-[#FF7A32] ${isHolding ? 'transition-none' : 'transition-all duration-150'}`}
                                  strokeWidth="4.5"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={planState === 'completed' ? 0 : strokeDashoffset}
                                  strokeLinecap="round"
                                  fill="transparent"
                                />
                              </svg>

                              <button
                                type="button"
                                onMouseDown={startHold}
                                onMouseUp={cancelHold}
                                onMouseLeave={cancelHold}
                                onTouchStart={startHold}
                                touch-action="none"
                                onTouchEnd={cancelHold}
                                onTouchCancel={cancelHold}
                                onTouchMove={handleTouchMove}
                                onContextMenu={(e) => e.preventDefault()}
                                onKeyDown={handleDoneKeyDown}
                                onClick={handleDoneClick}
                                aria-label={planState === 'completed' ? 'Plan completed' : 'Press and hold for 3 seconds to complete, or press Enter for confirmation dialog'}
                                className={`absolute w-[54px] h-[54px] sm:w-[58px] sm:h-[58px] rounded-full flex items-center justify-center font-bold transition-all duration-200 select-none shadow-sm touch-none border border-white/20 cursor-pointer ${
                                  planState === 'completed'
                                    ? 'bg-[#54519E] text-white shadow-[0_4px_16px_rgba(84,81,158,0.25)]'
                                    : isHolding
                                    ? 'bg-[#484591] text-white scale-95 shadow-inner'
                                    : 'bg-[#5E5BAE] hover:bg-[#524FA0] active:bg-[#484591] text-white shadow-[0_4px_18px_rgba(94,91,174,0.28)]'
                                }`}
                              >
                                {planState === 'completed' ? (
                                  <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] text-white" />
                                ) : (
                                  <span className="font-bold text-[14px] sm:text-[15px] tracking-tight text-white">Done</span>
                                )}
                              </button>
                            </div>

                            <span className="text-[11px] sm:text-[11.5px] mt-1 whitespace-nowrap text-center font-normal">
                              {planState === 'completed' ? (
                                <span className="text-[#5E5BAE] font-semibold">Completed</span>
                              ) : (
                                <span className="text-[#706E8A]">Hold to complete</span>
                              )}
                            </span>
                          </div>

                          {/* Bottom Section: Side-by-Side "Plan B" and "Not today" (or Undo completion) */}
                          <div className="flex items-center justify-center gap-6 pt-2 border-t border-black/[0.06]">
                            {planState === 'completed' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  hasCompletedRef.current = false;
                                  isHoldingRef.current = false;
                                  setPlanState('accepted');
                                  setHoldProgress(0);
                                }}
                                className="text-xs font-semibold text-[#5E5BAE] hover:text-[#494692] py-1 px-3 transition-colors whitespace-nowrap underline underline-offset-3 cursor-pointer min-h-[36px] flex items-center"
                              >
                                Undo completion
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={handleAcceptedPlanB}
                                  className="text-xs font-semibold text-[#5E5BAE] hover:text-[#494692] py-1 px-3 rounded-full hover:bg-[#5E5BAE]/8 transition-colors whitespace-nowrap cursor-pointer active:scale-95 min-h-[36px] flex items-center"
                                >
                                  Plan B
                                </button>
                                <button
                                  type="button"
                                  onClick={handleNotToday}
                                  className="text-xs font-semibold text-[#6C6C70] hover:text-[#1C1C1E] py-1 px-3 rounded-full hover:bg-black/[0.04] transition-colors whitespace-nowrap cursor-pointer active:scale-95 min-h-[36px] flex items-center"
                                >
                                  Not today
                                </button>
                              </>
                            )}
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Main Body Content: Plan View (Merged My Plan + Memory) */}
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'Plan' ? 'flex' : 'hidden'}`}>
          <MyPlanView phoneFrameRef={phoneFrameRef} />
        </div>

        {/* 3. Main Body Content: Discover View */}
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'Discover' ? 'flex' : 'hidden'}`}>
          <DiscoverView
            phoneFrameRef={phoneFrameRef}
            savedItemIds={savedItemIds}
            onToggleSave={handleToggleSave}
            isSavedSheetOpen={isSavedSheetOpen}
            setIsSavedSheetOpen={setIsSavedSheetOpen}
          />
        </div>

        {/* 4. Bottom Floating Section: Liquid Glass Input (Hidden on Plan) & Apple Health Style Liquid Glass Tab Capsule */}
        <div 
          ref={bottomBarRef}
          className="absolute bottom-0 inset-x-0 px-5 pt-2 pb-1 flex flex-col gap-2 pointer-events-none"
        >
          {/* Conversational Input Entry (Hidden on Plan tab to increase viewport space) */}
          {activeTab !== 'Plan' && (
            <button 
              type="button"
              id="bottom-talk-to-nova-btn"
              onClick={() => {
                openChatWithTransition(() => {
                  setInputPlaceholder('Type your response…');
                  setChatMessages([
                    {
                      id: 'msg-open-input',
                      sender: 'ai',
                      text: "Hi! How's your day shaping up? Tell me whatever is on your mind."
                    }
                  ]);
                });
              }}
              className="liquid-glass-pill liquid-glass-pill-interactive relative z-30 pointer-events-auto w-full active:scale-[0.99] rounded-full px-4.5 py-2.5 flex items-center gap-3 cursor-pointer min-h-[46px] transition-all text-left"
              aria-label="Talk to Nova"
            >
              <span className="flex-1 text-[14px] text-[#3C3C43] font-medium select-none tracking-[-0.01em]">
                Talk to Nova…
              </span>
              <div className="w-7 h-7 rounded-full liquid-glass-icon-well text-[#5E5BAE] flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 stroke-[2.2]" />
              </div>
            </button>
          )}

          {/* 3 Bottom Navigation Tabs in Floating Liquid Glass Capsule (Apple Health Reference Style) */}
          <nav
            aria-label="Primary navigation"
            className="liquid-glass-pill relative z-30 pointer-events-auto p-1 rounded-full grid grid-cols-3 gap-1"
          >
            {[
              { id: 'Today', icon: Calendar },
              { id: 'Plan', icon: Sliders },
              { id: 'Discover', icon: Compass },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id.toLowerCase()}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id as 'Today' | 'Plan' | 'Discover')}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-full transition-all min-h-[46px] justify-center cursor-pointer active:scale-[0.97] ${
                    isActive
                      ? 'liquid-glass-active-tab text-[#5E5BAE] font-semibold'
                      : 'text-[#2C2C2E] hover:text-[#1C1C1E] font-medium'
                  }`}
                >
                  <Icon className={`w-[19px] h-[19px] ${isActive ? 'stroke-[2.4]' : 'stroke-[2]'}`} />
                  <span className="text-[11px] tracking-[-0.01em] leading-none mt-0.5">{tab.id}</span>
                </button>
              );
            })}
          </nav>

          {/* 5. iOS Home Gesture Indicator Bar */}
          <div className="relative z-30 pt-0.5 pb-1 flex items-center justify-center select-none shrink-0">
            <div className="w-32 h-1 bg-[#1C1C1E]/20 rounded-full" />
          </div>
        </div>

        {/* 6. Rich Media Plan Detail Sheet with Smooth Entrance & Exit */}
        <AnimatePresence>
          {isDetailOpen && (
            <div className="absolute inset-0 z-50 overflow-hidden flex flex-col justify-end pointer-events-auto">
              {/* Dimmed Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0.05 } : { duration: 0.36, ease: "easeInOut" }}
                onClick={closeDetailWithTransition}
                className="absolute inset-0 bg-black/20 backdrop-blur-xs"
              />

              {/* Sheet Container */}
              <motion.div
                ref={detailSheetRef}
                initial={shouldReduceMotion ? { y: 0, opacity: 0 } : { y: '100%' }}
                animate={shouldReduceMotion ? { y: 0, opacity: 1 } : { y: 0 }}
                exit={shouldReduceMotion ? { y: 0, opacity: 0 } : { y: '100%' }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.05 }
                    : {
                        duration: 0.40,
                        ease: [0.32, 0.72, 0, 1],
                      }
                }
                className="relative bg-white/95 backdrop-blur-2xl rounded-t-[32px] border-t border-white/90 shadow-[0_-16px_48px_rgba(28,28,45,0.12)] flex flex-col h-[75%] max-h-[580px] z-10 text-[#1C1C1E]"
              >
                {/* Sheet Header: Apple HIG Clean Title, No Redundant Pills */}
                <div 
                  ref={detailHeaderRef}
                  className="px-5 sm:px-6 pt-5 pb-3.5 border-b border-black/[0.06] flex items-center justify-between shrink-0"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="text-[19px] sm:text-[20px] font-bold text-[#1C1C1E] tracking-[-0.02em] leading-tight">
                      {currentPlan.detailTitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeDetailWithTransition}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#6C6C70] hover:text-[#1C1C1E] bg-[#F2F2F7] hover:bg-[#E5E5EA] active:scale-95 transition-all cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>

                {/* Sheet Content: Media & Clean Guideline Rows (No Nested Card-in-Card) */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
                  {/* Media Hero Banner: In-place slot */}
                  <div
                    ref={detailMediaHeroRef}
                    className="relative w-full h-40 sm:h-44 rounded-[22px] overflow-hidden border border-black/[0.04] shadow-xs shrink-0"
                  >
                    <div
                      className={`w-full h-full relative transition-opacity duration-150 ${
                        detailTransitionPhase === 'open' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <img
                        src={currentPlan.thumbnailUrl}
                        alt={currentPlan.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent flex items-end p-4 sm:p-4.5">
                        <div className="flex items-center justify-between w-full text-white">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="text-[13.5px] sm:text-[14px] font-bold leading-tight tracking-[-0.01em]">
                              {currentPlan.audioTitle}
                            </div>
                            <div className="text-[11px] sm:text-[11.5px] text-white/85 mt-0.5 font-normal">
                              {currentPlan.audioSubtitle}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                            className="w-9 h-9 rounded-full bg-[#5E5BAE] hover:bg-[#524FA0] text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform cursor-pointer shrink-0"
                            aria-label={isPlayingAudio ? "Pause audio guide" : "Play audio guide"}
                          >
                            {isPlayingAudio ? (
                              <Volume2 className="w-4 h-4 stroke-[2.4] text-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean Practical Guidelines (Airy white rows with subtle divider, no nested grey cards) */}
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0.05 }
                        : {
                            delay: 0.16,
                            duration: 0.26,
                            ease: "easeOut",
                          }
                    }
                    className="space-y-3.5 pt-1"
                  >
                    <h4 className="text-[14px] font-semibold text-[#1C1C1E] tracking-tight">
                      Gentle Guidelines
                    </h4>
                    
                    <div className="space-y-3">
                      {/* Tip 1 */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#5E5BAE]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-[#5E5BAE] stroke-[2.2]" />
                        </div>
                        <p className="text-[13.5px] text-[#3C3C43] leading-relaxed flex-1">
                          {currentPlan.tip1}
                        </p>
                      </div>

                      <div className="h-px bg-black/[0.04]" />

                      {/* Tip 2 */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#FF7A32]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#FF7A32] stroke-[2.2]" />
                        </div>
                        <p className="text-[13.5px] text-[#3C3C43] leading-relaxed flex-1">
                          {currentPlan.tip2}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Sheet Bottom Safe Area & Action */}
                <div className="p-5 pb-6 border-t border-black/[0.06] bg-white/95 backdrop-blur-md flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={closeDetailWithTransition}
                    className="w-full py-3 rounded-[18px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#5E5BAE] text-[13.5px] font-semibold text-center active:scale-[0.99] transition-all min-h-[44px] cursor-pointer"
                  >
                    Back to Today
                  </button>
                  <div className="w-32 h-1 bg-[#1C1C1E]/20 rounded-full mx-auto" />
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 7. AI Conversation Drawer / Sheet with smooth entrance and exit */}
        <AnimatePresence>
          {isChatOpen && (
            <div className="absolute inset-0 z-40 overflow-hidden flex flex-col justify-end pointer-events-auto">
              {/* Dimmed Backdrop (Softened to bg-black/16 backdrop-blur-[1.5px] so Home contours remain discernible) */}
              <motion.div 
                onClick={closeChatWithTransition} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0.05 } : { duration: 0.36, ease: "easeInOut" }}
                className="absolute inset-0 bg-black/16 backdrop-blur-[1.5px]" 
              />

              {/* Drawer Sheet */}
              <motion.div 
                ref={chatSheetRef}
                initial={shouldReduceMotion ? { y: 0, opacity: 0 } : { y: '100%' }}
                animate={shouldReduceMotion ? { y: 0, opacity: 1 } : { y: 0 }}
                exit={shouldReduceMotion ? { y: 0, opacity: 0 } : { y: '100%' }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0.05 }
                    : {
                        duration: 0.40,
                        ease: [0.32, 0.72, 0, 1],
                      }
                }
                className="relative bg-white/95 backdrop-blur-2xl rounded-t-[32px] border-t border-white/90 shadow-[0_-16px_48px_rgba(28,28,45,0.14)] flex flex-col h-[74%] max-h-[580px] z-10 text-[#1C1C1E]"
              >
                {/* Close Button Top-Right (Independent of Nova) */}
                <button
                  type="button"
                  onClick={closeChatWithTransition}
                  className="absolute top-3.5 right-4 z-40 w-8 h-8 rounded-full flex items-center justify-center text-[#6C6C70] hover:text-[#1C1C1E] bg-[#F2F2F7] hover:bg-[#E5E5EA] active:scale-95 transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* Header with Centered Nickname "Nova" */}
                <div className="pt-14 pb-2 px-5 border-b border-black/[0.06] flex items-center justify-center shrink-0">
                  <h3 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight text-center">
                    Nova
                  </h3>
                </div>

                {/* Animated Inner Content (Header, Messages, Input) */}
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0.05 }
                      : {
                          delay: 0.16,
                          duration: 0.26,
                          ease: "easeOut",
                        }
                  }
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Chat Messages Body */}
                  <div 
                    ref={chatContainerRef}
                    onScroll={handleChatScroll}
                    className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3.5 text-xs leading-relaxed"
                  >
                    {chatMessages.map((msg) => {
                      // If AI message has options, render as a genuine frosted chat bubble
                      if (msg.sender === 'ai' && msg.options && msg.options.length > 0) {
                        return (
                          <div
                            key={msg.id}
                            className="flex flex-col items-start transition-opacity duration-200"
                          >
                            <div className="max-w-[85%] bg-[#F2F2F7]/90 rounded-[22px] rounded-bl-xs border border-black/[0.04] p-4 shadow-2xs space-y-2.5">
                              {/* Suggestion Text */}
                              <p className="text-[13.5px] leading-relaxed text-[#1C1C1E]">
                                {msg.text}
                              </p>

                              {/* Action Options: If active (not disabled), show all selectable options */}
                              {!msg.disabled && (
                                <div className="flex flex-col items-start gap-2 pt-1">
                                  {msg.options.map((opt, optIdx) => (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      onClick={() => handleOptionClick(opt, msg.id)}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[16px] border border-[#5E5BAE]/20 bg-[#F4EEFE] hover:bg-[#EDE7FB] active:scale-[0.98] text-[#5E5BAE] text-xs font-semibold text-left transition-all select-none min-h-[38px] shadow-2xs cursor-pointer"
                                    >
                                      <span>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* If handled/disabled message: unselected operations are collapsed.
                                  Only the chosen option (if any) is shown as a subtle, non-clickable status chip. */}
                              {msg.disabled && msg.selectedOptionLabel && (
                                <div className="pt-0.5">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] border border-[#5E5BAE]/20 bg-[#EBE7FA]/80 text-[11.5px] font-medium text-[#5E5BAE] select-none cursor-default">
                                    <Check className="w-3 h-3 stroke-[2.5] text-[#5E5BAE]" />
                                    <span>{msg.selectedOptionLabel}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Standard chat bubble (e.g. user messages or regular AI text)
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] px-4 py-2.5 rounded-[20px] ${
                              msg.sender === 'user'
                                ? 'bg-[#5E5BAE] text-white rounded-br-xs shadow-[0_3px_12px_rgba(94,91,174,0.2)] font-medium'
                                : 'bg-[#F2F2F7]/90 text-[#1C1C1E] border border-black/[0.04] rounded-bl-xs shadow-2xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Chat Input Bar inside sheet with Home Indicator safe area */}
                  <form
                    onSubmit={handleSendChatMessage}
                    className="p-4 pb-6 border-t border-black/[0.06] bg-white/95 backdrop-blur-md shrink-0 flex flex-col gap-2"
                  >
                    <div className="bg-[#F2F2F7] rounded-full px-4 py-2.5 flex items-center gap-2 border border-black/[0.04] shadow-2xs focus-within:border-[#5E5BAE]/60 focus-within:ring-2 focus-within:ring-[#5E5BAE]/15 transition-all">
                      <input
                        ref={chatInputRef}
                        type="text"
                        value={sheetInput}
                        onChange={handleInputChange}
                        onFocus={() => {
                          isNearBottomRef.current = true;
                          setTimeout(() => {
                            chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                          }, 150);
                        }}
                        placeholder={inputPlaceholder}
                        className="flex-1 bg-transparent text-xs text-[#1C1C1E] placeholder-[#8E8E93] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!sheetInput.trim()}
                        aria-label="Send message"
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          sheetInput.trim()
                            ? 'bg-[#5E5BAE] hover:bg-[#524FA0] text-white active:scale-95 shadow-2xs'
                            : 'bg-[#E5E5EA] text-[#8E8E93]'
                        }`}
                      >
                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                    <div className="w-32 h-1 bg-[#1C1C1E]/20 rounded-full mx-auto" />
                  </form>
                </motion.div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 7. Accessible Confirmation Dialog (Keyboard & Screen Reader Users) */}
        {isAccessibleConfirmOpen && (
          <div 
            className="absolute inset-0 z-50 bg-black/25 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accessible-dialog-title"
          >
            <div className="bg-white/95 backdrop-blur-2xl border border-white/90 rounded-[24px] p-6 w-full max-w-[310px] shadow-[0_16px_48px_rgba(28,28,45,0.18)] animate-in zoom-in-95 duration-150 flex flex-col gap-3.5 text-[#1C1C1E]">
              <div>
                <h3 id="accessible-dialog-title" className="text-base font-bold text-[#1C1C1E]">
                  Mark plan as complete?
                </h3>
                <p className="text-xs text-[#6C6C70] mt-1.5 leading-relaxed">
                  Confirm that you’ve completed <span className="font-semibold text-[#1C1C1E]">“{currentPlan.title}”</span> for today.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccessibleConfirmOpen(false)}
                  className="px-3.5 py-2 rounded-[16px] bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-black/[0.04] text-xs font-semibold text-[#6C6C70] hover:text-[#1C1C1E] active:scale-95 transition-all min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hasCompletedRef.current = true;
                    isHoldingRef.current = false;
                    setIsAccessibleConfirmOpen(false);
                    setPlanState('completed');
                    setHoldProgress(100);
                  }}
                  className="px-4 py-2 rounded-[16px] bg-[#5E5BAE] hover:bg-[#524FA0] active:bg-[#484591] text-white text-xs font-bold shadow-[0_4px_14px_rgba(94,91,174,0.22)] active:scale-95 transition-all min-h-[44px]"
                >
                  Confirm Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
