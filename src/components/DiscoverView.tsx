import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bookmark, 
  Play, 
  Volume2, 
  Sparkles, 
  Clock, 
  X, 
  Check, 
  Compass, 
  ArrowUpRight,
  PlusCircle,
  Share2,
  Info
} from 'lucide-react';

import coverTrail from '../assets/images/discover_trail_1793765793796.jpg';
import coverStretch from '../assets/images/discover_stretch_1793765824456.jpg';
import coverEvening from '../assets/images/discover_evening_1793765838258.jpg';
import coverBreath from '../assets/images/discover_breath_1793765860138.jpg';

const COVER_TRAIL = coverTrail;
const COVER_STRETCH = coverStretch;
const COVER_EVENING = coverEvening;
const COVER_BREATH = coverBreath;

export interface DiscoverItem {
  id: string;
  title: string;
  subtitle: string;
  contentType: string;
  duration: string;
  category: string;
  source: string;
  coverUrl: string;
  novaReason: string;
  audioGuideTitle: string;
  audioGuideSubtitle: string;
  summary: string;
  guidelines: string[];
}

export const DISCOVER_ITEMS: DiscoverItem[] = [
  {
    id: 'walk-mindful',
    title: 'Morning Tree Trail: Paced Stride',
    subtitle: 'Gentle cadence walking guide among morning greenery',
    contentType: 'Guided Audio',
    duration: '15 min',
    category: 'Gentle movement',
    source: 'Mindful Trails Studio',
    coverUrl: COVER_TRAIL,
    novaReason: 'Fits your usual 1:15 PM window when you prefer unhurried outdoor movement.',
    audioGuideTitle: 'Forest Pathway Paced Audio',
    audioGuideSubtitle: 'Soft birdsong & cadence chimes • 15:00',
    summary: 'A low-intensity walking guide designed to sync your natural walking pace with soft visual horizons, lifting desk fatigue without elevated heart rate.',
    guidelines: [
      'Zero pace requirement. Walk at whatever speed feels comforting right now.',
      'Allow eye focus to soften toward tree foliage rather than fixed screens.',
      'Sync effortless deep breaths with your stepping cadence.'
    ]
  },
  {
    id: 'desk-decompression',
    title: 'Living Room Desk & Neck Release',
    subtitle: 'Low-sensory cervical & thoracic decompression sequence',
    contentType: 'Video reset',
    duration: '6 min',
    category: 'Desk relief',
    source: 'Somatic Movement Lab',
    coverUrl: COVER_STRETCH,
    novaReason: 'Helpful for releasing sedentary stiffness on long desk days before tension builds up.',
    audioGuideTitle: 'Thoracic & Trapezius Release Flow',
    audioGuideSubtitle: 'Gentle cues & acoustic chime • 6:00',
    summary: 'A 6-minute gentle posture intervention targeting neck stiffness and rounded shoulders caused by prolonged desk focus. Designed to be practiced in work clothes.',
    guidelines: [
      'No mat or workout clothes required. Stand or sit comfortably.',
      'Focus on gentle chin retractions and broad chest openings.',
      'Stop at the first boundary of gentle resistance—never force a stretch.'
    ]
  },
  {
    id: 'parasympathetic-breath',
    title: '4-7-8 Parasympathetic Vagal Reset',
    subtitle: 'Acoustic breathing resonance for nervous system settling',
    contentType: 'Audio session',
    duration: '8 min',
    category: 'Nervous system',
    source: 'Circadian Pacing Institute',
    coverUrl: COVER_BREATH,
    novaReason: 'Aligns with your Q4 direction of nervous system recovery during high-demand weeks.',
    audioGuideTitle: 'Resonant Vagus Nerve Audio',
    audioGuideSubtitle: 'Binaural harmonic bells • 8:00',
    summary: 'Rhythmic breathwork cues engineered to prolong exhalations and stimulate parasympathetic tone, signaling physical safety to a tense autonomic nervous system.',
    guidelines: [
      'Rest comfortably with back supported by a soft cushion.',
      'Inhale softly through the nose for 4 counts, pause for 7, exhale smoothly for 8.',
      'If the 7-second pause feels strained, adapt freely to a natural 4-4-6 rhythm.'
    ]
  },
  {
    id: 'evening-soundscape',
    title: 'Dusk Rainfall & Low-Arousal Piano',
    subtitle: 'Continuous temperate ambient rain with felted piano notes',
    contentType: 'Soundscape',
    duration: '20 min',
    category: 'Sleep buffer',
    source: 'Rest Ecology Collective',
    coverUrl: COVER_EVENING,
    novaReason: 'Recommended for evenings when sleep consistency has dipped below your 7h baseline.',
    audioGuideTitle: 'Twilight Rain & Felted Piano',
    audioGuideSubtitle: 'Organic environmental recording • 20:00',
    summary: 'A low-arousal acoustic soundscape recorded during twilight rain in a temperate forest. Helps lower cognitive alert states before sleep.',
    guidelines: [
      'Dim ambient lights and place device face-down on a nearby nightstand.',
      'Keep audio volume at soft conversational level to avoid acoustic startle.',
      'Let ambient rainfall gently replace lingering workday task chatter.'
    ]
  }
];

