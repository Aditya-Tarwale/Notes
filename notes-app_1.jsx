import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = [
  { name: "default", bg: "#ffffff", dark: "#2d2d2d", label: "Default" },
  { name: "red", bg: "#f28b82", dark: "#8b2018", label: "Tomato" },
  { name: "orange", bg: "#fbbc04", dark: "#7a4500", label: "Tangerine" },
  { name: "yellow", bg: "#fff475", dark: "#726000", label: "Banana" },
  { name: "green", bg: "#ccff90", dark: "#2d5a00", label: "Sage" },
  { name: "teal", bg: "#a8f0e3", dark: "#00504a", label: "Teal" },
  { name: "blue", bg: "#cbf0f8", dark: "#004d63", label: "Sky" },
  { name: "navy", bg: "#aecbfa", dark: "#1a3a6b", label: "Denim" },
  { name: "purple", bg: "#d7aefb", dark: "#4a0072", label: "Grape" },
  { name: "pink", bg: "#fdcfe8", dark: "#7a0043", label: "Flamingo" },
  { name: "brown", bg: "#e6c9a8", dark: "#5d4037", label: "Sand" },
  { name: "gray", bg: "#e8eaed", dark: "#3c4043", label: "Graphite" },
];

const LABELS = ["Work", "Personal", "Ideas", "Shopping", "Goals", "Travel"];

const generateId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const initialNotes = [
  {
    id: generateId(), title: "Welcome to NoteFlow!", content: "Your beautiful notes app. Click anywhere to create a new note.",
    color: "blue", pinned: true, archived: false, labels: [], createdAt: Date.now() - 80000, todos: [],
  },
  {
    id: generateId(), title: "Grocery List", content: "",
    color: "green", pinned: false, archived: false, labels: ["Shopping"], createdAt: Date.now() - 50000,
    todos: [
      { id: generateId(), text: "Organic milk", done: true },
      { id: generateId(), text: "Sourdough bread", done: false },
      { id: generateId(), text: "Cherry tomatoes", done: false },
      { id: generateId(), text: "Fresh basil", done: false },
    ],
  },
  {
    id: generateId(), title: "2024 Goals", content: "Read 24 books\nLearn a new language\nRun a 5K\nMeditate daily",
    color: "purple", pinned: true, archived: false, labels: ["Goals", "Personal"], createdAt: Date.now() - 30000, todos: [],
  },
  {
    id: generateId(), title: "Trip to Kyoto", content: "Spring 2025 — Cherry blossom season. Book ryokan in Gion district. Visit Fushimi Inari at sunrise.",
    color: "orange", pinned: false, archived: false, labels: ["Travel"], createdAt: Date.now() - 10000, todos: [],
  },
];

