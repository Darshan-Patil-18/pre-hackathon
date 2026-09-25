export const APP_CONFIG = {
  name: "BrandMind",
  tagline: "Build a brand that can think.",
  subheadline: "A multi-stage AI brand-intelligence workflow that interviews founders, battles positioning, challenges generic tropes, checks consistency, and builds launch-ready brand kits.",
  version: "1.0.0",
  hackathonTheme: "Build a brand that can think",
  apiBase: "/api",
  examples: [
    {
      title: "Student Hackathon Teammate Finder",
      badge: "EdTech & Talent",
      idea: "An app that helps students find teammates for hackathons and ambitious side projects based on verified skill proof."
    },
    {
      title: "Autonomous AI Legal Counsel",
      badge: "LegalTech & Solo",
      idea: "An AI-powered contract and compliance copilot built specifically for solo freelance engineers and designers."
    },
    {
      title: "Calm Adaptive Focus Earplugs",
      badge: "Hardware & Wellness",
      idea: "Smart noise-cancelling earplugs with adaptive acoustic damping that filters chatter while keeping human voices crisp."
    },
    {
      title: "Real-time Fleet Carbon Accounting",
      badge: "Climate & B2B",
      idea: "Automated telemetry and fuel sensor integration that turns freight truck fleets into verified carbon offset credits."
    }
  ],
  stages: [
    { id: 1, key: "stage1_interview", label: "Understand & Interview", short: "Interview", icon: "MessageSquare", desc: "Interrogate the raw problem & context" },
    { id: 2, key: "stage2_position", label: "Positioning (Brand Battle)", short: "Battle", icon: "Swords", desc: "3 radical directions + 3 agent critiques" },
    { id: 3, key: "stage3_personality", label: "Personality & Principles", short: "Personality", icon: "Sparkles", desc: "Traits justified by audience tension" },
    { id: 4, key: "stage4_antigeneric", label: "Anti-Generic Engine", short: "Anti-Generic", icon: "ShieldAlert", desc: "Rejection of startup clichés & tropes" },
    { id: 5, key: "stage5_naming", label: "Naming & Messaging", short: "Naming", icon: "Type", desc: "Etymology, domains, voice rules, dos/don'ts" },
    { id: 6, key: "stage6_visuals", label: "Visual Direction & Identity", short: "Visuals", icon: "Palette", desc: "Hex tokens, typography & clean SVG logo" },
    { id: 7, key: "stage7_consistency", label: "Consistency Critic", short: "Consistency", icon: "CheckCircle2", desc: "Multi-dimensional audit & auto-revisions" },
    { id: 8, key: "stage8_launchkit", label: "Launch Kit", short: "Launch Kit", icon: "Rocket", desc: "Landing copy, 5 social posts, 30-day plan" }
  ]
};
