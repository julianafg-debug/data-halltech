import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  House,
  LoaderCircle,
  Plus,
  Shield,
  Trees,
  Wrench,
  X,
} from "lucide-react";
import { api, ApiError } from "./api";
import {
  authenticationConfigured,
  beginSignIn,
  completeSignInRedirect,
  signOut,
  usesDevelopmentIdentity,
} from "./auth";
import type { AppContext, Category, RequestSummary, ServiceRequest } from "./types";

type RequestDraft = {
  category_id: string;
  subject: string;
  location_label: string;
  description: string;
};

const categoryIcons: Record<string, typeof Wrench> = {
  maintenance: Wrench,
  security: Shield,
  common_areas: Trees,
};

const categoryDescriptions: Record<string, string> = {
  maintenance: "Elétrica, hidráulica, infiltrações e reparos",
  security: "Portaria, acesso e ocorrências",
  common_areas: "Lazer, limpeza e conservação",
};

const initialDraft: RequestDraft = {
  category_id: "",
  subject: "",
  location_label: "",
  description: "",
};
const emptySummary: RequestSummary = { open_requests: 0, in_progress_requests: 0 };

export default function App() {
  const [context, setContext] = useState<AppContext | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [summary, setSummary] = useState<RequestSummary>(emptySummary);
  const [categories, setCategories] = useState<Category[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>(initialDraft);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const modalRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const [ambiguousSubmission, setAmbiguousSubmission] = useState(false);

  const activeCondominium = useMemo(
    () => context?.condominiums.find((item) => item.id === context.active_context_id),
    [context],
  );

  async function loadPage() {
    setLoading(true);
    setLoadError("");
    try {
      await completeSignInRedirect();
      const loadedContext = await api.getContext();
      setContext(loadedContext);
      const condominium =
        loadedContext.condominiums.find((item) => item.id === loadedContext.active_context_id) ??
        loadedContext.condominiums[0];
      if (!condominium) {
        throw new Error("Não há um condomínio associado a este acesso.");
      }

      const [categoryResult, requestResult] = await Promise.all([
        api.getCategories(condominium.id),
        api.getRequests(condominium.id),
      ]);
      setCategories(categoryResult.items);
      setRequests(requestResult.items);
      setSummary(requestResult.summary);
      setNextCursor(requestResult.next_cursor);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalRef.current?.querySelector<HTMLElement>("select, input, textarea, button")?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        setModalOpen(false);
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const controls = [...modalRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);
      if (controls.length === 0) return;
      const first = controls[0]!;
      const last = controls[controls.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, saving]);

  useEffect(() => {
    if (!modalOpen) openerRef.current?.focus();
  }, [modalOpen]);

  function openRequest(category?: Category) {
    if (ambiguousSubmission && idempotencyKeyRef.current) {
      setModalOpen(true);
      return;
    }
    idempotencyKeyRef.current = crypto.randomUUID();
    setAmbiguousSubmission(false);
    setDraft({
      ...initialDraft,
      category_id: category?.id ?? "",
      subject: category ? defaultSubject(category.code) : "",
    });
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
    setModalOpen(true);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCondominium) return;
    setSaving(true);
    setFormError("");
    setFieldErrors({});

    try {
      const created = await api.createRequest(activeCondominium.id, {
        category_id: draft.category_id,
        subject: draft.subject,
        description: draft.description,
        location_label: draft.location_label || null,
        unit_id: activeCondominium.units[0]?.id ?? null,
      }, idempotencyKeyRef.current ?? crypto.randomUUID());
      idempotencyKeyRef.current = null;
      setAmbiguousSubmission(false);
      setRequests((current) => [
        {
          ...created,
          location_label: draft.location_label || null,
          category_name:
            categories.find((category) => category.id === draft.category_id)?.name ?? "Solicitação",
          priority: created.priority ?? "normal",
        },
        ...current,
      ]);
      setSummary((current) => ({
        ...current,
        open_requests: current.open_requests + 1,
      }));
      setModalOpen(false);
      setDraft(initialDraft);
      setSuccessMessage(`Solicitação ${created.public_number} registrada.`);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(Object.fromEntries(error.fieldErrors.map((item) => [item.field, item.message])));
        if (error.status === 0 || error.status >= 500) {
          setAmbiguousSubmission(true);
          setFormError(`${error.message} Tente novamente sem alterar os dados para evitar duplicidade.`);
        } else {
          idempotencyKeyRef.current = crypto.randomUUID();
          setAmbiguousSubmission(false);
        }
      } else {
        setFormError(error instanceof Error ? error.message : "Não foi possível abrir a solicitação.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function loadMoreRequests() {
    if (!activeCondominium || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api.getRequests(activeCondominium.id, nextCursor);
      setRequests((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar mais chamados.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Central Hall - início">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-copy">
            <strong>central hall</strong>
            <small>seu condomínio, mais perto</small>
          </span>
        </a>
        <div className="account-area">
          <div className="environment-badge"><span /> {usesDevelopmentIdentity ? "Ambiente de demonstração" : "Área do morador"}</div>
          <button
            className="profile-button"
            type="button"
            aria-label={authenticationConfigured ? "Sair da conta" : "Perfil de desenvolvimento"}
            onClick={() => void signOut()}
            disabled={!authenticationConfigured}
          >
            <span className="avatar">M</span>
            <span className="profile-name">{context?.user.display_name ?? "Morador"}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="page-content">
        {loading ? (
          <div className="state-panel" role="status">
            <LoaderCircle className="spin" size={24} /> Carregando seus dados...
          </div>
        ) : loadError ? (
          <div className="error-panel" role="alert">
            <h1>{authenticationConfigured ? "Acesse sua conta" : "Não foi possível carregar sua área"}</h1>
            <p>{authenticationConfigured ? "Entre com a conta autorizada do seu condomínio para continuar." : loadError}</p>
            <div className="error-actions">
              {authenticationConfigured && (
                <button className="button button-primary" onClick={() => void beginSignIn()} type="button">
                  Entrar com segurança <ArrowRight size={17} />
                </button>
              )}
              <button className="button button-secondary" onClick={() => void loadPage()} type="button">
                Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="welcome-section">
              <div>
                <p className="eyebrow">ÁREA DO MORADOR</p>
                <h1>Olá, {context?.user.display_name.split(" ")[0]} <span aria-hidden="true">👋</span></h1>
                <p className="context-line">
                  <Building2 size={16} aria-hidden="true" />
                  {activeCondominium?.name}
                  {activeCondominium?.units[0] && <span> · {activeCondominium.units[0].label}</span>}
                </p>
              </div>
              <button className="context-button" type="button" disabled>
                <House size={17} aria-hidden="true" />
                Minha unidade
                <ChevronDown size={16} aria-hidden="true" />
              </button>
            </section>

            {successMessage && (
              <div className="success-banner" role="status">
                <Check size={18} aria-hidden="true" /> {successMessage}
                <button type="button" onClick={() => setSuccessMessage("")} aria-label="Fechar confirmação">
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
            )}

            <section className="metric-grid" aria-label="Resumo dos meus chamados">
              <MetricCard icon={<ClipboardList />} value={String(summary.open_requests)} label="Chamados abertos" tone="green" />
              <MetricCard icon={<Clock3 />} value={String(summary.in_progress_requests)} label="Em atendimento" tone="gold" />
              <MetricCard icon={<Check />} value="—" label="Avaliação" tone="blue" helper="Disponível após conclusão" />
              <MetricCard icon={<Shield />} value="—" label="SLA" tone="purple" helper="Conforme política do condomínio" />
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ATENDIMENTO</p>
                  <h2>Como podemos ajudar?</h2>
                </div>
                <span className="section-caption">Escolha o tipo de solicitação</span>
              </div>
              <div className="service-grid">
                {categories.map((category) => {
                  const Icon = categoryIcons[category.code] ?? CircleHelp;
                  return (
                    <button
                      key={category.id}
                      className="service-card"
                      type="button"
                      onClick={() => openRequest(category)}
                    >
                      <span className={`service-icon service-${category.code}`}><Icon size={22} /></span>
                      <span className="service-copy">
                        <strong>{category.name}</strong>
                        <small>{categoryDescriptions[category.code] ?? "Abra uma solicitação para a administração"}</small>
                      </span>
                      <ArrowRight className="service-arrow" size={18} aria-hidden="true" />
                    </button>
                  );
                })}
                <button className="service-card assistant-card" type="button" disabled>
                  <span className="service-icon service-assistant"><CircleHelp size={22} /></span>
                  <span className="service-copy">
                    <strong>Assistente do condomínio</strong>
                    <small>Consulte regras e informações aprovadas</small>
                    <em>Em breve</em>
                  </span>
                </button>
              </div>
            </section>

            <section className="section-block requests-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ACOMPANHAMENTO</p>
                  <h2>Meus chamados <span className="count-pill">{requests.length}</span></h2>
                </div>
                <button className="text-button" type="button" onClick={() => void loadPage()}>
                  Atualizar <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
              {requests.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon"><ClipboardList size={23} /></span>
                  <strong>Você ainda não tem chamados</strong>
                  <p>Quando abrir uma solicitação, poderá acompanhar as atualizações por aqui.</p>
                  <button className="button button-secondary" onClick={() => openRequest()} type="button">
                    <Plus size={17} /> Abrir solicitação
                  </button>
                </div>
              ) : (
                <div className="request-list">
                  {requests.map((item) => (
                    <article className="request-card" key={item.id}>
                      <div className="request-symbol"><Wrench size={18} aria-hidden="true" /></div>
                      <div className="request-main">
                        <div className="request-title-row">
                          <h3>{item.subject}</h3>
                          <StatusBadge status={item.status} />
                        </div>
                        <p>{item.public_number} <span>·</span> {item.category_name}</p>
                        <small>
                          {item.location_label || "Local não informado"}
                          <span> · </span>
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(item.created_at))}
                        </small>
                      </div>
                      <button className="icon-button" type="button" aria-label={`Detalhes de ${item.public_number}`} disabled>
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
              )}
              {nextCursor && (
                <div className="load-more">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => void loadMoreRequests()}
                    disabled={loadingMore}
                  >
                    {loadingMore && <LoaderCircle className="spin" size={16} />}
                    {loadingMore ? "Carregando..." : "Carregar mais chamados"}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <span>Central Hall <span aria-hidden="true">·</span> Atendimento condominial</span>
        <span>Versão inicial de desenvolvimento</span>
      </footer>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setModalOpen(false);
        }}>
          <section
            ref={modalRef}
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-dialog-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">NOVA SOLICITAÇÃO</p>
                <h2 id="request-dialog-title">Abrir chamado</h2>
                <p>Descreva o que aconteceu para que possamos ajudar.</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label={ambiguousSubmission ? "Fechar e verificar meus chamados" : "Fechar"}
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            <form className="request-form" onSubmit={(event) => void submitRequest(event)}>
              {formError && <div className="form-error" role="alert">{formError}</div>}
              {ambiguousSubmission && (
                <div className="form-notice" role="status">
                  O resultado ainda não foi confirmado. Você pode fechar e verificar a lista; ao tentar novamente, os dados serão reenviados com a mesma chave segura.
                </div>
              )}
              <label>
                Categoria
                <select
                  value={draft.category_id}
                  disabled={saving || ambiguousSubmission}
                  onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}
                  aria-invalid={Boolean(fieldErrors.category_id)}
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {fieldErrors.category_id && <small className="field-error">{fieldErrors.category_id}</small>}
              </label>
              <label>
                Assunto
                <input
                  value={draft.subject}
                  disabled={saving || ambiguousSubmission}
                  onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                  minLength={3}
                  maxLength={200}
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(fieldErrors.subject)}
                />
                {fieldErrors.subject && <small className="field-error">{fieldErrors.subject}</small>}
              </label>
              <label>
                Local
                <select
                  value={draft.location_label}
                  disabled={saving || ambiguousSubmission}
                  onChange={(event) => setDraft({ ...draft, location_label: event.target.value })}
                >
                  <option value="">Minha unidade</option>
                  <option value="Corredor / hall">Corredor / hall</option>
                  <option value="Garagem">Garagem</option>
                  <option value="Área comum">Área comum</option>
                </select>
              </label>
              <label>
                Descrição
                <textarea
                  value={draft.description}
                  disabled={saving || ambiguousSubmission}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  minLength={10}
                  maxLength={5000}
                  rows={4}
                  placeholder="Descreva o que aconteceu..."
                  required
                  aria-invalid={Boolean(fieldErrors.description)}
                />
                <span className="input-hint">
                  {fieldErrors.description ?? `${draft.description.length}/5000 caracteres`}
                </span>
              </label>
              <div className="form-actions">
                <button className="button button-secondary" type="button" onClick={() => setModalOpen(false)} disabled={saving}>
                  {ambiguousSubmission ? "Fechar e verificar" : "Cancelar"}
                </button>
                <button className="button button-primary" type="submit" disabled={saving}>
                  {saving
                    ? <><LoaderCircle className="spin" size={17} /> Enviando...</>
                    : ambiguousSubmission
                      ? <>Tentar novamente <ArrowRight size={17} /></>
                      : <>Abrir solicitação <ArrowRight size={17} /></>}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  value,
  label,
  tone,
  helper,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone: string;
  helper?: string;
}) {
  return (
    <article className="metric-card">
      <span className={`metric-icon tone-${tone}`} aria-hidden="true">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {helper && <small>{helper}</small>}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    open: "Aberto",
    triage: "Em triagem",
    in_progress: "Em atendimento",
    waiting_resident: "Aguardando você",
    waiting_third_party: "Aguardando terceiro",
    resolved: "Resolvido",
    reopened: "Reaberto",
    closed: "Encerrado",
    cancelled: "Cancelado",
  };
  return <span className={`status-badge status-${status}`}>{labels[status] ?? "Em análise"}</span>;
}

function defaultSubject(code: string): string {
  const defaults: Record<string, string> = {
    maintenance: "Vazamento / infiltração",
    security: "Ocorrência de segurança",
    common_areas: "Área comum / lazer",
  };
  return defaults[code] ?? "";
}
