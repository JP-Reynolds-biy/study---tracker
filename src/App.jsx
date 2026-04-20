import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import AuthScreen from './AuthScreen';

// Spaced repetition: gaps between consecutive reviews
// reviewCount=1→5d, 2→5d, 3→10d, 4→10d, 5+→30d (cumulative: day 5,10,20,30,60,90,120,150…)
function getReviewInterval(reviewCount) {
  if (reviewCount <= 2) return 5;
  if (reviewCount <= 4) return 10;
  return 30;
}

const DEFAULT_SUBJECTS = [
  { id: 'maths', name: 'Maths', glyph: '𓎟', color: '#c9a961' },
  { id: 'history', name: 'History', glyph: '𓂀', color: '#b85c38' },
  { id: 'geography', name: 'Geography', glyph: '𓈗', color: '#4a7c59' },
  { id: 'spanish', name: 'Spanish', glyph: '𓃭', color: '#d4784a' },
  { id: 'religion', name: 'Religion', glyph: '𓋹', color: '#8b6f47' },
  { id: 'science', name: 'Science', glyph: '𓇳', color: '#5a7a9e' },
  { id: 'business', name: 'Business', glyph: '𓌃', color: '#a06c4f' },
  { id: 'english', name: 'English', glyph: '𓂋', color: '#7d6b8a' },
];

// ============ STORAGE HELPERS ============

