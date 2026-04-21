import { isSupabaseConfigured, supabase } from './supabase';

type SortDirection = 'asc' | 'desc';

type Constraint =
  | { type: 'where'; field: string; op: '=='; value: unknown }
  | { type: 'orderBy'; field: string; direction: SortDirection };

type ResourceKind = 'users' | 'projects' | 'files' | 'tasks' | 'messages' | 'skills';

type ResourceConfig = {
  kind: ResourceKind;
  table: string;
  filters: Record<string, unknown>;
  onConflict: string;
};

type CollectionReference = {
  path: string;
};

type DocumentReference = {
  path: string;
};

type QueryReference = CollectionReference & {
  constraints: Constraint[];
};

type SnapshotDoc = {
  id: string;
  data: () => any;
};

type QuerySnapshot = {
  docs: SnapshotDoc[];
};

export const Timestamp = {
  now: () => new Date(),
};

export function collection(_db: unknown, path: string): CollectionReference {
  return { path };
}

export function doc(_db: unknown, path: string, id?: string): DocumentReference {
  return { path: id ? `${path}/${id}` : path };
}

export function where(field: string, op: '==', value: unknown): Constraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: SortDirection = 'asc'): Constraint {
  return { type: 'orderBy', field, direction };
}

export function query(
  ref: CollectionReference,
  ...constraints: Constraint[]
): QueryReference {
  return { ...ref, constraints };
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();

  const maybeTimestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof maybeTimestamp.toDate === 'function') {
    return maybeTimestamp.toDate().toISOString();
  }

  const seconds = maybeTimestamp.seconds ?? maybeTimestamp._seconds;
  if (typeof seconds === 'number') {
    return new Date(seconds * 1000).toISOString();
  }

  return null;
}

function omitUndefined<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined),
  ) as T;
}

function mapField(field: string) {
  const fieldMap: Record<string, string> = {
    ownerId: 'owner_id',
    projectId: 'project_id',
    createdAt: 'created_at',
    lastModified: 'last_modified',
    aiModel: 'ai_model',
    agentConfigs: 'agent_configs',
    globalSkills: 'global_skills',
    downloadedSkills: 'downloaded_skills',
    displayName: 'display_name',
    photoURL: 'photo_url',
    emailVerified: 'email_verified',
    imageUrl: 'image_url',
    isDebuggerProposal: 'is_debugger_proposal',
  };

  return fieldMap[field] || field;
}

function resolveCollection(path: string): ResourceConfig {
  if (path === 'users') {
    return { kind: 'users', table: 'users', filters: {}, onConflict: 'id' };
  }

  if (path === 'projects') {
    return { kind: 'projects', table: 'projects', filters: {}, onConflict: 'id' };
  }

  if (path === 'availableSkills') {
    return { kind: 'skills', table: 'available_skills', filters: {}, onConflict: 'id' };
  }

  const nested = path.match(/^projects\/([^/]+)\/(files|tasks|messages)$/);
  if (nested) {
    const [, projectId, collectionName] = nested;
    const tableByCollection = {
      files: 'project_files',
      tasks: 'project_tasks',
      messages: 'project_messages',
    } as const;

    return {
      kind: collectionName as ResourceKind,
      table: tableByCollection[collectionName as keyof typeof tableByCollection],
      filters: { project_id: projectId },
      onConflict: 'project_id,id',
    };
  }

  throw new Error(`Unsupported Supabase collection path: ${path}`);
}

function resolveDocument(path: string): ResourceConfig {
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 2 && parts[0] === 'users') {
    return { kind: 'users', table: 'users', filters: { id: parts[1] }, onConflict: 'id' };
  }

  if (parts.length === 2 && parts[0] === 'projects') {
    return { kind: 'projects', table: 'projects', filters: { id: parts[1] }, onConflict: 'id' };
  }

  if (parts.length === 2 && parts[0] === 'availableSkills') {
    return { kind: 'skills', table: 'available_skills', filters: { id: parts[1] }, onConflict: 'id' };
  }

  if (parts.length === 4 && parts[0] === 'projects') {
    const [, projectId, collectionName, id] = parts;
    const tableByCollection = {
      files: 'project_files',
      tasks: 'project_tasks',
      messages: 'project_messages',
    } as const;

    if (collectionName in tableByCollection) {
      return {
        kind: collectionName as ResourceKind,
        table: tableByCollection[collectionName as keyof typeof tableByCollection],
        filters: { project_id: projectId, id },
        onConflict: 'project_id,id',
      };
    }
  }

  throw new Error(`Unsupported Supabase document path: ${path}`);
}

