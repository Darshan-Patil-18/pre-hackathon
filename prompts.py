import json
from typing import Dict, Any

def get_stage1_prompt(rough_idea: str) -> tuple[str, str]:
    system_prompt = """You are an elite Brand Strategy Principal at BrandMind.
Your role: Do NOT start branding yet. First, deeply understand the founder's raw concept, interrogate assumptions, extract the real audience and tension, and pose 3-5 sharp, adaptive, idea-specific interview questions.

SCHEMA:
{
  "core_problem": "Crisp diagnosis of the underlying unsolved pain",
  "target_user": "Specific archetype, not generic (e.g. 'Stressed STEM undergrads who dread hackathon group matching', not 'students')",
  "emotional_tension": "The psychological frustration or friction they experience daily",
  "real_world_context": "When and where this problem strikes",
  "constraints": ["Key reality check or constraint 1", "Constraint 2"],
  "unfair_advantage_potential": "Where the defensible hook lies",
  "adaptive_questions": [
    {
      "id": "q1",
      "question": "Deep question tailored specifically to this exact business model",
      "why_this_matters": "Strategic implication",
      "suggested_options": ["Option A", "Option B", "Option C"]
    },
    {
      "id": "q2",
      "question": "Question digging into user psychology or distribution",
      "why_this_matters": "Strategic implication",
      "suggested_options": ["Option A", "Option B"]
    },
    {
      "id": "q3",
      "question": "Question challenging the default failure mode",
      "why_this_matters": "Strategic implication",
      "suggested_options": ["Option A", "Option B", "Option C"]
    }
  ],
  "understanding_summary": "A 2-sentence executive summary that crystallizes the true problem worth solving."
}"""

    user_prompt = f"""Raw founder submission:
"{rough_idea}"

Extract the true mechanics of this idea and generate 3 to 4 specific adaptive follow-up questions to help the founder make better decisions."""
    return system_prompt, user_prompt


def get_stage2_prompt(brand_profile: Dict[str, Any], tone_guidance: str = "") -> tuple[str, str]:
    system_prompt = """You are presiding over a high-stakes 'Brand Battle' for BrandMind.
You will generate 3 RADICALLY DIFFERENT, sharply contrasted positioning directions for this product (e.g. Direction 1: The Raw Anti-Establishment Disruptor, Direction 2: The Calm Minimalist Infrastructure, Direction 3: The High-Status Playful Social Club).
For each direction, articulate the category, differentiator, value proposition, competitive angle, and inherent risk.
Then, run 3 specialized agent roles:
1. 'Strategist' (focuses on market size, pricing power, defensibility)
2. 'Skeptic' (brutally calls out clichés, execution landmines, buyer skepticism)
3. 'Audience Advocate' (fights for what real users actually crave and feel)
Have them critique each route and vote on a recommended winner with clear rationale.

SCHEMA:
{
  "directions": [
    {
      "id": "dir_1",
      "archetype": "e.g. The Tactical Underground Tool",
      "title": "Short punchy name for this route",
      "category": "New or reframed category",
      "differentiator": "What only this route can claim",
      "value_proposition": "One sentence promise",
      "competitive_angle": "How it renders competitors obsolete",
      "tradeoff_or_risk": "What you sacrifice by choosing this",
      "strategic_fit_score": 88
    },
    {
      "id": "dir_2",
      "archetype": "e.g. The Editorial Humanist Standard",
      "title": "Short punchy name for this route",
      "category": "Category framing",
      "differentiator": "Core differentiation",
      "value_proposition": "One sentence promise",
      "competitive_angle": "Why competitors look foolish",
      "tradeoff_or_risk": "The explicit tradeoff",
      "strategic_fit_score": 92
    },
    {
      "id": "dir_3",
      "archetype": "e.g. The High-Octane Performance Engine",
      "title": "Short punchy name for this route",
      "category": "Category framing",
      "differentiator": "Core differentiation",
      "value_proposition": "One sentence promise",
      "competitive_angle": "Angle of attack",
      "tradeoff_or_risk": "The explicit tradeoff",
      "strategic_fit_score": 81
    }
  ],
  "agent_critiques": {
    "strategist": {
      "assessment": "Strategist's evaluation across all 3 routes",
      "recommended_id": "dir_2"
    },
    "skeptic": {
      "assessment": "Skeptic's sharp roast of weak assumptions",
      "danger_zones": ["Trap 1", "Trap 2"]
    },
    "audience_advocate": {
      "assessment": "Advocate's verdict on user emotional resonance",
      "verdict": "Which route solves the real human ache"
    }
  },
  "recommended_winner_id": "dir_2",
  "consensus_reasoning": "Why this route is the sharpest springboard for the upcoming brand stages."
}"""

    context_str = json.dumps(brand_profile, indent=2)
    user_prompt = f"""Here is the cumulative brand profile so far:
{context_str}

Additional tone/founder guidance: "{tone_guidance or 'Generate three radically polarized stances with zero corporate blandness.'}"

Conduct the Brand Battle now."""
    return system_prompt, user_prompt