export default function NotesApp() {
  const [notes, setNotes] = useState(() => {
    try { const s = localStorage.getItem("noteflow_notes"); return s ? JSON.parse(s) : initialNotes; } catch { return initialNotes; }
  });
  const [view, setView] = useState("notes"); // notes | archive | label:X
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState("masonry"); // masonry | list
  const [editNote, setEditNote] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "", color: "default", labels: [], todos: [], isTodo: false });
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuNote, setMenuNote] = useState(null);
  const createRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("noteflow_notes", JSON.stringify(notes)); } catch {}
  }, [notes]);

  const addNote = () => {
    if (!newNote.title.trim() && !newNote.content.trim() && !newNote.todos.length) { setCreating(false); return; }
    const n = { ...newNote, id: generateId(), pinned: false, archived: false, createdAt: Date.now() };
    setNotes(p => [n, ...p]);
    setNewNote({ title: "", content: "", color: "default", labels: [], todos: [], isTodo: false });
    setCreating(false);
  };

  const updateNote = (id, changes) => setNotes(p => p.map(n => n.id === id ? { ...n, ...changes } : n));
  const deleteNote = (id) => { setNotes(p => p.filter(n => n.id !== id)); if (editNote?.id === id) setEditNote(null); };
  const togglePin = (id) => updateNote(id, { pinned: !notes.find(n => n.id === id)?.pinned });
  const toggleArchive = (id) => { updateNote(id, { archived: !notes.find(n => n.id === id)?.archived }); if (editNote?.id === id) setEditNote(null); };

  const enhanceWithAI = async (note) => {
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Improve this note. Make it clearer, more organized and polished. Keep the same core ideas. Return ONLY the improved content as plain text, no explanation.\n\nTitle: ${note.title}\nContent: ${note.content || note.todos?.map(t => t.text).join("\n") || ""}`,
          }],
        }),
      });
      const data = await res.json();
      const improved = data.content?.[0]?.text || "";
      if (improved) updateNote(note.id, { content: improved });
    } catch {}
    setAiLoading(false);
  };

  const filteredNotes = notes.filter(n => {
    if (view === "archive") return n.archived;
    if (view.startsWith("label:")) return !n.archived && n.labels?.includes(view.slice(6));
    return !n.archived;
  }).filter(n => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || n.todos?.some(t => t.text.toLowerCase().includes(q));
  });

  const pinned = filteredNotes.filter(n => n.pinned);
  const unpinned = filteredNotes.filter(n => !n.pinned);

  const getColor = (name) => COLORS.find(c => c.name === name) || COLORS[0];

  const noteColor = (name) => {
    const c = getColor(name);
    return { backgroundColor: c.bg, borderColor: c.bg === "#ffffff" ? "#e0e0e0" : c.bg };
  };

  const labelCounts = LABELS.reduce((acc, l) => {
    acc[l] = notes.filter(n => !n.archived && n.labels?.includes(l)).length;
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: "'Google Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --yellow: #fbbc04; --green: #34a853; --blue: #4285f4; --red: #ea4335; }
        .note-card { border-radius: 8px; border: 1px solid; transition: box-shadow 0.15s, transform 0.1s; cursor: pointer; position: relative; overflow: hidden; }
        .note-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .note-actions { opacity: 0; transition: opacity 0.15s; position: absolute; bottom: 6px; right: 6px; display: flex; gap: 2px; }
        .note-card:hover .note-actions { opacity: 1; }
        .icon-btn { background: none; border: none; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: background 0.1s; color: #5f6368; }
        .icon-btn:hover { background: rgba(0,0,0,0.08); }
        .pin-btn { position: absolute; top: 6px; right: 6px; opacity: 0; }
        .note-card:hover .pin-btn, .pin-btn.pinned { opacity: 1; }
        .search-bar { background: white; border: none; outline: none; font-size: 16px; width: 100%; font-family: inherit; }
        .create-area { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 12px 16px; transition: box-shadow 0.2s; }
        .create-area:focus-within { box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
        .note-input { border: none; outline: none; width: 100%; font-size: 15px; font-family: inherit; background: transparent; resize: none; }
        .color-dot { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: transform 0.1s, border-color 0.1s; }
        .color-dot:hover, .color-dot.selected { border-color: #5f6368; transform: scale(1.15); }
        .label-chip { font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(0,0,0,0.07); color: #5f6368; display: inline-flex; align-items: center; gap: 4px; }
        .sidebar-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 0 24px 24px 0; cursor: pointer; font-size: 14px; color: #202124; transition: background 0.1s; margin-right: 12px; }
        .sidebar-item:hover { background: rgba(0,0,0,0.06); }
        .sidebar-item.active { background: #feefc3; font-weight: 500; }
        .todo-item { display: flex; align-items: flex-start; gap: 8px; padding: 2px 0; }
        .todo-checkbox { width: 16px; height: 16px; cursor: pointer; margin-top: 1px; flex-shrink: 0; accent-color: #5f6368; }
        .masonry { columns: 4; column-gap: 12px; }
        .masonry .note-card { break-inside: avoid; margin-bottom: 12px; display: block; }
        @media (max-width: 1200px) { .masonry { columns: 3; } }
        @media (max-width: 860px) { .masonry { columns: 2; } }
        @media (max-width: 560px) { .masonry { columns: 1; } }
        .list-layout { display: flex; flex-direction: column; gap: 8px; max-width: 600px; margin: 0 auto; }
        .section-label { font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #5f6368; text-transform: uppercase; margin: 16px 0 8px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 200; display: flex; align-items: flex-start; justify-content: center; padding-top: 80px; }
        .modal-card { background: white; border-radius: 8px; width: 520px; max-width: 94vw; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.35); }
        .tag { display: inline-block; background: rgba(0,0,0,0.06); border-radius: 12px; padding: 2px 10px; font-size: 12px; color: #5f6368; margin: 2px; cursor: pointer; }
        .tag.on { background: #e8f0fe; color: #1a73e8; }
        .ai-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 14px; padding: 4px 12px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: opacity 0.15s; }
        .ai-badge:hover { opacity: 0.88; }
        .spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fab { position: fixed; bottom: 32px; right: 32px; width: 52px; height: 52px; background: white; border-radius: 50%; box-shadow: 0 4px 16px rgba(0,0,0,0.25); border: none; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #202124; z-index: 100; transition: box-shadow 0.15s; }
        .fab:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.3); }
        .empty-state { text-align: center; padding: 80px 20px; color: #9aa0a6; }
        .empty-state svg { opacity: 0.3; margin-bottom: 20px; }
        .top-bar { background: white; border-bottom: 1px solid #e0e0e0; padding: 8px 16px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 50; }
        .search-wrap { flex: 1; background: #f1f3f4; border-radius: 24px; padding: 8px 16px; display: flex; align-items: center; gap: 12px; max-width: 700px; }
        .menu-popup { position: absolute; background: white; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.25); z-index: 300; min-width: 170px; }
        .menu-item { padding: 10px 16px; font-size: 14px; cursor: pointer; color: #202124; transition: background 0.1s; }
        .menu-item:hover { background: #f1f3f4; }
      `}</style>

      {/* Top Bar */}
      <div className="top-bar">
        <button className="icon-btn" style={{ fontSize: 18 }} onClick={() => setSidebarOpen(o => !o)}>☰</button>
        <span style={{ fontSize: 22, fontWeight: 600, color: "#e8b000", marginRight: 4, userSelect: "none" }}>✦</span>
        <span style={{ fontSize: 20, fontWeight: 600, color: "#3c4043", marginRight: 16, userSelect: "none" }}>NoteFlow</span>
        <div className="search-wrap">
          <span style={{ color: "#5f6368", fontSize: 16 }}>🔍</span>
          <input className="search-bar" style={{ background: "transparent" }} placeholder="Search your notes…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="icon-btn" style={{ fontSize: 12 }} onClick={() => setSearch("")}>✕</button>}
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          <button className="icon-btn" title={layout === "masonry" ? "List view" : "Grid view"} onClick={() => setLayout(l => l === "masonry" ? "list" : "masonry")} style={{ fontSize: 18 }}>
            {layout === "masonry" ? "☰" : "⊞"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{ width: 260, flexShrink: 0, paddingTop: 8, borderRight: "1px solid #e0e0e0", background: "white", position: "sticky", top: 57, height: "calc(100vh - 57px)", overflowY: "auto" }}>
            <div className={`sidebar-item ${view === "notes" ? "active" : ""}`} onClick={() => setView("notes")}>
              <span>💡</span> Notes
            </div>
            <div className={`sidebar-item ${view === "archive" ? "active" : ""}`} onClick={() => setView("archive")}>
              <span>📦</span> Archive
            </div>
            <div style={{ borderTop: "1px solid #e0e0e0", margin: "8px 0" }} />
            <div style={{ padding: "4px 12px 4px 16px", fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "#9aa0a6", textTransform: "uppercase" }}>Labels</div>
            {LABELS.map(l => (
              <div key={l} className={`sidebar-item ${view === `label:${l}` ? "active" : ""}`} onClick={() => setView(`label:${l}`)}>
                <span>🏷</span> {l}
                {labelCounts[l] > 0 && <span style={{ marginLeft: "auto", fontSize: 12, color: "#9aa0a6" }}>{labelCounts[l]}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, padding: "24px 16px 80px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>

          {/* Create Area */}
          {view === "notes" && (
            <div style={{ maxWidth: 600, margin: "0 auto 32px" }}>
              {!creating ? (
                <div className="create-area" onClick={() => { setCreating(true); setTimeout(() => createRef.current?.focus(), 50); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#5f6368", fontSize: 15 }}>Take a note…</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="icon-btn" style={{ fontSize: 16 }} onClick={e => { e.stopPropagation(); setNewNote(p => ({ ...p, isTodo: true })); setCreating(true); }}>✓</button>
                    <button className="icon-btn" style={{ fontSize: 16 }}>🖼</button>
                  </div>
                </div>
              ) : (
                <div className="create-area" style={{ ...noteColor(newNote.color), border: `1px solid`, padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px" }}>
                    <input ref={createRef} className="note-input" placeholder="Title" value={newNote.title} onChange={e => setNewNote(p => ({ ...p, title: e.target.value }))} style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }} />
                    {newNote.isTodo ? (
                      <div>
                        {newNote.todos.map((t, i) => (
                          <div key={t.id} className="todo-item">
                            <input type="checkbox" className="todo-checkbox" checked={t.done} onChange={() => setNewNote(p => ({ ...p, todos: p.todos.map((x, j) => j === i ? { ...x, done: !x.done } : x) }))} />
                            <input className="note-input" value={t.text} style={{ fontSize: 14 }} onChange={e => setNewNote(p => ({ ...p, todos: p.todos.map((x, j) => j === i ? { ...x, text: e.target.value } : x) }))} />
                          </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <div style={{ width: 16 }} />
                          <button className="note-input" style={{ textAlign: "left", color: "#5f6368", cursor: "pointer", fontSize: 14 }} onClick={() => setNewNote(p => ({ ...p, todos: [...p.todos, { id: generateId(), text: "", done: false }] }))}>+ List item</button>
                        </div>
                      </div>
                    ) : (
                      <textarea className="note-input" placeholder="Take a note…" rows={3} value={newNote.content} onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))} style={{ fontSize: 14, lineHeight: 1.6 }} />
                    )}
                    {newNote.labels.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {newNote.labels.map(l => <span key={l} className="label-chip">🏷 {l}</span>)}
                      </div>
                    )}
                  </div>
                  {/* Color picker */}
                  <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {COLORS.map(c => (
                      <div key={c.name} className={`color-dot ${newNote.color === c.name ? "selected" : ""}`} style={{ background: c.bg, border: `2px solid ${newNote.color === c.name ? "#5f6368" : "transparent"}` }}
                        title={c.label} onClick={() => setNewNote(p => ({ ...p, color: c.name }))} />
                    ))}
                    <div style={{ flex: 1 }} />
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#5f6368", padding: "4px 8px", borderRadius: 4 }} onClick={() => setCreating(false)}>Close</button>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#202124", padding: "4px 12px", borderRadius: 4 }} onClick={addNote}>Done</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="empty-state">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p style={{ fontSize: 20, fontWeight: 500 }}>{search ? "No matching notes" : view === "archive" ? "No archived notes" : "No notes yet"}</p>
              <p style={{ fontSize: 14, marginTop: 8, opacity: 0.7 }}>Click the + button or text field to create one</p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && <div className="section-label">Pinned</div>}
              <div className={layout === "masonry" ? "masonry" : "list-layout"}>
                {pinned.map(n => <NoteCard key={n.id} note={n} onOpen={setEditNote} onPin={togglePin} onArchive={toggleArchive} onDelete={deleteNote} onUpdate={updateNote} menuNote={menuNote} setMenuNote={setMenuNote} />)}
              </div>
              {pinned.length > 0 && unpinned.length > 0 && <div className="section-label">Other notes</div>}
              <div className={layout === "masonry" ? "masonry" : "list-layout"} style={{ marginTop: pinned.length > 0 ? 0 : 0 }}>
                {unpinned.map(n => <NoteCard key={n.id} note={n} onOpen={setEditNote} onPin={togglePin} onArchive={toggleArchive} onDelete={deleteNote} onUpdate={updateNote} menuNote={menuNote} setMenuNote={setMenuNote} />)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editNote && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditNote(null); }}>
          <div className="modal-card" style={{ ...noteColor(editNote.color) }}>
            <div style={{ padding: "16px 20px" }}>
              <input className="note-input" value={editNote.title} placeholder="Title" onChange={e => { const upd = { ...editNote, title: e.target.value }; setEditNote(upd); updateNote(editNote.id, { title: e.target.value }); }}
                style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, background: "transparent" }} />
              {editNote.todos?.length > 0 ? (
                <div>
                  {editNote.todos.map((t, i) => (
                    <div key={t.id} className="todo-item">
                      <input type="checkbox" className="todo-checkbox" checked={t.done} onChange={() => {
                        const todos = editNote.todos.map((x, j) => j === i ? { ...x, done: !x.done } : x);
                        setEditNote(p => ({ ...p, todos })); updateNote(editNote.id, { todos });
                      }} />
                      <input className="note-input" value={t.text} style={{ fontSize: 15, textDecoration: t.done ? "line-through" : "none", color: t.done ? "#9aa0a6" : "inherit", background: "transparent" }}
                        onChange={e => {
                          const todos = editNote.todos.map((x, j) => j === i ? { ...x, text: e.target.value } : x);
                          setEditNote(p => ({ ...p, todos })); updateNote(editNote.id, { todos });
                        }} />
                      <button className="icon-btn" style={{ fontSize: 12, flexShrink: 0 }} onClick={() => {
                        const todos = editNote.todos.filter((_, j) => j !== i);
                        setEditNote(p => ({ ...p, todos })); updateNote(editNote.id, { todos });
                      }}>✕</button>
                    </div>
                  ))}
                  <button style={{ fontSize: 13, color: "#5f6368", background: "none", border: "none", cursor: "pointer", padding: "4px 0 0 24px" }}
                    onClick={() => {
                      const todos = [...editNote.todos, { id: generateId(), text: "", done: false }];
                      setEditNote(p => ({ ...p, todos })); updateNote(editNote.id, { todos });
                    }}>+ Add item</button>
                </div>
              ) : (
                <textarea className="note-input" value={editNote.content} placeholder="Note…" rows={6} onChange={e => {
                  setEditNote(p => ({ ...p, content: e.target.value })); updateNote(editNote.id, { content: e.target.value });
                }} style={{ fontSize: 15, lineHeight: 1.7, background: "transparent" }} />
              )}

              {/* Labels */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: "#5f6368", marginBottom: 6 }}>Labels</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {LABELS.map(l => (
                    <span key={l} className={`tag ${editNote.labels?.includes(l) ? "on" : ""}`} onClick={() => {
                      const labels = editNote.labels?.includes(l) ? editNote.labels.filter(x => x !== l) : [...(editNote.labels || []), l];
                      setEditNote(p => ({ ...p, labels })); updateNote(editNote.id, { labels });
                    }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Color picker */}
            <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <div key={c.name} className={`color-dot ${editNote.color === c.name ? "selected" : ""}`} style={{ background: c.bg, border: `2px solid ${editNote.color === c.name ? "#5f6368" : "transparent"}` }}
                  title={c.label} onClick={() => { setEditNote(p => ({ ...p, color: c.name })); updateNote(editNote.id, { color: c.name }); }} />
              ))}
              <div style={{ flex: 1 }} />
              <button className="ai-badge" disabled={aiLoading} onClick={() => enhanceWithAI(editNote)}>
                {aiLoading ? <div className="spinner" /> : "✦"} AI Improve
              </button>
              <button className="icon-btn" title="Delete" onClick={() => deleteNote(editNote.id)} style={{ fontSize: 16 }}>🗑</button>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#202124", padding: "4px 12px", borderRadius: 4 }} onClick={() => setEditNote(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      {view === "notes" && (
        <button className="fab" onClick={() => { setCreating(true); setTimeout(() => createRef.current?.focus(), 50); }}>+</button>
      )}
    </div>
  );
}