function rowToData(kind: ResourceKind, row: Record<string, any>) {
  switch (kind) {
    case 'users':
      return {
        uid: row.id,
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        photoURL: row.photo_url,
        emailVerified: row.email_verified,
        role: row.role,
        createdAt: row.created_at,
      };
    case 'projects':
      return {
        id: row.id,
        ownerId: row.owner_id,
        name: row.name,
        description: row.description,
        projectType: row.project_type,
        createdAt: row.created_at,
        lastModified: row.last_modified,
        aiModel: row.ai_model,
        agentConfigs: row.agent_configs,
        globalSkills: row.global_skills,
        downloadedSkills: row.downloaded_skills,
      };
    case 'files':
      return {
        id: row.id,
        projectId: row.project_id,
        path: row.path,
        content: row.content,
        language: row.language,
        lastModified: row.last_modified,
      };
    case 'tasks':
      return {
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        completed: row.completed,
        createdAt: row.created_at,
        status: row.status,
      };
    case 'messages':
      return {
        id: row.id,
        projectId: row.project_id,
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
        imageUrl: row.image_url,
        attachments: row.attachments,
        isDebuggerProposal: row.is_debugger_proposal,
      };
    case 'skills':
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        content: row.content,
        category: row.category,
      };
    default:
      return row;
  }
}

function dataToRow(
  kind: ResourceKind,
  data: Record<string, any>,
  filters: Record<string, unknown>,
) {
  switch (kind) {
    case 'users':
      return omitUndefined({
        id: filters.id ?? data.id ?? data.uid,
        email: data.email ?? null,
        display_name: data.displayName ?? data.display_name ?? null,
        photo_url: data.photoURL ?? data.photo_url ?? null,
        email_verified: data.emailVerified ?? data.email_verified,
        role: data.role,
        created_at: toIsoDate(data.createdAt),
        updated_at: new Date().toISOString(),
      });
    case 'projects':
      return omitUndefined({
        id: filters.id ?? data.id,
        owner_id: data.ownerId ?? data.owner_id,
        name: data.name,
        description: data.description ?? '',
        project_type: data.projectType ?? data.project_type,
        created_at: toIsoDate(data.createdAt),
        last_modified: toIsoDate(data.lastModified),
        ai_model: data.aiModel ?? data.ai_model,
        agent_configs: data.agentConfigs ?? data.agent_configs,
        global_skills: data.globalSkills ?? data.global_skills,
        downloaded_skills: data.downloadedSkills ?? data.downloaded_skills,
      });
    case 'files':
      return omitUndefined({
        id: filters.id ?? data.id,
        project_id: filters.project_id ?? data.projectId ?? data.project_id,
        path: data.path,
        content: data.content,
        language: data.language,
        last_modified: toIsoDate(data.lastModified),
      });
    case 'tasks':
      return omitUndefined({
        id: filters.id ?? data.id,
        project_id: filters.project_id ?? data.projectId ?? data.project_id,
        title: data.title,
        completed: data.completed,
        created_at: toIsoDate(data.createdAt),
        status: data.status,
      });
    case 'messages':
      return omitUndefined({
        id: filters.id ?? data.id,
        project_id: filters.project_id ?? data.projectId ?? data.project_id,
        role: data.role,
        content: data.content,
        timestamp: toIsoDate(data.timestamp),
        image_url: data.imageUrl ?? data.image_url,
        attachments: data.attachments,
        is_debugger_proposal: data.isDebuggerProposal ?? data.is_debugger_proposal,
      });
    case 'skills':
      return omitUndefined({
        id: filters.id ?? data.id,
        name: data.name,
        description: data.description,
        content: data.content,
        category: data.category,
      });
    default:
      return data;
  }
}