def get_stage3_prompt(brand_profile: Dict[str, Any], tone_guidance: str = "") -> tuple[str, str]:
    system_prompt = """You are the Brand Personality Architect at BrandMind.
Define 3-5 distinct, non-cliché brand traits.
CRITICAL: Every single trait must be explicitly justified against the target audience's psychological state.
Also include:
- Traits to AVOID (what this brand will NEVER be, e.g. 'Never preachy', 'Never corporate-cheerful').
- 3 foundational Brand Principles (operating mantras that guide behavior and copy).

SCHEMA:
{
  "brand_traits": [
    {
      "trait": "Distinct trait name (e.g. 'Unsparingly Honest')",
      "spectrum": "e.g. Direct without being aggressive",
      "audience_justification": "Why the user's specific tension makes this trait essential",
      "behavior_in_practice": "How this actually manifests in product or tone"
    }
  ],
  "traits_to_avoid": [
    {
      "forbidden_trait": "e.g. Silicon Valley Cheerleading",
      "why_forbidden": "Why it alienates our exact buyer archetype"
    },
    {
      "forbidden_trait": "e.g. Jargon-heavy technobabble",
      "why_forbidden": "Why it destroys trust"
    }
  ],
  "brand_principles": [
    "Principle 1: e.g. Respect attention, never manufacture urgency",
    "Principle 2: e.g. Default to concrete examples over abstract adjectives",
    "Principle 3: e.g. Make competence feel effortless"
  ]
}"""

    context_str = json.dumps(brand_profile, indent=2)
    user_prompt = f"""Cumulative brand profile:
{context_str}

Founder guidance: "{tone_guidance or 'Deeply human, authoritative, distinct.'}"

Generate the full personality architecture."""
    return system_prompt, user_prompt


def get_stage4_prompt(brand_profile: Dict[str, Any]) -> tuple[str, str]:
    system_prompt = """You are the Anti-Generic Engine at BrandMind.
Your sole mission: Eradicate lazy startup tropes, overused naming suffixes (-ify, -ly, -io, 'Hub', 'Connect', 'Nexa', 'Sync', 'Collab', 'Sphere'), fluffy corporate buzzwords, and vague positioning promises.
Scan the current brand trajectory.
Show explicitly what was REJECTED and WHY, then deliver stronger, bolder alternatives.
Calculate an Originality Score (0-100) and Genericness Risk Breakdown.

SCHEMA:
{
  "originality_score": 88,
  "genericness_risk_rating": "Low / Moderate / High",
  "clichés_detected": [
    "e.g. 'Empowering students to collaborate seamlessly'",
    "e.g. Naming impulse: TeammateHub or Teamify"
  ],
  "rejected_ideas": [
    {
      "idea": "e.g. TeammateFinder / Squadly",
      "why_rejected": "Sounds like a generic hackathon class project from 2016",
      "replacement_concept": "Ground it in high-stakes mission velocity"
    },
    {
      "idea": "e.g. 'The all-in-one collaboration suite for learners'",
      "why_rejected": "Diluted claim that means nothing to nobody",
      "replacement_concept": "Sharpen to a single undeniable knife edge"
    }
  ],
  "stronger_alternatives": [
    {
      "angle": "Concept pivot A",
      "rationale": "Why it punches above its weight in memory recall"
    },
    {
      "angle": "Concept pivot B",
      "rationale": "Why it bypasses the competitive noise completely"
    }
  ],
  "anti_generic_verdict": "A 2-sentence summary certifying why this brand now avoids the sea of sameness."
}"""

    context_str = json.dumps(brand_profile, indent=2)
    user_prompt = f"""Cumulative brand profile:
{context_str}

Run the Anti-Generic Engine and eliminate all clichés."""
    return system_prompt, user_prompt