interface DiscoverViewProps {
  phoneFrameRef?: React.RefObject<HTMLDivElement | null>;
  savedItemIds: string[];
  onToggleSave: (id: string) => void;
  isSavedSheetOpen: boolean;
  setIsSavedSheetOpen: (open: boolean) => void;
}

export function DiscoverView({
  phoneFrameRef,
  savedItemIds,
  onToggleSave,
  isSavedSheetOpen,
  setIsSavedSheetOpen
}: DiscoverViewProps) {
  // Selected content item for detail slide-up sheet
  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);

  // Audio guide placeholder notification state
  const [showAudioPlaceholderToast, setShowAudioPlaceholderToast] = useState(false);

  // Toast notification state when "Add to Today's Plan" is tapped (explicit unimplemented state)
  const [showPlanUnimplementedToast, setShowPlanUnimplementedToast] = useState(false);

  const handleAddToPlan = () => {
    setShowPlanUnimplementedToast(true);
    setTimeout(() => setShowPlanUnimplementedToast(false), 2600);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-5 pt-2 pb-[148px] flex flex-col gap-3.5 scrollbar-none overscroll-contain z-10 text-[#1C1C1E]">
      
      {/* Explicit Unimplemented Toast Notification */}
      <AnimatePresence>
        {showPlanUnimplementedToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 bg-[#1C1C1E]/90 text-white px-4 py-2.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 z-50 pointer-events-none backdrop-blur-md"
          >
            <Clock className="w-4 h-4 text-[#FF7A32] stroke-[2.2]" />
            <span>Not yet implemented • Adding to Today's Plan is coming soon</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Demo Placeholder Notification */}
      <AnimatePresence>
        {showAudioPlaceholderToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 bg-[#1C1C1E]/90 text-white px-4 py-2.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 z-50 pointer-events-none backdrop-blur-md"
          >
            <Info className="w-4 h-4 text-[#5E5BAE] stroke-[2.2]" />
            <span>Sample audio placeholder • Real media not connected</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro Subtitle / Context Header */}
      <div className="flex items-center justify-between text-xs text-[#6C6C70] px-0.5">
        <span className="font-medium">Curated resets for your pacing</span>
        <span className="text-[11px] font-medium text-[#6C6C70] bg-white border border-black/[0.04] px-2.5 py-0.5 rounded-full shadow-2xs">
          Sample curation
        </span>
      </div>

      {/* Vertical Rich Media Content Stream */}
      <div className="flex flex-col gap-3.5">
        {DISCOVER_ITEMS.map((item) => {
          const isSaved = savedItemIds.includes(item.id);

          return (
            <article
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group bg-white hover:bg-[#FAFAFC] active:scale-[0.99] transition-all duration-200 rounded-[24px] p-4 border border-black/[0.04] shadow-[0_4px_16px_-4px_rgba(28,28,45,0.05),0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer flex flex-col gap-3 relative select-none"
              role="button"
              tabIndex={0}
              aria-label={`View ${item.title}`}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedItem(item)}
            >
              {/* 1. Cover Image Container with Badges & Save Button */}
              <div className="relative w-full h-44 rounded-[18px] overflow-hidden border border-black/[0.04] shrink-0">
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />

                {/* Subtle dark gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />

                {/* Top Overlay Row: Category Tag & Save Bookmark Button */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  {/* Category Tag inside card */}
                  <span className="px-2.5 py-1 rounded-full bg-white/92 backdrop-blur-md border border-white/95 text-[11px] font-bold text-[#5E5BAE] shadow-2xs">
                    {item.category}
                  </span>

                  {/* Bookmark / Save Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(item.id);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-90 cursor-pointer shadow-2xs ${
                      isSaved
                        ? 'bg-[#5E5BAE] text-white border-[#5E5BAE]'
                        : 'bg-white/90 hover:bg-white text-[#1C1C1E] border-white/95'
                    }`}
                    aria-label={isSaved ? "Remove from saved" : "Save this item"}
                    title={isSaved ? "Saved" : "Save"}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : 'stroke-[2.2]'}`} />
                  </button>
                </div>

                {/* Bottom Overlay Row: Content Type & Duration */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs z-10 pointer-events-none">
                  <div className="flex items-center gap-1.5 font-semibold bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                    <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>{item.contentType} • {item.duration}</span>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-white/92 text-[#1C1C1E] flex items-center justify-center shadow-xs">
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* 2. Text Content: Title & Source */}
              <div className="flex flex-col gap-1 px-0.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[16.5px] font-bold text-[#1C1C1E] tracking-[-0.02em] leading-snug group-hover:text-[#5E5BAE] transition-colors">
                    {item.title}
                  </h3>
                </div>

                <span className="text-[12px] text-[#6C6C70] font-medium">
                  {item.source}
                </span>
              </div>

              {/* 3. Nova Recommendation Reason */}
              <div className="p-3.5 rounded-[18px] bg-[#F2F2F7]/75 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#5E5BAE]/12 text-[#5E5BAE] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-[#5E5BAE]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10.5px] uppercase font-bold text-[#5E5BAE] tracking-wider block">
                    Nova Recommendation
                  </span>
                  <p className="text-[12.5px] text-[#1C1C1E] leading-snug mt-0.5">
                    {item.novaReason}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* CONTENT DETAIL SLIDE-UP SHEET (React Portal)                 */}
      {/* ============================================================ */}
      {(() => {
        const detailSheetContent = (
          <AnimatePresence>
            {selectedItem && (
              <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto overflow-hidden">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedItem(null)}
                  className="absolute inset-0 bg-black/25 backdrop-blur-xs"
                />

                {/* Sheet Body */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="relative w-full max-h-[88%] bg-white/95 backdrop-blur-2xl rounded-t-[32px] shadow-2xl border-t border-white/90 overflow-y-auto z-10 flex flex-col text-[#1C1C1E]"
                  id="discover-detail-sheet"
                >
                  {/* Sheet Header */}
                  <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-black/[0.06] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#5E5BAE]">
                        {selectedItem.category}
                      </span>
                      <span className="text-xs text-[#6C6C70]">• {selectedItem.duration}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Save Button inside detail header */}
                      <button
                        type="button"
                        onClick={() => onToggleSave(selectedItem.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                          savedItemIds.includes(selectedItem.id)
                            ? 'bg-[#5E5BAE] text-white border-[#5E5BAE]'
                            : 'bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1C1C1E] border-black/[0.04]'
                        }`}
                        aria-label="Save bookmark"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${savedItemIds.includes(selectedItem.id) ? 'fill-current' : 'stroke-[2.2]'}`} />
                      </button>

                      {/* Close button */}
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#6C6C70] hover:text-[#1C1C1E] transition-colors cursor-pointer"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Media Hero Card */}
                    <div className="relative w-full h-44 rounded-[20px] overflow-hidden border border-black/[0.04] shadow-xs shrink-0">
                      <img
                        src={selectedItem.coverUrl}
                        alt={selectedItem.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent flex items-end p-4">
                        <div className="flex items-center justify-between w-full text-white">
                          <div className="pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold leading-tight">
                                {selectedItem.audioGuideTitle}
                              </span>
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/90 bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/25">
                                Sample Preview
                              </span>
                            </div>
                            <div className="text-[10.5px] text-white/85 mt-0.5">
                              {selectedItem.audioGuideSubtitle}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setShowAudioPlaceholderToast(true);
                              setTimeout(() => setShowAudioPlaceholderToast(false), 2600);
                            }}
                            className="h-8 px-3 rounded-full bg-white/25 hover:bg-white/35 active:scale-95 text-white flex items-center gap-1.5 shadow-xs border border-white/30 backdrop-blur-md transition-all cursor-pointer shrink-0"
                            aria-label="Sample audio player placeholder"
                            title="Sample audio player placeholder"
                          >
                            <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                            <span className="text-[11px] font-semibold">Sample</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Media sample status disclosure */}
                    <div className="p-3 rounded-[16px] bg-[#F2F2F7]/80 border border-black/[0.04] flex items-start gap-2 text-xs text-[#6C6C70]">
                      <Info className="w-3.5 h-3.5 text-[#5E5BAE] shrink-0 mt-0.5 stroke-[2]" />
                      <div className="text-[11.5px] leading-relaxed">
                        <span className="font-semibold text-[#1C1C1E]">Audio sample placeholder:</span> Real audio streaming is not yet connected in this prototype.
                      </div>
                    </div>

                    {/* Title & Source Attribution */}
                    <div>
                      <h2 className="text-[19px] font-bold text-[#1C1C1E] tracking-tight">
                        {selectedItem.title}
                      </h2>
                      <span className="text-xs text-[#6C6C70] font-medium block mt-0.5">
                        Produced by {selectedItem.source}
                      </span>
                    </div>

                    {/* Nova Recommendation Callout */}
                    <div className="p-3.5 rounded-[18px] bg-[#F4EEFE]/75 border border-[#5E5BAE]/15 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                        <Sparkles className="w-3.5 h-3.5 text-[#5E5BAE]" />
                        <span>Why Nova recommends this for you</span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-[#1C1C1E]">
                        {selectedItem.novaReason}
                      </p>
                    </div>

                    {/* Summary Paragraph */}
                    <div className="p-3.5 rounded-[18px] bg-[#F2F2F7]/75 border border-black/[0.03] text-xs text-[#3C3C43] leading-relaxed">
                      {selectedItem.summary}
                    </div>

                    {/* Gentle Guidelines Checklist */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[#1C1C1E]">Gentle Guidelines</span>
                      <div className="p-3.5 rounded-[18px] bg-[#F2F2F7]/75 border border-black/[0.03] text-xs text-[#3C3C43] space-y-2.5">
                        {selectedItem.guidelines.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2.5">
                            <Check className="w-3.5 h-3.5 text-[#5E5BAE] mt-0.5 shrink-0 stroke-[2.5]" />
                            <span className="leading-snug">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Row: Start session & Add to Today's Plan */}
                    <div className="pt-2 flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={handleAddToPlan}
                        className="w-full py-3 rounded-[18px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#6C6C70] border border-black/[0.04] text-xs font-semibold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Clock className="w-4 h-4 stroke-[2.2] text-[#6C6C70]" />
                        <span>Add to Today's Plan (Coming Soon)</span>
                        <span className="text-[10px] bg-black/[0.06] text-[#6C6C70] px-2 py-0.5 rounded-full font-medium">
                          Not implemented
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="w-full py-2.5 rounded-[16px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#6C6C70] hover:text-[#1C1C1E] text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(detailSheetContent, phoneFrameRef.current);
        }
        return detailSheetContent;
      })()}

      {/* ============================================================ */}
      {/* SAVED ITEMS SLIDE-UP SHEET (React Portal)                    */}
      {/* ============================================================ */}
      {(() => {
        const savedSheetContent = (
          <AnimatePresence>
            {isSavedSheetOpen && (
              <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto overflow-hidden">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsSavedSheetOpen(false)}
                  className="absolute inset-0 bg-black/25 backdrop-blur-xs"
                />

                {/* Sheet Body */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="relative w-full max-h-[85%] bg-white/95 backdrop-blur-2xl rounded-t-[32px] shadow-2xl border-t border-white/90 overflow-y-auto z-10 flex flex-col text-[#1C1C1E]"
                  id="discover-saved-sheet"
                >
                  {/* Header */}
                  <div className="px-5 sm:px-6 pt-5 pb-3.5 border-b border-black/[0.06] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-[#5E5BAE] fill-current" />
                      <h3 className="text-[17px] font-bold text-[#1C1C1E]">
                        Saved Items ({savedItemIds.length})
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSavedSheetOpen(false)}
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#6C6C70] hover:text-[#1C1C1E] transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Saved List Body */}
                  <div className="p-5 sm:p-6 space-y-3">
                    {savedItemIds.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#6C6C70]">
                          <Bookmark className="w-5 h-5 stroke-[1.8]" />
                        </div>
                        <span className="text-sm font-bold text-[#1C1C1E]">No saved items yet</span>
                        <p className="text-xs text-[#6C6C70] max-w-[220px] leading-relaxed">
                          Tap the bookmark icon on any guide or soundscape in Discover to keep it here.
                        </p>
                      </div>
                    ) : (
                      DISCOVER_ITEMS.filter((item) => savedItemIds.includes(item.id)).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setIsSavedSheetOpen(false);
                            setSelectedItem(item);
                          }}
                          className="bg-[#F2F2F7]/75 hover:bg-[#E5E5EA]/80 p-3 rounded-[18px] border border-black/[0.04] flex items-center gap-3 cursor-pointer group transition-all"
                        >
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-[14px] object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5E5BAE] block">
                              {item.category} • {item.duration}
                            </span>
                            <h4 className="text-[13.5px] font-bold text-[#1C1C1E] truncate group-hover:text-[#5E5BAE] transition-colors mt-0.5">
                              {item.title}
                            </h4>
                            <span className="text-[11px] text-[#6C6C70] block truncate mt-0.5">
                              {item.source}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSave(item.id);
                            }}
                            className="w-8 h-8 rounded-full bg-black/5 hover:bg-[#FFE4E6] text-[#6C6C70] hover:text-[#E11D48] flex items-center justify-center transition-colors shrink-0"
                            title="Remove from saved"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.2]" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(savedSheetContent, phoneFrameRef.current);
        }
        return savedSheetContent;
      })()}

    </div>
  );
}
