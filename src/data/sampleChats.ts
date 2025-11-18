export type ChatThread = {
  id: string
  title: string
  summary: string
  prompt: string
  response: string
  updatedAt: string
}

export const sampleChats: ChatThread[] = [
  {
    id: 'chat-1',
    title: 'Senior UI/UX Designer Role',
    summary: 'Lead a team of 5 designers for AI interfaces.',
    prompt:
      'Create a Job Description for a UI UX designer who will be leading the team of 5 designers. Needs to be well versed in building AI interfaces. Should have 5+ years of experience.',
    response:
      "Here's a polished, founder-friendly Job Description you can use on LinkedIn, your website, or hiring platforms:\n\nSenior UI/UX Designer (Team Lead) — AI Product Design\nWe're looking for a Senior UI/UX Designer to lead a growing design team and shape the future of our AI-powered products. If you're passionate about crafting world-class user experiences, mentoring designers, and building intelligent, intuitive AI interfaces—this role is for you.\n\nRole Overview\nAs the UI/UX Design Lead, you will manage a team of 5 designers while working closely with product, engineering, and leadership to define and deliver exceptional product experiences. You'll drive the end-to-end design lifecycle—from research and wireframing to polished UI and design systems—with a strong focus on AI-driven workflows and interfaces.\n\nWhat You’ll Do\n• Lead, mentor, and upskill a team of 5 designers across UI, UX, and product design.\n• Own the product experience across web and mobile platforms.\n• Collaborate with cross-functional stakeholders to ship best-in-class AI interfaces.",
    updatedAt: '2h ago',
  },
  {
    id: 'chat-2',
    title: 'Sales Development Rep Brief',
    summary: 'Outbound motion for B2B SaaS.',
    prompt:
      'Draft a cold outreach brief for SDRs targeting heads of HR in Series B startups.',
    response:
      'Here is a concise SDR outreach brief including persona, ICP pains, and suggested email/LinkedIn copy frameworks.',
    updatedAt: 'Yesterday',
  },
  {
    id: 'chat-3',
    title: 'Customer Success Interview Kit',
    summary: 'Behavioral and scenario questions.',
    prompt:
      'Generate an interview kit to assess customer success managers for enterprise accounts.',
    response:
      'The kit includes opening scripts, behavioral indicators, scenario prompts, and scorecards tailored to enterprise CS roles.',
    updatedAt: 'Mon',
  },
]