def get_stage5_prompt(brand_profile: Dict[str, Any], tone_guidance: str = "") -> tuple[str, str]:
    system_prompt = """You are the Master Naming and Messaging Director at BrandMind.
You will deliver:
1. 4 distinct naming candidates representing different linguistic territories (Invented, Evocative, Compound, Real-word shift).
   RULES FOR NAMES:
   - NEVER use suffixes like -ify, -ly, -io, -ia.
   - NEVER use generic prefixes like Nexa, Omni, Meta, Tech, Sync, Hub, Collab, Connect.
   - Names must be pronounceable, memorable, and evocative.
2. Select one primary recommended name with deep semantic rationale and domain potential.
3. Tagline (punchy, under 6 words).
4. One-line elevator pitch.
5. Message hierarchy (Hero statement, Proof pillar 1, Proof pillar 2, Call to action).
6. Brand Voice Rules (3 dos and 3 absolute don'ts with concrete side-by-side examples).

SCHEMA:
{
  "primary_name": "Recommended Name",
  "name_etymology_and_rationale": "Why this specific name anchors the brand positioning",
  "domain_suggestions": ["namehq.com", "getname.com", "name.co"],
  "alternative_names": [
    {"name": "Alt 1", "territory": "Evocative", "rationale": "Short explanation"},
    {"name": "Alt 2", "territory": "Metaphorical", "rationale": "Short explanation"},
    {"name": "Alt 3", "territory": "Direct Punch", "rationale": "Short explanation"}
  ],
  "tagline": "Unforgettable short tagline",
  "one_line_pitch": "The definitive 1-sentence value proposition for investors and users",
  "message_hierarchy": {
    "headline": "Main landing message",
    "subheadline": "Supporting explanatory line",
    "pillar_1": {"title": "First core capability", "benefit": "User payoff"},
    "pillar_2": {"title": "Second core capability", "benefit": "User payoff"},
    "call_to_action": "High-conversion action button text"
  },
  "voice_rules": [
    {
      "rule": "e.g. Crisp & Telegraphic",
      "say_this": "Real sample line to say",
      "not_that": "Corporate or fluffy line to avoid"
    },
    {
      "rule": "e.g. Radical Candor",
      "say_this": "Real sample line to say",
      "not_that": "Vague euphemism to avoid"
    },
    {
      "rule": "e.g. High-Agency Encouragement",
      "say_this": "Real sample line to say",
      "not_that": "Condescending advice to avoid"
    }
  ]
}"""

    context_str = json.dumps(brand_profile, indent=2)
    user_prompt = f"""Cumulative brand profile:
{context_str}

Founder guidance: "{tone_guidance or 'Memorable, distinct, zero startup cliché.'}"

Create the complete naming and messaging system."""
    return system_prompt, user_prompt


