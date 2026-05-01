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

function getLevelInfo(totalXP) {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = level * 200;
    if (accumulated + needed > totalXP) {
      return { level, xpInLevel: totalXP - accumulated, xpNeeded: needed };
    }
    accumulated += needed;
    level++;
  }
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

function makeSt(id, name) {
  return { id, name, knowledge: 1, notes: '', quizletUrl: '', examLinks: '', examPdfs: [], lastStudied: null, reviewCount: 0, totalMinutes: 0 };
}
function makeCh(id, name, subtopics) {
  return { id, name, knowledge: 1, notes: '', quizletUrl: '', examLinks: '', examPdfs: [], lastStudied: null, reviewCount: 0, totalMinutes: 0, subtopics };
}

const DEFAULT_MATHS_TOPICS = [
  makeCh('maths_ch1', 'Chapter 1 - Algebra 1', [
    makeSt('maths_ch1_st1', 'Simplifying expressions'),
    makeSt('maths_ch1_st2', 'Removing brackets'),
    makeSt('maths_ch1_st3', 'Evaluating expressions'),
    makeSt('maths_ch1_st4', 'Solving linear equations'),
    makeSt('maths_ch1_st5', 'Solving problems using linear equations'),
    makeSt('maths_ch1_st6', 'Algebraic division'),
    makeSt('maths_ch1_st7', 'Plotting numbers on the number line'),
    makeSt('maths_ch1_st8', 'Solving inequalities'),
  ]),
  makeCh('maths_ch2', 'Chapter 2 - Factors', [
    makeSt('maths_ch2_st1', 'Factorising with common factors'),
    makeSt('maths_ch2_st2', 'Factorising by grouping terms'),
    makeSt('maths_ch2_st3', 'Difference of two squares'),
    makeSt('maths_ch2_st4', 'Factorising quadratic expressions'),
    makeSt('maths_ch2_st5', 'Using factors to simplify algebraic fractions'),
  ]),
  makeCh('maths_ch5', 'Chapter 5 - Statistics 1 - Collecting Data', [
    makeSt('maths_ch5_st1', 'Statistical questions'),
    makeSt('maths_ch5_st2', 'Sampling'),
  ]),
  makeCh('maths_ch7', 'Chapter 7 - Statistics 2 - Averages and Variability', [
    makeSt('maths_ch7_st1', 'Summary statistics'),
    makeSt('maths_ch7_st2', 'The mean'),
    makeSt('maths_ch7_st3', 'Which average to use?'),
    makeSt('maths_ch7_st4', 'Frequency tables'),
    makeSt('maths_ch7_st5', 'Range and variability'),
  ]),
  makeCh('maths_ch10', 'Chapter 10 - Simultaneous Equations', [
    makeSt('maths_ch10_st1', 'Solving simultaneous equations'),
    makeSt('maths_ch10_st2', 'Solving simultaneous equations graphically'),
  ]),
  makeCh('maths_ch11', 'Chapter 11 - Coordinate Geometry - The Line', [
    makeSt('maths_ch11_st1', 'Distance and mid-point formulae'),
    makeSt('maths_ch11_st2', 'The slope of a line'),
    makeSt('maths_ch11_st3', 'The equation of a line'),
    makeSt('maths_ch11_st4', 'The equation y = mx + c'),
    makeSt('maths_ch11_st5', 'Parallel and perpendicular lines'),
    makeSt('maths_ch11_st6', 'Graphing lines'),
    makeSt('maths_ch11_st7', 'Intersection of two lines'),
    makeSt('maths_ch11_st8', 'Rates of change'),
  ]),
  makeCh('maths_ch13', 'Chapter 13 - Statistics 3 - Presenting Data', [
    makeSt('maths_ch13_st1', 'Revision of line plots and bar charts'),
    makeSt('maths_ch13_st2', 'Pie charts'),
    makeSt('maths_ch13_st3', 'Histograms'),
    makeSt('maths_ch13_st4', 'Stem and leaf plots'),
    makeSt('maths_ch13_st5', 'Misleading graphs'),
  ]),
  makeCh('maths_ch15', 'Chapter 15 - Quadratic Equations', [
    makeSt('maths_ch15_st1', 'Solving quadratic equations using factors'),
    makeSt('maths_ch15_st2', 'Using the quadratic formula'),
    makeSt('maths_ch15_st3', 'Problems leading to quadratic equations'),
    makeSt('maths_ch15_st4', 'Forming a quadratic equation given its roots'),
  ]),
  makeCh('maths_ch21', 'Chapter 21 - Algebra 2', [
    makeSt('maths_ch21_st1', 'Adding algebraic fractions'),
    makeSt('maths_ch21_st2', 'Solving equations involving fractions'),
    makeSt('maths_ch21_st3', 'Solving problems involving fractions'),
    makeSt('maths_ch21_st4', 'Rearranging formulae'),
    makeSt('maths_ch21_st5', 'Evaluating and writing formulae'),
  ]),
  makeCh('maths_ch22', 'Chapter 22 - Trigonometry', [
    makeSt('maths_ch22_st1', 'The theorem of Pythagoras'),
    makeSt('maths_ch22_st2', 'Sine, cosine and tangent ratios'),
    makeSt('maths_ch22_st3', 'Using a calculator to find ratios and angles'),
    makeSt('maths_ch22_st4', 'Solving right-angled triangles'),
    makeSt('maths_ch22_st5', 'Using trigonometry to solve problems'),
  ]),
];

const DEFAULT_BUSINESS_TOPICS = [
  makeCh('biz_ch1', 'Chapter 1 - My Personal Resources', [
    makeSt('biz_ch1_st1', 'Individual and Household Resources'),
    makeSt('biz_ch1_st2', 'Making Choices: Our Needs and Wants'),
    makeSt('biz_ch1_st3', 'The Impact Our Choices Have on Others'),
  ]),
  makeCh('biz_ch2', 'Chapter 2 - My Personal Financial Lifecycle', [
    makeSt('biz_ch2_st1', 'Stages in your Financial Lifecycle'),
    makeSt('biz_ch2_st2', 'Planning for your Financial Needs'),
  ]),
  makeCh('biz_ch3', 'Chapter 3 - Household Income and Expenditure', [
    makeSt('biz_ch3_st1', 'Sources of Household Income'),
    makeSt('biz_ch3_st2', 'Managing your Household Income'),
    makeSt('biz_ch3_st3', 'Household Expenditure'),
    makeSt('biz_ch3_st4', 'Managing your Household Expenditure'),
  ]),
  makeCh('biz_ch4', 'Chapter 4 - Household Budgeting', [
    makeSt('biz_ch4_st1', 'The Household Budget'),
  ]),
  makeCh('biz_ch5', 'Chapter 5 - Budgeting for Change', [
    makeSt('biz_ch5_st1', 'Budgeting for Change'),
  ]),
  makeCh('biz_ch6', 'Chapter 6 - Recording Household Income and Expenditure', [
    makeSt('biz_ch6_st1', 'The Analysed Cash Book'),
    makeSt('biz_ch6_st2', 'Budget Comparison Statement'),
    makeSt('biz_ch6_st3', 'Household Bills'),
    makeSt('biz_ch6_st4', 'Making and Receiving Payments'),
    makeSt('biz_ch6_st5', 'Current Accounts'),
  ]),
  makeCh('biz_ch7', 'Chapter 7 - Saving Your Money', [
    makeSt('biz_ch7_st1', 'Saving Your Money'),
    makeSt('biz_ch7_st2', 'Interest on Savings'),
    makeSt('biz_ch7_st3', 'Investing'),
  ]),
  makeCh('biz_ch8', 'Chapter 8 - Borrowing Money', [
    makeSt('biz_ch8_st1', 'Reasons for Borrowing'),
    makeSt('biz_ch8_st2', 'Types of Borrowing'),
    makeSt('biz_ch8_st3', 'Interest on Borrowing'),
    makeSt('biz_ch8_st4', 'Rights and Responsibilities When Borrowing'),
    makeSt('biz_ch8_st5', 'Applying for a Loan'),
  ]),
  makeCh('biz_ch9', 'Chapter 9 - Personal Taxation', [
    makeSt('biz_ch9_st1', 'What is Taxation?'),
    makeSt('biz_ch9_st2', 'Types of Taxes and Charges'),
  ]),
  makeCh('biz_ch10', 'Chapter 10 - Wages and Salaries', [
    makeSt('biz_ch10_st1', 'Calculating Pay'),
    makeSt('biz_ch10_st2', 'The Payslip (Wage Slip)'),
    makeSt('biz_ch10_st3', 'Calculating Income Tax'),
  ]),
  makeCh('biz_ch11', 'Chapter 11 - Personal and Household Insurance', [
    makeSt('biz_ch11_st1', 'Risk and Insurance'),
    makeSt('biz_ch11_st2', 'Types of Personal and Household Insurance'),
    makeSt('biz_ch11_st3', 'Taking out Insurance'),
    makeSt('biz_ch11_st4', 'The Rules (Principles) of Insurance'),
  ]),
  makeCh('biz_ch12', 'Chapter 12 - Personal Insurance Costs and Claims', [
    makeSt('biz_ch12_st1', 'The Cost of Insurance'),
    makeSt('biz_ch12_st2', 'Making a Claim'),
    makeSt('biz_ch12_st3', 'Calculating Compensation'),
  ]),
  makeCh('biz_ch13', 'Chapter 13 - Consumer Rights and Responsibilities', [
    makeSt('biz_ch13_st1', 'Consumers and Brands'),
    makeSt('biz_ch13_st2', 'Rights and Responsibilities'),
    makeSt('biz_ch13_st3', 'Solutions and Remedies (Redress)'),
  ]),
  makeCh('biz_ch14', 'Chapter 14 - Supporting the Consumer', [
    makeSt('biz_ch14_st1', 'Consumer Organisations and Agencies'),
    makeSt('biz_ch14_st2', 'The Online Consumer'),
  ]),
  makeCh('biz_ch15', 'Chapter 15 - Sustainable Development and Consumption', [
    makeSt('biz_ch15_st1', 'Sustainable Development and Sustainable Consumption'),
    makeSt('biz_ch15_st2', 'Ethical Consumption'),
    makeSt('biz_ch15_st3', 'The Government and Global Response'),
    makeSt('biz_ch15_st4', 'The Socially Responsible Business'),
  ]),
  makeCh('biz_ch16', 'Chapter 16 - Globalisation and Technology', [
    makeSt('biz_ch16_st1', 'Globalisation'),
    makeSt('biz_ch16_st2', 'Technology'),
  ]),
  makeCh('biz_ch17', 'Chapter 17 - Types of Enterprise', [
    makeSt('biz_ch17_st1', 'Financial, Social and Cultural Enterprise'),
    makeSt('biz_ch17_st2', 'Types of Business Ownership'),
  ]),
  makeCh('biz_ch18', 'Chapter 18 - Entrepreneurs and Enterprising People', [
    makeSt('biz_ch18_st1', 'Being Enterprising'),
    makeSt('biz_ch18_st2', 'Skills and Characteristics of Enterprising People'),
    makeSt('biz_ch18_st3', 'The Entrepreneur'),
  ]),
  makeCh('biz_ch19', 'Chapter 19 - Work, Employment and Volunteerism', [
    makeSt('biz_ch19_st1', 'Work and Employment'),
    makeSt('biz_ch19_st2', 'Volunteerism'),
    makeSt('biz_ch19_st3', 'The Labour Force'),
  ]),
  makeCh('biz_ch20', 'Chapter 20 - Employers and Employees', [
    makeSt('biz_ch20_st1', 'Employers and Employees'),
    makeSt('biz_ch20_st2', 'Employing Staff'),
    makeSt('biz_ch20_st3', 'Industrial Relations'),
    makeSt('biz_ch20_st4', 'Employment and the Law'),
  ]),
  makeCh('biz_ch21', 'Chapter 21 - Digital Technologies', [
    makeSt('biz_ch21_st1', 'Digital Technologies'),
    makeSt('biz_ch21_st2', 'Technology Terms'),
    makeSt('biz_ch21_st3', 'Rewards and Costs of Technology'),
  ]),
  makeCh('biz_ch22', 'Chapter 22 - Impacting the Community', [
    makeSt('biz_ch22_st1', 'Positive Impacts of Organisations'),
    makeSt('biz_ch22_st2', 'Negative Impacts of Organisations'),
  ]),
  makeCh('biz_ch23', 'Chapter 23 - Marketing and Market Research', [
    makeSt('biz_ch23_st1', 'Markets and Marketing'),
    makeSt('biz_ch23_st2', 'Market Research'),
    makeSt('biz_ch23_st3', 'Doing the Research'),
  ]),
  makeCh('biz_ch24', 'Chapter 24 - The Marketing Mix', [
    makeSt('biz_ch24_st1', 'The Marketing Mix'),
    makeSt('biz_ch24_st2', 'Advertising, Sales, Promotion and Sponsorship'),
    makeSt('biz_ch24_st3', 'Developing a New Product'),
  ]),
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
  date.setHours(0, 0, 0, 0);
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

function getDaysUntilExam(examDate) {
  if (!examDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate); exam.setHours(0, 0, 0, 0);
  return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
}

function getWeekMinutes(sessions, subjectId) {
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0);
  return sessions
    .filter(s => s.subjectId === subjectId && new Date(s.date) >= weekAgo)
    .reduce((a, s) => a + s.minutes, 0);
}