function makeSnapshot(kind: ResourceKind, rows: Record<string, any>[] = []): QuerySnapshot {
  return {
    docs: rows.map((row) => ({
      id: String(row.id),
      data: () => rowToData(kind, row),
    })),
  };
}

function applyQueryFilters(
  request: any,
  filters: Record<string, unknown>,
  constraints: Constraint[],
) {
  let nextRequest = request;

  for (const [field, value] of Object.entries(filters)) {
    nextRequest = nextRequest.eq(field, value);
  }

  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      nextRequest = nextRequest.eq(mapField(constraint.field), constraint.value);
    }
  }

  const orderConstraint = constraints.find((constraint) => constraint.type === 'orderBy');
  if (orderConstraint?.type === 'orderBy') {
    nextRequest = nextRequest.order(mapField(orderConstraint.field), {
      ascending: orderConstraint.direction !== 'desc',
    });
  }

  return nextRequest;
}

function realtimeFilter(filters: Record<string, unknown>, constraints: Constraint[]) {
  const eqFilters: Record<string, unknown> = { ...filters };

  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      eqFilters[mapField(constraint.field)] = constraint.value;
    }
  }

  const [field, value] = Object.entries(eqFilters)[0] || [];
  return field && value !== undefined ? `${field}=eq.${value}` : undefined;
}

async function loadCollectionSnapshot(ref: QueryReference | CollectionReference) {
  const config = resolveCollection(ref.path);
  const constraints = 'constraints' in ref ? ref.constraints : [];
  const request = applyQueryFilters(
    supabase.from(config.table).select('*'),
    config.filters,
    constraints,
  );

  const { data, error } = await request;
  if (error) throw error;

  return makeSnapshot(config.kind, data || []);
}

export async function getDocs(ref: QueryReference | CollectionReference) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  return loadCollectionSnapshot(ref);
}

export async function getDoc(ref: DocumentReference) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const config = resolveDocument(ref.path);
  let request = supabase.from(config.table).select('*');

  for (const [field, value] of Object.entries(config.filters)) {
    request = request.eq(field, value);
  }

  const { data, error } = await request.maybeSingle();
  if (error) throw error;

  return {
    exists: () => Boolean(data),
    data: () => (data ? rowToData(config.kind, data) : undefined),
  };
}

export async function setDoc(
  ref: DocumentReference,
  data: Record<string, any>,
  _options?: { merge?: boolean },
) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const config = resolveDocument(ref.path);
  const row = dataToRow(config.kind, data, config.filters);
  const { error } = await supabase
    .from(config.table)
    .upsert(row, { onConflict: config.onConflict });

  if (error) throw error;
}

export async function updateDoc(ref: DocumentReference, data: Record<string, any>) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const config = resolveDocument(ref.path);
  const row = dataToRow(config.kind, data, config.filters);
  let request = supabase.from(config.table).update(row);

  for (const [field, value] of Object.entries(config.filters)) {
    request = request.eq(field, value);
  }

  const { error } = await request;
  if (error) throw error;
}

export async function deleteDoc(ref: DocumentReference) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const config = resolveDocument(ref.path);
  let request = supabase.from(config.table).delete();

  for (const [field, value] of Object.entries(config.filters)) {
    request = request.eq(field, value);
  }

  const { error } = await request;
  if (error) throw error;
}

export function onSnapshot(
  ref: QueryReference | CollectionReference,
  next: (snapshot: QuerySnapshot) => void,
  onError?: (error: unknown) => void,
) {
  if (!isSupabaseConfigured) {
    queueMicrotask(() => onError?.(new Error('Supabase is not configured.')));
    return () => {};
  }

  const config = resolveCollection(ref.path);
  const constraints = 'constraints' in ref ? ref.constraints : [];
  let isActive = true;

  const load = async () => {
    try {
      const snapshot = await loadCollectionSnapshot(ref);
      if (isActive) next(snapshot);
    } catch (error) {
      if (isActive) onError?.(error);
    }
  };

  void load();

  const channel = supabase
    .channel(`agenticdev:${config.table}:${ref.path}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: config.table,
        filter: realtimeFilter(config.filters, constraints),
      },
      () => {
        void load();
      },
    )
    .subscribe();

  return () => {
    isActive = false;
    void supabase.removeChannel(channel);
  };
}
