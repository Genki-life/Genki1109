import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Check, 
  Trash2, 
  MessageSquare, 
  ChevronRight, 
  Info, 
  Clock, 
  Compass, 
  Heart, 
  HelpCircle,
  Send,
  AlertCircle,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { FurryNovaStaticAvatar } from './Avatar3D/FurryNovaStaticAvatar';

export interface MemoryItem {
  id: string;
  category: 'matters' | 'feels_right' | 'check';
  statement: string;
  context?: string;
  source: string;
  updatedTime: string;
  howItHelps: string;
  isConfirmed: boolean;
  observationHypothesis?: string;
  suggestedPresets?: string[];
}

export const INITIAL_MEMORIES: MemoryItem[] = [
  // 1. What matters to you (Goals & Core Intentions)
  {
    id: 'mem-matters-1',
    category: 'matters',
    statement: 'Gradual nervous system reset without guilt or pace targets',
    context: 'Focusing on calm somatic restoration and steady recovery over high-cadence exertion.',
    source: 'Onboarding reflection check-in',
    updatedTime: 'Updated Oct 12',
    howItHelps: 'Filters out high-intensity or pressure-based prompts, prioritizing unhurried somatic recovery.',
    isConfirmed: true,
    suggestedPresets: [
      'Focus primarily on sleep quality and evening wind-down',
      'Shift focus to gentle spinal decompression',
      'Keep focus on nervous system balance'
    ]
  },
  {
    id: 'mem-matters-2',
    category: 'matters',
    statement: 'Building steady movement consistency around desk fatigue',
    context: 'Protecting a short, non-disruptive pocket of time each weekday to unfreeze spine and shoulder stiffness.',
    source: 'Sunday weekly reflection',
    updatedTime: 'Updated Oct 28',
    howItHelps: 'Caps weekday session proposals at 15–20 minutes so physical activity feels like a restorative release rather than a draining task.',
    isConfirmed: true,
    suggestedPresets: [
      'Limit weekday movement to under 15 minutes',
      'Add focus on wrist and neck ergonomics',
      'Allow more flexibility for busy workdays'
    ]
  },

  // 2. What feels right (Preferences & Tailored Habits)
  {
    id: 'mem-feels-1',
    category: 'feels_right',
    statement: 'Preferred midday walking window is 1:15 PM – 1:45 PM',
    context: 'Stepping away right after lunch when screen energy drops and natural daylight supports circadian alertness.',
    source: 'Confirmed in chat on Oct 20',
    updatedTime: 'Updated 10 days ago',
    howItHelps: 'Positions your outdoor fresh-air break right when energy dips after lunch, avoiding late afternoon calendar conflicts.',
    isConfirmed: true,
    suggestedPresets: [
      'Move walking window to 2:00 PM – 2:30 PM',
      'Adjust to whenever lunch finishes naturally',
      'Keep walking window to Mondays and Wednesdays only'
    ]
  },
  {
    id: 'mem-feels-2',
    category: 'feels_right',
    statement: 'Prefers low-friction living room stretches over gym routines',
    context: 'Barefoot mat movements with zero equipment setup, keeping activation energy as close to zero as possible.',
    source: 'Observed from 6 completed 8-min resets',
    updatedTime: 'Updated 5 days ago',
    howItHelps: 'Defaults indoor suggestions to bodyweight sequences you can jump into immediately on your living room rug.',
    isConfirmed: true,
    suggestedPresets: [
      'Include simple foam roller options',
      'Keep strictly to zero-equipment floor stretches',
      'Prefer seated desk stretches when time is tight'
    ]
  },
  {
    id: 'mem-feels-3',
    category: 'feels_right',
    statement: 'Zero pace tracking, speed metrics, or calorie displays',
    context: 'Movement guided by ambient cues and bodily sensation rather than competitive fitness tracking.',
    source: 'Preference set during first week',
    updatedTime: 'Updated Oct 14',
    howItHelps: 'Hides speed, distance, and calorie counters on audio guides, keeping your attention on breathing and mindful posture.',
    isConfirmed: true,
    suggestedPresets: [
      'Show duration only, hide all other metrics',
      'Keep all metrics completely hidden',
      'Allow viewing distance only on long weekend walks'
    ]
  },

  // 3. Can I check something? (Nova's candidate patterns / hypotheses - unconfirmed)
  {
    id: 'mem-check-1',
    category: 'check',
    statement: 'You seem to prefer quiet forest ambients over spoken voice guidance on Thursdays',
    context: 'In recent Thursday resets, audio was switched to ambient birdsong within 2 minutes of starting.',
    source: 'Observed in your last 3 Thursday resets',
    updatedTime: 'Observed 2 days ago',
    howItHelps: 'If confirmed, Nova will auto-select ambient soundscapes instead of guided voice narration for mid-week walks.',
    isConfirmed: false,
    observationHypothesis: 'Pattern detected: 3 of 3 Thursday sessions switched to birdsong track within 2 minutes.',
    suggestedPresets: [
      'Yes, I prefer ambient soundscapes every Thursday',
      'Only when work is especially stressful',
      'I still like spoken voice sometimes'
    ]
  },
  {
    id: 'mem-check-2',
    category: 'check',
    statement: 'Sundays usually work better as complete rest days without reminders',
    context: 'Sunday suggested activities were rescheduled to Monday 4 weeks in a row without pressure.',
    source: 'Observed across 4 consecutive weekends',
    updatedTime: 'Observed yesterday',
    howItHelps: 'If confirmed, Nova will silence Sunday nudge suggestions and leave the day completely open for unstructured resting.',
    isConfirmed: false,
    observationHypothesis: 'Pattern detected: Sunday suggested activities were consistently rescheduled to Monday.',
    suggestedPresets: [
      'Yes, keep Sundays completely reminder-free',
      'Send a gentle evening stretch suggestion instead',
      'Keep Sunday open but allow spontaneous walks'
    ]
  }
];