// Scroll-reveal: adds 'reveal-visible' as elements enter the viewport
function useScrollReveal(deps) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('reveal-visible'); }),
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal:not(.reveal-visible)').forEach(el => observer.observe(el));
    }, 60);
    return () => { clearTimeout(timer); observer.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function KnowledgeSparkline({ history }) {
  if (!history || history.length < 2) return null;
  const vals = history.slice(-10).map(h => h.value);
  const w = 60, h = 18, pad = 2;
  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = pad + ((5 - v) / 4) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="sparkline">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
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
function ExamPdfs({ pdfs = [], onChange, userId }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setError('');
    setUploading(true);
    const added = [];
    for (const file of files) {
      const id = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const path = `${userId}/${id}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('exam-papers')
        .upload(path, file, { contentType: 'application/pdf' });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); continue; }
      const { data } = supabase.storage.from('exam-papers').getPublicUrl(path);
      added.push({ id, name: file.name, url: data.publicUrl, path });
    }
    onChange([...pdfs, ...added]);
    setUploading(false);
    // reset so the same file can be re-selected if needed
    e.target.value = '';
  }

  async function remove(pdf) {
    await supabase.storage.from('exam-papers').remove([pdf.path]);
    onChange(pdfs.filter(p => p.id !== pdf.id));
  }

  return (
    <div className="exam-pdfs">
      {pdfs.length === 0 && !uploading && (
        <p className="exam-pdfs-empty">No papers uploaded yet</p>
      )}
      {pdfs.map(p => (
        <div key={p.id} className="exam-pdf-row">
          <a href={p.url} target="_blank" rel="noreferrer" className="exam-pdf-link">
            &#128196; {p.name}
          </a>
          <button className="exam-pdf-del" onClick={() => remove(p)} title="Remove">&#10005;</button>
        </div>
      ))}
      {error && <p style={{ color: '#e07070', fontSize: '0.78rem', margin: '4px 0 0' }}>{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
      <button
        className="exam-pdf-add"
        disabled={uploading}
        onClick={() => inputRef.current.click()}
      >
        {uploading ? 'Uploading…' : '+ Upload PDF'}
      </button>
    </div>
  );
}

// ============ MAIN APP ============
export default function StudyTracker() {
  const [state, setState] = useState({
    subjects: DEFAULT_SUBJECTS.map(s => ({ ...s, topics: s.id === 'business' ? DEFAULT_BUSINESS_TOPICS : s.id === 'maths' ? DEFAULT_MATHS_TOPICS : [] })),
    sessions: [],
    xp: 0,
    streak: { count: 0, lastDay: null },
    exams: [],
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
  const [isDemoMode, setIsDemoMode] = useState(false);
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
          exams: [],
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

      if (data) {
        // Migrate existing accounts: inject default topics if none exist yet
        const hasBizTopics = data.subjects?.find(s => s.id === 'business')?.topics?.length > 0;
        const hasMathsTopics = data.subjects?.find(s => s.id === 'maths')?.topics?.length > 0;
        if (!hasBizTopics || !hasMathsTopics) {
          data = {
            ...data,
            subjects: data.subjects.map(s => {
              if (s.id === 'business' && !hasBizTopics) return { ...s, topics: DEFAULT_BUSINESS_TOPICS };
              if (s.id === 'maths' && !hasMathsTopics) return { ...s, topics: DEFAULT_MATHS_TOPICS };
              return s;
            }),
          };
        }
        setState(data);
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  // Demo mode: load from separate localStorage key, skip Supabase entirely
  useEffect(() => {
    if (!isDemoMode) return;
    try {
      const raw = localStorage.getItem('demo-tracker-state');
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, [isDemoMode]);

  // Persist every state change — localStorage immediately, Supabase debounced
  useEffect(() => {
    if (loading) return;
    if (isDemoMode) {
      try { localStorage.setItem('demo-tracker-state', JSON.stringify(state)); } catch {}
      return;
    }
    saveData(state);
    if (user) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveToSupabase(user.id, state), 2000);
    }
  }, [state, loading, user, isDemoMode]);

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

  const updateSubject = (subjectId, updates) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === subjectId ? { ...s, ...updates } : s)
    }));
  };

  const reorderTopics = (subjectId, newTopics) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === subjectId ? { ...s, topics: newTopics } : s)
    }));
  };

  const reorderSubtopics = (subjectId, topicId, newSubtopics) => {
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId ? {
          ...s,
          topics: s.topics.map(t => t.id === topicId ? { ...t, subtopics: newSubtopics } : t)
        } : s
      )
    }));
  };

  const addExam = (name, date) => {
    setState(prev => ({
      ...prev,
      exams: [...(prev.exams || []), { id: `ex_${Date.now()}`, name, date }],
    }));
  };

  const updateExam = (id, updates) => {
    setState(prev => ({
      ...prev,
      exams: (prev.exams || []).map(e => e.id === id ? { ...e, ...updates } : e),
    }));
  };

  const deleteExam = (id) => {
    setState(prev => ({ ...prev, exams: (prev.exams || []).filter(e => e.id !== id) }));
  };

  const logSubtopicSession = (subjectId, topicId, subtopicId, minutes, newKnowledge) => {
    const now = new Date().toISOString();
    const sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
      const advancedReview = !subtopic.lastStudied || !nextDue || daysBetween(new Date(), nextDue) <= 0;
      return {
        ...prev,
        xp: prev.xp + earnedXP,
        streak: newStreak,
        sessions: [...prev.sessions, { id: sessionId, subjectId, topicId, subtopicId, date: now, minutes, xpEarned: earnedXP, advancedReview }],
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
                    knowledgeHistory: [...(st.knowledgeHistory || []).slice(-19), { date: now, value: newKnowledge }],
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
      const advancedReview = !topic.lastStudied || !nextDue || daysBetween(new Date(), nextDue) <= 0;

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
                knowledgeHistory: [...(t.knowledgeHistory || []).slice(-19), { date: now, value: newKnowledge }],
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
      const aPri = a.topic.priority ? 1 : 0;
      const bPri = b.topic.priority ? 1 : 0;
      if (aPri !== bPri) return bPri - aPri;
      if (a.review.status === 'overdue') return (b.review.days || 0) - (a.review.days || 0);
      return (a.review.days || 0) - (b.review.days || 0);
    });
  }, [state.subjects]);

  // Badge count: only overdue + today
  const urgentCount = useMemo(() =>
    reviewQueue.filter(i => i.review.status === 'overdue' || i.review.status === 'today').length,
    [reviewQueue]
  );

  const { level, xpInLevel, xpNeeded } = getLevelInfo(state.xp);

  useScrollReveal([view, activeSubject, loading]);

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

  if (!user && !isDemoMode) return <AuthScreen onDemoMode={() => { setIsDemoMode(true); setAuthLoading(false); }} />;

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
        <div className="bg-orb bg-orb-1" aria-hidden="true" />
        <div className="bg-orb bg-orb-2" aria-hidden="true" />
        <div className="bg-orb bg-orb-3" aria-hidden="true" />
        <div className="grain" />
        <header className="header">
          <div className="header-left">
            <div className="logo" aria-hidden="true">𓉴</div>
            <div>
              <h1 className="title">The Scribe's Codex</h1>
              <p className="subtitle">Junior Cycle Study Tracker</p>
            </div>
          </div>
          <div className="header-right">
            <div className="stats">
              <StatBadge label="Level" value={level} glyph="𓇳" />
              <StatBadge label="Streak" value={`${state.streak.count}d`} glyph="𓍱" />
              <StatBadge label="Due" value={urgentCount} glyph="𓂀" urgent={urgentCount > 0} />
              {!isDemoMode && <button
                onClick={() => supabase.auth.signOut()}
                title={user?.email}
                style={{
                  background: 'none',
                  border: '1px solid rgba(201,169,97,0.25)',
                  borderRadius: 8,
                  color: 'rgba(201,169,97,0.6)',
                  fontFamily: 'var(--sans)',
                  fontSize: '0.7rem',
                  padding: '0.25rem 0.65rem',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'rgba(201,169,97,0.6)'; e.target.style.color = '#c9a961'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'rgba(201,169,97,0.25)'; e.target.style.color = 'rgba(201,169,97,0.6)'; }}
              >
                Sign out
              </button>}
            </div>
            <div className="xp-level-bar">
              <div className="xp-level-bar-track">
                <div className="xp-level-bar-fill" style={{ width: `${Math.round((xpInLevel / xpNeeded) * 100)}%` }} />
              </div>
              <span className="xp-level-bar-label">{xpInLevel} / {xpNeeded} XP to Level {level + 1}</span>
            </div>
          </div>
        </header>

        {isDemoMode && (
          <div className="demo-banner">
            <span>⚗ Demo mode — data is local only, nothing synced to any account</span>
            <button className="demo-exit-btn" onClick={() => {
              setIsDemoMode(false);
              setLoading(true);
              setState({ subjects: DEFAULT_SUBJECTS.map(s => ({ ...s, topics: [] })), sessions: [], xp: 0, streak: { count: 0, lastDay: null } });
            }}>Sign in instead</button>
          </div>
        )}

        <nav className="nav">
          <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            Dashboard
          </button>
          <button className={`nav-btn ${view === 'review' ? 'active' : ''}`} onClick={() => setView('review')}>
            Review Queue {urgentCount > 0 && <span className="badge">{urgentCount}</span>}
          </button>
          <button className={`nav-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>
            Calendar
          </button>
          <button className={`nav-btn ${view === 'knowledge' ? 'active' : ''}`} onClick={() => setView('knowledge')}>
            Knowledge
          </button>
          <button className={`nav-btn ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')}>
            Stats
          </button>
        </nav>

        <main className="main">
          {view === 'dashboard' && !activeSubject && urgentCount > 0 && (
            <div className="overdue-banner" onClick={() => setView('review')}>
              <span className="overdue-banner-text">𓂀 {urgentCount} item{urgentCount !== 1 ? 's' : ''} due for review</span>
              <span className="overdue-banner-cta">Open Review Queue →</span>
            </div>
          )}

          {view === 'dashboard' && !activeSubject && (
            <GlobalExams
              exams={state.exams || []}
              onAdd={addExam}
              onUpdate={updateExam}
              onDelete={deleteExam}
            />
          )}

          {view === 'dashboard' && !activeSubject && (
            <SubjectGrid
              subjects={state.subjects}
              sessions={state.sessions}
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
              onUpdateSubject={(updates) => updateSubject(activeSubject, updates)}
              onReorderTopics={(newTopics) => reorderTopics(activeSubject, newTopics)}
              onReorderSubtopics={(tid, newSubs) => reorderSubtopics(activeSubject, tid, newSubs)}
              userId={user?.id}
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

          {view === 'calendar' && (
            <CalendarView
              state={state}
              exams={state.exams || []}
              onAddExam={addExam}
              onStudy={(subjectId, topicId, subtopicId) => {
                setActiveTopic({ subjectId, topicId });
                setActiveSubtopic(subtopicId || null);
                setShowLogModal(true);
              }}
            />
          )}

          {view === 'knowledge' && (
            <KnowledgeView state={state} />
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
          const groupSubtopics = !subtopic && (topic.subtopics || []).length > 0 ? topic.subtopics : null;
          return (
            <LogStudyModal
              topic={subtopic || topic}
              subject={subj}
              subtopics={groupSubtopics}
              onLog={(minutes, knowledge, selectedSubtopicIds) => {
                if (selectedSubtopicIds) {
                  const minutesEach = Math.max(1, Math.round(minutes / selectedSubtopicIds.length));
                  selectedSubtopicIds.forEach(stid =>
                    logSubtopicSession(activeTopic.subjectId, activeTopic.topicId, stid, minutesEach, knowledge)
                  );
                } else if (subtopic) {
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

function GlobalExams({ exams, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');

  const handleAdd = () => {
    if (!newName.trim() || !newDate) return;
    onAdd(newName.trim(), newDate);
    setNewName(''); setNewDate(''); setShowAdd(false);
  };

  const startEdit = (exam) => {
    setEditingId(exam.id);
    setEditName(exam.name);
    setEditDate(exam.date);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editDate) return;
    onUpdate(editingId, { name: editName.trim(), date: editDate });
    setEditingId(null);
  };

  const sorted = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="global-exams">
      <div className="global-exams-header">
        <span className="global-exams-title">Upcoming Exams</span>
        <button className="global-exams-add-btn" onClick={() => setShowAdd(v => !v)}>+ Add exam</button>
      </div>

      {showAdd && (
        <div className="global-exam-form">
          <input
            autoFocus
            type="text"
            placeholder="Exam name (e.g. Term 1, Summer)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="global-exam-input"
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false); }}
          />
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="global-exam-input"
          />
          <button className="btn-primary" onClick={handleAdd} disabled={!newName.trim() || !newDate}>Add</button>
          <button className="btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="global-exam-list">
          {sorted.map(exam => {
            const days = getDaysUntilExam(exam.date);
            const past = days !== null && days < 0;
            const urgent = days !== null && days <= 14 && !past;
            if (editingId === exam.id) {
              return (
                <div key={exam.id} className="global-exam-card editing">
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="global-exam-input"
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  />
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="global-exam-input"
                  />
                  <button className="btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={saveEdit}>Save</button>
                  <button className="btn-ghost" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              );
            }
            return (
              <div key={exam.id} className={`global-exam-card ${urgent ? 'urgent' : ''} ${past ? 'past' : ''}`}>
                <div className="global-exam-info">
                  <span className="global-exam-name">{exam.name}</span>
                  <span className="global-exam-date-str">{new Date(exam.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="global-exam-right">
                  <span className="global-exam-countdown">
                    {days === 0 ? 'Today!' : past ? `${Math.abs(days)}d ago` : `${days} day${days !== 1 ? 's' : ''}`}
                  </span>
                  <button className="global-exam-edit-btn" onClick={() => startEdit(exam)} title="Edit">✎</button>
                  <button className="global-exam-del-btn" onClick={() => onDelete(exam.id)} title="Delete">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sorted.length === 0 && !showAdd && (
        <p className="global-exams-empty">No exams added yet — click "Add exam" to track a Term 1, Summer, etc.</p>
      )}
    </div>
  );
}

function SubjectGrid({ subjects, sessions, onSelect }) {
  return (
    <div className="subject-grid">
      {subjects.map((s, i) => {
        const total = s.topics.length;
        const percent = total > 0 ? Math.round((s.topics.reduce((a, t) => a + getEffectiveKnowledge(t), 0) / (total * 5)) * 100) : 0;
        const due = s.topics.filter(t => {
          const r = getEffectiveReviewStatus(t);
          return r.status === 'overdue' || r.status === 'today';
        }).length;
        const daysToExam = getDaysUntilExam(s.examDate);
        const weekMins = getWeekMinutes(sessions, s.id);
        const goalMins = s.weeklyGoalMinutes || 0;
        const goalPct = goalMins > 0 ? Math.min(100, Math.round((weekMins / goalMins) * 100)) : 0;

        return (
          <button
            key={s.id}
            className="subject-card reveal"
            style={{ '--subject-color': s.color, '--reveal-delay': `${i * 80}ms` }}
            onClick={() => onSelect(s)}
            onMouseMove={(e) => {
              const el = e.currentTarget;
              const r = el.getBoundingClientRect();
              const x = (e.clientX - r.left) / r.width - 0.5;
              const y = (e.clientY - r.top) / r.height - 0.5;
              el.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-6px) scale(1.02)`;
              el.style.boxShadow = `${-x * 12}px ${y * 12}px 40px rgba(43,29,14,0.18), 0 20px 50px rgba(43,29,14,0.12)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div className="subject-glyph">{s.glyph}</div>
            <h2 className="subject-name">{s.name}</h2>
            <div className="subject-meta">
              <span>{total} topics</span>
              {due > 0 && <span className="due-dot">{due} due</span>}
              {daysToExam !== null && daysToExam >= 0 && (
                <span className={`exam-dot ${daysToExam <= 7 ? 'urgent' : ''}`}>
                  {daysToExam === 0 ? 'Exam today!' : `${daysToExam}d to exam`}
                </span>
              )}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <div className="subject-percent">{percent}% mastered</div>
            {goalMins > 0 && (
              <div className="goal-row">
                <div className="goal-track">
                  <div className="goal-fill" style={{ width: `${goalPct}%`, background: s.color }} />
                </div>
                <span className="goal-label">{weekMins}/{goalMins}min this week</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DragReorderList({ items, renderItem, onReorder, className }) {
  const [draggingId, setDraggingId] = useState(null);
  const [insertAt, setInsertAt] = useState(null);
  const containerRef = useRef(null);

  const displayItems = useMemo(() => {
    if (draggingId === null || insertAt === null) return items;
    const fromIdx = items.findIndex(i => i.id === draggingId);
    if (fromIdx === -1) return items;
    const arr = [...items];
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(insertAt, 0, item);
    return arr;
  }, [items, draggingId, insertAt]);

  const startDrag = (itemId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIdx = items.findIndex(i => i.id === itemId);
    setDraggingId(itemId);
    setInsertAt(fromIdx);

    const getY = (ev) => ev.touches ? ev.touches[0].clientY : ev.clientY;

    const move = (ev) => {
      if (ev.cancelable) ev.preventDefault();
      const y = getY(ev);
      const container = containerRef.current;
      if (!container) return;
      const children = Array.from(container.children);
      let nearest = 0;
      let minDist = Infinity;
      children.forEach((child, i) => {
        const rect = child.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(y - mid);
        if (dist < minDist) { minDist = dist; nearest = i; }
      });
      setInsertAt(nearest);
    };

    const end = () => {
      setDraggingId(curId => {
        setInsertAt(curIns => {
          if (curId !== null && curIns !== null) {
            const from = items.findIndex(i => i.id === curId);
            if (from !== curIns) {
              const arr = [...items];
              const [moved] = arr.splice(from, 1);
              arr.splice(curIns, 0, moved);
              onReorder(arr);
            }
          }
          return null;
        });
        return null;
      });
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
  };

  return (
    <div className={className} ref={containerRef}>
      {displayItems.map((item) => {
        const isDragging = item.id === draggingId;
        return (
          <div key={item.id} className={isDragging ? 'drag-item drag-item--lifting' : 'drag-item'}>
            {renderItem(item, startDrag, isDragging)}
          </div>
        );
      })}
    </div>
  );
}

function SubjectView({ subject, sessions, onBack, onAddTopic, onSelectTopic, onLogStudy, onDeleteTopic, onUpdateTopic, onAddSubtopic, onDeleteSubtopic, onUpdateSubtopic, onLogSubtopic, onUnlogSession, onUpdateSubject, onReorderTopics, onReorderSubtopics, userId }) {
  const [expandedTopic, setExpandedTopic] = useState(null);
  const daysToExam = getDaysUntilExam(subject.examDate);
  const weekMins = getWeekMinutes(sessions, subject.id);
  const goalMins = subject.weeklyGoalMinutes || 0;
  const goalPct = goalMins > 0 ? Math.min(100, Math.round((weekMins / goalMins) * 100)) : 0;

  return (
    <div className="subject-view" style={{ '--subject-color': subject.color }}>
      <button className="back-btn" onClick={onBack}>← All subjects</button>
      <div className="subject-header">
        <div className="subject-glyph-lg">{subject.glyph}</div>
        <div className="subject-header-text">
          <h2 className="subject-title">{subject.name}</h2>
          <p className="subject-sub">{subject.topics.length} chapters tracked</p>
          {daysToExam !== null && daysToExam >= 0 && (
            <p className={`exam-countdown ${daysToExam <= 7 ? 'urgent' : ''}`}>
              {daysToExam === 0 ? '⚑ Exam today!' : `⚑ ${daysToExam} day${daysToExam !== 1 ? 's' : ''} until exam`}
            </p>
          )}
        </div>
        <button className="add-btn" onClick={onAddTopic}>+ Add chapter</button>
      </div>
      <div className="subject-settings">
        <div className="setting-item">
          <label className="setting-label">Exam date</label>
          <input
            type="date"
            className="setting-input"
            value={subject.examDate || ''}
            onChange={e => onUpdateSubject({ examDate: e.target.value || null })}
          />
        </div>
        <div className="setting-item">
          <label className="setting-label">Weekly goal</label>
          <div className="setting-goal-row">
            <input
              type="number"
              className="setting-input setting-input-sm"
              value={subject.weeklyGoalMinutes || ''}
              onChange={e => onUpdateSubject({ weeklyGoalMinutes: parseInt(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              max="1200"
            />
            <span className="setting-unit">min/week</span>
          </div>
        </div>
        {goalMins > 0 && (
          <div className="setting-goal-progress">
            <div className="goal-track" style={{ flex: 1 }}>
              <div className="goal-fill" style={{ width: `${goalPct}%` }} />
            </div>
            <span className="goal-label">{weekMins}/{goalMins}min this week ({goalPct}%)</span>
          </div>
        )}
      </div>

      {subject.topics.length === 0 ? (
        <div className="empty">
          <div className="empty-glyph">𓃀</div>
          <p>No chapters yet. Add your first one to begin.</p>
        </div>
      ) : (
        <DragReorderList
          items={subject.topics}
          onReorder={onReorderTopics}
          className="topic-list"
          renderItem={(topic, startDrag, isDragging) => {
            const review = getEffectiveReviewStatus(topic);
            const isExpanded = expandedTopic === topic.id;
            return (
              <div className={`topic-card ${isExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}>
                <div className="topic-header" onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}>
                  <div className="topic-main">
                    <div className="topic-name-row">
                      <span
                        className="drag-handle"
                        onPointerDown={e => startDrag(topic.id, e)}
                        onTouchStart={e => startDrag(topic.id, e)}
                        title="Drag to reorder"
                      >⠿</span>
                      <button
                        className={`priority-btn ${topic.priority ? 'active' : ''}`}
                        onClick={e => { e.stopPropagation(); onUpdateTopic(topic.id, { priority: !topic.priority }); }}
                        title={topic.priority ? 'Remove priority' : 'Mark as priority'}
                      >⚑</button>
                      <h3 className="topic-name">{topic.name}</h3>
                    </div>
                    <div className="topic-meta">
                      <KnowledgeBar level={getEffectiveKnowledge(topic)} />
                      <span className={`review-tag status-${review.status}`}>
                        {review.label}
                      </span>
                      {getEffectiveMinutes(topic) > 0 && <span className="mins-tag">{getEffectiveMinutes(topic)}min total</span>}
                      {topic.examDate && (() => {
                        const d = getDaysUntilExam(topic.examDate);
                        if (d === null || d < 0) return null;
                        return <span className={`exam-dot ${d <= 7 ? 'urgent' : ''}`}>{d === 0 ? 'Exam today!' : `${d}d to test`}</span>;
                      })()}
                      {(topic.knowledgeHistory || []).length > 1 && (
                        <KnowledgeSparkline history={topic.knowledgeHistory} />
                      )}
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
                      {(() => {
                        const effK = getEffectiveKnowledge(topic);
                        const hasSubs = (topic.subtopics || []).length > 0;
                        return <>
                          <div className="knowledge-picker">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                className={`k-btn ${effK === n ? 'active' : ''}`}
                                onClick={() => {
                                  if (hasSubs) {
                                    topic.subtopics.forEach(st => onUpdateSubtopic(topic.id, st.id, { knowledge: n }));
                                  } else {
                                    onUpdateTopic(topic.id, { knowledge: n });
                                  }
                                }}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="k-label">
                            {['Clueless', 'Shaky', 'Getting there', 'Confident', 'Mastered'][effK - 1]}
                            {hasSubs && <span style={{opacity: 0.55, marginLeft: '0.5em', fontSize: '0.85em'}}>— averaged from subtopics</span>}
                          </div>
                        </>;
                      })()}
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
                        userId={userId}
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

                    <div className="detail-row">
                      <label>Chapter exam</label>
                      <div className="chapter-exam-section">
                        <div className="chapter-exam-date-row">
                          <input
                            type="date"
                            className="setting-input"
                            value={topic.examDate || ''}
                            onChange={e => onUpdateTopic(topic.id, { examDate: e.target.value || null })}
                          />
                          {topic.examDate && (() => {
                            const d = getDaysUntilExam(topic.examDate);
                            if (d === null) return null;
                            return (
                              <span className={`chapter-exam-countdown ${d <= 7 ? 'urgent' : ''}`}>
                                {d === 0 ? 'Today!' : d < 0 ? `${Math.abs(d)}d ago` : `${d} day${d !== 1 ? 's' : ''} away`}
                              </span>
                            );
                          })()}
                          {topic.examDate && (
                            <button className="chapter-exam-clear" onClick={() => onUpdateTopic(topic.id, { examDate: null, examSubtopics: [] })} title="Clear exam date">✕</button>
                          )}
                        </div>
                        {(topic.subtopics || []).length > 0 && (
                          <div className="chapter-exam-subtopics">
                            <div className="chapter-exam-sub-header">
                              <span className="chapter-exam-sub-label">Subtopics in this exam:</span>
                              <div className="chapter-exam-sub-btns">
                                <button
                                  className="group-select-btn"
                                  onClick={() => onUpdateTopic(topic.id, { examSubtopics: topic.subtopics.map(st => st.id) })}
                                >All</button>
                                <button
                                  className="group-select-btn"
                                  onClick={() => onUpdateTopic(topic.id, { examSubtopics: [] })}
                                >None</button>
                              </div>
                            </div>
                            <div className="chapter-exam-sub-list">
                              {topic.subtopics.map(st => {
                                const checked = (topic.examSubtopics || []).includes(st.id);
                                return (
                                  <label key={st.id} className={`chapter-exam-sub-item ${checked ? 'checked' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const cur = topic.examSubtopics || [];
                                        onUpdateTopic(topic.id, {
                                          examSubtopics: checked ? cur.filter(x => x !== st.id) : [...cur, st.id]
                                        });
                                      }}
                                    />
                                    <span>{st.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
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
                      onReorderSubtopics={(newSubs) => onReorderSubtopics(topic.id, newSubs)}
                      userId={userId}
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
          }}
        />
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

function SubtopicSection({ topic, sessions, onAddSubtopic, onDeleteSubtopic, onUpdateSubtopic, onLogSubtopic, onUnlogSession, onReorderSubtopics, userId }) {
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

      <DragReorderList
        items={subtopics}
        onReorder={onReorderSubtopics}
        className="subtopic-drag-list"
        renderItem={(st, startDrag, isDragging) => {
        const review = getReviewStatus(st);
        const isExp = expandedSt === st.id;
        return (
          <div className={`subtopic-card ${isExp ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}>
            <div className="subtopic-row" onClick={() => setExpandedSt(isExp ? null : st.id)}>
              <span
                className="drag-handle drag-handle--sm"
                onPointerDown={e => startDrag(st.id, e)}
                onTouchStart={e => startDrag(st.id, e)}
                title="Drag to reorder"
              >⠿</span>
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
                    userId={userId}
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
        }}
      />
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
    <div key={subtopic ? subtopic.id : topic.id} className={`review-card ${topic.priority ? 'priority' : ''}`} style={{ '--subject-color': subject.color }}>
      <div className="review-card-left">
        <span className="review-glyph">{subject.glyph}</span>
        <div>
          <div className="review-subject">
            {subject.name}
            {topic.priority && <span className="review-priority-flag">⚑</span>}
          </div>
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

function CalendarView({ state, exams, onStudy, onAddExam }) {
  const [calMode, setCalMode] = useState('month');
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddExam, setShowAddExam] = useState(false);
  const [addExamName, setAddExamName] = useState('');
  const [addExamDate, setAddExamDate] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const dayMap = useMemo(() => {
    const map = {};
    const add = (key, cat, item) => {
      if (!map[key]) map[key] = { reviews: [], exams: [], sessionMins: 0 };
      if (cat === 'mins') map[key].sessionMins += item;
      else map[key][cat].push(item);
    };
    state.subjects.forEach(subj => {
      subj.topics.forEach(topic => {
        if (topic.lastStudied) {
          const nxt = getNextReviewDate(topic.lastStudied, topic.reviewCount || 0);
          if (nxt) add(nxt.split('T')[0], 'reviews', { subject: subj, topic, subtopic: null });
        }
        (topic.subtopics || []).forEach(st => {
          if (st.lastStudied) {
            const nxt = getNextReviewDate(st.lastStudied, st.reviewCount || 0);
            if (nxt) add(nxt.split('T')[0], 'reviews', { subject: subj, topic, subtopic: st });
          }
        });
      });
    });
    (exams || []).forEach(exam => { if (exam.date) add(exam.date, 'exams', exam); });
    // Subject-level and topic-level exam dates (set inside subject/chapter views)
    state.subjects.forEach(subj => {
      if (subj.examDate) add(subj.examDate, 'exams', { id: `subj_${subj.id}`, name: `${subj.name} Exam`, date: subj.examDate, glyph: subj.glyph, color: subj.color });
      subj.topics.forEach(topic => {
        if (topic.examDate) add(topic.examDate, 'exams', { id: `topic_${topic.id}`, name: `${topic.name}`, date: topic.examDate, subject: subj.name, glyph: subj.glyph, color: subj.color });
      });
    });
    (state.sessions || []).forEach(sess => { if (sess.date) add(sess.date.split('T')[0], 'mins', sess.minutes || 0); });
    return map;
  }, [state, exams]);

  const toDS = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };

  const navigate = (dir) => setAnchor(prev => {
    const d = new Date(prev);
    if (calMode === 'week') d.setDate(d.getDate() + dir * 7);
    else if (calMode === 'month') d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    return d;
  });

  const goToday = () => { const d = new Date(); d.setHours(0,0,0,0); setAnchor(d); setSelectedDate(todayStr); };

  const nextExam = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const all = [
      ...(exams || []),
      ...state.subjects.map(s => s.examDate ? { id:`subj_${s.id}`, name:`${s.name} Exam`, date: s.examDate } : null).filter(Boolean),
      ...state.subjects.flatMap(s => s.topics.map(t => t.examDate ? { id:`topic_${t.id}`, name: t.name, date: t.examDate } : null).filter(Boolean)),
    ];
    return all.filter(e => e.date && new Date(e.date + 'T00:00:00') >= today).sort((a,b) => new Date(a.date)-new Date(b.date))[0];
  }, [exams, state.subjects]);

  const headerLabel = useMemo(() => {
    if (calMode === 'week') {
      const mon = new Date(anchor);
      mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return `${mon.toLocaleDateString('en-IE',{day:'numeric',month:'short'})} – ${sun.toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'})}`;
    }
    if (calMode === 'month') return anchor.toLocaleDateString('en-IE',{month:'long',year:'numeric'});
    return String(anchor.getFullYear());
  }, [anchor, calMode]);

  const getMonthCells = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const dow = firstDay.getDay();
    const start = new Date(firstDay);
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      cells.push({ ds: toDS(d), inMonth: d.getMonth() === month });
    }
    while (cells.length > 35 && cells.slice(-7).every(c => !c.inMonth)) cells.splice(-7);
    return cells;
  };

  const renderCell = (ds, { inMonth = true, mini = false, weekMode = false } = {}) => {
    const data = dayMap[ds] || { reviews: [], exams: [], sessionMins: 0 };
    const d = new Date(ds + 'T00:00:00');
    const isToday = ds === todayStr;
    const isPast = ds < todayStr;
    const isSelected = ds === selectedDate;
    const hasExam = data.exams.length > 0;
    const hasReviews = data.reviews.length > 0;
    const hasActivity = data.sessionMins > 0;

    if (mini) {
      return (
        <div
          key={ds}
          className={['cal-mini-cell', isToday?'cal-today':'', isPast?'cal-past':'', !inMonth?'cal-out':'', hasExam?'cal-exam-day':'', isSelected?'cal-selected':''].join(' ')}
          onClick={() => setSelectedDate(isSelected ? null : ds)}
          title={ds}
        >
          {d.getDate()}
          {(hasExam || hasReviews || hasActivity) && (
            <div className="cal-mini-dots">
              {hasExam && <span className="cal-dot cal-dot-exam" />}
              {hasReviews && <span className="cal-dot cal-dot-review" />}
              {hasActivity && <span className="cal-dot cal-dot-activity" />}
            </div>
          )}
        </div>
      );
    }

    const maxPills = weekMode ? 5 : 2;
    return (
      <div
        key={ds}
        className={['cal-cell', isToday?'cal-today':'', isPast?'cal-past':'', !inMonth?'cal-out':'', hasExam?'cal-exam-day':'', isSelected?'cal-selected':''].join(' ')}
        onClick={() => setSelectedDate(isSelected ? null : ds)}
      >
        <div className="cal-cell-num">{d.getDate()}</div>
        {hasActivity && <div className="cal-activity-bar" style={{ width: `${Math.min(100,(data.sessionMins/120)*100)}%` }} />}
        <div className="cal-cell-events">
          {data.exams.map(e => <div key={e.id} className="cal-pill cal-pill-exam">{e.name}</div>)}
          {data.reviews.slice(0, maxPills).map((r, i) => (
            <div key={i} className="cal-pill cal-pill-review" style={{ '--sc': r.subject.color }}>
              {r.subject.glyph} {r.subtopic ? r.subtopic.name : r.topic.name}
            </div>
          ))}
          {data.reviews.length > maxPills && <div className="cal-pill-more">+{data.reviews.length - maxPills}</div>}
        </div>
      </div>
    );
  };

  const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const renderWeekView = () => {
    const mon = new Date(anchor);
    mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));
    const days = Array.from({length:7}, (_,i) => { const d = new Date(mon); d.setDate(mon.getDate()+i); return toDS(d); });
    return (
      <div className="cal-week-grid">
        {days.map((ds, i) => (
          <div key={ds} className="cal-week-col">
            <div className={`cal-week-col-label ${ds === todayStr ? 'cal-today-label' : ''}`}>
              <span className="cal-week-day-name">{DAY_LABELS[i]}</span>
              <span className="cal-week-day-num">{new Date(ds+'T00:00:00').getDate()}</span>
            </div>
            {renderCell(ds, { weekMode: true })}
          </div>
        ))}
      </div>
    );
  };

  const renderMonthView = () => {
    const cells = getMonthCells(anchor.getFullYear(), anchor.getMonth());
    return (
      <div>
        <div className="cal-day-labels">{DAY_LABELS.map(d => <div key={d} className="cal-day-label">{d}</div>)}</div>
        <div className="cal-month-grid">{cells.map(({ ds, inMonth }) => renderCell(ds, { inMonth }))}</div>
      </div>
    );
  };

  const renderYearView = () => {
    const year = anchor.getFullYear();
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return (
      <div className="cal-year-grid">
        {MONTHS.map((name, m) => {
          const cells = getMonthCells(year, m);
          return (
            <div key={m} className="cal-year-month">
              <div className="cal-year-month-name">{name}</div>
              <div className="cal-year-day-labels">{DAY_LABELS.map(d => <div key={d} className="cal-year-day-label">{d[0]}</div>)}</div>
              <div className="cal-year-month-grid">{cells.map(({ ds, inMonth }) => renderCell(ds, { inMonth, mini: true }))}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayDetail = () => {
    if (!selectedDate) return null;
    const data = dayMap[selectedDate] || { reviews: [], exams: [], sessionMins: 0 };
    const dateLabel = new Date(selectedDate+'T00:00:00').toLocaleDateString('en-IE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const isEmpty = data.reviews.length === 0 && data.exams.length === 0 && data.sessionMins === 0;

    return (
      <div className="cal-day-detail">
        <div className="cal-detail-header">
          <span className="cal-detail-date">{dateLabel}</span>
          <button className="cal-detail-close" onClick={() => setSelectedDate(null)} aria-label="Close">✕</button>
        </div>
        {isEmpty && <p className="cal-detail-empty">Nothing scheduled for this day.</p>}
        {data.exams.length > 0 && (
          <div className="cal-detail-section">
            <div className="cal-detail-section-title">Exams & Tests</div>
            {data.exams.map(e => {
              const days = getDaysUntilExam(e.date);
              return (
                <div key={e.id} className="cal-detail-exam">
                  <span className="cal-detail-exam-glyph">𓋹</span>
                  <div>
                    <div className="cal-detail-exam-name">{e.name}</div>
                    <div className="cal-detail-exam-countdown">
                      {days === 0 ? 'Today!' : days > 0 ? `In ${days} day${days!==1?'s':''}` : `${Math.abs(days)} day${Math.abs(days)!==1?'s':''} ago`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {data.reviews.length > 0 && (
          <div className="cal-detail-section">
            <div className="cal-detail-section-title">Reviews Due ({data.reviews.length})</div>
            <div className="cal-detail-review-list">
              {data.reviews.map((r, i) => (
                <div key={i} className="cal-detail-review" style={{ '--sc': r.subject.color }}>
                  <span className="cal-detail-review-glyph" style={{ color: r.subject.color }}>{r.subject.glyph}</span>
                  <div className="cal-detail-review-info">
                    <div className="cal-detail-review-subject">{r.subject.name}</div>
                    <div className="cal-detail-review-topic">
                      {r.subtopic ? `${r.topic.name} › ${r.subtopic.name}` : r.topic.name}
                    </div>
                  </div>
                  {selectedDate <= todayStr && (
                    <button className="log-btn cal-study-btn" onClick={() => { onStudy(r.subject.id, r.topic.id, r.subtopic?.id); setSelectedDate(null); }}>
                      Study
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.sessionMins > 0 && (
          <div className="cal-detail-section">
            <div className="cal-detail-section-title">Study Logged</div>
            <div className="cal-detail-mins">𓇳 {data.sessionMins} minute{data.sessionMins!==1?'s':''} studied</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cal-view">
      {nextExam && (
        <div className="cal-exam-banner">
          <span className="cal-exam-banner-icon">𓋹</span>
          <span className="cal-exam-banner-text">
            <strong>{nextExam.name}</strong>
            {' — '}
            {getDaysUntilExam(nextExam.date) === 0
              ? 'Today!'
              : getDaysUntilExam(nextExam.date) > 0
              ? `${getDaysUntilExam(nextExam.date)} day${getDaysUntilExam(nextExam.date)!==1?'s':''} away`
              : 'Past'}
          </span>
          <span className="cal-exam-banner-date">{new Date(nextExam.date+'T00:00:00').toLocaleDateString('en-IE',{day:'numeric',month:'short',year:'numeric'})}</span>
        </div>
      )}

      <div className="cal-toolbar">
        <div className="cal-mode-btns">
          {['week','month','year'].map(m => (
            <button key={m} className={`cal-mode-btn ${calMode===m?'active':''}`} onClick={() => setCalMode(m)}>
              {m.charAt(0).toUpperCase()+m.slice(1)}
            </button>
          ))}
        </div>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => navigate(-1)} aria-label="Previous">‹</button>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          <span className="cal-nav-label">{headerLabel}</span>
          <button className="cal-nav-btn" onClick={() => navigate(1)} aria-label="Next">›</button>
        </div>
        <button className="cal-add-exam-btn" onClick={() => { setShowAddExam(p => !p); setAddExamName(''); setAddExamDate(''); }}>
          + Add Test
        </button>
      </div>

      {showAddExam && (
        <div className="cal-add-exam-form">
          <input
            className="cal-add-exam-input"
            placeholder="Test / exam name…"
            value={addExamName}
            onChange={e => setAddExamName(e.target.value)}
            autoFocus
          />
          <input
            className="cal-add-exam-input"
            type="date"
            value={addExamDate}
            onChange={e => setAddExamDate(e.target.value)}
          />
          <button
            className="cal-add-exam-submit"
            disabled={!addExamName.trim() || !addExamDate}
            onClick={() => { onAddExam(addExamName.trim(), addExamDate); setShowAddExam(false); setAddExamName(''); setAddExamDate(''); }}
          >
            Save
          </button>
          <button className="cal-add-exam-cancel" onClick={() => setShowAddExam(false)}>Cancel</button>
        </div>
      )}

      <div className="cal-body">
        {calMode === 'week' && renderWeekView()}
        {calMode === 'month' && renderMonthView()}
        {calMode === 'year' && renderYearView()}
      </div>

      {renderDayDetail()}
    </div>
  );
}

function KnowledgeView({ state }) {
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);

  const kColor = (k) => {
    if (!k || k < 1) return 'rgba(92,74,53,0.3)';
    if (k < 2) return '#b85c38';
    if (k < 3) return '#c9883c';
    if (k < 4) return '#c9a961';
    return '#4a7c59';
  };
  const kLabel = (k) => {
    if (!k) return 'Not started';
    if (k < 1.5) return 'Weak';
    if (k < 2.5) return 'Developing';
    if (k < 3.5) return 'Competent';
    if (k < 4.5) return 'Strong';
    return 'Mastered';
  };
  const kPct = (k) => (k && k >= 1) ? Math.max(4, ((k - 1) / 4) * 100) : 0;

  const subjectSummaries = useMemo(() => {
    return state.subjects.map(subj => {
      const kVals = [];
      subj.topics.forEach(t => {
        const subs = t.subtopics || [];
        if (subs.length === 0) { if (t.lastStudied) kVals.push(t.knowledge || 1); }
        else subs.forEach(st => { if (st.lastStudied) kVals.push(st.knowledge || 1); });
      });
      const avg = kVals.length ? kVals.reduce((a, v) => a + v, 0) / kVals.length : null;
      const totalItems = subj.topics.reduce((a, t) => a + ((t.subtopics || []).length || 1), 0);
      const studiedItems = subj.topics.reduce((a, t) => {
        const subs = t.subtopics || [];
        return a + (subs.length === 0 ? (t.lastStudied ? 1 : 0) : subs.filter(st => st.lastStudied).length);
      }, 0);
      return { subject: subj, avg, studiedItems, totalItems };
    }).sort((a, b) => (b.avg || 0) - (a.avg || 0));
  }, [state.subjects]);

  const getTopicRows = (subj) => subj.topics.map(t => {
    const subs = t.subtopics || [];
    const studiedSubs = subs.filter(st => st.lastStudied);
    const effectiveK = subs.length === 0
      ? (t.lastStudied ? (t.knowledge || 1) : null)
      : (studiedSubs.length ? studiedSubs.reduce((a, st) => a + (st.knowledge || 1), 0) / studiedSubs.length : null);
    return { topic: t, effectiveK, studiedCount: subs.length === 0 ? (t.lastStudied ? 1 : 0) : studiedSubs.length, totalCount: subs.length || 1 };
  }).sort((a, b) => (b.effectiveK || 0) - (a.effectiveK || 0));

  const unstudiedTopics = useMemo(() => {
    const out = [];
    state.subjects.forEach(subj => subj.topics.forEach(t => {
      const subs = t.subtopics || [];
      const anyStudied = subs.length === 0 ? !!t.lastStudied : subs.some(st => st.lastStudied);
      if (!anyStudied) out.push({ topic: t, subject: subj });
    }));
    return out;
  }, [state.subjects]);

  const unstudiedSubtopics = useMemo(() => {
    const out = [];
    state.subjects.forEach(subj => subj.topics.forEach(t =>
      (t.subtopics || []).forEach(st => {
        if (!st.lastStudied) out.push({ subtopic: st, topic: t, subject: subj });
      })
    ));
    return out;
  }, [state.subjects]);

  // Overall summary stats
  const overallStats = useMemo(() => {
    const all = subjectSummaries.filter(s => s.avg !== null);
    const overallAvg = all.length ? all.reduce((a, s) => a + s.avg, 0) / all.length : null;
    const totalStudied = subjectSummaries.reduce((a, s) => a + s.studiedItems, 0);
    const totalItems = subjectSummaries.reduce((a, s) => a + s.totalItems, 0);
    const best = all[0] || null;
    const worst = all.length > 1 ? all[all.length - 1] : null;
    return { overallAvg, totalStudied, totalItems, best, worst };
  }, [subjectSummaries]);

  const toggleSubject = (id) => { setExpandedSubject(p => p === id ? null : id); setExpandedTopic(null); };
  const toggleTopic = (key) => setExpandedTopic(p => p === key ? null : key);

  return (
    <div className="kv-view">

      {/* Overview bar */}
      <div className="kv-overview">
        <div className="kv-ov-card">
          <div className="kv-ov-value" style={{ color: kColor(overallStats.overallAvg) }}>
            {overallStats.overallAvg ? overallStats.overallAvg.toFixed(1) : '—'}
          </div>
          <div className="kv-ov-label">Avg Knowledge</div>
        </div>
        <div className="kv-ov-card">
          <div className="kv-ov-value">{overallStats.totalStudied}<span className="kv-ov-denom">/{overallStats.totalItems}</span></div>
          <div className="kv-ov-label">Items Studied</div>
        </div>
        {overallStats.best && (
          <div className="kv-ov-card">
            <div className="kv-ov-value" style={{ color: overallStats.best.subject.color }}>{overallStats.best.subject.glyph} {overallStats.best.subject.name}</div>
            <div className="kv-ov-label">Strongest Subject</div>
          </div>
        )}
        {overallStats.worst && (
          <div className="kv-ov-card">
            <div className="kv-ov-value" style={{ color: overallStats.worst.subject.color }}>{overallStats.worst.subject.glyph} {overallStats.worst.subject.name}</div>
            <div className="kv-ov-label">Needs Most Work</div>
          </div>
        )}
      </div>

      {/* Subject rankings */}
      <h2 className="section-title">Subjects</h2>
      <p className="section-sub">Ranked by average knowledge — click to expand chapters</p>

      <div className="kv-list">
        {subjectSummaries.map(({ subject, avg, studiedItems, totalItems }, rank) => {
          const isOpen = expandedSubject === subject.id;
          const topicRows = isOpen ? getTopicRows(subject) : [];

          return (
            <div key={subject.id} className={`kv-subject-card ${isOpen ? 'kv-open' : ''}`} style={{ '--kv-delay': `${rank * 50}ms` }}>
              <div className="kv-subject-row" onClick={() => toggleSubject(subject.id)} style={{ '--sc': subject.color }}>
                <div className="kv-rank">#{rank + 1}</div>
                <span className="kv-glyph" style={{ color: subject.color }}>{subject.glyph}</span>
                <div className="kv-bar-group">
                  <div className="kv-name">{subject.name}</div>
                  <div className="kv-bar">
                    <div className="kv-bar-fill" style={{ width: `${kPct(avg)}%`, background: kColor(avg) }} />
                  </div>
                </div>
                <div className="kv-meta">
                  <span className="kv-score" style={{ color: kColor(avg) }}>{avg ? avg.toFixed(1) : '—'}</span>
                  <span className="kv-label-tag" style={{ color: kColor(avg) }}>{kLabel(avg)}</span>
                  <span className="kv-progress-text">{studiedItems}/{totalItems}</span>
                </div>
                <span className={`kv-chevron ${isOpen ? 'kv-chevron-open' : ''}`}>›</span>
              </div>

              {isOpen && (
                <div className="kv-topics">
                  {topicRows.map(({ topic, effectiveK, studiedCount, totalCount }) => {
                    const topicKey = `${subject.id}::${topic.id}`;
                    const isTopicOpen = expandedTopic === topicKey;
                    const hasSubs = (topic.subtopics || []).length > 0;
                    const sortedSubs = hasSubs
                      ? [
                          ...(topic.subtopics || []).filter(st => st.lastStudied).sort((a, b) => (b.knowledge || 0) - (a.knowledge || 0)),
                          ...(topic.subtopics || []).filter(st => !st.lastStudied),
                        ]
                      : [];

                    return (
                      <div key={topic.id} className="kv-topic-block">
                        <div
                          className={`kv-topic-row ${hasSubs ? 'kv-clickable' : ''}`}
                          onClick={() => hasSubs && toggleTopic(topicKey)}
                        >
                          <div className="kv-topic-name">{topic.name}</div>
                          <div className="kv-topic-bar-wrap">
                            <div className="kv-topic-bar">
                              <div className="kv-topic-bar-fill" style={{ width: `${kPct(effectiveK)}%`, background: kColor(effectiveK) }} />
                            </div>
                          </div>
                          <div className="kv-topic-meta">
                            <span className="kv-topic-score" style={{ color: kColor(effectiveK) }}>
                              {effectiveK ? effectiveK.toFixed(1) : '—'}
                            </span>
                            {hasSubs && <span className="kv-topic-sub-ct">{studiedCount}/{totalCount}</span>}
                          </div>
                          {hasSubs && <span className={`kv-chevron-sm ${isTopicOpen ? 'kv-chevron-open' : ''}`}>›</span>}
                        </div>

                        {isTopicOpen && (
                          <div className="kv-subtopics">
                            {sortedSubs.map(st => (
                              <div key={st.id} className={`kv-subtopic-row ${!st.lastStudied ? 'kv-unseen' : ''}`}>
                                <div className="kv-st-name">{st.name}</div>
                                <div className="kv-st-bar">
                                  <div className="kv-st-bar-fill" style={{ width: `${kPct(st.lastStudied ? (st.knowledge || 1) : 0)}%`, background: kColor(st.lastStudied ? (st.knowledge || 1) : null) }} />
                                </div>
                                <span className="kv-st-score" style={{ color: kColor(st.lastStudied ? (st.knowledge || 1) : null) }}>
                                  {st.lastStudied ? (st.knowledge || 1) : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Not Yet Started */}
      {(unstudiedTopics.length > 0 || unstudiedSubtopics.length > 0) && (
        <div className="kv-not-started">
          <h2 className="section-title" style={{ marginTop: '2rem' }}>Not Yet Started</h2>
          <p className="section-sub">Content you haven't studied yet — use this to spot gaps</p>

          <div className="kv-ns-grid">
            {unstudiedTopics.length > 0 && (
              <div className="kv-ns-card">
                <div className="kv-ns-header">
                  <span className="kv-ns-title">Chapters</span>
                  <span className="kv-ns-count">{unstudiedTopics.length}</span>
                </div>
                <div className="kv-ns-list">
                  {unstudiedTopics.map(({ topic, subject }) => (
                    <div key={topic.id} className="kv-ns-item">
                      <span className="kv-ns-glyph" style={{ color: subject.color }}>{subject.glyph}</span>
                      <div>
                        <div className="kv-ns-name">{topic.name}</div>
                        <div className="kv-ns-sub">{subject.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unstudiedSubtopics.length > 0 && (
              <div className="kv-ns-card">
                <div className="kv-ns-header">
                  <span className="kv-ns-title">Subtopics</span>
                  <span className="kv-ns-count">{unstudiedSubtopics.length}</span>
                </div>
                <div className="kv-ns-list">
                  {unstudiedSubtopics.map(({ subtopic, topic, subject }) => (
                    <div key={subtopic.id} className="kv-ns-item">
                      <span className="kv-ns-glyph" style={{ color: subject.color }}>{subject.glyph}</span>
                      <div>
                        <div className="kv-ns-name">{subtopic.name}</div>
                        <div className="kv-ns-sub">{subject.name} › {topic.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
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

  const heatmap = useMemo(() => {
    const days = 91;
    const cells = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const dayStr = d.toDateString();
      const mins = state.sessions.filter(s => new Date(s.date).toDateString() === dayStr).reduce((a, s) => a + s.minutes, 0);
      cells.push({ date: d, mins, label: d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) });
    }
    return cells;
  }, [state.sessions]);

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

      <div className="chart-card">
        <h3>Activity — last 91 days</h3>
        <div className="heatmap">
          {heatmap.map((cell, i) => {
            const intensity = cell.mins === 0 ? 0 : cell.mins < 30 ? 1 : cell.mins < 60 ? 2 : cell.mins < 120 ? 3 : 4;
            return (
              <div
                key={i}
                className={`heat-cell heat-${intensity}`}
                title={`${cell.label}: ${cell.mins}min`}
              />
            );
          })}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0,1,2,3,4].map(n => <div key={n} className={`heat-cell heat-${n}`} />)}
          <span>More</span>
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
  const particles = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div className="level-up-overlay">
      <div className="level-up-card">
        <div className="level-up-shimmer" />
        <div className="level-up-particles" aria-hidden="true">
          {particles.map(i => (
            <div key={i} className="lv-particle" style={{ '--angle': `${i * 22.5}deg`, '--delay': `${i * 40}ms` }} />
          ))}
        </div>
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

function LogStudyModal({ topic, subject, onLog, onClose, subtopics }) {
  const [minutes, setMinutes] = useState(30);
  const [knowledge, setKnowledge] = useState(topic.knowledge);
  const [selectedIds, setSelectedIds] = useState(() =>
    subtopics ? subtopics.map(st => st.id) : null
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecs, setTimerSecs] = useState(0);
  const timerRef = useRef(null);

  const isGroupMode = !!subtopics;

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const stopTimer = () => {
    setTimerRunning(false);
    const m = Math.max(1, Math.round(timerSecs / 60));
    setMinutes(m);
    setTimerSecs(0);
  };

  const timerDisplay = `${String(Math.floor(timerSecs / 60)).padStart(2, '0')}:${String(timerSecs % 60).padStart(2, '0')}`;

  const minutesEach = selectedIds && selectedIds.length > 0 ? Math.max(1, Math.round(minutes / selectedIds.length)) : minutes;
  const xpPreview = isGroupMode
    ? (subtopics || [])
        .filter(st => selectedIds.includes(st.id))
        .reduce((sum, st) => sum + Math.floor(minutesEach / 15) * 10 + Math.max(0, knowledge - st.knowledge) * 25 + 5, 0)
    : Math.floor(minutes / 15) * 10 + Math.max(0, knowledge - topic.knowledge) * 25 + 5;

  const toggleId = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleLog = () => {
    if (isGroupMode) {
      onLog(minutes, knowledge, selectedIds);
    } else {
      onLog(minutes, knowledge);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal log-modal" onClick={e => e.stopPropagation()} style={{ '--subject-color': subject.color }}>
        <div className="modal-glyph">{subject.glyph}</div>
        <h2>Log study session</h2>
        <p className="modal-topic">{topic.name}</p>

        {isGroupMode && (
          <div className="group-subtopic-picker">
            <div className="group-subtopic-header">
              <span className="form-label" style={{ margin: 0 }}>Which subtopics did you study?</span>
              <div className="group-select-btns">
                <button className="group-select-btn" onClick={() => setSelectedIds(subtopics.map(st => st.id))}>All</button>
                <button className="group-select-btn" onClick={() => setSelectedIds([])}>None</button>
              </div>
            </div>
            <div className="group-subtopic-list">
              {subtopics.map(st => (
                <label key={st.id} className={`group-subtopic-item ${selectedIds.includes(st.id) ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(st.id)}
                    onChange={() => toggleId(st.id)}
                  />
                  <span>{st.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="timer-row">
          {timerRunning ? (
            <>
              <span className="timer-display">{timerDisplay}</span>
              <button className="timer-stop-btn" onClick={stopTimer}>Stop & fill</button>
            </>
          ) : (
            <button className="timer-start-btn" onClick={() => setTimerRunning(true)}>
              ▶ Start timer
            </button>
          )}
        </div>

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
          {isGroupMode && selectedIds.length > 1 && (
            <span className="xp-group-note"> ({minutesEach}min each across {selectedIds.length} subtopics)</span>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleLog}
            disabled={isGroupMode && selectedIds.length === 0}
          >
            Log it
          </button>
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
    --shadow-sm: 0 1px 3px rgba(43,29,14,0.08), 0 1px 2px rgba(43,29,14,0.06);
    --shadow-card: 0 2px 8px rgba(43,29,14,0.1), 0 1px 3px rgba(43,29,14,0.07);
    --shadow-card-hover: 0 10px 28px rgba(43,29,14,0.16), 0 4px 10px rgba(43,29,14,0.1);
    --shadow-modal: 0 24px 64px rgba(43,29,14,0.4), 0 8px 24px rgba(43,29,14,0.18);
  }

  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Crimson+Pro:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: var(--papyrus); min-height: 100vh; }

  .app {
    min-height: 100vh;
    background: transparent;
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
    z-index: 2;
    mix-blend-mode: multiply;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 1.25rem 2rem 1.25rem;
    border-bottom: 1px solid rgba(201,169,97,0.3);
    position: sticky;
    top: 0;
    z-index: 10;
    flex-wrap: wrap;
    gap: 1rem;
    margin-left: -2rem;
    margin-right: -2rem;
    margin-top: -2rem;
    background: rgba(244, 234, 213, 0.72);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    box-shadow: 0 1px 0 rgba(201,169,97,0.2), 0 4px 24px rgba(43,29,14,0.06);
  }

  .header-left { display: flex; align-items: center; gap: 1rem; }

  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.6rem;
  }

  .xp-level-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
  }

  .xp-level-bar-track {
    flex: 1;
    height: 6px;
    background: rgba(43,29,14,0.1);
    border-radius: 3px;
    overflow: hidden;
    min-width: 120px;
  }

  .xp-level-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--gold-dark), var(--gold));
    border-radius: 3px;
    transition: width 0.8s cubic-bezier(0.2,0,0,1);
    box-shadow: 0 0 6px rgba(201,169,97,0.5);
  }

  .xp-level-bar-label {
    font-family: var(--sans);
    font-size: 0.62rem;
    color: var(--ink-soft);
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  .logo {
    font-size: 3rem;
    color: var(--gold-dark);
    line-height: 1;
    animation: logoFloat 6s ease-in-out infinite;
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

  .stats { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; }

  .stat-badge {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(201,169,97,0.5);
    border-radius: 10px;
    min-width: 85px;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s;
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
    z-index: 3;
    flex-wrap: wrap;
  }

  .nav-btn {
    background: rgba(255,255,255,0.4);
    border: 1px solid rgba(201,169,97,0.4);
    color: var(--ink-soft);
    padding: 0.6rem 1.25rem;
    font-family: var(--sans);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: var(--shadow-sm);
  }

  .nav-btn:hover { background: rgba(201, 169, 97, 0.2); color: var(--ink); }

  .nav-btn.active {
    background: var(--ink);
    color: var(--papyrus);
    border-color: var(--ink);
    box-shadow: 0 4px 12px rgba(43,29,14,0.25);
  }

  .badge {
    background: var(--terracotta);
    color: white;
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 20px;
    min-width: 18px;
    text-align: center;
    box-shadow: 0 1px 4px rgba(184,92,56,0.4);
  }

  .main { position: relative; z-index: 3; }

  .subject-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.25rem;
  }

  .subject-card {
    background: rgba(255, 248, 235, 0.35);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-top: 4px solid var(--subject-color);
    padding: 1.5rem;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    transition: transform 0.4s cubic-bezier(0.2,0,0,1), box-shadow 0.4s cubic-bezier(0.2,0,0,1), background 0.3s;
    position: relative;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(43,29,14,0.1), inset 0 1px 0 rgba(255,255,255,0.7);
    transform-style: preserve-3d;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .subject-card:hover {
    background: rgba(255, 248, 235, 0.55);
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
    height: 8px;
    background: rgba(43, 29, 14, 0.1);
    overflow: hidden;
    border-radius: 4px;
    margin-top: 0.25rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--subject-color), color-mix(in srgb, var(--subject-color) 75%, white));
    transition: width 0.6s cubic-bezier(0.2,0,0,1);
    border-radius: 4px;
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
    padding: 0.7rem 1.25rem;
    font-family: var(--sans);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(43,29,14,0.25);
  }

  .add-btn:hover { background: var(--subject-color); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(43,29,14,0.3); }

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
    background: rgba(255, 248, 235, 0.3);
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    border: 1px solid rgba(255,255,255,0.45);
    border-left: 4px solid var(--subject-color);
    border-radius: 12px;
    transition: all 0.25s cubic-bezier(0.2,0,0,1);
    box-shadow: 0 2px 16px rgba(43,29,14,0.08), inset 0 1px 0 rgba(255,255,255,0.6);
    overflow: hidden;
  }

  .topic-card:hover { background: rgba(255, 248, 235, 0.5); box-shadow: 0 8px 28px rgba(43,29,14,0.13), inset 0 1px 0 rgba(255,255,255,0.7); transform: translateY(-2px); }

  .topic-card.expanded { background: rgba(255, 248, 235, 0.6); }

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
    width: 16px;
    height: 8px;
    background: rgba(43, 29, 14, 0.12);
    border-radius: 3px;
    transition: background 0.2s;
  }

  .kbar-seg.filled { background: var(--subject-color, var(--gold-dark)); }

  .review-tag {
    font-family: var(--sans);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.2rem 0.65rem;
    border-radius: 20px;
    font-weight: 500;
    white-space: nowrap;
  }

  .status-new { background: rgba(43, 29, 14, 0.08); color: var(--ink-soft); }
  .status-scheduled { background: rgba(74, 124, 89, 0.12); color: #2d5139; }
  .status-soon { background: rgba(201, 169, 97, 0.22); color: var(--gold-dark); }
  .status-today { background: rgba(184, 92, 56, 0.15); color: var(--terracotta); font-weight: 600; }
  .status-overdue { background: var(--terracotta); color: white; font-weight: 600; box-shadow: 0 2px 6px rgba(184,92,56,0.35); }

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
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(43,29,14,0.2);
  }

  .log-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(43,29,14,0.25); filter: brightness(1.08); }

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
    width: 42px;
    height: 42px;
    border: 1px solid rgba(201,169,97,0.5);
    background: rgba(255,255,255,0.5);
    font-family: var(--display);
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: 8px;
    color: var(--ink-soft);
    transition: all 0.15s;
    box-shadow: var(--shadow-sm);
  }

  .k-btn:hover { background: rgba(201, 169, 97, 0.2); color: var(--ink); transform: translateY(-1px); }

  .k-btn.active {
    background: var(--subject-color, var(--ink));
    color: white;
    border-color: transparent;
    box-shadow: 0 3px 10px rgba(43,29,14,0.25);
    transform: translateY(-1px);
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
    border: 1px solid rgba(201,169,97,0.5);
    background: rgba(255, 255, 255, 0.65);
    font-family: var(--body);
    font-size: 1rem;
    color: var(--ink);
    border-radius: 8px;
    resize: vertical;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-shadow: inset 0 1px 3px rgba(43,29,14,0.05);
  }

  .detail-row textarea:focus,
  .detail-row input:focus {
    outline: none;
    border-color: var(--subject-color);
    background: rgba(255,255,255,0.9);
    box-shadow: inset 0 1px 3px rgba(43,29,14,0.05), 0 0 0 3px rgba(201,169,97,0.15);
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
    padding: 0.75rem 1rem;
    background: rgba(201, 169, 97, 0.08);
    border-radius: 8px;
    border: 1px solid rgba(201,169,97,0.2);
  }

  .review-info strong { color: var(--ink); font-weight: 600; }

  .delete-btn {
    background: none;
    border: 1px solid rgba(184, 92, 56, 0.35);
    color: var(--terracotta);
    padding: 0.4rem 0.9rem;
    font-family: var(--sans);
    font-size: 0.74rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    border-radius: 7px;
    transition: all 0.2s;
  }

  .delete-btn:hover {
    background: var(--terracotta);
    color: white;
    box-shadow: 0 2px 8px rgba(184,92,56,0.35);
  }

  .review-view { animation: fadeUp 0.4s ease; }

  .section-title {
    font-family: var(--display);
    font-size: 2.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, var(--ink) 0%, var(--ink-soft) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .section-sub {
    font-family: var(--sans);
    font-size: 0.88rem;
    color: var(--ink-soft);
    margin-bottom: 1.75rem;
    letter-spacing: 0.02em;
  }

  .review-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }

  .review-list .review-card {
    animation: fadeUp 0.45s cubic-bezier(0.2,0,0,1) both;
  }
  .review-list .review-card:nth-child(2) { animation-delay: 50ms; }
  .review-list .review-card:nth-child(3) { animation-delay: 100ms; }
  .review-list .review-card:nth-child(4) { animation-delay: 150ms; }
  .review-list .review-card:nth-child(n+5) { animation-delay: 180ms; }

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
    background: rgba(255, 248, 235, 0.3);
    backdrop-filter: blur(14px) saturate(150%);
    -webkit-backdrop-filter: blur(14px) saturate(150%);
    border: 1px solid rgba(255,255,255,0.45);
    border-left: 4px solid var(--subject-color);
    border-radius: 12px;
    gap: 1rem;
    flex-wrap: wrap;
    box-shadow: 0 2px 16px rgba(43,29,14,0.08), inset 0 1px 0 rgba(255,255,255,0.6);
    transition: all 0.25s cubic-bezier(0.2,0,0,1);
  }

  .review-card:hover { background: rgba(255,248,235,0.5); box-shadow: 0 8px 28px rgba(43,29,14,0.12), inset 0 1px 0 rgba(255,255,255,0.7); transform: translateY(-2px); }

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

  .stats-grid .stat-card { animation: fadeUp 0.45s cubic-bezier(0.2,0,0,1) both; }
  .stats-grid .stat-card:nth-child(2) { animation-delay: 60ms; }
  .stats-grid .stat-card:nth-child(3) { animation-delay: 120ms; }
  .stats-grid .stat-card:nth-child(4) { animation-delay: 180ms; }

  .stat-card {
    background: rgba(255, 248, 235, 0.3);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.5);
    padding: 1.5rem;
    text-align: center;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(43,29,14,0.09), inset 0 1px 0 rgba(255,255,255,0.7);
    transition: all 0.3s cubic-bezier(0.2,0,0,1);
  }

  .stat-card:hover { box-shadow: 0 10px 32px rgba(43,29,14,0.14), inset 0 1px 0 rgba(255,255,255,0.8); transform: translateY(-3px) scale(1.01); }

  .stat-big {
    font-family: var(--display);
    font-size: 3rem;
    font-weight: 600;
    color: var(--gold-dark);
    line-height: 1;
  }

  .stat-desc {
    font-family: var(--sans);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-top: 0.5rem;
  }

  .chart-card {
    background: rgba(255, 248, 235, 0.3);
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    border: 1px solid rgba(255,255,255,0.45);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(43,29,14,0.09), inset 0 1px 0 rgba(255,255,255,0.6);
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
    background: rgba(43, 29, 14, 0.5);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
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
    background: rgba(253, 246, 230, 0.75);
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.6);
    border-top: 4px solid var(--subject-color, var(--gold-dark));
    padding: 2rem;
    max-width: 480px;
    width: 100%;
    border-radius: 20px;
    animation: modalIn 0.35s cubic-bezier(0.34,1.2,0.64,1);
    box-shadow: 0 32px 80px rgba(43,29,14,0.3), 0 8px 24px rgba(43,29,14,0.12), inset 0 1px 0 rgba(255,255,255,0.8);
  }

  @keyframes modalIn {
    from { opacity: 0; transform: translateY(24px) scale(0.94); }
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
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .btn-ghost {
    background: rgba(255,255,255,0.5);
    border: 1px solid rgba(201,169,97,0.5);
    color: var(--ink-soft);
  }

  .btn-ghost:hover { background: rgba(201,169,97,0.12); color: var(--ink); }

  .btn-primary {
    background: var(--subject-color, var(--ink));
    border: 1px solid transparent;
    color: white;
    box-shadow: 0 2px 8px rgba(43,29,14,0.2);
  }

  .btn-primary:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(43,29,14,0.25); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

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
    border: 1px solid rgba(201,169,97,0.5);
    background: rgba(255,255,255,0.5);
    font-family: var(--display);
    font-size: 1rem;
    cursor: pointer;
    border-radius: 8px;
    color: var(--ink-soft);
    transition: all 0.15s;
    box-shadow: var(--shadow-sm);
  }

  .time-btn:hover { background: rgba(201, 169, 97, 0.2); color: var(--ink); transform: translateY(-1px); }

  .time-btn.active {
    background: var(--subject-color, var(--ink));
    color: white;
    border-color: transparent;
    box-shadow: 0 3px 10px rgba(43,29,14,0.25);
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
    background: linear-gradient(135deg, rgba(201,169,97,0.15), rgba(201,169,97,0.08));
    border: 1px solid rgba(201,169,97,0.4);
    padding: 0.75rem 1rem;
    margin-top: 1.25rem;
    text-align: center;
    font-family: var(--body);
    font-size: 0.95rem;
    color: var(--ink);
    border-radius: 10px;
    box-shadow: inset 0 1px 2px rgba(255,255,255,0.5);
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

  .xp-group-note {
    font-size: 0.8rem;
    color: var(--ink-soft);
    font-family: var(--sans);
  }

  .group-subtopic-picker {
    margin-bottom: 1.25rem;
    border: 1px solid var(--gold-dark);
    border-radius: 2px;
    overflow: hidden;
  }

  .group-subtopic-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: rgba(201, 169, 97, 0.12);
    border-bottom: 1px solid var(--gold-dark);
  }

  .group-select-btns {
    display: flex;
    gap: 0.4rem;
  }

  .group-select-btn {
    background: none;
    border: 1px solid var(--gold-dark);
    border-radius: 2px;
    padding: 0.15rem 0.5rem;
    font-family: var(--sans);
    font-size: 0.7rem;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.15s;
  }

  .group-select-btn:hover {
    background: rgba(201, 169, 97, 0.2);
    color: var(--ink);
  }

  .group-subtopic-list {
    max-height: 180px;
    overflow-y: auto;
    padding: 0.25rem 0;
  }

  .group-subtopic-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
    font-family: var(--sans);
    font-size: 0.85rem;
    color: var(--ink-soft);
    transition: background 0.1s;
  }

  .group-subtopic-item:hover {
    background: rgba(201, 169, 97, 0.1);
  }

  .group-subtopic-item.checked {
    color: var(--ink);
    font-weight: 500;
  }

  .group-subtopic-item input[type="checkbox"] {
    accent-color: var(--subject-color, var(--gold-dark));
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    cursor: pointer;
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
    background: rgba(255, 255, 255, 0.35);
    border: 1px solid rgba(154, 125, 63, 0.3);
    border-left: 3px solid var(--subject-color, var(--gold-dark));
    border-radius: 8px;
    margin-bottom: 0.4rem;
    overflow: hidden;
    transition: background 0.2s, box-shadow 0.2s;
    box-shadow: var(--shadow-sm);
  }

  .subtopic-card:hover { background: rgba(255, 255, 255, 0.55); }
  .subtopic-card.expanded { background: rgba(255, 255, 255, 0.6); }

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
    .header { flex-direction: column; align-items: flex-start; }
    .header-right { width: 100%; align-items: flex-start; }
    .stats { width: 100%; }
    .xp-level-bar { width: 100%; }
    .xp-level-bar-track { flex: 1; }
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
    background: rgba(255,255,255,0.5);
    border: 1px solid rgba(154,125,63,0.25);
    border-radius: 8px;
    font-family: var(--sans);
    font-size: 0.8rem;
    transition: all 0.2s;
    flex-wrap: wrap;
    box-shadow: var(--shadow-sm);
  }

  .session-item:hover { background: rgba(255,255,255,0.8); transform: translateX(2px); }

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
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    background: var(--terracotta);
    border: 1px solid transparent;
    color: white;
    box-shadow: 0 2px 8px rgba(184,92,56,0.35);
  }

  .btn-danger:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(184,92,56,0.4); }
  .btn-danger:active { transform: scale(0.97); }

  /* ── Level-up overlay (liquid glass) ── */
  .level-up-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    pointer-events: none;
    background: rgba(43,29,14,0.18);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    animation: lvlFadeOut 3.5s ease forwards;
  }

  @keyframes lvlFadeOut {
    0%   { opacity: 0; }
    8%   { opacity: 1; }
    72%  { opacity: 1; }
    100% { opacity: 0; }
  }

  .level-up-card {
    position: relative;
    background: rgba(253, 246, 225, 0.55);
    backdrop-filter: blur(48px) saturate(200%);
    -webkit-backdrop-filter: blur(48px) saturate(200%);
    border: 1px solid rgba(255,255,255,0.65);
    border-radius: 28px;
    padding: 3rem 4rem;
    text-align: center;
    box-shadow:
      0 0 0 1px rgba(201,169,97,0.3),
      0 0 60px rgba(201,169,97,0.35),
      0 32px 80px rgba(43,29,14,0.22),
      inset 0 1px 0 rgba(255,255,255,0.85);
    animation: lvlCardIn 0.5s cubic-bezier(0.34,1.35,0.64,1) forwards;
    overflow: hidden;
    min-width: 320px;
  }

  @keyframes lvlCardIn {
    from { transform: scale(0.7) translateY(40px); opacity: 0; filter: blur(8px); }
    to   { transform: scale(1) translateY(0);      opacity: 1; filter: blur(0); }
  }

  .level-up-shimmer {
    position: absolute;
    inset: 0;
    background: conic-gradient(from 0deg at 50% 50%,
      transparent 0deg,
      rgba(201,169,97,0.06) 40deg,
      transparent 80deg
    );
    animation: lvlSpin 6s linear infinite;
    border-radius: 28px;
  }

  @keyframes lvlSpin { to { transform: rotate(360deg); } }

  /* CSS-only burst particles */
  .level-up-particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .lv-particle {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    margin: -4px;
    border-radius: 50%;
    background: var(--gold);
    animation: particleBurst 1.1s cubic-bezier(0.2,0,0,1) forwards;
    animation-delay: var(--delay, 0ms);
    opacity: 0;
  }

  .lv-particle:nth-child(odd)  { background: var(--gold-dark); width: 5px; height: 5px; margin: -2.5px; }
  .lv-particle:nth-child(3n)   { background: var(--terracotta); }

  @keyframes particleBurst {
    0%   { opacity: 1; transform: rotate(var(--angle)) translateY(0px) scale(1); }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: rotate(var(--angle)) translateY(-110px) scale(0.2); }
  }

  .level-up-glyph {
    position: relative;
    font-size: 4.5rem;
    color: var(--gold-dark);
    line-height: 1;
    margin-bottom: 0.75rem;
    animation: glyphBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both;
    filter: drop-shadow(0 0 16px rgba(201,169,97,0.7));
  }

  @keyframes glyphBounce {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  .level-up-label {
    position: relative;
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--gold-dark);
    margin-bottom: 0.3rem;
    opacity: 0.8;
  }

  .level-up-num {
    position: relative;
    font-family: var(--display);
    font-size: 4.5rem;
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
    margin-bottom: 0.5rem;
    animation: numSlideUp 0.5s cubic-bezier(0.2,0,0,1) 0.25s both;
  }

  @keyframes numSlideUp {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .level-up-sub {
    position: relative;
    font-family: var(--body);
    font-style: italic;
    color: var(--ink-soft);
    font-size: 1rem;
    animation: numSlideUp 0.5s cubic-bezier(0.2,0,0,1) 0.35s both;
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

  /* ── Global exams ── */
  .global-exams {
    margin-bottom: 1.5rem;
    border: 1px solid rgba(255,255,255,0.45);
    border-radius: 14px;
    background: rgba(255, 248, 235, 0.3);
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(43,29,14,0.08), inset 0 1px 0 rgba(255,255,255,0.6);
  }
  .global-exams-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7rem 1.1rem;
    border-bottom: 1px solid rgba(201,169,97,0.18);
    background: rgba(201,169,97,0.08);
  }
  .global-exams-title {
    font-family: var(--sans);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-soft);
    font-weight: 600;
  }
  .global-exams-add-btn {
    background: none;
    border: 1px solid rgba(201,169,97,0.4);
    border-radius: 3px;
    color: var(--gold-dark);
    font-family: var(--sans);
    font-size: 0.72rem;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.04em;
  }
  .global-exams-add-btn:hover { background: rgba(201,169,97,0.12); }
  .global-exams-empty {
    font-family: var(--sans);
    font-size: 0.78rem;
    color: var(--ink-soft);
    padding: 0.75rem 1rem;
    margin: 0;
    font-style: italic;
  }
  .global-exam-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid rgba(201,169,97,0.15);
  }
  .global-exam-input {
    padding: 0.35rem 0.65rem;
    border: 1px solid rgba(201,169,97,0.5);
    border-radius: 7px;
    background: rgba(255,255,255,0.7);
    font-family: var(--sans);
    font-size: 0.82rem;
    color: var(--ink);
    flex: 1;
    min-width: 120px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .global-exam-input:focus { outline: none; border-color: var(--gold-dark); box-shadow: 0 0 0 3px rgba(201,169,97,0.15); }
  .global-exam-list { padding: 0.4rem 0; }
  .global-exam-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 1rem;
    border-left: 3px solid transparent;
    transition: background 0.1s;
    gap: 0.75rem;
  }
  .global-exam-card:hover { background: rgba(201,169,97,0.06); }
  .global-exam-card.urgent { border-left-color: var(--terracotta); }
  .global-exam-card.past { opacity: 0.5; }
  .global-exam-card.editing {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-left-color: var(--gold-dark);
  }
  .global-exam-info { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; }
  .global-exam-name {
    font-family: var(--body);
    font-size: 1rem;
    font-weight: 600;
    color: var(--ink);
  }
  .global-exam-date-str {
    font-family: var(--sans);
    font-size: 0.72rem;
    color: var(--ink-soft);
  }
  .global-exam-right { display: flex; align-items: center; gap: 0.5rem; }
  .global-exam-countdown {
    font-family: var(--sans);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--gold-dark);
    white-space: nowrap;
  }
  .global-exam-card.urgent .global-exam-countdown { color: var(--terracotta); }
  .global-exam-edit-btn, .global-exam-del-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--ink-soft);
    opacity: 0.5;
    padding: 0.1rem 0.25rem;
    transition: opacity 0.15s;
  }
  .global-exam-edit-btn:hover, .global-exam-del-btn:hover { opacity: 1; }
  .global-exam-del-btn:hover { color: var(--terracotta); }

  /* ── Chapter exam section in topic details ── */
  .chapter-exam-section { display: flex; flex-direction: column; gap: 0.6rem; }
  .chapter-exam-date-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
  .chapter-exam-countdown {
    font-family: var(--sans);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--gold-dark);
    padding: 0.15rem 0.45rem;
    border: 1px solid rgba(201,169,97,0.4);
    border-radius: 3px;
    background: rgba(201,169,97,0.08);
  }
  .chapter-exam-countdown.urgent { color: var(--terracotta); border-color: rgba(184,92,56,0.4); background: rgba(184,92,56,0.07); }
  .chapter-exam-clear {
    background: none;
    border: none;
    color: var(--ink-soft);
    opacity: 0.5;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.1rem 0.3rem;
    transition: opacity 0.15s;
  }
  .chapter-exam-clear:hover { opacity: 1; color: var(--terracotta); }
  .chapter-exam-subtopics { margin-top: 0.35rem; }
  .chapter-exam-sub-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.4rem;
  }
  .chapter-exam-sub-btns { display: flex; gap: 0.35rem; }
  .chapter-exam-sub-label {
    font-family: var(--sans);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-soft);
  }
  .chapter-exam-sub-list { display: flex; flex-direction: column; gap: 0.15rem; }
  .chapter-exam-sub-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--sans);
    font-size: 0.82rem;
    color: var(--ink-soft);
    cursor: pointer;
    padding: 0.25rem 0.4rem;
    border-radius: 3px;
    transition: background 0.1s;
  }
  .chapter-exam-sub-item:hover { background: rgba(201,169,97,0.08); }
  .chapter-exam-sub-item.checked { color: var(--ink); font-weight: 500; }
  .chapter-exam-sub-item input[type="checkbox"] {
    accent-color: var(--subject-color, var(--gold-dark));
    width: 13px; height: 13px; flex-shrink: 0; cursor: pointer;
  }

  /* ── Demo mode banner ── */
  .demo-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(90, 122, 158, 0.12);
    border-bottom: 1px solid rgba(90, 122, 158, 0.3);
    padding: 0.4rem 1.5rem;
    font-family: var(--sans);
    font-size: 0.75rem;
    color: #5a7a9e;
    gap: 1rem;
  }
  .demo-exit-btn {
    background: none;
    border: 1px solid rgba(90,122,158,0.4);
    border-radius: 3px;
    color: #5a7a9e;
    font-family: var(--sans);
    font-size: 0.72rem;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }
  .demo-exit-btn:hover { background: rgba(90,122,158,0.15); }

  /* ── Overdue banner ── */
  .overdue-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, rgba(184,92,56,0.1), rgba(184,92,56,0.06));
    border: 1px solid rgba(184, 92, 56, 0.35);
    border-radius: 10px;
    padding: 0.75rem 1.1rem;
    margin-bottom: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(184,92,56,0.1);
  }
  .overdue-banner:hover { background: rgba(184, 92, 56, 0.16); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(184,92,56,0.18); }
  .overdue-banner-text {
    font-family: var(--sans);
    font-size: 0.85rem;
    color: var(--terracotta);
    font-weight: 600;
  }
  .overdue-banner-cta {
    font-family: var(--sans);
    font-size: 0.78rem;
    color: var(--terracotta);
    opacity: 0.8;
  }

  /* ── Exam + goal on subject cards ── */
  .exam-dot {
    font-family: var(--sans);
    font-size: 0.65rem;
    color: var(--gold-dark);
    letter-spacing: 0.04em;
    padding: 0.1rem 0.35rem;
    border: 1px solid rgba(201,169,97,0.4);
    border-radius: 2px;
  }
  .exam-dot.urgent { color: var(--terracotta); border-color: rgba(184,92,56,0.5); }
  .goal-row { margin-top: 0.5rem; width: 100%; }
  .goal-track {
    height: 4px;
    background: rgba(43,29,14,0.12);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }
  .goal-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--subject-color, var(--gold));
    transition: width 0.4s ease;
  }
  .goal-label {
    font-family: var(--sans);
    font-size: 0.65rem;
    color: var(--ink-soft);
  }

  /* ── Subject view settings row ── */
  .subject-header-text { flex: 1; }
  .exam-countdown {
    font-family: var(--sans);
    font-size: 0.78rem;
    color: var(--gold-dark);
    margin: 0.2rem 0 0;
  }
  .exam-countdown.urgent { color: var(--terracotta); font-weight: 600; }
  .subject-settings {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.1rem;
    background: rgba(255,255,255,0.4);
    border: 1px solid rgba(201,169,97,0.25);
    border-radius: 10px;
    margin-bottom: 1.25rem;
    box-shadow: var(--shadow-sm);
  }
  .setting-item { display: flex; align-items: center; gap: 0.5rem; }
  .setting-label {
    font-family: var(--sans);
    font-size: 0.68rem;
    color: var(--ink-soft);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  .setting-input {
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--gold-dark);
    border-radius: 2px;
    background: var(--papyrus);
    font-family: var(--sans);
    font-size: 0.8rem;
    color: var(--ink);
  }
  .setting-input-sm { width: 64px; }
  .setting-goal-row { display: flex; align-items: center; gap: 0.35rem; }
  .setting-unit { font-family: var(--sans); font-size: 0.75rem; color: var(--ink-soft); }
  .setting-goal-progress { display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 180px; }

  /* ── Priority flag ── */
  /* ── Drag reorder ── */
  .drag-item { transition: opacity 0.15s; }
  .drag-item--lifting { opacity: 0.45; transform: scale(0.98); }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    font-size: 1.1rem;
    color: var(--ink-soft);
    cursor: grab;
    border-radius: 4px;
    flex-shrink: 0;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    transition: color 0.15s, background 0.15s;
  }
  .drag-handle:hover { color: var(--subject-color, var(--gold-dark)); background: rgba(0,0,0,0.05); }
  .drag-handle:active { cursor: grabbing; }
  .drag-handle--sm { font-size: 0.95rem; width: 1.2rem; height: 1.2rem; }

  .topic-card.dragging { box-shadow: 0 12px 40px rgba(43,29,14,0.22); transform: scale(1.02); z-index: 10; }
  .subtopic-card.dragging { box-shadow: 0 8px 24px rgba(43,29,14,0.18); transform: scale(1.02); }

  .subtopic-drag-list { display: flex; flex-direction: column; }

  .topic-name-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem; }
  .priority-btn {
    background: none;
    border: none;
    font-size: 0.9rem;
    color: rgba(43,29,14,0.2);
    cursor: pointer;
    padding: 0 0.1rem;
    line-height: 1;
    transition: color 0.15s, transform 0.1s;
    flex-shrink: 0;
  }
  .priority-btn:hover { color: var(--gold-dark); }
  .priority-btn.active { color: var(--terracotta); }
  .priority-btn:active { transform: scale(0.85); }
  .review-priority-flag {
    color: var(--terracotta);
    font-size: 0.75rem;
    margin-left: 0.35rem;
  }
  .review-card.priority {
    border-left: 3px solid var(--terracotta);
    padding-left: calc(1rem - 3px);
  }

  /* ── Knowledge sparkline ── */
  .sparkline { color: var(--subject-color, var(--gold-dark)); opacity: 0.7; vertical-align: middle; }

  /* ── Study timer ── */
  .timer-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.6rem 0.9rem;
    background: linear-gradient(135deg, rgba(201,169,97,0.1), rgba(201,169,97,0.05));
    border: 1px solid rgba(201,169,97,0.3);
    border-radius: 10px;
    box-shadow: var(--shadow-sm);
  }
  .timer-start-btn {
    background: rgba(255,255,255,0.6);
    border: 1px solid rgba(201,169,97,0.5);
    border-radius: 7px;
    padding: 0.35rem 0.9rem;
    font-family: var(--sans);
    font-size: 0.78rem;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.04em;
    box-shadow: var(--shadow-sm);
  }
  .timer-start-btn:hover { background: rgba(201,169,97,0.2); color: var(--ink); transform: translateY(-1px); }
  .timer-display {
    font-family: var(--sans);
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: 0.05em;
    flex: 1;
    text-align: center;
  }
  .timer-stop-btn {
    background: var(--terracotta);
    border: none;
    border-radius: 3px;
    padding: 0.35rem 0.8rem;
    font-family: var(--sans);
    font-size: 0.78rem;
    color: white;
    cursor: pointer;
    transition: filter 0.15s;
  }
  .timer-stop-btn:hover { filter: brightness(1.1); }

  /* ── Activity heatmap ── */
  .heatmap {
    display: grid;
    grid-template-columns: repeat(13, 1fr);
    gap: 3px;
    margin-top: 0.75rem;
  }
  .heat-cell {
    aspect-ratio: 1;
    border-radius: 2px;
    background: rgba(43,29,14,0.07);
    cursor: default;
    transition: transform 0.1s;
  }
  .heat-cell:hover { transform: scale(1.3); z-index: 1; position: relative; }
  .heat-0 { background: rgba(43,29,14,0.07); }
  .heat-1 { background: rgba(201,169,97,0.3); }
  .heat-2 { background: rgba(201,169,97,0.55); }
  .heat-3 { background: rgba(201,169,97,0.78); }
  .heat-4 { background: var(--gold-dark); }
  .heatmap-legend {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 0.5rem;
    justify-content: flex-end;
  }
  .heatmap-legend span {
    font-family: var(--sans);
    font-size: 0.65rem;
    color: var(--ink-soft);
    margin: 0 0.2rem;
  }
  .heatmap-legend .heat-cell { width: 12px; height: 12px; flex-shrink: 0; }

  /* ── Premium background orbs ── */
  .bg-orb {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    z-index: 1;
    will-change: transform;
  }

  .bg-orb-1 {
    width: 900px;
    height: 900px;
    background: radial-gradient(circle at center,
      rgba(201,169,97,0.75) 0%,
      rgba(201,169,97,0.35) 30%,
      rgba(201,169,97,0.1) 55%,
      transparent 70%);
    top: -220px;
    left: -200px;
    filter: blur(25px);
    animation: orbDrift1 28s ease-in-out infinite alternate;
  }

  .bg-orb-2 {
    width: 750px;
    height: 750px;
    background: radial-gradient(circle at center,
      rgba(184,92,56,0.6) 0%,
      rgba(184,92,56,0.25) 32%,
      rgba(184,92,56,0.08) 55%,
      transparent 70%);
    bottom: -160px;
    right: -150px;
    filter: blur(28px);
    animation: orbDrift2 35s ease-in-out infinite alternate;
  }

  .bg-orb-3 {
    width: 650px;
    height: 650px;
    background: radial-gradient(circle at center,
      rgba(42,74,107,0.45) 0%,
      rgba(42,74,107,0.18) 35%,
      rgba(42,74,107,0.05) 55%,
      transparent 70%);
    top: 38%;
    left: 48%;
    filter: blur(32px);
    animation: orbDrift3 24s ease-in-out infinite alternate;
  }

  @keyframes orbDrift1 {
    0%   { transform: translate(0px, 0px) scale(1); }
    25%  { transform: translate(60px, 80px) scale(1.06); }
    50%  { transform: translate(30px, -40px) scale(0.97); }
    75%  { transform: translate(100px, 50px) scale(1.04); }
    100% { transform: translate(50px, 120px) scale(1.08); }
  }

  @keyframes orbDrift2 {
    0%   { transform: translate(0px, 0px) scale(1); }
    33%  { transform: translate(-70px, -90px) scale(1.1); }
    66%  { transform: translate(-20px, -50px) scale(0.94); }
    100% { transform: translate(-100px, -130px) scale(1.07); }
  }

  @keyframes orbDrift3 {
    0%   { transform: translate(0px, 0px) scale(1); }
    40%  { transform: translate(60px, 80px) scale(1.08); }
    80%  { transform: translate(-40px, 30px) scale(0.95); }
    100% { transform: translate(20px, -60px) scale(1.03); }
  }

  /* ── Logo float ── */
  @keyframes logoFloat {
    0%, 100% { transform: translateY(0px); filter: drop-shadow(0 0 8px rgba(201,169,97,0.3)); }
    50%       { transform: translateY(-4px); filter: drop-shadow(0 0 18px rgba(201,169,97,0.6)); }
  }

  /* ── Grain slow drift ── */
  .grain {
    animation: grainDrift 12s steps(2) infinite;
  }

  @keyframes grainDrift {
    0%  { transform: translate(0, 0); }
    25% { transform: translate(-1%, 1%); }
    50% { transform: translate(1%, -1%); }
    75% { transform: translate(-1%, -1%); }
    100%{ transform: translate(0, 0); }
  }

  /* ── Stat badge subtle pulse on hover ── */
  .stat-badge:hover {
    box-shadow: 0 0 0 3px rgba(201,169,97,0.2), var(--shadow-sm);
  }

  /* ── Nav active tab animated underline ── */
  .nav-btn.active {
    position: relative;
  }

  .nav-btn.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    border-radius: 1px;
    animation: navUnderline 0.3s ease forwards;
  }

  @keyframes navUnderline {
    from { width: 0%; opacity: 0; }
    to   { width: 60%; opacity: 1; }
  }

  /* ── Scroll reveal — blur-up (camiferreol-inspired) ── */
  .reveal {
    opacity: 0;
    transform: translateY(18px);
    filter: blur(6px);
    transition:
      opacity  0.6s cubic-bezier(0.2,0,0,1) var(--reveal-delay, 0ms),
      transform 0.6s cubic-bezier(0.2,0,0,1) var(--reveal-delay, 0ms),
      filter   0.5s ease              var(--reveal-delay, 0ms);
  }

  .reveal.reveal-visible {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }

  /* ── Calendar View ── */
  .cal-view {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .cal-exam-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: linear-gradient(135deg, rgba(184,92,56,0.18), rgba(201,169,97,0.12));
    border: 1px solid rgba(184,92,56,0.35);
    border-radius: 12px;
    padding: 0.75rem 1.25rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .cal-exam-banner-icon { font-size: 1.25rem; }

  .cal-exam-banner-text {
    flex: 1;
    font-family: var(--sans);
    font-size: 0.85rem;
    color: var(--ink);
  }

  .cal-exam-banner-text strong { color: var(--terracotta); font-weight: 600; }

  .cal-exam-banner-date {
    font-family: var(--sans);
    font-size: 0.75rem;
    color: var(--ink-soft);
    letter-spacing: 0.05em;
  }

  .cal-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .cal-mode-btns {
    display: flex;
    background: rgba(255,248,235,0.5);
    border: 1px solid rgba(201,169,97,0.3);
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
  }

  .cal-mode-btn {
    background: none;
    border: none;
    padding: 0.35rem 0.9rem;
    font-family: var(--sans);
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-soft);
    cursor: pointer;
    border-radius: 7px;
    transition: all 0.18s;
  }

  .cal-mode-btn:hover { color: var(--ink); background: rgba(201,169,97,0.15); }

  .cal-mode-btn.active {
    background: var(--ink);
    color: var(--papyrus);
    box-shadow: 0 2px 8px rgba(43,29,14,0.2);
  }

  .cal-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cal-nav-btn {
    background: rgba(255,248,235,0.6);
    border: 1px solid rgba(201,169,97,0.35);
    border-radius: 8px;
    width: 34px;
    height: 34px;
    font-size: 1.1rem;
    color: var(--ink-soft);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s;
    line-height: 1;
  }

  .cal-nav-btn:hover { background: rgba(201,169,97,0.2); color: var(--ink); }

  .cal-today-btn {
    background: none;
    border: 1px solid rgba(201,169,97,0.4);
    border-radius: 8px;
    padding: 0.35rem 0.8rem;
    font-family: var(--sans);
    font-size: 0.73rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.18s;
  }

  .cal-today-btn:hover { background: rgba(201,169,97,0.2); color: var(--ink); }

  .cal-nav-label {
    font-family: var(--display);
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--ink);
    min-width: 180px;
    text-align: center;
  }

  .cal-add-exam-btn {
    background: rgba(184,92,56,0.1);
    border: 1px solid rgba(184,92,56,0.35);
    border-radius: 8px;
    padding: 0.38rem 0.85rem;
    font-family: var(--sans);
    font-size: 0.73rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--terracotta);
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
  }

  .cal-add-exam-btn:hover { background: rgba(184,92,56,0.18); border-color: rgba(184,92,56,0.55); }

  .cal-add-exam-form {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    background: rgba(255,248,235,0.55);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(184,92,56,0.25);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    animation: detailReveal 0.2s ease;
  }

  .cal-add-exam-input {
    background: rgba(255,248,235,0.7);
    border: 1px solid rgba(201,169,97,0.4);
    border-radius: 8px;
    padding: 0.4rem 0.75rem;
    font-family: var(--sans);
    font-size: 0.82rem;
    color: var(--ink);
    outline: none;
    flex: 1;
    min-width: 160px;
    transition: border-color 0.15s;
  }

  .cal-add-exam-input:focus { border-color: var(--gold); }

  .cal-add-exam-submit {
    background: var(--terracotta);
    border: none;
    border-radius: 8px;
    padding: 0.4rem 0.9rem;
    font-family: var(--sans);
    font-size: 0.78rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .cal-add-exam-submit:disabled { opacity: 0.4; cursor: not-allowed; }
  .cal-add-exam-submit:not(:disabled):hover { opacity: 0.88; }

  .cal-add-exam-cancel {
    background: none;
    border: 1px solid rgba(201,169,97,0.3);
    border-radius: 8px;
    padding: 0.4rem 0.75rem;
    font-family: var(--sans);
    font-size: 0.78rem;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.15s;
  }

  .cal-add-exam-cancel:hover { background: rgba(201,169,97,0.12); color: var(--ink); }

  .cal-body {
    background: rgba(255,248,235,0.35);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(201,169,97,0.25);
    border-radius: 16px;
    padding: 1.25rem;
    box-shadow: var(--shadow-card);
  }

  .cal-day-labels {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 4px;
  }

  .cal-day-label {
    font-family: var(--sans);
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-soft);
    text-align: center;
    padding: 0.3rem 0;
  }

  /* ── Month grid ── */
  .cal-month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  /* ── Week grid ── */
  .cal-week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }

  .cal-week-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cal-week-col-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.2rem;
    border-radius: 8px;
  }

  .cal-week-day-name {
    font-family: var(--sans);
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .cal-week-day-num {
    font-family: var(--display);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.1;
  }

  .cal-today-label {
    background: rgba(201,169,97,0.18);
    border-radius: 8px;
  }

  .cal-today-label .cal-week-day-num { color: var(--gold-dark); }

  /* ── Day cell (shared month/week) ── */
  .cal-cell {
    min-height: 70px;
    border-radius: 10px;
    padding: 0.45rem 0.5rem 0.5rem;
    cursor: pointer;
    transition: all 0.18s;
    position: relative;
    overflow: hidden;
    border: 1px solid transparent;
    background: rgba(255,248,235,0.4);
  }

  .cal-cell:hover {
    background: rgba(201,169,97,0.12);
    border-color: rgba(201,169,97,0.3);
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(43,29,14,0.08);
  }

  .cal-cell.cal-today {
    background: rgba(201,169,97,0.2);
    border-color: rgba(201,169,97,0.5);
    box-shadow: 0 0 0 2px rgba(201,169,97,0.25);
  }

  .cal-cell.cal-exam-day {
    border-color: rgba(184,92,56,0.45);
    background: rgba(184,92,56,0.07);
  }

  .cal-cell.cal-exam-day.cal-today {
    border-color: rgba(184,92,56,0.7);
    box-shadow: 0 0 0 2px rgba(184,92,56,0.25);
  }

  .cal-cell.cal-selected {
    background: rgba(43,29,14,0.08);
    border-color: rgba(43,29,14,0.3);
    box-shadow: 0 0 0 2px rgba(43,29,14,0.12);
  }

  .cal-cell.cal-past { opacity: 0.6; }

  .cal-cell.cal-out {
    opacity: 0.3;
    background: transparent;
  }

  .cal-cell-num {
    font-family: var(--sans);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 0.25rem;
    line-height: 1;
  }

  .cal-cell.cal-today .cal-cell-num {
    color: var(--gold-dark);
    font-size: 0.82rem;
  }

  .cal-activity-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, #4a7c59, #6ab585);
    border-radius: 0 2px 0 0;
    opacity: 0.7;
    transition: width 0.3s ease;
  }

  .cal-cell-events {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .cal-pill {
    border-radius: 4px;
    padding: 2px 5px;
    font-family: var(--sans);
    font-size: 0.65rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  .cal-pill-exam {
    background: rgba(184,92,56,0.18);
    color: var(--terracotta);
    border: 1px solid rgba(184,92,56,0.25);
  }

  .cal-pill-review {
    background: color-mix(in srgb, var(--sc) 18%, transparent);
    color: color-mix(in srgb, var(--sc) 80%, var(--ink));
    border: 1px solid color-mix(in srgb, var(--sc) 30%, transparent);
  }

  .cal-pill-more {
    font-family: var(--sans);
    font-size: 0.63rem;
    color: var(--ink-soft);
    padding-left: 2px;
  }

  /* ── Mini cells (year view) ── */
  .cal-year-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  .cal-year-month { display: flex; flex-direction: column; gap: 0.4rem; }

  .cal-year-month-name {
    font-family: var(--sans);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink);
    text-align: center;
  }

  .cal-year-day-labels {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }

  .cal-year-day-label {
    font-family: var(--sans);
    font-size: 0.55rem;
    color: var(--ink-soft);
    text-align: center;
    opacity: 0.7;
  }

  .cal-year-month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }

  .cal-mini-cell {
    aspect-ratio: 1;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--sans);
    font-size: 0.6rem;
    color: var(--ink-soft);
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
    line-height: 1;
  }

  .cal-mini-cell:hover { background: rgba(201,169,97,0.2); color: var(--ink); border-radius: 4px; }

  .cal-mini-cell.cal-today {
    background: rgba(201,169,97,0.3);
    color: var(--gold-dark);
    font-weight: 700;
    border-radius: 50%;
  }

  .cal-mini-cell.cal-exam-day {
    background: rgba(184,92,56,0.18);
    color: var(--terracotta);
    font-weight: 600;
    border-radius: 50%;
  }

  .cal-mini-cell.cal-selected {
    background: rgba(43,29,14,0.15);
    color: var(--ink);
    border-radius: 50%;
  }

  .cal-mini-cell.cal-out { opacity: 0.2; }

  .cal-mini-cell.cal-past { opacity: 0.5; }

  .cal-mini-dots {
    display: flex;
    gap: 2px;
    margin-top: 1px;
  }

  .cal-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    display: block;
  }

  .cal-dot-exam { background: var(--terracotta); }
  .cal-dot-review { background: var(--gold-dark); }
  .cal-dot-activity { background: #4a7c59; }

  /* ── Day detail panel ── */
  .cal-day-detail {
    background: rgba(255,248,235,0.55);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(201,169,97,0.3);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    box-shadow: var(--shadow-card);
    animation: detailReveal 0.25s cubic-bezier(0.2,0,0,1);
  }

  @keyframes detailReveal {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .cal-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .cal-detail-date {
    font-family: var(--display);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--ink);
  }

  .cal-detail-close {
    background: none;
    border: 1px solid rgba(201,169,97,0.3);
    border-radius: 6px;
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
    color: var(--ink-soft);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .cal-detail-close:hover { background: rgba(201,169,97,0.2); color: var(--ink); }

  .cal-detail-empty {
    font-family: var(--body);
    font-size: 0.9rem;
    color: var(--ink-soft);
    text-align: center;
    padding: 0.5rem 0;
  }

  .cal-detail-section {
    margin-bottom: 1rem;
  }

  .cal-detail-section:last-child { margin-bottom: 0; }

  .cal-detail-section-title {
    font-family: var(--sans);
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 0.6rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid rgba(201,169,97,0.2);
  }

  .cal-detail-exam {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    background: rgba(184,92,56,0.08);
    border: 1px solid rgba(184,92,56,0.2);
    border-radius: 10px;
    margin-bottom: 0.4rem;
  }

  .cal-detail-exam-glyph { font-size: 1.1rem; margin-top: 1px; }

  .cal-detail-exam-name {
    font-family: var(--body);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--ink);
  }

  .cal-detail-exam-countdown {
    font-family: var(--sans);
    font-size: 0.75rem;
    color: var(--terracotta);
    margin-top: 0.15rem;
  }

  .cal-detail-review-list { display: flex; flex-direction: column; gap: 0.4rem; }

  .cal-detail-review {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255,248,235,0.6);
    border: 1px solid color-mix(in srgb, var(--sc) 25%, rgba(201,169,97,0.2));
    border-radius: 10px;
    transition: background 0.15s;
  }

  .cal-detail-review:hover { background: rgba(201,169,97,0.12); }

  .cal-detail-review-glyph { font-size: 1.1rem; flex-shrink: 0; }

  .cal-detail-review-info { flex: 1; min-width: 0; }

  .cal-detail-review-subject {
    font-family: var(--sans);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 0.1rem;
  }

  .cal-detail-review-topic {
    font-family: var(--body);
    font-size: 0.9rem;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cal-study-btn {
    flex-shrink: 0;
    font-size: 0.72rem;
    padding: 0.25rem 0.65rem;
  }

  .cal-detail-mins {
    font-family: var(--body);
    font-size: 0.95rem;
    color: #4a7c59;
    font-weight: 500;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .cal-year-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .cal-toolbar { flex-direction: column; align-items: flex-start; }
    .cal-nav-label { min-width: unset; font-size: 0.9rem; }
    .cal-week-grid { gap: 3px; }
    .cal-cell { min-height: 55px; padding: 0.3rem 0.3rem 0.4rem; }
    .cal-pill { font-size: 0.58rem; }
  }

  @media (max-width: 480px) {
    .cal-year-grid { grid-template-columns: repeat(2, 1fr); }
    .cal-week-grid { grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .cal-cell-num { font-size: 0.68rem; }
    .cal-cell-events { display: none; }
    .cal-cell { min-height: 42px; }
  }

  /* ── Knowledge View ── */
  .kv-view { display: flex; flex-direction: column; gap: 1rem; }

  .kv-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .kv-ov-card {
    background: rgba(255,248,235,0.45);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(201,169,97,0.25);
    border-radius: 12px;
    padding: 0.9rem 1.1rem;
    box-shadow: var(--shadow-sm);
  }

  .kv-ov-value {
    font-family: var(--display);
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kv-ov-denom { font-size: 0.9rem; color: var(--ink-soft); font-weight: 400; }

  .kv-ov-label {
    font-family: var(--sans);
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-top: 0.25rem;
  }

  .kv-list { display: flex; flex-direction: column; gap: 0.5rem; }

  @keyframes kvSlideIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .kv-subject-card {
    background: rgba(255,248,235,0.38);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(201,169,97,0.22);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s;
    animation: kvSlideIn 0.4s cubic-bezier(0.2,0,0,1) both;
    animation-delay: var(--kv-delay, 0ms);
  }

  .kv-subject-card.kv-open {
    border-color: rgba(201,169,97,0.4);
    box-shadow: var(--shadow-card);
  }

  .kv-subject-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.85rem 1.1rem;
    cursor: pointer;
    transition: background 0.18s;
    border-left: 3px solid var(--sc, var(--gold));
  }

  .kv-subject-row:hover { background: rgba(201,169,97,0.08); }

  .kv-rank {
    font-family: var(--sans);
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--ink-soft);
    min-width: 22px;
    letter-spacing: 0.03em;
  }

  .kv-glyph { font-size: 1.3rem; flex-shrink: 0; }

  .kv-bar-group { flex: 1; min-width: 0; }

  .kv-name {
    font-family: var(--sans);
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 0.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kv-bar {
    height: 7px;
    background: rgba(92,74,53,0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .kv-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.7s cubic-bezier(0.2,0,0,1);
  }

  .kv-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
    min-width: 80px;
  }

  .kv-score {
    font-family: var(--display);
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1;
  }

  .kv-label-tag {
    font-family: var(--sans);
    font-size: 0.63rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .kv-progress-text {
    font-family: var(--sans);
    font-size: 0.63rem;
    color: var(--ink-soft);
  }

  .kv-chevron {
    font-size: 1.1rem;
    color: var(--ink-soft);
    transition: transform 0.2s;
    flex-shrink: 0;
    line-height: 1;
  }

  .kv-chevron.kv-chevron-open { transform: rotate(90deg); }

  /* Topics inside expanded subject */
  .kv-topics {
    border-top: 1px solid rgba(201,169,97,0.15);
    padding: 0.5rem 0.75rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .kv-topic-block { }

  .kv-topic-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.5rem 0.6rem;
    border-radius: 8px;
    transition: background 0.15s;
  }

  .kv-topic-row.kv-clickable { cursor: pointer; }
  .kv-topic-row.kv-clickable:hover { background: rgba(201,169,97,0.1); }

  .kv-topic-name {
    font-family: var(--body);
    font-size: 0.9rem;
    color: var(--ink);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kv-topic-bar-wrap { width: 100px; flex-shrink: 0; }

  .kv-topic-bar {
    height: 5px;
    background: rgba(92,74,53,0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .kv-topic-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s cubic-bezier(0.2,0,0,1);
  }

  .kv-topic-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 60px;
    justify-content: flex-end;
  }

  .kv-topic-score {
    font-family: var(--sans);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .kv-topic-sub-ct {
    font-family: var(--sans);
    font-size: 0.63rem;
    color: var(--ink-soft);
  }

  .kv-chevron-sm {
    font-size: 0.9rem;
    color: var(--ink-soft);
    transition: transform 0.18s;
    flex-shrink: 0;
    line-height: 1;
  }

  .kv-chevron-sm.kv-chevron-open { transform: rotate(90deg); }

  /* Subtopics inside expanded topic */
  .kv-subtopics {
    padding: 0.25rem 0 0.35rem 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .kv-subtopic-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.5rem;
    border-radius: 6px;
    transition: background 0.12s;
  }

  .kv-subtopic-row:hover { background: rgba(201,169,97,0.07); }

  .kv-subtopic-row.kv-unseen { opacity: 0.45; }

  .kv-st-name {
    font-family: var(--body);
    font-size: 0.83rem;
    color: var(--ink);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kv-st-bar {
    width: 80px;
    height: 4px;
    background: rgba(92,74,53,0.1);
    border-radius: 2px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .kv-st-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s cubic-bezier(0.2,0,0,1);
  }

  .kv-st-score {
    font-family: var(--sans);
    font-size: 0.75rem;
    font-weight: 700;
    min-width: 18px;
    text-align: right;
  }

  /* Not started section */
  .kv-not-started { }

  .kv-ns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-top: 0.75rem;
  }

  .kv-ns-card {
    background: rgba(255,248,235,0.38);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(201,169,97,0.2);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    animation: kvSlideIn 0.4s cubic-bezier(0.2,0,0,1) both;
  }

  .kv-ns-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(201,169,97,0.15);
  }

  .kv-ns-title {
    font-family: var(--sans);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .kv-ns-count {
    background: rgba(92,74,53,0.1);
    color: var(--ink-soft);
    font-family: var(--sans);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.5rem;
    border-radius: 20px;
  }

  .kv-ns-list {
    padding: 0.5rem 0;
    max-height: 340px;
    overflow-y: auto;
  }

  .kv-ns-item {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.45rem 1rem;
    transition: background 0.12s;
    cursor: default;
  }

  .kv-ns-item:hover { background: rgba(201,169,97,0.07); }

  .kv-ns-glyph { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }

  .kv-ns-name {
    font-family: var(--body);
    font-size: 0.88rem;
    color: var(--ink);
    line-height: 1.3;
  }

  .kv-ns-sub {
    font-family: var(--sans);
    font-size: 0.65rem;
    color: var(--ink-soft);
    margin-top: 0.1rem;
  }

  @media (max-width: 640px) {
    .kv-overview { grid-template-columns: repeat(2, 1fr); }
    .kv-topic-bar-wrap { width: 60px; }
    .kv-st-bar { width: 50px; }
    .kv-meta { min-width: 60px; }
  }

  /* ── prefers-reduced-motion: kill all decorative animations ── */
  @media (prefers-reduced-motion: reduce) {
    .bg-orb,
    .logo,
    .grain {
      animation: none !important;
    }
    .reveal {
      opacity: 1 !important;
      transform: none !important;
      filter: none !important;
      transition: none !important;
    }
    .level-up-overlay { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .subject-card {
      animation: none !important;
      opacity: 1 !important;
      transition: background 0.2s, box-shadow 0.2s !important;
    }
    * {
      transition-duration: 0.01ms !important;
    }
  }
`;
