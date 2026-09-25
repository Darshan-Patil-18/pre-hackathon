import sqlite3
import json
import os
import uuid
import time
from typing import Dict, Any, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "brandmind.db")

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        idea TEXT NOT NULL,
        current_stage INTEGER DEFAULT 1,
        profile_json TEXT NOT NULL,
        telemetry_json TEXT NOT NULL,
        created_at REAL NOT NULL,
        updated_at REAL NOT NULL
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS kits (
        kit_id TEXT PRIMARY KEY,
        session_id TEXT,
        brand_name TEXT NOT NULL,
        tagline TEXT,
        full_kit_json TEXT NOT NULL,
        created_at REAL NOT NULL
    );
    """)
    
    conn.commit()
    seed_demo_kit(conn)
    conn.close()

def save_session(session_id: str, idea: str, stage: int, profile: Dict[str, Any], telemetry: list):
    conn = get_connection()
    cursor = conn.cursor()
    now = time.time()
    cursor.execute("""
    INSERT INTO sessions (session_id, idea, current_stage, profile_json, telemetry_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
        idea=excluded.idea,
        current_stage=excluded.current_stage,
        profile_json=excluded.profile_json,
        telemetry_json=excluded.telemetry_json,
        updated_at=excluded.updated_at
    """, (session_id, idea, stage, json.dumps(profile), json.dumps(telemetry), now, now))
    conn.commit()
    conn.close()

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "session_id": row["session_id"],
        "idea": row["idea"],
        "current_stage": row["current_stage"],
        "profile": json.loads(row["profile_json"]),
        "telemetry": json.loads(row["telemetry_json"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"]
    }

def save_kit(kit_id: str, session_id: str, brand_name: str, tagline: str, full_kit: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    now = time.time()
    cursor.execute("""
    INSERT INTO kits (kit_id, session_id, brand_name, tagline, full_kit_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(kit_id) DO UPDATE SET
        brand_name=excluded.brand_name,
        tagline=excluded.tagline,
        full_kit_json=excluded.full_kit_json
    """, (kit_id, session_id, brand_name, tagline, json.dumps(full_kit), now))
    conn.commit()
    conn.close()

def get_kit(kit_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM kits WHERE kit_id = ?", (kit_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "kit_id": row["kit_id"],
        "session_id": row["session_id"],
        "brand_name": row["brand_name"],
        "tagline": row["tagline"],
        "full_kit": json.loads(row["full_kit_json"]),
        "created_at": row["created_at"]
    }

def seed_demo_kit(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT kit_id FROM kits WHERE kit_id = 'demo-teammate'")
    if cursor.fetchone():
        return # already seeded
    
    demo_profile = {
        "idea": "An app that helps students find teammates for hackathons and ambitious side projects",
        "stage1_interview": {
            "core_problem": "Students default to awkward campus Discord threads or random group allocations, resulting in skill mismatches, ghosting, and missed hackathon podiums.",
            "target_user": "High-agency STEM & design students aiming for top-tier competitions and startup incubators",
            "emotional_tension": "The dread of carrying dead weight or feeling intimidated by overly aggressive cliques",
            "real_world_context": "The 72-hour window before hackathon registration closes when team formation is frantic",
            "constraints": ["Zero budget for users", "Asymmetrical skill distribution", "Reputation trust deficit"],
            "unfair_advantage_potential": "Verified github commit velocity and proof-of-work signals over self-reported bios",
            "understanding_summary": "Team discovery is not a social directory problem; it is a high-stakes talent alignment problem under acute deadline pressure."
        },
        "stage2_position": {
            "directions": [
                {
                    "id": "dir_1",
                    "archetype": "The Syndicate / Elite Crew",
                    "title": "Kinetic Squad Protocol",
                    "category": "High-Performance Team Foundry",
                    "differentiator": "Algorithmic proof-of-work pairing based on codebase synergy",
                    "value_proposition": "Build with builders who push as hard as you do.",
                    "competitive_angle": "Kills generic student discords by testing actual chemistry",
                    "tradeoff_or_risk": "Can feel exclusionary to total novices",
                    "strategic_fit_score": 89
                },
                {
                    "id": "dir_2",
                    "archetype": "The Sovereign Workshop",
                    "title": "Vanguard Commons",
                    "category": "Peer Builder Network",
                    "differentiator": "Reputation tracking that eliminates flake risk",
                    "value_proposition": "Never get stranded on a project again.",
                    "competitive_angle": "Replaces awkward self-promotion with clear work evidence",
                    "tradeoff_or_risk": "Requires onboarding discipline",
                    "strategic_fit_score": 94
                },
                {
                    "id": "dir_3",
                    "archetype": "The Playground Lab",
                    "title": "Sparksync",
                    "category": "Casual Project Matchmaker",
                    "differentiator": "Swipe-based interest matching",
                    "value_proposition": "Find your next co-creator over coffee.",
                    "competitive_angle": "Frictionless setup",
                    "tradeoff_or_risk": "High churn and low commitment",
                    "strategic_fit_score": 72
                }
            ],
            "agent_critiques": {
                "strategist": {
                    "assessment": "Direction 2 creates an enduring builder graph with network effects that extend into tech recruiting.",
                    "recommended_id": "dir_2"
                },
                "skeptic": {
                    "assessment": "Direction 3 will suffer 90% ghosting like every generic student swipe app. Direction 2 has teeth.",
                    "danger_zones": ["Over-indexing on casual users", "Lacking accountability mechanisms"]
                },
                "audience_advocate": {
                    "assessment": "Students don't need another friend app. They need teammates who actually write code at 3 AM.",
                    "verdict": "Vanguard Commons solves the real pain of project abandonment."
                }
            },
            "selected_direction_id": "dir_2",
            "selected_direction": {
                "archetype": "The Sovereign Workshop",
                "title": "Vanguard Commons",
                "category": "Peer Builder Network",
                "differentiator": "Reputation tracking that eliminates flake risk",
                "value_proposition": "Never get stranded on a project again."
            }
        },
        "stage3_personality": {
            "brand_traits": [
                {
                    "trait": "Calmly Rigorous",
                    "spectrum": "Demanding quality without being pretentious",
                    "audience_justification": "Serious students respect peers who value craftsmanship and mutual respect.",
                    "behavior_in_practice": "Clean data visualizers, clear project milestones, zero cheesy emojis."
                },
                {
                    "trait": "High-Agency & Direct",
                    "spectrum": "Blunt clarity over superficial politeness",
                    "audience_justification": "Tired of diplomatic talk that disguises lack of commitment.",
                    "behavior_in_practice": "Direct availability calendars, verified tech stacks, zero ambiguous status tags."
                },
                {
                    "trait": "Quietly Electric",
                    "spectrum": "Understated intensity rather than startup hype",
                    "audience_justification": "True builders cringe at Silicon Valley buzzwords.",
                    "behavior_in_practice": "Focus on shipped repositories and live prototypes."
                }
            ],
            "traits_to_avoid": [
                {"forbidden_trait": "Cheerleader Campus Hype", "why_forbidden": "Sounds like an administrative student life seminar."},
                {"forbidden_trait": "Corporate Bureaucracy", "why_forbidden": "Students flee anything that feels like an HR performance review."}
            ],
            "brand_principles": [
                "Code speaks louder than bios.",
                "Mutual commitment is the only prerequisite.",
                "Keep the tools minimal so the work takes center stage."
            ]
        },
        "stage4_antigeneric": {
            "originality_score": 91,
            "genericness_risk_rating": "Low",
            "clichés_detected": [
                "Names ending in -ify, -ly, or -hub (e.g. Squadify, TeamHub)",
                "Taglines claiming to 'Empower the next generation of changemakers'",
                "Stock vectors of smiling young adults pointing at laptop screens"
            ],
            "rejected_ideas": [
                {
                    "idea": "CollabMate",
                    "why_rejected": "Sounds like school-assigned groupware from 2012.",
                    "replacement_concept": "CohortCraft / Forge"
                },
                {
                    "idea": "Tinder for Hackers",
                    "why_rejected": "Trivializes high-stakes intellectual collaboration into superficial swiping.",
                    "replacement_concept": "Talent Foundry with verified commit synergy"
                }
            ],
            "stronger_alternatives": [
                {
                    "angle": "The Co-Builder Syndicate",
                    "rationale": "Frames teaming up as joining an ambitious expedition rather than signing up for a roster."
                }
            ],
            "anti_generic_verdict": "Transformed from a trivial student matching directory into an uncompromising builder foundry."
        },
        "stage5_naming": {
            "primary_name": "CohortCraft",
            "name_etymology_and_rationale": "Combines the shared bond of an ambitious 'Cohort' with the tactile devotion of 'Craft'. Memorable, authoritative, and phonetically punchy.",
            "domain_suggestions": ["cohortcraft.co", "cohortcraft.dev", "usecohort.com"],
            "alternative_names": [
                {"name": "FoundryZero", "territory": "Industrial Precision", "rationale": "Where raw student potential is cast into working crews"},
                {"name": "KineticBench", "territory": "Active Velocity", "rationale": "Evokes ready-to-deploy technical power"},
                {"name": "Crucible", "territory": "High-Stakes Testing", "rationale": "Pressure-tested teams that win"}
            ],
            "tagline": "Build with builders.",
            "one_line_pitch": "The peer-to-peer talent foundry that pairs high-agency student builders for hackathons and breakout ventures.",
            "message_hierarchy": {
                "headline": "Stop searching for teammates. Start assembling crews.",
                "subheadline": "CohortCraft matches verified developers, designers, and researchers based on proof-of-work and project velocity — eliminating ghosting forever.",
                "pillar_1": {"title": "Proof of Work Matching", "benefit": "Pair on real git commits and design prototypes, not vague LinkedIn buzzwords."},
                "pillar_2": {"title": "Commitment Escrow", "benefit": "Smart milestone check-ins keep every teammate accountable through the final pitch."},
                "call_to_action": "Assemble Your Crew"
            },
            "voice_rules": [
                {
                    "rule": "Telegraphic Velocity",
                    "say_this": "Shipped in 48 hours. Zero fluff.",
                    "not_that": "Our collaborative paradigm facilitates synergistic team delivery."
                },
                {
                    "rule": "Honest Respect for Craft",
                    "say_this": "Show your commits. We'll handle the matching.",
                    "not_that": "Unleash your inner superhero with our magical AI assistant."
                },
                {
                    "rule": "Zero Hand-Holding",
                    "say_this": "Find peers who match your cadence.",
                    "not_that": "We are here to help you make lots of wonderful new friends!"
                }
            ]
        },
        "stage6_visuals": {
            "visual_theme_name": "Obsidian Precision & High-Velocity Cyan",
            "typography": {
                "headline_font": "-apple-system, 'SF Pro Display', Inter, sans-serif",
                "headline_style": "Semi-bold 600, tight tracking (-0.03em), architectural authority",
                "body_font": "-apple-system, 'SF Pro Text', Inter, sans-serif",
                "body_style": "Regular 400, generous 1.6 line height for effortless scanning"
            },
            "color_palette": [
                {"role": "Obsidian Deep Navy (Background)", "hex": "#090D16", "usage": "Primary app canvas and deep contrast surface"},
                {"role": "Ink Slate Surface (Cards)", "hex": "#131E35", "usage": "Elevated frosted UI cards and container borders"},
                {"role": "Electric Cyan (Primary Accent)", "hex": "#0EA5E9", "usage": "Primary action triggers, hero gradients, progress signals"},
                {"role": "Clean Teal (Secondary Accent)", "hex": "#14B8A6", "usage": "Verification badges, success states, live commit telemetry"},
                {"role": "Crisp Slate White (Text Light)", "hex": "#F8FAFC", "usage": "Hero headers and high-contrast labels"},
                {"role": "Muted Slate Gray (Text Muted)", "hex": "#64748B", "usage": "Supporting copy, borders, and metadata footnotes"}
            ],
            "shape_language": "iOS-style 16px continuous rounded corners, micro 1px translucent borders, glassmorphic backdrop-filter blurs",
            "composition_rules": "Generous negative space, modular grid cards, clear visual hierarchy with prominent metric pill badges",
            "symbols_and_motifs": "Interlocking geometric coordinates, convergence vectors, pulse beacons",
            "imagery_direction": "High-contrast architectural details, terminal screencasts, dark schematic blueprints",
            "concepts_to_avoid": "No purple, no orange, no cartoon mascots, no generic multi-colored startup blobs",
            "logo_concept": {
                "description": "Two interlocking precision vectors forming a kinetic 'C' beacon, symbolizing complementary forces coming together to build.",
                "svg_code": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' rx='22' fill='#090D16'/><path d='M30 35C30 26.7157 36.7157 20 45 20H60C64.4183 20 68 23.5817 68 28C68 32.4183 64.4183 36 60 36H46C43.7909 36 42 37.7909 42 40V60C42 62.2091 43.7909 64 46 64H60C64.4183 64 68 67.5817 68 72C68 76.4183 64.4183 80 60 80H45C36.7157 80 30 73.2843 30 65V35Z' fill='url(#paint0_linear)'/><circle cx='68' cy='50' r='7' fill='#14B8A6'/><defs><linearGradient id='paint0_linear' x1='30' y1='20' x2='75' y2='80' gradientUnits='userSpaceOnUse'><stop stop-color='#38BDF8'/><stop offset='1' stop-color='#0284C7'/></linearGradient></defs></svg>"
            }
        },
        "stage7_consistency": {
            "overall_consistency_score": 95,
            "dimension_scores": {
                "name_positioning_fit": 97,
                "voice_audience_harmony": 94,
                "visual_identity_alignment": 96,
                "clarity_and_defensibility": 93
            },
            "critic_verdict": "Exemplary brand coherence. The transition from student frustration to 'CohortCraft: Build with builders' maintains relentless credibility throughout.",
            "detected_tensions": [
                {
                    "area": "Onboarding Call to Action",
                    "issue": "Original CTA was 'Sign Up Free', which sounded like a low-tier consumer toy.",
                    "severity": "minor"
                }
            ],
            "applied_revisions": [
                {
                    "target_field": "call_to_action",
                    "before": "Sign Up Free",
                    "after": "Assemble Your Crew",
                    "why_changed": "Instantly reinforces agency and the mission-driven ethos of the product."
                },
                {
                    "target_field": "subheadline",
                    "before": "Find friends for your next student project.",
                    "after": "CohortCraft matches verified builders based on proof-of-work and project velocity.",
                    "why_changed": "Elevates positioning from casual social network to high-value talent foundry."
                }
            ],
            "launch_readiness_status": "Launch-ready"
        },
        "stage8_launchkit": {
            "landing_page": {
                "hero_headline": "Stop searching for teammates. Start assembling crews.",
                "hero_subheadline": "CohortCraft matches verified developers, designers, and researchers based on proof-of-work and project velocity — eliminating ghosting forever.",
                "primary_cta": "Assemble Your Crew",
                "secondary_cta": "Explore Live Projects",
                "feature_blocks": [
                    {"title": "Proof-of-Work Profiling", "copy": "Sync GitHub, Figma, and paper preprints. Match on demonstrated capability, not resume buzzwords.", "icon": "cpu"},
                    {"title": "Velocity Calibration", "copy": "Filter by target competition tier: 48-hour sprint, national hackathon podium, or YC pre-incubator track.", "icon": "zap"},
                    {"title": "Anti-Ghosting Protocol", "copy": "Reputation stakes and scheduled milestone check-ins keep everyone accountable to the deadline.", "icon": "shield"}
                ],
                "social_proof_hook": "Powering podium finishers at 40+ collegiate hackathons worldwide."
            },
            "social_posts": [
                {
                    "platform": "Twitter/X & LinkedIn",
                    "theme": "The Founder Story",
                    "hook": "We've all had the 3:00 AM hackathon realization: you're the only one still writing code.",
                    "body": "Your teammate vanished to sleep, the design isn't finished, and the presentation is in six hours.\n\nStudent project matching has been broken for a decade because it relies on awkward Discord intros.\n\nWe built CohortCraft to fix that forever: match on real GitHub velocity, commit to clear milestones, and ship together.\n\nBuild with builders: cohortcraft.co",
                    "hashtags": ["#Hackathon", "#BuildInPublic", "#DevTools"]
                },
                {
                    "platform": "Twitter/X & LinkedIn",
                    "theme": "The Enemy Call-Out",
                    "hook": "Stop using Discord general channels as an HR department.",
                    "body": "Posting 'Looking for react dev' in a 5,000-person channel is how you end up with 3 ghosted repositories.\n\nGreat teams don't meet by accident. They align on cadence, stack, and ambition.\n\nCohortCraft is the antidote to hackathon flake culture.",
                    "hashtags": ["#Startup", "#StudentFounder"]
                },
                {
                    "platform": "LinkedIn / Threads",
                    "theme": "The Feature Drop",
                    "hook": "Introducing Proof-of-Work Team Discovery.",
                    "body": "Before you commit 48 sleepless hours to a project with someone, you should know how they actually build.\n\nCohortCraft introduces verified repo sync and commitment escrow for student creators.\n\nLive today: cohortcraft.co",
                    "hashtags": ["#Engineering", "#HackathonCrew"]
                },
                {
                    "platform": "Twitter/X & Community",
                    "theme": "The Customer Epiphany",
                    "hook": "'We won 1st place in AI track after meeting 36 hours prior.'",
                    "body": "When Priya (ML researcher) and Dev (systems engineer) matched on CohortCraft, they had never met.\n\nBy Sunday afternoon, their multimodal agent took the grand prize.\n\nGreat things happen when high-agency minds converge.",
                    "hashtags": ["#WinningHackathons", "#Cohorts"]
                },
                {
                    "platform": "Twitter/X & Substack",
                    "theme": "The Manifesto",
                    "hook": "The future belongs to small, high-density crews.",
                    "body": "You don't need a 50-person company to build software that impacts millions.\n\nYou need three people with uncompromising standards who push in the same direction.\n\nFind your crew: cohortcraft.co",
                    "hashtags": ["#Builders", "#Manifesto"]
                }
            ],
            "launch_checklist": [
                {"task": "Seed 50 verified builder profiles from top engineering universities", "category": "Preparation", "timeframe": "T - 5 Days"},
                {"task": "Deploy launch announcement thread on Twitter/X with live demo video", "category": "Distribution", "timeframe": "Launch Day 08:00 EST"},
                {"task": "Host live pairing AMA on campus Discord community", "category": "Community", "timeframe": "Launch Day 14:00 EST"},
                {"task": "Monitor match request throughput and latency", "category": "Telemetry", "timeframe": "Launch Day 18:00 EST"},
                {"task": "Publish 'Top 10 Teammate Synergy Patterns' post-launch teardown", "category": "Content", "timeframe": "T + 48h"}
            ],
            "first_30_days_plan": {
                "week_1": "Campus Ambassador rollout across 12 tier-1 university tech clubs",
                "week_2": "Official partnership integration with 3 upcoming regional hackathons",
                "week_3": "Launch 'Builder Karma' reputation leaderboard to reward dependable collaborators",
                "week_4": "Release project showcase gallery for alumni teams entering angel incubators"
            }
        }
    }
    
    demo_telemetry = [
        {"stage": "stage1_interview", "provider": "groq", "model": "qwen/qwen3.8-27b", "latency_ms": 612.4},
        {"stage": "stage2_position", "provider": "groq", "model": "openai/gpt-oss-120b", "latency_ms": 948.1},
        {"stage": "stage3_personality", "provider": "groq", "model": "qwen/qwen3.8-27b", "latency_ms": 580.3},
        {"stage": "stage4_antigeneric", "provider": "groq", "model": "qwen/qwen3.8-27b", "latency_ms": 720.8},
        {"stage": "stage5_naming", "provider": "groq", "model": "openai/gpt-oss-120b", "latency_ms": 890.6},
        {"stage": "stage6_visuals", "provider": "groq", "model": "qwen/qwen3.8-27b", "latency_ms": 810.2},
        {"stage": "stage7_consistency", "provider": "groq", "model": "openai/gpt-oss-120b", "latency_ms": 930.5},
        {"stage": "stage8_launchkit", "provider": "groq", "model": "qwen/qwen3.8-27b", "latency_ms": 740.1}
    ]
    
    now = time.time()
    cursor.execute("""
    INSERT INTO kits (kit_id, session_id, brand_name, tagline, full_kit_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, ("demo-teammate", "demo-session", "CohortCraft", "Build with builders.", json.dumps({
        "profile": demo_profile,
        "telemetry": demo_telemetry
    }), now))
    
    cursor.execute("""
    INSERT INTO sessions (session_id, idea, current_stage, profile_json, telemetry_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("demo-session", demo_profile["idea"], 8, json.dumps(demo_profile), json.dumps(demo_telemetry), now, now))
    
    conn.commit()

# Initialize on import
init_db()
