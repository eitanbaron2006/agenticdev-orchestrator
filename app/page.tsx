'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import Image from 'next/image';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal as TerminalIcon,
  Cpu,
  Code2,
  Layout,
  ShieldCheck,
  Send,
  Loader2,
  Play,
  History,
  Settings,
  User as UserIcon,
  Bot,
  Sparkles,
  Layers,
  CheckCircle2,
  Menu,
  X,
  FileCode,
  FolderOpen,
  Save,
  Plus,
  Trash2,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronDown,
  Download,
  Github,
  FileText,
  Eye,
  FileJson,
  FileType2,
  FileImage,
  FileCode2,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Zap,
  Paperclip,
  ArrowDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  type FirebaseUser 
} from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  type User as AuthUser 
} from 'firebase/auth';
import LandingPage from '@/components/LandingPage';
import AuthScreen from '@/components/AuthScreen';
import Terminal from '@/components/Terminal';
import { useSandbox, type SandboxFile } from '@/hooks/useSandbox';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode2 className="w-3 h-3 text-yellow-400" />;
    case 'css':
      return <FileType2 className="w-3 h-3 text-blue-400" />;
    case 'html':
      return <FileCode className="w-3 h-3 text-orange-400" />;
    case 'json':
      return <FileJson className="w-3 h-3 text-green-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
      return <FileImage className="w-3 h-3 text-purple-400" />;
    default:
      return <FileText className="w-3 h-3 text-gray-400" />;
  }
};

// --- Tree View Types & Utils ---
type TreeNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: Record<string, TreeNode>;
  file?: ProjectFile;
};

const buildFileTree = (files: ProjectFile[]): TreeNode => {
  const root: TreeNode = { name: 'root', path: '', type: 'folder', children: {} };
  files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        if (!current.children) current.children = {};
        current.children[part] = { name: part, path: file.path, type: 'file', file };
      } else {
        if (!current.children) current.children = {};
        if (!current.children[part]) {
          current.children[part] = { name: part, path: parts.slice(0, i + 1).join('/'), type: 'folder', children: {} };
        }
        current = current.children[part];
      }
    });
  });
  return root;
};

const FileTreeItem = ({ 
  node, 
  level = 0, 
  selectedFile, 
  onSelectFile 
}: { 
  node: TreeNode; 
  level?: number; 
  selectedFile: ProjectFile | null; 
  onSelectFile: (file: ProjectFile) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (node.type === 'file' && node.file) {
    const isSelected = selectedFile?.id === node.file.id;
    return (
      <button
        onClick={() => onSelectFile(node.file!)}
        className={cn(
          "w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-xs font-mono transition-all text-left",
          isSelected ? "bg-white/10 text-accent" : "opacity-70 hover:opacity-100 hover:bg-white/5"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all text-left"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <FolderOpen className="w-3 h-3 text-blue-300" />
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && node.children && (
        <div className="flex flex-col">
          {Object.values(node.children)
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'folder' ? -1 : 1;
            })
            .map(child => (
              <FileTreeItem 
                key={child.path} 
                node={child} 
                level={level + 1} 
                selectedFile={selectedFile} 
                onSelectFile={onSelectFile} 
              />
            ))}
        </div>
      )}
    </div>
  );
};

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
type AgentRole = 'Architect' | 'Developer' | 'Designer' | 'QA' | 'Debugger';

interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

interface Attachment {
  url: string;
  type: string;
  name: string;
}

interface Message {
  id: string;
  projectId: string;
  role: AgentRole | 'User';
  content: string;
  timestamp: any;
  imageUrl?: string;
  attachments?: Attachment[];
  isDebuggerProposal?: boolean;
}

interface OrchestrationGroup {
  id: string;
  request: Message | null;
  responses: Message[];
  startedAt: any;
  kind: 'request' | 'system';
}

interface AgentConfig {
  creativity: number;
  focus: string;
  tools: string[];
  skills?: string[];
}

interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  projectType?: string;
  createdAt: any;
  lastModified: any;
  aiModel?: string;
  agentConfigs?: Record<string, AgentConfig>;
  globalSkills?: string[];
  downloadedSkills?: string[];
}

interface ProjectTypeConfig {
  id: string;
  name: string;
  description: string;
  previewMode: 'iframe' | 'nextjs' | 'server';
  agentInstruction: string;
  fileConvention: string;
}

const PROJECT_TYPES: Record<string, ProjectTypeConfig> = {
  'static-site': {
    id: 'static-site',
    name: 'Static Website',
    description: 'HTML, CSS, and JavaScript that runs directly in the browser.',
    previewMode: 'iframe',
    agentInstruction: 'You are building a STATIC WEBSITE. Generate HTML, CSS, and JS files that run directly in the browser. Do NOT use import/export, Node.js modules, or any build tools. Use <script> tags for JavaScript. Use CDN links for external libraries.',
    fileConvention: 'index.html at root, with separate .css and .js files'
  },
  'react-cdn': {
    id: 'react-cdn',
    name: 'React (CDN)',
    description: 'React application using CDN-loaded React and Babel.',
    previewMode: 'iframe',
    agentInstruction: 'You are building a REACT APPLICATION via CDN. Use the global React and ReactDOM objects (e.g., const { useState } = React). Write JSX in <script type="text/babel"> tags. Do NOT use import/export or npm packages. Include all React code inline or in separate .js files loaded via <script> tags.',
    fileConvention: 'index.html at root with CDN scripts, JSX in <script type="text/babel"> tags'
  },
  'nextjs': {
    id: 'nextjs',
    name: 'Next.js App',
    description: 'Full Next.js application with App Router, server components, and API routes.',
    previewMode: 'nextjs',
    agentInstruction: 'You are building a NEXT.JS APPLICATION with App Router. Generate a complete Next.js project structure including: package.json, next.config.js/ts, tsconfig.json, app/layout.tsx, app/page.tsx, and any additional pages/components. Use TypeScript. Use Tailwind CSS for styling. You MUST generate a package.json with all required dependencies. You MUST generate a next.config.js/ts. The app/ directory structure must follow Next.js App Router conventions. Generate ALL files needed for a working Next.js application.',
    fileConvention: 'package.json, next.config.js, app/layout.tsx, app/page.tsx, components/ directory, public/ directory, tsconfig.json'
  },
  'vue-cdn': {
    id: 'vue-cdn',
    name: 'Vue.js (CDN)',
    description: 'Vue 3 application using CDN-loaded Vue.',
    previewMode: 'iframe',
    agentInstruction: 'You are building a VUE.JS APPLICATION via CDN. Use the global Vue object from the CDN (e.g., const { createApp, ref, reactive } = Vue). Write template syntax directly in HTML. Do NOT use import/export or npm packages. Use Vue 3 Composition API with the global Vue object.',
    fileConvention: 'index.html at root with Vue CDN, inline templates and scripts'
  },
  'svelte-cdn': {
    id: 'svelte-cdn',
    name: 'Svelte (CDN)',
    description: 'Svelte-style reactive app using vanilla JS patterns.',
    previewMode: 'iframe',
    agentInstruction: 'You are building a REACTIVE WEB APPLICATION inspired by Svelte patterns. Use vanilla JavaScript with reactive patterns (Proxy-based reactivity, custom reactive stores). Do NOT use import/export or npm packages. All code must run directly in the browser via <script> tags.',
    fileConvention: 'index.html at root with inline or external .js files'
  },
  'express-api': {
    id: 'express-api',
    name: 'Express.js API',
    description: 'Node.js REST API with Express. (Preview shows API docs page)',
    previewMode: 'iframe',
    agentInstruction: 'You are building an EXPRESS.JS REST API. Generate a complete Node.js project with package.json, server.js, routes/, middleware/, and models/ directories. Include all route handlers, middleware, and error handling. Since this cannot be previewed in an iframe, also generate an api-docs.html file that documents all API endpoints with example requests/responses. This documentation page will be shown in the preview.',
    fileConvention: 'package.json, server.js, routes/, middleware/, models/, api-docs.html for preview'
  },
  'flask-api': {
    id: 'flask-api',
    name: 'Python Flask API',
    description: 'Python REST API with Flask. (Preview shows API docs page)',
    previewMode: 'iframe',
    agentInstruction: 'You are building a PYTHON FLASK REST API. Generate a complete Python project with requirements.txt, app.py, routes/, models/, and config.py. Include all route handlers, error handling, and configuration. Since this cannot be previewed in an iframe, also generate an api-docs.html file that documents all API endpoints with example requests/responses. This documentation page will be shown in the preview.',
    fileConvention: 'requirements.txt, app.py, routes/, models/, config.py, api-docs.html for preview'
  }
};

interface VertexModelOption {
  id: string;
  displayName: string;
  description?: string;
  supportedActions: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

const DEFAULT_AI_MODEL = 'gemini-2.5-flash';

interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language: string;
  lastModified: any;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  createdAt: any;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

interface ProjectState {
  status: 'idle' | 'analyzing' | 'architecting' | 'developing' | 'designing' | 'reviewing' | 'completed';
  currentAgentIndex: number;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  projectType: string;
  files: { path: string; content: string; language: string }[];
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start with a clean slate. Choose your project type in settings.',
    icon: <Plus className="w-5 h-5" />,
    projectType: 'static-site',
    files: []
  },
  {
    id: 'static-site',
    name: 'Static Website',
    description: 'Basic HTML, CSS, and JS structure.',
    icon: <Layout className="w-5 h-5" />,
    projectType: 'static-site',
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Static Site</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>Welcome to my Static Site</h1>
        <p>This project was created from a template.</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`
      },
      {
        path: 'style.css',
        language: 'css',
        content: `body {
    font-family: sans-serif;
    background-color: #f0f0f0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
}

#app {
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
}`
      },
      {
        path: 'script.js',
        language: 'javascript',
        content: `console.log('Hello from the static site template!');`
      }
    ]
  },
  {
    id: 'react-cdn',
    name: 'React (CDN)',
    description: 'React app using CDN-loaded React and Babel for in-browser JSX.',
    icon: <Code2 className="w-5 h-5" />,
    projectType: 'react-cdn',
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>React CDN App</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
      function App() {
        const [count, setCount] = React.useState(0);
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <h1 className="text-3xl font-bold mb-4 text-blue-600">React CDN App</h1>
              <p className="mb-6 text-gray-600">Count: {count}</p>
              <button 
                onClick={() => setCount(count + 1)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Increment
              </button>
            </div>
          </div>
        );
      }

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    </script>
  </body>
</html>`
      }
    ]
  },
  {
    id: 'nextjs',
    name: 'Next.js App',
    description: 'Full Next.js project with App Router, TypeScript, and Tailwind CSS.',
    icon: <Layers className="w-5 h-5" />,
    projectType: 'nextjs',
    files: [
      {
        path: 'package.json',
        language: 'json',
        content: `{
  "name": "my-nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}`
      },
      {
        path: 'next.config.js',
        language: 'javascript',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;`
      },
      {
        path: 'tsconfig.json',
        language: 'json',
        content: `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`
      },
      {
        path: 'tailwind.config.ts',
        language: 'typescript',
        content: `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;`
      },
      {
        path: 'postcss.config.js',
        language: 'javascript',
        content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`
      },
      {
        path: 'app/globals.css',
        language: 'css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`
      },
      {
        path: 'app/layout.tsx',
        language: 'typescript',
        content: `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My Next.js App',
  description: 'Created with AgenticDev Orchestrator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`
      },
      {
        path: 'app/page.tsx',
        language: 'typescript',
        content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to Next.js!</h1>
      <p className="text-lg text-gray-600">
        Edit <code className="bg-gray-100 px-2 py-1 rounded">app/page.tsx</code> to get started.
      </p>
    </main>
  );
}`
      }
    ]
  },
  {
    id: 'vue-cdn',
    name: 'Vue.js (CDN)',
    description: 'Vue 3 app using CDN-loaded Vue with Composition API.',
    icon: <Code2 className="w-5 h-5" />,
    projectType: 'vue-cdn',
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue CDN App</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="app">
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 class="text-3xl font-bold mb-4 text-green-600">{{ title }}</h1>
        <p class="mb-6 text-gray-600">Count: {{ count }}</p>
        <button 
          @click="count++"
          class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Increment
        </button>
      </div>
    </div>
  </div>
  <script>
    const { createApp, ref } = Vue;
    createApp({
      setup() {
        const title = ref('Vue CDN App');
        const count = ref(0);
        return { title, count };
      }
    }).mount('#app');
  </script>
</body>
</html>`
      }
    ]
  },
  {
    id: 'svelte-cdn',
    name: 'Svelte-Style App',
    description: 'Reactive web app using vanilla JS with Svelte-like patterns.',
    icon: <Sparkles className="w-5 h-5" />,
    projectType: 'svelte-cdn',
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reactive App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app"></div>
  <script src="reactive.js"></script>
  <script src="app.js"></script>
</body>
</html>`
      },
      {
        path: 'style.css',
        language: 'css',
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f0f0f0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  text-align: center;
}
.card h1 { color: #ff6b35; margin-bottom: 1rem; }
.card p { color: #666; margin-bottom: 1.5rem; }
button {
  background: #ff6b35;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}
button:hover { background: #e55a2b; }`
      },
      {
        path: 'reactive.js',
        language: 'javascript',
        content: `function reactive(initialValue) {
  let value = initialValue;
  const subscribers = new Set();
  return {
    get() { return value; },
    set(newValue) { value = newValue; subscribers.forEach(fn => fn(value)); },
    subscribe(fn) { subscribers.add(fn); fn(value); return () => subscribers.delete(fn); }
  };
}

function mount(component, target) {
  const el = document.querySelector(target);
  component(el);
}`
      },
      {
        path: 'app.js',
        language: 'javascript',
        content: `function App(el) {
  const count = reactive(0);
  count.subscribe(() => {
    el.innerHTML = \`
      <div class="card">
        <h1>Reactive App</h1>
        <p>Count: \${count.get()}</p>
        <button onclick="document.querySelector('#app').__increment()">Increment</button>
      </div>
    \`;
  });
  el.__increment = () => count.set(count.get() + 1);
}

mount(App, '#app');`
      }
    ]
  },
  {
    id: 'express-api',
    name: 'Express.js API',
    description: 'Node.js REST API with Express. Preview shows API documentation.',
    icon: <TerminalIcon className="w-5 h-5" />,
    projectType: 'express-api',
    files: [
      {
        path: 'package.json',
        language: 'json',
        content: `{
  "name": "my-express-api",
  "version": "1.0.0",
  "description": "Express REST API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}`
      },
      {
        path: 'server.js',
        language: 'javascript',
        content: `const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`
      },
      {
        path: 'routes/api.js',
        language: 'javascript',
        content: `const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;`
      },
      {
        path: 'api-docs.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">Express API Documentation</h1>
    <p class="text-gray-400 mb-8">Base URL: http://localhost:3000</p>
    <div class="space-y-4">
      <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div class="flex items-center gap-2 mb-2">
          <span class="bg-green-500 text-xs font-bold px-2 py-1 rounded">GET</span>
          <code class="text-sm">/</code>
        </div>
        <p class="text-gray-400 text-sm">Health check endpoint</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div class="flex items-center gap-2 mb-2">
          <span class="bg-green-500 text-xs font-bold px-2 py-1 rounded">GET</span>
          <code class="text-sm">/api/health</code>
        </div>
        <p class="text-gray-400 text-sm">API health status</p>
      </div>
    </div>
  </div>
</body>
</html>`
      }
    ]
  },
  {
    id: 'flask-api',
    name: 'Python Flask API',
    description: 'Python REST API with Flask. Preview shows API documentation.',
    icon: <TerminalIcon className="w-5 h-5" />,
    projectType: 'flask-api',
    files: [
      {
        path: 'requirements.txt',
        language: 'text',
        content: `Flask==3.0.0
flask-cors==4.0.0`
      },
      {
        path: 'app.py',
        language: 'python',
        content: `from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return jsonify({'message': 'API is running'})

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)`
      },
      {
        path: 'routes/__init__.py',
        language: 'python',
        content: ``
      },
      {
        path: 'routes/api.py',
        language: 'python',
        content: `from flask import Blueprint, jsonify

api = Blueprint('api', __name__)

@api.route('/health')
def health():
    return jsonify({'status': 'ok'})`
      },
      {
        path: 'api-docs.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flask API Documentation</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">Flask API Documentation</h1>
    <p class="text-gray-400 mb-8">Base URL: http://localhost:5000</p>
    <div class="space-y-4">
      <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div class="flex items-center gap-2 mb-2">
          <span class="bg-green-500 text-xs font-bold px-2 py-1 rounded">GET</span>
          <code class="text-sm">/</code>
        </div>
        <p class="text-gray-400 text-sm">Health check endpoint</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div class="flex items-center gap-2 mb-2">
          <span class="bg-green-500 text-xs font-bold px-2 py-1 rounded">GET</span>
          <code class="text-sm">/api/health</code>
        </div>
        <p class="text-gray-400 text-sm">API health status</p>
      </div>
    </div>
  </div>
</body>
</html>`
      }
    ]
  }
];