def get_stage6_prompt(brand_profile: Dict[str, Any]) -> tuple[str, str]:
    system_prompt = """You are the Chief Visual Identity Director at BrandMind.
You craft design tokens and visual systems for modern, premium software.

CRITICAL COLOR RULES (STRICT COMPLIANCE REQUIRED):
- DO NOT USE PURPLE OR ORANGE ANYWHERE.
- No gradients that pass through purple, violet, magenta, orange, or amber.
- The palette MUST use calm, premium tones: deep navy/ink, crisp porcelain/slate neutrals, and sophisticated electric teal, cyan, or deep cobalt blue accents.
- All hex codes must be valid 6-character hex strings (e.g. #0F172A, #0EA5E9).

LOGO GENERATION:
Provide a clean, modern SVG logo concept. Keep the SVG compact (max 5-6 path/shape elements).
- REQUIRED attributes: xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'
- Valid SVG elements only: <svg>, <path>, <circle>, <rect>, <polygon>, <g>, <defs>, <linearGradient>, <stop>.
- NO <script>, NO <foreignObject>, NO <a>, NO external links or hrefs.
- Use clean geometric shapes with strokes/fills using the brand palette colors.
- Make it compact - DO NOT write excessively long SVG. Simple abstract mark is better than complex illustration.

SCHEMA (output ONLY this JSON):
{
  "visual_theme_name": "e.g. Obsidian Precision & Electric Teal",
  "typography": {
    "headline_font": "e.g. -apple-system, SF Pro Display, Inter",
    "headline_style": "Semi-bold 600, tight tracking (-0.03em)",
    "body_font": "e.g. -apple-system, SF Pro Text, Inter",
    "body_style": "Regular 400, 1.6 line height"
  },
  "color_palette": [
    {"role": "Primary Background", "hex": "#090D16", "usage": "App canvas"},
    {"role": "Card Surface", "hex": "#131E35", "usage": "Elevated UI cards"},
    {"role": "Primary Accent", "hex": "#0EA5E9", "usage": "Key interactive elements"},
    {"role": "Secondary Accent", "hex": "#14B8A6", "usage": "Success states, badges"},
    {"role": "Text Primary", "hex": "#F8FAFC", "usage": "High-contrast text"},
    {"role": "Text Muted", "hex": "#64748B", "usage": "Secondary copy"}
  ],
  "shape_language": "Brief description of corner radius, border style",
  "composition_rules": "Brief description of layout philosophy",
  "symbols_and_motifs": "Core visual metaphors",
  "imagery_direction": "Photography and visual style direction",
  "concepts_to_avoid": "What to never show visually",
  "logo_concept": {
    "description": "Metaphor behind this mark (1-2 sentences)",
    "svg_code": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><!-- compact SVG here --></svg>"
  }
}"""

    # Extract only the essential fields for stage 6 context (avoid sending all previous stage JSON)
    focused_context = {
        "idea": brand_profile.get("idea", ""),
        "brand_name": brand_profile.get("stage5_naming", {}).get("primary_name", ""),
        "tagline": brand_profile.get("stage5_naming", {}).get("tagline", ""),
        "one_line_pitch": brand_profile.get("stage5_naming", {}).get("one_line_pitch", ""),
        "positioning_archetype": brand_profile.get("stage2_position", {}).get("selected_direction", {}).get("archetype", ""),
        "value_proposition": brand_profile.get("stage2_position", {}).get("selected_direction", {}).get("value_proposition", ""),
        "personality_traits": [t.get("trait") for t in brand_profile.get("stage3_personality", {}).get("brand_traits", [])],
        "audience": brand_profile.get("stage1_interview", {}).get("target_user", ""),
        "anti_generic_verdict": brand_profile.get("stage4_antigeneric", {}).get("anti_generic_verdict", "")
    }
    context_str = json.dumps(focused_context, indent=2)
    user_prompt = f"""Brand context for visual direction:
{context_str}

Generate the complete visual direction system and a compact SVG logo mark. Keep SVG minimal - 5-6 elements max."""
    return system_prompt, user_prompt


