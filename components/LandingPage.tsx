'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowUp,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  Github,
  GitBranch,
  Layers,
  ShieldCheck,
  Sparkles,
  Terminal,
  Twitter,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const featureCards = [
  {
    icon: Cpu,
    title: 'Agentic Core',
    desc: 'Multiple specialized agents working in parallel to solve architecture, implementation, design, and QA with tighter handoffs.',
  },
  {
    icon: Terminal,
    title: 'Live Terminal',
    desc: 'Real-time execution and feedback loops keep generation attached to what is actually happening in the workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Sandbox',
    desc: 'Isolated execution paths and explicit review surfaces reduce risk while the system iterates on your project.',
  },
  {
    icon: GitBranch,
    title: 'Parallel Delivery',
    desc: 'Tasks, files, and messages stay organized across multiple agent roles instead of collapsing into one stream.',
  },
  {
    icon: Activity,
    title: 'Runtime Signals',
    desc: 'Track logs, debugger proposals, task status, and file changes while the orchestration loop is active.',
  },
  {
    icon: Zap,
    title: 'Faster Shipping',
    desc: 'Move from feature request to reviewed output in one place without context-switching across tools.',
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Define the task',
    desc: 'Start with a feature request, product direction, or debugging objective and turn it into an execution run.',
    icon: Sparkles,
  },
  {
    number: '02',
    title: 'Coordinate agents',
    desc: 'Architect, developer, designer, and QA agents each work with scoped context instead of one overloaded prompt.',
    icon: Bot,
  },
  {
    number: '03',
    title: 'Apply code changes',
    desc: 'The system produces concrete file edits and project updates that land directly in the workspace structure.',
    icon: Code2,
  },
  {
    number: '04',
    title: 'Inspect and refine',
    desc: 'Use tasks, console output, and project state to tighten the next run and ship with more confidence.',
    icon: ShieldCheck,
  },
];

