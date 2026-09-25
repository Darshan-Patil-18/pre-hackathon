import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sparkles, ArrowRight, Check, RefreshCw, Lock, Unlock, Pencil, Share2,
  Download, Copy, ExternalLink, ShieldAlert, Swords, MessageSquare,
  Type, Palette, CheckCircle2, Rocket, Cpu, Eye, X, ChevronRight,
  Sun, Moon, HelpCircle, Layers, Sliders, Users, AlertCircle, ArrowUpRight,
  Loader2
} from 'lucide-react';
import { APP_CONFIG } from './config';
import './styles.css';

function App() {
  // Theme state: Default is Light mode (saved to localStorage when toggled)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('brandmind_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });
  const [scrolled, setScrolled] = useState(false);
  
  // Navigation / View State: 'landing', 'workspace', 'kit_view'
  const [view, setView] = useState('landing');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  
  // Workspace State
  const [sessionId, setSessionId] = useState(null);
  const [ideaInput, setIdeaInput] = useState('');
  const [currentStage, setCurrentStage] = useState(1);
  const [activeTabStage, setActiveTabStage] = useState(1);
  const [brandProfile, setBrandProfile] = useState({});
  const [telemetry, setTelemetry] = useState([]);
  const [loadingStage, setLoadingStage] = useState(false);
  const [loadingStageText, setLoadingStageText] = useState('');
  const [stageError, setStageError] = useState(null);
  const [showInspector, setShowInspector] = useState(true);
  const [selectedTelemetryStage, setSelectedTelemetryStage] = useState('stage1_interview');
  
  // Human Controls & Modals
  const [lockedFields, setLockedFields] = useState({});
  const [editingField, setEditingField] = useState(null); // { stageKey, field, value }
  const [toneModalOpen, setToneModalOpen] = useState(false);
  const [toneGuidance, setToneGuidance] = useState('');
  const [toneTargetStage, setToneTargetStage] = useState(null);
  const [audienceShiftModalOpen, setAudienceShiftModalOpen] = useState(false);
  const [newAudienceInput, setNewAudienceInput] = useState('');
  const [audienceShiftLoading, setAudienceShiftLoading] = useState(false);

  // Stage 1 Interactive State
  const [interviewAnswers, setInterviewAnswers] = useState({});
  const [editedSummary, setEditedSummary] = useState('');

  // Toast State
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Scroll to top of the stage content area after a stage completes
  const scrollToStageTop = () => {
    setTimeout(() => {
      const el = document.getElementById('stage-content-top');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('brandmind_theme', nextTheme);
    } catch (e) {}
  };

  // Scroll listener for Frosted-glass iOS Navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync theme class to body
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Check URL path on mount (e.g. /kit/:id)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/kit/')) {
      const kitId = path.split('/kit/')[1];
      if (kitId) {
        loadPublicKit(kitId);
      }
    }
  }, []);
  // Load Seeded Demo Kit
  const loadDemoKit = async () => {
    setLoadingStage(true);
    setLoadingStageText('Loading interactive demo kit...');
    try {
      const res = await fetch('/api/kits/demo-teammate');
      if (res.ok) {
        const data = await res.json();
        const kitData = data.full_kit;
        setBrandProfile(kitData.profile);
        setTelemetry(kitData.telemetry || []);
        setSessionId('demo-session');
        setIdeaInput(kitData.profile.idea || '');
        setCurrentStage(8);
        setActiveTabStage(8);
        setView('workspace');
        notify('Demo kit loaded: CohortCraft');
      } else {
        notify('Could not load demo kit.');
      }
    } catch (err) {
      notify('Network error loading demo.');
    } finally {
      setLoadingStage(false);
    }
  };

  // Load Public Kit by ID
  const loadPublicKit = async (kitId) => {
    setLoadingStage(true);
    setLoadingStageText(`Loading Brand Kit #${kitId}...`);
    try {
      const res = await fetch(`/api/kits/${kitId}`);
      if (res.ok) {
        const data = await res.json();
        const kitData = data.full_kit;
        setBrandProfile(kitData.profile);
        setTelemetry(kitData.telemetry || []);
        setSessionId(data.session_id || 'shared-session');
        setIdeaInput(kitData.profile.idea || '');
        setCurrentStage(8);
        setActiveTabStage(8);
        setView('workspace');
        notify(`Loaded shared kit: ${data.brand_name}`);
      } else {
        notify('Kit not found. Returning to home.');
        setView('landing');
      }
    } catch (err) {
      notify('Error loading shared kit.');
      setView('landing');
    } finally {
      setLoadingStage(false);
    }
  };

  // Start new session
  const startNewSprint = async (rawIdea) => {
    const ideaToRun = rawIdea || ideaInput;
    if (!ideaToRun || !ideaToRun.trim()) {
      notify('Please provide a founder idea first.');
      return;
    }
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText('Understanding raw idea & crafting interview...');
    try {
      const startRes = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaToRun.trim() })
      });
      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.detail || 'Failed to start session');
      }
      const startData = await startRes.json();
      const sId = startData.session_id;
      setSessionId(sId);
      setIdeaInput(ideaToRun.trim());

      // Trigger Stage 1 Interview
      const st1Res = await fetch(`/api/sessions/${sId}/stage1_interview`, { method: 'POST' });
      if (!st1Res.ok) {
        const err = await st1Res.json();
        throw new Error(err.detail || 'Stage 1 interview generation failed');
      }
      const st1Data = await st1Res.json();
      setBrandProfile(st1Data.profile);
      setTelemetry([st1Data.meta]);
      setSelectedTelemetryStage('stage1_interview');
      setEditedSummary(st1Data.stage_data.understanding_summary || '');
      setCurrentStage(1);
      setActiveTabStage(1);
      setView('workspace');
      scrollToStageTop();
      notify('Stage 1 ready: Review understanding');
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Confirm Stage 1 and run Stage 2
  const confirmStage1AndRunStage2 = async () => {
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText('Conducting Brand Battle between 3 strategists...');
    try {
      // Confirm Stage 1
      await fetch(`/api/sessions/${sessionId}/stage1_confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: interviewAnswers,
          edited_summary: editedSummary
        })
      });

      // Run Stage 2 Position Battle
      const res = await fetch(`/api/sessions/${sessionId}/stage2_position`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Stage 2 failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setSelectedTelemetryStage('stage2_position');
      setCurrentStage(2);
      setActiveTabStage(2);
      scrollToStageTop();
      notify('Brand Battle generated: Choose your direction');
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Select Stage 2 Direction and proceed to Stage 3
  const selectDirectionAndRunStage3 = async (dirId) => {
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText('Crafting justified personality traits & operating principles...');
    try {
      await fetch(`/api/sessions/${sessionId}/stage2_select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_id: dirId })
      });

      // Run Stage 3 Personality
      const res = await fetch(`/api/sessions/${sessionId}/stage3_personality`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Stage 3 failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setSelectedTelemetryStage('stage3_personality');
      setCurrentStage(3);
      setActiveTabStage(3);
      scrollToStageTop();
      notify('Personality architecture locked');
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Run Stage 4: Anti-Generic Engine
  const runStage4 = async () => {
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText('Running Anti-Generic Engine: Scanning startup tropes...');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/stage4_antigeneric`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Stage 4 failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setSelectedTelemetryStage('stage4_antigeneric');
      setCurrentStage(4);
      setActiveTabStage(4);
      scrollToStageTop();
      notify('Anti-Generic Engine completed');
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Run Stage 5: Naming & Messaging
  const runStage5 = async () => {
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText('Forging names, etymology, and brand voice rules...');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/stage5_naming`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Stage 5 failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setSelectedTelemetryStage('stage5_naming');
      setCurrentStage(5);
      setActiveTabStage(5);
      scrollToStageTop();
      notify('Naming & Voice generated');
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Run Stage 6: Visual Direction & SVG Logo
  const runStage6 = async () => {
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText('Generating visual tokens, hex palette & clean SVG mark...');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/stage6_visuals`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Stage 6 failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setSelectedTelemetryStage('stage6_visuals');
      setCurrentStage(6);
      setActiveTabStage(6);
      scrollToStageTop();
      notify('Visual system & SVG logo generated');
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Run Stage 7: Consistency Test
  const runStage7 = async () => {
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText('Running Consistency Critic: Auditing multi-stage alignment...');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/stage7_consistency`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Stage 7 failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setSelectedTelemetryStage('stage7_consistency');
      setCurrentStage(7);
      setActiveTabStage(7);
      scrollToStageTop();
      notify('Consistency audit & auto-revisions complete');
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Run Stage 8: Launch Kit
  const runStage8 = async () => {
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText('Assembling launch copy, 5 social posts, and 30-day plan...');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/stage8_launchkit`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Stage 8 failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setSelectedTelemetryStage('stage8_launchkit');
      setCurrentStage(8);
      setActiveTabStage(8);
      scrollToStageTop();
      notify('Launch kit ready!');
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Regenerate with optional tone guidance
  const triggerRegenerate = async (stageKey, guidance = '') => {
    setStageError(null);
    setLoadingStage(true);
    setLoadingStageText(`Regenerating ${stageKey}...`);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/regenerate_stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_key: stageKey,
          tone_guidance: guidance
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Regeneration failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setSelectedTelemetryStage(stageKey);
      setToneModalOpen(false);
      setToneGuidance('');
      notify(`Updated ${stageKey}`);
    } catch (err) {
      setStageError(err.message);
    } finally {
      setLoadingStage(false);
    }
  };

  // Audience Shifter execution
  const executeAudienceShift = async () => {
    if (!newAudienceInput.trim()) return;
    setAudienceShiftLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/audience_shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_audience: newAudienceInput.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Audience shift failed');
      }
      const data = await res.json();
      setBrandProfile(data.profile);
      setTelemetry(prev => [...prev, data.meta]);
      setAudienceShiftModalOpen(false);
      setNewAudienceInput('');
      notify('Audience shifted! Value proposition reframed.');
    } catch (err) {
      notify(`Shift error: ${err.message}`);
    } finally {
      setAudienceShiftLoading(false);
    }
  };

  // Lock / Unlock field
  const toggleLock = (fieldKey) => {
    setLockedFields(prev => {
      const updated = { ...prev, [fieldKey]: !prev[fieldKey] };
      notify(updated[fieldKey] ? `Locked '${fieldKey}'` : `Unlocked '${fieldKey}'`);
      return updated;
    });
  };

  // Direct Inline Edit Save
  const saveInlineEdit = async (stageKey, fieldName, newVal) => {
    try {
      await fetch(`/api/sessions/${sessionId}/update_field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_key: stageKey,
          field_name: fieldName,
          value: newVal
        })
      });
      setBrandProfile(prev => {
        const next = { ...prev };
        if (!next[stageKey]) next[stageKey] = {};
        next[stageKey][fieldName] = newVal;
        return next;
      });
      setEditingField(null);
      notify('Saved changes');
    } catch (err) {
      notify('Failed to save edit');
    }
  };

  // Share Kit
  const shareBrandKit = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/publish_kit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandProfile?.stage5_naming?.primary_name,
          tagline: brandProfile?.stage5_naming?.tagline
        })
      });
      if (!res.ok) throw new Error('Could not publish');
      const data = await res.json();
      const shareUrl = `${window.location.origin}/kit/${data.kit_id}`;
      setCurrentShareUrl(shareUrl);
      setShareModalOpen(true);
      await navigator.clipboard.writeText(shareUrl);
      notify('Share link copied to clipboard!');
    } catch (err) {
      notify('Share error: ' + err.message);
    }
  };

  // Export JSON
  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      app: APP_CONFIG.name,
      exported_at: new Date().toISOString(),
      profile: brandProfile,
      telemetry: telemetry
    }, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    const bName = brandProfile?.stage5_naming?.primary_name || "brandmind";
    dlAnchorElem.setAttribute("download", `${bName.toLowerCase().replace(/\s+/g, '-')}-brand-kit.json`);
    dlAnchorElem.click();
    notify('JSON export downloaded');
  };

  // Export PDF (Print layout)
  const exportPDF = () => {
    window.print();
  };

  // Helper for telemetry row
  const currentTelemetryItem = telemetry.find(t => t.stage === selectedTelemetryStage) || telemetry[telemetry.length - 1];

  return (
    <div className="app-root">
      {/* Ambient background orbs (strictly no purple, no orange) */}
      <div className="ambient-bg">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
      </div>

      {/* Floating iOS Frosted-Glass Navbar */}
      <div className={`ios-navbar-wrapper ${scrolled ? 'scrolled' : ''}`}>
        <nav className="ios-navbar">
          <div className="nav-brand" onClick={() => setView('landing')}>
            <div className="nav-brand-icon">
              <Cpu size={18} />
            </div>
            <span>{APP_CONFIG.name}</span>
          </div>

          <div className="nav-links">
            <span className={`nav-link ${view === 'landing' ? 'active' : ''}`} onClick={() => {
              setView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}>
              Product
            </span>
            <span className="nav-link" onClick={() => {
              if (view !== 'landing') {
                setView('landing');
              }
              setTimeout(() => {
                const el = document.getElementById('how-it-works-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 80);
            }}>
              How It Works
            </span>
            <span className="nav-link" onClick={loadDemoKit}>
              Sample Kit
            </span>
            <span
              className={`nav-link ${view === 'workspace' ? 'active' : ''}`}
              onClick={() => {
                if (sessionId || brandProfile.idea) {
                  setView('workspace');
                } else {
                  loadDemoKit();
                }
              }}
            >
              Brand Workspace
            </span>
          </div>

          <div className="nav-actions">
            <button className="icon-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {view === 'landing' ? (
              <button className="btn btn-primary btn-sm" onClick={() => {
                const el = document.getElementById('hero-input');
                if (el) el.focus();
              }}>
                Try Live Sprint <ArrowRight size={14} />
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowInspector(!showInspector)}>
                  <Layers size={14} /> {showInspector ? 'Hide Telemetry' : 'Under the Hood'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={shareBrandKit}>
                  <Share2 size={14} /> Share Kit
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="container">
        {view === 'landing' && (
          <LandingView
            ideaInput={ideaInput}
            setIdeaInput={setIdeaInput}
            onStartSprint={startNewSprint}
            onLoadDemo={loadDemoKit}
          />
        )}

        {view === 'workspace' && (
          <WorkspaceView
            sessionId={sessionId}
            brandProfile={brandProfile}
            setBrandProfile={setBrandProfile}
            currentStage={currentStage}
            activeTabStage={activeTabStage}
            setActiveTabStage={setActiveTabStage}
            loadingStage={loadingStage}
            loadingStageText={loadingStageText}
            stageError={stageError}
            setStageError={setStageError}
            showInspector={showInspector}
            setShowInspector={setShowInspector}
            telemetry={telemetry}
            selectedTelemetryStage={selectedTelemetryStage}
            setSelectedTelemetryStage={setSelectedTelemetryStage}
            lockedFields={lockedFields}
            toggleLock={toggleLock}
            editingField={editingField}
            setEditingField={setEditingField}
            saveInlineEdit={saveInlineEdit}
            onToneModalOpen={(stageKey) => {
              setToneTargetStage(stageKey);
              setToneModalOpen(true);
            }}
            onAudienceShiftModalOpen={() => setAudienceShiftModalOpen(true)}
            onRegenerate={triggerRegenerate}
            onConfirmStage1={confirmStage1AndRunStage2}
            onSelectDirection={selectDirectionAndRunStage3}
            onRunStage4={runStage4}
            onRunStage5={runStage5}
            onRunStage6={runStage6}
            onRunStage7={runStage7}
            onRunStage8={runStage8}
            onShare={shareBrandKit}
            onExportJSON={exportJSON}
            onExportPDF={exportPDF}
            interviewAnswers={interviewAnswers}
            setInterviewAnswers={setInterviewAnswers}
            editedSummary={editedSummary}
            setEditedSummary={setEditedSummary}
            scrollToStageTop={scrollToStageTop}
            notify={notify}
          />
        )}
      </main>

      {/* How It Works is now inline on the landing page — modal removed */}

      {/* Tone Adjustment Modal */}
      {toneModalOpen && (
        <div className="modal-overlay" onClick={() => setToneModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="section-eyebrow">Human-in-the-Loop Control</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700' }}>Adjust Strategic Tone</h3>
              </div>
              <button className="icon-btn" onClick={() => setToneModalOpen(false)}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '16px' }}>
              Provide directional feedback (e.g. <em>"Make it more premium and restrained"</em> or <em>"Target cynical developers, avoid bubbly cheerfulness"</em>).
            </p>
            <textarea
              value={toneGuidance}
              onChange={e => setToneGuidance(e.target.value)}
              placeholder="e.g. Less playful, higher status, more understated..."
              rows={3}
              style={{
                width: '100%',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                marginBottom: '18px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setToneModalOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => triggerRegenerate(toneTargetStage, toneGuidance)}
                disabled={loadingStage}
              >
                Regenerate Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audience Shifter Modal */}
      {audienceShiftModalOpen && (
        <div className="modal-overlay" onClick={() => setAudienceShiftModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="section-eyebrow">Audience Shifter Engine</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700' }}>Reframe for a New Audience</h3>
              </div>
              <button className="icon-btn" onClick={() => setAudienceShiftModalOpen(false)}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '16px' }}>
              Reframes your value proposition and messaging hooks for a completely different buyer archetype while protecting your core product truth.
            </p>
            <input
              type="text"
              value={newAudienceInput}
              onChange={e => setNewAudienceInput(e.target.value)}
              placeholder="e.g. Enterprise Chief Information Security Officers (CISOs)"
              style={{
                width: '100%',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                marginBottom: '18px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setAudienceShiftModalOpen(false)}>Cancel</button>
              <button
                className="btn btn-teal"
                onClick={executeAudienceShift}
                disabled={audienceShiftLoading || !newAudienceInput.trim()}
              >
                {audienceShiftLoading ? 'Shifting...' : 'Reframe Audience'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {shareModalOpen && (
        <div className="modal-overlay" onClick={() => setShareModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="section-eyebrow">Public Brand Kit</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700' }}>Your Shareable Kit is Live</h3>
              </div>
              <button className="icon-btn" onClick={() => setShareModalOpen(false)}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '16px' }}>
              Anyone with this link can view your complete brand kit in high-fidelity read-only mode:
            </p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                readOnly
                value={currentShareUrl}
                style={{
                  flex: 1,
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: 'var(--cyan-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem'
                }}
              />
              <button className="btn btn-primary" onClick={async () => {
                await navigator.clipboard.writeText(currentShareUrl);
                notify('Copied to clipboard!');
              }}>
                <Copy size={15} /> Copy
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShareModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-notice">
          <Check size={16} color="var(--teal-accent)" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

// ----------------- LANDING PAGE VIEW -----------------
function LandingView({ ideaInput, setIdeaInput, onStartSprint, onLoadDemo }) {
  return (
    <div className="landing-container">
      {/* Hero */}
      <section className="hero-section">
        <div className="badge-pill">
          <Sparkles size={14} /> AI Brand Intelligence · Hackathon Edition
        </div>
        <h1 className="hero-title">
          Build a brand that <span className="gradient-text">can think.</span>
        </h1>
        <p className="hero-sub">
          One sentence isn’t a brand. BrandMind interviews the founder, battles positioning, challenges generic clichés, checks consistency, and builds a launch-ready brand kit.
        </p>

        {/* Live Try It Input Box */}
        <div className="hero-input-card">
          <textarea
            id="hero-input"
            className="hero-textarea"
            placeholder="Describe your rough idea in one sentence (e.g. 'An app that helps students find teammates for hackathons')..."
            value={ideaInput}
            onChange={e => setIdeaInput(e.target.value)}
          />
          <div className="hero-input-footer">
            <span className="hero-input-meta">
              <Cpu size={14} color="var(--teal-accent)" /> Groq & OpenRouter Free Tier
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={onLoadDemo}>
                Load Demo Kit
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onStartSprint(ideaInput)}
                disabled={!ideaInput.trim()}
              >
                Start Strategy Sprint <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 1-Click Example Chips */}
        <div className="example-chips">
          <span className="example-chip-label">Try an example:</span>
          {APP_CONFIG.examples.map((ex, i) => (
            <button
              key={i}
              className="example-chip"
              onClick={() => {
                setIdeaInput(ex.idea);
                onStartSprint(ex.idea);
              }}
            >
              <span className="example-badge">{ex.badge}</span>
              <span>{ex.title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* How It Works Showcase */}
      <section id="how-it-works-section" style={{ margin: '40px 0 80px', scrollMarginTop: '100px' }}>
        <div className="section-header">
          <span className="section-eyebrow">How It Works · 8-Stage Pipeline</span>
          <h2 className="section-title">A Brand That Can Think In 8 Steps</h2>
          <p className="section-desc">
            One giant prompt gives generic marketing mush. BrandMind sequences 8 specialized AI agents with memory, critique, and self-correction.
          </p>
        </div>

        <div className="feature-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div className="feature-card">
            <div className="feature-icon-wrap"><MessageSquare size={22} /></div>
            <h3>01. Signal Extraction</h3>
            <p>Interrogates the founder's raw sentence, extracting the real problem and 4 adaptive questions before touching a name.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Swords size={22} /></div>
            <h3>02. Brand Battle</h3>
            <p>Generates 3 radically polarized positioning stances. 3 specialized agent critics debate tradeoffs and pick a winner.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Sliders size={22} /></div>
            <h3>03. Personality Architecture</h3>
            <p>4 core traits calibrated against audience tensions, plus explicit forbidden behaviors and operating principles.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><ShieldAlert size={22} /></div>
            <h3>04. Anti-Generic Engine</h3>
            <p>Scans 1,000+ startup clichés, eliminates tired tropes with explicit rationale, and calculates an originality score.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Type size={22} /></div>
            <h3>05. Naming & Voice</h3>
            <p>Explores 4 naming territories, selects a defensible name with etymology, tagline, and dos/don'ts voice rules.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Palette size={22} /></div>
            <h3>06. Visual Identity & SVG</h3>
            <p>Generates design tokens, typography pairings, hex palettes (strictly no purple/orange), and a clean vector SVG mark.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><CheckCircle2 size={22} /></div>
            <h3>07. Consistency Critic</h3>
            <p>Stress-tests if name, voice, visuals, and copy cohere into one unassailable brand, applying surgical polish.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap"><Rocket size={22} /></div>
            <h3>08. Launch Kit & GTM</h3>
            <p>Full landing page wireframe copy, 5 tailored social launch posts, launch checklist, and 30-day growth roadmap.</p>
          </div>
        </div>
      </section>

      {/* Interactive Demo Teaser */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '24px', padding: '40px', marginBottom: '80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span className="section-eyebrow">Pre-Generated Hackathon Sample</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '6px' }}>
              Inspect the Seeded "CohortCraft" Brand
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '600px' }}>
              See what a full 8-stage run produces: positioning battle, anti-generic rejections, SVG vector mark, 95% consistency score, and 5 launch social posts.
            </p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={onLoadDemo}>
            Explore Full Brand Kit <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '40px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={16} color="var(--cyan-primary)" />
          <strong>{APP_CONFIG.name}</strong> · {APP_CONFIG.tagline}
        </div>
        <div>
          <span>Zero Paid APIs · Groq & OpenRouter Free Tier</span>
        </div>
      </footer>
    </div>
  );
}

// ----------------- WORKSPACE VIEW (8 STAGES) -----------------
function WorkspaceView({
  sessionId,
  brandProfile,
  setBrandProfile,
  currentStage,
  activeTabStage,
  setActiveTabStage,
  loadingStage,
  loadingStageText,
  stageError,
  setStageError,
  showInspector,
  setShowInspector,
  telemetry,
  selectedTelemetryStage,
  setSelectedTelemetryStage,
  lockedFields,
  toggleLock,
  editingField,
  setEditingField,
  saveInlineEdit,
  onToneModalOpen,
  onAudienceShiftModalOpen,
  onRegenerate,
  onConfirmStage1,
  onSelectDirection,
  onRunStage4,
  onRunStage5,
  onRunStage6,
  onRunStage7,
  onRunStage8,
  onShare,
  onExportJSON,
  onExportPDF,
  interviewAnswers,
  setInterviewAnswers,
  editedSummary,
  setEditedSummary,
  scrollToStageTop,
  notify
}) {
  const brandName = brandProfile?.stage5_naming?.primary_name || "BrandMind";
  const tagline = brandProfile?.stage5_naming?.tagline || "";
  const currentTelemetryItem = (telemetry || []).find(t => t.stage === selectedTelemetryStage) || (telemetry || [])[(telemetry || []).length - 1];

  return (
    <div className="workspace-container" style={{ padding: '20px 0' }}>
      {/* Top Banner & Strategy Sprint Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--teal-accent)', background: 'var(--bg-pill)', padding: '4px 10px', borderRadius: '999px', border: '1px solid var(--border-accent)' }}>
              Brand Intelligence Sprint
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Session: {sessionId}</span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '800', letterSpacing: '-0.03em' }}>
            {brandName} <span style={{ fontSize: '1.2rem', fontWeight: '400', color: 'var(--text-secondary)' }}>{tagline && `— ${tagline}`}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Idea: <em>"{brandProfile.idea}"</em>
          </p>
        </div>

        {/* Global Action Tools */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={onAudienceShiftModalOpen}>
            <Users size={14} color="var(--teal-accent)" /> Audience Shifter
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onExportJSON}>
            <Download size={14} /> JSON
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onExportPDF}>
            <Download size={14} /> PDF
          </button>
          <button className="btn btn-primary btn-sm" onClick={onShare}>
            <Share2 size={14} /> Share Kit
          </button>
        </div>
      </div>

      {/* 8-Stage Stepper Bar */}
      <div className="workflow-stepper">
        {APP_CONFIG.stages.map(st => {
          const isDone = currentStage >= st.id;
          const isActive = activeTabStage === st.id;
          return (
            <button
              key={st.id}
              className={`stepper-tab ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
              onClick={() => {
                setActiveTabStage(st.id);
                if (scrollToStageTop) scrollToStageTop();
              }}
            >
              <span className="stepper-num">0{st.id}</span>
              <span className="stepper-label">{st.short}</span>
              {isDone && <Check size={12} color="var(--teal-accent)" style={{ position: 'absolute', top: '4px', right: '4px' }} />}
            </button>
          );
        })}
      </div>

      {/* Loading & Error Banners */}
      {loadingStage && (
        <div style={{ background: 'var(--bg-pill)', border: '1px solid var(--border-accent)', padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--cyan-primary)' }}>
          <RefreshCw size={18} className="spin" />
          <strong style={{ fontSize: '0.94rem' }}>{loadingStageText}</strong>
        </div>
      )}

      {stageError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171' }}>
            <AlertCircle size={20} />
            <div>
              <strong>Model Provider Pipeline Notice:</strong>
              <div style={{ fontSize: '0.85rem' }}>{stageError}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setStageError(null)}>Dismiss</button>
        </div>
      )}

      {/* Audience Shift Alert if active */}
      {brandProfile.audience_shift && (
        <div style={{ background: 'rgba(20, 184, 166, 0.08)', border: '1px solid var(--teal-accent)', padding: '16px 20px', borderRadius: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--teal-accent)' }}>
              Active Audience Reframing
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target: {brandProfile.audience_shift.new_target_audience}</span>
          </div>
          <p style={{ fontSize: '0.95rem', fontWeight: '600' }}>
            “{brandProfile.audience_shift.adapted_value_proposition}”
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Hook: <em>{brandProfile.audience_shift.tailored_pitch}</em>
          </p>
        </div>
      )}

      {/* Main Grid: Stage Content + Under the Hood Sidebar */}
      <div className={`app-layout ${!showInspector ? 'inspector-hidden' : ''}`}>
        <div id="stage-content-top" className="stage-content-column">
          {/* Stage 1: Interview & Understand */}
          {activeTabStage === 1 && (
            <Stage1Panel
              profile={brandProfile}
              onConfirm={onConfirmStage1}
              loading={loadingStage}
              interviewAnswers={interviewAnswers}
              setInterviewAnswers={setInterviewAnswers}
              editedSummary={editedSummary}
              setEditedSummary={setEditedSummary}
              onRegenerate={() => onRegenerate('stage1_interview')}
            />
          )}

          {/* Stage 2: Positioning (Brand Battle) */}
          {activeTabStage === 2 && (
            <Stage2Panel
              profile={brandProfile}
              onSelectDirection={onSelectDirection}
              loading={loadingStage}
              onToneAdjust={() => onToneModalOpen('stage2_position')}
              onRegenerate={() => onRegenerate('stage2_position')}
            />
          )}

          {/* Stage 3: Personality */}
          {activeTabStage === 3 && (
            <Stage3Panel
              profile={brandProfile}
              onProceed={onRunStage4}
              loading={loadingStage}
              onToneAdjust={() => onToneModalOpen('stage3_personality')}
              onRegenerate={() => onRegenerate('stage3_personality')}
              lockedFields={lockedFields}
              toggleLock={toggleLock}
            />
          )}

          {/* Stage 4: Anti-Generic Engine */}
          {activeTabStage === 4 && (
            <Stage4Panel
              profile={brandProfile}
              onProceed={onRunStage5}
              loading={loadingStage}
              onRegenerate={() => onRegenerate('stage4_antigeneric')}
            />
          )}

          {/* Stage 5: Naming & Messaging */}
          {activeTabStage === 5 && (
            <Stage5Panel
              profile={brandProfile}
              onProceed={onRunStage6}
              loading={loadingStage}
              onToneAdjust={() => onToneModalOpen('stage5_naming')}
              onRegenerate={() => onRegenerate('stage5_naming')}
              lockedFields={lockedFields}
              toggleLock={toggleLock}
              notify={notify}
            />
          )}

          {/* Stage 6: Visual Direction & SVG Logo */}
          {activeTabStage === 6 && (
            <Stage6Panel
              profile={brandProfile}
              onProceed={onRunStage7}
              loading={loadingStage}
              onRegenerate={() => onRegenerate('stage6_visuals')}
              notify={notify}
            />
          )}

          {/* Stage 7: Consistency Test */}
          {activeTabStage === 7 && (
            <Stage7Panel
              profile={brandProfile}
              onProceed={onRunStage8}
              loading={loadingStage}
              onRegenerate={() => onRegenerate('stage7_consistency')}
            />
          )}

          {/* Stage 8: Launch Kit */}
          {activeTabStage === 8 && (
            <Stage8Panel
              profile={brandProfile}
              loading={loadingStage}
              onRegenerate={() => onRegenerate('stage8_launchkit')}
              onShare={onShare}
              onExportJSON={onExportJSON}
              onExportPDF={onExportPDF}
              notify={notify}
            />
          )}
        </div>

        {/* UNDER THE HOOD INSPECTOR (Judge Proof) */}
        {showInspector && (
          <aside className="inspector-sidebar">
            <div className="inspector-header">
              <div>
                <span className="inspector-eyebrow">Under The Hood</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>AI Telemetry & State</h3>
              </div>
              <button className="icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => setShowInspector(false)}>
                <X size={14} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Execution latency and cumulative state passed forward across pipeline stages.
            </p>

            <div style={{ marginBottom: '16px' }}>
              {telemetry.map((t, idx) => (
                <div
                  key={idx}
                  className={`telemetry-row ${selectedTelemetryStage === t.stage ? 'selected' : ''}`}
                  onClick={() => setSelectedTelemetryStage(t.stage)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                    <span>{t.stage.replace('stage', 'Stage ').replace('_', ': ')}</span>
                    <span style={{ color: 'var(--teal-accent)' }}>{t.latency_ms}ms</span>
                  </div>
                  <div className="telemetry-meta">
                    {t.used_fallback && <span style={{ color: '#38BDF8' }}>fallback</span>}
                  </div>
                </div>
              ))}
            </div>

            {currentTelemetryItem && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Payload ({selectedTelemetryStage})
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                    onClick={() => {
                      const payload = brandProfile[selectedTelemetryStage] || brandProfile;
                      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                      notify('JSON copied to clipboard');
                    }}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <pre className="json-viewer">
                  {JSON.stringify(brandProfile[selectedTelemetryStage] || brandProfile, null, 2)}
                </pre>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// ----------------- STAGE 1: INTERVIEW & UNDERSTAND -----------------
function Stage1Panel({ profile, onConfirm, loading, interviewAnswers, setInterviewAnswers, editedSummary, setEditedSummary, onRegenerate }) {
  const st1 = profile.stage1_interview;
  if (!st1) return <div className="stage-panel">No interview data yet.</div>;

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-title-area">
          <span className="section-eyebrow">Stage 01 · Signal Extraction</span>
          <h2>Understand the Problem First</h2>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRegenerate} disabled={loading}>
          <RefreshCw size={14} /> Re-Interview
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-canvas)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cyan-primary)', marginBottom: '4px' }}>
            Core Problem Diagnosis
          </div>
          <p style={{ fontSize: '0.94rem', lineHeight: '1.6' }}>{st1.core_problem}</p>
        </div>
        <div style={{ background: 'var(--bg-canvas)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--teal-accent)', marginBottom: '4px' }}>
            Target User Archetype
          </div>
          <p style={{ fontSize: '0.94rem', lineHeight: '1.6' }}>{st1.target_user}</p>
        </div>
      </div>

      {/* Adaptive Questions Specific to Idea */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '14px' }}>
        Adaptive Founder Questions
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        {(st1.adaptive_questions || []).map((q, idx) => (
          <div key={q.id || idx} style={{ background: 'var(--bg-canvas)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
            <p style={{ fontWeight: '600', fontSize: '0.96rem', marginBottom: '4px' }}>{idx + 1}. {q.question}</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Why it matters: {q.why_this_matters}</p>
            
            {/* Suggested Quick Options */}
            {q.suggested_options && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {q.suggested_options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    className={`btn btn-sm ${interviewAnswers[q.id] === opt ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setInterviewAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            
            <input
              type="text"
              placeholder="Or type custom answer..."
              value={interviewAnswers[q.id] || ''}
              onChange={e => setInterviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              style={{
                width: '100%',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.88rem'
              }}
            />
          </div>
        ))}
      </div>

      {/* Editable Understanding Summary */}
      <div style={{ background: 'rgba(14, 165, 233, 0.05)', border: '1px solid var(--border-accent)', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cyan-primary)', marginBottom: '6px' }}>
          Understanding Summary (Founder Editable)
        </div>
        <textarea
          rows={3}
          value={editedSummary}
          onChange={e => setEditedSummary(e.target.value)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.98rem',
            lineHeight: '1.6',
            resize: 'vertical',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginTop: '16px' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={onConfirm}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 className="spinner" size={16} />
              Executing Stage 02: Positioning Tournament...
            </>
          ) : (
            <>
              Confirm Understanding & Launch Brand Battle <ArrowRight size={16} />
            </>
          )}
        </button>
        {loading && (
          <div className="inline-execution-status" style={{ width: '100%' }}>
            <Loader2 className="spinner" size={20} color="var(--cyan-primary)" />
            <div>
              <div className="inline-execution-text">Stage 02 Active · Positioning Battle Tournament</div>
              <div className="inline-execution-subtext">Generating 3 polarized strategic stances and running 3-agent cross-examination debate...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------- STAGE 2: POSITIONING (BRAND BATTLE) -----------------
function Stage2Panel({ profile, onSelectDirection, loading, onToneAdjust, onRegenerate }) {
  const st2 = profile.stage2_position;
  if (!st2) return <div className="stage-panel">No positioning data yet.</div>;

  const [selectedDir, setSelectedDir] = useState(st2.selected_direction_id || st2.recommended_winner_id || 'dir_1');

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-title-area">
          <span className="section-eyebrow">Stage 02 · Positioning Battle</span>
          <h2>3 Radical Directions. 3 Agent Critiques.</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onToneAdjust}>
            <Sliders size={14} /> Tone Controls
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRegenerate} disabled={loading}>
            <RefreshCw size={14} /> Re-Battle
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        A single positioning direction is a trap. Choose between 3 sharply contrasted stances pressure-tested by specialized agents:
      </p>

      {/* 3 Radical Cards */}
      <div className="battle-cards-grid">
        {(st2.directions || []).map((dir) => {
          const isSelected = selectedDir === dir.id;
          return (
            <div
              key={dir.id}
              className={`battle-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDir(dir.id)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="battle-score-pill">Fit: {dir.strategic_fit_score}/100</span>
                  {isSelected && <span style={{ color: 'var(--cyan-primary)', fontWeight: '700', fontSize: '0.78rem' }}>SELECTED</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--teal-accent)', fontWeight: '700', textTransform: 'uppercase' }}>
                  {dir.archetype}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '6px 0 10px' }}>{dir.title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
                  <strong>Value Prop:</strong> “{dir.value_proposition}”
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <strong>Differentiator:</strong> {dir.differentiator}
                </p>
              </div>
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: '#F87171' }}>
                <strong>Risk:</strong> {dir.tradeoff_or_risk}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 Specialized Agent Critiques */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px' }}>
          Agent Cross-Examination Verdicts
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div className="critic-review-box">
            <div className="critic-title"><Cpu size={14} /> The Strategist</div>
            <p>{st2.agent_critiques?.strategist?.assessment}</p>
          </div>
          <div className="critic-review-box" style={{ borderLeftColor: '#F87171' }}>
            <div className="critic-title" style={{ color: '#F87171' }}><ShieldAlert size={14} /> The Skeptic</div>
            <p>{st2.agent_critiques?.skeptic?.assessment}</p>
          </div>
          <div className="critic-review-box" style={{ borderLeftColor: 'var(--cyan-primary)' }}>
            <div className="critic-title" style={{ color: 'var(--cyan-primary)' }}><Users size={14} /> Audience Advocate</div>
            <p>{st2.agent_critiques?.audience_advocate?.assessment}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginTop: '28px' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => onSelectDirection(selectedDir)}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 className="spinner" size={16} />
              Executing Stage 03: Personality Synthesis...
            </>
          ) : (
            <>
              Lock Selected Route & Build Personality <ArrowRight size={16} />
            </>
          )}
        </button>
        {loading && (
          <div className="inline-execution-status" style={{ width: '100%' }}>
            <Loader2 className="spinner" size={20} color="var(--cyan-primary)" />
            <div>
              <div className="inline-execution-text">Stage 03 Active · Personality Architecture</div>
              <div className="inline-execution-subtext">Synthesizing 4 core brand traits, behavioral guardrails, and audience tension justifications...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------- STAGE 3: PERSONALITY -----------------
function Stage3Panel({ profile, onProceed, loading, onToneAdjust, onRegenerate, lockedFields, toggleLock }) {
  const st3 = profile.stage3_personality;
  if (!st3) return <div className="stage-panel">No personality data yet.</div>;

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-title-area">
          <span className="section-eyebrow">Stage 03 · Personality Architecture</span>
          <h2>Traits Justified Against Audience Tension</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onToneAdjust}>
            <Sliders size={14} /> Tone
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRegenerate} disabled={loading}>
            <RefreshCw size={14} /> Regenerate
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        {(st3.brand_traits || []).map((t, idx) => (
          <div key={idx} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--teal-accent)' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>{t.trait}</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>{t.spectrum}</span>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.6' }}>
              <strong>Audience Justification:</strong> {t.audience_justification}
            </p>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              <strong>Behavior in Practice:</strong> {t.behavior_in_practice}
            </p>
          </div>
        ))}
      </div>

      {/* Traits to Avoid */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px' }}>
        Forbidden Traits (What This Brand Will NEVER Be)
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
        {(st3.traits_to_avoid || []).map((av, idx) => (
          <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ color: '#F87171', fontWeight: '700', fontSize: '0.88rem' }}>✖ {av.forbidden_trait}</span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '4px' }}>{av.why_forbidden}</p>
          </div>
        ))}
      </div>

      {/* Operating Principles */}
      <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '20px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px' }}>
          Brand Operating Principles
        </h3>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          {(st3.brand_principles || []).map((p, idx) => (
            <li key={idx} style={{ marginBottom: '6px' }}>{p}</li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={onProceed}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 className="spinner" size={16} />
              Executing Stage 04: Anti-Generic Engine...
            </>
          ) : (
            <>
              Proceed to Anti-Generic Engine <ArrowRight size={16} />
            </>
          )}
        </button>
        {loading && (
          <div className="inline-execution-status" style={{ width: '100%' }}>
            <Loader2 className="spinner" size={20} color="var(--cyan-primary)" />
            <div>
              <div className="inline-execution-text">Stage 04 Active · Anti-Generic Engine</div>
              <div className="inline-execution-subtext">Scanning 1,000+ startup clichés, eliminating tired buzzwords, and scoring originality...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------- STAGE 4: ANTI-GENERIC ENGINE -----------------
function Stage4Panel({ profile, onProceed, loading, onRegenerate }) {
  const st4 = profile.stage4_antigeneric;
  if (!st4) return <div className="stage-panel">No anti-generic data yet.</div>;

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-title-area">
          <span className="section-eyebrow">Stage 04 · Anti-Generic Engine</span>
          <h2>Cliché Detection & Originality Scoring</h2>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRegenerate} disabled={loading}>
          <RefreshCw size={14} /> Re-Scan
        </button>
      </div>

      {/* Score Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid var(--cyan-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--cyan-glow)' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: '800' }}>{st4.originality_score}</span>
          <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>/ 100</span>
        </div>
        <div>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--teal-accent)' }}>
            Originality Audit Passed · Risk: {st4.genericness_risk_rating}
          </span>
          <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {st4.anti_generic_verdict}
          </p>
        </div>
      </div>

      {/* Rejections Table */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '14px' }}>
        Startup Clichés Rejected & Replaced
      </h3>
      <div style={{ marginBottom: '28px' }}>
        {(st4.rejected_ideas || []).map((rej, idx) => (
          <div key={idx} className="rejection-item">
            <span className="rejection-badge">REJECTED</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '0.94rem', textDecoration: 'line-through', color: '#F87171' }}>
                {rej.idea}
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                <strong>Why rejected:</strong> {rej.why_rejected}
              </p>
              <div style={{ fontSize: '0.88rem', color: 'var(--teal-accent)', fontWeight: '600' }}>
                <span className="replacement-arrow">→ Replacement:</span> {rej.replacement_concept}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={onProceed}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 className="spinner" size={16} />
              Executing Stage 05: Naming & Messaging...
            </>
          ) : (
            <>
              Proceed to Naming & Messaging <ArrowRight size={16} />
            </>
          )}
        </button>
        {loading && (
          <div className="inline-execution-status" style={{ width: '100%' }}>
            <Loader2 className="spinner" size={20} color="var(--cyan-primary)" />
            <div>
              <div className="inline-execution-text">Stage 05 Active · Naming & Messaging</div>
              <div className="inline-execution-subtext">Exploring 4 naming territories, etymology, taglines, and message hierarchy...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------- STAGE 5: NAMING & MESSAGING -----------------
function Stage5Panel({ profile, onProceed, loading, onToneAdjust, onRegenerate, lockedFields, toggleLock, notify }) {
  const st5 = profile.stage5_naming;
  if (!st5) return <div className="stage-panel">No naming data yet.</div>;

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-title-area">
          <span className="section-eyebrow">Stage 05 · Naming & Voice</span>
          <h2>A Name With Room to Grow</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onToneAdjust}>
            <Sliders size={14} /> Tone
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRegenerate} disabled={loading}>
            <RefreshCw size={14} /> Regenerate
          </button>
        </div>
      </div>

      {/* Primary Recommended Name Lockup */}
      <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-accent)', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--teal-accent)' }}>
              Primary Recommended Name
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.03em', margin: '4px 0' }}>
              {st5.primary_name}
            </h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--cyan-primary)', fontWeight: '600' }}>
              “{st5.tagline}”
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(st5.domain_suggestions || []).map((dom, dIdx) => (
              <span key={dIdx} style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {dom}
              </span>
            ))}
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', marginTop: '14px', lineHeight: '1.6' }}>
          <strong>Etymology & Rationale:</strong> {st5.name_etymology_and_rationale}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '8px' }}>
          <strong>One-Line Elevator Pitch:</strong> {st5.one_line_pitch}
        </p>
      </div>

      {/* Alternative Naming Territories */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px' }}>
        Alternative Naming Candidates Across Territories
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {(st5.alternative_names || []).map((alt, idx) => (
          <div key={idx} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {alt.territory}
            </span>
            <h4 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '4px 0 8px' }}>{alt.name}</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{alt.rationale}</p>
          </div>
        ))}
      </div>

      {/* Brand Voice Rules (Say This vs Not That) */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px' }}>
        Brand Voice Rules & Guardrails
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
        {(st5.voice_rules || []).map((vr, idx) => (
          <div key={idx} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '16px', display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: '16px', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.92rem', color: 'var(--cyan-primary)' }}>{vr.rule}</strong>
            <div style={{ background: 'rgba(20, 184, 166, 0.06)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--teal-accent)', fontSize: '0.86rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--teal-accent)', display: 'block' }}>DO SAY:</span>
              “{vr.say_this}”
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #F87171', fontSize: '0.86rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#F87171', display: 'block' }}>AVOID:</span>
              <s>“{vr.not_that}”</s>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={onProceed}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 className="spinner" size={16} />
              Executing Stage 06: Visual Direction & SVG...
            </>
          ) : (
            <>
              Proceed to Visual Direction & SVG Logo <ArrowRight size={16} />
            </>
          )}
        </button>
        {loading && (
          <div className="inline-execution-status" style={{ width: '100%' }}>
            <Loader2 className="spinner" size={20} color="var(--cyan-primary)" />
            <div>
              <div className="inline-execution-text">Stage 06 Active · Visual Identity & Vector SVG</div>
              <div className="inline-execution-subtext">Generating curated color tokens (strictly no purple/orange), typography rules, and sanitized vector SVG mark...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------- STAGE 6: VISUAL DIRECTION & SVG LOGO -----------------
function Stage6Panel({ profile, onProceed, loading, onRegenerate, notify }) {
  const st6 = profile.stage6_visuals;
  if (!st6) return <div className="stage-panel">No visuals data yet.</div>;

  const svgCode = st6.logo_concept?.svg_code || "";

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-title-area">
          <span className="section-eyebrow">Stage 06 · Visual System</span>
          <h2>Design Tokens, Color Mood & Vector Identity</h2>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRegenerate} disabled={loading}>
          <RefreshCw size={14} /> Regenerate
        </button>
      </div>

      {/* SVG Mark & Visual Theme Lockup */}
      <div style={{ display: 'flex', gap: '28px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '24px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="logo-preview-box" dangerouslySetInnerHTML={{ __html: svgCode }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--teal-accent)' }}>
            Vector Logo Mark Concept
          </span>
          <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '4px 0 8px' }}>
            {st6.visual_theme_name}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6' }}>
            {st6.logo_concept?.description}
          </p>
          <div style={{ marginTop: '12px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(svgCode);
                notify('SVG vector code copied to clipboard');
              }}
            >
              <Copy size={13} /> Copy SVG Code
            </button>
          </div>
        </div>
      </div>

      {/* Color Palette Swatches (Strictly Zero Purple, Zero Orange) */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px' }}>
        Color Swatches (Cyan, Teal, Slate Navy — No Purple / No Orange)
      </h3>
      <div className="swatch-grid">
        {(st6.color_palette || []).map((c, idx) => (
          <div key={idx} className="swatch-card" onClick={() => {
            navigator.clipboard.writeText(c.hex);
            notify(`Copied ${c.hex}`);
          }} title="Click to copy hex">
            <div className="swatch-color" style={{ backgroundColor: c.hex }} />
            <div className="swatch-meta">
              <div className="swatch-hex">{c.hex}</div>
              <div className="swatch-role">{c.role}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Typography & Shape Language */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '18px' }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: '700', marginBottom: '8px' }}>Typography Pairings</h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <strong>Headlines:</strong> {st6.typography?.headline_font} ({st6.typography?.headline_style})
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <strong>Body:</strong> {st6.typography?.body_font} ({st6.typography?.body_style})
          </p>
        </div>
        <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '18px' }}>
          <h4 style={{ fontSize: '0.96rem', fontWeight: '700', marginBottom: '8px' }}>Geometry & Composition</h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <strong>Shape Language:</strong> {st6.shape_language}
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <strong>Composition:</strong> {st6.composition_rules}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={onProceed}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 className="spinner" size={16} />
              Executing Stage 07: Consistency Audit...
            </>
          ) : (
            <>
              Proceed to Consistency Audit <ArrowRight size={16} />
            </>
          )}
        </button>
        {loading && (
          <div className="inline-execution-status" style={{ width: '100%' }}>
            <Loader2 className="spinner" size={20} color="var(--cyan-primary)" />
            <div>
              <div className="inline-execution-text">Stage 07 Active · Consistency Critic</div>
              <div className="inline-execution-subtext">Stress-testing alignment across voice rules, visual tokens, and positioning promise...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------- STAGE 7: CONSISTENCY TEST -----------------
function Stage7Panel({ profile, onProceed, loading, onRegenerate }) {
  const st7 = profile.stage7_consistency;
  if (!st7) return <div className="stage-panel">No consistency data yet.</div>;

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-title-area">
          <span className="section-eyebrow">Stage 07 · Consistency Critic</span>
          <h2>Multi-Dimensional Brand Coherence Audit</h2>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRegenerate} disabled={loading}>
          <RefreshCw size={14} /> Re-Audit
        </button>
      </div>

      {/* Consistency Score Card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px', background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '18px', padding: '28px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '5px solid var(--teal-accent)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px var(--teal-glow)' }}>
          <span style={{ fontSize: '1.9rem', fontWeight: '800' }}>{st7.overall_consistency_score}</span>
          <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>/ 100</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--teal-accent)' }}>
              Status: {st7.launch_readiness_status}
            </span>
          </div>
          <p style={{ fontSize: '0.98rem', fontWeight: '500', color: 'var(--text-primary)', marginTop: '6px', lineHeight: '1.6' }}>
            {st7.critic_verdict}
          </p>
        </div>
      </div>

      {/* Per-Dimension Radar / Bar Scores */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>
        Per-Dimension Audit Breakdown
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {Object.entries(st7.dimension_scores || {}).map(([dim, score]) => (
          <div key={dim} style={{ background: 'var(--bg-canvas)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {dim.replace(/_/g, ' ')}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--cyan-primary)', marginTop: '4px' }}>
              {score}%
            </div>
          </div>
        ))}
      </div>

      {/* Surgical Before / After Revisions */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>
        Automated Surgical Revisions (Before vs After)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
        {(st7.applied_revisions || []).map((rev, idx) => (
          <div key={idx} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '18px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--cyan-primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Target Field: {rev.target_field}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '8px 0' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #F87171' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#F87171' }}>BEFORE:</span>
                <p style={{ textDecoration: 'line-through', fontSize: '0.88rem', marginTop: '2px' }}>{rev.before}</p>
              </div>
              <div style={{ background: 'rgba(20, 184, 166, 0.05)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--teal-accent)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--teal-accent)' }}>AFTER (FIXED):</span>
                <p style={{ fontWeight: '600', fontSize: '0.88rem', marginTop: '2px' }}>{rev.after}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <strong>Rationale:</strong> {rev.why_changed}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={onProceed}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 className="spinner" size={16} />
              Executing Stage 08: Launch Kit Generation...
            </>
          ) : (
            <>
              Proceed to Executable Launch Kit <ArrowRight size={16} />
            </>
          )}
        </button>
        {loading && (
          <div className="inline-execution-status" style={{ width: '100%' }}>
            <Loader2 className="spinner" size={20} color="var(--cyan-primary)" />
            <div>
              <div className="inline-execution-text">Stage 08 Active · Launch Kit & GTM</div>
              <div className="inline-execution-subtext">Synthesizing landing copy, 5 launch social posts, operations checklist, and 30-day roadmap...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------- STAGE 8: LAUNCH KIT -----------------
function Stage8Panel({ profile, loading, onRegenerate, onShare, onExportJSON, onExportPDF, notify }) {
  const st8 = profile.stage8_launchkit;
  if (!st8) return <div className="stage-panel">No launch kit data yet.</div>;

  const [activeTab, setActiveTab] = useState('landing'); // 'landing', 'social', 'checklist', 'roadmap'

  return (
    <div className="stage-panel">
      <div className="stage-panel-header">
        <div className="stage-panel-title-area">
          <span className="section-eyebrow">Stage 08 · Launch Kit</span>
          <h2>Ready to Ship & Launch</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onExportJSON}><Download size={14} /> JSON</button>
          <button className="btn btn-secondary btn-sm" onClick={onExportPDF}><Download size={14} /> PDF</button>
          <button className="btn btn-primary btn-sm" onClick={onShare}><Share2 size={14} /> Share</button>
        </div>
      </div>

      {/* Internal Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '24px' }}>
        <button className={`btn btn-sm ${activeTab === 'landing' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('landing')}>
          Landing Page Copy
        </button>
        <button className={`btn btn-sm ${activeTab === 'social' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('social')}>
          5 Social Launch Posts
        </button>
        <button className={`btn btn-sm ${activeTab === 'checklist' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('checklist')}>
          Launch Checklist
        </button>
        <button className={`btn btn-sm ${activeTab === 'roadmap' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('roadmap')}>
          First 30 Days Plan
        </button>
      </div>

      {/* Tab: Landing Wireframe */}
      {activeTab === 'landing' && (
        <div>
          <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cyan-primary)' }}>
              Hero Section
            </span>
            <h2 style={{ fontSize: '2.1rem', fontWeight: '800', margin: '8px 0 12px', letterSpacing: '-0.02em' }}>
              {st8.landing_page?.hero_headline}
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px', maxWidth: '720px' }}>
              {st8.landing_page?.hero_subheadline}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary">{st8.landing_page?.primary_cta}</button>
              <button className="btn btn-secondary">{st8.landing_page?.secondary_cta}</button>
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>Feature Value Blocks</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {(st8.landing_page?.feature_blocks || []).map((fb, idx) => (
              <div key={idx} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '20px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '6px' }}>{fb.title}</h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{fb.copy}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: 5 Social Posts */}
      {activeTab === 'social' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {(st8.social_posts || []).map((post, idx) => (
            <div key={idx} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--teal-accent)', background: 'var(--bg-pill)', padding: '3px 8px', borderRadius: '6px' }}>
                    {post.theme}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.platform}</span>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const fullText = `${post.hook}\n\n${post.body}\n\n${(post.hashtags || []).join(' ')}`;
                    navigator.clipboard.writeText(fullText);
                    notify(`Copied post #${idx + 1}`);
                  }}
                >
                  <Copy size={13} /> Copy Post
                </button>
              </div>
              <h4 style={{ fontSize: '1.02rem', fontWeight: '700', marginBottom: '10px' }}>{post.hook}</h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {post.body}
              </p>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                {(post.hashtags || []).map((ht, hIdx) => (
                  <span key={hIdx} style={{ fontSize: '0.78rem', color: 'var(--cyan-primary)' }}>{ht}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Checklist */}
      {activeTab === 'checklist' && (
        <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Launch Day Operations Checklist</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(st8.launch_checklist || []).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '10px' }}>
                <CheckCircle2 size={18} color="var(--teal-accent)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>{item.task}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.category} · {item.timeframe}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: First 30 Days Roadmap */}
      {activeTab === 'roadmap' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {Object.entries(st8.first_30_days_plan || {}).map(([week, plan], idx) => (
            <div key={week} style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cyan-primary)', marginBottom: '8px' }}>
                Week 0{idx + 1}
              </div>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{plan}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Render root
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