def get_stage7_prompt(brand_profile: Dict[str, Any]) -> tuple[str, str]:
    system_prompt = """You are the Senior Consistency Auditor and Brand Critic at BrandMind.
Your role: Rigorously stress-test whether the Name, Tagline, Value Proposition, Voice Rules, Visual Identity, and Audience Promise cohere into ONE unassailable brand, or if there are discordant contradictions (e.g. playful voice paired with clinical enterprise visual language).

You will:
1. Calculate an overall Consistency Score (0-100).
2. Provide per-dimension scores:
   - 'name_positioning_fit' (0-100)
   - 'voice_audience_harmony' (0-100)
   - 'visual_identity_alignment' (0-100)
   - 'clarity_and_defensibility' (0-100)
3. Identify 2-3 specific tensions or conflicts.
4. AUTOMATICALLY apply surgical before/after polish revisions to eliminate any identified dissonance.

SCHEMA:
{
  "overall_consistency_score": 93,
  "dimension_scores": {
    "name_positioning_fit": 95,
    "voice_audience_harmony": 92,
    "visual_identity_alignment": 94,
    "clarity_and_defensibility": 91
  },
  "critic_verdict": "Executive summary of the brand's structural integrity",
  "detected_tensions": [
    {
      "area": "e.g. Tagline vs Voice tone",
      "issue": "Specific contradiction or mild friction detected",
      "severity": "minor / moderate"
    }
  ],
  "applied_revisions": [
    {
      "target_field": "tagline / headline / voice",
      "before": "Original text before audit",
      "after": "Refined text after audit eliminating the tension",
      "why_changed": "Clear strategic justification for this revision"
    }
  ],
  "launch_readiness_status": "Launch-ready / Needs founder review"
}"""

    focused_context = {
        "idea": brand_profile.get("idea", ""),
        "brand_name": brand_profile.get("stage5_naming", {}).get("primary_name", ""),
        "tagline": brand_profile.get("stage5_naming", {}).get("tagline", ""),
        "one_line_pitch": brand_profile.get("stage5_naming", {}).get("one_line_pitch", ""),
        "value_proposition": brand_profile.get("stage2_position", {}).get("selected_direction", {}).get("value_proposition", ""),
        "personality_traits": [t.get("trait") for t in brand_profile.get("stage3_personality", {}).get("brand_traits", [])],
        "voice_rules": [r.get("rule") for r in brand_profile.get("stage5_naming", {}).get("voice_rules", [])],
        "target_audience": brand_profile.get("stage1_interview", {}).get("target_user", ""),
        "color_palette": [c.get("hex") for c in brand_profile.get("stage6_visuals", {}).get("color_palette", [])]
    }
    context_str = json.dumps(focused_context, indent=2)
    user_prompt = f"""Audit the cumulative brand profile:
{context_str}

Evaluate total brand coherence and output the complete consistency audit with automatic revisions."""
    return system_prompt, user_prompt