function NoteCard({ note, onOpen, onPin, onArchive, onDelete, onUpdate, menuNote, setMenuNote }) {
  const getColor = (name) => ({ backgroundColor: COLORS.find(c => c.name === name)?.bg || "#fff", borderColor: name === "default" ? "#e0e0e0" : COLORS.find(c => c.name === name)?.bg });
  const doneTodos = note.todos?.filter(t => t.done).length || 0;

  return (
    <div className="note-card" style={getColor(note.color)} onClick={() => onOpen(note)}>
      <div style={{ padding: "12px 14px 40px" }}>
        {note.title && <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: "#202124" }}>{note.title}</div>}
        {note.content && <div style={{ fontSize: 13.5, color: "#3c4043", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 220, overflow: "hidden" }}>{note.content}</div>}
        {note.todos?.length > 0 && (
          <div>
            {note.todos.slice(0, 8).map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "2px 0" }}>
                <input type="checkbox" checked={t.done} onChange={e => { e.stopPropagation(); const todos = note.todos.map(x => x.id === t.id ? { ...x, done: !x.done } : x); onUpdate(note.id, { todos }); }} style={{ marginTop: 2, cursor: "pointer", accentColor: "#5f6368" }} />
                <span style={{ fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? "#9aa0a6" : "#3c4043", lineHeight: 1.5 }}>{t.text}</span>
              </div>
            ))}
            {note.todos.length > 8 && <div style={{ fontSize: 12, color: "#9aa0a6", marginTop: 4 }}>+{note.todos.length - 8} more</div>}
            {doneTodos > 0 && <div style={{ fontSize: 11, color: "#9aa0a6", marginTop: 4 }}>{doneTodos}/{note.todos.length} done</div>}
          </div>
        )}
        {note.labels?.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 3 }}>
            {note.labels.map(l => <span key={l} className="label-chip">🏷 {l}</span>)}
          </div>
        )}
      </div>

      {/* Pin */}
      <button className={`icon-btn pin-btn ${note.pinned ? "pinned" : ""}`} title={note.pinned ? "Unpin" : "Pin"} onClick={e => { e.stopPropagation(); onPin(note.id); }} style={{ fontSize: 14 }}>
        {note.pinned ? "📌" : "📍"}
      </button>

      {/* Actions */}
      <div className="note-actions">
        <button className="icon-btn" title="Archive" onClick={e => { e.stopPropagation(); onArchive(note.id); }} style={{ fontSize: 14 }}>📦</button>
        <button className="icon-btn" title="More" onClick={e => { e.stopPropagation(); setMenuNote(menuNote === note.id ? null : note.id); }} style={{ fontSize: 14 }}>⋮</button>
      </div>

      {/* Context Menu */}
      {menuNote === note.id && (
        <div className="menu-popup" style={{ bottom: 36, right: 6 }} onClick={e => e.stopPropagation()}>
          <div className="menu-item" onClick={() => { onDelete(note.id); setMenuNote(null); }}>🗑 Delete note</div>
          <div className="menu-item" onClick={() => { onArchive(note.id); setMenuNote(null); }}>{note.archived ? "📤 Unarchive" : "📦 Archive"}</div>
          <div className="menu-item" onClick={() => { onPin(note.id); setMenuNote(null); }}>{note.pinned ? "📍 Unpin" : "📌 Pin note"}</div>
        </div>
      )}
    </div>
  );
}