// localStorage — used as an offline fallback and for migration detection
function loadData() {
  try {
    const raw = localStorage.getItem('tracker-state');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveData(state) {
  try {
    localStorage.setItem('tracker-state', JSON.stringify(state));
  } catch (e) {
    console.error('localStorage save failed', e);
  }
}

// Supabase — primary cloud store
async function loadFromSupabase(userId) {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('state')
      .eq('user_id', userId)
      .single();
    // PGRST116 = no rows found (first-time user), not an error we care about
    if (error && error.code !== 'PGRST116') throw error;
    return data?.state ?? null;
  } catch {
    return null;
  }
}

async function saveToSupabase(userId, state) {
  try {
    await supabase
      .from('user_data')
      .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
  } catch (e) {
    console.error('Supabase save failed', e);
  }
}

// ============ UTILITY ============
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function formatDate(iso) {
  if (!iso) return '.';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

function getNextReviewDate(lastStudied, reviewCount) {
  if (!lastStudied) return null;
  const date = new Date(lastStudied);
  date.setDate(date.getDate() + getReviewInterval(reviewCount));
  return date.toISOString();
}

function getEffectiveKnowledge(topic) {
  const subs = topic.subtopics || [];
  if (subs.length === 0) return topic.knowledge;
  return Math.max(1, Math.round(subs.reduce((a, st) => a + st.knowledge, 0) / subs.length));
}

function getEffectiveMinutes(topic) {
  const subMins = (topic.subtopics || []).reduce((a, st) => a + (st.totalMinutes || 0), 0);
  return (topic.totalMinutes || 0) + subMins;
}

function getReviewStatus(item) {
  if (!item.lastStudied) return { status: 'new', days: null, label: 'Not started' };
  const nextReview = getNextReviewDate(item.lastStudied, item.reviewCount || 0);
  const daysUntil = daysBetween(new Date(), nextReview);
  if (daysUntil < 0) return { status: 'overdue', days: Math.abs(daysUntil), label: `${Math.abs(daysUntil)}d overdue` };
  if (daysUntil === 0) return { status: 'today', days: 0, label: 'Review today' };
  if (daysUntil <= 2) return { status: 'soon', days: daysUntil, label: `In ${daysUntil}d` };
  return { status: 'scheduled', days: daysUntil, label: `In ${daysUntil}d` };
}

// For a chapter with subtopics, derive status from the most urgent subtopic
const STATUS_PRIORITY = { overdue: 4, today: 3, soon: 2, scheduled: 1, new: 0 };
function getEffectiveReviewStatus(topic) {
  const subs = topic.subtopics || [];
  if (subs.length === 0) return getReviewStatus(topic);
  const candidates = [
    ...(topic.lastStudied ? [getReviewStatus(topic)] : []),
    ...subs.map(st => getReviewStatus(st)),
  ];
  if (candidates.length === 0) return { status: 'new', days: null, label: 'Not started' };
  return candidates.reduce((best, s) =>
    (STATUS_PRIORITY[s.status] || 0) > (STATUS_PRIORITY[best.status] || 0) ? s : best
  );
}

// ============ EXAM PDFS ============
function ExamPdfs({ pdfs = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  function save() {
    if (!url.trim()) return;
    onChange([...pdfs, { id: `ep_${Date.now()}`, label: label.trim() || url.trim(), url: url.trim() }]);
    setLabel('');
    setUrl('');
    setAdding(false);
  }

  function remove(id) {
    onChange(pdfs.filter(p => p.id !== id));
  }

  return (
    <div className="exam-pdfs">
      {pdfs.length === 0 && !adding && (
        <p className="exam-pdfs-empty">No links yet</p>
      )}
      {pdfs.map(p => (
        <div key={p.id} className="exam-pdf-row">
          <a href={p.url} target="_blank" rel="noreferrer" className="exam-pdf-link">
            &#128196; {p.label}
          </a>
          <button className="exam-pdf-del" onClick={() => remove(p.id)} title="Remove">&#10005;</button>
        </div>
      ))}
      {adding ? (
        <div className="exam-pdf-form">
          <input
            placeholder="Label (e.g. 2022 Paper 1)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
          <input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <div className="exam-pdf-form-btns">
            <button className="btn-ghost" onClick={() => { setAdding(false); setLabel(''); setUrl(''); }}>Cancel</button>
            <button className="btn-primary" disabled={!url.trim()} onClick={save}>Add</button>
          </div>
        </div>
      ) : (
        <button className="exam-pdf-add" onClick={() => setAdding(true)}>+ Add PDF link</button>
      )}
    </div>
  );
}

// ============ MAIN APP ============
export default function StudyTracker() {
  const [state, setState] = useState({
    subjects: DEFAULT_SUBJECTS.map(s => ({ ...s, topics: [] })),
    sessions: [],
    xp: 0,
    streak: { count: 0, lastDay: null },
  });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // dashboard, subject, review
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [activeSubtopic, setActiveSubtopic] = useState(null);
  const [confirmUnlog, setConfirmUnlog] = useState(null); // sessionId to unlog
  const [levelUpAnim, setLevelUpAnim] = useState(null);
  const prevLevelRef = useRef(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const saveTimeoutRef = useRef(null);

  // Auth listener — keep user in sync with Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        // Reset to blank state so the next user doesn't see stale data
        setState({
          subjects: DEFAULT_SUBJECTS.map(s => ({ ...s, topics: [] })),
          sessions: [],
          xp: 0,
          streak: { count: 0, lastDay: null },
        });
        setLoading(true);
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data once auth resolves and we have a user
  useEffect(() => {
    if (authLoading || !user) return;

    (async () => {
      let data = await loadFromSupabase(user.id);

      if (!data) {
        // First login: migrate any existing localStorage data into Supabase
        const local = loadData();
        if (local) {
          data = local;
          await saveToSupabase(user.id, local);
        }
      }

      if (data) setState(data);
      setLoading(false);
    })();
  }, [user, authLoading]);

  // Persist every state change — localStorage immediately, Supabase debounced
  useEffect(() => {
    if (loading) return;
    saveData(state);
    if (user) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveToSupabase(user.id, state), 2000);
    }
  }, [state, loading, user]);

  const updateTopic = (subjectId, topicId, updates) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId
          ? { ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, ...updates } : t) }
          : s
      )
    }));
  };

  const addTopic = (subjectId, name) => {
    const newTopic = {
      id: `t_${Date.now()}`,
      name,
      knowledge: 1,
      notes: '',
      quizletUrl: '',
      examLinks: '',
      examPdfs: [],
      lastStudied: null,
      reviewCount: 0,
      totalMinutes: 0,
      subtopics: [],
    };
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId ? { ...s, topics: [...s.topics, newTopic] } : s
      )
    }));
  };

  const deleteTopic = (subjectId, topicId) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s
      )
    }));
  };

  const addSubtopic = (subjectId, topicId, name) => {
    const newSubtopic = {
      id: `st_${Date.now()}`,
      name,
      knowledge: 1,
      notes: '',
      quizletUrl: '',
      examLinks: '',
      examPdfs: [],
      lastStudied: null,
      reviewCount: 0,
      totalMinutes: 0,
    };
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId ? {
          ...s,
          topics: s.topics.map(t =>
            t.id === topicId ? { ...t, subtopics: [...(t.subtopics || []), newSubtopic] } : t
          )
        } : s
      )
    }));
  };

  const deleteSubtopic = (subjectId, topicId, subtopicId) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId ? {
          ...s,
          topics: s.topics.map(t =>
            t.id === topicId ? { ...t, subtopics: (t.subtopics || []).filter(st => st.id !== subtopicId) } : t
          )
        } : s
      )
    }));
  };

  const updateSubtopic = (subjectId, topicId, subtopicId, updates) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId ? {
          ...s,
          topics: s.topics.map(t =>
            t.id === topicId ? {
              ...t,
              subtopics: (t.subtopics || []).map(st => st.id === subtopicId ? { ...st, ...updates } : st)
            } : t
          )
        } : s
      )
    }));
  };

  const logSubtopicSession = (subjectId, topicId, subtopicId, minutes, newKnowledge) => {
    const now = new Date().toISOString();
    const today = new Date().toDateString();
    setState(prev => {
      const subject = prev.subjects.find(s => s.id === subjectId);
      const topic = subject.topics.find(t => t.id === topicId);
      const subtopic = (topic.subtopics || []).find(st => st.id === subtopicId);
      const minutesXP = Math.floor(minutes / 15) * 10;
      const knowledgeXP = Math.max(0, (newKnowledge - subtopic.knowledge)) * 25;
      const earnedXP = minutesXP + knowledgeXP + 5;
      const lastDay = prev.streak.lastDay;
      let newStreak = prev.streak;
      if (lastDay !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        newStreak = { count: lastDay === yesterday.toDateString() ? prev.streak.count + 1 : 1, lastDay: today };
      }
      const nextDue = subtopic.lastStudied ? getNextReviewDate(subtopic.lastStudied, subtopic.reviewCount || 0) : null;
      const advancedReview = !subtopic.lastStudied || !nextDue || new Date() >= new Date(nextDue);
      return {
        ...prev,
        xp: prev.xp + earnedXP,
        streak: newStreak,
        sessions: [...prev.sessions, { id: `s_${Date.now()}`, subjectId, topicId, subtopicId, date: now, minutes, xpEarned: earnedXP, advancedReview }],
        subjects: prev.subjects.map(s =>
          s.id === subjectId ? {
            ...s,
            topics: s.topics.map(t =>
              t.id === topicId ? {
                ...t,
                subtopics: (t.subtopics || []).map(st =>
                  st.id === subtopicId ? {
                    ...st,
                    ...(advancedReview ? { lastStudied: now, reviewCount: (st.reviewCount || 0) + 1 } : {}),
                    knowledge: newKnowledge,
                    totalMinutes: (st.totalMinutes || 0) + minutes,
                  } : st
                )
              } : t
            )
          } : s
        )
      };
    });
  };

  const logStudySession = (subjectId, topicId, minutes, newKnowledge) => {
    const now = new Date().toISOString();
    const today = new Date().toDateString();

    setState(prev => {
      const subject = prev.subjects.find(s => s.id === subjectId);
      const topic = subject.topics.find(t => t.id === topicId);

      const minutesXP = Math.floor(minutes / 15) * 10;
      const knowledgeXP = Math.max(0, (newKnowledge - topic.knowledge)) * 25;
      const earnedXP = minutesXP + knowledgeXP + 5;

      const lastDay = prev.streak.lastDay;
      let newStreak = prev.streak;
      if (lastDay !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        newStreak = { count: lastDay === yesterday.toDateString() ? prev.streak.count + 1 : 1, lastDay: today };
      }

      const nextDue = topic.lastStudied ? getNextReviewDate(topic.lastStudied, topic.reviewCount || 0) : null;
      const advancedReview = !topic.lastStudied || !nextDue || new Date() >= new Date(nextDue);

      return {
        ...prev,
        xp: prev.xp + earnedXP,
        streak: newStreak,
        sessions: [...prev.sessions, {
          id: `s_${Date.now()}`,
          subjectId,
          topicId,
          date: now,
          minutes,
          xpEarned: earnedXP,
          advancedReview,
        }],
        subjects: prev.subjects.map(s =>
          s.id === subjectId ? {
            ...s,
            topics: s.topics.map(t =>
              t.id === topicId ? {
                ...t,
                ...(advancedReview ? { lastStudied: now, reviewCount: (t.reviewCount || 0) + 1 } : {}),
                knowledge: newKnowledge,
                totalMinutes: (t.totalMinutes || 0) + minutes,
              } : t
            )
          } : s
        )
      };
    });
  };

  const unlogSession = (sessionId) => {
    setState(prev => {
      const session = prev.sessions.find(s => s.id === sessionId);
      if (!session) return prev;
      const remaining = prev.sessions.filter(s => s.id !== sessionId);
      const newXp = Math.max(0, prev.xp - session.xpEarned);
      const subjects = prev.subjects.map(sub => {
        if (sub.id !== session.subjectId) return sub;
        return {
          ...sub,
          topics: sub.topics.map(t => {
            if (t.id !== session.topicId) return t;
            if (session.subtopicId) {
              return {
                ...t,
                subtopics: (t.subtopics || []).map(st => {
                  if (st.id !== session.subtopicId) return st;
                  const advanced = session.advancedReview !== false;
                  const stSessions = remaining.filter(r => r.subtopicId === st.id && r.advancedReview !== false).sort((a, b) => new Date(b.date) - new Date(a.date));
                  return {
                    ...st,
                    totalMinutes: Math.max(0, (st.totalMinutes || 0) - session.minutes),
                    ...(advanced ? { reviewCount: Math.max(0, (st.reviewCount || 0) - 1), lastStudied: stSessions[0]?.date ?? null } : {}),
                  };
                }),
              };
            }
            const advanced = session.advancedReview !== false;
            const tSessions = remaining.filter(r => r.topicId === t.id && !r.subtopicId && r.advancedReview !== false).sort((a, b) => new Date(b.date) - new Date(a.date));
            return {
              ...t,
              totalMinutes: Math.max(0, (t.totalMinutes || 0) - session.minutes),
              ...(advanced ? { reviewCount: Math.max(0, (t.reviewCount || 0) - 1), lastStudied: tSessions[0]?.date ?? null } : {}),
            };
          }),
        };
      });
      return { ...prev, xp: newXp, sessions: remaining, subjects };
    });
  };

  // Full review queue: every studied topic/subtopic, sorted by urgency then soonest first
  const reviewQueue = useMemo(() => {
    const items = [];
    state.subjects.forEach(s => {
      s.topics.forEach(t => {
        const review = getReviewStatus(t);
        if (review.status !== 'new') {
          items.push({ subject: s, topic: t, subtopic: null, review });
        }
        (t.subtopics || []).forEach(st => {
          const stReview = getReviewStatus(st);
          if (stReview.status !== 'new') {
            items.push({ subject: s, topic: t, subtopic: st, review: stReview });
          }
        });
      });
    });
    return items.sort((a, b) => {
      const pa = STATUS_PRIORITY[a.review.status] || 0;
      const pb = STATUS_PRIORITY[b.review.status] || 0;
      if (pa !== pb) return pb - pa;
      if (a.review.status === 'overdue') return (b.review.days || 0) - (a.review.days || 0);
      return (a.review.days || 0) - (b.review.days || 0);
    });
  }, [state.subjects]);

  // Badge count: only overdue + today
  const urgentCount = useMemo(() =>
    reviewQueue.filter(i => i.review.status === 'overdue' || i.review.status === 'today').length,
    [reviewQueue]
  );

  const level = Math.floor(state.xp / 100) + 1;
  const xpInLevel = state.xp % 100;

  useEffect(() => {
    if (loading) return;
    if (prevLevelRef.current !== null && level > prevLevelRef.current) {
      setLevelUpAnim(level);
      const t = setTimeout(() => setLevelUpAnim(null), 3500);
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level, loading]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a1612', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#c9a961' }}>𓂀</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--papyrus)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', color: 'var(--ink)' }}>𓂀 Loading scroll...</div>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="grain" />
        <header className="header">
          <div className="header-left">
            <div className="logo">𓉴</div>
            <div>
              <h1 className="title">The Scribe's Codex</h1>
              <p className="subtitle">Junior Cycle Study Tracker</p>
            </div>
          </div>
          <div className="stats">
            <StatBadge label="Level" value={level} glyph="𓇳" />
            <StatBadge label="XP" value={`${xpInLevel}/100`} glyph="𓋹" />
            <StatBadge label="Streak" value={`${state.streak.count}d`} glyph="𓍱" />
            <StatBadge label="Due" value={urgentCount} glyph="𓂀" urgent={urgentCount > 0} />
            <button
              onClick={() => supabase.auth.signOut()}
              title={user?.email}
              style={{
                background: 'none',
                border: '1px solid rgba(201,169,97,0.25)',
                borderRadius: 6,
                color: 'rgba(201,169,97,0.6)',
                fontFamily: 'var(--sans)',
                fontSize: '0.7rem',
                padding: '0.25rem 0.55rem',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.borderColor = 'rgba(201,169,97,0.6)'; e.target.style.color = '#c9a961'; }}
              onMouseLeave={e => { e.target.style.borderColor = 'rgba(201,169,97,0.25)'; e.target.style.color = 'rgba(201,169,97,0.6)'; }}
            >
              Sign out
            </button>
          </div>
        </header>

        <nav className="nav">
          <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            Dashboard
          </button>
          <button className={`nav-btn ${view === 'review' ? 'active' : ''}`} onClick={() => setView('review')}>
            Review Queue {urgentCount > 0 && <span className="badge">{urgentCount}</span>}
          </button>
          <button className={`nav-btn ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')}>
            Stats
          </button>
        </nav>

        <main className="main">
          {view === 'dashboard' && !activeSubject && (
            <SubjectGrid
              subjects={state.subjects}
              onSelect={(s) => { setActiveSubject(s.id); }}
            />
          )}

          {view === 'dashboard' && activeSubject && (
            <SubjectView
              subject={state.subjects.find(s => s.id === activeSubject)}
              sessions={state.sessions}
              onBack={() => setActiveSubject(null)}
              onAddTopic={() => setShowAddTopic(true)}
              onSelectTopic={(t) => setActiveTopic({ subjectId: activeSubject, topicId: t.id })}
              onLogStudy={(t) => {
                setActiveTopic({ subjectId: activeSubject, topicId: t.id });
                setActiveSubtopic(null);
                setShowLogModal(true);
              }}
              onDeleteTopic={(tid) => deleteTopic(activeSubject, tid)}
              onUpdateTopic={(tid, updates) => updateTopic(activeSubject, tid, updates)}
              onAddSubtopic={(tid, name) => addSubtopic(activeSubject, tid, name)}
              onDeleteSubtopic={(tid, stid) => deleteSubtopic(activeSubject, tid, stid)}
              onUpdateSubtopic={(tid, stid, updates) => updateSubtopic(activeSubject, tid, stid, updates)}
              onLogSubtopic={(t, st) => {
                setActiveTopic({ subjectId: activeSubject, topicId: t.id });
                setActiveSubtopic(st.id);
                setShowLogModal(true);
              }}
              onUnlogSession={(id) => setConfirmUnlog(id)}
            />
          )}

          {view === 'review' && (
            <ReviewView
              dueTopics={reviewQueue}
              onStudy={(subjectId, topicId, subtopicId) => {
                setActiveTopic({ subjectId, topicId });
                setActiveSubtopic(subtopicId || null);
                setShowLogModal(true);
              }}
            />
          )}

          {view === 'stats' && (
            <StatsView state={state} onImport={(data) => setState(data)} />
          )}
        </main>

        {showAddTopic && activeSubject && (
          <AddTopicModal
            subject={state.subjects.find(s => s.id === activeSubject)}
            onAdd={(name) => { addTopic(activeSubject, name); setShowAddTopic(false); }}
            onClose={() => setShowAddTopic(false)}
          />
        )}

        {showLogModal && activeTopic && (() => {
          const subj = state.subjects.find(s => s.id === activeTopic.subjectId);
          const topic = subj.topics.find(t => t.id === activeTopic.topicId);
          const subtopic = activeSubtopic ? (topic.subtopics || []).find(st => st.id === activeSubtopic) : null;
          return (
            <LogStudyModal
              topic={subtopic || topic}
              subject={subj}
              onLog={(minutes, knowledge) => {
                if (subtopic) {
                  logSubtopicSession(activeTopic.subjectId, activeTopic.topicId, activeSubtopic, minutes, knowledge);
                } else {
                  logStudySession(activeTopic.subjectId, activeTopic.topicId, minutes, knowledge);
                }
                setShowLogModal(false);
                setActiveSubtopic(null);
              }}
              onClose={() => { setShowLogModal(false); setActiveSubtopic(null); }}
            />
          );
        })()}

        {confirmUnlog && (
          <ConfirmModal
            message="Are you sure you want to unlog this session? Your XP and stats will be updated."
            onConfirm={() => { unlogSession(confirmUnlog); setConfirmUnlog(null); }}
            onCancel={() => setConfirmUnlog(null)}
          />
        )}

        {levelUpAnim && <LevelUpBanner level={levelUpAnim} />}
      </div>
    </>
  );
}

// ============ COMPONENTS ============
function StatBadge({ label, value, glyph, urgent }) {
  return (
    <div className={`stat-badge ${urgent ? 'urgent' : ''}`}>
      <div className="stat-glyph">{glyph}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function SubjectGrid({ subjects, onSelect }) {
  return (
    <div className="subject-grid">
      {subjects.map((s, i) => {
        const total = s.topics.length;
        const percent = total > 0 ? Math.round((s.topics.reduce((a, t) => a + getEffectiveKnowledge(t), 0) / (total * 5)) * 100) : 0;
        const due = s.topics.filter(t => {
          const r = getEffectiveReviewStatus(t);
          return r.status === 'overdue' || r.status === 'today';
        }).length;

        return (
          <button
            key={s.id}
            className="subject-card"
            style={{ '--subject-color': s.color, animationDelay: `${i * 60}ms` }}
            onClick={() => onSelect(s)}
          >
            <div className="subject-glyph">{s.glyph}</div>
            <h2 className="subject-name">{s.name}</h2>
            <div className="subject-meta">
              <span>{total} topics</span>
              {due > 0 && <span className="due-dot">{due} due</span>}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <div className="subject-percent">{percent}% mastered</div>
          </button>
        );
      })}
    </div>
  );
}

function SubjectView({ subject, sessions, onBack, onAddTopic, onSelectTopic, onLogStudy, onDeleteTopic, onUpdateTopic, onAddSubtopic, onDeleteSubtopic, onUpdateSubtopic, onLogSubtopic, onUnlogSession }) {
  const [expandedTopic, setExpandedTopic] = useState(null);

  return (
    <div className="subject-view" style={{ '--subject-color': subject.color }}>
      <button className="back-btn" onClick={onBack}>← All subjects</button>
      <div className="subject-header">
        <div className="subject-glyph-lg">{subject.glyph}</div>
        <div>
          <h2 className="subject-title">{subject.name}</h2>
          <p className="subject-sub">{subject.topics.length} chapters tracked</p>
        </div>
        <button className="add-btn" onClick={onAddTopic}>+ Add chapter</button>
      </div>

      {subject.topics.length === 0 ? (
        <div className="empty">
          <div className="empty-glyph">𓃀</div>
          <p>No chapters yet. Add your first one to begin.</p>
        </div>
      ) : (
        <div className="topic-list">
          {subject.topics.map(topic => {
            const review = getEffectiveReviewStatus(topic);
            const isExpanded = expandedTopic === topic.id;
            return (
              <div key={topic.id} className={`topic-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="topic-header" onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}>
                  <div className="topic-main">
                    <h3 className="topic-name">{topic.name}</h3>
                    <div className="topic-meta">
                      <KnowledgeBar level={getEffectiveKnowledge(topic)} />
                      <span className={`review-tag status-${review.status}`}>
                        {review.label}
                      </span>
                      {getEffectiveMinutes(topic) > 0 && <span className="mins-tag">{getEffectiveMinutes(topic)}min total</span>}
                    </div>
                  </div>
                  <button
                    className="log-btn"
                    onClick={(e) => { e.stopPropagation(); onLogStudy(topic); }}
                  >
                    Log study
                  </button>
                </div>

                {isExpanded && (
                  <div className="topic-details">
                    <div className="detail-row">
                      <label>Knowledge Level</label>
                      {(topic.subtopics || []).length > 0 ? (
                        <div className="derived-knowledge">
                          <KnowledgeBar level={getEffectiveKnowledge(topic)} />
                          <span className="k-label">
                            {['Clueless', 'Shaky', 'Getting there', 'Confident', 'Mastered'][getEffectiveKnowledge(topic) - 1]}
                            {' '}— averaged from {topic.subtopics.length} subtopic{topic.subtopics.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="knowledge-picker">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                className={`k-btn ${topic.knowledge === n ? 'active' : ''}`}
                                onClick={() => onUpdateTopic(topic.id, { knowledge: n })}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="k-label">
                            {['Clueless', 'Shaky', 'Getting there', 'Confident', 'Mastered'][topic.knowledge - 1]}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="detail-row">
                      <label>Notes</label>
                      <textarea
                        value={topic.notes}
                        onChange={(e) => onUpdateTopic(topic.id, { notes: e.target.value })}
                        placeholder="Key concepts, formulas, things to remember..."
                        rows={4}
                      />
                    </div>

                    <div className="detail-row">
                      <label>Past exam papers</label>
                      <ExamPdfs
                        pdfs={topic.examPdfs || []}
                        onChange={pdfs => onUpdateTopic(topic.id, { examPdfs: pdfs })}
                      />
                    </div>

                    <div className="detail-row">
                      <label>Quizlet link</label>
                      <input
                        type="url"
                        value={topic.quizletUrl}
                        onChange={(e) => onUpdateTopic(topic.id, { quizletUrl: e.target.value })}
                        placeholder="https://quizlet.com/..."
                      />
                      {topic.quizletUrl && (
                        <a href={topic.quizletUrl} target="_blank" rel="noreferrer" className="open-link">Open Quizlet →</a>
                      )}
                    </div>

                    <div className="detail-row review-info">
                      <div>
                        <strong>Last studied:</strong> {formatDate(topic.lastStudied)}
                      </div>
                      <div>
                        <strong>Reviews done:</strong> {topic.reviewCount || 0}
                      </div>
                      <div>
                        <strong>Next interval:</strong> {getReviewInterval(topic.reviewCount || 0)} days
                      </div>
                    </div>

                    <SubtopicSection
                      topic={topic}
                      sessions={sessions}
                      onAddSubtopic={(name) => onAddSubtopic(topic.id, name)}
                      onDeleteSubtopic={(stid) => onDeleteSubtopic(topic.id, stid)}
                      onUpdateSubtopic={(stid, updates) => onUpdateSubtopic(topic.id, stid, updates)}
                      onLogSubtopic={(st) => onLogSubtopic(topic, st)}
                      onUnlogSession={onUnlogSession}
                    />

                    {(() => {
                      const topicSessions = sessions
                        .filter(s => s.topicId === topic.id && !s.subtopicId)
                        .sort((a, b) => new Date(b.date) - new Date(a.date));
                      if (topicSessions.length === 0) return null;
                      return (
                        <div className="detail-row">
                          <label>Session history</label>
                          <div className="session-list">
                            {topicSessions.map(sess => (
                              <div key={sess.id} className="session-item">
                                <span className="session-date">{formatDate(sess.date)}</span>
                                <span className="session-mins">{sess.minutes} min</span>
                                <span className="session-xp">+{sess.xpEarned} XP</span>
                                <button className="unlog-btn" onClick={() => onUnlogSession(sess.id)}>Unlog</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      className="delete-btn"
                      onClick={() => { if (confirm(`Delete "${topic.name}"?`)) onDeleteTopic(topic.id); }}
                    >
                      Delete chapter
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KnowledgeBar({ level }) {
  return (
    <div className="kbar">
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className={`kbar-seg ${n <= level ? 'filled' : ''}`} />
      ))}
    </div>
  );
}

function SubtopicSection({ topic, sessions, onAddSubtopic, onDeleteSubtopic, onUpdateSubtopic, onLogSubtopic, onUnlogSession }) {
  const [expandedSt, setExpandedSt] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const subtopics = topic.subtopics || [];

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddSubtopic(newName.trim());
    setNewName('');
    setShowAdd(false);
  };

  return (
    <div className="subtopic-section">
      <div className="subtopic-section-header">
        <span className="subtopic-section-label">Subtopics</span>
        <button className="add-subtopic-btn" onClick={() => setShowAdd(v => !v)}>+ Add subtopic</button>
      </div>

      {showAdd && (
        <div className="subtopic-add-row">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g., Factorising, Quadratics..."
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setShowAdd(false); setNewName(''); }
            }}
          />
          <button className="btn-primary" disabled={!newName.trim()} onClick={handleAdd}>Add</button>
        </div>
      )}

      {subtopics.length === 0 && !showAdd && (
        <p className="subtopic-empty">No subtopics yet.</p>
      )}

      {subtopics.map(st => {
        const review = getReviewStatus(st);
        const isExp = expandedSt === st.id;
        return (
          <div key={st.id} className={`subtopic-card ${isExp ? 'expanded' : ''}`}>
            <div className="subtopic-row" onClick={() => setExpandedSt(isExp ? null : st.id)}>
              <div className="subtopic-info">
                <span className="subtopic-name">↳ {st.name}</span>
                <div className="topic-meta">
                  <KnowledgeBar level={st.knowledge} />
                  <span className={`review-tag status-${review.status}`}>{review.label}</span>
                  {st.totalMinutes > 0 && <span className="mins-tag">{st.totalMinutes}min</span>}
                </div>
              </div>
              <button className="log-btn small" onClick={e => { e.stopPropagation(); onLogSubtopic(st); }}>Log</button>
            </div>

            {isExp && (
              <div className="subtopic-details">
                <div className="detail-row">
                  <label>Knowledge Level</label>
                  <div className="knowledge-picker">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        className={`k-btn ${st.knowledge === n ? 'active' : ''}`}
                        onClick={() => onUpdateSubtopic(st.id, { knowledge: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="k-label">
                    {['Clueless', 'Shaky', 'Getting there', 'Confident', 'Mastered'][st.knowledge - 1]}
                  </div>
                </div>

                <div className="detail-row">
                  <label>Notes</label>
                  <textarea
                    value={st.notes || ''}
                    onChange={e => onUpdateSubtopic(st.id, { notes: e.target.value })}
                    placeholder="Key concepts, formulas, things to remember..."
                    rows={3}
                  />
                </div>

                <div className="detail-row">
                  <label>Past exam papers</label>
                  <ExamPdfs
                    pdfs={st.examPdfs || []}
                    onChange={pdfs => onUpdateSubtopic(st.id, { examPdfs: pdfs })}
                  />
                </div>

                <div className="detail-row">
                  <label>Quizlet link</label>
                  <input
                    type="url"
                    value={st.quizletUrl || ''}
                    onChange={e => onUpdateSubtopic(st.id, { quizletUrl: e.target.value })}
                    placeholder="https://quizlet.com/..."
                  />
                  {st.quizletUrl && (
                    <a href={st.quizletUrl} target="_blank" rel="noreferrer" className="open-link">Open Quizlet →</a>
                  )}
                </div>

                <div className="detail-row review-info">
                  <div><strong>Last studied:</strong> {formatDate(st.lastStudied)}</div>
                  <div><strong>Reviews done:</strong> {st.reviewCount || 0}</div>
                  <div><strong>Next interval:</strong> {getReviewInterval(st.reviewCount || 0)} days</div>
                </div>
                {(() => {
                  const stSessions = (sessions || [])
                    .filter(s => s.subtopicId === st.id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                  if (stSessions.length === 0) return null;
                  return (
                    <div className="detail-row">
                      <label>Session history</label>
                      <div className="session-list">
                        {stSessions.map(sess => (
                          <div key={sess.id} className="session-item">
                            <span className="session-date">{formatDate(sess.date)}</span>
                            <span className="session-mins">{sess.minutes} min</span>
                            <span className="session-xp">+{sess.xpEarned} XP</span>
                            <button className="unlog-btn" onClick={() => onUnlogSession(sess.id)}>Unlog</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <button className="delete-btn" onClick={() => { if (confirm(`Delete "${st.name}"?`)) onDeleteSubtopic(st.id); }}>
                  Delete subtopic
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReviewView({ dueTopics, onStudy }) {
  if (dueTopics.length === 0) {
    return (
      <div className="empty">
        <div className="empty-glyph">𓋹</div>
        <h2>Nothing to review yet</h2>
        <p>Study a chapter or subtopic and it will appear here.</p>
      </div>
    );
  }

  const urgent = dueTopics.filter(i => i.review.status === 'overdue' || i.review.status === 'today');
  const upcoming = dueTopics.filter(i => i.review.status === 'soon' || i.review.status === 'scheduled');

  const renderCard = ({ subject, topic, subtopic, review }) => (
    <div key={subtopic ? subtopic.id : topic.id} className="review-card" style={{ '--subject-color': subject.color }}>
      <div className="review-card-left">
        <span className="review-glyph">{subject.glyph}</span>
        <div>
          <div className="review-subject">{subject.name}</div>
          <div className="review-topic">
            {subtopic ? <>{topic.name} <span className="review-subtopic-arrow">›</span> {subtopic.name}</> : topic.name}
          </div>
        </div>
      </div>
      <div className="review-card-right">
        <span className={`review-tag status-${review.status}`}>{review.label}</span>
        <button className="log-btn" onClick={() => onStudy(subject.id, topic.id, subtopic?.id)}>Study</button>
      </div>
    </div>
  );

  return (
    <div className="review-view">
      <h2 className="section-title">Review queue</h2>
      <p className="section-sub">Your full study schedule based on the forgetting curve</p>

      {urgent.length > 0 && (
        <>
          <div className="review-section-label urgent-label">Due now ({urgent.length})</div>
          <div className="review-list">{urgent.map(renderCard)}</div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="review-section-label">{urgent.length > 0 ? 'Upcoming' : `Upcoming (${upcoming.length})`}</div>
          <div className="review-list">{upcoming.map(renderCard)}</div>
        </>
      )}
    </div>
  );
}

function StatsView({ state, onImport }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scribe-codex-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.subjects || !parsed.sessions) {
          alert('Invalid backup file — missing subjects or sessions.');
          return;
        }
        onImport(parsed);
      } catch {
        alert('Could not read file. Make sure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalMinutes = state.sessions.reduce((a, s) => a + s.minutes, 0);
  const totalSessions = state.sessions.length;
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const mins = state.sessions
        .filter(s => new Date(s.date).toDateString() === dayStr)
        .reduce((a, s) => a + s.minutes, 0);
      days.push({ label: d.toLocaleDateString('en-IE', { weekday: 'short' }), mins });
    }
    return days;
  }, [state.sessions]);
  const maxMins = Math.max(...last7Days.map(d => d.mins), 30);

  const subjectMinutes = state.subjects.map(s => ({
    name: s.name,
    color: s.color,
    glyph: s.glyph,
    minutes: state.sessions.filter(sess => sess.subjectId === s.id).reduce((a, s) => a + s.minutes, 0),
    topics: s.topics.length,
  })).sort((a, b) => b.minutes - a.minutes);

  return (
    <div className="stats-view">
      <div className="stats-header">
        <h2 className="section-title">Your study chronicle</h2>
        <div className="data-btns">
          <label className="export-btn import-btn">
            ↑ Import backup
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
          </label>
          <button className="export-btn" onClick={exportData}>↓ Export backup</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-big">{totalMinutes}</div>
          <div className="stat-desc">Total minutes</div>
        </div>
        <div className="stat-card">
          <div className="stat-big">{totalSessions}</div>
          <div className="stat-desc">Sessions logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-big">{state.xp}</div>
          <div className="stat-desc">Total XP earned</div>
        </div>
        <div className="stat-card">
          <div className="stat-big">{state.streak.count}</div>
          <div className="stat-desc">Day streak</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>Last 7 days</h3>
        <div className="bar-chart">
          {last7Days.map((d, i) => (
            <div key={i} className="bar-col">
              <div className="bar-wrap">
                <div className="bar" style={{ height: `${(d.mins / maxMins) * 100}%` }}>
                  {d.mins > 0 && <span className="bar-val">{d.mins}</span>}
                </div>
              </div>
              <div className="bar-label">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <h3>Time per subject</h3>
        <div className="subject-bars">
          {subjectMinutes.map(s => {
            const max = Math.max(...subjectMinutes.map(x => x.minutes), 1);
            return (
              <div key={s.name} className="sbar-row">
                <div className="sbar-label">{s.glyph} {s.name}</div>
                <div className="sbar-track">
                  <div className="sbar-fill" style={{ width: `${(s.minutes / max) * 100}%`, background: s.color }} />
                </div>
                <div className="sbar-val">{s.minutes}m</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-glyph" style={{ color: 'var(--terracotta)' }}>𓂀</div>
        <h2>Are you sure?</h2>
        <p className="confirm-message">{message}</p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Yes, unlog it</button>
        </div>
      </div>
    </div>
  );
}

function LevelUpBanner({ level }) {
  return (
    <div className="level-up-overlay">
      <div className="level-up-card">
        <div className="level-up-rays" />
        <div className="level-up-glyph">𓇳</div>
        <div className="level-up-label">Level Up!</div>
        <div className="level-up-num">Level {level}</div>
        <div className="level-up-sub">The scrolls acknowledge your dedication</div>
      </div>
    </div>
  );
}

function AddTopicModal({ subject, onAdd, onClose }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ '--subject-color': subject.color }}>
        <div className="modal-glyph">{subject.glyph}</div>
        <h2>Add chapter to {subject.name}</h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Algebra, The Renaissance, Rivers..."
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onAdd(name.trim()); }}
        />
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!name.trim()} onClick={() => onAdd(name.trim())}>Add</button>
        </div>
      </div>
    </div>
  );
}

function LogStudyModal({ topic, subject, onLog, onClose }) {
  const [minutes, setMinutes] = useState(30);
  const [knowledge, setKnowledge] = useState(topic.knowledge);

  const xpPreview = Math.floor(minutes / 15) * 10 + Math.max(0, knowledge - topic.knowledge) * 25 + 5;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal log-modal" onClick={e => e.stopPropagation()} style={{ '--subject-color': subject.color }}>
        <div className="modal-glyph">{subject.glyph}</div>
        <h2>Log study session</h2>
        <p className="modal-topic">{topic.name}</p>

        <label className="form-label">How long did you study?</label>
        <div className="time-picker">
          {[15, 30, 45, 60, 90].map(m => (
            <button
              key={m}
              className={`time-btn ${minutes === m ? 'active' : ''}`}
              onClick={() => setMinutes(m)}
            >
              {m}m
            </button>
          ))}
        </div>
        <input
          type="number"
          value={minutes}
          onChange={e => setMinutes(parseInt(e.target.value) || 0)}
          min="1"
          max="240"
          className="time-input"
        />

        <label className="form-label">How well do you know it now?</label>
        <div className="knowledge-picker">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              className={`k-btn ${knowledge === n ? 'active' : ''}`}
              onClick={() => setKnowledge(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="k-label">
          {['Clueless', 'Shaky', 'Getting there', 'Confident', 'Mastered'][knowledge - 1]}
        </div>

        <div className="xp-preview">
          <span className="xp-glyph">𓋹</span>
          You'll earn <strong>+{xpPreview} XP</strong>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onLog(minutes, knowledge)}>Log it</button>
        </div>
      </div>
    </div>
  );
}

// ============ STYLES ============
const styles = `
  :root {
    --papyrus: #f4ead5;
    --papyrus-dark: #e8d9b3;
    --ink: #2b1d0e;
    --ink-soft: #5c4a35;
    --gold: #c9a961;
    --gold-dark: #9a7d3f;
    --terracotta: #b85c38;
    --lapis: #2a4a6b;
    --display: 'Cormorant Garamond', 'Georgia', serif;
    --body: 'Crimson Pro', 'Georgia', serif;
    --sans: 'Inter', system-ui, sans-serif;
  }

  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Crimson+Pro:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: var(--papyrus); }

  .app {
    min-height: 100vh;
    background:
      radial-gradient(ellipse at top, rgba(201, 169, 97, 0.15), transparent 70%),
      radial-gradient(ellipse at bottom right, rgba(184, 92, 56, 0.1), transparent 60%),
      var(--papyrus);
    color: var(--ink);
    font-family: var(--body);
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    position: relative;
  }

  .grain {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.4;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.2 0 0 0 0 0.15 0 0 0 0 0.08 0 0 0 0.25 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    z-index: 1;
    mix-blend-mode: multiply;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px double var(--gold-dark);
    position: relative;
    z-index: 2;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .header-left { display: flex; align-items: center; gap: 1rem; }

  .logo {
    font-size: 3rem;
    color: var(--gold-dark);
    line-height: 1;
  }

  .title {
    font-family: var(--display);
    font-size: 2.25rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--ink);
    line-height: 1;
  }

  .subtitle {
    font-family: var(--sans);
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-top: 0.25rem;
  }

  .stats { display: flex; gap: 0.75rem; flex-wrap: wrap; }

  .stat-badge {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid var(--gold-dark);
    border-radius: 3px;
    min-width: 85px;
  }

  .stat-badge.urgent {
    background: rgba(184, 92, 56, 0.15);
    border-color: var(--terracotta);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(184, 92, 56, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(184, 92, 56, 0); }
  }

  .stat-glyph { font-size: 1.5rem; color: var(--gold-dark); }

  .stat-value {
    font-family: var(--display);
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1;
  }

  .stat-label {
    font-family: var(--sans);
    font-size: 0.65rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-top: 0.2rem;
  }

  .nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    position: relative;
    z-index: 2;
    flex-wrap: wrap;
  }

  .nav-btn {
    background: transparent;
    border: 1px solid var(--gold-dark);
    color: var(--ink-soft);
    padding: 0.6rem 1.25rem;
    font-family: var(--sans);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .nav-btn:hover { background: rgba(201, 169, 97, 0.15); }

  .nav-btn.active {
    background: var(--ink);
    color: var(--papyrus);
    border-color: var(--ink);
  }

  .badge {
    background: var(--terracotta);
    color: white;
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }

  .main { position: relative; z-index: 2; }

  .subject-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.25rem;
  }

  .subject-card {
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid var(--gold-dark);
    border-top: 4px solid var(--subject-color);
    padding: 1.5rem;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    transition: all 0.3s;
    position: relative;
    opacity: 0;
    animation: fadeUp 0.6s ease forwards;
    border-radius: 2px;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .subject-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(43, 29, 14, 0.15);
    background: rgba(255, 255, 255, 0.5);
  }

  .subject-glyph {
    font-size: 2.5rem;
    color: var(--subject-color);
    line-height: 1;
    margin-bottom: 0.75rem;
  }

  .subject-name {
    font-family: var(--display);
    font-size: 1.6rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .subject-meta {
    display: flex;
    gap: 1rem;
    font-family: var(--sans);
    font-size: 0.75rem;
    color: var(--ink-soft);
    margin-bottom: 1rem;
  }

  .due-dot {
    color: var(--terracotta);
    font-weight: 600;
  }

  .progress-bar {
    height: 6px;
    background: rgba(43, 29, 14, 0.1);
    overflow: hidden;
    border-radius: 3px;
  }

  .progress-fill {
    height: 100%;
    background: var(--subject-color);
    transition: width 0.5s ease;
  }

  .subject-percent {
    font-family: var(--sans);
    font-size: 0.75rem;
    color: var(--ink-soft);
    margin-top: 0.5rem;
    letter-spacing: 0.05em;
  }

  .subject-view { animation: fadeUp 0.4s ease; }

  .back-btn {
    background: none;
    border: none;
    color: var(--ink-soft);
    font-family: var(--sans);
    font-size: 0.85rem;
    cursor: pointer;
    margin-bottom: 1rem;
    padding: 0.25rem 0;
  }

  .back-btn:hover { color: var(--ink); }

  .subject-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--gold-dark);
    flex-wrap: wrap;
  }

  .subject-glyph-lg {
    font-size: 4rem;
    color: var(--subject-color);
    line-height: 1;
  }

  .subject-title {
    font-family: var(--display);
    font-size: 2.5rem;
    font-weight: 600;
  }

  .subject-sub {
    font-family: var(--sans);
    font-size: 0.85rem;
    color: var(--ink-soft);
    letter-spacing: 0.05em;
  }

  .add-btn {
    margin-left: auto;
    background: var(--ink);
    color: var(--papyrus);
    border: none;
    padding: 0.75rem 1.25rem;
    font-family: var(--sans);
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s;
  }

  .add-btn:hover { background: var(--subject-color); }

  .empty {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--ink-soft);
  }

  .empty-glyph {
    font-size: 4rem;
    color: var(--gold-dark);
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .empty h2 {
    font-family: var(--display);
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
    color: var(--ink);
  }

  .topic-list { display: flex; flex-direction: column; gap: 0.75rem; }

  .topic-card {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid var(--gold-dark);
    border-left: 4px solid var(--subject-color);
    border-radius: 2px;
    transition: all 0.2s;
  }

  .topic-card:hover { background: rgba(255, 255, 255, 0.6); }

  .topic-card.expanded { background: rgba(255, 255, 255, 0.7); }

  .topic-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    cursor: pointer;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .topic-main { flex: 1; min-width: 0; }

  .topic-name {
    font-family: var(--display);
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .topic-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .kbar {
    display: inline-flex;
    gap: 2px;
  }

  .kbar-seg {
    width: 14px;
    height: 6px;
    background: rgba(43, 29, 14, 0.15);
    border-radius: 1px;
  }

  .kbar-seg.filled { background: var(--subject-color, var(--gold-dark)); }

  .review-tag {
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.25rem 0.5rem;
    border-radius: 2px;
  }

  .status-new { background: rgba(43, 29, 14, 0.1); color: var(--ink-soft); }
  .status-scheduled { background: rgba(74, 124, 89, 0.15); color: #2d5139; }
  .status-soon { background: rgba(201, 169, 97, 0.25); color: var(--gold-dark); }
  .status-today { background: rgba(184, 92, 56, 0.2); color: var(--terracotta); font-weight: 600; }
  .status-overdue { background: var(--terracotta); color: white; font-weight: 600; }

  .mins-tag {
    font-family: var(--sans);
    font-size: 0.7rem;
    color: var(--ink-soft);
    letter-spacing: 0.05em;
  }

  .log-btn {
    background: var(--subject-color, var(--ink));
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    font-family: var(--sans);
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .log-btn:hover { transform: scale(1.05); filter: brightness(1.1); }

  .topic-details {
    padding: 0 1.25rem 1.25rem;
    border-top: 1px dashed var(--gold-dark);
    padding-top: 1rem;
    animation: fadeUp 0.3s ease;
  }

  .detail-row { margin-bottom: 1.25rem; }

  .detail-row label {
    display: block;
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 0.5rem;
  }

  .knowledge-picker {
    display: flex;
    gap: 0.4rem;
  }

  .k-btn {
    width: 40px;
    height: 40px;
    border: 1px solid var(--gold-dark);
    background: transparent;
    font-family: var(--display);
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: 2px;
    color: var(--ink-soft);
    transition: all 0.15s;
  }

  .k-btn:hover { background: rgba(201, 169, 97, 0.15); }

  .k-btn.active {
    background: var(--subject-color, var(--ink));
    color: white;
    border-color: transparent;
  }

  .k-label {
    font-family: var(--sans);
    font-size: 0.8rem;
    color: var(--ink-soft);
    margin-top: 0.5rem;
    font-style: italic;
  }

  .detail-row textarea,
  .detail-row input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--gold-dark);
    background: rgba(255, 255, 255, 0.6);
    font-family: var(--body);
    font-size: 1rem;
    color: var(--ink);
    border-radius: 2px;
    resize: vertical;
  }

  .detail-row textarea:focus,
  .detail-row input:focus {
    outline: none;
    border-color: var(--subject-color);
    background: white;
  }

  .open-link {
    display: inline-block;
    margin-top: 0.5rem;
    font-family: var(--sans);
    font-size: 0.8rem;
    color: var(--subject-color);
    text-decoration: none;
    letter-spacing: 0.05em;
  }

  .open-link:hover { text-decoration: underline; }

  .review-info {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    font-family: var(--sans);
    font-size: 0.8rem;
    color: var(--ink-soft);
    padding: 0.75rem;
    background: rgba(201, 169, 97, 0.1);
    border-radius: 2px;
  }

  .review-info strong { color: var(--ink); font-weight: 600; }

  .delete-btn {
    background: none;
    border: 1px solid rgba(184, 92, 56, 0.4);
    color: var(--terracotta);
    padding: 0.4rem 0.8rem;
    font-family: var(--sans);
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s;
  }

  .delete-btn:hover {
    background: var(--terracotta);
    color: white;
  }

  .review-view { animation: fadeUp 0.4s ease; }

  .section-title {
    font-family: var(--display);
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .section-sub {
    font-family: var(--sans);
    font-size: 0.85rem;
    color: var(--ink-soft);
    margin-bottom: 1.5rem;
  }

  .review-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }

  .review-section-label {
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 0.6rem;
    margin-top: 0.25rem;
  }

  .review-section-label.urgent-label { color: var(--terracotta); }

  .review-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid var(--gold-dark);
    border-left: 4px solid var(--subject-color);
    border-radius: 2px;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .review-card-left { display: flex; align-items: center; gap: 1rem; }

  .review-glyph {
    font-size: 2rem;
    color: var(--subject-color);
  }

  .review-subject {
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .review-topic {
    font-family: var(--display);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--ink);
  }

  .review-card-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .stats-view { animation: fadeUp 0.4s ease; }

  .stats-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stats-header .section-title { margin-bottom: 0; }

  .data-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .export-btn {
    background: transparent;
    border: 1px solid var(--gold-dark);
    color: var(--ink-soft);
    font-family: var(--sans);
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s;
  }

  .export-btn:hover { background: rgba(201,169,97,0.15); color: var(--ink); }
  .export-btn:active { transform: scale(0.96); }
  .import-btn { cursor: pointer; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid var(--gold-dark);
    padding: 1.5rem;
    text-align: center;
    border-radius: 2px;
  }

  .stat-big {
    font-family: var(--display);
    font-size: 3rem;
    font-weight: 600;
    color: var(--gold-dark);
    line-height: 1;
  }

  .stat-desc {
    font-family: var(--sans);
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-top: 0.5rem;
  }

  .chart-card {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid var(--gold-dark);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 2px;
  }

  .chart-card h3 {
    font-family: var(--display);
    font-size: 1.35rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .bar-chart {
    display: flex;
    gap: 0.5rem;
    height: 200px;
    align-items: stretch;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .bar-wrap {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
    padding: 0 4px;
  }

  .bar {
    width: 100%;
    background: linear-gradient(to top, var(--gold-dark), var(--gold));
    min-height: 2px;
    position: relative;
    border-radius: 2px 2px 0 0;
    transition: height 0.5s ease;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 4px;
  }

  .bar-val {
    font-family: var(--sans);
    font-size: 0.7rem;
    color: white;
    font-weight: 600;
  }

  .bar-label {
    font-family: var(--sans);
    font-size: 0.75rem;
    color: var(--ink-soft);
    letter-spacing: 0.05em;
  }

  .subject-bars { display: flex; flex-direction: column; gap: 0.75rem; }

  .sbar-row {
    display: grid;
    grid-template-columns: 140px 1fr 60px;
    gap: 1rem;
    align-items: center;
  }

  .sbar-label {
    font-family: var(--body);
    font-size: 0.95rem;
    font-weight: 500;
  }

  .sbar-track {
    height: 8px;
    background: rgba(43, 29, 14, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .sbar-fill {
    height: 100%;
    transition: width 0.5s ease;
    border-radius: 4px;
  }

  .sbar-val {
    font-family: var(--sans);
    font-size: 0.8rem;
    color: var(--ink-soft);
    text-align: right;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(43, 29, 14, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: var(--papyrus);
    border: 1px solid var(--gold-dark);
    border-top: 4px solid var(--subject-color, var(--gold-dark));
    padding: 2rem;
    max-width: 480px;
    width: 100%;
    border-radius: 2px;
    animation: modalIn 0.3s ease;
    box-shadow: 0 20px 60px rgba(43, 29, 14, 0.3);
  }

  @keyframes modalIn {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .modal-glyph {
    font-size: 3rem;
    color: var(--subject-color, var(--gold-dark));
    text-align: center;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .modal h2 {
    font-family: var(--display);
    font-size: 1.75rem;
    font-weight: 600;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .modal-topic {
    text-align: center;
    font-family: var(--body);
    font-style: italic;
    color: var(--ink-soft);
    margin-top: -1rem;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
  }

  .modal input[type="text"] {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--gold-dark);
    background: white;
    color: var(--ink);
    font-family: var(--body);
    font-size: 1.1rem;
    border-radius: 2px;
  }

  .modal input:focus {
    outline: none;
    border-color: var(--subject-color, var(--ink));
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .btn-ghost, .btn-primary {
    padding: 0.6rem 1.25rem;
    font-family: var(--sans);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s;
  }

  .btn-ghost {
    background: transparent;
    border: 1px solid var(--gold-dark);
    color: var(--ink-soft);
  }

  .btn-ghost:hover { background: rgba(43, 29, 14, 0.05); }

  .btn-primary {
    background: var(--subject-color, var(--ink));
    border: 1px solid transparent;
    color: white;
  }

  .btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: scale(1.02); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  .form-label {
    display: block;
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 0.5rem;
    margin-top: 1rem;
  }

  .time-picker {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .time-btn {
    flex: 1;
    min-width: 50px;
    padding: 0.6rem;
    border: 1px solid var(--gold-dark);
    background: transparent;
    font-family: var(--display);
    font-size: 1rem;
    cursor: pointer;
    border-radius: 2px;
    color: var(--ink-soft);
    transition: all 0.15s;
  }

  .time-btn:hover { background: rgba(201, 169, 97, 0.15); }

  .time-btn.active {
    background: var(--subject-color, var(--ink));
    color: white;
    border-color: transparent;
  }

  .time-input {
    width: 100%;
    padding: 0.6rem;
    border: 1px solid var(--gold-dark);
    background: white;
    font-family: var(--body);
    font-size: 1rem;
    border-radius: 2px;
    text-align: center;
  }

  .xp-preview {
    background: rgba(201, 169, 97, 0.2);
    border: 1px dashed var(--gold-dark);
    padding: 0.75rem 1rem;
    margin-top: 1.25rem;
    text-align: center;
    font-family: var(--body);
    font-size: 0.95rem;
    color: var(--ink);
    border-radius: 2px;
  }

  .xp-glyph {
    color: var(--gold-dark);
    font-size: 1.2rem;
    margin-right: 0.5rem;
  }

  .xp-preview strong {
    color: var(--gold-dark);
    font-family: var(--display);
    font-size: 1.1rem;
  }

  .derived-knowledge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .subtopic-section {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px dashed rgba(154, 125, 63, 0.4);
  }

  .subtopic-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .subtopic-section-label {
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .add-subtopic-btn {
    background: transparent;
    border: 1px solid var(--gold-dark);
    color: var(--ink-soft);
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.3rem 0.65rem;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.15s;
  }

  .add-subtopic-btn:hover { background: rgba(201, 169, 97, 0.15); color: var(--ink); }

  .subtopic-add-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .subtopic-add-row input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--gold-dark);
    background: white;
    color: var(--ink);
    font-family: var(--body);
    font-size: 0.95rem;
    border-radius: 2px;
  }

  .subtopic-add-row input:focus { outline: none; border-color: var(--subject-color, var(--ink)); }

  .subtopic-empty {
    font-family: var(--sans);
    font-size: 0.8rem;
    color: var(--ink-soft);
    font-style: italic;
    margin: 0.25rem 0 0.75rem;
  }

  .subtopic-card {
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(154, 125, 63, 0.35);
    border-left: 3px solid var(--subject-color, var(--gold-dark));
    border-radius: 2px;
    margin-bottom: 0.4rem;
    opacity: 0.95;
  }

  .subtopic-card.expanded { background: rgba(255, 255, 255, 0.55); }

  .subtopic-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    cursor: pointer;
    gap: 0.75rem;
  }

  .subtopic-info { flex: 1; min-width: 0; }

  .subtopic-name {
    font-family: var(--display);
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--ink);
    display: block;
    margin-bottom: 0.3rem;
  }

  .log-btn.small {
    padding: 0.35rem 0.7rem;
    font-size: 0.7rem;
  }

  .subtopic-details {
    padding: 0 0.75rem 0.75rem;
    border-top: 1px dashed rgba(154, 125, 63, 0.3);
    padding-top: 0.75rem;
    animation: fadeUp 0.2s ease;
  }

  .review-subtopic-arrow {
    color: var(--ink-soft);
    font-size: 0.9em;
    margin: 0 0.2rem;
  }

  @media (max-width: 640px) {
    .app { padding: 1rem; }
    .title { font-size: 1.5rem; }
    .stats { width: 100%; justify-content: space-between; }
    .stat-badge { min-width: 0; flex: 1; padding: 0.5rem; }
    .stat-value { font-size: 1rem; }
    .subject-header { flex-direction: column; align-items: flex-start; }
    .add-btn { margin-left: 0; width: 100%; }
    .sbar-row { grid-template-columns: 100px 1fr 50px; font-size: 0.85rem; }
    .topic-header { flex-direction: column; align-items: flex-start; }
    .log-btn { width: 100%; }
    .subtopic-add-row { flex-direction: column; }
  }

  /* ── Session history ── */
  .session-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .session-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255,255,255,0.45);
    border: 1px solid rgba(154,125,63,0.3);
    border-radius: 2px;
    font-family: var(--sans);
    font-size: 0.8rem;
    transition: background 0.2s;
    flex-wrap: wrap;
  }

  .session-item:hover { background: rgba(255,255,255,0.7); }

  .session-date { color: var(--ink-soft); flex: 1; min-width: 60px; }

  .session-mins {
    color: var(--ink);
    font-weight: 600;
    min-width: 55px;
  }

  .session-xp {
    color: var(--gold-dark);
    font-weight: 600;
    min-width: 55px;
  }

  .unlog-btn {
    margin-left: auto;
    background: none;
    border: 1px solid rgba(184,92,56,0.35);
    color: var(--terracotta);
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.2rem 0.55rem;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.15s;
  }

  .unlog-btn:hover {
    background: var(--terracotta);
    color: white;
    transform: scale(1.04);
  }

  /* ── Confirm modal ── */
  .confirm-modal { max-width: 380px; }

  .confirm-message {
    text-align: center;
    font-family: var(--body);
    color: var(--ink-soft);
    font-size: 1rem;
    line-height: 1.6;
    margin-top: -0.5rem;
    margin-bottom: 0.5rem;
  }

  .btn-danger {
    padding: 0.6rem 1.25rem;
    font-family: var(--sans);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s;
    background: var(--terracotta);
    border: 1px solid transparent;
    color: white;
  }

  .btn-danger:hover { filter: brightness(1.1); transform: scale(1.03); }
  .btn-danger:active { transform: scale(0.97); }

  /* ── Level-up overlay ── */
  .level-up-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    pointer-events: none;
    animation: lvlFadeOut 3.5s ease forwards;
  }

  @keyframes lvlFadeOut {
    0%   { opacity: 0; }
    10%  { opacity: 1; }
    70%  { opacity: 1; }
    100% { opacity: 0; }
  }

  .level-up-card {
    position: relative;
    background: linear-gradient(135deg, #2b1d0e 0%, #1a0f06 100%);
    border: 2px solid var(--gold);
    border-radius: 4px;
    padding: 2.5rem 3rem;
    text-align: center;
    box-shadow: 0 0 60px rgba(201,169,97,0.5), 0 20px 60px rgba(0,0,0,0.5);
    animation: lvlCardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
    overflow: hidden;
  }

  @keyframes lvlCardIn {
    from { transform: scale(0.6) translateY(30px); opacity: 0; }
    to   { transform: scale(1) translateY(0);      opacity: 1; }
  }

  .level-up-rays {
    position: absolute;
    inset: -50%;
    background: conic-gradient(from 0deg, transparent 0deg, rgba(201,169,97,0.08) 10deg, transparent 20deg);
    animation: spin 4s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .level-up-glyph {
    position: relative;
    font-size: 4rem;
    color: var(--gold);
    line-height: 1;
    margin-bottom: 0.5rem;
    animation: glyphPulse 1s ease-in-out infinite;
  }

  @keyframes glyphPulse {
    0%, 100% { text-shadow: 0 0 20px rgba(201,169,97,0.6); }
    50%       { text-shadow: 0 0 40px rgba(201,169,97,1); }
  }

  .level-up-label {
    position: relative;
    font-family: var(--sans);
    font-size: 0.75rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 0.25rem;
  }

  .level-up-num {
    position: relative;
    font-family: var(--display);
    font-size: 3.5rem;
    font-weight: 700;
    color: white;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .level-up-sub {
    position: relative;
    font-family: var(--body);
    font-style: italic;
    color: rgba(255,255,255,0.55);
    font-size: 0.9rem;
  }

  /* ── Enhanced button animations ── */
  .log-btn {
    position: relative;
    overflow: hidden;
  }

  .log-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0);
    transition: background 0.15s;
  }

  .log-btn:active::after { background: rgba(255,255,255,0.2); }
  .log-btn:active { transform: scale(0.96) !important; }

  .btn-primary:active:not(:disabled) { transform: scale(0.96) !important; }
  .btn-ghost:active { transform: scale(0.96); }

  .add-btn:active { transform: scale(0.96); }
  .back-btn { transition: all 0.2s; }
  .back-btn:active { transform: translateX(-3px); }

  .subject-card:active { transform: scale(0.98) !important; }

  .nav-btn:active { transform: scale(0.96); }

  .k-btn:active { transform: scale(0.9); }
  .time-btn:active { transform: scale(0.93); }

  .add-subtopic-btn:active { transform: scale(0.95); }
  .delete-btn:active { transform: scale(0.96); }

  /* ── Exam PDF links ── */
  .exam-pdfs { display: flex; flex-direction: column; gap: 0.4rem; }

  .exam-pdfs-empty {
    font-family: var(--sans);
    font-size: 0.78rem;
    color: var(--ink-soft);
    margin: 0 0 0.4rem;
    font-style: italic;
  }

  .exam-pdf-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(201,169,97,0.06);
    border: 1px solid rgba(201,169,97,0.18);
    border-radius: 4px;
    padding: 0.35rem 0.6rem;
  }

  .exam-pdf-link {
    flex: 1;
    font-family: var(--sans);
    font-size: 0.82rem;
    color: var(--gold);
    text-decoration: none;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .exam-pdf-link:hover { text-decoration: underline; }

  .exam-pdf-del {
    background: none;
    border: none;
    color: var(--ink-soft);
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0 2px;
    line-height: 1;
    flex-shrink: 0;
  }
  .exam-pdf-del:hover { color: #e07070; }

  .exam-pdf-form {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    background: rgba(201,169,97,0.04);
    border: 1px solid rgba(201,169,97,0.2);
    border-radius: 4px;
    padding: 0.6rem;
  }

  .exam-pdf-form input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.4rem 0.6rem;
    background: var(--papyrus);
    border: 1px solid var(--border);
    border-radius: 3px;
    font-family: var(--sans);
    font-size: 0.82rem;
    color: var(--ink);
  }

  .exam-pdf-form-btns {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.15rem;
  }

  .exam-pdf-form-btns .btn-ghost,
  .exam-pdf-form-btns .btn-primary {
    padding: 0.35rem 0.85rem;
    font-size: 0.75rem;
  }

  .exam-pdf-add {
    align-self: flex-start;
    background: none;
    border: 1px dashed rgba(201,169,97,0.35);
    border-radius: 4px;
    color: var(--gold);
    font-family: var(--sans);
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .exam-pdf-add:hover {
    border-color: var(--gold);
    background: rgba(201,169,97,0.08);
  }
`;