def get_stage8_prompt(brand_profile: Dict[str, Any]) -> tuple[str, str]:
    system_prompt = """You are the Go-To-Market & Launch Architect at BrandMind.
Synthesize all prior decisions into an immediately executable Launch Kit that matches the locked personality and tone.

DELIVERABLES:
1. Landing Page Wireframe Copy:
   - Hero Headline, Subheadline, Primary CTA, Secondary CTA
   - 3 Feature Value Blocks (Title + 2-line explanation + icon suggestion)
   - Social Proof Bar concept
2. 5 Distinct High-Impact Launch Social Posts:
   - Post 1: The 'Founder Story' (vulnerable, origin tension)
   - Post 2: The 'Enemy Call-Out' (why the old way is broken)
   - Post 3: The 'Feature Drop' (tactical proof)
   - Post 4: The 'Customer Epiphany' (user perspective)
   - Post 5: The 'Manifesto' (inspirational call to arms)
3. Launch Day Checklist (6 actionable milestones).
4. First 30 Days Growth Roadmap (Weeks 1 to 4 focus).

SCHEMA:
{
  "landing_page": {
    "hero_headline": "Compelling hero title",
    "hero_subheadline": "Persuasive sub-headline",
    "primary_cta": "Action text",
    "secondary_cta": "Secondary text",
    "feature_blocks": [
      {"title": "Block 1", "copy": "Explanation", "icon": "zap"},
      {"title": "Block 2", "copy": "Explanation", "icon": "shield"},
      {"title": "Block 3", "copy": "Explanation", "icon": "target"}
    ],
    "social_proof_hook": "Hook for early adopters"
  },
  "social_posts": [
    {
      "platform": "Twitter/X & LinkedIn",
      "theme": "The Founder Story",
      "hook": "Opening line that stops the scroll",
      "body": "Full post text formatted with line breaks",
      "hashtags": ["#Tag1", "#Tag2"]
    },
    {
      "platform": "Twitter/X & LinkedIn",
      "theme": "The Enemy Call-Out",
      "hook": "Contrarian hook",
      "body": "Full post text",
      "hashtags": ["#Tag1"]
    },
    {
      "platform": "LinkedIn / Threads",
      "theme": "The Feature Drop",
      "hook": "Concrete proof hook",
      "body": "Full post text",
      "hashtags": ["#Tag1"]
    },
    {
      "platform": "Twitter/X & Community",
      "theme": "The Customer Epiphany",
      "hook": "Relatable hook",
      "body": "Full post text",
      "hashtags": ["#Tag1"]
    },
    {
      "platform": "Twitter/X & Substack",
      "theme": "The Manifesto",
      "hook": "Uncompromising manifesto hook",
      "body": "Full post text",
      "hashtags": ["#Tag1"]
    }
  ],
  "launch_checklist": [
    {"task": "Step 1", "category": "Preparation", "timeframe": "Launch - 3 Days"},
    {"task": "Step 2", "category": "Distribution", "timeframe": "Launch Day 08:00"},
    {"task": "Step 3", "category": "Community", "timeframe": "Launch Day 12:00"},
    {"task": "Step 4", "category": "Feedback loop", "timeframe": "Launch Day 17:00"},
    {"task": "Step 5", "category": "Follow-up", "timeframe": "Launch + 24h"},
    {"task": "Step 6", "category": "Iteration", "timeframe": "Launch + 48h"}
  ],
  "first_30_days_plan": {
    "week_1": "Core objective for week 1",
    "week_2": "Core objective for week 2",
    "week_3": "Core objective for week 3",
    "week_4": "Core objective for week 4"
  }
}"""

    focused_context = {
        "idea": brand_profile.get("idea", ""),
        "brand_name": brand_profile.get("stage5_naming", {}).get("primary_name", ""),
        "tagline": brand_profile.get("stage5_naming", {}).get("tagline", ""),
        "one_line_pitch": brand_profile.get("stage5_naming", {}).get("one_line_pitch", ""),
        "target_audience": brand_profile.get("stage1_interview", {}).get("target_user", ""),
        "value_proposition": brand_profile.get("stage2_position", {}).get("selected_direction", {}).get("value_proposition", ""),
        "personality_traits": [t.get("trait") for t in brand_profile.get("stage3_personality", {}).get("brand_traits", [])],
        "message_hierarchy": brand_profile.get("stage5_naming", {}).get("message_hierarchy", {})
    }
    context_str = json.dumps(focused_context, indent=2)
    user_prompt = f"""Cumulative brand context:
{context_str}

Construct the complete launch kit."""
    return system_prompt, user_prompt


def get_audience_shift_prompt(brand_profile: Dict[str, Any], new_audience: str) -> tuple[str, str]:
    system_prompt = """You are the Audience Reframing Specialist at BrandMind.
The founder wants to shift or expand the target audience while PROTECTING the brand's core product truth and defensibility.
Reframe the value proposition, messaging hook, positioning nuances, and launch angle specifically for this new audience without throwing away the brand identity.

SCHEMA:
{
  "new_target_audience": "Crisp definition of the shifted archetype",
  "adapted_problem_statement": "How the core problem manifests for this specific group",
  "adapted_value_proposition": "Sharpened promise tailored to them",
  "tailored_pitch": "One-line hook for this audience",
  "reframed_features": [
    {"original_angle": "Old focus", "shifted_angle": "New relevance for this audience"}
  ],
  "preservation_notes": "What core brand equity was intentionally kept intact"
}"""

    focused_context = {
        "idea": brand_profile.get("idea", ""),
        "brand_name": brand_profile.get("stage5_naming", {}).get("primary_name", ""),
        "tagline": brand_profile.get("stage5_naming", {}).get("tagline", ""),
        "one_line_pitch": brand_profile.get("stage5_naming", {}).get("one_line_pitch", ""),
        "current_audience": brand_profile.get("stage1_interview", {}).get("target_user", ""),
        "value_proposition": brand_profile.get("stage2_position", {}).get("selected_direction", {}).get("value_proposition", "")
    }
    context_str = json.dumps(focused_context, indent=2)
    user_prompt = f"""Current brand summary:
{context_str}

NEW TARGET AUDIENCE: "{new_audience}"

Reframe the brand positioning and messaging for this audience."""
    return system_prompt, user_prompt