const getMessageDate = (timestamp: any) => timestamp?.toDate?.() || new Date(timestamp);

const formatMessageTime = (timestamp: any) =>
  getMessageDate(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

const getMessagePreview = (content: string) =>
  content
    .replace(/\[FILE:\s*(.*?)\]([\s\S]*?)\[\/FILE\]/g, ' [file update] ')
    .replace(/\[DELETE_FILE:\s*(.*?)\]/g, ' [delete file] ')
    .replace(/\s+/g, ' ')
    .trim();

const buildOrchestrationGroups = (messages: Message[]): OrchestrationGroup[] => {
  const groups: OrchestrationGroup[] = [];
  let currentGroup: OrchestrationGroup | null = null;

  messages.forEach((message) => {
    if (message.role === 'User') {
      currentGroup = {
        id: message.id,
        request: message,
        responses: [],
        startedAt: message.timestamp,
        kind: 'request',
      };
      groups.push(currentGroup);
      return;
    }

    if (!currentGroup) {
      currentGroup = {
        id: `system-${message.id}`,
        request: null,
        responses: [message],
        startedAt: message.timestamp,
        kind: 'system',
      };
      groups.push(currentGroup);
      return;
    }

    currentGroup.responses.push(message);
  });

  return groups;
};

// --- Constants ---
const AGENTS: Agent[] = [
  {
    id: 'architect',
    role: 'Architect',
    name: 'Nexus-7',
    icon: <Cpu className="w-5 h-5" />,
    color: '#3b82f6',
    description: 'Plans system architecture, component hierarchy, data flow, and technology choices. Creates the blueprint for implementation.'
  },
  {
    id: 'developer',
    role: 'Developer',
    name: 'Cortex-X',
    icon: <Code2 className="w-5 h-5" />,
    color: '#10b981',
    description: 'Implements production-quality code following the architect\'s plan. Writes complete, working files with proper error handling.'
  },
  {
    id: 'designer',
    role: 'Designer',
    name: 'Aura-V',
    icon: <Layout className="w-5 h-5" />,
    color: '#f59e0b',
    description: 'Enhances visual design, typography, spacing, responsiveness, and micro-interactions without changing functionality.'
  },
  {
    id: 'qa',
    role: 'QA',
    name: 'Sentinel-9',
    icon: <ShieldCheck className="w-5 h-5" />,
    color: '#ef4444',
    description: 'Reviews code for bugs, verifies requirements are met, checks for security issues, and fixes any problems found.'
  },
  {
    id: 'debugger',
    role: 'Debugger',
    name: 'Fixer-Bot',
    icon: <Zap className="w-5 h-5" />,
    color: '#8b5cf6',
    description: 'Monitors console output, analyzes runtime errors with stack traces, identifies root causes, and applies targeted fixes.'
  }
];

// --- Components ---

const SidebarContent = ({ 
  projectState, 
  user, 
  projects, 
  currentProject, 
  onSelectProject, 
  onNewProject 
}: { 
  projectState: ProjectState;
  user: AuthUser | null;
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (p: Project) => void;
  onNewProject: () => void;
}) => (
  <>
    <div className="flex-1 overflow-y-auto p-6 border-b border-white/5 custom-scrollbar">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
          <Layers className="w-6 h-6 text-accent terminal-glow" />
        </div>
        <div>
          <h1 className="font-mono font-bold text-sm tracking-tighter">AGENTIC_DEV</h1>
          <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">v2.5.0-FIREBASE</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-mono opacity-30 uppercase tracking-[0.2em]">Projects</h2>
            <button 
              onClick={onNewProject}
              className="p-1 rounded hover:bg-white/5 text-accent transition-all"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1 pr-2">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg text-xs font-mono transition-all border",
                  currentProject?.id === p.id 
                    ? "bg-accent/10 border-accent/20 text-accent" 
                    : "border-transparent opacity-50 hover:opacity-100 hover:bg-white/5"
                )}
              >
                <FolderOpen className="w-3 h-3" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {projects.length === 0 && (
              <p className="text-[10px] font-mono opacity-20 text-center py-4 italic">No projects found</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-mono opacity-30 uppercase tracking-[0.2em] mb-4">Active Agents</h2>
          <div className="space-y-3">
            {AGENTS.map((agent, idx) => (
              <div 
                key={agent.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-all border",
                  projectState.currentAgentIndex === idx 
                    ? "bg-white/5 border-white/10" 
                    : "border-transparent opacity-50"
                )}
              >
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                >
                  {agent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-bold truncate">{agent.name}</p>
                  <p className="text-[10px] font-mono opacity-50 truncate">{agent.role}</p>
                </div>
                {projectState.currentAgentIndex === idx && (
                  <motion.div 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-1.5 h-1.5 rounded-full bg-accent"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="mt-auto p-6 space-y-4">
      <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3 h-3 text-accent" />
          <span className="text-[10px] font-mono text-accent uppercase tracking-wider">System Status</span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="opacity-50">Firestore</span>
          <span className="text-accent">CONNECTED</span>
        </div>
      </div>

      {user ? (
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
                    {user.photoURL && (
                      <Image 
                        src={user.photoURL} 
                        alt={user.displayName || 'User'} 
                        width={32} 
                        height={32} 
                        className="rounded-full border border-white/10" 
                      />
                    )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono font-bold truncate">{user.displayName}</p>
            <button onClick={logout} className="text-[9px] font-mono text-red-400 hover:underline">LOGOUT</button>
          </div>
        </div>
      ) : (
        <button 
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-accent text-black font-mono font-bold text-xs hover:scale-[1.02] transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>SIGN IN WITH GOOGLE</span>
        </button>
      )}
    </div>
  </>
);

const AgentBadge = memo(({ agent }: { agent: Agent }) => (
  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
    <div style={{ color: agent.color }}>{agent.icon}</div>
    <span className="text-xs font-mono font-medium uppercase tracking-wider">{agent.name}</span>
    <span className="text-[10px] opacity-50 font-mono">[{agent.role}]</span>
  </div>
));
AgentBadge.displayName = 'AgentBadge';

const FileChangeViewer = memo(({ files }: { files: { path: string, content: string, type: 'update' | 'delete' }[] }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (files.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">Proposed Changes</div>
      {files.map((file, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div key={index} className="border border-white/10 rounded-lg overflow-hidden bg-black/50">
            <button
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {file.type === 'delete' ? (
                  <Trash2 className="w-4 h-4 text-red-400" />
                ) : (
                  <FileCode2 className="w-4 h-4 text-accent" />
                )}
                <span className="text-xs font-mono text-white/80">{file.path}</span>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-mono",
                  file.type === 'delete' ? "bg-red-500/20 text-red-400" : "bg-accent/20 text-accent"
                )}>
                  {file.type === 'delete' ? 'DELETED' : 'UPDATED'}
                </span>
              </div>
              {file.type !== 'delete' && (
                <ChevronDown className={cn("w-4 h-4 text-white/50 transition-transform", isExpanded && "rotate-180")} />
              )}
            </button>
            
            {isExpanded && file.type !== 'delete' && (
              <div className="p-4 border-t border-white/10 bg-[#0a0a0a] overflow-x-auto">
                <pre className="text-[10px] sm:text-xs font-mono text-white/70">
                  <code>{file.content}</code>
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
FileChangeViewer.displayName = 'FileChangeViewer';

const MessageBubble = memo(({ message, onAction }: { message: Message; onAction?: (type: string) => void }) => {
  const agent = AGENTS.find(a => a.role === message.role);
  const isUser = message.role === 'User';
  const hasHebrew = /[\u0590-\u05FF]/.test(message.content);

  const parsedContent = useMemo(() => {
    if (isUser) return { textContent: message.content, files: [] };

    const fileRegex = /\[FILE:\s*(.*?)\]([\s\S]*?)\[\/FILE\]/g;
    const deleteRegex = /\[DELETE_FILE:\s*(.*?)\]/g;
    
    const files: { path: string, content: string, type: 'update' | 'delete' }[] = [];
    
    let match;
    while ((match = fileRegex.exec(message.content)) !== null) {
      files.push({ path: match[1].trim(), content: match[2].trim(), type: 'update' });
    }
    while ((match = deleteRegex.exec(message.content)) !== null) {
      files.push({ path: match[1].trim(), content: '', type: 'delete' });
    }
    
    let textContent = message.content
      .replace(/\[FILE:\s*(.*?)\]([\s\S]*?)\[\/FILE\]/g, '')
      .replace(/\[DELETE_FILE:\s*(.*?)\]/g, '')
      .trim();
      
    return { textContent, files };
  }, [message.content, isUser]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-2 p-4 rounded-xl border transition-all",
        isUser ? "bg-white/5 border-white/10" : "bg-[#111] border-white/5"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isUser ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
                <UserIcon className="w-3 h-3 text-accent" />
              </div>
              <span className="text-xs font-mono text-accent">USER_CMD</span>
            </div>
          ) : (
            agent && <AgentBadge agent={agent} />
          )}
        </div>
        <span className="text-[10px] opacity-30 font-mono">
          {formatMessageTime(message.timestamp)}
        </span>
      </div>

      {message.imageUrl && (
        <div className="mb-3 relative w-full max-w-sm aspect-video rounded-lg overflow-hidden border border-white/10">
          <Image 
            src={message.imageUrl} 
            alt="Uploaded context" 
            fill 
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {message.attachments && message.attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {message.attachments.map((att, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-black/50 flex items-center justify-center">
              {att.type.startsWith('image/') ? (
                <Image src={att.url} alt={att.name} fill className="object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <FileCode className="w-6 h-6 text-accent/70 mb-1" />
                  <span className="text-[8px] font-mono text-white/70 truncate w-full">{att.name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div 
        className={cn(
          "prose prose-invert prose-sm max-w-none font-mono text-sm leading-relaxed opacity-90 overflow-x-auto",
          hasHebrew ? "text-right" : "text-left"
        )}
        dir={hasHebrew ? "rtl" : "ltr"}
      >
        <ReactMarkdown
          components={{
            code: ({node, className, children, ...props}: any) => (
              <code dir="ltr" className={cn(className, "inline-block text-left")} {...props}>{children}</code>
            ),
            pre: ({node, ...props}: any) => <pre dir="ltr" className="text-left" {...props} />
          }}
        >
          {parsedContent.textContent}
        </ReactMarkdown>
      </div>

      {!isUser && parsedContent.files.length > 0 && (
        <FileChangeViewer files={parsedContent.files} />
      )}

      {message.isDebuggerProposal && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Zap className="w-4 h-4 text-purple-400" />
          <div className="flex-1">
            <p className="text-xs font-mono text-purple-200">I&apos;ve detected errors that I can fix. Should I proceed?</p>
          </div>
          <button 
            onClick={() => onAction?.('runDebugger')}
            className="px-4 py-1.5 bg-purple-500 text-white rounded text-[10px] font-mono font-bold hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/20"
          >
            YES, FIX ERRORS
          </button>
        </div>
      )}
    </motion.div>
  );
});
MessageBubble.displayName = 'MessageBubble';

const OrchestrationAccordion = memo(({
  group,
  isExpanded,
  isRunning,
  isLatest,
  activeAgentName,
  index,
  onToggle,
  onAction
}: {
  group: OrchestrationGroup;
  isExpanded: boolean;
  isRunning: boolean;
  isLatest: boolean;
  activeAgentName?: string;
  index: number;
  onToggle: () => void;
  onAction?: (type: string) => void;
}) => {
  const previewSource = group.request?.content || group.responses[0]?.content || '';
  const preview = getMessagePreview(previewSource) || (group.kind === 'request' ? 'No request content.' : 'System activity');
  const previewHasHebrew = /[\u0590-\u05FF]/.test(preview);
  const responseCount = group.responses.length;
  const title = group.kind === 'request' ? `Request ${String(index + 1).padStart(2, '0')}` : 'System Activity';

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#090909]/90 backdrop-blur-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-4 md:p-5 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-accent/80">{title}</span>
            {group.kind === 'request' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/5 text-white/45">
                {responseCount} {responseCount === 1 ? 'response' : 'responses'}
              </span>
            )}
            {isLatest && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-accent/15 text-accent">
                Latest
              </span>
            )}
            {isRunning && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/15 text-blue-300">
                Running{activeAgentName ? `: ${activeAgentName}` : ''}
              </span>
            )}
          </div>
          <p
            className={cn(
              "text-sm md:text-[15px] font-mono text-white/85 leading-relaxed break-words",
              previewHasHebrew ? "text-right" : "text-left"
            )}
            dir={previewHasHebrew ? "rtl" : "ltr"}
          >
            {preview}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <span className="hidden sm:block text-[10px] font-mono uppercase tracking-widest text-white/30">
            {formatMessageTime(group.startedAt)}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-white/50 transition-transform", isExpanded && "rotate-180")} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 p-4 md:p-5 space-y-5 bg-black/20">
              {group.request && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/35">Requirement</div>
                  <MessageBubble message={group.request} onAction={onAction} />
                </div>
              )}

              {group.responses.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/35">
                    {group.kind === 'request' ? 'Execution / Responses' : 'Activity'}
                  </div>
                  {group.responses.map((message) => (
                    <MessageBubble key={message.id} message={message} onAction={onAction} />
                  ))}
                </div>
              )}

              {isRunning && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 border-dashed animate-pulse">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span className="text-xs font-mono opacity-50">
                    Agent <span className="text-accent">{activeAgentName || 'Orchestrator'}</span> is processing...
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
OrchestrationAccordion.displayName = 'OrchestrationAccordion';

const PromptInput = memo(({ 
  onSubmit, 
  isProcessing, 
  currentProject,
  attachments,
  onFileSelect,
  onRemoveAttachment
}: { 
  onSubmit: (prompt: string) => void; 
  isProcessing: boolean; 
  currentProject: any;
  attachments: Attachment[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
}) => {
  const [localInput, setLocalInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Smart RTL detection based on the first non-whitespace character
  const isHebrew = /^[\u0590-\u05FF]/.test(localInput.trim());
  const direction = isHebrew ? 'rtl' : 'ltr';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!localInput.trim() || isProcessing || !currentProject) return;
    onSubmit(localInput);
    setLocalInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="w-full">
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border border-accent/50 group bg-black/50 flex items-center justify-center">
              {att.type.startsWith('image/') ? (
                <Image src={att.url} alt={att.name} fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center p-1 text-center">
                  <FileCode className="w-6 h-6 text-accent/70 mb-1" />
                  <span className="text-[8px] font-mono text-white/70 truncate w-full">{att.name}</span>
                </div>
              )}
              <button 
                onClick={() => onRemoveAttachment(idx)}
                className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <form 
        onSubmit={handleSubmit}
        className="relative group"
      >
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-1000 group-hover:duration-200" />
          <div 
            className="relative flex items-end bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all"
            dir={direction}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={onFileSelect}
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 md:p-6 hover:text-accent transition-colors shrink-0"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4 md:w-5 md:h-5 opacity-30" />
            </button>
            <textarea 
              ref={textareaRef}
              value={localInput}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={isProcessing ? "Agents are working..." : "Enter project requirements... (Ctrl+Enter to send)"}
              disabled={isProcessing || !currentProject}
              className="flex-1 bg-transparent py-4 md:py-6 text-xs md:text-sm font-mono outline-none placeholder:opacity-20 resize-none min-h-[56px] md:min-h-[68px] max-h-[200px] custom-scrollbar"
              rows={1}
            />
            <div className="p-3 md:p-4 shrink-0 flex items-center gap-2">
              <button 
                type="submit"
                disabled={isProcessing || !localInput.trim() || !currentProject}
                className={cn(
                  "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all",
                  isProcessing || !localInput.trim() || !currentProject
                    ? "bg-white/5 opacity-20 cursor-not-allowed" 
                    : "bg-accent text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                )}
                title="Send (Ctrl+Enter)"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className={cn("w-4 h-4 md:w-5 md:h-5", isHebrew && "-scale-x-100")} />}
              </button>
            </div>
          </div>
        </form>
    </div>
  );
});
PromptInput.displayName = 'PromptInput';

// --- Main Page ---

export default function AgenticDevPage() {
  // Auth State
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'landing' | 'auth' | 'app'>('landing');

  // UI State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [isSkillLibraryOpen, setIsSkillLibraryOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<'all' | 'project'>('all');
  const [importingSkills, setImportingSkills] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'preview' | 'tasks' | 'agents'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [projectState, setProjectState] = useState<ProjectState>({
    status: 'idle',
    currentAgentIndex: -1
  });
  const [previewKey, setPreviewKey] = useState(0);
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<{ type: 'log' | 'error' | 'warn' | 'info'; message: string; timestamp: number }[]>([]);
  const [isDebuggerRunning, setIsDebuggerRunning] = useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastNotifiedErrorCount = useRef(0);

  // Daytona Sandbox State
  const sandbox = useSandbox();
  const [isSandboxPreview, setIsSandboxPreview] = useState(false);
  const [sandboxServerStarted, setSandboxServerStarted] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateScrollButtonVisibility = useCallback(() => {
    const container = scrollRef.current;

    if (!container || activeTab !== 'chat' || messages.length === 0) {
      setShowScrollButton(false);
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const shouldShow = distanceFromBottom > 48;

    setShowScrollButton(prev => (prev !== shouldShow ? shouldShow : prev));
  }, [activeTab, messages.length]);

  const handleChatScroll = useCallback(() => {
    updateScrollButtonVisibility();
  }, [updateScrollButtonVisibility]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      requestAnimationFrame(() => setShowScrollButton(false));
    }
  }, []);

  // Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isRunningTasks, setIsRunningTasks] = useState(false);
  
  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editAiModel, setEditAiModel] = useState(DEFAULT_AI_MODEL);
  const [availableModels, setAvailableModels] = useState<VertexModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTab, setExportTab] = useState<'download' | 'github'>('download');
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubCommitMsg, setGithubCommitMsg] = useState('Initial commit from AI Studio');
  const [exportStatus, setExportStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

  const consoleEndRef = useRef<HTMLDivElement>(null);

  const currentProjectAiModel = currentProject?.aiModel || DEFAULT_AI_MODEL;
  const groupedMessages = useMemo(() => buildOrchestrationGroups(messages), [messages]);
  const latestGroupId = groupedMessages[groupedMessages.length - 1]?.id ?? null;
  const activeAgentName = projectState.currentAgentIndex >= 0 ? AGENTS[projectState.currentAgentIndex]?.name : undefined;

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(latestGroupId);

  const handleToggleGroup = useCallback((groupId: string) => {
    setExpandedGroupId(prev => (prev === groupId ? null : groupId));
  }, []);

  useEffect(() => {
    setExpandedGroupId(latestGroupId);
  }, [latestGroupId]);

  const effectiveModelOptions = useMemo(() => {
    const options = [...availableModels];
    const fallbackModelId = editAiModel || currentProjectAiModel;

    if (fallbackModelId && !options.some((option) => option.id === fallbackModelId)) {
      options.unshift({
        id: fallbackModelId,
        displayName: fallbackModelId,
        supportedActions: [],
      });
    }

    return options;
  }, [availableModels, currentProjectAiModel, editAiModel]);

  const selectedModelOption = useMemo(
    () => effectiveModelOptions.find((option) => option.id === editAiModel),
    [effectiveModelOptions, editAiModel]
  );

  const isSettingsDirty = Boolean(
    currentProject &&
      (
        editProjectName !== currentProject.name ||
        editProjectDescription !== (currentProject.description || '') ||
        editAiModel !== currentProjectAiModel
      )
  );

  const loadVertexModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelsError(null);

    try {
      const response = await fetch('/api/ai/models', {
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load Vertex AI models.');
      }

      const models = Array.isArray(payload.models) ? payload.models as VertexModelOption[] : [];
      const recommendedModel = typeof payload.recommendedModel === 'string' ? payload.recommendedModel : DEFAULT_AI_MODEL;

      setAvailableModels(models);
      setEditAiModel((currentValue) => currentValue || recommendedModel);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Vertex AI models.';

      setModelsError(message);
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const generateAiText = useCallback(async ({
    prompt,
    systemInstruction,
    attachments = [],
    model,
  }: {
    prompt: string;
    systemInstruction?: string;
    attachments?: Attachment[];
    model?: string;
  }) => {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        prompt,
        systemInstruction,
        attachments,
        model: model || currentProjectAiModel,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Vertex AI request failed.');
    }

    return typeof payload.text === 'string' ? payload.text : '';
  }, [currentProjectAiModel]);

  const parseAndSaveFiles = async (content: string, projectId: string) => {
    const fileRegex = /\[FILE: (.*?)\]([\s\S]*?)\[\/FILE\]/g;
    const deleteRegex = /\[DELETE_FILE: (.*?)\]/g;
    let match;
    let filesSaved = 0;
    let filesDeleted = 0;

    while ((match = fileRegex.exec(content)) !== null) {
      const path = match[1].trim();
      let fileContent = match[2];
      
      // Strip markdown code block formatting if present
      if (fileContent.trim().startsWith('```')) {
        const lines = fileContent.trim().split('\n');
        if (lines.length > 1) {
          lines.shift(); // Remove opening ```
          if (lines[lines.length - 1].trim() === '```') {
            lines.pop(); // Remove closing ```
          }
          fileContent = lines.join('\n');
        }
      }

      // Trim leading/trailing whitespace but preserve internal structure
      fileContent = fileContent.replace(/^\n+/, '').replace(/\n+$/, '\n');

      // Validate file content is not empty or placeholder
      const trimmedContent = fileContent.trim();
      if (trimmedContent.length === 0) {
        console.warn(`Skipping empty file: ${path}`);
        continue;
      }
      if (trimmedContent === '// ... existing code ...' || trimmedContent === '// rest of code' || trimmedContent === '// ... rest of file ...') {
        console.warn(`Skipping placeholder file: ${path}`);
        continue;
      }

      const fileId = btoa(path).replace(/=/g, '');
      const language = path.split('.').pop() || 'plaintext';

      try {
        await setDoc(doc(db, `projects/${projectId}/files`, fileId), {
          id: fileId,
          projectId,
          path,
          content: fileContent,
          language,
          lastModified: Timestamp.now()
        });
        filesSaved++;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `projects/${projectId}/files/${fileId}`);
      }
    }

    while ((match = deleteRegex.exec(content)) !== null) {
      const path = match[1].trim();
      const fileId = btoa(path).replace(/=/g, '');
      try {
        await deleteDoc(doc(db, `projects/${projectId}/files`, fileId));
        filesDeleted++;
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}/files/${fileId}`);
      }
    }

    return { filesSaved, filesDeleted };
  };

  const triggerDebuggerProposal = useCallback(async () => {
    if (!currentProject) return;
    
    const debuggerMsgId = Date.now().toString() + 'debugger-proposal';
    const debuggerMsg: Message = {
      id: debuggerMsgId,
      projectId: currentProject.id,
      role: 'Debugger',
      content: "I've detected some errors in your application's console. Would you like me to analyze them and propose a fix?",
      timestamp: Timestamp.now(),
      isDebuggerProposal: true
    };

    try {
      await setDoc(doc(db, `projects/${currentProject.id}/messages`, debuggerMsgId), debuggerMsg);
      lastNotifiedErrorCount.current = consoleLogs.filter(l => l.type === 'error').length;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${currentProject.id}/messages`);
    }
  }, [currentProject, consoleLogs]);

  const runDebugger = async () => {
    if (!currentProject || isProcessing) return;
    setIsProcessing(true);
    setIsDebuggerRunning(true);
    setActiveTab('chat');

    const errors = consoleLogs.filter(l => l.type === 'error');
    const warnings = consoleLogs.filter(l => l.type === 'warn');
    if (errors.length === 0) {
      setIsProcessing(false);
      setIsDebuggerRunning(false);
      return;
    }

    const projectType = currentProject.projectType || 'static-site';
    const projectTypeConfig = PROJECT_TYPES[projectType] || PROJECT_TYPES['static-site'];

    const errorDetails = errors.map((e, i) => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      return `[ERROR ${i + 1} @ ${time}]\n${e.message}`;
    }).join('\n\n');
    
    const warningDetails = warnings.length > 0 
      ? `\n\nWARNINGS (${warnings.length}):\n${warnings.map((w, i) => `[WARN ${i + 1}] ${w.message}`).join('\n')}`
      : '';

    const debuggerPrompt = `Console Errors Detected:\n${errorDetails}${warningDetails}\n\nAnalyze these errors, identify the root cause in the project files, and fix them.`;

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      projectId: currentProject.id,
      role: 'User',
      content: debuggerPrompt,
      timestamp: Timestamp.now()
    };

    try {
      await setDoc(doc(db, `projects/${currentProject.id}/messages`, userMsgId), userMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${currentProject.id}/messages`);
    }

    let context = `PROJECT TYPE: ${projectTypeConfig.name}\n`;
    context += `PROJECT TYPE RULES: ${projectTypeConfig.agentInstruction}\n\n`;
    context += `Recent Messages:\n`;
    const recentMessages = messages.slice(-5);
    recentMessages.forEach(m => {
      context += `[${m.role}]: ${getMessagePreview(m.content)}\n\n`;
    });
    context += `Debug Request: ${debuggerPrompt}\n\n`;
    
    if (files.length > 0) {
      context += "Current Project Files:\n";
      files.forEach(f => {
        context += `[FILE: ${f.path}]\n${f.content}\n[/FILE]\n\n`;
      });
    }

    const agent = AGENTS.find(a => a.role === 'Debugger') || AGENTS[0];
    setProjectState({ status: 'developing', currentAgentIndex: AGENTS.indexOf(agent) });

    const systemInstruction = `You are FIXER-BOT, the Debugger Agent. You are an expert at diagnosing and fixing JavaScript/runtime errors.

DEBUGGING PROCESS:
1. ANALYZE each error message carefully - identify the file, line number, and error type
2. TRACE the error to its root cause in the source code
3. FIX the specific file(s) causing the error
4. VERIFY your fix doesn't introduce new issues

COMMON ERROR PATTERNS TO CHECK:
- ReferenceError: variable/function not defined → check scope, typos, missing declarations
- TypeError: cannot read property of undefined → add null checks, verify data flow
- SyntaxError: unexpected token → check brackets, quotes, semicolons
- Network errors: failed to fetch → check URLs, CORS, network connectivity
- React errors: hooks rules, missing keys, invalid children → check component structure

FILE OPERATIONS:
- Create/Update: [FILE: path/to/file.ext] FULL_FILE_CONTENT [/FILE]
- Delete: [DELETE_FILE: path/to/file.ext]

CRITICAL RULES:
1. ALWAYS provide COMPLETE file content - never use placeholders like "// ... existing code"
2. ONLY fix the files that are causing errors - do not modify unrelated files
3. Do NOT change the project type or technology stack
4. After your analysis, explain what the error was, what caused it, and how you fixed it
5. List every file you modified with a brief description of the change

PROJECT TYPE: ${projectTypeConfig.name}
${projectTypeConfig.agentInstruction}

Current Context:
${context}`;

    try {
      const content = await generateAiText({
        prompt: debuggerPrompt,
        systemInstruction,
        model: currentProject.aiModel,
      });
      await parseAndSaveFiles(content, currentProject.id);

      const agentMsgId = Date.now().toString() + 'debugger';
      const agentMsg: Message = {
        id: agentMsgId,
        projectId: currentProject.id,
        role: 'Debugger',
        content: content,
        timestamp: Timestamp.now()
      };
      await setDoc(doc(db, `projects/${currentProject.id}/messages`, agentMsgId), agentMsg);
    } catch (error) {
      console.error("Debugger Error:", error);
    }

    setIsProcessing(false);
    setIsDebuggerRunning(false);
    setProjectState({ status: 'completed', currentAgentIndex: -1 });
  };

  const downloadSkill = async (skillId: string) => {
    if (!currentProject) return;
    try {
      const updatedSkills = [...(currentProject.downloadedSkills || []), skillId];
      await updateDoc(doc(db, 'projects', currentProject.id), {
        downloadedSkills: updatedSkills,
        lastModified: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${currentProject.id}`);
    }
  };

  const importFromLibrary = async () => {
    setImportingSkills(true);
    try {
      const res = await fetch('/api/import-skills');
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to import skills from library.', 'error');
        return;
      }
      const { skills, count } = await res.json();
      if (!skills || skills.length === 0) {
        showToast('No skills found in the library. Run: npx antigravity-awesome-skills', 'error');
        return;
      }

      const existingIds = new Set(availableSkills.map(s => s.id));
      let imported = 0;
      for (const skill of skills) {
        if (existingIds.has(skill.id)) continue;
        try {
          await setDoc(doc(db, 'availableSkills', skill.id), skill);
          imported++;
        } catch {
          // skip individual failures
        }
      }
      showToast(`Imported ${imported} new skills from library (${count} total found, ${existingIds.size} already present).`, 'success');
    } catch (err) {
      showToast('Failed to connect to import API. Make sure the dev server is running.', 'error');
    } finally {
      setImportingSkills(false);
    }
  };

  const toggleGlobalSkill = async (skillId: string) => {
    if (!currentProject) return;
    try {
      const currentSkills = currentProject.globalSkills || [];
      const updatedSkills = currentSkills.includes(skillId)
        ? currentSkills.filter(id => id !== skillId)
        : [...currentSkills, skillId];
      
      await updateDoc(doc(db, 'projects', currentProject.id), {
        globalSkills: updatedSkills,
        lastModified: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${currentProject.id}`);
    }
  };

  const toggleAgentSkill = async (agentId: string, skillId: string) => {
    if (!currentProject) return;
    try {
      const agentConfigs = { ...(currentProject.agentConfigs || {}) };
      if (!agentConfigs[agentId]) {
        agentConfigs[agentId] = { skills: [], creativity: 0.7, focus: 'balanced', tools: [] };
      }
      
      const currentSkills = agentConfigs[agentId].skills || [];
      const updatedSkills = currentSkills.includes(skillId)
        ? currentSkills.filter(id => id !== skillId)
        : [...currentSkills, skillId];
      
      agentConfigs[agentId] = { ...agentConfigs[agentId], skills: updatedSkills };
      
      await updateDoc(doc(db, 'projects', currentProject.id), {
        agentConfigs,
        lastModified: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${currentProject.id}`);
    }
  };

  const runOrchestration = async (userPrompt: string) => {
    if (!currentProject || isProcessing) return;
    setIsProcessing(true);
    setAttachments([]);

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      projectId: currentProject.id,
      role: 'User',
      content: userPrompt,
      timestamp: Timestamp.now(),
      ...(attachments.length > 0 && { attachments })
    };

    try {
      await setDoc(doc(db, `projects/${currentProject.id}/messages`, userMsgId), userMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${currentProject.id}/messages`);
    }

    const orchestrationAgents = AGENTS.filter(a => a.role !== 'Debugger');
    const agentStatuses: Record<string, ProjectState['status']> = {
      'Architect': 'architecting',
      'Developer': 'developing',
      'Designer': 'designing',
      'QA': 'reviewing'
    };
    
    const projectType = currentProject.projectType || 'static-site';
    const projectTypeConfig = PROJECT_TYPES[projectType] || PROJECT_TYPES['static-site'];
    
    let context = `PROJECT TYPE: ${projectTypeConfig.name} (ID: ${projectType})\n`;
    context += `PROJECT TYPE RULES: ${projectTypeConfig.agentInstruction}\n`;
    context += `FILE CONVENTION: ${projectTypeConfig.fileConvention}\n\n`;
    context += `Previous Conversation (Last 10 messages):\n`;
    const recentMessages = messages.slice(-10);
    recentMessages.forEach(m => {
      context += `[${m.role}]: ${getMessagePreview(m.content)}\n\n`;
    });
    context += `New User Request: ${userPrompt}\n\n`;
    
    if (files.length > 0) {
      context += "Current Project Files Content:\n";
      files.forEach(f => {
        context += `[FILE: ${f.path}]\n${f.content}\n[/FILE]\n\n`;
      });
    }

    let errorContext = '';

    for (let i = 0; i < orchestrationAgents.length; i++) {
      const agent = orchestrationAgents[i];
      setProjectState({ status: agentStatuses[agent.role] || 'analyzing', currentAgentIndex: AGENTS.indexOf(agent) });

      const agentSkills = [
        ...(currentProject.globalSkills || []),
        ...(currentProject.agentConfigs?.[agent.id]?.skills || [])
      ].map(id => availableSkills.find(s => s.id === id)).filter(Boolean) as Skill[];

      const skillsContext = agentSkills.length > 0 
        ? `\nAssigned Skills:\n${agentSkills.map(s => `- ${s.name}: ${s.content}`).join('\n')}`
        : '';

      const agentRoleInstructions: Record<string, string> = {
        'Architect': `You are the ARCHITECT Agent (Nexus-7). Your role is to plan and design the system architecture.

RESPONSIBILITIES:
- Analyze the user's request and break it down into clear architectural decisions
- Define the file structure, component hierarchy, and data flow
- Specify which technologies, libraries, and patterns to use
- Create a clear plan that the Developer agent can follow
- Consider edge cases, error handling, and scalability

OUTPUT FORMAT:
- Provide a clear architectural plan as text
- If you create or update files, use [FILE: path] tags with COMPLETE file content
- Focus on planning; leave implementation details to the Developer agent
- Be specific about component names, file paths, and data structures`,

        'Developer': `You are the DEVELOPER Agent (Cortex-X). Your role is to implement the code based on the Architect's plan.

RESPONSIBILITIES:
- Write clean, correct, production-quality code
- Follow the Architect's plan precisely
- Implement all functionality described in the user's request
- Ensure all files are complete and work together
- Handle errors and edge cases in code

STRICT RULES:
- ONLY implement what was requested - do not add features the user did not ask for
- Do NOT change the project type or technology stack unless explicitly requested
- Every file you output must be COMPLETE - no placeholders, no "// ... rest of code", no truncation
- Ensure all cross-file references (imports, links, paths) are correct
- Verify your code mentally before outputting it`,

        'Designer': `You are the DESIGNER Agent (Aura-V). Your role is to enhance the visual design and user experience.

RESPONSIBILITIES:
- Improve the visual styling, layout, and typography
- Ensure responsive design across screen sizes
- Add smooth transitions and micro-interactions
- Ensure color contrast and visual hierarchy

STRICT RULES:
- ONLY modify styling and visual elements - do NOT change functionality
- Do NOT remove or break existing features
- Preserve all JavaScript logic and component structure
- Only output files you are changing - do not re-output unchanged files
- Use the project's existing CSS framework (Tailwind, vanilla CSS, etc.)`,

        'QA': `You are the QA Agent (Sentinel-9). Your role is to review the implementation for quality and correctness.

RESPONSIBILITIES:
- Review all generated code for bugs, errors, and security issues
- Verify that the implementation matches the user's request exactly
- Check for broken links, missing imports, and type errors
- Validate that the preview will work correctly
- Fix any issues you find

STRICT RULES:
- If you find issues, fix them by outputting corrected [FILE: path] tags
- If no issues are found, confirm that the implementation is correct
- Do NOT add new features or change existing functionality
- Only fix bugs - do not refactor or "improve" working code
- Be specific about what you checked and what you fixed`
      };

      const roleInstruction = agentRoleInstructions[agent.role] || agent.description;

      const systemInstruction = `${roleInstruction}
${skillsContext}

PROJECT TYPE: ${projectTypeConfig.name}
${projectTypeConfig.agentInstruction}

FILE OPERATIONS:
- Create/Update: [FILE: path/to/file.ext] FULL_FILE_CONTENT [/FILE]
- Delete: [DELETE_FILE: path/to/file.ext]

CRITICAL RULES:
1. NEVER use placeholders like "// ... existing code ..." or "// rest of file" - always provide COMPLETE file content
2. NEVER change the project type (e.g., from Next.js to static HTML) unless the user explicitly asks
3. NEVER add features the user did not request
4. ALWAYS ensure files reference each other correctly (CSS links, script src, imports)
5. At the end of your response, provide a brief summary of what you did
${errorContext ? `\nERRORS FROM PREVIOUS AGENT:\n${errorContext}\nFix these issues in your response.\n` : ''}
Current Context:
${context}`;

      try {
        const content = await generateAiText({
          prompt: userPrompt,
          systemInstruction,
          attachments: i === 0 ? attachments : [],
          model: currentProject.aiModel,
        });
        
        // Validate that the agent didn't try to change project type
        const lowerContent = content.toLowerCase();
        const typeChangeWarnings: string[] = [];
        if (projectType === 'nextjs' && (lowerContent.includes('static html') || lowerContent.includes('standalone html file') || lowerContent.includes('single html'))) {
          typeChangeWarnings.push('Warning: Response appears to suggest converting to static HTML. This is a Next.js project - maintain Next.js structure.');
        }
        if (projectType === 'static-site' && (lowerContent.includes('package.json') || lowerContent.includes('next.config') || lowerContent.includes('npm install'))) {
          typeChangeWarnings.push('Warning: Response appears to add Node.js/bundler files. This is a static site project - use only HTML/CSS/JS.');
        }
        
        if (typeChangeWarnings.length > 0) {
          errorContext = typeChangeWarnings.join('\n');
        } else {
          errorContext = '';
        }
        
        await parseAndSaveFiles(content, currentProject.id);

        const agentMsgId = Date.now().toString() + agent.role;
        const agentMsg: Message = {
          id: agentMsgId,
          projectId: currentProject.id,
          role: agent.role,
          content: content,
          timestamp: Timestamp.now()
        };
        await setDoc(doc(db, `projects/${currentProject.id}/messages`, agentMsgId), agentMsg);
        
        context += `[${agent.role}]: ${getMessagePreview(content)}\n\n`;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error with ${agent.role}:`, error);
        errorContext = `Agent ${agent.role} encountered an error: ${errorMsg}`;
      }
    }

    setIsProcessing(false);
    setProjectState({ status: 'completed', currentAgentIndex: -1 });
  };

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  useEffect(() => {
    if (currentProject) {
      setConsoleLogs([]);
      lastNotifiedErrorCount.current = 0;
    }
  }, [currentProject]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const errorCount = consoleLogs.filter(l => l.type === 'error').length;
      if (errorCount > lastNotifiedErrorCount.current && currentProject && !isDebuggerRunning) {
        lastNotifiedErrorCount.current = errorCount;
        const errors = consoleLogs.filter(l => l.type === 'error').map(l => l.message).join('\n');
        triggerDebuggerProposal();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [consoleLogs, currentProject, isDebuggerRunning, triggerDebuggerProposal]);

  // Console Message Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CONSOLE_LOG') {
        setConsoleLogs(prev => [...prev, { ...event.data.payload, timestamp: Date.now() }].slice(-100));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        setView('app');
        // Sync user profile
        setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          createdAt: Timestamp.now()
        }, { merge: true });
      } else {
        if (view === 'app') setView('landing');
        setProjects([]);
        setCurrentProject(null);
        setFiles([]);
        setSelectedFile(null);
      }
    });
    return () => unsubscribe();
  }, [view]);

  // Projects Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid), orderBy('lastModified', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pList = snapshot.docs.map(d => d.data() as Project);
      setProjects(pList);
      
      // Sync current project if it's in the list
      if (currentProject) {
        const updated = pList.find(p => p.id === currentProject.id);
        if (updated) {
          // Only update if something actually changed to avoid unnecessary re-renders
          if (JSON.stringify(updated) !== JSON.stringify(currentProject)) {
            setCurrentProject(updated);
          }
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));
    return () => unsubscribe();
  }, [user, currentProject]);

  // Available Skills Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'availableSkills'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sList = snapshot.docs.map(d => d.data() as Skill);
      setAvailableSkills(sList);
      
      // Seed initial skills if empty
      if (sList.length === 0) {
        const initialSkills: Skill[] = [
          {
            id: 'react-expert',
            name: 'React Expert',
            description: 'Deep knowledge of React hooks, patterns, and performance optimization.',
            content: 'You are an expert in React. Use functional components, hooks (useState, useEffect, useMemo, useCallback), and follow best practices for performance and accessibility.',
            category: 'Frontend'
          },
          {
            id: 'tailwind-pro',
            name: 'Tailwind Pro',
            description: 'Master of utility-first CSS and responsive design with Tailwind.',
            content: 'You are a master of Tailwind CSS. Use utility classes effectively, follow mobile-first design, and ensure consistent spacing and typography.',
            category: 'Styling'
          },
          {
            id: 'firebase-wizard',
            name: 'Firebase Wizard',
            description: 'Expert in Firestore, Auth, and security rules.',
            content: 'You are an expert in Firebase. Use Firestore for real-time data, Firebase Auth for security, and write robust security rules.',
            category: 'Backend'
          },
          {
            id: 'typescript-guru',
            name: 'TypeScript Guru',
            description: 'Advanced type safety and architectural patterns.',
            content: 'You are a TypeScript expert. Use advanced types, generics, and ensure strict type safety across the entire codebase.',
            category: 'Language'
          },
          {
            id: 'accessibility-advocate',
            name: 'A11y Advocate',
            description: 'Ensuring web applications are accessible to everyone.',
            content: 'You prioritize accessibility. Use semantic HTML, ARIA labels, and ensure keyboard navigation and screen reader support.',
            category: 'UX'
          },
          {
            id: 'performance-tuner',
            name: 'Performance Tuner',
            description: 'Optimizing bundle size, render cycles, and load times.',
            content: 'You focus on performance. Minimize re-renders, optimize images, and use code-splitting to keep the application fast.',
            category: 'Optimization'
          },
          {
            id: 'testing-ninja',
            name: 'Testing Ninja',
            description: 'Unit, integration, and E2E testing expert.',
            content: 'You are an expert in testing. Write comprehensive tests using Vitest, Jest, or Playwright to ensure application stability.',
            category: 'QA'
          },
          {
            id: 'state-master',
            name: 'State Master',
            description: 'Expert in complex state management patterns.',
            content: 'You excel at state management. Use Context API, Redux, or Zustand effectively to manage complex application states.',
            category: 'Architecture'
          },
          {
            id: 'api-architect',
            name: 'API Architect',
            description: 'Designing robust and scalable REST and GraphQL APIs.',
            content: 'You are an expert in API design. Create clean, documented, and versioned APIs that are easy to consume and maintain.',
            category: 'Backend'
          },
          {
            id: 'security-specialist',
            name: 'Security Specialist',
            description: 'Protecting applications from common vulnerabilities.',
            content: 'You focus on security. Prevent XSS, CSRF, and SQL injection. Ensure secure authentication and authorization flows.',
            category: 'Security'
          },
          {
            id: 'ui-ux-designer',
            name: 'UI/UX Designer',
            description: 'Creating beautiful and intuitive user interfaces.',
            content: 'You have a keen eye for design. Focus on typography, color theory, and user flow to create delightful experiences.',
            category: 'Design'
          },
          {
            id: 'documentation-writer',
            name: 'Doc Writer',
            description: 'Writing clear, concise, and helpful documentation.',
            content: 'You excel at documentation. Write clear READMEs, API docs, and comments that help other developers understand the code.',
            category: 'Communication'
          }
        ];
        initialSkills.forEach(skill => {
          setDoc(doc(db, 'availableSkills', skill.id), skill);
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'availableSkills'));
    return () => unsubscribe();
  }, [user]);

  // Auto-import library skills on first load
  const libraryImportDone = useRef(false);
  useEffect(() => {
    if (!user || libraryImportDone.current || availableSkills.length === 0) return;
    libraryImportDone.current = true;

    const autoImport = async () => {
      try {
        const res = await fetch('/api/import-skills');
        if (!res.ok) return;
        const { skills } = await res.json();
        if (!skills || skills.length === 0) return;

        const existingIds = new Set(availableSkills.map(s => s.id));
        let imported = 0;
        for (const skill of skills) {
          if (existingIds.has(skill.id)) continue;
          try {
            await setDoc(doc(db, 'availableSkills', skill.id), skill);
            imported++;
          } catch {
            // skip individual failures
          }
        }
        if (imported > 0) {
          showToast(`Auto-imported ${imported} skills from library.`, 'success');
        }
      } catch {
        // library not installed or API unavailable - silent
      }
    };
    autoImport();
  }, [user, availableSkills.length, availableSkills, showToast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          url: reader.result as string,
          type: file.type,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  // Files Listener
  useEffect(() => {
    if (!currentProject) {
      const timer = setTimeout(() => setFiles([]), 0);
      return () => clearTimeout(timer);
    }
    const q = query(collection(db, `projects/${currentProject.id}/files`), orderBy('path', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fList = snapshot.docs.map(d => d.data() as ProjectFile);
      setFiles(fList);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `projects/${currentProject.id}/files`));
    return () => unsubscribe();
  }, [currentProject]); // Include currentProject to satisfy linter and ensure clearing logic works

  // Tasks Listener
  useEffect(() => {
    if (!currentProject) {
      const timer = setTimeout(() => setTasks([]), 0);
      return () => clearTimeout(timer);
    }
    const q = query(collection(db, `projects/${currentProject.id}/tasks`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tList = snapshot.docs.map(d => d.data() as Task);
      setTasks(tList);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `projects/${currentProject.id}/tasks`));
    return () => unsubscribe();
  }, [currentProject]);

  // Messages Listener
  useEffect(() => {
    if (!currentProject) {
      const timer = setTimeout(() => setMessages([]), 0);
      return () => clearTimeout(timer);
    }
    const q = query(collection(db, `projects/${currentProject.id}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mList = snapshot.docs.map(d => d.data() as Message);
      setMessages(mList);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `projects/${currentProject.id}/messages`));
    return () => unsubscribe();
  }, [currentProject]);

  // Auto-refresh preview when files change
  useEffect(() => {
    if (activeTab === 'preview') {
      const timer = setTimeout(() => {
        setPreviewKey(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [files, activeTab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      requestAnimationFrame(() => updateScrollButtonVisibility());
    }
  }, [messages, updateScrollButtonVisibility]);

  useEffect(() => {
    if (activeTab !== 'chat') {
      setShowScrollButton(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      updateScrollButtonVisibility();
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTab, isProcessing, messages, updateScrollButtonVisibility]);

  useEffect(() => {
    if (isSettingsModalOpen && availableModels.length === 0 && !isLoadingModels) {
      void loadVertexModels();
    }
  }, [availableModels.length, isLoadingModels, isSettingsModalOpen, loadVertexModels]);

  const handleNewProjectClick = () => {
    if (!user) return loginWithGoogle();
    setNewProjectName('');
    setSelectedTemplateId('blank');
    setIsNewProjectModalOpen(true);
  };

  const submitNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user) return;
    
    setIsNewProjectModalOpen(false);
    const name = newProjectName.trim();
    const template = PROJECT_TEMPLATES.find(t => t.id === selectedTemplateId) || PROJECT_TEMPLATES[0];

    const id = Date.now().toString();
    const newProject: Project = {
      id,
      ownerId: user.uid,
      name,
      description: template.description,
      projectType: template.projectType,
      aiModel: DEFAULT_AI_MODEL,
      createdAt: Timestamp.now(),
      lastModified: Timestamp.now()
    };

    try {
      await setDoc(doc(db, 'projects', id), newProject);
      
      // Add template files
      for (const file of template.files) {
        const fileId = btoa(file.path).replace(/=/g, '');
        const newFile: ProjectFile = {
          id: fileId,
          projectId: id,
          path: file.path,
          content: file.content,
          language: file.language,
          lastModified: Timestamp.now()
        };
        await setDoc(doc(db, `projects/${id}/files`, fileId), newFile);
      }

      setCurrentProject(newProject);
      setActiveTab('chat');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'projects');
    }
  };

  const saveFile = async () => {
    if (!currentProject || !selectedFile) return;
    try {
      await updateDoc(doc(db, `projects/${currentProject.id}/files`, selectedFile.id), {
        content: fileContent,
        lastModified: Timestamp.now()
      });
      await updateDoc(doc(db, 'projects', currentProject.id), {
        lastModified: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${currentProject.id}/files/${selectedFile.id}`);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentProject) return;
    
    const id = Date.now().toString();
    const newTask: Task = {
      id,
      projectId: currentProject.id,
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: Timestamp.now()
    };
    
    setNewTaskTitle('');
    try {
      await setDoc(doc(db, `projects/${currentProject.id}/tasks`, id), newTask);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${currentProject.id}/tasks`);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const runTasks = async (tasksToRun: Task[]) => {
    if (!currentProject || isRunningTasks || tasksToRun.length === 0) return;
    setIsRunningTasks(true);

    for (const task of tasksToRun) {
      try {
        await updateDoc(doc(db, `projects/${currentProject.id}/tasks`, task.id), {
          status: 'processing'
        });

        // Use the orchestrator to perform the task
        await runOrchestration(`Task: ${task.title}`);

        await updateDoc(doc(db, `projects/${currentProject.id}/tasks`, task.id), {
          status: 'completed',
          completed: true
        });
      } catch (err) {
        console.error("Task failed:", err);
        await updateDoc(doc(db, `projects/${currentProject.id}/tasks`, task.id), {
          status: 'failed'
        });
      }
    }

    setIsRunningTasks(false);
    setSelectedTaskIds(new Set());
  };

  const toggleTask = async (task: Task) => {
    if (!currentProject) return;
    try {
      await updateDoc(doc(db, `projects/${currentProject.id}/tasks`, task.id), {
        completed: !task.completed
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${currentProject.id}/tasks/${task.id}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!currentProject) return;
    try {
      await deleteDoc(doc(db, `projects/${currentProject.id}/tasks`, taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${currentProject.id}/tasks/${taskId}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    try {
      await deleteDoc(doc(db, 'projects', currentProject.id));
      setCurrentProject(null);
      setIsSettingsModalOpen(false);
      setIsDeleteConfirmOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${currentProject.id}`);
    }
  };

  const openSettingsModal = () => {
    if (!currentProject) return;
    setEditProjectName(currentProject.name);
    setEditProjectDescription(currentProject.description || '');
    setEditAiModel(currentProject.aiModel || DEFAULT_AI_MODEL);
    setIsSettingsModalOpen(true);
    setIsDeleteConfirmOpen(false);
    void loadVertexModels();
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !editProjectName.trim()) return;
    try {
      await updateDoc(doc(db, 'projects', currentProject.id), {
        name: editProjectName.trim(),
        description: editProjectDescription.trim(),
        aiModel: editAiModel,
        lastModified: Timestamp.now()
      });
      setIsSettingsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${currentProject.id}`);
    }
  };

  const updateAgentConfig = async (agentId: string, updates: Partial<AgentConfig>) => {
    if (!currentProject) return;
    
    const currentConfig = currentProject.agentConfigs?.[agentId] || { creativity: 1.0, focus: '', tools: [] };
    const newConfig = { ...currentConfig, ...updates };
    
    const newConfigs = {
      ...(currentProject.agentConfigs || {}),
      [agentId]: newConfig
    };
    
    // Optimistic update
    setCurrentProject({ ...currentProject, agentConfigs: newConfigs });
    
    try {
      await updateDoc(doc(db, 'projects', currentProject.id), {
        agentConfigs: newConfigs,
        lastModified: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${currentProject.id}`);
    }
  };

  const handleDownloadZip = async () => {
    if (!currentProject || files.length === 0) return;
    setExportStatus({ type: 'loading', message: 'Generating ZIP file...' });
    try {
      const zip = new JSZip();
      files.forEach(file => {
        zip.file(file.path, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name.replace(/\s+/g, '-').toLowerCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus({ type: 'success', message: 'Project downloaded successfully!' });
    } catch (err) {
      setExportStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to generate ZIP' });
    }
  };

  const handlePushToGithub = async () => {
    if (!currentProject || files.length === 0 || !githubToken || !githubRepo || !githubCommitMsg) return;
    setExportStatus({ type: 'loading', message: 'Connecting to GitHub...' });
    
    try {
      const headers = {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };

      // 1. Get user info
      const userRes = await fetch('https://api.github.com/user', { headers });
      if (!userRes.ok) throw new Error('Invalid GitHub token');
      const userData = await userRes.json();
      const owner = userData.login;

      // 2. Create repo if it doesn't exist
      setExportStatus({ type: 'loading', message: 'Ensuring repository exists...' });
      const repoRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: githubRepo, private: true, auto_init: true })
      });
      
      // If 422, it might already exist, which is fine. Otherwise check if it's a real error.
      if (!repoRes.ok && repoRes.status !== 422) {
        throw new Error('Failed to create repository');
      }

      // Wait a moment for repo to be fully initialized if we just created it
      await new Promise(r => setTimeout(r, 2000));

      // 3. Get latest commit SHA
      setExportStatus({ type: 'loading', message: 'Preparing files...' });
      const refRes = await fetch(`https://api.github.com/repos/${owner}/${githubRepo}/git/refs/heads/main`, { headers });
      let refData = await refRes.json();
      
      // Fallback to master if main doesn't exist
      if (!refRes.ok) {
        const masterRes = await fetch(`https://api.github.com/repos/${owner}/${githubRepo}/git/refs/heads/master`, { headers });
        if (!masterRes.ok) throw new Error('Could not find main or master branch');
        refData = await masterRes.json();
      }
      
      const latestCommitSha = refData.object.sha;
      const branchRef = refData.ref;

      // 4. Create blobs and build tree
      const treeItems = await Promise.all(files.map(async (file) => {
        const blobRes = await fetch(`https://api.github.com/repos/${owner}/${githubRepo}/git/blobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: file.content, encoding: 'utf-8' })
        });
        if (!blobRes.ok) throw new Error(`Failed to create blob for ${file.path}`);
        const blobData = await blobRes.json();
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha
        };
      }));

      // 5. Create tree
      setExportStatus({ type: 'loading', message: 'Creating commit...' });
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${githubRepo}/git/trees`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ base_tree: latestCommitSha, tree: treeItems })
      });
      if (!treeRes.ok) throw new Error('Failed to create tree');
      const treeData = await treeRes.json();

      // 6. Create commit
      const commitRes = await fetch(`https://api.github.com/repos/${owner}/${githubRepo}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: githubCommitMsg,
          tree: treeData.sha,
          parents: [latestCommitSha]
        })
      });
      if (!commitRes.ok) throw new Error('Failed to create commit');
      const commitData = await commitRes.json();

      // 7. Update ref
      setExportStatus({ type: 'loading', message: 'Pushing changes...' });
      const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${githubRepo}/git/${branchRef}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sha: commitData.sha })
      });
      if (!updateRefRes.ok) throw new Error('Failed to update branch reference');

      setExportStatus({ type: 'success', message: 'Successfully pushed to GitHub!' });
    } catch (err) {
      setExportStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to push to GitHub' });
    }
  };


  const getPreviewHtml = () => {
    const projectType = currentProject?.projectType || 'static-site';
    const projectTypeConfig = PROJECT_TYPES[projectType] || PROJECT_TYPES['static-site'];
    
    const sortedFiles = [...files].sort((a, b) => {
      const timeA = a.lastModified?.toMillis?.() || 0;
      const timeB = b.lastModified?.toMillis?.() || 0;
      return timeB - timeA;
    });

    const consoleCaptureScript = `
      <script>
        (function() {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          const originalInfo = console.info;
          const sendToParent = (type, args) => {
            const message = args.map(arg => {
              try { return typeof arg === 'object' ? JSON.stringify(arg) : String(arg); }
              catch (e) { return String(arg); }
            }).join(' ');
            window.parent.postMessage({ type: 'CONSOLE_LOG', payload: { type, message } }, '*');
          };
          console.log = (...args) => { originalLog(...args); sendToParent('log', args); };
          console.error = (...args) => { originalError(...args); sendToParent('error', args); };
          console.warn = (...args) => { originalWarn(...args); sendToParent('warn', args); };
          console.info = (...args) => { originalInfo(...args); sendToParent('info', args); };
          window.onerror = (message, source, lineno, colno, error) => {
            sendToParent('error', [\`Uncaught Error: \${message} at \${source}:\${lineno}:\${colno}\`]);
          };
          window.onunhandledrejection = (event) => {
            sendToParent('error', [\`Unhandled Rejection: \${event.reason}\`]);
          };
        })();
      </script>
    `;

    // For Next.js projects, generate a comprehensive preview page
    if (projectType === 'nextjs') {
      return generateNextJsPreview(sortedFiles, consoleCaptureScript);
    }

    // For API projects (Express, Flask), show the api-docs.html if available
    if (projectTypeConfig.previewMode === 'server') {
      let docsFile = sortedFiles.find(f => f.path === 'api-docs.html' || f.path.endsWith('/api-docs.html'));
      if (docsFile) {
        let html = docsFile.content;
        const headInject = `<script src="https://cdn.tailwindcss.com"></script>\n${consoleCaptureScript}`;
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${headInject}</head>`);
        } else {
          html = `<head>${headInject}</head>${html}`;
        }
        return html;
      }
      return generateApiDocsPreview(sortedFiles, projectTypeConfig, consoleCaptureScript);
    }

    // Standard iframe preview for static sites, React CDN, Vue, etc.
    let htmlFile = sortedFiles.find(f => f.path === 'index.html' || f.path === '/index.html');
    if (!htmlFile) {
      htmlFile = sortedFiles.find(f => f.path.endsWith('.html'));
    }

    if (!htmlFile) {
      return `<html><head>${consoleCaptureScript}</head><body style="font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; color:#999; background:#111;">
        <div style="text-align:center;">
          <h2 style="color:#f59e0b; margin-bottom:8px;">No HTML file found</h2>
          <p>Project type: ${projectTypeConfig.name}</p>
          <p style="margin-top:8px;">Ask the agents to generate the required files.</p>
        </div>
      </body></html>`;
    }
    
    let html = htmlFile.content;
    
    // Inject CSS
    const cssFiles = files.filter(f => f.path.endsWith('.css') && f.path !== htmlFile!.path);
    let cssInject = '';
    cssFiles.forEach(f => {
      cssInject += `<style>\n${f.content}\n</style>\n`;
    });
    
    // Inject JS
    const jsFiles = files.filter(f => (f.path.endsWith('.js') || f.path.endsWith('.jsx')) && f.path !== htmlFile!.path);
    let jsInject = '';
    const hasBabel = html.includes('babel.min.js');
    jsFiles.forEach(f => {
      const scriptType = hasBabel ? 'text/babel' : 'text/javascript';
      jsInject += `<script type="${scriptType}">\n${f.content}\n</script>\n`;
    });

    const tailwindInject = '<script src="https://cdn.tailwindcss.com"></script>';
    const headInject = `${tailwindInject}\n${consoleCaptureScript}\n${cssInject}`;
    
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${headInject}</head>`);
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', `<head>${headInject}</head><body>`);
    } else {
      html = `<head>${headInject}</head>${html}`;
    }
    
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${jsInject}</body>`);
    } else {
      html = `${html}${jsInject}`;
    }
    
    return html;
  };

  const generateNextJsPreview = (sortedFiles: ProjectFile[], consoleCaptureScript: string) => {
    const pageFile = sortedFiles.find(f => f.path === 'app/page.tsx' || f.path === 'src/app/page.tsx');
    const layoutFile = sortedFiles.find(f => f.path === 'app/layout.tsx' || f.path === 'src/app/layout.tsx');
    const packageJson = sortedFiles.find(f => f.path === 'package.json');
    const cssFile = sortedFiles.find(f => f.path === 'app/globals.css' || f.path === 'src/app/globals.css');
    
    let deps: string[] = [];
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content);
        deps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
      } catch {}
    }

    const componentFiles = sortedFiles.filter(f => 
      f.path.startsWith('components/') || f.path.startsWith('src/components/')
    );
    const allPages = sortedFiles.filter(f => 
      (f.path.startsWith('app/') || f.path.startsWith('src/app/')) && 
      (f.path.endsWith('.tsx') || f.path.endsWith('.ts') || f.path.endsWith('.jsx'))
    );

    const fileTreeHtml = sortedFiles.map(f => {
      const ext = f.path.split('.').pop()?.toLowerCase() || '';
      const color = ['ts','tsx','js','jsx'].includes(ext) ? '#facc15' : 
                    ext === 'css' ? '#60a5fa' : 
                    ext === 'json' ? '#4ade80' : '#999';
      return `<div style="padding:2px 0; padding-left:${(f.path.split('/').length - 1) * 16 + 8}px;">
        <span style="color:${color};">●</span> ${f.path}
      </div>`;
    }).join('');

    const escapeHtml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const pageContent = pageFile ? escapeHtml(pageFile.content) : '// No page.tsx found';
    const cssContent = cssFile ? escapeHtml(cssFile.content) : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Next.js Project Preview</title>
  ${consoleCaptureScript}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #000 0%, #111 100%); border-bottom: 1px solid #222; padding: 16px 24px; }
    .header h1 { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .header h1 span { color: #fff; }
    .badge { background: #222; color: #aaa; font-size: 10px; padding: 2px 8px; border-radius: 999px; font-family: monospace; }
    .content { display: grid; grid-template-columns: 280px 1fr; min-height: calc(100vh - 60px); }
    .sidebar { background: #111; border-right: 1px solid #222; padding: 16px; overflow-y: auto; }
    .sidebar h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin-bottom: 8px; }
    .file-tree { font-family: monospace; font-size: 12px; color: #aaa; }
    .main { padding: 24px; overflow-y: auto; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .info-card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 16px; }
    .info-card h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin-bottom: 4px; }
    .info-card .value { font-size: 24px; font-weight: 700; color: #fff; }
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #fff; }
    .code-block { background: #111; border: 1px solid #222; border-radius: 8px; padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; color: #e5e5e5; max-height: 400px; overflow-y: auto; }
    .note { background: #1a1a00; border: 1px solid #333300; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #facc15; margin-bottom: 16px; }
    .tabs { display: flex; gap: 2px; margin-bottom: 16px; background: #111; border-radius: 8px; padding: 4px; border: 1px solid #222; }
    .tab { padding: 6px 12px; border-radius: 6px; font-size: 11px; font-family: monospace; cursor: pointer; color: #888; transition: all 0.2s; }
    .tab.active { background: #222; color: #fff; }
    .tab:hover:not(.active) { color: #ccc; }
    .dep-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .dep { background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-family: monospace; color: #818cf8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      <svg width="20" height="20" viewBox="0 0 180 180" fill="none"><mask id="a" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180" style="mask-type:alpha"><circle cx="90" cy="90" r="90" fill="#000"/></mask><g mask="url(#a)"><circle cx="90" cy="90" r="89.5" fill="#000" stroke="#fff"/><path d="M149.508 157.52L69.142 54H54v71.97h12.114V69.384l73.885 95.461a90.04 90.04 0 009.509-7.325z" fill="url(#b)"/><rect x="115" y="54" width="12" height="72" fill="url(#c)"/></g><defs><linearGradient id="b" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="c" x1="121" y1="54" x2="120.99" y2="126" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs></svg>
      <span>Next.js Project Preview</span>
      <span class="badge">App Router</span>
    </h1>
  </div>
  <div class="content">
    <div class="sidebar">
      <h3>Project Structure</h3>
      <div class="file-tree">${fileTreeHtml}</div>
    </div>
    <div class="main">
      <div class="note">
        This is a Next.js server-rendered application. The preview shows project structure and source code. To see the live app, run <code>npm install && npm run dev</code> in your terminal.
      </div>
      <div class="info-grid">
        <div class="info-card">
          <h4>Files</h4>
          <div class="value">${sortedFiles.length}</div>
        </div>
        <div class="info-card">
          <h4>Pages</h4>
          <div class="value">${allPages.length}</div>
        </div>
        <div class="info-card">
          <h4>Components</h4>
          <div class="value">${componentFiles.length}</div>
        </div>
        <div class="info-card">
          <h4>Dependencies</h4>
          <div class="value">${deps.length}</div>
        </div>
      </div>
      ${deps.length > 0 ? `
      <div class="section">
        <h3>Dependencies</h3>
        <div class="dep-list">${deps.map(d => `<span class="dep">${d}</span>`).join('')}</div>
      </div>` : ''}
      <div class="section">
        <h3>Source Code</h3>
        <div class="tabs">
          ${pageFile ? `<div class="tab active" onclick="showCode('page')">page.tsx</div>` : ''}
          ${layoutFile ? `<div class="tab" onclick="showCode('layout')">layout.tsx</div>` : ''}
          ${cssFile ? `<div class="tab" onclick="showCode('css')">globals.css</div>` : ''}
          ${componentFiles.map((f, i) => `<div class="tab" onclick="showCode('comp${i}')">${f.path.split('/').pop()}</div>`).join('')}
        </div>
        ${pageFile ? `<div id="code-page" class="code-block">${pageContent}</div>` : ''}
        ${layoutFile ? `<div id="code-layout" class="code-block" style="display:none">${escapeHtml(layoutFile.content)}</div>` : ''}
        ${cssFile ? `<div id="code-css" class="code-block" style="display:none">${cssContent}</div>` : ''}
        ${componentFiles.map((f, i) => `<div id="code-comp${i}" class="code-block" style="display:none">${escapeHtml(f.content)}</div>`).join('')}
      </div>
    </div>
  </div>
  <script>
    function showCode(id) {
      document.querySelectorAll('.code-block').forEach(b => b.style.display = 'none');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      const el = document.getElementById('code-' + id);
      if (el) el.style.display = 'block';
      event.target.classList.add('active');
    }
  </script>
</body>
</html>`;
  };

  const generateApiDocsPreview = (sortedFiles: ProjectFile[], config: ProjectTypeConfig, consoleCaptureScript: string) => {
    const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    const fileTreeHtml = sortedFiles.map(f => {
      const ext = f.path.split('.').pop()?.toLowerCase() || '';
      const color = ['ts','js','py'].includes(ext) ? '#facc15' : 
                    ext === 'json' ? '#4ade80' : 
                    ext === 'html' ? '#f97316' : '#999';
      return `<div style="padding:2px 0; padding-left:${(f.path.split('/').length - 1) * 16 + 8}px;">
        <span style="color:${color};">●</span> ${f.path}
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.name} Preview</title>
  ${consoleCaptureScript}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; padding: 24px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #888; margin-bottom: 24px; }
    .note { background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 8px; padding: 16px; margin-bottom: 24px; color: #818cf8; }
    .file-tree { font-family: monospace; font-size: 12px; color: #aaa; background: #111; border: 1px solid #222; border-radius: 8px; padding: 16px; }
  </style>
</head>
<body>
  <h1>${config.name}</h1>
  <p class="subtitle">${config.description}</p>
  <div class="note">
    This is a server-side application. To run it locally, use the appropriate command (<code>node server.js</code> for Express or <code>python app.py</code> for Flask). This preview shows the project file structure.
  </div>
  <div class="file-tree">${fileTreeHtml}</div>
</body>
</html>`;
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <span className="text-[10px] font-mono text-accent uppercase tracking-widest animate-pulse">Initializing Environment...</span>
        </div>
      </div>
    );
  }

  if (view === 'landing' && !user) {
    return <LandingPage onGetStarted={() => setView('auth')} />;
  }

  if (view === 'auth' && !user) {
    return <AuthScreen onLogin={loginWithGoogle} onBack={() => setView('landing')} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505]">
      {/* Desktop Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col bg-[#080808] hidden lg:flex">
        <SidebarContent 
          projectState={projectState} 
          user={user} 
          projects={projects}
          currentProject={currentProject}
          onSelectProject={setCurrentProject}
          onNewProject={handleNewProjectClick}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-[#080808] border-r border-white/5 z-50 flex flex-col lg:hidden"
            >
              <div className="absolute top-4 right-4">
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full bg-white/5 border border-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent 
                projectState={projectState} 
                user={user} 
                projects={projects}
                currentProject={currentProject}
                onSelectProject={(p) => { setCurrentProject(p); setIsSidebarOpen(false); }}
                onNewProject={handleNewProjectClick}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-[#050505]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md bg-white/5 border border-white/10"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isProcessing ? "bg-amber-500 animate-pulse" : "bg-accent"
              )} />
              <span className="text-[10px] md:text-xs font-mono uppercase tracking-widest opacity-70 truncate max-w-[120px] md:max-w-none">
                {currentProject ? currentProject.name : 'No Project Selected'}
              </span>
              {currentProject && currentProject.projectType && (
                <span className="hidden md:inline-flex text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">
                  {PROJECT_TYPES[currentProject.projectType]?.name || currentProject.projectType}
                </span>
              )}
              {currentProject && (
                <>
                  <button
                    onClick={() => {
                      setIsExportModalOpen(true);
                      setExportStatus({ type: 'idle', message: '' });
                    }}
                    className="p-1.5 ml-2 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    title="Export Project"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={openSettingsModal}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    title="Project Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            <button 
              onClick={() => setActiveTab('chat')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-mono transition-all flex items-center gap-2",
                activeTab === 'chat' ? "bg-accent text-black" : "opacity-50 hover:opacity-100"
              )}
            >
              <TerminalIcon className="w-3 h-3" />
              <span className="hidden sm:inline">ORCHESTRATOR</span>
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-mono transition-all flex items-center gap-2",
                activeTab === 'files' ? "bg-accent text-black" : "opacity-50 hover:opacity-100"
              )}
            >
              <FileCode className="w-3 h-3" />
              <span className="hidden sm:inline">FILES</span>
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-mono transition-all flex items-center gap-2",
                activeTab === 'preview' ? "bg-accent text-black" : "opacity-50 hover:opacity-100"
              )}
            >
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">PREVIEW</span>
            </button>
            <button 
              onClick={() => setActiveTab('tasks')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-mono transition-all flex items-center gap-2",
                activeTab === 'tasks' ? "bg-accent text-black" : "opacity-50 hover:opacity-100"
              )}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">TASKS</span>
            </button>
            <button 
              onClick={() => setActiveTab('agents')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-mono transition-all flex items-center gap-2",
                activeTab === 'agents' ? "bg-accent text-black" : "opacity-50 hover:opacity-100"
              )}
            >
              <Bot className="w-3 h-3" />
              <span className="hidden sm:inline">AGENTS</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col relative overflow-hidden">
              <div 
                ref={scrollRef}
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth pb-8 custom-scrollbar"
              >
                {groupedMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Bot className="w-8 h-8 md:w-10 md:h-10 text-accent/50" />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-xl md:text-2xl font-mono font-bold tracking-tighter">
                        {currentProject ? `Ready to Build: ${currentProject.name}` : 'Initialize New Project'}
                      </h2>
                      <p className="text-xs md:text-sm font-mono opacity-40 leading-relaxed px-4">
                        {currentProject 
                          ? "Describe the feature or logic you want to implement. The team will generate the necessary files."
                          : "Select a project from the sidebar or create a new one to start orchestrating."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-4 md:space-y-5">
                    {groupedMessages.map((group, index) => (
                      <OrchestrationAccordion
                        key={group.id}
                        group={group}
                        index={index}
                        isExpanded={expandedGroupId === group.id}
                        isLatest={latestGroupId === group.id}
                        isRunning={Boolean(isProcessing && latestGroupId === group.id)}
                        activeAgentName={activeAgentName}
                        onToggle={() => handleToggleGroup(group.id)}
                        onAction={(type) => {
                          if (type === 'runDebugger') runDebugger();
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-6 pb-8 md:pb-8 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent shrink-0 relative">
                {/* Scroll to Bottom Button */}
                <AnimatePresence initial={false}>
                  {showScrollButton && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      onClick={scrollToBottom}
                      className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 w-10 h-10 rounded-full bg-black border border-white flex items-center justify-center shadow-2xl hover:bg-white hover:text-black transition-all group"
                      title="Scroll to bottom"
                    >
                      <ArrowDown className="w-5 h-5 text-white group-hover:text-black transition-colors" />
                    </motion.button>
                  )}
                </AnimatePresence>
                <PromptInput 
                  onSubmit={runOrchestration}
                  isProcessing={isProcessing}
                  currentProject={currentProject}
                  attachments={attachments}
                  onFileSelect={handleFileSelect}
                  onRemoveAttachment={(idx) => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                />
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="flex-1 flex overflow-hidden">
              {/* File List */}
              <div className="w-64 border-r border-white/5 bg-[#080808] flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">Explorer</span>
                  <button className="p-1 hover:bg-white/5 rounded text-accent"><Plus className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {files.length > 0 ? (
                    <FileTreeItem 
                      node={buildFileTree(files)} 
                      selectedFile={selectedFile} 
                      onSelectFile={(f) => { setSelectedFile(f); setFileContent(f.content); }} 
                    />
                  ) : (
                    <p className="text-[10px] font-mono opacity-20 text-center py-8 italic">No files generated yet</p>
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 flex flex-col bg-[#050505]">
                {selectedFile ? (
                  <>
                    <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#080808]">
                      <span className="text-[10px] font-mono opacity-50">{selectedFile.path}</span>
                      <button 
                        onClick={saveFile}
                        className="flex items-center gap-2 px-3 py-1 rounded bg-accent/10 text-accent text-[10px] font-mono hover:bg-accent/20 transition-all"
                      >
                        <Save className="w-3 h-3" />
                        <span>SAVE</span>
                      </button>
                    </div>
                    <textarea 
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="flex-1 p-6 bg-transparent font-mono text-sm outline-none resize-none leading-relaxed text-[#ededed]/80 overflow-y-auto custom-scrollbar"
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-4">
                    <FileCode className="w-12 h-12" />
                    <p className="text-xs font-mono">Select a file to edit</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="flex-1 flex flex-col bg-[#050505]">
              {/* Preview Header */}
              <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-[#080808]">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Live Preview</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded text-[9px] font-mono text-white/60">
                    <FileCode className="w-3 h-3 opacity-50" />
                    {(() => {
                      const pt = currentProject?.projectType || 'static-site';
                      const ptConfig = PROJECT_TYPES[pt];
                      if (ptConfig) return ptConfig.name;
                      return 'Preview';
                    })()}
                  </div>
                  {sandbox.status !== 'idle' && sandbox.status !== 'error' && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-mono text-green-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      SANDBOX {sandbox.status.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isSandboxPreview ? (
                    <button
                      onClick={async () => {
                        try {
                          const projectType = currentProject?.projectType || 'static-site';
                          await sandbox.createSandbox();
                          setIsSandboxPreview(true);
                          setSandboxServerStarted(false);

                          const sandboxFiles: SandboxFile[] = files.map((f) => ({
                            path: f.path,
                            content: f.content,
                          }));

                          if (sandboxFiles.length === 0) {
                            showToast('No files to deploy', 'error');
                            return;
                          }

                          await sandbox.startDevServer(projectType, sandboxFiles);
                          setSandboxServerStarted(true);
                          setPreviewKey((prev) => prev + 1);
                          showToast('Sandbox ready!', 'success');
                        } catch (err) {
                          showToast(
                            err instanceof Error ? err.message : 'Sandbox failed',
                            'error'
                          );
                        }
                      }}
                      disabled={sandbox.status === 'creating' || sandbox.status === 'syncing' || sandbox.status === 'starting'}
                      className="p-1.5 rounded bg-accent/10 hover:bg-accent/20 text-accent transition-colors flex items-center gap-1.5 disabled:opacity-50 border border-accent/20"
                      title="Start Live Sandbox"
                    >
                      {(sandbox.status === 'creating' || sandbox.status === 'syncing' || sandbox.status === 'starting') ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span className="text-[9px] font-mono font-bold uppercase">
                        {sandbox.status === 'creating' ? 'Creating...' :
                         sandbox.status === 'syncing' ? 'Syncing...' :
                         sandbox.status === 'starting' ? 'Starting...' :
                         'Start Sandbox'}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await sandbox.destroySandbox();
                        setIsSandboxPreview(false);
                        setSandboxServerStarted(false);
                        showToast('Sandbox destroyed', 'info');
                      }}
                      className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-1.5 border border-red-500/20"
                      title="Destroy Sandbox"
                    >
                      <X className="w-3 h-3" />
                      <span className="text-[9px] font-mono font-bold uppercase">Stop</span>
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (isSandboxPreview && sandbox.sandboxId) {
                        const sandboxFiles: SandboxFile[] = files.map((f) => ({
                          path: f.path,
                          content: f.content,
                        }));
                        try {
                          await sandbox.syncFiles(sandboxFiles);
                          setPreviewKey((prev) => prev + 1);
                          showToast('Files synced', 'success');
                        } catch (err) {
                          showToast('Sync failed', 'error');
                        }
                      } else {
                        setIsRefreshingPreview(true);
                        setPreviewKey((prev) => prev + 1);
                        setTimeout(() => setIsRefreshingPreview(false), 1000);
                      }
                    }}
                    disabled={isRefreshingPreview}
                    className="p-1.5 rounded hover:bg-white/10 text-white/50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Refresh Preview"
                  >
                    <RefreshCw className={cn("w-3 h-3", isRefreshingPreview && "animate-spin")} />
                    <span className="text-[9px] font-mono font-bold uppercase">Refresh</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isSandboxPreview && sandbox.previewUrl) {
                        window.open(sandbox.previewUrl, '_blank');
                      } else {
                        const blob = new Blob([getPreviewHtml()], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      }
                    }}
                    className="p-1.5 rounded hover:bg-white/10 text-white/50 transition-colors flex items-center gap-1.5"
                    title="Open in New Tab"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="text-[9px] font-mono font-bold uppercase">Popout</span>
                  </button>
                </div>
              </div>

              {/* Sandbox Error */}
              {sandbox.error && (
                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[10px] font-mono flex items-center gap-2">
                  <X className="w-3 h-3" />
                  {sandbox.error}
                </div>
              )}

              {/* Preview Content */}
              {isSandboxPreview && sandbox.previewUrl ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <iframe
                    key={previewKey}
                    className="flex-1 w-full border-none bg-white"
                    src={sandbox.previewUrl}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                  <div className="h-[250px] border-t border-white/10 shrink-0">
                    <Terminal
                      onExec={sandbox.exec}
                      disabled={!sandbox.sandboxId}
                      workDir={sandbox.WORK_DIR}
                    />
                  </div>
                </div>
              ) : isSandboxPreview && !sandbox.previewUrl ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <div>
                    <p className="text-sm font-mono text-white/70">
                      {sandbox.status === 'creating' && 'Creating sandbox...'}
                      {sandbox.status === 'syncing' && 'Syncing files...'}
                      {sandbox.status === 'installing' && 'Installing dependencies (this can take a minute)...'}
                      {sandbox.status === 'starting' && 'Starting dev server...'}
                      {sandbox.status === 'ready' && 'Getting preview URL...'}
                      {sandbox.status === 'error' && 'Setup failed'}
                      {sandbox.status === 'idle' && 'Initializing...'}
                    </p>
                    {sandbox.error && (
                      <p className="text-[10px] font-mono text-red-400 mt-2">{sandbox.error}</p>
                    )}
                  </div>
                  {/* Setup logs */}
                  {sandbox.logs.length > 0 && (
                    <div className="w-full max-w-lg max-h-[300px] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-left custom-scrollbar">
                      {sandbox.logs.map((log, i) => (
                        <div key={i} className={cn(
                          "font-mono text-[10px] py-0.5 whitespace-pre-wrap break-all",
                          log.startsWith('ERROR') ? 'text-red-400' :
                          log.startsWith('$') ? 'text-accent' :
                          log.startsWith('stderr') ? 'text-yellow-400' :
                          'text-white/50'
                        )}>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="w-full max-w-md h-[200px] border border-white/10 rounded-lg overflow-hidden">
                    <Terminal
                      onExec={sandbox.exec}
                      disabled={sandbox.status !== 'ready'}
                      workDir={sandbox.WORK_DIR}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <iframe
                    key={previewKey}
                    className="flex-1 w-full border-none"
                    srcDoc={getPreviewHtml()}
                  />
                  {/* Console Preview */}
                  <div className={cn(
                    "border-t border-white/10 bg-[#0a0a0a] flex flex-col overflow-hidden transition-all duration-300",
                    isConsoleExpanded ? "h-1/3" : "h-8"
                  )}>
                    <div
                      className="h-8 border-b border-white/5 flex items-center justify-between px-4 bg-black/50 cursor-pointer hover:bg-black/70 transition-colors"
                      onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <TerminalIcon className="w-3 h-3 text-accent" />
                        <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Console Output</span>
                        <ChevronDown className={cn("w-3 h-3 text-white/30 transition-transform duration-300", !isConsoleExpanded && "rotate-180")} />
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {consoleLogs.some(l => l.type === 'error') && (
                          <button
                            onClick={() => runDebugger()}
                            disabled={isDebuggerRunning}
                            className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[9px] font-mono font-bold hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                          >
                            <Zap className={cn("w-3 h-3", isDebuggerRunning && "animate-pulse")} />
                            RUN DEBUGGER
                          </button>
                        )}
                        <button
                          onClick={() => setConsoleLogs([])}
                          className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                          title="Clear Console"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] custom-scrollbar space-y-1">
                      {consoleLogs.length === 0 && (
                        <div className="h-full flex items-center justify-center text-white/20 italic">
                          No logs yet. Interact with the preview to see output.
                        </div>
                      )}
                      {consoleLogs.map((log, i) => (
                        <div key={i} className={cn(
                          "flex gap-2 py-0.5 px-2 rounded",
                          log.type === 'error' ? "bg-red-500/10 text-red-400" :
                          log.type === 'warn' ? "bg-yellow-500/10 text-yellow-400" :
                          "text-white/70"
                        )}>
                          <span className="opacity-30 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                          <span className="break-all">{log.message}</span>
                        </div>
                      ))}
                      <div ref={consoleEndRef} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="flex-1 flex flex-col bg-[#050505] overflow-y-auto custom-scrollbar">
              {/* Header Section */}
              <div className="border-b border-white/5 bg-[#080808]/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="px-4 md:px-8 lg:px-12 py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-mono font-bold tracking-tighter">Project Tasks</h2>
                      <p className="text-xs font-mono opacity-40 mt-1">Manage and execute your development tasks</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedTaskIds.size > 0 && (
                        <button
                          onClick={() => runTasks(tasks.filter(t => selectedTaskIds.has(t.id)))}
                          disabled={isRunningTasks}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-black font-mono text-xs font-bold hover:bg-accent/90 transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                        >
                          {isRunningTasks ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 fill-current" />
                          )}
                          Run Selected ({selectedTaskIds.size})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats Bar */}
                  {tasks.length > 0 && (
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Total</span>
                        <span className="text-sm font-mono font-bold">{tasks.length}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                        <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest">Completed</span>
                        <span className="text-sm font-mono font-bold text-green-400">{tasks.filter(t => t.completed).length}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Pending</span>
                        <span className="text-sm font-mono font-bold">{tasks.filter(t => !t.completed).length}</span>
                      </div>
                      {tasks.some(t => t.status === 'processing') && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                          <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Processing</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Task Input & List */}
              <div className="px-4 md:px-8 lg:px-12 py-6 space-y-6">
                {/* Add Task Form */}
                <form 
                  onSubmit={handleAddTask}
                  className="flex items-center gap-3 bg-[#080808] border border-white/10 rounded-xl p-2 focus-within:border-accent/50 transition-colors max-w-3xl"
                >
                  <input 
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new task..."
                    className="flex-1 bg-transparent border-none outline-none text-sm font-mono px-3 py-2 placeholder:opacity-30"
                  />
                  <button 
                    type="submit"
                    disabled={!newTaskTitle.trim() || !currentProject}
                    className="p-2.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                {/* Task List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {tasks.map(task => (
                    <div 
                      key={task.id}
                      className={cn(
                        "group flex items-center justify-between p-4 rounded-xl border transition-all",
                        task.completed 
                          ? "bg-white/[0.02] border-white/5 opacity-60" 
                          : "bg-[#080808] border-white/10 hover:border-white/20 hover:bg-white/[0.02]",
                        selectedTaskIds.has(task.id) && "border-accent/50 bg-accent/5"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button 
                          onClick={() => toggleTaskSelection(task.id)}
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                            selectedTaskIds.has(task.id)
                              ? "bg-accent border-accent text-black" 
                              : "border-white/20 hover:border-accent/50"
                          )}
                        >
                          {selectedTaskIds.has(task.id) && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        
                        <button 
                          onClick={() => toggleTask(task)}
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                            task.completed 
                              ? "bg-green-500 border-green-500 text-white" 
                              : "border-white/20 hover:border-green-500/50"
                          )}
                        >
                          {task.completed && <CheckCircle2 className="w-3 h-3" />}
                        </button>

                        <div className="flex flex-col flex-1 min-w-0">
                          <span className={cn(
                            "text-sm font-mono truncate",
                            task.completed && "line-through opacity-50"
                          )}>
                            {task.title}
                          </span>
                          {task.status && task.status !== 'pending' && (
                            <span className={cn(
                              "text-[10px] font-mono uppercase tracking-widest mt-1",
                              task.status === 'processing' && "text-accent animate-pulse",
                              task.status === 'completed' && "text-green-500",
                              task.status === 'failed' && "text-red-500"
                            )}>
                              {task.status}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {!task.completed && (
                          <button 
                            onClick={() => runTasks([task])}
                            disabled={isRunningTasks}
                            className="p-2 rounded-lg text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Run task"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-2 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {tasks.length === 0 && (
                  <div className="text-center py-16 border border-white/5 border-dashed rounded-xl max-w-2xl mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm font-mono opacity-40 mb-2">No tasks yet</p>
                    <p className="text-xs font-mono opacity-20">Add your first task above to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="flex-1 flex flex-col bg-[#050505] overflow-y-auto custom-scrollbar">
              {/* Header Section */}
              <div className="border-b border-white/5 bg-[#080808]/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="px-4 md:px-8 lg:px-12 py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-mono font-bold tracking-tighter">Agent Configuration</h2>
                      <p className="text-xs font-mono opacity-40 mt-1">Configure your AI agent team for optimal performance</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">{AGENTS.length} Agents Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agents Grid */}
              <div className="px-4 md:px-8 lg:px-12 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  {AGENTS.map(agent => {
                    const config = currentProject?.agentConfigs?.[agent.id] || { creativity: 1.0, focus: '', tools: [] };
                    const isActive = projectState.currentAgentIndex === AGENTS.indexOf(agent);
                    return (
                      <div 
                        key={agent.id} 
                        className={cn(
                          "group rounded-xl border transition-all duration-200 overflow-hidden",
                          isActive 
                            ? "bg-white/[0.06] border-white/20 shadow-lg shadow-white/5" 
                            : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        {/* Agent Header */}
                        <div className="p-5 border-b border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" 
                                style={{ backgroundColor: `${agent.color}20`, color: agent.color, border: `1px solid ${agent.color}40` }}
                              >
                                {agent.icon}
                              </div>
                              <div>
                                <h3 className="font-mono font-bold text-sm">{agent.name}</h3>
                                <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">{agent.role}</p>
                              </div>
                            </div>
                            {isActive && (
                              <motion.div 
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 border border-accent/20"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                <span className="text-[9px] font-mono text-accent uppercase tracking-widest">Active</span>
                              </motion.div>
                            )}
                          </div>
                          <p className="text-xs font-mono opacity-40 mt-3 leading-relaxed">{agent.description}</p>
                        </div>

                        {/* Configuration Section */}
                        <div className="p-5 space-y-5">
                          {/* Creativity Slider */}
                          <div>
                            <label className="flex items-center justify-between text-xs font-mono opacity-70 mb-3">
                              <span>Creativity (Temperature)</span>
                              <span className="px-2 py-0.5 rounded bg-white/5 text-accent">{config.creativity.toFixed(1)}</span>
                            </label>
                            <input 
                              type="range" 
                              min="0" max="2" step="0.1" 
                              value={config.creativity}
                              onChange={(e) => updateAgentConfig(agent.id, { creativity: parseFloat(e.target.value) })}
                              className="w-full accent-accent h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer"
                            />
                            <div className="flex justify-between mt-1">
                              <span className="text-[9px] font-mono opacity-30">Precise</span>
                              <span className="text-[9px] font-mono opacity-30">Creative</span>
                            </div>
                          </div>
                          
                          {/* Custom Instructions */}
                          <div>
                            <label className="block text-xs font-mono opacity-70 mb-2">Primary Focus / Custom Instructions</label>
                            <textarea 
                              value={config.focus}
                              onChange={(e) => updateAgentConfig(agent.id, { focus: e.target.value })}
                              placeholder="E.g., Focus on accessibility, use functional components..."
                              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-accent/50 transition-colors resize-none h-24 placeholder:opacity-20"
                            />
                          </div>

                          {/* Tools Section */}
                          <div>
                            <label className="block text-xs font-mono opacity-70 mb-3">Tools</label>
                            <div className="grid grid-cols-2 gap-2">
                              <label className={cn(
                                "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                                config.tools.includes('googleSearch') 
                                  ? "bg-accent/10 border-accent/30 text-accent" 
                                  : "bg-white/[0.02] border-white/10 hover:border-white/20"
                              )}>
                                <input 
                                  type="checkbox" 
                                  checked={config.tools.includes('googleSearch')}
                                  onChange={(e) => {
                                    const newTools = e.target.checked 
                                      ? [...config.tools, 'googleSearch'] 
                                      : config.tools.filter(t => t !== 'googleSearch');
                                    updateAgentConfig(agent.id, { tools: newTools });
                                  }}
                                  className="rounded border-white/20 bg-black/50 text-accent focus:ring-accent focus:ring-offset-0"
                                />
                                <span className="text-[10px] font-mono opacity-80">Google Search</span>
                              </label>
                              <label className={cn(
                                "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all",
                                config.tools.includes('codeExecution') 
                                  ? "bg-accent/10 border-accent/30 text-accent" 
                                  : "bg-white/[0.02] border-white/10 hover:border-white/20"
                              )}>
                                <input 
                                  type="checkbox" 
                                  checked={config.tools.includes('codeExecution')}
                                  onChange={(e) => {
                                    const newTools = e.target.checked 
                                      ? [...config.tools, 'codeExecution'] 
                                      : config.tools.filter(t => t !== 'codeExecution');
                                    updateAgentConfig(agent.id, { tools: newTools });
                                  }}
                                  className="rounded border-white/20 bg-black/50 text-accent focus:ring-accent focus:ring-offset-0"
                                />
                                <span className="text-[10px] font-mono opacity-80">Code Exec</span>
                              </label>
                            </div>
                          </div>

                          {/* Skills Section */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <label className="block text-xs font-mono opacity-70">Agent Skills</label>
                              <button 
                                onClick={() => {
                                  setEditingAgentId(agent.id);
                                  setIsSkillLibraryOpen(true);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent text-[10px] font-mono hover:bg-accent/20 transition-all"
                              >
                                <Plus className="w-3 h-3" />
                                ADD SKILL
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(config.skills || []).map(skillId => {
                                const skill = availableSkills.find(s => s.id === skillId);
                                if (!skill) return null;
                                return (
                                  <div key={skillId} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[10px] font-mono text-accent group/skill">
                                    <span>{skill.name}</span>
                                    <button onClick={() => toggleAgentSkill(agent.id, skillId)} className="opacity-50 hover:opacity-100 hover:text-white transition-all">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                              {(config.skills || []).length === 0 && (
                                <p className="text-[10px] font-mono opacity-30 italic py-2">No specific skills assigned</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* New Project Modal */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl w-full max-w-lg p-6 shadow-2xl"
            >
              <h3 className="text-lg font-mono font-bold mb-4">New Project</h3>
              <form onSubmit={submitNewProject}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Project Name</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Project Name..."
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Select Template</label>
                    <div className="grid grid-cols-1 gap-2">
                      {PROJECT_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                            selectedTemplateId === template.id 
                              ? "bg-accent/10 border-accent/50 text-accent" 
                              : "bg-white/5 border-white/10 opacity-60 hover:opacity-100 hover:bg-white/10"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center border",
                            selectedTemplateId === template.id ? "bg-accent/20 border-accent/20" : "bg-white/5 border-white/10"
                          )}>
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono font-bold">{template.name}</p>
                            <p className="text-[10px] font-mono opacity-50 truncate">{template.description}</p>
                          </div>
                          {selectedTemplateId === template.id && (
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={!newProjectName.trim()}
                    className="px-4 py-2 rounded-lg bg-accent text-black text-xs font-mono font-bold hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    CREATE PROJECT
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {isExportModalOpen && currentProject && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold flex items-center gap-2">
                  <Download className="w-5 h-5 text-accent" />
                  Export Project
                </h3>
                <button onClick={() => setIsExportModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg">
                <button
                  onClick={() => setExportTab('download')}
                  className={cn(
                    "flex-1 py-2 text-xs font-mono rounded-md transition-all flex items-center justify-center gap-2",
                    exportTab === 'download' ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
                  )}
                >
                  <Download className="w-3.5 h-3.5" />
                  ZIP Archive
                </button>
                <button
                  onClick={() => setExportTab('github')}
                  className={cn(
                    "flex-1 py-2 text-xs font-mono rounded-md transition-all flex items-center justify-center gap-2",
                    exportTab === 'github' ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
                  )}
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </button>
              </div>

              {exportStatus.type !== 'idle' && (
                <div className={cn(
                  "p-3 rounded-lg mb-6 text-xs font-mono flex items-center gap-2",
                  exportStatus.type === 'loading' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                  exportStatus.type === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  {exportStatus.type === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {exportStatus.type === 'success' && <CheckCircle2 className="w-3 h-3" />}
                  {exportStatus.type === 'error' && <X className="w-3 h-3" />}
                  {exportStatus.message}
                </div>
              )}

              {exportTab === 'download' ? (
                <div className="space-y-6">
                  <p className="text-sm font-mono opacity-70 leading-relaxed">
                    Download the entire project as a ZIP archive. This includes all generated files, components, and configurations.
                  </p>
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={() => setIsExportModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleDownloadZip}
                      disabled={exportStatus.type === 'loading' || files.length === 0}
                      className="px-4 py-2 rounded-lg bg-accent text-black text-xs font-mono font-bold hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      DOWNLOAD .ZIP
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Personal Access Token</label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_..."
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors"
                    />
                    <p className="text-[10px] font-mono opacity-40 mt-1">Needs &apos;repo&apos; scope.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Repository Name</label>
                    <input
                      type="text"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                      placeholder="my-awesome-project"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Commit Message</label>
                    <input
                      type="text"
                      value={githubCommitMsg}
                      onChange={(e) => setGithubCommitMsg(e.target.value)}
                      placeholder="Initial commit"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      onClick={() => setIsExportModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handlePushToGithub}
                      disabled={exportStatus.type === 'loading' || !githubToken || !githubRepo || !githubCommitMsg || files.length === 0}
                      className="px-4 py-2 rounded-lg bg-accent text-black text-xs font-mono font-bold hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <Github className="w-4 h-4" />
                      PUSH TO GITHUB
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && currentProject && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-mono font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-accent" />
                  Project Settings
                </h3>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {!isDeleteConfirmOpen ? (
                <form onSubmit={handleUpdateProject}>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Project Name</label>
                      <input
                        type="text"
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
                        placeholder="Project Name..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Description</label>
                      <textarea
                        value={editProjectDescription}
                        onChange={(e) => setEditProjectDescription(e.target.value)}
                        placeholder="Project Description..."
                        rows={3}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Project Type</label>
                      <div className="flex items-center gap-2 px-4 py-3 bg-black/30 border border-white/5 rounded-lg">
                        <span className="text-sm font-mono text-white/70">
                          {PROJECT_TYPES[currentProject.projectType || 'static-site']?.name || 'Static Website'}
                        </span>
                        <span className="text-[9px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded">LOCKED</span>
                      </div>
                      <p className="text-[9px] font-mono text-white/30 mt-1">Project type is set at creation to prevent agents from changing it.</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50">AI Model</label>
                        <button
                          type="button"
                          onClick={() => void loadVertexModels()}
                          disabled={isLoadingModels}
                          className="text-[10px] font-mono text-accent hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {isLoadingModels ? 'LOADING...' : 'REFRESH MODELS'}
                        </button>
                      </div>
                      <select
                        value={editAiModel}
                        onChange={(e) => setEditAiModel(e.target.value)}
                        disabled={isLoadingModels}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-60"
                      >
                        {effectiveModelOptions.length === 0 ? (
                          <option value={editAiModel || DEFAULT_AI_MODEL}>{editAiModel || DEFAULT_AI_MODEL}</option>
                        ) : (
                          effectiveModelOptions.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.displayName}
                            </option>
                          ))
                        )}
                      </select>
                      {selectedModelOption?.description && (
                        <p className="mt-2 text-[10px] font-mono opacity-40 leading-relaxed">
                          {selectedModelOption.description}
                        </p>
                      )}
                      {selectedModelOption && (selectedModelOption.inputTokenLimit || selectedModelOption.outputTokenLimit) && (
                        <p className="mt-2 text-[10px] font-mono opacity-30">
                          Input {selectedModelOption.inputTokenLimit?.toLocaleString() || 'n/a'} tokens · Output {selectedModelOption.outputTokenLimit?.toLocaleString() || 'n/a'} tokens
                        </p>
                      )}
                      {modelsError && (
                        <p className="mt-2 text-[10px] font-mono text-red-400">
                          {modelsError}
                        </p>
                      )}
                      <p className="mt-2 text-[10px] font-mono opacity-30">
                        Used by the orchestrator and debugger for this project.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50">Global Skills</label>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingAgentId(null);
                            setIsSkillLibraryOpen(true);
                          }}
                          className="text-[10px] font-mono text-accent hover:underline"
                        >
                          ADD SKILL
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(currentProject.globalSkills || []).map(skillId => {
                          const skill = availableSkills.find(s => s.id === skillId);
                          if (!skill) return null;
                          return (
                            <div key={skillId} className="flex items-center gap-2 px-2 py-1 rounded bg-accent/10 border border-accent/20 text-[10px] font-mono text-accent">
                              <span>{skill.name}</span>
                              <button type="button" onClick={() => toggleGlobalSkill(skillId)} className="hover:text-white">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                        {(currentProject.globalSkills || []).length === 0 && (
                          <p className="text-[10px] font-mono opacity-30 italic">No global skills assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      DELETE PROJECT
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsSettingsModalOpen(false)}
                        className="px-4 py-2 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all"
                      >
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        disabled={!editProjectName.trim() || !isSettingsDirty}
                        className="px-4 py-2 rounded-lg bg-accent text-black text-xs font-mono font-bold hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        SAVE CHANGES
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono leading-relaxed">
                    <p className="font-bold mb-2">⚠️ Warning: Irreversible Action</p>
                    <p>Are you absolutely sure you want to delete <strong>{currentProject.name}</strong>? This will permanently delete the project and all associated files, tasks, and messages.</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsDeleteConfirmOpen(false)}
                      className="px-4 py-2 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/5 transition-all"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProject}
                      className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-mono font-bold hover:bg-red-600 transition-all"
                    >
                      YES, DELETE PROJECT
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Skill Library Modal */}
      <AnimatePresence>
        {isSkillLibraryOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              style={{ maxWidth: '96rem' }}
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-mono font-bold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-accent" />
                    Skill Library {editingAgentId ? `(Agent: ${AGENTS.find(a => a.id === editingAgentId)?.name})` : '(Global)'}
                  </h3>
                  <p className="text-xs font-mono opacity-50">Download and assign skills to your agents</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={importFromLibrary}
                    disabled={importingSkills}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {importingSkills ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    {importingSkills ? 'IMPORTING...' : 'IMPORT FROM LIBRARY'}
                  </button>
                  <div className="flex bg-black/50 border border-white/10 rounded-lg p-1">
                    <button 
                      onClick={() => setSkillFilter('all')}
                      className={cn(
                        "px-3 py-1 rounded-md text-[10px] font-mono font-bold transition-all",
                        skillFilter === 'all' ? "bg-accent text-black" : "text-white/50 hover:text-white"
                      )}
                    >
                      ALL SKILLS
                    </button>
                    <button 
                      onClick={() => setSkillFilter('project')}
                      className={cn(
                        "px-3 py-1 rounded-md text-[10px] font-mono font-bold transition-all",
                        skillFilter === 'project' ? "bg-accent text-black" : "text-white/50 hover:text-white"
                      )}
                    >
                      PROJECT SKILLS
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search skills..."
                      value={skillSearchQuery}
                      onChange={(e) => setSkillSearchQuery(e.target.value)}
                      className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-accent/50 w-48"
                    />
                  </div>
                  <button onClick={() => setIsSkillLibraryOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {/* Category filter bar */}
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/5">
                  {['all', ...Array.from(new Set(availableSkills.map(s => s.category))).sort()].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all whitespace-nowrap",
                        categoryFilter === cat
                          ? "bg-accent text-black"
                          : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {cat === 'all' ? 'ALL CATEGORIES' : cat.toUpperCase()}
                      {cat !== 'all' && (
                        <span className="ml-1 opacity-60">
                          ({availableSkills.filter(s => s.category === cat).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {availableSkills
                    .filter(s => {
                      const matchesSearch = s.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) || 
                        s.description.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
                        s.category.toLowerCase().includes(skillSearchQuery.toLowerCase());
                      
                      const matchesFilter = skillFilter === 'all' || (currentProject?.downloadedSkills || []).includes(s.id);
                      
                      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
                      
                      return matchesSearch && matchesFilter && matchesCategory;
                    })
                    .map(skill => {
                      const isDownloaded = (currentProject?.downloadedSkills || []).includes(skill.id);
                      const isAssigned = editingAgentId 
                        ? (currentProject?.agentConfigs?.[editingAgentId]?.skills || []).includes(skill.id)
                        : (currentProject?.globalSkills || []).includes(skill.id);

                      return (
                        <div key={skill.id} className={cn(
                          "p-4 rounded-xl border transition-all space-y-3 group",
                          isDownloaded ? "bg-accent/5 border-accent/20" : "bg-white/5 border-white/10 hover:border-white/20"
                        )}>
                          <div className="flex items-start justify-between">
                            <div className={cn(
                              "p-2 rounded-lg",
                              isDownloaded ? "bg-accent/20 text-accent" : "bg-white/10 text-white/50"
                            )}>
                              <Zap className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">{skill.category}</span>
                          </div>
                          <div>
                            <h4 className="font-mono font-bold text-sm flex items-center gap-2">
                              {skill.name}
                              {isDownloaded && <CheckCircle2 className="w-3 h-3 text-accent" />}
                            </h4>
                            <p className="text-xs font-mono opacity-50 line-clamp-2 mt-1">{skill.description}</p>
                          </div>
                          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <div className="flex gap-2">
                              {!isDownloaded ? (
                                <button 
                                  onClick={() => downloadSkill(skill.id)}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-accent text-black hover:bg-accent/90 transition-all flex items-center gap-2"
                                >
                                  <Download className="w-3 h-3" />
                                  DOWNLOAD
                                </button>
                              ) : (
                                <button 
                                  onClick={() => {
                                    if (editingAgentId) {
                                      toggleAgentSkill(editingAgentId, skill.id);
                                    } else {
                                      toggleGlobalSkill(skill.id);
                                    }
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all",
                                    isAssigned
                                      ? (editingAgentId ? "bg-blue-500 text-white" : "bg-accent text-black")
                                      : "bg-white/10 text-white hover:bg-white/20"
                                  )}
                                >
                                  {isAssigned ? (editingAgentId ? "REMOVE FROM AGENT" : "REMOVE GLOBAL") : (editingAgentId ? "ADD TO AGENT" : "MAKE GLOBAL")}
                                </button>
                              )}
                            </div>
                            {isDownloaded && (
                              <div className="flex items-center gap-1 text-accent">
                                <Sparkles className="w-3 h-3" />
                                <span className="text-[10px] font-mono font-bold uppercase">Ready</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
                <button
                  onClick={() => setIsSkillLibraryOpen(false)}
                  className="px-6 py-2 rounded-lg bg-white/5 text-white text-xs font-mono font-bold hover:bg-white/10 transition-all"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 right-6 z-[100] max-w-md px-5 py-3 rounded-xl border font-mono text-sm shadow-2xl flex items-center gap-3",
              toast.type === 'success' && "bg-emerald-950/90 border-emerald-500/30 text-emerald-300",
              toast.type === 'error' && "bg-red-950/90 border-red-500/30 text-red-300",
              toast.type === 'info' && "bg-blue-950/90 border-blue-500/30 text-blue-300"
            )}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <X className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'info' && <Zap className="w-5 h-5 flex-shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
