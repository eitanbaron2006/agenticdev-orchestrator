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
    className: 'left-0 top-8',
    delay: 0,
  },
  {
    title: 'Developer',
    status: 'Shipping edits',
    icon: Code2,
    className: 'right-0 top-16',
    delay: 0.2,
  },
  {
    title: 'QA',
    status: 'Running review',
    icon: ShieldCheck,
    className: 'left-8 bottom-24',
    delay: 0.1,
  },
  {
    title: 'Runtime',
    status: 'Streaming logs',
    icon: Activity,
    className: 'right-8 bottom-10',
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
            'M250 240C200 205 145 152 90 102',
            'M250 240C315 210 360 178 408 142',
            'M250 240C192 282 150 326 118 372',
            'M250 240C306 286 352 326 386 356',
            'M144 240C190 160 310 160 356 240',
            'M164 314C220 366 280 366 336 314',
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
          className="absolute inset-[18%] rounded-full border border-white/10"
        >
          <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_20px_rgba(255,255,255,0.9)]" />
          <div className="absolute bottom-0 left-[18%] h-2.5 w-2.5 translate-y-1/2 rounded-full bg-white/70" />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[28%] rounded-full border border-dashed border-accent/20"
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
