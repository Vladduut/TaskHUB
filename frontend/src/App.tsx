import { useEffect, useMemo, useState } from "react";
import { api } from "./api/api";

type User = { id: string; email: string; name: string };
type Project = { id: string; name: string; createdAt: string; userId: string };

type Task = {
  id: string;
  title: string;
  projectId: string;
  createdAt: string;

  // UI standardized:
  done: boolean;

  // possible backend fields:
  completed?: boolean;
  isDone?: boolean;
  isCompleted?: boolean;
};

type Filter = "toate" | "active" | "bifate";
type SortKey = "az" | "za" | "noi" | "vechi";

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function pickDone(t: any): boolean {
  if (typeof t?.done === "boolean") return t.done;
  if (typeof t?.completed === "boolean") return t.completed;
  if (typeof t?.isDone === "boolean") return t.isDone;
  if (typeof t?.isCompleted === "boolean") return t.isCompleted;
  return false;
}

function normalizeTask(raw: any): Task {
  return {
    id: raw.id,
    title: raw.title,
    projectId: raw.projectId,
    createdAt: raw.createdAt,
    done: pickDone(raw),
    completed: raw.completed,
    isDone: raw.isDone,
    isCompleted: raw.isCompleted,
  };
}

export default function App() {
  // Auth
  // ✅ NU mai precompletam default email/parola: sunt goale by default
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});

  // UI
  const [newProjectName, setNewProjectName] = useState("");
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});
  const [filterByProject, setFilterByProject] = useState<Record<string, Filter>>({});
  const [sortByProject, setSortByProject] = useState<Record<string, SortKey>>({});
  const [loading, setLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "ok" | "bad" } | null>(null);
  const showToast = (text: string, type: "ok" | "bad" = "ok") => {
    setToast({ text, type });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 2200);
  };

  // ---------- AUTH ----------
  const login = async () => {
    const e = email.trim();
    if (!e) return showToast("Completează email-ul 🙂", "bad");
    if (!password) return showToast("Completează parola 🙂", "bad");

    setLoading(true);
    try {
      await api.post("/auth/login", { email: e, password });
      const me = await api.get("/auth/me");
      setUser(me.data.user);
      showToast("Login reușit ✅", "ok");
    } catch (err) {
      console.error(err);
      showToast("Login eșuat ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      setProjects([]);
      setTasksByProject({});
      setTaskInputs({});
      setFilterByProject({});
      setSortByProject({});
      setLoading(false);
      showToast("Logout ✅", "ok");
    }
  };

  const register = async () => {
    const name = registerName.trim();
    const e = registerEmail.trim();
    if (!name) return showToast("Completează numele 🙂", "bad");
    if (!e) return showToast("Completează email-ul 🙂", "bad");
    if (!registerPassword) return showToast("Completează parola 🙂", "bad");

    setLoading(true);
    try {
      await api.post("/auth/register", { name, email: e, password: registerPassword });
      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setEmail(e);
      setPassword("");
      showToast("Cont creat ✅ Te poți loga.", "ok");
    } catch (err) {
      console.error(err);
      showToast("Nu pot crea contul ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  // ---------- PROJECTS ----------
  const loadProjects = async () => {
    const res = await api.get<Project[]>("/projects");
    setProjects(res.data);

    setFilterByProject((prev) => {
      const next = { ...prev };
      for (const p of res.data) if (!next[p.id]) next[p.id] = "toate";
      return next;
    });

    setSortByProject((prev) => {
      const next = { ...prev };
      for (const p of res.data) if (!next[p.id]) next[p.id] = "noi";
      return next;
    });
  };

  const createProject = async () => {
    const name = newProjectName.trim();
    if (!name) return showToast("Scrie un nume de proiect 🙂", "bad");

    setLoading(true);
    try {
      const res = await api.post<Project>("/projects", { name });
      setNewProjectName("");
      setProjects((prev) => [res.data, ...prev]);
      showToast("Proiect creat ✅", "ok");
    } catch (err) {
      console.error(err);
      showToast("Nu pot crea proiectul ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  const renameProject = async (projectId: string) => {
    const current = projects.find((p) => p.id === projectId);
    const name = window.prompt("Nume nou proiect:", current?.name ?? "");
    if (!name || !name.trim()) return;

    setLoading(true);
    try {
      const res = await api.put<Project>(`/projects/${projectId}`, { name: name.trim() });
      setProjects((prev) => prev.map((p) => (p.id === projectId ? res.data : p)));
      showToast("Proiect redenumit ✅", "ok");
    } catch (err) {
      console.error(err);
      showToast("Nu pot redenumi proiectul ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    const ok = window.confirm("Sigur vrei să ștergi proiectul? (se șterg și task-urile)");
    if (!ok) return;

    setLoading(true);
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setTasksByProject((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
      showToast("Proiect șters ✅", "ok");
    } catch (err) {
      console.error(err);
      showToast("Nu pot șterge proiectul ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  // ---------- TASKS ----------
  const loadTasks = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await api.get<any[]>("/tasks", { params: { projectId } });
      const normalized = (res.data ?? []).map(normalizeTask);
      setTasksByProject((prev) => ({ ...prev, [projectId]: normalized }));
    } catch (err) {
      console.error(err);
      showToast("Nu pot încărca task-urile ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (projectId: string) => {
    const title = (taskInputs[projectId] ?? "").trim();
    if (!title) return showToast("Scrie un titlu de task 🙂", "bad");

    setLoading(true);
    try {
      const res = await api.post<any>("/tasks", { title, projectId });
      const created = normalizeTask(res.data);
      setTaskInputs((prev) => ({ ...prev, [projectId]: "" }));
      setTasksByProject((prev) => ({
        ...prev,
        [projectId]: [created, ...(prev[projectId] ?? [])],
      }));
      showToast("Task creat ✅", "ok");
    } catch (err) {
      console.error(err);
      showToast("Nu pot crea task-ul ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  // ✅ IMPORTANT: PUT /tasks/{id} fara body (asa e endpointul tau in Swagger)
  const toggleTask = async (projectId: string, task: Task) => {
    setLoading(true);
    try {
      // fara body:
      const res = await api.put<any>(`/tasks/${task.id}`);
      const updated = normalizeTask(res.data);

      setTasksByProject((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] ?? []).map((t) => (t.id === task.id ? updated : t)),
      }));

      showToast(updated.done ? "Task bifat ✅" : "Task debifat ✅", "ok");
    } catch (err) {
      console.error(err);
      showToast("Nu pot modifica task-ul ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    setLoading(true);
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasksByProject((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] ?? []).filter((t) => t.id !== taskId),
      }));
      showToast("Task șters ✅", "ok");
    } catch (err) {
      console.error(err);
      showToast("Nu pot șterge task-ul ❌", "bad");
    } finally {
      setLoading(false);
    }
  };

  // ---------- AUTO LOAD AFTER LOGIN ----------
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        await loadProjects();
      } catch (err) {
        console.error(err);
        showToast("Nu pot încărca proiectele ❌", "bad");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ---------- HELPERS UI ----------
  const tasksForProject = (projectId: string) => tasksByProject[projectId] ?? [];

  const computeVisibleTasks = (projectId: string) => {
    const tasks = tasksForProject(projectId);
    const filter = filterByProject[projectId] ?? "toate";
    const sort = sortByProject[projectId] ?? "noi";

    let list = tasks.slice();

    if (filter === "active") list = list.filter((t) => !t.done);
    if (filter === "bifate") list = list.filter((t) => t.done);

    list.sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "za") return b.title.localeCompare(a.title);
      if (sort === "noi") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return list;
  };

  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalTasks = Object.values(tasksByProject).reduce((acc, arr) => acc + arr.length, 0);
    return { totalProjects, totalTasks };
  }, [projects.length, tasksByProject]);

  // ---------- UI ----------
  return (
    <div className="min-h-screen text-[var(--text)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(20,184,166,0.65),transparent_60%)] blur-3xl opacity-70 float-slow" />
        <div className="absolute -bottom-28 -right-16 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(251,191,36,0.55),transparent_60%)] blur-3xl opacity-60 float-slower" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_0%,rgba(15,23,42,0.65),transparent),radial-gradient(900px_500px_at_90%_10%,rgba(2,6,23,0.85),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              TaskHub • Full-Stack demo
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              TaskHub <span className="text-emerald-300/90">Dashboard</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-300">
              Gestionare proiecte și task-uri (cookie JWT).{" "}
              {user ? (
                <>
                  Ești logat ca: <span className="font-semibold">{user.name}</span>{" "}
                  <span className="text-zinc-400">({user.email})</span>
                </>
              ) : (
                <>Autentifică-te pentru a continua.</>
              )}
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <button
                onClick={logout}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-60"
              >
                <svg
                  className="icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>

        {!user ? (
          <div className="grid gap-6 md:grid-cols-2 fade-up">
            <div className="space-y-6">
              <div className="panel p-6">
                <h2 className="text-lg font-semibold">Login</h2>
                <p className="mt-1 text-sm text-zinc-300">Intră cu un cont existent.</p>

                <div className="mt-5 space-y-3">
                  <div>
                    <label className="text-xs text-zinc-300">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ex: nume@exemplu.com"
                      autoComplete="off"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-400/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300">Parola</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-400/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") login();
                      }}
                    />
                  </div>

                  <button
                    onClick={login}
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:from-emerald-300 hover:to-teal-400 disabled:opacity-60"
                  >
                    <svg
                      className="icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 18l6-6-6-6" />
                      <path d="M15 12H3" />
                      <path d="M21 4v16" />
                    </svg>
                    {loading ? "Se loghează..." : "Login"}
                  </button>

                  <div className="pt-2 text-xs text-zinc-400">
                    Tip: poți apăsa <span className="text-zinc-200">Enter</span> în câmpul de parolă ca să te loghezi.
                  </div>
                </div>
              </div>

              <div className="panel p-6">
                <h2 className="text-lg font-semibold">Creează cont</h2>
                <p className="mt-1 text-sm text-zinc-300">Nu ai cont? Completează datele de mai jos.</p>

                <div className="mt-5 space-y-3">
                  <div>
                    <label className="text-xs text-zinc-300">Nume</label>
                    <input
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="ex: Popescu Ion"
                      autoComplete="name"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-400/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300">Email</label>
                    <input
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="ex: nume@exemplu.com"
                      autoComplete="email"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-400/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300">Parola</label>
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="minim 4 caractere"
                      autoComplete="new-password"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-400/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") register();
                      }}
                    />
                  </div>

                  <button
                    onClick={register}
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:from-amber-200 hover:to-orange-300 disabled:opacity-60"
                  >
                    <svg
                      className="icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                    {loading ? "Se creează..." : "Creează cont"}
                  </button>
                </div>
              </div>
            </div>

            <div className="panel p-6 text-sm text-zinc-300">
              <h2 className="text-lg font-semibold text-zinc-100">Info utile</h2>

              <div className="mt-3 space-y-4">
                <div className="panel-soft p-4">
                  <div className="font-semibold text-zinc-100">Ce poți face în aplicație</div>
                  <ul className="mt-2 list-disc space-y-2 pl-5">
                    <li>Creezi, redenumești și ștergi proiecte.</li>
                    <li>Adaugi task-uri pe proiect și le marchezi ca „bifate/nebifate”.</li>
                    <li>Filtrezi task-urile (Toate / Active / Bifate) și sortezi (A–Z, Z–A, Noi–Vechi).</li>
                  </ul>
                </div>

                <div className="panel-soft p-4">
                  <div className="font-semibold text-zinc-100">Autentificare & sesiune</div>
                  <ul className="mt-2 list-disc space-y-2 pl-5">
                    <li>Login-ul folosește cookie (JWT) – rămâi autentificat(ă) până la logout sau expirarea cookie-ului.</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[360px_1fr] fade-up">
            <div className="panel p-6">
              <h2 className="text-lg font-semibold">Cont</h2>
              <p className="mt-1 text-sm text-zinc-300">
                Autentificare cu cookie (JWT). API:{" "}
                <span className="font-semibold text-zinc-200">localhost:3000</span>
              </p>

              <div className="mt-5 panel-soft p-4">
                <div className="text-xs text-zinc-400">Logat ca</div>
                <div className="mt-1 font-semibold">{user.name}</div>
                <div className="text-sm text-zinc-300">{user.email}</div>
              </div>

              <div className="mt-5 panel-soft p-4">
                <div className="mb-2 font-semibold">Creează proiect</div>
                <div className="flex gap-2">
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nume proiect..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-400/40"
                  />
                  <button
                    onClick={createProject}
                    disabled={loading}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:from-emerald-200 hover:to-teal-300 disabled:opacity-60"
                  >
                    <svg
                      className="icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 7h6l2 2h8v8a2 2 0 0 1-2 2H4z" />
                      <path d="M12 12v6" />
                      <path d="M9 15h6" />
                    </svg>
                    Creează
                  </button>
                </div>
              </div>

              <div className="mt-5 text-xs text-zinc-400">
                Proiecte: <span className="text-zinc-200">{stats.totalProjects}</span> • Task-uri încărcate:{" "}
                <span className="text-zinc-200">{stats.totalTasks}</span>
              </div>
            </div>

            <div className="panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Proiecte</h2>
                  <p className="mt-1 text-sm text-zinc-300">Creează, redenumește, șterge și gestionează task-uri.</p>
                </div>
                <div className="text-sm text-zinc-300">{projects.length} proiect(e)</div>
              </div>

              <div className="mt-5 space-y-5">
                {projects.map((p) => {
                  const tasks = tasksForProject(p.id);
                  const visible = computeVisibleTasks(p.id);
                  const activeCount = tasks.filter((t) => !t.done).length;
                  const doneCount = tasks.filter((t) => t.done).length;

                  return (
                    <div key={p.id} className="panel-soft p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-base font-semibold">{p.name}</div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300">
                              {tasks.length} task-uri
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-zinc-400">
                            {activeCount} active • {doneCount} bifate • Creat: {formatDate(p.createdAt)}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => renameProject(p.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
                          >
                            <svg
                              className="icon"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                            Redenumește
                          </button>
                          <button
                            onClick={() => deleteProject(p.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                          >
                            <svg
                              className="icon"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                            </svg>
                            Șterge proiect
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          value={taskInputs[p.id] ?? ""}
                          onChange={(e) => setTaskInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Titlu task..."
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-400/40"
                        />
                        <button
                          onClick={() => createTask(p.id)}
                          disabled={loading}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                        >
                          <svg
                            className="icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                          Adaugă
                        </button>
                      </div>

                      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                          {(["toate", "active", "bifate"] as Filter[]).map((f) => (
                            <button
                              key={f}
                              onClick={() => setFilterByProject((prev) => ({ ...prev, [p.id]: f }))}
                              className={cx(
                                "chip rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                                (filterByProject[p.id] ?? "toate") === f
                                  ? "chip-active"
                                  : "chip-muted border-white/10 text-zinc-300 hover:bg-white/10"
                              )}
                            >
                              {f === "toate" ? "Toate" : f === "active" ? "Active" : "Bifate"}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                          <span className="text-zinc-400">Sort:</span>
                          <select
                            value={sortByProject[p.id] ?? "noi"}
                            onChange={(e) =>
                              setSortByProject((prev) => ({ ...prev, [p.id]: e.target.value as SortKey }))
                            }
                            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
                          >
                            <option value="az">A → Z</option>
                            <option value="za">Z → A</option>
                            <option value="noi">Noi → vechi</option>
                            <option value="vechi">Vechi → noi</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {visible.length === 0 ? (
                          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
                            Nu sunt task-uri pentru acest filtru. Creează unul nou.
                          </div>
                        ) : (
                          visible.map((t) => (
                            <div
                              key={t.id}
                              className={cx(
                                "task-card flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-3 md:flex-row md:items-center md:justify-between",
                                t.done && "task-done"
                              )}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className={cx("font-semibold", t.done && "text-zinc-400 line-through")}>
                                    {t.title}
                                  </div>
                                  <span
                                    className={cx(
                                      "task-badge rounded-full border px-2 py-0.5 text-xs",
                                      t.done
                                        ? "badge-done border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                        : "border-white/10 bg-white/5 text-zinc-300"
                                    )}
                                  >
                                    {t.done ? "bifat" : "nebifat"}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-zinc-500">ID: {t.id}</div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleTask(p.id, t)}
                                  disabled={loading}
                                  className={cx(
                                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60",
                                    t.done
                                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                                      : "border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25"
                                  )}
                                >
                                  <svg
                                    className="icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                  {t.done ? "Debifează" : "Bifează"}
                                </button>
                                <button
                                  onClick={() => deleteTask(p.id, t.id)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                                >
                                  <svg
                                    className="icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4h8v2" />
                                    <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                                  </svg>
                                  Șterge
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div
              className={cx(
                "rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl",
                toast.type === "ok"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-400/30 bg-rose-500/10 text-rose-100"
              )}
            >
              {toast.text}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