interface MemoryViewProps {
  phoneFrameRef?: React.RefObject<HTMLDivElement | null>;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ phoneFrameRef }) => {
  // Memories state
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  
  // Selected memory for detail sheet
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  // Conversational editing state
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'nova' | 'user'; text: string; stagedDraft?: string }>>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [stagedDraft, setStagedDraft] = useState<string | null>(null);

  // Delete confirmation modal state
  const [memoryToDelete, setMemoryToDelete] = useState<MemoryItem | null>(null);

  // Info modal state
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Grouped memories
  const mattersMemories = memories.filter(m => m.category === 'matters');
  const feelsRightMemories = memories.filter(m => m.category === 'feels_right');
  const checkObservations = memories.filter(m => m.category === 'check');

  // Handle confirming an unconfirmed observation ("Yes, remember")
  const handleConfirmObservation = (item: MemoryItem) => {
    setMemories(prev => prev.map(m => {
      if (m.id === item.id) {
        return {
          ...m,
          category: 'feels_right',
          isConfirmed: true,
          updatedTime: 'Confirmed just now',
          source: 'Confirmed by you from observation'
        };
      }
      return m;
    }));

    if (selectedMemory?.id === item.id) {
      setSelectedMemory(null);
    }

    showToast('Saved to "What feels right"');
  };

  // Handle discarding an unconfirmed observation ("No")
  const handleDiscardObservation = (item: MemoryItem) => {
    setMemories(prev => prev.filter(m => m.id !== item.id));

    if (selectedMemory?.id === item.id) {
      setSelectedMemory(null);
    }

    showToast('Observation discarded');
  };

  // Open "Talk to Nova" contextual dialogue
  const handleOpenTalkToNova = (item: MemoryItem) => {
    setEditingMemory(item);
    setStagedDraft(null);
    setChatInputText('');
    
    // Initial message from Nova addressing this specific memory
    setChatMessages([
      {
        id: 'nova-init',
        sender: 'nova',
        text: `I have this noted down: “${item.statement}”.\n\nHow would you like me to adjust this? Tell me in your own words, or pick one of the suggestions below.`
      }
    ]);
  };

  // Handle user sending text or selecting a suggestion in "Talk to Nova"
  const handleSendModification = (userInput: string) => {
    if (!userInput.trim() || !editingMemory) return;

    const trimmedInput = userInput.trim();
    
    // Add user message
    const userMsgId = `user-${Date.now()}`;
    const novaReplyId = `nova-${Date.now() + 1}`;

    // Generate a natural drafted statement based on user input
    let proposedStatement = trimmedInput;
    if (trimmedInput.startsWith('Yes, ') || trimmedInput.startsWith('No, ')) {
      proposedStatement = trimmedInput.replace(/^(Yes,\s*|No,\s*)/i, '');
    }
    // Capitalize first letter
    proposedStatement = proposedStatement.charAt(0).toUpperCase() + proposedStatement.slice(1);

    setChatMessages(prev => [
      ...prev,
      { id: userMsgId, sender: 'user', text: trimmedInput },
      { 
        id: novaReplyId, 
        sender: 'nova', 
        text: `Understood. Based on what you shared, I drafted this updated memory for you:`,
        stagedDraft: proposedStatement
      }
    ]);

    setStagedDraft(proposedStatement);
    setChatInputText('');
  };

  // Confirm and apply the staged memory update
  const handleConfirmMemoryUpdate = () => {
    if (!editingMemory || !stagedDraft) return;

    setMemories(prev => prev.map(m => {
      if (m.id === editingMemory.id) {
        return {
          ...m,
          statement: stagedDraft,
          category: m.category === 'check' ? 'feels_right' : m.category,
          isConfirmed: true,
          updatedTime: 'Updated via conversation',
          source: 'Adjusted in conversation with Nova'
        };
      }
      return m;
    }));

    setEditingMemory(null);
    setSelectedMemory(null);
    setStagedDraft(null);
    showToast('Memory updated via conversation');
  };

  // Cancel and exit dialogue without applying changes
  const handleCancelDialogue = () => {
    setEditingMemory(null);
    setStagedDraft(null);
    setChatMessages([]);
  };

  // Delete a memory
  const handleConfirmDelete = () => {
    if (!memoryToDelete) return;

    setMemories(prev => prev.filter(m => m.id !== memoryToDelete.id));

    if (selectedMemory?.id === memoryToDelete.id) {
      setSelectedMemory(null);
    }

    setMemoryToDelete(null);
    showToast('Memory deleted');
  };

  // Reset sample memories helper
  const handleResetSampleData = () => {
    setMemories(INITIAL_MEMORIES);
    setSelectedMemory(null);
    setEditingMemory(null);
    showToast('Reset to original sample memories');
  };

  // Main UI
  const mainContent = (
    <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 flex flex-col gap-4 scrollbar-none z-10 text-left">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 bg-[#5E5BAE] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 z-50 pointer-events-none"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context bar with subtitle + quick info & reset controls */}
      <div className="flex items-center justify-between text-xs text-[#7A7895] px-0.5 pt-0.5">
        <span>What Nova has learned about your pacing</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            className="w-7 h-7 rounded-full bg-white/70 hover:bg-white/90 backdrop-blur-md border border-white/80 shadow-2xs flex items-center justify-center text-[#7A7895] hover:text-[#26263F] transition-all cursor-pointer"
            aria-label="How Nova memory works"
            title="How Nova memory works"
          >
            <Info className="w-3.5 h-3.5 stroke-[2]" />
          </button>

          <button
            type="button"
            onClick={handleResetSampleData}
            className="w-7 h-7 rounded-full bg-white/70 hover:bg-white/90 backdrop-blur-md border border-white/80 shadow-2xs flex items-center justify-center text-[#7A7895] hover:text-[#5E5BAE] transition-all cursor-pointer"
            aria-label="Reset sample memories"
            title="Reset sample memories"
          >
            <RotateCcw className="w-3 h-3 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Hero Card: Nova Character Bust + Natural Warm Reassurance */}
      <div className="bg-white/75 backdrop-blur-md rounded-[26px] p-5 border border-white/85 shadow-[0_4px_24px_rgba(90,80,140,0.04)] flex flex-col gap-3 relative overflow-hidden shrink-0">
        {/* Soft background ambient glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#EBDDF9]/40 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="relative w-12 h-12 shrink-0 rounded-full bg-gradient-to-b from-[#FAF8FD] to-[#EAE6F8] p-0.5 border border-white/90 shadow-2xs flex items-center justify-center overflow-hidden">
            <FurryNovaStaticAvatar size={48} className="w-full h-full" />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#5E5BAE] border-2 border-white flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-white stroke-[2.5]" />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold text-[#26263F] tracking-tight">Nova</span>
              <span className="text-[10.5px] bg-[#5E5BAE]/10 text-[#5E5BAE] font-semibold px-2 py-0.5 rounded-full border border-[#5E5BAE]/15">
                Adaptive memory
              </span>
            </div>
            <p className="text-[13.5px] font-medium text-[#26263F] leading-snug">
              “I’m getting to know what works for you.”
            </p>
          </div>
        </div>

        <p className="text-xs text-[#7A7895] leading-relaxed relative z-10 pt-1 border-t border-[#26263F]/[0.05]">
          Every observation is visible here. You can refine, adjust, or remove any item whenever your needs change.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 1. Group: What matters to you (Goals)                         */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#5E5BAE] stroke-[2.2]" />
            <h2 className="text-[15.5px] font-bold text-[#26263F] tracking-tight">
              What matters to you
            </h2>
          </div>
          <span className="text-[11px] font-medium text-[#7A7895] bg-[#26263F]/[0.04] px-2.5 py-0.5 rounded-full">
            {mattersMemories.length} {mattersMemories.length === 1 ? 'goal' : 'goals'}
          </span>
        </div>
        <p className="text-[11.5px] text-[#7A7895] px-0.5 -mt-1 leading-normal">
          Your overarching priorities and intentions
        </p>

        {mattersMemories.length === 0 ? (
          <div className="bg-white/50 backdrop-blur-sm rounded-[20px] p-4 border border-dashed border-white/80 text-center text-xs text-[#7A7895]">
            No goals saved yet. Talk to Nova to share what matters most to you.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {mattersMemories.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMemory(item)}
                className="group bg-white/75 hover:bg-white/90 active:scale-[0.99] transition-all backdrop-blur-md rounded-[22px] p-4 border border-white/80 shadow-[0_3px_16px_rgba(90,80,140,0.03)] cursor-pointer flex flex-col gap-2.5 relative select-none"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedMemory(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-semibold text-[#26263F] leading-snug tracking-tight group-hover:text-[#5E5BAE] transition-colors">
                    {item.statement}
                  </p>
                  <ChevronRight className="w-4 h-4 text-[#A5A3BE] group-hover:text-[#5E5BAE] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7A7895] pt-1 border-t border-[#26263F]/[0.05]">
                  <span className="truncate max-w-[200px]">{item.source}</span>
                  <span className="shrink-0">{item.updatedTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 2. Group: What feels right (Preferences & Tailored Habits)    */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#8E8CD6] stroke-[2.2]" />
            <h2 className="text-[15.5px] font-bold text-[#26263F] tracking-tight">
              What feels right
            </h2>
          </div>
          <span className="text-[11px] font-medium text-[#7A7895] bg-[#26263F]/[0.04] px-2.5 py-0.5 rounded-full">
            {feelsRightMemories.length} {feelsRightMemories.length === 1 ? 'preference' : 'preferences'}
          </span>
        </div>
        <p className="text-[11.5px] text-[#7A7895] px-0.5 -mt-1 leading-normal">
          Habits, timings, and environments that suit your rhythm
        </p>

        {feelsRightMemories.length === 0 ? (
          <div className="bg-white/50 backdrop-blur-sm rounded-[20px] p-4 border border-dashed border-white/80 text-center text-xs text-[#7A7895]">
            No confirmed preferences yet. Observations confirmed in “Can I check something?” will appear here.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {feelsRightMemories.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMemory(item)}
                className="group bg-white/75 hover:bg-white/90 active:scale-[0.99] transition-all backdrop-blur-md rounded-[22px] p-4 border border-white/80 shadow-[0_3px_16px_rgba(90,80,140,0.03)] cursor-pointer flex flex-col gap-2.5 relative select-none"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedMemory(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-semibold text-[#26263F] leading-snug tracking-tight group-hover:text-[#5E5BAE] transition-colors">
                    {item.statement}
                  </p>
                  <ChevronRight className="w-4 h-4 text-[#A5A3BE] group-hover:text-[#5E5BAE] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#7A7895] pt-1 border-t border-[#26263F]/[0.05]">
                  <span className="truncate max-w-[200px]">{item.source}</span>
                  <span className="shrink-0">{item.updatedTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 3. Group: Can I check something? (Unconfirmed observations)   */}
      {/* ============================================================ */}
      <section className="flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#E59980] stroke-[2.2]" />
            <h2 className="text-[15.5px] font-bold text-[#26263F] tracking-tight">
              Can I check something?
            </h2>
          </div>
          <span className="text-[11px] font-bold text-[#C27838] bg-[#FEF3EB] border border-[#FAD7B8] px-2.5 py-0.5 rounded-full">
            {checkObservations.length} to review
          </span>
        </div>
        <p className="text-[11.5px] text-[#7A7895] px-0.5 -mt-1 leading-normal">
          Patterns Nova noticed recently • Pending your confirmation
        </p>

        {checkObservations.length === 0 ? (
          <div className="bg-white/50 backdrop-blur-sm rounded-[20px] p-4 border border-dashed border-white/80 text-center text-xs text-[#7A7895]">
            No unconfirmed observations at this time. Nova is watching gently for recurring patterns.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {checkObservations.map((item) => (
              <div
                key={item.id}
                className="bg-white/80 backdrop-blur-md rounded-[22px] p-4 border border-[#E8E4F5] shadow-[0_4px_20px_rgba(90,80,140,0.04)] flex flex-col gap-3 relative select-none"
              >
                {/* Prominent Unconfirmed Observation Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5E5BAE] bg-[#5E5BAE]/10 border border-[#5E5BAE]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 stroke-[2.2]" />
                    Pattern observation • Unconfirmed
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedMemory(item)}
                    className="text-[11px] font-semibold text-[#5E5BAE] hover:underline flex items-center cursor-pointer"
                  >
                    Details
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5 stroke-[2.2]" />
                  </button>
                </div>

                {/* Observation Statement */}
                <p 
                  onClick={() => setSelectedMemory(item)}
                  className="text-[14px] font-semibold text-[#26263F] leading-snug tracking-tight cursor-pointer hover:text-[#5E5BAE] transition-colors"
                >
                  {item.statement}
                </p>

                {/* Source & Timestamp */}
                <div className="flex items-center justify-between text-[11px] text-[#7A7895] -mt-1">
                  <span className="truncate max-w-[210px]">{item.source}</span>
                  <span className="shrink-0">{item.updatedTime}</span>
                </div>

                {/* Inline 3 Action Buttons: Yes, remember / Talk to Nova / No */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#26263F]/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleConfirmObservation(item)}
                    className="w-full bg-[#5E5BAE] hover:bg-[#4E4B9E] active:scale-95 text-white py-2 px-2 rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Yes, save</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenTalkToNova(item)}
                    className="w-full bg-white hover:bg-[#FAF8FD] active:scale-95 text-[#26263F] border border-white/90 py-2 px-2 rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#5E5BAE] stroke-[2]" />
                    <span>Talk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDiscardObservation(item)}
                    className="w-full bg-white/70 hover:bg-rose-50 hover:text-rose-600 active:scale-95 text-[#7A7895] border border-white/80 py-2 px-2 rounded-[14px] text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2]" />
                    <span>No</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Prototype Transparency Note */}
      <div className="pt-2 border-t border-[#26263F]/[0.06] flex items-center justify-between text-[11px] text-[#7A7895]">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 stroke-[2]" />
          Sample memory store (Local session)
        </span>
        <span>Real AI not connected</span>
      </div>
    </div>
  );

  // ============================================================
  // Portal Content: Detail Sheet, Talk to Nova, Delete Modal
  // ============================================================
  const portalContent = (
    <>
      {/* 1. Memory Detail Sheet */}
      <AnimatePresence>
        {selectedMemory && !editingMemory && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedMemory(null)}
              className="absolute inset-0 bg-[#26263F]/35 backdrop-blur-xs"
            />

            {/* Slide-up Container */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full max-h-[88%] bg-[#FAF7F2] rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden z-10 border-t border-white"
            >
              {/* Header with drag bar */}
              <div className="pt-3 pb-2 px-6 flex flex-col items-center shrink-0 border-b border-[#26263F]/[0.05] bg-white/40">
                <div className="w-10 h-1 bg-[#26263F]/20 rounded-full mb-3" />
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedMemory.category === 'matters'
                        ? 'text-[#5E5BAE] bg-[#5E5BAE]/10 border border-[#5E5BAE]/20'
                        : selectedMemory.category === 'feels_right'
                        ? 'text-[#6865B8] bg-[#6865B8]/10 border border-[#6865B8]/20'
                        : 'text-[#C27838] bg-[#FEF3EB] border border-[#FAD7B8]'
                    }`}>
                      {selectedMemory.category === 'matters' && 'Goal • What matters to you'}
                      {selectedMemory.category === 'feels_right' && 'Preference • What feels right'}
                      {selectedMemory.category === 'check' && 'Pattern observation • Unconfirmed'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMemory(null)}
                    className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#26263F] flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Close details"
                  >
                    <X className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 text-left scrollbar-none">
                
                {/* Statement Hero */}
                <div className="bg-white/80 rounded-[22px] p-5 border border-white/90 shadow-2xs flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[#7A7895] uppercase tracking-wider">
                    Memory Statement
                  </span>
                  <h3 className="text-[17px] font-bold text-[#26263F] leading-snug tracking-tight">
                    {selectedMemory.statement}
                  </h3>
                  {selectedMemory.context && (
                    <p className="text-xs text-[#5D5B78] leading-relaxed pt-1">
                      {selectedMemory.context}
                    </p>
                  )}
                </div>

                {/* If unconfirmed: explicit notice banner */}
                {!selectedMemory.isConfirmed && (
                  <div className="bg-[#FEF8F3] border border-[#FAD7B8] rounded-[20px] p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-[#C27838] shrink-0 mt-0.5 stroke-[2.2]" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-[#A85820]">
                        Pending your verification
                      </span>
                      <p className="text-[11.5px] text-[#A85820]/90 leading-relaxed">
                        Nova detected this possible pattern, but it is not saved as an established memory until you confirm it.
                      </p>
                    </div>
                  </div>
                )}

                {/* Source & Updated Information */}
                <div className="bg-white/60 rounded-[20px] p-4 border border-white/75 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7A7895]">Source</span>
                    <span className="font-semibold text-[#26263F] text-right">{selectedMemory.source}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#26263F]/[0.05]">
                    <span className="text-[#7A7895]">Status</span>
                    <span className="font-semibold text-[#26263F]">
                      {selectedMemory.isConfirmed ? 'Confirmed & Active' : 'Unconfirmed Observation'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#26263F]/[0.05]">
                    <span className="text-[#7A7895]">Timeline</span>
                    <span className="text-[#5D5B78]">{selectedMemory.updatedTime}</span>
                  </div>
                </div>

                {/* How this helps Nova */}
                <div className="bg-white/80 rounded-[22px] p-5 border border-white/90 shadow-2xs flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#5E5BAE]">
                    <Sparkles className="w-4 h-4 stroke-[2.2]" />
                    <span className="uppercase tracking-wider">How Nova uses this</span>
                  </div>
                  <p className="text-[13px] text-[#26263F] leading-relaxed">
                    {selectedMemory.howItHelps}
                  </p>
                  <p className="text-[11px] text-[#7A7895] pt-1">
                    Nova uses this to shape daily suggestions without creating guilt or unsolicited alerts.
                  </p>
                </div>

              </div>

              {/* Bottom Actions Bar */}
              <div className="p-4 px-6 bg-white/70 backdrop-blur-md border-t border-white/80 flex flex-col gap-2">
                {selectedMemory.isConfirmed ? (
                  /* Confirmed memory actions: Talk to Nova / Delete */
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenTalkToNova(selectedMemory)}
                      className="flex-1 bg-[#5E5BAE] hover:bg-[#4E4B9E] active:scale-98 text-white py-3 rounded-full text-[13.5px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                      <span>Talk to Nova</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemoryToDelete(selectedMemory)}
                      className="w-12 h-12 rounded-full bg-white hover:bg-rose-50 text-[#7A7895] hover:text-rose-600 border border-white/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
                      aria-label="Delete this memory"
                      title="Delete this memory"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                ) : (
                  /* Unconfirmed observation actions: Yes, remember / Talk to Nova / No */
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleConfirmObservation(selectedMemory)}
                        className="flex-1 bg-[#5E5BAE] hover:bg-[#4E4B9E] active:scale-98 text-white py-3 rounded-full text-[13.5px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Yes, remember</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenTalkToNova(selectedMemory)}
                        className="flex-1 bg-white hover:bg-[#FAF8FD] active:scale-98 text-[#26263F] border border-white/90 py-3 rounded-full text-[13.5px] font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-[#5E5BAE] stroke-[2.2]" />
                        <span>Talk to Nova</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDiscardObservation(selectedMemory)}
                      className="w-full py-2 text-center text-xs text-[#7A7895] hover:text-[#26263F] transition-colors cursor-pointer"
                    >
                      No, don't save this observation
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. "Talk to Nova" Conversational Adjustment Sheet */}
      <AnimatePresence>
        {editingMemory && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleCancelDialogue}
              className="absolute inset-0 bg-[#26263F]/40 backdrop-blur-xs"
            />

            {/* Conversation Window */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full h-[92%] bg-[#FAF7F2] rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden z-10 border-t border-white"
            >
              {/* Sheet Top Bar: Nova Avatar + Context + Close */}
              <div className="pt-3 pb-3 px-5 flex items-center justify-between border-b border-[#26263F]/[0.06] bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-full bg-gradient-to-b from-[#FAF8FD] to-[#EAE6F8] p-0.5 border border-white/90 shadow-2xs flex items-center justify-center overflow-hidden">
                    <FurryNovaStaticAvatar size={36} className="w-full h-full" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-bold text-[#26263F]">Nova</span>
                      <span className="text-[10px] bg-[#5E5BAE]/10 text-[#5E5BAE] font-semibold px-2 py-0.2 rounded-full">
                        Adjusting memory
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7A7895] truncate max-w-[200px]">
                      {editingMemory.statement}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCancelDialogue}
                  className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#26263F] flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close dialogue"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              </div>

              {/* Prototype Disclaimer Banner */}
              <div className="px-5 py-2 bg-amber-50/70 border-b border-amber-200/50 flex items-center gap-2 text-[11px] text-amber-800">
                <Info className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
                <span>Prototype: Simulated Nova dialogue. Real AI is not connected.</span>
              </div>

              {/* Scrollable Chat History */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5 scrollbar-none text-left">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1.5 ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[20px] p-3.5 text-[13px] leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#5E5BAE] text-white rounded-br-[4px] shadow-sm'
                          : 'bg-white/85 text-[#26263F] rounded-bl-[4px] border border-white/90 shadow-2xs whitespace-pre-line'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Staged Proposal Card (rendered inside Nova's reply when proposed) */}
                    {msg.stagedDraft && (
                      <div className="w-full bg-white/90 rounded-[22px] p-4 border border-[#5E5BAE]/25 shadow-md flex flex-col gap-2.5 mt-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Proposed memory update:</span>
                        </div>

                        <div className="bg-[#FAF8FD] p-3 rounded-[16px] border border-[#5E5BAE]/15">
                          <p className="text-[13.5px] font-semibold text-[#26263F] leading-snug">
                            “{msg.stagedDraft}”
                          </p>
                        </div>

                        <p className="text-[11px] text-[#7A7895] leading-normal">
                          Only applied when you click confirm. Your long-term plan will remain untouched.
                        </p>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleConfirmMemoryUpdate}
                            className="flex-1 bg-[#5E5BAE] hover:bg-[#4E4B9E] active:scale-95 text-white py-2.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Confirm & update memory</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setStagedDraft(null);
                              setChatMessages(prev => [
                                ...prev,
                                {
                                  id: `nova-revert-${Date.now()}`,
                                  sender: 'nova',
                                  text: "No problem, draft cleared. Tell me how else you'd like to adjust it."
                                }
                              ]);
                            }}
                            className="bg-white hover:bg-rose-50 text-[#7A7895] hover:text-rose-600 border border-white/90 py-2.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer"
                          >
                            Cancel draft
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Quick suggestion chips (if no draft pending) */}
                {!stagedDraft && editingMemory.suggestedPresets && editingMemory.suggestedPresets.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2">
                    <span className="text-[11px] font-bold text-[#7A7895] uppercase tracking-wider">
                      Quick adjustments:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {editingMemory.suggestedPresets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendModification(preset)}
                          className="text-left text-xs bg-white/80 hover:bg-white active:scale-95 text-[#26263F] px-3 py-2 rounded-[14px] border border-white/90 shadow-2xs transition-all cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Input Area */}
              <div className="p-3 px-4 bg-white/80 backdrop-blur-md border-t border-white/90 flex flex-col gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendModification(chatInputText);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Express in your own words…"
                    className="flex-1 bg-white rounded-full px-4 py-2.5 text-xs text-[#26263F] placeholder-[#7A7895] border border-[#26263F]/10 focus:outline-none focus:border-[#5E5BAE] shadow-2xs"
                  />

                  <button
                    type="submit"
                    disabled={!chatInputText.trim()}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      chatInputText.trim()
                        ? 'bg-[#5E5BAE] text-white shadow-xs cursor-pointer active:scale-90'
                        : 'bg-[#26263F]/10 text-[#7A7895] cursor-not-allowed'
                    }`}
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4 ml-0.5 stroke-[2]" />
                  </button>
                </form>

                <div className="flex items-center justify-between text-[10.5px] text-[#7A7895] px-1">
                  <span>Changes only apply upon your final confirmation</span>
                  <button
                    type="button"
                    onClick={handleCancelDialogue}
                    className="hover:underline text-[#7A7895]"
                  >
                    Discard & exit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Secondary Delete Confirmation Modal */}
      <AnimatePresence>
        {memoryToDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemoryToDelete(null)}
              className="absolute inset-0 bg-[#26263F]/45 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#FAF7F2] rounded-[28px] p-6 shadow-2xl flex flex-col gap-4 text-left border border-white z-10"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5 stroke-[2]" />
              </div>

              <div>
                <h4 className="text-[16px] font-bold text-[#26263F] tracking-tight">
                  Delete this memory?
                </h4>
                <p className="text-xs text-[#5D5B78] mt-1.5 leading-relaxed">
                  Nova will no longer consider this when suggesting daily pacing and activities. You can always share it again later.
                </p>
                <div className="mt-3 p-3 bg-white/70 rounded-[16px] border border-white text-xs font-medium text-[#26263F] italic">
                  “{memoryToDelete.statement}”
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white py-2.5 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  Delete memory
                </button>

                <button
                  type="button"
                  onClick={() => setMemoryToDelete(null)}
                  className="flex-1 bg-white hover:bg-white/80 active:scale-95 text-[#26263F] border border-white/90 py-2.5 rounded-full text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                >
                  Keep it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Memory Information Modal */}
      <AnimatePresence>
        {isInfoModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInfoModalOpen(false)}
              className="absolute inset-0 bg-[#26263F]/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#FAF7F2] rounded-[28px] p-6 shadow-2xl flex flex-col gap-3 text-left border border-white z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#5E5BAE]/10 flex items-center justify-center text-[#5E5BAE]">
                    <Sparkles className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h4 className="text-[16px] font-bold text-[#26263F]">
                    About Nova Memory
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInfoModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center text-[#7A7895] hover:text-[#26263F]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#5D5B78] flex flex-col gap-2.5 leading-relaxed pt-1">
                <p>
                  Nova holds observations lightly so you feel understood without feeling boxed in.
                </p>
                <div className="bg-white/70 p-3 rounded-[16px] border border-white/80 flex flex-col gap-1.5 text-[11.5px]">
                  <strong className="text-[#26263F]">Three categories:</strong>
                  <div>• <strong>What matters to you:</strong> Your overarching priorities and intentions.</div>
                  <div>• <strong>What feels right:</strong> Habits, timings, and environments that suit your body.</div>
                  <div>• <strong>Can I check something?</strong> Emerging patterns Nova noticed, waiting for your confirmation.</div>
                </div>
                <p className="text-[11px] text-[#7A7895]">
                  You can edit through conversation or delete any item at any time. Unconfirmed observations are never treated as facts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                className="w-full bg-[#5E5BAE] text-white py-2.5 rounded-full text-xs font-bold transition-all shadow-2xs mt-2"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  // Render inside phoneFrameRef if present, otherwise render inline
  if (phoneFrameRef?.current) {
    return (
      <>
        {mainContent}
        {createPortal(portalContent, phoneFrameRef.current)}
      </>
    );
  }

  return (
    <>
      {mainContent}
      {portalContent}
    </>
  );
};
