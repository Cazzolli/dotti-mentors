"use client";
import { useState } from "react";

const PREVIEW_LIMIT = 220;

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-violet-400 hover:text-violet-300 underline underline-offset-2 break-all transition-colors"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface Props {
  channelId: string;
  initialIdea: string | null;
  isOwner: boolean;
  className?: string;
}

export default function ChannelIdea({ channelId, initialIdea, isOwner, className }: Props) {
  const [idea, setIdea] = useState(initialIdea ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(initialIdea ?? "");
  const [saving, setSaving] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/channels/${channelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelIdea: draft.trim() || null }),
    });
    if (res.ok) {
      setIdea(draft.trim());
      setModalOpen(false);
    }
    setSaving(false);
  }

  function handleOpen() {
    setDraft(idea);
    setModalOpen(true);
  }

  function handleCancel() {
    setDraft(idea);
    setModalOpen(false);
  }

  const isEmpty = !idea.trim();
  const isTruncatable = idea.length > PREVIEW_LIMIT;
  const displayText = isTruncatable ? idea.slice(0, PREVIEW_LIMIT).trimEnd() + "…" : idea;

  return (
    <>
      <div className={className ?? "border-b border-white/5 px-5 py-4 flex-shrink-0"}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-amber-400">
              <circle cx="12" cy="12" r="9" />
              <polyline points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Origem & Referência
              </span>
              {isOwner && (
                <button
                  onClick={handleOpen}
                  className="text-xs text-gray-600 hover:text-gray-300 transition-colors ml-1"
                >
                  {isEmpty ? "+ Adicionar" : "Editar"}
                </button>
              )}
            </div>

            {isEmpty ? (
              isOwner ? (
                <p className="text-xs text-gray-600 italic">
                  Nenhuma ideia cadastrada ainda. Clique em "+ Adicionar" para descrever a origem do canal.
                </p>
              ) : (
                <p className="text-xs text-gray-600 italic">Descreva como surgiu a ideia do canal, qual nicho você quer explorar e quais canais está usando como referência.</p>
              )
            ) : (
              <div>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {renderTextWithLinks(displayText)}
                </p>
                {isTruncatable && (
                  <button
                    onClick={() => setViewModalOpen(true)}
                    className="mt-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                  >
                    Ver tudo ↓
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de leitura — mentor e aluno */}
      {viewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setViewModalOpen(false); }}
        >
          <div className="w-full max-w-xl bg-[#13131e] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-amber-400">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Origem & Referência</span>
              <button
                onClick={() => setViewModalOpen(false)}
                className="ml-auto text-gray-600 hover:text-gray-300 transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {renderTextWithLinks(idea)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal — só para o aluno (isOwner) */}
      {isOwner && modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
        >
          <div className="w-full max-w-xl bg-[#13131e] border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 p-6">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-amber-400">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Origem & Referência</span>
              <button
                onClick={handleCancel}
                className="ml-auto text-gray-600 hover:text-gray-300 transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed -mt-1">
              Descreva a ideia do canal: de onde veio a inspiração, quais canais você está modelando e links de referência.
            </p>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={10}
              placeholder={`Ex: Estou modelando o @mkbhd e @unboxtherapy. Ideia de nicho: tech reviews em português com foco em custo-benefício.\n\nhttps://youtube.com/@mkbhd`}
              className="w-full bg-[#0d0d14] border border-white/10 focus:border-amber-500/40 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 border border-white/10 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
