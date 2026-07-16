"use client";
import { useState, useEffect } from "react";
import { timeAgo } from "@/lib/utils";
import CharCounter from "./CharCounter";

const CONTENT_MAX_LENGTH = 5000;

interface MentorIdea {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; role: string; avatarUrl: string | null };
}

interface Props {
  studentId: string;
  currentUserId: string;
  currentUserRole: string;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderWithLinks(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all transition-colors">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function MentorIdeaSection({ studentId, currentUserId, currentUserRole }: Props) {
  const [ideas, setIdeas] = useState<MentorIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isMentorOrAdmin = currentUserRole === "ADMIN" || currentUserRole === "MENTOR";
  const now = Date.now();

  useEffect(() => {
    fetch(`/api/mentor-ideas?studentId=${studentId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setIdeas(data); setLoading(false); });
  }, [studentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/mentor-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft, studentId }),
    });
    if (res.ok) {
      const idea = await res.json();
      setIdeas((prev) => [idea, ...prev]);
      setDraft("");
      setFormOpen(false);
    }
    setSubmitting(false);
  }

  async function handleEdit(id: string) {
    if (!editDraft.trim()) return;
    setEditSaving(true);
    const res = await fetch(`/api/mentor-ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editDraft }),
    });
    if (res.ok) {
      const updated = await res.json();
      setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, content: updated.content } : i));
      setEditingId(null);
    }
    setEditSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/mentor-ideas/${id}`, { method: "DELETE" });
    if (res.ok) setIdeas((prev) => prev.filter((i) => i.id !== id));
    setConfirmDeleteId(null);
  }

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-300">
            {isMentorOrAdmin ? "Ideias para este aluno" : "Ideias dos mentores"}
          </h2>
          {ideas.length > 0 && (
            <span className="text-xs bg-white/8 text-gray-500 px-2 py-0.5 rounded-full">{ideas.length}</span>
          )}
        </div>
        {isMentorOrAdmin && (
          <button
            onClick={() => { setFormOpen((v) => !v); setEditingId(null); }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
              formOpen
                ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                : "border-white/10 text-gray-500 hover:text-white hover:border-white/20"
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar ideia
          </button>
        )}
      </div>

      {/* Form */}
      {isMentorOrAdmin && formOpen && (
        <form onSubmit={handleSubmit} className="bg-[#13131e] border border-amber-500/20 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-500">Escreva uma ideia de canal ou conteúdo. Links são clicáveis.</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, CONTENT_MAX_LENGTH))}
            placeholder="Ex: Você poderia explorar vídeos sobre gastronomia regional, mostrando o preparo de pratos típicos..."
            rows={5}
            autoFocus
            maxLength={CONTENT_MAX_LENGTH}
            className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/40 resize-none leading-relaxed"
          />
          <CharCounter current={draft.length} max={CONTENT_MAX_LENGTH} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setFormOpen(false); setDraft(""); }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting || !draft.trim()}
              className="px-4 py-1.5 text-xs text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg transition-colors font-medium">
              {submitting ? "Enviando..." : "Enviar ideia"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {ideas.length === 0 && !formOpen ? (
        <div className="bg-[#13131e] border border-white/5 rounded-xl p-6 text-center">
          <svg className="w-8 h-8 text-gray-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm text-gray-600">
            {isMentorOrAdmin ? "Nenhuma ideia enviada ainda." : "Nenhuma ideia dos mentores ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => {
            const isOwn = idea.author.id === currentUserId;
            const isEditing = editingId === idea.id;

            return (
              <div key={idea.id} className="bg-[#13131e] border border-white/5 rounded-xl p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {idea.author.avatarUrl ? (
                      <img src={idea.author.avatarUrl} alt={idea.author.name} referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-300 flex-shrink-0 font-medium">
                        {idea.author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-medium text-gray-300">{idea.author.name}</span>
                      <span className="ml-1.5 text-xs text-violet-400">· mentor</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-gray-600">{timeAgo(idea.createdAt, now)}</span>
                    {isOwn && isMentorOrAdmin && !isEditing && (
                      <button onClick={() => { setEditingId(idea.id); setEditDraft(idea.content); setFormOpen(false); }}
                        className="text-gray-700 hover:text-amber-400 transition-colors" title="Editar">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    {isOwn && isMentorOrAdmin && !isEditing && (
                      <button onClick={() => setConfirmDeleteId(idea.id)}
                        className="text-gray-700 hover:text-red-400 transition-colors" title="Excluir">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Content / edit */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value.slice(0, CONTENT_MAX_LENGTH))}
                      autoFocus rows={5}
                      maxLength={CONTENT_MAX_LENGTH}
                      className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-amber-500/40 resize-none leading-relaxed"
                    />
                    <CharCounter current={editDraft.length} max={CONTENT_MAX_LENGTH} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
                        Cancelar
                      </button>
                      <button onClick={() => handleEdit(idea.id)} disabled={editSaving || !editDraft.trim()}
                        className="px-4 py-1.5 text-xs text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg transition-colors font-medium">
                        {editSaving ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-200 leading-relaxed pl-8 whitespace-pre-wrap">
                    {renderWithLinks(idea.content)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13131e] border border-white/10 rounded-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Excluir ideia?</h2>
            <p className="text-sm text-gray-400">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors font-medium">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