const pricingTiers = [
  {
    name: 'Starter',
    price: '$19',
    cadence: '/month',
    description: 'For solo builders and small prototypes.',
    highlight: false,
    features: ['3 active projects', 'Core agent orchestration', 'Project files and tasks', 'Basic export tools'],
  },
  {
    name: 'Studio',
    price: '$79',
    cadence: '/month',
    description: 'For teams building continuously inside one shared workspace.',
    highlight: true,
    features: ['Unlimited projects', 'Shared agent settings', 'Priority runs', 'Advanced review workflow'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: '',
    description: 'For orgs with deployment, policy, and support requirements.',
    highlight: false,
    features: ['Custom onboarding', 'Private deployment options', 'Security and policy support', 'Dedicated assistance'],
  },
];

const supportingCards = [
  {
    title: 'Project Memory',
    desc: 'Files, tasks, messages, skills, and model settings stay attached to each project instead of getting lost between chats.',
  },
  {
    title: 'Review Surface',
    desc: 'The system treats debugging and QA as first-class parts of the loop, not something bolted on afterward.',
  },
  {
    title: 'Model Flexibility',
    desc: 'Pick the Vertex AI model per project so the workspace can match speed, quality, and cost constraints.',
  },
];

const navLinks = [
  { id: 'top', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'system', label: 'System' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'style-guide', label: 'Style Guide' },
];

const faqItems = [
  {
    question: 'Can I use this for existing codebases?',
    answer: 'Yes. The workspace is built around files, tasks, and project history, which makes it usable for both greenfield work and ongoing products.',
  },
  {
    question: 'Do I control the active model?',
    answer: 'Yes. Each project can now choose from the available Vertex AI models directly in project settings.',
  },
  {
    question: 'Is this only a chat interface?',
    answer: 'No. Chat is one control surface, but the product is structured around orchestration, files, preview, tasks, and execution feedback.',
  },
  {
    question: 'Where does workflow fit in?',
    answer: 'Workflow is the core of the product. The system is built to move from request to architecture to implementation to review in one loop.',
  },
];

const heroAgents = [
  {
    title: 'Architect',
    status: 'Mapping structure',
    icon: Layers,
    className: '-left-6 -top-2',
    delay: 0,
  },
  {
    title: 'Developer',
    status: 'Shipping edits',
    icon: Code2,
    className: '-right-6 top-0',
    delay: 0.2,
  },
  {
    title: 'QA',
    status: 'Running review',
    icon: ShieldCheck,
    className: '-left-4 -bottom-16',
    delay: 0.1,
  },
  {
    title: 'Runtime',
    status: 'Streaming logs',
    icon: Activity,
    className: '-right-4 -bottom-8',
    delay: 0.3,
  },
];

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative mx-auto h-[480px] w-full max-w-[500px]"
    >
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/8 blur-[90px]" />
        <div className="absolute left-[18%] top-[16%] h-24 w-24 rounded-full bg-white/6 blur-[60px]" />
        <div className="absolute bottom-[10%] right-[12%] h-28 w-28 rounded-full bg-white/5 blur-[70px]" />

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 480" fill="none" aria-hidden="true">
          {[
            'M250 240C190 180 130 130 101 112',
            'M250 240C310 180 360 130 379 120',
            'M250 240C190 310 130 380 110 424',
            'M250 240C310 310 360 380 383 392',
            'M250 240C190 238 120 236 88 234',
            'M250 240C310 228 400 226 396 226',
            'M250 240C248 300 245 380 243 448',
          ].map((path, index) => (
            <motion.path
              key={path}
              d={path}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.2 }}
              animate={{ pathLength: [0.25, 1, 0.25], opacity: [0.15, 0.45, 0.15] }}
              transition={{
                duration: 3.8 + index * 0.35,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.1,
              }}
            />
          ))}
        </svg>

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          className="absolute left-1/2 top-1/2 h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        >
          <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_20px_rgba(255,255,255,0.9)]" />
          <div className="absolute bottom-0 left-[18%] h-2.5 w-2.5 translate-y-1/2 rounded-full bg-white/70" />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
          className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-accent/20"
        >
          <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
          <div className="absolute right-0 top-[28%] h-2 w-2 translate-x-1/2 rounded-full bg-accent/80" />
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 1.5, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/2 top-1/2 z-10 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/20 bg-black/35 shadow-[0_0_90px_rgba(255,255,255,0.08)] backdrop-blur-md"
        >
          <div className="absolute inset-3 rounded-full border border-white/10" />
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10">
              <Bot className="h-5 w-5 text-accent terminal-glow" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/35">Orchestrator</p>
            <p className="mt-2 text-sm font-mono font-bold uppercase tracking-tight">Live Run</p>
          </div>
        </motion.div>

        {heroAgents.map((agent) => (
          <motion.div
            key={agent.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, -8, 0], x: [0, 6, 0] }}
            transition={{
              opacity: { duration: 0.4, delay: agent.delay },
              y: { duration: 4 + agent.delay * 2, repeat: Infinity, ease: 'easeInOut', delay: agent.delay },
              x: { duration: 5 + agent.delay * 2, repeat: Infinity, ease: 'easeInOut', delay: agent.delay },
            }}
            className={`absolute z-20 w-40 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-sm ${agent.className}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <agent.icon className="h-4 w-4 text-accent" />
              </div>
              <span className="h-2 w-2 rounded-full bg-accent" />
            </div>
            <p className="mt-4 text-[10px] font-mono uppercase tracking-widest text-white/30">{agent.title}</p>
            <p className="mt-2 text-xs font-mono text-white/80">{agent.status}</p>
          </motion.div>
        ))}

        {[
          { label: 'ARCH', className: 'left-6 top-[46%]', delay: 0.4 },
          { label: 'BUILD', className: 'right-10 top-[44%]', delay: 0.55 },
          { label: 'QA', className: 'left-[42%] bottom-2', delay: 0.7 },
        ].map((signal) => (
          <motion.div
            key={signal.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: [1, 1.05, 1], y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.4, delay: signal.delay },
              scale: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: signal.delay },
              y: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: signal.delay },
            }}
            className={`absolute z-20 rounded-full border border-white/10 bg-white/5 px-4 py-2 ${signal.className}`}
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/55">{signal.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 480);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToId = (id: string) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="top" className="min-h-screen bg-[#050505] text-white selection:bg-accent selection:text-black overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
              <Layers className="w-5 h-5 text-accent terminal-glow" />
            </div>
            <span className="font-mono font-bold tracking-tighter text-lg">AGENTIC_DEV</span>
          </div>
          
          <div className="hidden md:flex items-center gap-4 lg:gap-5">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToId(link.id)}
                className="text-xs font-mono opacity-50 hover:opacity-100 transition-opacity uppercase tracking-widest"
              >
                {link.label}
              </button>
            ))}
          </div>

          <button 
            onClick={onGetStarted}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10 transition-all uppercase tracking-widest"
          >
            Sign In
          </button>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-accent/5 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_460px]">
            <div className="max-w-3xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-8"
              >
                <Sparkles className="w-3 h-3 text-accent" />
                <span className="text-[10px] font-mono text-accent uppercase tracking-widest">V2.5.0 Now Live</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl md:text-8xl font-mono font-bold tracking-tighter leading-[0.9] mb-8"
              >
                ORCHESTRATE <br />
                <span className="text-accent">INTELLIGENT</span> <br />
                CODEBASES.
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-sm md:text-lg font-mono opacity-40 max-w-xl leading-relaxed mb-12"
              >
                The first autonomous development environment powered by specialized AI agents. 
                Architect, develop, and review code in real-time with your own agentic team.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4"
              >
                <button 
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-accent text-black font-mono font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  GET STARTED <ChevronRight className="w-4 h-4" />
                </button>
                <a
                  href="#workflow"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 font-mono font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  VIEW DOCUMENTATION
                </a>
              </motion.div>
            </div>

            <div className="lg:block">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {featureCards.map((feature, i) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-accent/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-mono font-bold mb-3 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-xs font-mono opacity-40 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl md:text-5xl font-mono font-bold tracking-tighter leading-[0.95] mb-4">
              WORKFLOW <span className="text-accent">THAT STAYS</span> IN THE LOOP.
            </h2>
            <p className="text-xs md:text-sm font-mono opacity-40 leading-relaxed">
              The platform is structured around a real delivery sequence, so planning, implementation, and review stay connected inside one workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {workflowSteps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">{step.number}</span>
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-accent" />
                  </div>
                </div>
                <h3 className="text-lg font-mono font-bold mb-3 uppercase tracking-tight">{step.title}</h3>
                <p className="text-xs font-mono opacity-40 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="system" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl md:text-5xl font-mono font-bold tracking-tighter leading-[0.95] mb-4">
              MORE THAN <span className="text-accent">A CHAT WINDOW.</span>
            </h2>
            <p className="text-xs md:text-sm font-mono opacity-40 leading-relaxed">
              The home page needed more depth, but it still needs to feel like the same product. These sections stay inside the same monochrome system and card language.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {supportingCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-accent/30 transition-colors"
              >
                <h3 className="text-lg font-mono font-bold mb-3 uppercase tracking-tight">{card.title}</h3>
                <p className="text-xs font-mono opacity-40 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl md:text-5xl font-mono font-bold tracking-tighter leading-[0.95] mb-4">
              SIMPLE <span className="text-accent">PRICING</span> FOR EACH STAGE.
            </h2>
            <p className="text-xs md:text-sm font-mono opacity-40 leading-relaxed">
              Solo builders, shared studios, and enterprise teams all need different operating modes. The cards stay visually aligned with the rest of the page.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {pricingTiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`p-8 rounded-2xl border transition-colors ${
                  tier.highlight ? 'bg-accent/10 border-accent/30' : 'bg-white/5 border-white/10 hover:border-accent/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-mono font-bold uppercase tracking-tight">{tier.name}</h3>
                    <p className="mt-3 text-xs font-mono opacity-40 leading-relaxed">{tier.description}</p>
                  </div>
                  {tier.highlight && (
                    <span className="px-3 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-accent">
                      Popular
                    </span>
                  )}
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-mono font-bold tracking-tighter">{tier.price}</span>
                  {tier.cadence ? <span className="ml-1 text-sm font-mono opacity-40">{tier.cadence}</span> : null}
                </div>

                <div className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                      <span className="text-xs font-mono opacity-70">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onGetStarted}
                  className={`w-full px-6 py-3 rounded-xl font-mono font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    tier.highlight ? 'bg-accent text-black hover:scale-[1.02]' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  GET STARTED <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl md:text-5xl font-mono font-bold tracking-tighter leading-[0.95] mb-4">
              COMMON <span className="text-accent">QUESTIONS.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqItems.map((item, i) => (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-accent/30 transition-colors"
              >
                <h3 className="text-lg font-mono font-bold mb-3 uppercase tracking-tight">{item.question}</h3>
                <p className="text-xs font-mono opacity-40 leading-relaxed">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="style-guide" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-5xl font-mono font-bold tracking-tighter leading-[0.95] mb-4">
              STYLE <span className="text-accent">GUIDE</span>
            </h2>
            <p className="text-xs md:text-sm font-mono opacity-40 leading-relaxed">
              The core design tokens, typography scale, component variants, and form elements that define the AGENTIC_DEV visual system.
            </p>
          </div>

          {/* ── Colors ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Colors</h3>
            <p className="text-xs font-mono opacity-40 mb-8">CSS custom properties and semantic tokens.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { name: '--bg', hex: '#0a0a0a', label: 'Background' },
                { name: '--fg', hex: '#ededed', label: 'Foreground' },
                { name: '--accent', hex: '#ffffff', label: 'Accent' },
                { name: '--border', hex: '#262626', label: 'Border' },
                { name: 'white/5', hex: 'rgba(255,255,255,0.05)', label: 'Surface' },
                { name: 'white/10', hex: 'rgba(255,255,255,0.10)', label: 'Surface Hover' },
                { name: 'white/20', hex: 'rgba(255,255,255,0.20)', label: 'Divider' },
                { name: 'white/40', hex: 'rgba(255,255,255,0.40)', label: 'Muted Text' },
                { name: '#3b82f6', hex: '#3b82f6', label: 'Agent Blue' },
                { name: '#10b981', hex: '#10b981', label: 'Agent Green' },
                { name: '#f59e0b', hex: '#f59e0b', label: 'Agent Amber' },
                { name: '#ef4444', hex: '#ef4444', label: 'Agent Red' },
                { name: '#8b5cf6', hex: '#8b5cf6', label: 'Agent Purple' },
                { name: '#050505', hex: '#050505', label: 'Deep BG' },
                { name: '#080808', hex: '#080808', label: 'Footer BG' },
              ].map((swatch) => (
                <div key={swatch.name} className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
                  <div className="h-16 w-full" style={{ backgroundColor: swatch.hex }} />
                  <div className="p-3">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wider">{swatch.label}</p>
                    <p className="text-[9px] font-mono opacity-40 mt-1">{swatch.name}</p>
                    <p className="text-[9px] font-mono opacity-30">{swatch.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Typography ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Typography</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Font families: Inter (sans) and JetBrains Mono (mono).</p>

            <div className="space-y-6">
              {[
                { element: 'H1', className: 'text-5xl md:text-8xl font-mono font-bold tracking-tighter leading-[0.9]', sample: 'ORCHESTRATE INTELLIGENT CODEBASES.' },
                { element: 'H2', className: 'text-3xl md:text-5xl font-mono font-bold tracking-tighter leading-[0.95]', sample: 'WORKFLOW THAT STAYS IN THE LOOP.' },
                { element: 'H3', className: 'text-xl font-mono font-bold uppercase tracking-tight', sample: 'Agentic Core' },
                { element: 'H4', className: 'text-lg font-mono font-bold uppercase tracking-tight', sample: 'Project Memory' },
                { element: 'Body', className: 'text-xs md:text-sm font-mono opacity-40 leading-relaxed', sample: 'The first autonomous development environment powered by specialized AI agents. Architect, develop, and review code in real-time with your own agentic team.' },
                { element: 'Caption', className: 'text-[10px] font-mono opacity-30 uppercase tracking-widest', sample: 'V2.5.0 — NOW LIVE — CONNECTED' },
                { element: 'Label', className: 'text-[10px] font-mono uppercase tracking-[0.2em] opacity-30', sample: 'PROJECTS — ACTIVE AGENTS — SYSTEM STATUS' },
                { element: 'Mono Small', className: 'text-[10px] font-mono text-accent uppercase tracking-widest', sample: 'LIVE RUN — ARCHITECT — PROCESSING' },
              ].map((type) => (
                <div key={type.element} className="flex flex-col md:flex-row md:items-start gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="md:w-32 shrink-0">
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-30">{type.element}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={type.className}>{type.sample}</p>
                    <p className="text-[9px] font-mono opacity-20 mt-3 break-all">{type.className}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Buttons ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Buttons</h3>
            <p className="text-xs font-mono opacity-40 mb-8">All button variants in default, hover, and disabled states.</p>

            <div className="space-y-8">
              {/* Primary */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Primary</p>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="px-8 py-4 rounded-xl bg-accent text-black font-mono font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                    GET STARTED
                  </button>
                  <button className="px-6 py-3 rounded-xl bg-accent text-black font-mono font-bold text-sm hover:scale-[1.02] transition-all">
                    SIGN IN WITH GOOGLE
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-accent text-black font-mono font-bold text-xs hover:scale-[1.02] transition-all">
                    SMALL PRIMARY
                  </button>
                </div>
              </div>

              {/* Secondary */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Secondary</p>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 font-mono font-bold text-sm hover:bg-white/10 transition-all">
                    VIEW DOCUMENTATION
                  </button>
                  <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-mono font-bold text-sm hover:bg-white/10 transition-all">
                    CANCEL
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10 transition-all">
                    SIGN IN
                  </button>
                </div>
              </div>

              {/* Outline / Ghost */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Outline / Ghost</p>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10 transition-all uppercase tracking-widest">
                    Sign In
                  </button>
                  <button className="p-1 rounded hover:bg-white/5 text-accent transition-all">
                    <span className="text-xs font-mono">ICON BUTTON</span>
                  </button>
                  <button className="text-[9px] font-mono text-red-400 hover:underline">LOGOUT</button>
                  <button className="text-xs font-mono opacity-50 hover:opacity-100 transition-opacity uppercase tracking-widest">
                    NAV LINK
                  </button>
                </div>
              </div>

              {/* Accent variants */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Accent / Colored</p>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="px-4 py-1.5 bg-purple-500 text-white rounded text-[10px] font-mono font-bold hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/20">
                    YES, FIX ERRORS
                  </button>
                  <div className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-[10px] font-mono text-accent uppercase tracking-widest">
                    BADGE
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
                    TAG
                  </div>
                </div>
              </div>

              {/* Disabled */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Disabled</p>
                <div className="flex flex-wrap items-center gap-4">
                  <button disabled className="px-8 py-4 rounded-xl bg-white/5 opacity-20 cursor-not-allowed font-mono font-bold text-sm">
                    DISABLED PRIMARY
                  </button>
                  <button disabled className="w-10 h-10 rounded-xl bg-white/5 opacity-20 cursor-not-allowed flex items-center justify-center">
                    <span className="text-xs font-mono">+</span>
                  </button>
                  <button disabled className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 font-mono font-bold text-sm opacity-20 cursor-not-allowed">
                    DISABLED SECONDARY
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Form Elements ── */}
          <div>
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Form Elements</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Inputs, textareas, selects, checkboxes, and radios in default, focus, error, and disabled states.</p>

            <div className="space-y-8">
              {/* Text Inputs */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Text Inputs</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Default</label>
                    <input
                      type="text"
                      placeholder="Enter project name..."
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none placeholder:opacity-20 focus:border-accent/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Focused</label>
                    <input
                      type="text"
                      defaultValue="Focused input"
                      className="w-full bg-[#0a0a0a] border border-accent/30 rounded-xl px-4 py-3 text-xs font-mono outline-none placeholder:opacity-20 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Error</label>
                    <input
                      type="text"
                      defaultValue="Invalid value"
                      className="w-full bg-[#0a0a0a] border border-red-500/40 rounded-xl px-4 py-3 text-xs font-mono outline-none text-red-300"
                    />
                    <p className="text-[9px] font-mono text-red-400 mt-1.5 opacity-70">This field is required</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Disabled</label>
                    <input
                      type="text"
                      disabled
                      placeholder="Disabled input"
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none placeholder:opacity-10 opacity-30 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Textarea</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Default</label>
                    <textarea
                      rows={3}
                      placeholder="Enter project requirements... (Ctrl+Enter to send)"
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none placeholder:opacity-20 resize-none min-h-[80px] focus:border-accent/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Disabled</label>
                    <textarea
                      rows={3}
                      disabled
                      placeholder="Agents are working..."
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none placeholder:opacity-10 resize-none min-h-[80px] opacity-30 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Select */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Select</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Default</label>
                    <select className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none appearance-none focus:border-accent/30 transition-colors cursor-pointer">
                      <option>gemini-2.5-flash</option>
                      <option>gemini-2.5-pro</option>
                      <option>gemini-2.0-flash</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Focused</label>
                    <select className="w-full bg-[#0a0a0a] border border-accent/30 rounded-xl px-4 py-3 text-xs font-mono outline-none appearance-none shadow-[0_0_10px_rgba(255,255,255,0.05)] cursor-pointer">
                      <option>Static Website</option>
                      <option>React (CDN)</option>
                      <option>Next.js App</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2 block">Disabled</label>
                    <select disabled className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono outline-none appearance-none opacity-30 cursor-not-allowed">
                      <option>Not available</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Checkboxes & Radios */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Checkboxes & Radios</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono uppercase tracking-widest opacity-20 mb-2">Checkboxes</p>
                    {[
                      { label: 'Checked', checked: true, disabled: false },
                      { label: 'Unchecked', checked: false, disabled: false },
                      { label: 'Checked Disabled', checked: true, disabled: true },
                      { label: 'Unchecked Disabled', checked: false, disabled: true },
                    ].map((cb) => (
                      <label key={cb.label} className={`flex items-center gap-3 ${cb.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          cb.checked
                            ? 'bg-accent border-accent'
                            : 'bg-transparent border-white/20'
                        } ${cb.disabled ? '' : 'hover:border-white/40'}`}>
                          {cb.checked && (
                            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-mono">{cb.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono uppercase tracking-widest opacity-20 mb-2">Radio Buttons</p>
                    {[
                      { label: 'Selected', checked: true, disabled: false },
                      { label: 'Unselected', checked: false, disabled: false },
                      { label: 'Selected Disabled', checked: true, disabled: true },
                      { label: 'Unselected Disabled', checked: false, disabled: true },
                    ].map((rb) => (
                      <label key={rb.label} className={`flex items-center gap-3 ${rb.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          rb.checked
                            ? 'border-accent'
                            : 'border-white/20'
                        } ${rb.disabled ? '' : 'hover:border-white/40'}`}>
                          {rb.checked && (
                            <div className="w-2 h-2 rounded-full bg-accent" />
                          )}
                        </div>
                        <span className="text-xs font-mono">{rb.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Input with label group (like the prompt area) */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Composite — Prompt Input</p>
                <div className="w-full max-w-2xl">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-1000 group-hover:duration-200" />
                    <div className="relative flex items-end bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
                      <div className="p-4 md:p-6 opacity-30">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </div>
                      <div className="flex-1 bg-transparent py-4 md:py-6 text-xs font-mono opacity-20 min-h-[56px] flex items-center">
                        Enter project requirements... (Ctrl+Enter to send)
                      </div>
                      <div className="p-3 md:p-4">
                        <div className="w-10 h-10 rounded-xl bg-accent text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sliders ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Sliders</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Range inputs used for agent creativity and similar controls.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Default</p>
                <label className="flex items-center justify-between text-xs font-mono opacity-70 mb-3">
                  <span>Creativity (Temperature)</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-accent">1.0</span>
                </label>
                <input
                  type="range"
                  min="0" max="2" step="0.1" defaultValue="1.0"
                  className="w-full accent-accent h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono opacity-30">Precise</span>
                  <span className="text-[9px] font-mono opacity-30">Creative</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Low Value</p>
                <label className="flex items-center justify-between text-xs font-mono opacity-70 mb-3">
                  <span>Creativity (Temperature)</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-accent">0.3</span>
                </label>
                <input
                  type="range"
                  min="0" max="2" step="0.1" defaultValue="0.3"
                  className="w-full accent-accent h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono opacity-30">Precise</span>
                  <span className="text-[9px] font-mono opacity-30">Creative</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">High Value</p>
                <label className="flex items-center justify-between text-xs font-mono opacity-70 mb-3">
                  <span>Creativity (Temperature)</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-accent">1.8</span>
                </label>
                <input
                  type="range"
                  min="0" max="2" step="0.1" defaultValue="1.8"
                  className="w-full accent-accent h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono opacity-30">Precise</span>
                  <span className="text-[9px] font-mono opacity-30">Creative</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Disabled</p>
                <label className="flex items-center justify-between text-xs font-mono opacity-30 mb-3">
                  <span>Creativity (Temperature)</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-accent opacity-30">1.0</span>
                </label>
                <input
                  type="range"
                  min="0" max="2" step="0.1" defaultValue="1.0" disabled
                  className="w-full accent-accent h-1.5 rounded-full appearance-none bg-white/10 cursor-not-allowed opacity-30"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono opacity-20">Precise</span>
                  <span className="text-[9px] font-mono opacity-20">Creative</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Tabs</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Segmented controls and pill-style tab bars used for navigation and filtering.</p>

            <div className="space-y-8">
              {/* Segmented control */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Segmented Control</p>
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 w-fit">
                  {['ORCHESTRATOR', 'FILES', 'PREVIEW', 'TASKS', 'AGENTS'].map((tab, i) => (
                    <button
                      key={tab}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-mono transition-all flex items-center gap-2 ${
                        i === 0 ? 'bg-accent text-black' : 'opacity-50 hover:opacity-100'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export tabs */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Modal Tabs (Inset)</p>
                <div className="flex gap-2 p-1 bg-white/5 rounded-lg max-w-xs">
                  <button className="flex-1 py-2 text-xs font-mono rounded-md bg-white/10 text-white flex items-center justify-center gap-2 transition-all">
                    ZIP Archive
                  </button>
                  <button className="flex-1 py-2 text-xs font-mono rounded-md text-white/50 hover:text-white/80 flex items-center justify-center gap-2 transition-all">
                    GitHub
                  </button>
                </div>
              </div>

              {/* Filter pills */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Filter Pills (Toggle)</p>
                <div className="flex flex-wrap gap-2">
                  {['ALL CATEGORIES', 'FRONTEND', 'BACKEND', 'STYLING', 'SECURITY', 'UX'].map((cat, i) => (
                    <button
                      key={cat}
                      className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                        i === 0
                          ? 'bg-accent text-black'
                          : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle button group */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Toggle Button Group</p>
                <div className="flex bg-black/50 border border-white/10 rounded-lg p-1 w-fit">
                  <button className="px-3 py-1 rounded-md text-[10px] font-mono font-bold bg-accent text-black transition-all">
                    ALL SKILLS
                  </button>
                  <button className="px-3 py-1 rounded-md text-[10px] font-mono font-bold text-white/50 hover:text-white transition-all">
                    PROJECT SKILLS
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Cards ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Cards</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Feature cards, agent cards, task cards, and stat panels.</p>

            <div className="space-y-8">
              {/* Feature Card */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Feature Card</p>
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-accent/30 transition-colors group max-w-sm">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 mb-6 group-hover:scale-110 transition-transform">
                    <Layers className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-mono font-bold mb-3 uppercase tracking-tight">Agentic Core</h3>
                  <p className="text-xs font-mono opacity-40 leading-relaxed">Multiple specialized agents working in parallel to solve architecture, implementation, design, and QA.</p>
                </div>
              </div>

              {/* Agent Card */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Agent Card</p>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden max-w-sm">
                  <div className="p-5 border-b border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640' }}>
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-mono font-bold text-sm">Nexus-7</h3>
                          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Architect</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 border border-accent/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="text-[9px] font-mono text-accent uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                    <p className="text-xs font-mono opacity-40 mt-3 leading-relaxed">Plans system architecture, component hierarchy, data flow, and technology choices.</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="flex items-center justify-between text-xs font-mono opacity-70 mb-3">
                        <span>Creativity</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-accent">1.0</span>
                      </label>
                      <input type="range" min="0" max="2" step="0.1" defaultValue="1.0" className="w-full accent-accent h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Cards */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Task Cards</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-[#080808] hover:border-white/20 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center" />
                      <span className="text-sm font-mono">Pending task</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-[#080808] hover:border-white/20 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-accent bg-accent text-black flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm font-mono line-through opacity-50">Completed task</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-accent/50 bg-accent/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-md border border-accent bg-accent text-black flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-sm font-mono">Selected task</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Stat Cards</p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Total</span>
                    <span className="text-sm font-mono font-bold">12</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                    <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest">Completed</span>
                    <span className="text-sm font-mono font-bold text-green-400">8</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Pending</span>
                    <span className="text-sm font-mono font-bold">4</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Processing</span>
                  </div>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Pricing Card (Highlighted)</p>
                <div className="p-8 rounded-2xl bg-accent/10 border border-accent/30 max-w-xs">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-mono font-bold uppercase tracking-tight">Studio</h3>
                      <p className="mt-3 text-xs font-mono opacity-40 leading-relaxed">For teams building continuously inside one shared workspace.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-accent">Popular</span>
                  </div>
                  <div className="mb-8">
                    <span className="text-4xl font-mono font-bold tracking-tighter">$79</span>
                    <span className="ml-1 text-sm font-mono opacity-40">/month</span>
                  </div>
                  <div className="space-y-3 mb-8">
                    {['Unlimited projects', 'Shared agent settings', 'Priority runs'].map((f) => (
                      <div key={f} className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-xs font-mono opacity-70">{f}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full px-6 py-3 rounded-xl bg-accent text-black font-mono font-bold text-sm hover:scale-[1.02] transition-all">GET STARTED</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Badges & Tags ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Badges & Tags</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Status indicators, category labels, and removable skill chips.</p>

            <div className="space-y-8">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Status Badges</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 border border-accent/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[9px] font-mono text-accent uppercase tracking-widest">Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 border border-accent/20">
                    <span className="text-[9px] font-mono text-accent uppercase tracking-widest">Latest</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/20">
                    <span className="text-[9px] font-mono text-blue-300 uppercase tracking-widest">Running</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-mono text-white/40">
                    App Router
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-mono text-white/40">
                    LOCKED
                  </div>
                  <div className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-accent/20 text-accent">UPDATED</div>
                  <div className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-red-500/20 text-red-400">DELETED</div>
                </div>
              </div>

              {/* Tags / Chips */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Tags & Removable Chips</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">Static Website</div>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">React (CDN)</div>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">Next.js App</div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[10px] font-mono text-accent">
                    <span>React Expert</span>
                    <svg className="w-3 h-3 opacity-50 hover:opacity-100 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[10px] font-mono text-accent">
                    <span>Tailwind Pro</span>
                    <svg className="w-3 h-3 opacity-50 hover:opacity-100 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                </div>
              </div>

              {/* Agent Badge */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Agent Badge</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span style={{ color: '#3b82f6' }}>
                      <Layers className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono font-medium uppercase tracking-wider">NEXUS-7</span>
                    <span className="text-[10px] opacity-50 font-mono">[Architect]</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span style={{ color: '#10b981' }}>
                      <Code2 className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono font-medium uppercase tracking-wider">CORTEX-X</span>
                    <span className="text-[10px] opacity-50 font-mono">[Developer]</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span style={{ color: '#ef4444' }}>
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono font-medium uppercase tracking-wider">SENTINEL-9</span>
                    <span className="text-[10px] opacity-50 font-mono">[QA]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Loading & Status ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Loading & Status</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Spinners, pulsing indicators, and status messages.</p>

            <div className="space-y-8">
              {/* Spinners */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Spinners</p>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-accent animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span className="text-xs font-mono opacity-50">Small</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-accent animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span className="text-xs font-mono opacity-50">Medium</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-12 h-12 text-accent animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span className="text-xs font-mono opacity-50">Large</span>
                  </div>
                </div>
              </div>

              {/* Loading button */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Loading States</p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center justify-center gap-3 px-4 py-2 rounded-xl bg-accent/20 text-accent border border-accent/30 font-mono font-bold text-sm">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span>AUTHENTICATING...</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 border-dashed">
                    <svg className="w-4 h-4 text-accent animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span className="text-xs font-mono opacity-50">Agent <span className="text-accent">Nexus-7</span> is processing...</span>
                  </div>
                </div>
              </div>

              {/* Full-page loader */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Full Page Init</p>
                <div className="h-32 rounded-xl bg-[#050505] flex items-center justify-center border border-white/5">
                  <div className="flex flex-col items-center gap-4">
                    <svg className="w-8 h-8 text-accent animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span className="text-[10px] font-mono text-accent uppercase tracking-widest animate-pulse">Initializing Environment...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Toasts ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Toast Notifications</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Temporary feedback messages for success, error, and info events.</p>

            <div className="space-y-4 max-w-lg">
              <div className="px-5 py-3 rounded-xl border font-mono text-sm shadow-2xl flex items-center gap-3 bg-emerald-950/90 border-emerald-500/30 text-emerald-300">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Project saved successfully!</span>
              </div>
              <div className="px-5 py-3 rounded-xl border font-mono text-sm shadow-2xl flex items-center gap-3 bg-red-950/90 border-red-500/30 text-red-300">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                <span>Failed to connect to API.</span>
              </div>
              <div className="px-5 py-3 rounded-xl border font-mono text-sm shadow-2xl flex items-center gap-3 bg-blue-950/90 border-blue-500/30 text-blue-300">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span>Auto-imported 5 skills from library.</span>
              </div>
            </div>
          </div>

          {/* ── Modals ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Modals</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Dialog overlays for confirmations, forms, and detail views.</p>

            <div className="space-y-8">
              {/* Standard modal */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Standard Modal</p>
                <div className="rounded-xl bg-[#0f0f0f] border border-white/10 w-full max-w-md p-6 shadow-2xl">
                  <h3 className="text-lg font-mono font-bold mb-4">New Project</h3>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Project Name</label>
                      <input type="text" placeholder="Project Name..." className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button className="px-4 py-2 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all">CANCEL</button>
                    <button className="px-4 py-2 rounded-lg bg-accent text-black text-xs font-mono font-bold hover:bg-accent/90 transition-all">CREATE PROJECT</button>
                  </div>
                </div>
              </div>

              {/* Confirmation / Danger modal */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Danger Confirmation</p>
                <div className="rounded-xl bg-[#0f0f0f] border border-white/10 w-full max-w-md p-6 shadow-2xl">
                  <div className="space-y-6">
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono leading-relaxed">
                      <p className="font-bold mb-2">Warning: Irreversible Action</p>
                      <p>Are you sure you want to delete this project? This will permanently delete all files, tasks, and messages.</p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button className="px-4 py-2 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all">CANCEL</button>
                      <button className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-mono font-bold hover:bg-red-600 transition-all">YES, DELETE</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal with close button */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">With Header Close</p>
                <div className="rounded-xl bg-[#0f0f0f] border border-white/10 w-full max-w-md p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-mono font-bold flex items-center gap-2">
                      <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Export Project
                    </h3>
                    <button className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <p className="text-sm font-mono opacity-70 leading-relaxed mb-6">Download the entire project as a ZIP archive.</p>
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button className="px-4 py-2 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all">CANCEL</button>
                    <button className="px-4 py-2 rounded-lg bg-accent text-black text-xs font-mono font-bold hover:bg-accent/90 transition-all flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      DOWNLOAD .ZIP
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Accordions ── */}
          <div className="mb-20">
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Accordions</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Expandable panels for orchestration groups and FAQ items.</p>

            <div className="space-y-4 max-w-2xl">
              {/* Expanded accordion */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#090909]/90 backdrop-blur-sm">
                <button className="w-full flex items-center justify-between gap-4 p-4 md:p-5 hover:bg-white/[0.03] transition-colors text-left">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-accent/80">Request 01</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/5 text-white/45">3 responses</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-accent/15 text-accent">Latest</span>
                    </div>
                    <p className="text-sm md:text-[15px] font-mono text-white/85 leading-relaxed">Build a responsive landing page with hero section and feature grid.</p>
                  </div>
                  <div className="shrink-0">
                    <svg className="w-4 h-4 text-white/50 rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
                <div className="border-t border-white/10 p-4 md:p-5 bg-black/20">
                  <p className="text-xs font-mono opacity-50">Expanded content area with message bubbles, file changes, and agent responses.</p>
                </div>
              </div>

              {/* Collapsed accordion */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#090909]/90 backdrop-blur-sm">
                <button className="w-full flex items-center justify-between gap-4 p-4 md:p-5 hover:bg-white/[0.03] transition-colors text-left">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-accent/80">Request 02</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/5 text-white/45">1 response</span>
                    </div>
                    <p className="text-sm md:text-[15px] font-mono text-white/85 leading-relaxed">Add dark mode toggle to settings page.</p>
                  </div>
                  <div className="shrink-0">
                    <svg className="w-4 h-4 text-white/50 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
              </div>

              {/* Running accordion */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#090909]/90 backdrop-blur-sm">
                <button className="w-full flex items-center justify-between gap-4 p-4 md:p-5 hover:bg-white/[0.03] transition-colors text-left">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-accent/80">Request 03</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/15 text-blue-300">Running: Cortex-X</span>
                    </div>
                    <p className="text-sm md:text-[15px] font-mono text-white/85 leading-relaxed">Implement user authentication flow.</p>
                  </div>
                  <div className="shrink-0">
                    <svg className="w-4 h-4 text-white/50 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* ── Miscellaneous ── */}
          <div>
            <h3 className="text-xl font-mono font-bold uppercase tracking-tight mb-2">Miscellaneous</h3>
            <p className="text-xs font-mono opacity-40 mb-8">Search inputs, overlays, scroll-to-top, console log entries, and empty states.</p>

            <div className="space-y-8">
              {/* Search Input */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Search Input</p>
                <div className="relative max-w-xs">
                  <input
                    type="text"
                    placeholder="Search skills..."
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-accent/50 w-full"
                  />
                </div>
              </div>

              {/* Console Log Entries */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Console Log Entries</p>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-[10px] space-y-1">
                  <div className="flex gap-2 py-0.5 px-2 rounded text-white/70">
                    <span className="opacity-30 shrink-0">[12:34:56]</span>
                    <span>App initialized successfully</span>
                  </div>
                  <div className="flex gap-2 py-0.5 px-2 rounded bg-yellow-500/10 text-yellow-400">
                    <span className="opacity-30 shrink-0">[12:34:57]</span>
                    <span>Deprecated API called: componentWillMount</span>
                  </div>
                  <div className="flex gap-2 py-0.5 px-2 rounded bg-red-500/10 text-red-400">
                    <span className="opacity-30 shrink-0">[12:34:58]</span>
                    <span>TypeError: Cannot read property of undefined</span>
                  </div>
                  <div className="flex gap-2 py-0.5 px-2 rounded text-blue-300 bg-blue-500/5">
                    <span className="opacity-30 shrink-0">[12:34:59]</span>
                    <span>Fetching data from /api/models...</span>
                  </div>
                </div>
              </div>

              {/* Empty State */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Empty State</p>
                <div className="text-center py-16 border border-white/5 border-dashed rounded-xl max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-sm font-mono opacity-40 mb-2">No tasks yet</p>
                  <p className="text-xs font-mono opacity-20">Add your first task above to get started</p>
                </div>
              </div>

              {/* Backdrop / Overlay */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Backdrop Overlay</p>
                <div className="relative h-40 rounded-xl overflow-hidden border border-white/10">
                  <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center">
                    <div className="space-y-2 text-center">
                      <p className="text-xs font-mono opacity-40">Content behind overlay</p>
                      <div className="flex gap-2 justify-center">
                        <div className="w-20 h-8 rounded bg-white/5" />
                        <div className="w-20 h-8 rounded bg-white/5" />
                        <div className="w-20 h-8 rounded bg-white/5" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">bg-black/80 + backdrop-blur-sm</span>
                  </div>
                </div>
              </div>

              {/* Scroll to Top Button */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Scroll to Top (Fixed)</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#0d0d0d]/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                  </div>
                  <div className="text-xs font-mono opacity-40">
                    <p>Fixed bottom-right, appears after scroll</p>
                    <p className="text-[9px] opacity-30 mt-1">border-white/10 bg-[#0d0d0d]/90 backdrop-blur-xl rounded-full</p>
                  </div>
                </div>
              </div>

              {/* Glass Effect */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-30 mb-6">Glass Effect</p>
                <div className="relative h-32 rounded-xl overflow-hidden border border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-blue-500/5 to-purple-500/5" />
                  <div className="absolute inset-4 rounded-xl glass flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm font-mono font-bold">.glass</p>
                      <p className="text-[9px] font-mono opacity-30 mt-1">rgba(255,255,255,0.03) + blur(10px)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-white/5 bg-[#080808]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            <span className="font-mono font-bold tracking-tighter">AGENTIC_DEV</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="#" className="opacity-30 hover:opacity-100 transition-opacity"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="opacity-30 hover:opacity-100 transition-opacity"><Github className="w-5 h-5" /></a>
          </div>

          <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
            © 2026 AGENTIC_DEV. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>

      <motion.button
        type="button"
        onClick={() => scrollToId('top')}
        initial={false}
        animate={{
          opacity: showScrollTop ? 1 : 0,
          scale: showScrollTop ? 1 : 0.9,
          y: showScrollTop ? 0 : 12,
        }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#0d0d0d]/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl hover:bg-white/10"
        style={{ pointerEvents: showScrollTop ? 'auto' : 'none' }}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
