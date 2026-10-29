// Maktub Go: aba Marketing.
// Administradores (Isadora e Matheus): painel de controle, aprovação, calendário, produção e estratégia.
// Equipe de marketing: "Estúdio", visão mais visual da semana, produção, ideias e estratégia.
// Sem mídia no app: os arquivos de cada post ficam numa pasta do Google Drive e aqui entra só o link da pasta.
// Visão geral em três colunas (Planejado, Em andamento, Publicado), em Kanban e em Calendário.

const FMT = { reels: ['Reels', '#8a6520'], carrossel: ['Carrossel', '#2f6b4a'], feed: ['Feed', '#a0561f'], stories: ['Stories', '#2e5e6e'] };
const ST = { ideia: 'Ideia', producao: 'Roteiro', gravacao: 'Gravar', edicao: 'Edição', aprovacao: 'Aprovação', agendado: 'Agendado', publicado: 'Publicado' };
const ST_TAG = { ideia: '', producao: '', gravacao: 'ouro', edicao: '', aprovacao: 'alerta', agendado: 'ouro', publicado: 'ok' };
/* dois caminhos: vídeo (roteiro, gravação, edição) e arte (criação direto para aprovação) */
const ETAPAS_VIDEO = ['ideia', 'producao', 'gravacao', 'edicao', 'aprovacao', 'agendado', 'publicado'];
const ETAPAS_ARTE = ['ideia', 'producao', 'aprovacao', 'agendado', 'publicado'];
const ehVideo = (p) => p.video === true || p.video === false ? p.video : p.formato === 'reels';
const stNome = (p, s = p.status) => s === 'producao' ? (ehVideo(p) ? 'Roteiro' : 'Criação') : ST[s] || s;
const EM_PRODUCAO = ['producao', 'gravacao', 'edicao'];
/* visão geral: três grupos. As etapas detalhadas continuam dentro de Em andamento */
const GRUPOS = [['planejado', 'Ideias'], ['andamento', 'Em andamento'], ['publicado', 'Publicado']];
const grupo = (p) => p.status === 'ideia' ? 'planejado' : p.status === 'publicado' ? 'publicado' : 'andamento';
/* Kanban: uma coluna por etapa, cada etapa com um dono. Publicado sai do Kanban (fica no Calendário).
   Criação: quem faz o roteiro ou a arte. Gravação: quem grava (com prazo). Edição: quem edita.
   Aprovação: sempre os sócios. Agendado: quem posta, na data do app. */
const COLS = [['producao', 'Criação'], ['gravacao', 'Gravação'], ['edicao', 'Edição'], ['aprovacao', 'Aprovação'], ['agendado', 'Agendado']];
const colNome = (k) => (COLS.find(c => c[0] === k) || [k, ST[k] || k])[1];
// vídeo já gravado (o "Já gravei" do Início) conta como Edição; ideia com data já conta como Criação
const etapa = (p) => p.status === 'ideia' ? (p.data_prevista ? 'producao' : 'ideia') : p.status === 'gravacao' && p.gravado_em ? 'edicao' : p.status;
const caminho = (p) => [...(ehVideo(p) ? ['producao', 'gravacao', 'edicao'] : ['producao']), ...(exigir() ? ['aprovacao'] : []), 'agendado', 'publicado'];
const proxima = (p) => { const c = caminho(p), i = c.indexOf(etapa(p)); return i < 0 ? 'producao' : c[i + 1] || null; };
const donos = (p, k = etapa(p)) => (k === 'producao' || k === 'ideia' ? [p.responsavel_id] : k === 'gravacao' ? equipeG(p) : k === 'edicao' ? [p.edicao_por] : k === 'agendado' ? [p.postagem_por] : []).filter(Boolean);
const donoTxt = (p) => etapa(p) === 'aprovacao' ? 'os sócios' : donos(p).map(id => primeiro(nomeT(id))).filter(Boolean).join(' e ');
const possoMexer = (p) => etapa(p) === 'aprovacao' ? !!X.ADMIN : !!X.DELEGA || donos(p).includes(X.meuId);
const prazoGrav = (p) => p.gravacao_data || null;
/* duas contas no Instagram e collab com os sócios */
const CONTAS = [['maktub', 'Maktub Go', '#1b4332', 'rgba(27,67,50,.05)'], ['bragas', 'Os Bragas', '#c96a28', 'rgba(201,106,40,.09)']];
const contaDe = (p) => p.conta || 'maktub';
/* "quem edita" depende da coluna edicao_por (marketing-tarefas.sql). Antes dela, o campo não aparece e nada quebra */
const TEM_EDICAO = () => !!LISTA && LISTA.some(p => 'edicao_por' in p);
const contaX = (p) => CONTAS.find(c => c[0] === contaDe(p)) || CONTAS[0];
const contaN = (p) => contaX(p)[1];
const contaCor = (p) => contaX(p)[2];
const contaFundo = (p) => contaX(p)[3];
/* quem grava pode ser mais de uma pessoa */
const equipeG = (p) => Array.isArray(p.gravacao_equipe) && p.gravacao_equipe.length ? p.gravacao_equipe : p.gravacao_por ? [p.gravacao_por] : [];
const nomesG = (p) => equipeG(p).map(id => primeiro(nomeT(id))).filter(Boolean).join(', ');
const COLLAB = [['isadora', 'Isadora'], ['matheus', 'Matheus']];
const collabN = (p) => { const L = COLLAB.filter(c => (p.collab || []).includes(c[0])).map(c => c[1]); return L.length ? 'Collab: ' + L.join(' e ') : ''; };
const vis = () => LISTA.filter(p => !FCONTA || contaDe(p) === FCONTA);
const filtroConta = () => `<div class="mk-fmts" id="mkConta" style="margin-top:12px">${[['', 'Todas', 'var(--verde)'], ...CONTAS].map(([k, n, c]) => `<label style="--c:${c}"><input type="radio" name="fconta" value="${k}" ${FCONTA === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>`;
const GR_TAG = { planejado: '', andamento: 'ouro', publicado: 'ok' };
const grNome = (p) => grupo(p) === 'andamento' ? 'Em andamento · ' + stNome(p) : grupo(p) === 'planejado' ? 'Ideia' : 'Publicado';
const voltaAjuste = (p) => ehVideo(p) ? 'edicao' : 'producao';
const CORES = ['#1a3826', '#8a6520', '#a0561f', '#2e5e6e', '#6b3a4a', '#5f6b2f', '#7a6a55'];
const DOCS = [
  ['doc-posicionamento', 'Posicionamento', 'Como a Maktub quer ser vista e o que a diferencia.'],
  ['doc-publico', 'Público', 'Para quem falamos: perfil, desejos e objeções.'],
  ['doc-tom', 'Tom de voz', 'Como escrevemos: palavras que usamos e que evitamos.'],
  ['doc-regras', 'Regras da marca', 'O que sempre e o que nunca aparece nos posts.'],
  ['doc-referencias', 'Hashtags e referências', 'Hashtags, perfis de referência e links úteis.']
];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/* link colado de qualquer jeito (sem https, com texto antes, com espaço no fim): vira um endereço que abre.
   Sem isso, "drive.google.com/..." virava um endereço dentro do próprio site e o "Abrir pasta" dava erro. */
export const urlOk = (s) => { s = String(s || '').trim(); if (!s) return ''; const m = s.match(/https?:\/\/\S+/i); if (m) return m[0]; return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) ? 'https://' + s : ''; }; // o que não vira http(s) não vira link (nada de javascript:)
const pareceLink = (s) => /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(s);
/* campos de link do post: nome, rótulo na mensagem e aba onde ficam */
const LINKS = [['link_referencia', 'O link do post de referência', 'briefing'], ['link_bruto', 'O link do material bruto', 'briefing'], ['link_arquivo', 'O link da pasta de arquivos', 'arquivos'], ['link_post', 'O link do post no Instagram', 'arquivos']];
/* rascunho do post guardado no próprio celular enquanto a pessoa digita: se o app fechar
   (por exemplo, foi ao Drive copiar o link e o celular recarregou o app), o que foi digitado volta */
const RASC = (id) => 'mk_rasc_' + (id || 'nova');
const lerRasc = (id) => { try { return JSON.parse(localStorage.getItem(RASC(id)) || 'null'); } catch (_) { return null; } };
let T_RASC = null;
const apagarRasc = (id) => { clearTimeout(T_RASC); try { localStorage.removeItem(RASC(id)); } catch (_) {} };
const carimbo = (b) => b.atualizado_em || JSON.stringify(b);
// a pessoa confirmou que quer sair sem salvar: o rascunho vai junto
addEventListener('app:descartar', () => { if (ED) apagarRasc(ED === 'nova' ? null : ED); });

let LISTA = null, EST = [], TIME = [], ERRO = null, X = null;
let FCONTA = '', SO_FALTA = false;
let VIEW = null, ED = null, PRE = null, ED_EST = null, MES = null, DIA = null, AJ = null, CONF = null, ID_FMT = 'reels';

/* ---------- datas ---------- */
const isoDe = (d) => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const hoje = () => isoDe(new Date());
const maisDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDe(d); };
const dm = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
const hhmm = (s) => String(s || '').slice(0, 5); // o banco devolve 18:00:00
const mesK = (s) => String(s || '').slice(0, 7);
const mesNome = (k) => { const [y, m] = k.split('-').map(Number); const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const mesMais = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const diaPost = (p) => p.status === 'publicado' ? (p.publicado_em || p.data_prevista) : p.data_prevista;

/* ---------- dados ---------- */
export async function carregar(sb) {
  const [p, e, t] = await Promise.all([
    sb.from('marketing_posts').select('*').order('data_prevista', { ascending: true, nullsFirst: false }).limit(3000),
    sb.from('marketing_estrategia').select('*').order('ordem').order('criado_em'),
    sb.rpc('time_nomes')
  ]);
  if (p.error || e.error) { ERRO = (p.error || e.error).message; LISTA = null; return; }
  ERRO = null; LISTA = p.data || []; EST = e.data || []; TIME = t.data || [];
}
export function pend() {
  if (!LISTA) return {};
  return {
    aprovacao: LISTA.filter(p => p.status === 'aprovacao').length,
    atrasados: LISTA.filter(atrasado).length
  };
}
// endereço: #marketing/<visão>, #marketing/<visão>/post/<id> ou #marketing/<visão>/nova (o voltar do celular não sai do app)
export function rota(h) { VIEW = h[1] || null; ED = h[2] === 'post' && h[3] ? h[3] : h[2] === 'nova' ? (ED === 'nova' ? 'nova' : null) : null; ED_EST = null; if (!ED) PRE = null; CONF = null; }
const endereco = () => '#marketing/' + VIEW + (ED ? (ED === 'nova' ? '/nova' : '/post/' + ED) : '');
// abre um post (ou um novo) criando uma entrada no histórico; fechar volta no histórico
function abrirPost(id, pre) { ED = id; PRE = pre || null; history.pushState(null, '', endereco()); rerender(); scrollTo(0, 0); }
function fecharPost() { if (X.sairOk && !X.sairOk()) return; const h = location.hash; ED = null; PRE = null; if (/\/(post|nova)/.test(h)) history.back(); else rerender(); scrollTo(0, 0); }
// tarefas da pessoa no marketing, para o sino: gravar, ajustes, editar, criar, postar (e aprovar, para a coordenação)
export function minhasTarefas(eu, coord) {
  if (!LISTA) return [];
  const T = [], ja = new Set();
  const add = (p, oQue, quando) => { if (ja.has(p.id)) return; ja.add(p.id); T.push({ id: p.id, titulo: p.titulo, desc: oQue + (quando ? (/até$/.test(oQue) ? ' ' : ' · ') + dm(quando) : ''), atrasado: !!(quando && quando < hoje()) }); };
  // cada pessoa vê o que está com ela na etapa atual (aprovação fica com os sócios, nos avisos deles)
  LISTA.filter(p => etapa(p) === 'gravacao' && equipeG(p).includes(eu)).forEach(p => add(p, 'Gravar até', p.gravacao_data || p.data_prevista));
  LISTA.filter(p => p.ajuste && ['producao', 'edicao'].includes(etapa(p)) && donos(p).includes(eu)).forEach(p => add(p, 'Ajuste pedido', p.data_prevista));
  LISTA.filter(p => etapa(p) === 'edicao' && p.edicao_por === eu).forEach(p => add(p, 'Editar', p.data_prevista));
  LISTA.filter(p => etapa(p) === 'producao' && p.responsavel_id === eu).forEach(p => add(p, ehVideo(p) ? 'Fazer o roteiro' : 'Criar a arte', p.data_prevista));
  LISTA.filter(p => etapa(p) === 'agendado' && p.postagem_por === eu).forEach(p => add(p, 'Postar', p.data_prevista));
  return T;
}
// abre um post direto (vindo do sino)
export function editar(id) { ED = String(id); PRE = null; ED_EST = null; CONF = null; }
export function postar(id) { ED = String(id); PRE = { status: 'publicado' }; ED_EST = null; CONF = null; }
export function abrir(v) { VIEW = v; ED = null; ED_EST = null; PRE = null; CONF = null; }

const fmtN = (p) => (FMT[p.formato] || FMT.feed)[0] + (p.formato === 'reels' && p.reels_teste ? ' teste' : '');
// post com data que passou e não foi publicado, inclusive o que ficou em Planejado (antes sumia sem aviso)
const atrasado = (p) => p.status !== 'publicado' && p.data_prevista && p.data_prevista < hoje();
const cfg = () => EST.find(e => e.chave === 'config');
const exigir = () => !(cfg() && cfg().valores && cfg().valores.aprovacao === false);
const meta = (k) => (EST.find(e => e.chave === 'meta-' + k) || {}).valores || {};
const pilares = () => EST.filter(e => e.tipo === 'pilar');
const campanhas = () => EST.filter(e => e.tipo === 'campanha');
const est = (id) => EST.find(e => e.id === id);
const nomeT = (id) => (TIME.find(t => t.user_id === id) || {}).nome || '';
const primeiro = (n) => String(n || '').split(' ')[0];
const corP = (p) => contaCor(p);
const pubNoMes = (k) => LISTA.filter(p => p.status === 'publicado' && mesK(p.publicado_em) === k);

/* ---------- estilos próprios da aba ---------- */
function estilos() {
  if (document.getElementById('mkCss')) return;
  const s = document.createElement('style'); s.id = 'mkCss';
  s.textContent = `
.mk-lin{display:flex;align-items:center;gap:10px;width:100%;background:var(--branco);border:0;border-top:1px solid var(--linha);padding:11px 12px;text-align:left;cursor:pointer;font-size:14px}
.mk-lista{background:var(--branco);border:1px solid var(--linha)}.mk-lista .mk-lin:first-child{border-top:0}
.mk-lin i{flex:0 0 8px;height:8px;border-radius:50%}
.mk-lin .t{flex:1;min-width:0}.mk-lin small{display:block;font-size:12px;color:var(--tinta-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mk-lin .tag{margin-top:0;white-space:nowrap}
.mk-aprov{background:var(--branco);border:1px solid var(--linha);border-left:3px solid var(--alerta);padding:14px;margin-top:8px}
.mk-aprov .nome{font-family:'Cormorant Garamond',serif;font-size:21px;color:var(--verde);line-height:1.15}
.mk-aprov .leg{font-size:13.5px;color:var(--tinta-2);margin-top:8px;white-space:pre-wrap;max-height:7.5em;overflow:hidden}
.mk-links{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:13px}.mk-links a{color:var(--dourado)}
.mk-btns{display:flex;gap:8px;margin-top:12px}.mk-btns>*{flex:1}
.mk-barra{display:grid;grid-template-columns:110px 1fr 28px;gap:8px;align-items:center;padding:6px 0;font-size:13px}
.mk-barra .t{height:8px;background:var(--creme-2)}.mk-barra .t i{display:block;height:100%}
.mk-barra .q{text-align:right;color:var(--tinta-2)}
.mk-cm{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid var(--linha);border-top:1px solid var(--linha);margin:10px -10px 0;background:var(--branco)}
.mk-cm .h{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta-2);text-align:center;padding:6px 0;border-right:1px solid var(--linha);border-bottom:1px solid var(--linha);background:var(--creme-2)}
.mk-cm .d{min-height:86px;border-right:1px solid var(--linha);border-bottom:1px solid var(--linha);padding:3px 2px 4px;display:flex;flex-direction:column;gap:2px;cursor:pointer;min-width:0}
.mk-cm .d.fora{background:var(--creme-2);cursor:default}.mk-cm .d.hj .n{background:var(--dourado);color:#fff;border-radius:9px;padding:0 5px}
.mk-cm .d.sel{outline:2px solid var(--verde);outline-offset:-2px}
.mk-cm .n{align-self:flex-end;font-size:11px;color:var(--tinta-2);line-height:16px;margin:0 2px 1px}
.mk-chip{display:block;width:100%;border:0;border-radius:3px;padding:2px 4px;font-size:10px;line-height:1.3;text-align:left;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;font-weight:500}
.mk-chip.planejado{background:var(--branco)!important;color:var(--c);border:1px dashed var(--c);padding:1px 3px}.mk-chip.atrasado{box-shadow:inset 4px 0 0 #b5533c;padding-left:8px}
.mk-mais{font-size:10px;color:var(--tinta-3);padding-left:3px}
.mk-leg{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--tinta-2);margin-top:8px}.mk-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
@media (max-width:699px){.mk-chip{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:9.5px;padding:2px 3px;word-break:break-word;hyphens:auto}.mk-chip .f{display:none}}
@media (min-width:700px){.mk-cm{margin:10px 0 0}.mk-cm .d{min-height:110px;padding:4px}.mk-chip{font-size:12px;padding:3px 6px}}
.mk-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:10px}
.mk-cal .h{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-3);text-align:center;padding:4px 0}
.mk-cal button{aspect-ratio:1/1.05;background:var(--branco);border:1px solid var(--linha);font-size:13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:6px;gap:4px;color:var(--tinta)}
.mk-cal button.fora{visibility:hidden}.mk-cal button.hj{border-color:var(--dourado)}.mk-cal button.sel{background:var(--verde);color:var(--creme);border-color:var(--verde)}
.mk-cal button.sel .mk-dots i{border-color:var(--creme)!important}
.mk-dots{display:flex;gap:2px;flex-wrap:wrap;justify-content:center;max-width:90%}.mk-dots i{width:6px;height:6px;border-radius:50%}
.mk-fmts{display:flex;gap:6px;flex-wrap:wrap}
.mk-fmts label{cursor:pointer}.mk-fmts input{position:absolute;opacity:0;pointer-events:none}
.mk-fmts span{display:inline-block;padding:9px 14px;border:1px solid var(--linha);background:var(--branco);font-size:13px;border-radius:20px;color:var(--tinta-2)}
.mk-fmts input:checked+span{background:var(--c);border-color:var(--c);color:#fff}
.mk-cores{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.mk-cores label{cursor:pointer}.mk-cores input{position:absolute;opacity:0}
.mk-cores span{display:block;width:32px;height:32px;border-radius:50%;background:var(--c);border:3px solid var(--branco);box-shadow:0 0 0 1px var(--linha)}
.mk-cores input:checked+span{box-shadow:0 0 0 2px var(--tinta)}
.mk-ajuste{background:rgba(160,86,31,.08);border-left:3px solid var(--alerta);padding:10px 12px;font-size:13.5px;margin-top:10px;white-space:pre-wrap}
.mk-pilares{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mk-pilar{background:var(--c);color:#fff;border:0;padding:14px;text-align:left;cursor:pointer;min-height:92px;display:flex;flex-direction:column;justify-content:space-between}
.mk-pilar b{font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:500;line-height:1.1}.mk-pilar small{font-size:12px;opacity:.85}
.mk-doc{background:var(--branco);border:1px solid var(--linha);padding:14px;margin-top:8px}
.mk-doc h3{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--dourado);font-weight:600;display:flex;justify-content:space-between;align-items:center}
.mk-doc h3 button{background:none;border:0;color:var(--tinta-2);font-size:12px;letter-spacing:.04em;text-transform:none;cursor:pointer;padding:8px 0 8px 12px;margin:-8px 0}
.mk-doc p{font-size:14px;white-space:pre-wrap;margin-top:8px}.mk-doc p.v{color:var(--tinta-3)}
/* Estúdio: visão da equipe de marketing */
.mk-hero{background:var(--verde);color:var(--creme);margin:-18px -16px 0;padding:22px 16px 18px}
.mk-hero .ola{font-family:'Cormorant Garamond',serif;font-size:30px;line-height:1.1}.mk-hero .ola em{color:var(--dourado-claro)}
.mk-hero .s{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--dourado-claro);margin-bottom:6px}
.mk-aneis{display:flex;gap:18px;margin-top:16px;align-items:center}
.mk-anel{display:flex;align-items:center;gap:10px}.mk-anel svg{width:64px;height:64px;transform:rotate(-90deg)}
.mk-anel .n{font-family:'Cormorant Garamond',serif;font-size:26px;line-height:1}.mk-anel small{display:block;font-size:11px;letter-spacing:.08em;color:rgba(249,246,241,.7)}
.mk-semana{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:18px}
.mk-semana button{background:rgba(249,246,241,.07);border:1px solid rgba(249,246,241,.12);color:var(--creme);padding:8px 0 7px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
.mk-semana .d{font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:.7}.mk-semana .n{font-family:'Cormorant Garamond',serif;font-size:21px;line-height:1}
.mk-semana button.hj{border-color:var(--dourado-claro)}.mk-semana button.sel{background:var(--creme);color:var(--verde)}
.mk-semana .mk-dots{min-height:6px}.mk-semana .mk-dots i{background:var(--c)}.mk-semana .mk-dots i.pl{background:transparent;box-shadow:inset 0 0 0 1.5px var(--c)}
.mk-vcard.pl{border-left-style:dashed}.mk-vcard.pl .st:first-of-type{color:var(--dourado)}
.mk-vcard{background:var(--branco);border:1px solid var(--linha);border-left:5px solid var(--c);margin-top:8px}
.mk-vcard>button{display:block;width:100%;background:none;border:0;text-align:left;padding:13px 14px 10px;cursor:pointer}
.mk-vcard .pill{display:inline-block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:3px 9px;border-radius:12px;background:var(--c);color:#fff;font-weight:500}
.mk-vcard .st{display:inline-block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2);margin-left:6px}
.mk-vcard b{display:block;font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500;color:var(--verde);line-height:1.15;margin-top:7px}
.mk-vcard small{display:block;font-size:12.5px;color:var(--tinta-3);margin-top:3px}
.mk-vcard .ac{display:flex;border-top:1px solid var(--linha)}
.mk-vcard .ac button{flex:1;background:none;border:0;padding:11px;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--verde);font-weight:600;cursor:pointer}
.mk-vcard .ac span{flex:1;padding:11px;font-size:12px;color:var(--tinta-3);text-align:center}
.mk-dia{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--dourado);font-weight:600;margin:20px 0 2px}
.mk-ideias{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.mk-ideia{background:#f4ead2;border:0;padding:12px 12px 10px;text-align:left;cursor:pointer;min-height:110px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 0 rgba(0,0,0,.06);transform:rotate(var(--r))}
.mk-ideia b{font-size:14.5px;font-weight:500;color:var(--tinta);line-height:1.3}
.mk-ideia small{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--c);font-weight:600}
.mk-kc{padding:0}.mk-kb{display:block;width:100%;background:none;border:0;text-align:left;padding:10px 10px 8px;cursor:pointer;color:var(--tinta)}
.mk-kt{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.mk-kt .pill{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;padding:2px 8px;border-radius:10px;color:#fff}
.mk-kt .st{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta-2)}
.mk-kb b{display:block;font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:500;color:var(--verde);line-height:1.15;margin-top:6px}
.mk-kb small{display:block;font-size:12px;color:var(--tinta-2);margin-top:3px}
.mk-desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12.5px;color:var(--tinta-2);margin-top:6px}
.mk-kac{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--linha);padding:7px 10px;font-size:12px}
.mk-kac a{color:var(--dourado)}.mk-kl{display:flex;gap:12px}.mk-conta{display:block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dourado);font-weight:600;margin-top:7px}.mk-kac span{color:var(--tinta-2)}
.mk-kac button{background:none;border:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--verde);font-weight:600;cursor:pointer;padding:10px 0 10px 12px;margin:-8px 0}
.mk-salvar{position:sticky;z-index:5;margin:16px -16px 0;padding:8px 16px;background:var(--branco);border-top:1px solid var(--linha);box-shadow:0 -6px 14px rgba(0,0,0,.05)}
.mk-salvar .zap.grande{padding:12px}
.mk-erro{font-size:13px;color:var(--alerta);margin:6px 0 10px;font-weight:500;line-height:1.4}.mk-campo-erro{border-color:var(--alerta)!important;box-shadow:0 0 0 1px var(--alerta)}
.mk-qual{font-size:13px;color:var(--tinta-2);background:var(--creme-2);padding:8px 10px;margin-bottom:10px}.mk-qual b{color:var(--verde);font-weight:500}
.mk-tf{background:var(--branco);border:1px solid var(--linha);border-left:5px solid var(--c);margin-top:8px;padding:12px 12px 6px}
.mk-tf.falta{background:rgba(160,86,31,.05)}
.mk-tf>button{display:block;width:100%;background:none;border:0;text-align:left;padding:0;cursor:pointer}
.mk-tf b{display:block;font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:500;color:var(--verde);line-height:1.15}
.mk-tf small{display:block;font-size:12px;color:var(--tinta-3);margin-top:2px}
.mk-tf .lin{display:grid;grid-template-columns:96px 1fr;gap:8px;align-items:center;padding:7px 0;border-top:1px solid var(--linha);margin-top:8px}
.mk-tf .lin+.lin{margin-top:0}
.mk-tf .lin>span{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta-2)}
.mk-tf .lin>span.f{color:var(--alerta);font-weight:600}
.mk-tf select,.mk-tf input[type=date]{width:100%;min-width:0;padding:9px 8px;border:1px solid var(--linha);background:var(--branco);font:inherit;font-size:15px;color:var(--tinta)}
.mk-tf .mk-fmts span{padding:7px 11px;font-size:12.5px}
.mk-msg{font-size:12.5px;line-height:1.35;margin-bottom:6px;color:var(--tinta-2)}.mk-msg.aguarda{color:var(--dourado)}.mk-msg.erro{color:var(--alerta);font-weight:500}
.mk-rasc{background:rgba(168,139,74,.1);border-left:3px solid var(--dourado);padding:10px 12px;font-size:13.5px;margin-top:10px;display:flex;gap:10px;align-items:center;justify-content:space-between}
.mk-rasc button{flex:0 0 auto;background:none;border:1px solid var(--linha);padding:7px 10px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta-2);cursor:pointer}
.mk-rapida{display:flex;gap:8px;margin-top:12px}.mk-rapida input{flex:1;min-width:0;padding:12px;border:1px solid var(--linha);font-size:16px;background:var(--branco)}
.mk-dono{display:block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--verde);font-weight:700;margin-top:7px}.mk-dono.falta{color:var(--alerta)}
.mk-kac>span:last-child:not(.mk-kl){font-size:11px;color:var(--tinta-3)}
.mk-pas .fl{display:block;margin-top:12px}.mk-pas .fl>span{display:block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2);margin-bottom:6px}
.mk-pas select,.mk-pas input[type=date],.mk-pas input[type=time]{width:100%;padding:11px 10px;border:1px solid var(--linha);background:var(--branco);font:inherit;font-size:16px;color:var(--tinta)}
.mk-pas .mk-btns{margin-top:16px}
`;
  document.head.appendChild(s);
}

/* ---------- tela ---------- */
export function tela(P, ctx) {
  X = ctx; estilos();
  const { esc } = X;
  if (ERRO || !LISTA) {
    P.innerHTML = `<h1 class="titulo">Marketing</h1>${X.tec('<div class="config" style="margin-top:12px">O marketing ainda não foi ativado no Supabase. Rode o marketing.sql do guia.</div>')}${X.so ? sairBtn() : ''}`;
    return;
  }
  const abas = X.COORD ? ['painel', 'producao', 'ideias', 'calendario', 'estrategia'] : ['semana', 'producao', 'ideias', 'calendario', 'estrategia'];
  const vistas = X.DELEGA ? [...abas, 'tarefas'] : abas;
  if (!vistas.includes(VIEW)) VIEW = vistas[0];
  if (!MES) MES = mesK(hoje());
  if (ED) { if (location.hash !== endereco()) history.replaceState(null, '', endereco()); return formPost(P); }
  if (ED_EST) return formEst(P);
  const nomes = { painel: 'Painel', calendario: 'Calendário', producao: 'Kanban', estrategia: 'Estratégia', semana: 'Semana', ideias: 'Ideias', tarefas: 'Tarefas' };
  const seg = `<div class="seg" id="mkSeg" style="margin-top:${X.COORD ? 12 : 16}px">${abas.map(v => `<button data-v="${v}" class="${VIEW === v ? 'on' : ''}">${nomes[v]}</button>`).join('')}</div>`;
  let html = '';
  if (VIEW === 'painel') html = vPainel();
  if (VIEW === 'calendario') html = vCalendario();
  if (VIEW === 'producao') html = vProducao();
  if (VIEW === 'estrategia') html = vEstrategia();
  if (VIEW === 'semana') html = vSemana();
  if (VIEW === 'ideias') html = vIdeias();
  if (VIEW === 'tarefas') html = vTarefas();
  const topo = X.COORD
    ? `${X.so ? '' : '<button class="voltar" id="mkVoltar">‹ Empresa</button>'}<h1 class="titulo" style="margin-top:6px">Marketing <em>da Maktub</em></h1>${seg}`
    : (VIEW === 'semana' ? '' : `<h1 class="titulo">Estúdio de <em>conteúdo</em></h1>`) + (VIEW === 'semana' ? '' : seg);
  P.innerHTML = topo + html + (X.so ? sairBtn() : '');
  if (VIEW === 'semana') { const h = P.querySelector('.mk-hero'); if (h) h.insertAdjacentHTML('afterend', seg); }
  if (location.hash !== endereco()) history.replaceState(null, '', endereco());
  ligar(P);
}
const sairBtn = () => '<button class="sec" data-sair style="width:100%;margin-top:28px">Sair do app</button>';
const rerender = () => { const P = document.getElementById('pagina'); if (P && X.aba() === 'marketing') tela(P, X); if (X.sino) X.sino(); };

/* ---------- administradores: painel ---------- */
function vPainel() {
  const { esc } = X, k = mesK(hoje()), m = meta(k), pub = pubNoMes(k), reels = pub.filter(p => p.formato === 'reels');
  const aprov = LISTA.filter(p => p.status === 'aprovacao').sort(porData);
  const atras = LISTA.filter(atrasado).sort(porData);
  const prox = LISTA.filter(p => p.status !== 'publicado' && p.data_prevista && p.data_prevista >= hoje() && p.data_prevista <= maisDias(hoje(), 7)).sort(porData);
  const aFazer = LISTA.filter(p => [...EM_PRODUCAO, 'aprovacao', 'agendado'].includes(p.status));
  const noMes = LISTA.filter(p => p.status !== 'ideia' && mesK(diaPost(p)) === k);
  const porPilar = pilares().map(pl => [pl, noMes.filter(p => p.pilar_id === pl.id).length]);
  const semPilar = noMes.filter(p => !p.pilar_id).length;
  const maxP = Math.max(1, ...porPilar.map(x => x[1]), semPilar);
  const ideias = LISTA.filter(p => p.status === 'ideia' && !p.data_prevista).length; // planejado com data já conta como post
  return `
    <div class="botoes4" style="display:flex;gap:8px;margin-top:12px"><button class="zap" data-novo="producao" style="flex:1">+ Novo post</button><button class="sec" data-novo="ideia" style="flex:1">+ Ideia</button></div>
    ${atalhoTarefas()}
    <div class="numeros" style="margin-top:12px">
      <div class="num destaque"><div class="l">Publicados no mês</div><div class="v">${pub.length}${m.posts ? `<small style="font-size:.55em;color:var(--tinta-3)"> / ${m.posts}</small>` : ''}</div><div class="d">${m.posts ? Math.round(pub.length / m.posts * 100) + '% da meta' : 'meta não definida'}</div></div>
      <div class="num destaque"><div class="l">Reels no mês</div><div class="v">${reels.length}${m.reels ? `<small style="font-size:.55em;color:var(--tinta-3)"> / ${m.reels}</small>` : ''}</div><div class="d">${m.reels ? Math.round(reels.length / m.reels * 100) + '% da meta' : 'meta não definida'}</div></div>
      <div class="num ${aprov.length ? 'alerta' : ''}"><div class="l">Para aprovar</div><div class="v">${aprov.length}</div><div class="d">${exigir() ? 'aprovação obrigatória' : 'aprovação opcional'}</div></div>
      <div class="num"><div class="l">Postagens a fazer</div><div class="v">${aFazer.length}</div><div class="d">em produção, aprovação ou agendadas</div></div>
    </div>
    <div class="secao">Para você aprovar</div>
    ${aprov.length ? aprov.map(cardAprovar).join('') : '<div class="vazio">Nada esperando aprovação.</div>'}
    ${atras.length ? `<div class="secao">Atrasados</div><div class="mk-lista">${atras.map(linha).join('')}</div>` : ''}
    ${gravPend().length ? `<div class="secao">Gravações pendentes</div><div class="mk-lista">${gravPend().map(linhaGrav).join('')}</div>` : ''}
    <div class="secao">Próximos 7 dias <button data-v="calendario">Calendário ›</button></div>
    ${prox.length ? `<div class="mk-lista">${prox.map(linha).join('')}</div>` : '<div class="vazio">Nada programado para os próximos dias.</div>'}
    <section class="bloco"><h2>Pilares em ${mesNome(k).split(' ')[0].toLowerCase()}</h2>
      ${porPilar.length || semPilar ? porPilar.map(([pl, n]) => `<div class="mk-barra"><span>${esc(pl.titulo)}</span><span class="t"><i style="width:${n / maxP * 100}%;background:${pl.cor || CORES[0]}"></i></span><span class="q">${n}</span></div>`).join('') + (semPilar ? `<div class="mk-barra"><span style="color:var(--tinta-3)">Sem pilar</span><span class="t"><i style="width:${semPilar / maxP * 100}%;background:var(--tinta-3)"></i></span><span class="q">${semPilar}</span></div>` : '') : '<div class="vazio">Cadastre os pilares em Estratégia para ver o equilíbrio dos temas.</div>'}
      ${pilares().length && porPilar.some(x => !x[1]) ? `<div class="sub">Sem post no mês: ${porPilar.filter(x => !x[1]).map(x => esc(x[0].titulo)).join(', ')}.</div>` : ''}
    </section>
    <div class="pend" style="margin-top:12px"><button data-v="ideias"><span>Banco de ideias</span><span>${ideias ? `<b>${ideias}</b>` : ''}<span class="seta">›</span></span></button></div>`;
}
const gravPend = () => LISTA.filter(p => etapa(p) === 'gravacao' && equipeG(p).length).sort((a, b) => String(a.gravacao_data || a.data_prevista || '9999').localeCompare(String(b.gravacao_data || b.data_prevista || '9999')));
function linhaGrav(p) {
  const { esc } = X, prazo = p.gravacao_data || p.data_prevista, atr = prazo && prazo < hoje();
  return `<button class="mk-lin" data-p="${p.id}"><i style="background:${atr ? 'var(--alerta)' : 'var(--dourado)'}"></i><span class="t">${esc(p.titulo)}<small>${esc(nomesG(p) || 'Equipe')}${prazo ? ' · até ' + dm(prazo) : ''}${atr ? ' · atrasado' : ''}</small></span><span class="seta">›</span></button>`;
}
const porData = (a, b) => String(a.data_prevista || '9999').localeCompare(String(b.data_prevista || '9999'));
function linha(p) {
  const { esc } = X, pl = est(p.pilar_id);
  const det = [contaN(p), fmtN(p), diaPost(p) ? dm(diaPost(p)) + (p.hora ? ' ' + hhmm(p.hora) : '') : 'sem data', pl ? pl.titulo : '', primeiro(nomeT(p.responsavel_id))].filter(Boolean).join(' · ');
  const tag = `<span class="tag ${atrasado(p) ? 'alerta' : GR_TAG[grupo(p)]}">${atrasado(p) ? 'Atrasado' : grupo(p) === 'andamento' ? stNome(p) : grNome(p)}</span>`;
  return `<button class="mk-lin" data-p="${p.id}"><i style="background:${corP(p)}"></i><span class="t">${esc(p.titulo)}<small>${esc(det)}</small></span>${tag}</button>`;
}
function links(p) {
  const L = [[p.link_arquivo, 'Abrir pasta'], [p.link_post, 'Ver no Instagram']].filter(x => urlOk(x[0]));
  return L.length ? `<div class="mk-links">${L.map(([u, t]) => `<a href="${X.esc(urlOk(u))}" target="_blank" rel="noopener">${t} ›</a>`).join('')}</div>` : '';
}
function cardAprovar(p) {
  const { esc } = X, pl = est(p.pilar_id);
  return `<div class="mk-aprov">
    <div style="display:flex;justify-content:space-between;gap:8px"><span class="tag" style="margin:0;border-color:${corP(p)};color:${corP(p)}">${fmtN(p)}</span><span class="sub" style="margin:0">${p.data_prevista ? dm(p.data_prevista) + (p.hora ? ' às ' + esc(hhmm(p.hora)) : '') : 'sem data'}</span></div>
    <button data-p="${p.id}" style="background:none;border:0;text-align:left;padding:4px 0;cursor:pointer;margin-top:4px;display:block"><div class="nome">${esc(p.titulo)}</div></button>
    <div class="sub">${[pl ? pl.titulo : '', est(p.campanha_id) ? est(p.campanha_id).titulo : '', p.responsavel_id ? 'por ' + primeiro(nomeT(p.responsavel_id)) : ''].filter(Boolean).map(esc).join(' · ')}</div>
    ${p.legenda ? `<div class="leg">${esc(p.legenda)}</div>` : ''}
    ${links(p) || '<div class="sub">Sem link da arte.</div>'}
    ${AJ === p.id ? `<label class="fl"><span>O que precisa ajustar</span><textarea id="mkAjTxt" rows="3"></textarea></label><div class="mk-btns"><button class="sec" data-ajc>Cancelar</button><button class="zap" data-ajok="${p.id}">Devolver com ajuste</button></div>`
      : X.ADMIN ? `<div class="mk-btns"><button class="sec" data-aj="${p.id}">Pedir ajuste</button><button class="zap" data-aprovar="${p.id}">Aprovar</button></div>` : '<div class="sub">Aguardando a aprovação da Isadora ou do Matheus.</div>'}
  </div>`;
}

/* ---------- administradores: calendário ---------- */
function vCalendario() {
  const { esc } = X, k = MES, [y, mm] = k.split('-').map(Number);
  const prim = (new Date(y, mm - 1, 1).getDay() + 6) % 7, dias = new Date(y, mm, 0).getDate();
  const doMes = vis().filter(p => mesK(diaPost(p)) === k);
  if (DIA && mesK(DIA) !== k) DIA = null;
  const chip = (p) => { const c = atrasado(p) ? 'atrasado' : grupo(p); return `<button class="mk-chip ${c}" data-p="${p.id}" title="${esc(contaN(p) + ': ' + p.titulo)}" style="--c:${contaCor(p)};background:${contaCor(p)}">${c === 'publicado' ? '✓ ' : c === 'atrasado' ? '! ' : ''}<span class="f">[${fmtN(p).toUpperCase()}] </span>${esc(p.titulo)}</button>`; };
  let cel = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => `<div class="h">${d}</div>`).join('');
  for (let i = 0; i < prim; i++) cel += '<div class="d fora"></div>';
  for (let d = 1; d <= dias; d++) {
    const iso = `${k}-${String(d).padStart(2, '0')}`;
    const L = doMes.filter(p => diaPost(p) === iso).sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));
    cel += `<div class="d ${iso === hoje() ? 'hj' : ''} ${iso === DIA ? 'sel' : ''}" data-dia="${iso}"><span class="n">${d}</span>${L.slice(0, 3).map(chip).join('')}${L.length > 3 ? `<span class="mk-mais">+${L.length - 3}</span>` : ''}</div>`;
  }
  const resto = (prim + dias) % 7; if (resto) for (let i = resto; i < 7; i++) cel += '<div class="d fora"></div>';
  const doDia = DIA ? doMes.filter(p => diaPost(p) === DIA) : [];
  const semData = vis().filter(p => p.status !== 'publicado' && !p.data_prevista);
  return `${filtroConta()}
    <div class="mesnav" id="mkMes" style="margin-top:12px"><button data-n="-1" aria-label="Mês anterior">‹</button><span>${mesNome(k)}</span><button data-n="1" aria-label="Próximo mês">›</button></div>
    <div class="mk-cm">${cel}</div>
    <div class="mk-leg">${CONTAS.map(c => `<span><i style="background:${c[2]}"></i>${c[1]}</span>`).join('')}</div>
    <div class="mk-leg" style="margin-top:4px"><span>Contorno: ideia</span><span>Cor cheia: em andamento</span><span>✓ publicado</span><span>! atrasado</span></div>
    <div class="sub">Toque no post para abrir. Toque no espaço vazio do dia para ver a lista e criar um post nele.</div>
    ${DIA ? `<div class="secao">${new Date(DIA + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} <button data-novo-dia="${DIA}">+ Post neste dia</button></div>${doDia.length ? `<div class="mk-lista">${doDia.sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || ''))).map(linha).join('')}</div>` : '<div class="vazio">Nenhum post neste dia.</div>'}` : ''}
    ${semData.length ? `<div class="secao">Sem data definida</div><div class="mk-lista">${semData.map(linha).join('')}</div>` : ''}`;
}

/* ---------- Kanban: uma coluna por etapa, com o dono de cada etapa ---------- */
function vProducao() {
  const col = (k) => vis().filter(p => etapa(p) === k).sort(porData);
  return `
    <div style="display:flex;gap:8px;margin-top:12px"><button class="zap" data-novo="producao" style="flex:1">+ Novo post</button><button class="sec" data-novo="ideia" style="flex:1">+ Ideia</button></div>
    ${filtroConta()}
    <div class="kdica" style="margin-top:12px">Arraste para o lado para ver as etapas. Para avançar, toque no botão do card: você escolhe quem assume a próxima etapa.</div>
    <div class="kanban" data-mk="1" style="margin-top:8px">${COLS.filter(([k]) => k !== 'aprovacao' || exigir()).map(([k, n]) => { const L = col(k); return `<div class="kcol" data-ket="${k}"><h3>${n} <small>${L.length}</small></h3>${L.map(kcard).join('') || '<div class="vazio" style="padding:6px 2px">Nada aqui.</div>'}</div>`; }).join('')}</div>
    <div class="sub">Depois de postado, o post sai do Kanban e fica no Calendário. Ideias sem data ficam na aba Ideias.</div>`;
}
function kcard(p) {
  const { esc } = X, k = etapa(p), quando = diaPost(p), dono = donoTxt(p);
  const pg = k === 'gravacao' ? prazoGrav(p) : null, atrG = pg && pg < hoje();
  const data = k === 'gravacao' ? (pg ? 'gravar até ' + dm(pg) : 'sem prazo de gravação') + (quando ? ' · post em ' + dm(quando) : '') : quando ? 'post em ' + dm(quando) + (p.hora ? ' às ' + hhmm(p.hora) : '') : 'sem data';
  return `<div class="kc mk-kc" data-kid="${p.id}" style="border-left:5px solid ${contaCor(p)};background:${contaFundo(p)}"><button data-p="${p.id}" class="mk-kb">
      <span class="mk-kt"><span class="pill" style="background:${corP(p)}">${ehVideo(p) ? 'Vídeo' : 'Estático'} · ${fmtN(p)}</span>${k === 'producao' ? `<span class="st">${ehVideo(p) ? 'Roteiro' : 'Arte'}</span>` : ''}${atrasado(p) || atrG ? '<span class="st" style="color:#8a4618;font-weight:600">atrasado</span>' : ''}</span>
      <span class="mk-conta" style="color:${contaCor(p)}">${contaN(p)}${collabN(p) ? ' · ' + collabN(p) : ''}</span>
      <b>${esc(p.titulo)}</b>
      <span class="mk-dono ${dono ? '' : 'falta'}">${dono ? 'Com ' + esc(dono) : 'Sem responsável'}</span>
      <small>${esc(data)}</small>
      ${p.ajuste && ['producao', 'edicao'].includes(k) ? `<div class="mk-ajuste">${esc(p.ajuste)}</div>` : p.obs ? `<span class="mk-desc">${esc(p.obs)}</span>` : ''}</button>
    <div class="mk-kac"><span class="mk-kl">${p.link_referencia ? `<a href="${esc(urlOk(p.link_referencia))}" target="_blank" rel="noopener">Referência ›</a>` : ''}${p.link_bruto ? `<a href="${esc(urlOk(p.link_bruto))}" target="_blank" rel="noopener">Bruto ›</a>` : ''}${p.link_arquivo ? `<a href="${esc(urlOk(p.link_arquivo))}" target="_blank" rel="noopener">Pasta ›</a>` : '<span>Sem pasta</span>'}</span>${acao(p)}</div></div>`;
}
// arrastar no Kanban: para a próxima etapa abre a escolha do responsável; para trás devolve; pular etapa não pode
export function mover(id, k) {
  const p = LISTA && LISTA.find(x => x.id === id); if (!p) return;
  const at = etapa(p); if (k === at) return;
  const c = caminho(p), ia = c.indexOf(at), ik = c.indexOf(k);
  if (ik < 0) { X.aviso(`Post estático não passa por ${colNome(k)}.`); return; }
  if (ik > ia) { if (ik === ia + 1) passar(id); else X.aviso('Avance uma etapa por vez, escolhendo quem assume.'); return; }
  if (!possoMexer(p)) { X.aviso(at === 'aprovacao' ? 'Só a Isadora ou o Matheus mexem no que está em aprovação.' : `Esse post está com ${donoTxt(p) || 'outra pessoa'}.`); return; }
  mudar(id, { status: k, ...(c.indexOf('gravacao') >= ik ? { gravado_em: null } : {}) }, `Voltou para ${colNome(k)}, com ${donoTxt({ ...p, status: k }) || 'ninguém escalado'}.`);
}
// quem posta marca que o post já está no Instagram (abre o post para colar o link)
const jaPostei = (p) => `<button data-publicar="${p.id}">Já postei</button>`;
const ROT_PROX = (p, n) => ({ producao: ehVideo(p) ? 'Fazer roteiro' : 'Criar arte', gravacao: 'Pronto para gravar', edicao: 'Gravado, mandar para edição', aprovacao: 'Enviar para aprovação', agendado: etapa(p) === 'aprovacao' ? 'Aprovar' : 'Pronto, agendar' }[n] || 'Avançar');
// botão de próxima etapa: só para o dono da etapa, a coordenação e os sócios (aprovação só os sócios)
function acao(p) {
  const n = proxima(p); if (!n) return '';
  if (!possoMexer(p)) return `<span>${etapa(p) === 'aprovacao' ? 'Aguardando os sócios' : donoTxt(p) ? 'Com ' + X.esc(donoTxt(p)) : 'Sem responsável'}</span>`;
  if (n === 'publicado') return jaPostei(p);
  return `<button data-passar="${p.id}">${ROT_PROX(p, n)}</button>`;
}
/* passar para a próxima etapa: obriga a escolher quem assume (e o prazo, na gravação) */
function passar(id) {
  const p = LISTA.find(x => x.id === id); if (!p) return;
  const n = proxima(p); if (!n) return;
  if (n === 'publicado') { abrirPost(id, { status: 'publicado' }); X.aviso('Cole o link do post no Instagram e salve.'); return; }
  if (!possoMexer(p)) { X.aviso(etapa(p) === 'aprovacao' ? 'Só a Isadora ou o Matheus aprovam.' : `Esse post está com ${donoTxt(p) || 'outra pessoa'}.`); return; }
  const { esc } = X, pessoas = TIME.filter(t => t.user_id);
  const sel = (nome, atual) => `<select name="${nome}"><option value="">Escolha</option>${pessoas.map(t => `<option value="${t.user_id}" ${atual === t.user_id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select>`;
  let campos = '';
  if (n === 'producao') campos = `<label class="fl"><span>${ehVideo(p) ? 'Quem faz o roteiro' : 'Quem cria a arte'}</span>${sel('resp', p.responsavel_id)}</label>`;
  if (n === 'gravacao') campos = `<div class="fl"><span>Quem grava (pode marcar os dois)</span><div class="mk-fmts">${pessoas.map(t => `<label style="--c:var(--verde)"><input type="checkbox" name="grava" value="${t.user_id}" ${equipeG(p).includes(t.user_id) ? 'checked' : ''}><span>${esc(primeiro(t.nome))}</span></label>`).join('')}</div></div>
      <label class="fl"><span>Gravar até (obrigatório)</span><input type="date" name="prazo" value="${esc(p.gravacao_data || '')}"></label>`;
  if (n === 'edicao') campos = `<label class="fl"><span>Quem edita</span>${sel('resp', p.edicao_por)}</label>`;
  if (n === 'aprovacao') campos = '<div class="sub">Vai para a Isadora e o Matheus aprovarem. Se precisar de ajuste, volta com o pedido escrito.</div>';
  if (n === 'agendado') campos = `<label class="fl"><span>Quem posta</span>${sel('resp', p.postagem_por)}</label>
      <div class="duas-col"><label class="fl"><span>Data do post</span><input type="date" name="data" value="${esc(p.data_prevista || '')}"></label><label class="fl"><span>Horário</span><input type="time" name="hora" value="${esc(hhmm(p.hora))}"></label></div>`;
  let f = document.getElementById('mkPassar');
  if (!f) { f = document.createElement('div'); f.id = 'mkPassar'; f.className = 'folha'; document.body.appendChild(f); }
  f.innerHTML = `<div class="folha-fundo" data-pasx></div><form class="folha-caixa mk-pas" novalidate>
    <div class="folha-tit">${etapa(p) === 'aprovacao' ? 'Aprovar' : 'Passar para ' + colNome(n)}</div>
    <div class="nome" style="font-size:17px">${esc(p.titulo)}</div>
    <div class="sub" style="margin-top:4px">${esc(colNome(etapa(p) === 'ideia' ? 'ideia' : etapa(p)))} › ${esc(colNome(n))}</div>
    ${campos}
    <div class="mk-msg erro" id="mkPasMsg" hidden></div>
    <div class="mk-btns"><button type="button" class="sec" data-pasx>Cancelar</button><button type="submit" class="zap">${n === 'agendado' && etapa(p) === 'aprovacao' ? 'Aprovar' : 'Confirmar'}</button></div></form>`;
  f.hidden = false;
  const fecha = () => { f.hidden = true; };
  f.querySelectorAll('[data-pasx]').forEach(b => b.onclick = fecha);
  const fm = f.querySelector('form'), el = fm.elements;
  const erro = (t) => { const m = document.getElementById('mkPasMsg'); m.textContent = t; m.hidden = false; };
  fm.onsubmit = async (ev) => {
    ev.preventDefault();
    const reg = { status: n };
    if (n === 'producao') { if (!el.resp.value) return erro('Escolha quem assume a criação.'); reg.responsavel_id = el.resp.value; }
    if (n === 'gravacao') {
      const eq = [...fm.querySelectorAll('[name=grava]:checked')].map(c => c.value);
      if (!eq.length) return erro('Escolha quem grava.');
      if (!el.prazo.value) return erro('Toda gravação precisa de prazo. Escolha a data.');
      Object.assign(reg, { gravacao_equipe: eq, gravacao_por: eq[0], gravacao_data: el.prazo.value, gravado_em: null });
    }
    if (n === 'edicao') { if (!el.resp.value) return erro('Escolha quem edita.'); reg.edicao_por = el.resp.value; if (!p.gravado_em) reg.gravado_em = new Date().toISOString(); }
    if (n === 'aprovacao') reg.ajuste = null;
    if (n === 'agendado') {
      if (!el.resp.value) return erro('Escolha quem posta.');
      if (!el.data.value) return erro('Escolha a data do post. É nela que a pessoa posta.');
      Object.assign(reg, { postagem_por: el.resp.value, data_prevista: el.data.value, hora: el.hora.value || null, ajuste: null });
    }
    fecha();
    const quem = n === 'aprovacao' ? 'os sócios' : donoTxt({ ...p, ...reg, status: n, gravado_em: n === 'gravacao' ? null : reg.gravado_em || p.gravado_em });
    mudar(id, reg, etapa(p) === 'aprovacao' ? `Aprovado. Agendado com ${quem}.` : `Foi para ${colNome(n)}, com ${quem}.`);
  };
}

/* ---------- equipe de marketing: semana ---------- */
function anel(v, total, cor) {
  const r = 27, c = 2 * Math.PI * r, f = total ? Math.min(1, v / total) : 0;
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(249,246,241,.15)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${cor}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * f} ${c}"/></svg>`;
}
function vSemana() {
  const { esc } = X, h = hoje(), k = mesK(h), m = meta(k), pub = pubNoMes(k), reels = pub.filter(p => p.formato === 'reels');
  const dias = [...Array(7)].map((_, i) => maisDias(h, i));
  // post planejado com data também é post da semana; só a ideia solta (sem data) fica no Kanban
  const ativos = LISTA.filter(p => p.status !== 'ideia' || p.data_prevista);
  const naSemana = (d) => ativos.filter(p => diaPost(p) === d);
  const hora = new Date().getHours();
  // cada post aparece uma vez só, no primeiro bloco em que se encaixa (com a data no card)
  const visto = new Set(), unico = (L) => L.filter(p => !visto.has(p.id) && visto.add(p.id));
  const criar = unico(LISTA.filter(p => p.responsavel_id === X.meuId && etapa(p) === 'producao').sort(porData));
  const gravar = unico(gravPend().filter(p => equipeG(p).includes(X.meuId)));
  const editar = unico(LISTA.filter(p => p.edicao_por === X.meuId && etapa(p) === 'edicao').sort(porData));
  const postar = unico(LISTA.filter(p => p.postagem_por === X.meuId && etapa(p) === 'agendado').sort(porData));
  const ajustes = unico(LISTA.filter(p => EM_PRODUCAO.includes(p.status) && p.ajuste).sort(porData));
  const atras = unico(LISTA.filter(atrasado).sort(porData));
  const semData = LISTA.filter(p => grupo(p) === 'andamento' && !p.data_prevista && !visto.has(p.id));
  const mostrar = DIA && dias.includes(DIA) ? [DIA] : dias;
  const bloco = (t, L, extra, data) => L.length ? `<div class="mk-dia" style="color:var(--alerta)">${t}</div>${L.map(p => vcard(p, data ? data(p) : true) + (extra ? extra(p) : '')).join('')}` : '';
  // no topo verde, a cor da conta Maktub sumia no fundo: as bolinhas usam o dourado; planejado fica vazado
  const bola = (p) => `<i class="${grupo(p) === 'planejado' ? 'pl' : ''}" style="--c:${contaDe(p) === 'maktub' ? 'var(--dourado-claro)' : contaCor(p)}"></i>`;
  const dia = (d) => d === h ? 'Hoje' : d === maisDias(h, 1) ? 'Amanhã' : SEMANA[new Date(d + 'T12:00:00').getDay()] + ' ' + dm(d);
  // com um dia escolhido no topo, mostra tudo daquele dia; na semana inteira, só o que não apareceu nos blocos acima
  const doDia = mostrar.map(d => { const L = naSemana(d).filter(p => DIA || !visto.has(p.id)).sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || ''))); return L.length ? `<div class="mk-dia">${dia(d)}</div>${L.map(p => vcard(p)).join('')}` : ''; }).join('');
  return `
    <div class="mk-hero">
      <div class="s">Estúdio de conteúdo</div>
      <div class="ola">${hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'}${X.eu ? ', <em>' + esc(X.eu) + '</em>' : ''}.</div>
      <div class="mk-aneis">
        <div class="mk-anel">${anel(pub.length, m.posts, '#c9a96e')}<div><div class="n">${pub.length}${m.posts ? '/' + m.posts : ''}</div><small>posts no mês</small></div></div>
        <div class="mk-anel">${anel(reels.length, m.reels, '#f2ece1')}<div><div class="n">${reels.length}${m.reels ? '/' + m.reels : ''}</div><small>reels no mês</small></div></div>
      </div>
      <div class="mk-semana">${dias.map(d => { const L = naSemana(d), dd = new Date(d + 'T12:00:00'); return `<button data-sdia="${d}" class="${d === h ? 'hj' : ''} ${d === DIA ? 'sel' : ''}"><span class="d">${SEMANA[dd.getDay()]}</span><span class="n">${dd.getDate()}</span><span class="mk-dots">${L.slice(0, 4).map(bola).join('')}</span></button>`; }).join('')}</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px"><button class="zap" data-novo="producao" style="flex:1">+ Novo post</button><button class="sec" data-novo="ideia" style="flex:1">+ Ideia</button></div>
    ${atalhoTarefas()}
    ${DIA ? '' : bloco('Para você criar', criar, null, p => (ehVideo(p) ? 'roteiro' : 'arte') + (diaPost(p) ? ' · post em ' + dm(diaPost(p)) : '')) + bloco('Para você gravar', gravar, null, p => (p.gravacao_data ? 'gravar até ' + dm(p.gravacao_data) + ' · ' : '') + (diaPost(p) ? 'post em ' + dm(diaPost(p)) : '')) + bloco('Para você editar', editar) + bloco('Para você postar', postar) + bloco('Ajustes pedidos', ajustes) + bloco('Atrasados', atras)}
    ${doDia || `<div class="mk-dia">${DIA ? dia(DIA) : 'Próximos 7 dias'}</div><div class="vazio" style="padding:6px 0">${!DIA && visto.size ? 'Nada mais programado. O que é seu está nos blocos acima.' : 'Nada programado.'}</div>`}
    ${!DIA && semData.length ? `<div class="mk-dia">Em andamento sem data</div><div class="mk-lista">${semData.map(linha).join('')}</div>` : ''}
    ${DIA && dias.includes(DIA) ? '<button class="sec" data-sdia="" style="width:100%;margin-top:12px">Ver a semana inteira</button>' : ''}`;
}
// comData: nos blocos "Para você..." e "Atrasados" o card não está debaixo de um dia, então mostra a data
// (ou o texto de data recebido, como o prazo de gravação)
function vcard(p, comData) {
  const { esc } = X, pl = est(p.pilar_id), a = acao(p), q = diaPost(p);
  const quando = typeof comData === 'string' ? comData : comData && q ? dm(q) + (p.hora ? ' às ' + hhmm(p.hora) : '') : p.hora ? 'às ' + hhmm(p.hora) : '';
  const posta = p.postagem_por && p.postagem_por !== X.meuId ? 'posta: ' + primeiro(nomeT(p.postagem_por)) : '';
  return `<div class="mk-vcard ${grupo(p) === 'planejado' ? 'pl' : ''}" style="--c:${corP(p)};background:${contaFundo(p)}"><button data-p="${p.id}"><span class="pill">${fmtN(p)}</span><span class="st">${stNome(p)}</span><span class="st" style="color:${contaCor(p)};font-weight:600">${contaN(p)}</span>
    <b>${esc(p.titulo)}</b><small>${[quando, pl ? pl.titulo : '', est(p.campanha_id) ? est(p.campanha_id).titulo : '', primeiro(nomeT(p.responsavel_id)), posta].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</small>
    ${p.ajuste && EM_PRODUCAO.includes(p.status) ? `<div class="mk-ajuste">${esc(p.ajuste)}</div>` : ''}</button>
    ${a ? `<div class="ac">${a}</div>` : ''}</div>`;
}

/* ---------- tarefas: quem faz cada parte de cada post (coordenação e quem distribui as tarefas) ---------- */
const atalhoTarefas = () => {
  if (!X.DELEGA) return '';
  const n = LISTA.filter(p => postDaFila(p) && falta(p).length).length;
  return `<div class="pend" style="margin-top:10px"><button data-v="tarefas"><span>Distribuir tarefas</span><span>${n ? `<small style="font-size:12px;color:var(--alerta);margin-right:6px">${n} sem alguém escalado</small>` : ''}<span class="seta">›</span></span></button></div>`;
};
// posts que já são trabalho (a ideia sem data fica no Kanban até alguém pegar)
const postDaFila = (p) => p.status !== 'publicado' && (p.status !== 'ideia' || p.data_prevista);
// partes que ainda não têm ninguém: roteiro ou arte, gravação e edição (só vídeo) e postagem
function falta(p) {
  const L = [];
  if (!p.responsavel_id) L.push(ehVideo(p) ? 'roteiro' : 'arte');
  if (ehVideo(p) && !equipeG(p).length) L.push('gravação');
  if (ehVideo(p) && TEM_EDICAO() && !p.edicao_por) L.push('edição');
  if (!p.postagem_por) L.push('postagem');
  return L;
}
function vTarefas() {
  const { esc } = X, pessoas = TIME.filter(t => t.user_id);
  const todos = vis().filter(postDaFila).sort(porData), L = SO_FALTA ? todos.filter(p => falta(p).length) : todos;
  const opc = (v) => pessoas.map(t => `<option value="${t.user_id}" ${v === t.user_id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('');
  const lin = (rot, vazio, html) => `<div class="lin"><span class="${vazio ? 'f' : ''}">${rot}</span>${html}</div>`;
  const card = (p) => {
    const vid = ehVideo(p), q = diaPost(p);
    return `<div class="mk-tf ${falta(p).length ? 'falta' : ''}" style="--c:${contaCor(p)}" data-tfcard="${p.id}">
      <button data-p="${p.id}"><b>${esc(p.titulo)}</b><small>${[fmtN(p), contaN(p), q ? 'post em ' + dm(q) + (p.hora ? ' às ' + hhmm(p.hora) : '') : 'sem data', grNome(p)].map(esc).join(' · ')}</small></button>
      ${lin(vid ? 'Roteiro' : 'Arte', !p.responsavel_id, `<select data-tf="${p.id}" data-campo="responsavel_id"><option value="">Ninguém</option>${opc(p.responsavel_id)}</select>`)}
      ${vid ? lin('Grava', !equipeG(p).length, `<div class="mk-fmts">${pessoas.map(t => `<label style="--c:${contaCor(p)}"><input type="checkbox" data-tfg="${p.id}" value="${t.user_id}" ${equipeG(p).includes(t.user_id) ? 'checked' : ''}><span>${esc(primeiro(t.nome))}</span></label>`).join('')}</div>`) : ''}
      ${vid ? lin('Gravar até', false, `<input type="date" data-tf="${p.id}" data-campo="gravacao_data" value="${esc(p.gravacao_data || '')}">`) : ''}
      ${vid && TEM_EDICAO() ? lin('Edita', !p.edicao_por, `<select data-tf="${p.id}" data-campo="edicao_por"><option value="">Ninguém</option>${opc(p.edicao_por)}</select>`) : ''}
      ${lin('Posta', !p.postagem_por, `<select data-tf="${p.id}" data-campo="postagem_por"><option value="">Ninguém</option>${opc(p.postagem_por)}</select>`)}
    </div>`;
  };
  return `
    <h2 class="titulo" style="font-size:26px;margin-top:16px">Distribuir <em>tarefas</em></h2>
    <div class="sub">Escolha quem faz cada parte de cada post. Salva na hora, e a pessoa vê na Semana dela, em "Para você...".</div>
    ${!TEM_EDICAO() ? X.tec('<div class="config" style="margin-top:10px">Para escolher quem edita cada vídeo, rode o marketing-tarefas.sql no Supabase.</div>') : ''}
    ${filtroConta()}
    <div class="mk-fmts" id="mkFalta" style="margin-top:8px"><label style="--c:var(--verde)"><input type="radio" name="sofalta" value="" ${SO_FALTA ? '' : 'checked'}><span>Todos (${todos.length})</span></label><label style="--c:var(--alerta)"><input type="radio" name="sofalta" value="1" ${SO_FALTA ? 'checked' : ''}><span>Falta alguém (${todos.filter(p => falta(p).length).length})</span></label></div>
    ${L.length ? L.map(card).join('') : `<div class="vazio" style="margin-top:10px">${SO_FALTA ? 'Todos os posts já têm alguém em cada parte.' : 'Nenhum post em andamento.'}</div>`}
    <div class="sub">Aparecem os posts com data ainda não publicados. Ideias sem data ficam no Kanban.</div>`;
}
async function escalar(id, campos, ok) {
  const { data, error } = await X.sb.from('marketing_posts').update(campos).eq('id', id).select().single();
  if (error) { X.aviso('Não salvou: ' + error.message); rerender(); return; }
  LISTA[LISTA.findIndex(x => x.id === id)] = data; X.limpo && X.limpo(); X.aviso(ok);
  // atualiza só o destaque do card (sem redesenhar a tela inteira e perder a rolagem)
  const c = document.querySelector(`[data-tfcard="${id}"]`); if (c) c.classList.toggle('falta', falta(data).length > 0);
}

/* ---------- equipe de marketing: ideias ---------- */
function vIdeias() {
  const { esc } = X, L = LISTA.filter(p => p.status === 'ideia').sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
  return `
    <div class="sub" style="margin-top:12px">Anote a ideia na hora. Quando for produzir, toque em Produzir, escolha quem cria e ela entra no Kanban, em Criação.</div>
    <div class="mk-fmts" id="mkIdFmt" style="margin-top:10px">${Object.entries(FMT).map(([k, [n, c]]) => `<label style="--c:${c}"><input type="radio" name="idfmt" value="${k}" ${ID_FMT === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
    <div class="mk-rapida"><input id="mkIdTxt" placeholder="Nova ideia de post" maxlength="160"><button class="zap" id="mkIdOk" style="flex:0 0 auto;min-width:0">Salvar</button></div>
    ${L.length ? `<div class="mk-ideias">${L.map((p, i) => `<div style="display:flex;flex-direction:column"><button class="mk-ideia" data-p="${p.id}" style="--r:${[-1, .8, -.5, 1.2][i % 4]}deg;--c:${corP(p)}"><b>${esc(p.titulo)}</b><small>${fmtN(p)}${est(p.pilar_id) ? ' · ' + esc(est(p.pilar_id).titulo) : ''}</small></button><button class="sec" data-passar="${p.id}" style="margin-top:6px;padding:8px">Produzir</button></div>`).join('')}</div>` : '<div class="vazio" style="margin-top:10px">Nenhuma ideia guardada ainda.</div>'}`;
}

/* ---------- estratégia ---------- */
function vEstrategia() {
  const { esc } = X, k = MES, m = meta(k), pub = pubNoMes(k), reels = pub.filter(p => p.formato === 'reels');
  const camp = campanhas().sort((a, b) => String(b.inicio || '').localeCompare(String(a.inicio || '')));
  const ativa = (c) => c.ativo && (!c.fim || c.fim >= hoje());
  return `
    ${X.ADMIN ? `<section class="bloco"><h2>Aprovação</h2><label class="fc"><input type="checkbox" id="mkExigir" ${exigir() ? 'checked' : ''}><span>Todo post passa pela aprovação dos sócios (Isadora ou Matheus) antes de ser agendado</span></label></section>` : ''}
    <div class="secao">Metas do mês</div>
    <div class="mesnav" id="mkMes"><button data-n="-1" aria-label="Mês anterior">‹</button><span>${mesNome(k)}</span><button data-n="1" aria-label="Próximo mês">›</button></div>
    <div class="numeros" style="margin-top:8px">
      <div class="num destaque"><div class="l">Posts publicados</div><div class="v">${pub.length}${m.posts ? ' / ' + m.posts : ''}</div><div class="d">${m.posts ? Math.round(pub.length / m.posts * 100) + '% da meta' : 'sem meta'}</div></div>
      <div class="num destaque"><div class="l">Reels publicados</div><div class="v">${reels.length}${m.reels ? ' / ' + m.reels : ''}</div><div class="d">${m.reels ? Math.round(reels.length / m.reels * 100) + '% da meta' : 'sem meta'}</div></div>
    </div>
    ${X.COORD ? `<form class="bloco form" id="mkMeta"><div class="duas-col">${X.campo('posts', 'Meta de posts no mês', m.posts ?? '', 'number', 'min="0"')}${X.campo('reels', 'Meta de reels no mês', m.reels ?? '', 'number', 'min="0"')}</div><button class="sec" type="submit" style="width:100%;margin-top:10px">Salvar metas de ${mesNome(k).split(' ')[0].toLowerCase()}</button><div class="sub">O realizado conta sozinho pelos posts marcados como publicados. Os reels também contam nos posts.</div></form>` : `<div class="sub">Metas definidas pela Isadora e pelo Matheus. O realizado conta sozinho pelos posts publicados.</div>`}
    <div class="secao">Pilares de conteúdo <button data-novo-est="pilar">+ Pilar</button></div>
    ${pilares().length ? `<div class="mk-pilares">${pilares().map(pl => { const n = LISTA.filter(p => p.pilar_id === pl.id && p.status === 'publicado' && mesK(p.publicado_em) === k).length; return `<button class="mk-pilar" data-est="${pl.id}" style="--c:${pl.cor || CORES[0]}"><b>${esc(pl.titulo)}</b><small>${n} publicado${n === 1 ? '' : 's'} no mês${pl.descricao ? ' · ' + esc(pl.descricao.slice(0, 40)) + (pl.descricao.length > 40 ? '...' : '') : ''}</small></button>`; }).join('')}</div>` : '<div class="vazio">Os pilares são os temas fixos da Maktub. Cada post fica ligado a um, e o painel mostra se algum tema está sendo esquecido.</div>'}
    <div class="secao">Campanhas <button data-novo-est="campanha">+ Campanha</button></div>
    ${camp.length ? `<div class="mk-lista">${camp.map(c => { const n = LISTA.filter(p => p.campanha_id === c.id).length; return `<button class="mk-lin" data-est="${c.id}"><i style="background:${ativa(c) ? 'var(--dourado)' : 'var(--tinta-3)'}"></i><span class="t">${esc(c.titulo)}<small>${[c.inicio ? dm(c.inicio) + (c.fim ? ' a ' + dm(c.fim) : '') : '', n + ' post' + (n === 1 ? '' : 's')].filter(Boolean).join(' · ')}</small></span><span class="tag ${ativa(c) ? 'ouro' : ''}">${ativa(c) ? 'Ativa' : 'Encerrada'}</span></button>`; }).join('')}</div>` : '<div class="vazio">Quando houver uma ação específica (lançamento, temporada, promoção da Gestão de Milhas), crie a campanha e ligue os posts a ela.</div>'}
    <div class="secao">Documento da marca</div>
    ${DOCS.map(([ch, t, d]) => { const x = EST.find(e => e.chave === ch); return `<div class="mk-doc"><h3>${t}<button data-doc="${ch}">${x && x.descricao ? 'Editar' : 'Escrever'} ›</button></h3>${x && x.descricao ? `<p>${esc(x.descricao)}</p>` : `<p class="v">${d}</p>`}</div>`; }).join('')}`;
}

/* ---------- formulário do post ---------- */
function formPost(P) {
  const { esc, campo } = X, nova = ED === 'nova';
  const base = nova ? { titulo: '', formato: 'reels', status: 'ideia', conta: FCONTA || 'maktub', collab: [], responsavel_id: X.COORD ? null : X.meuId } : LISTA.find(x => x.id === ED);
  if (!base) { ED = null; return tela(P, X); }
  const p = { ...base, ...(PRE || {}) };
  const pode = (s) => s === 'publicado' || X.ADMIN || !exigir() || ['ideia', ...EM_PRODUCAO, 'aprovacao'].includes(s) || base.aprovado_em || base.status === s;
  const marketing = TIME.filter(t => t.user_id);
  P.innerHTML = `<button class="voltar" id="mkVoltarF">‹ Marketing</button><h1 class="titulo" style="margin-top:6px">${nova ? (p.status === 'ideia' ? 'Nova <em>ideia</em>' : 'Novo <em>post</em>') : 'Editar <em>post</em>'}</h1>
    ${!nova && base.ajuste && EM_PRODUCAO.includes(base.status) ? `<div class="mk-ajuste"><b>Ajuste pedido:</b> ${esc(base.ajuste)}</div>` : ''}
    ${!nova && base.aprovado_em ? `<div class="sub">Aprovado por ${esc(primeiro(nomeT(base.aprovado_por)) || 'administrador')} em ${new Date(base.aprovado_em).toLocaleDateString('pt-BR')}.</div>` : ''}
    <div class="seg" id="mkAbasF">${[['geral', 'Geral'], ['briefing', 'Briefing'], ['arquivos', 'Arquivos e postagem']].map(([k, n], i) => `<button type="button" data-aba="${k}" class="${i ? '' : 'on'}">${n}</button>`).join('')}</div>
    <form class="bloco form" id="mkF" novalidate style="--kc:${contaCor(p)}">
      <div data-tab="geral">
      ${campo('titulo', 'Título ou tema do post', p.titulo, 'text', 'maxlength="160"')}
      <div class="fl"><span>Conta do Instagram</span><div class="mk-fmts">${CONTAS.map(([k, n, c]) => `<label style="--c:${c}"><input type="radio" name="conta" value="${k}" ${contaDe(p) === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <div class="fl"><span>Collab com</span><div class="mk-fmts">${COLLAB.map(([k, n]) => `<label style="--c:var(--kc)"><input type="checkbox" name="collab" value="${k}" ${(p.collab || []).includes(k) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <div class="fl"><span>Tipo de conteúdo</span><div class="mk-fmts">${[['1', 'Vídeo'], ['0', 'Estático']].map(([v, n]) => `<label style="--c:var(--kc)"><input type="radio" name="video" value="${v}" ${(ehVideo(p) ? '1' : '0') === v ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <div class="fl"><span>Formato no Instagram</span><div class="mk-fmts">${Object.entries(FMT).map(([k, [n]]) => `<label style="--c:var(--kc)"><input type="radio" name="formato" value="${k}" ${p.formato === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <div class="fl" id="mkReelsTipo"><span>Tipo de Reels</span><div class="mk-fmts">${[['0', 'Reels normal'], ['1', 'Reels teste']].map(([v, n]) => `<label style="--c:var(--kc)"><input type="radio" name="reels_teste" value="${v}" ${(p.reels_teste ? '1' : '0') === v ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <label class="fl"><span>Etapa</span><select name="status"></select></label>
      <div class="duas-col">${campo('data_prevista', 'Data de publicação', p.data_prevista, 'date')}${campo('hora', 'Horário', p.hora, 'time')}</div>
      <label class="fl"><span id="mkRespRot">${ehVideo(p) ? 'Quem faz o roteiro' : 'Quem faz a arte'}</span><select name="responsavel_id"><option value="">Ninguém definido</option>${marketing.map(t => `<option value="${t.user_id}" ${p.responsavel_id === t.user_id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></label>
      <div class="fl"><span>Quem grava (pode marcar mais de uma pessoa)</span><div class="mk-fmts">${marketing.map(t => `<label style="--c:var(--kc)"><input type="checkbox" name="gravacao_equipe" value="${t.user_id}" ${equipeG(p).includes(t.user_id) ? 'checked' : ''}><span>${esc(t.nome)}</span></label>`).join('') || '<span class="sub">Ninguém da equipe cadastrado.</span>'}</div></div>
      <div class="duas-col">${campo('gravacao_data', 'Gravar até', p.gravacao_data, 'date')}<span></span></div>
      ${equipeG(p).length ? `<div class="sub" style="margin:-4px 0 8px">${p.gravado_em ? 'Gravado em ' + dm(String(p.gravado_em).slice(0, 10)) + '.' : 'Gravação pendente. Quem foi escalado vê no app e marca quando gravar.'}</div>` : ''}
      ${TEM_EDICAO() ? `<label class="fl" id="mkEdita"><span>Quem edita</span><select name="edicao_por"><option value="">Ninguém escalado</option>${marketing.map(t => `<option value="${t.user_id}" ${p.edicao_por === t.user_id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></label>` : ''}
      <label class="fl"><span>Quem posta</span><select name="postagem_por"><option value="">Ninguém escalado</option>${marketing.map(t => `<option value="${t.user_id}" ${p.postagem_por === t.user_id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></label>
      ${p.postagem_por && p.status !== 'publicado' ? '<div class="sub" style="margin:-4px 0 8px">A pessoa vê o post em "Para você postar" e recebe uma notificação no celular 2 horas antes do horário (sem horário definido, às 8h do dia). Depois de postar, ela mesma toca em Já postei e cola o link do Instagram.</div>' : ''}
      <div class="duas-col">
        <label class="fl"><span>Pilar</span><select name="pilar_id"><option value="">Nenhum</option>${pilares().map(pl => `<option value="${pl.id}" ${p.pilar_id === pl.id ? 'selected' : ''}>${esc(pl.titulo)}</option>`).join('')}</select></label>
        <label class="fl"><span>Campanha</span><select name="campanha_id"><option value="">Nenhuma</option>${campanhas().filter(c => c.ativo || c.id === p.campanha_id).map(c => `<option value="${c.id}" ${p.campanha_id === c.id ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('')}</select></label>
      </div>
      </div>
      <div data-tab="briefing" hidden>
      <div class="sub" style="margin-top:0">O que é o post e em que ele deve se inspirar.</div>
      <label class="fl"><span>Descrição</span><textarea name="obs" rows="6" placeholder="Do que se trata o post, mensagem principal, o que precisa aparecer">${esc(p.obs || '')}</textarea></label>
      ${campo('link_referencia', 'Post de referência (link)', p.link_referencia, 'url', 'placeholder="https://www.instagram.com/..."')}
      ${p.link_referencia ? `<div class="mk-links" style="margin-top:-4px"><a href="${esc(urlOk(p.link_referencia))}" target="_blank" rel="noopener">Abrir referência ›</a></div>` : ''}
      ${campo('link_bruto', 'Material bruto (link da pasta)', p.link_bruto, 'url', 'placeholder="https://drive.google.com/..."')}
      ${p.link_bruto ? `<div class="mk-links" style="margin-top:-4px"><a href="${esc(urlOk(p.link_bruto))}" target="_blank" rel="noopener">Abrir material bruto ›</a></div>` : ''}
      </div>
      <div data-tab="arquivos" hidden>
      <div class="sub" style="margin-top:0">Tudo o que a pessoa precisa na hora de postar.</div>
      ${campo('link_arquivo', 'Pasta de arquivos (link da pasta do post no Drive)', p.link_arquivo, 'url', 'placeholder="https://drive.google.com/..."')}
      ${p.link_arquivo ? `<div class="mk-links" style="margin-top:-4px"><a href="${esc(urlOk(p.link_arquivo))}" target="_blank" rel="noopener">Abrir pasta ›</a></div>` : ''}
      <label class="fl"><span>Legenda</span><textarea name="legenda" rows="5">${esc(p.legenda || '')}</textarea></label>
      <label class="fl"><span>Como postar</span><textarea name="instrucoes_post" rows="5" placeholder="Ordem das fotos, capa, música, marcações, hashtags, localização, colaboração...">${esc(p.instrucoes_post || '')}</textarea></label>
      <div id="mkPub">${PRE && PRE.status === 'publicado' && !nova ? `<div class="mk-qual">Marcando como postado: <b>${esc(p.titulo)}</b></div>` : ''}${campo('link_post', 'Link do post no Instagram', p.link_post, 'url', 'placeholder="https://www.instagram.com/..."')}
        ${campo('publicado_em', 'Publicado em', p.publicado_em || (p.status === 'publicado' ? hoje() : ''), 'date')}</div>
      </div>
      <div class="mk-salvar" style="bottom:calc(${navVisivel() ? 'var(--barra-h)' : '0px'} + env(safe-area-inset-bottom))"><div class="mk-msg" id="mkMsg" hidden></div><button class="zap grande" type="submit" id="mkSalvar">${nova ? 'Salvar' : 'Salvar alterações'}</button></div>
      ${!nova ? '<button class="sec grande" type="button" id="mkExcluir" style="margin-top:10px;width:100%">Excluir post</button>' : ''}
    </form>`;
  const f = document.getElementById('mkF'), el = f.elements;
  let fmtAnt = p.formato;
  const vidSel = () => (f.querySelector('[name=video]:checked') || {}).value === '1';
  const marcarVid = (on) => { const r = f.querySelector(`[name=video][value="${on ? 1 : 0}"]`); if (r) r.checked = true; };
  let ABA_F = 'geral';
  const abaF = (k) => { ABA_F = k; f.querySelectorAll('[data-tab]').forEach(d => { d.hidden = d.dataset.tab !== k; }); document.querySelectorAll('#mkAbasF button').forEach(b => b.classList.toggle('on', b.dataset.aba === k)); };
  document.querySelectorAll('#mkAbasF button').forEach(b => b.onclick = () => abaF(b.dataset.aba));
  const etapas = () => {
    const vid = vidSel(), atual = el.status.value || p.status;
    const L = vid ? ETAPAS_VIDEO : ETAPAS_ARTE;
    const sel = L.includes(atual) ? atual : (atual === 'gravacao' || atual === 'edicao' ? 'producao' : L[0]);
    el.status.innerHTML = L.map(k => `<option value="${k}" ${sel === k ? 'selected' : ''} ${pode(k) ? '' : 'disabled'}>${k === 'agendado' ? 'Aprovado e agendado' : stNome({ video: vid }, k)}${pode(k) ? '' : ' (precisa de aprovação)'}</option>`).join('');
  };
  etapas();
  f.querySelectorAll('[name=formato]').forEach(r => r.addEventListener('change', () => { const novo = f.querySelector('[name=formato]:checked').value; if ((novo === 'reels') !== (fmtAnt === 'reels')) marcarVid(novo === 'reels'); fmtAnt = novo; etapas(); }));
  f.querySelectorAll('[name=video]').forEach(r => r.addEventListener('change', etapas));
  const mostrar = () => {
    const st = el.status.value, fmt = f.querySelector('[name=formato]:checked').value;
    document.getElementById('mkPub').hidden = st !== 'publicado';
    document.getElementById('mkReelsTipo').hidden = fmt !== 'reels';
    if (document.getElementById('mkEdita')) document.getElementById('mkEdita').hidden = !vidSel();
    document.getElementById('mkRespRot').textContent = vidSel() ? 'Quem faz o roteiro' : 'Quem faz a arte';
    if (st === 'publicado' && !el.publicado_em.value) el.publicado_em.value = hoje();
  };
  mostrar(); f.addEventListener('change', mostrar);
  f.querySelectorAll('[name=conta]').forEach(r => r.addEventListener('change', () => f.style.setProperty('--kc', contaCor({ conta: r.value }))));
  document.getElementById('mkVoltarF').onclick = () => fecharPost();
  const idR = nova ? null : base.id;
  // rascunho no celular: guarda a cada digitação; ao abrir de novo o mesmo post, devolve o que não foi salvo
  const guardar = () => { clearTimeout(T_RASC); T_RASC = setTimeout(() => { try { localStorage.setItem(RASC(idR), JSON.stringify({ em: Date.now(), base: carimbo(base), aba: ABA_F, v: valores(f) })); } catch (_) {} }, 300); };
  const naoSalvo = () => { msg('Você tem alterações que ainda não foram salvas.', 'aguarda'); };
  f.addEventListener('input', () => { guardar(); naoSalvo(); });
  f.addEventListener('change', () => { guardar(); naoSalvo(); });
  const r0 = lerRasc(idR);
  if (r0 && r0.v && r0.base === carimbo(base)) {
    aplicar(f, r0.v, etapas); mostrar(); abaF(r0.aba || 'geral');
    f.style.setProperty('--kc', contaCor({ conta: (f.querySelector('[name=conta]:checked') || {}).value }));
    f.insertAdjacentHTML('beforebegin', `<div class="mk-rasc" id="mkRasc">Voltou o que você tinha preenchido e não salvou (${new Date(r0.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}). Confira e toque em Salvar.<button type="button" id="mkRascX">Descartar</button></div>`);
    document.getElementById('mkRascX').onclick = () => { apagarRasc(idR); X.limpo && X.limpo(); formPost(P); };
    naoSalvo(); X.preenchido && X.preenchido(f);
  } else if (r0) apagarRasc(idR);
  // "Já postei": abre direto na aba do link do Instagram e conta como alteração (se sair sem salvar, o app avisa)
  if (!nova && PRE && PRE.status && PRE.status !== base.status && !(r0 && r0.base === carimbo(base))) {
    if (PRE.status === 'publicado') { abaF('arquivos'); setTimeout(() => { const l = el.link_post; if (l) { l.scrollIntoView({ block: 'center' }); l.focus(); } }, 50); }
    naoSalvo(); X.preenchido && X.preenchido(f);
  }
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = (n) => (el[n].value || '').trim() || null;
    const equipe = [...f.querySelectorAll('[name=gravacao_equipe]:checked')].map(c => c.value);
    const fmtSel = f.querySelector('[name=formato]:checked').value;
    const reg = { titulo: v('titulo'), formato: f.querySelector('[name=formato]:checked').value, status: el.status.value, video: vidSel(), data_prevista: v('data_prevista'), hora: v('hora'),
      pilar_id: v('pilar_id'), campanha_id: v('campanha_id'), responsavel_id: v('responsavel_id'), gravacao_equipe: equipe, gravacao_por: equipe[0] || null, postagem_por: v('postagem_por'), gravacao_data: v('gravacao_data'), legenda: v('legenda'), link_arquivo: v('link_arquivo'),
      link_post: v('link_post'), publicado_em: el.status.value === 'publicado' ? v('publicado_em') : null, obs: v('obs'), link_referencia: v('link_referencia'), link_bruto: v('link_bruto'), instrucoes_post: v('instrucoes_post'),
      ...(TEM_EDICAO() ? { edicao_por: vidSel() ? v('edicao_por') : null } : {}),
      conta: (f.querySelector('[name=conta]:checked') || {}).value || 'maktub', collab: [...f.querySelectorAll('[name=collab]:checked')].map(c => c.value), reels_teste: fmtSel === 'reels' && (f.querySelector('[name=reels_teste]:checked') || {}).value === '1' };
    if (!reg.titulo) { abaF('geral'); msg('Escreva o título do post.', 'erro'); el.titulo.focus(); return; }
    if (reg.status === 'gravacao' && !equipe.length) { abaF('geral'); msg('Escolha quem grava antes de mandar para a gravação.', 'erro'); return; }
    for (const [k, nome, aba] of LINKS) {
      if (!reg[k]) continue;
      const u = urlOk(reg[k]);
      if (!pareceLink(u)) { abaF(aba); erroCampo(el[k], 'Esse link não abre. No Drive ou no Instagram, toque em Copiar link e cole aqui.'); msg(`${nome} precisa de correção.`, 'erro'); return; }
      reg[k] = u; el[k].value = u;
    }
    if (reg.status === 'aprovacao' && base.status !== 'aprovacao') reg.ajuste = null;
    msg('Salvando...', 'aguarda');
    const r = await salvar(nova ? null : base.id, reg);
    if (!r) return;
    apagarRasc(idR); X.limpo && X.limpo();
    X.aviso(nova ? (reg.status === 'ideia' ? 'Ideia guardada.' : 'Post criado.') : 'Post atualizado.'); fecharPost();
  };
  function erroCampo(i, t) {
    const l = i.closest('label'); let e = l.nextElementSibling;
    if (!e || !e.classList.contains('mk-erro')) { l.insertAdjacentHTML('afterend', '<div class="mk-erro"></div>'); e = l.nextElementSibling; }
    e.textContent = t; i.classList.add('mk-campo-erro'); i.focus(); i.scrollIntoView({ block: 'center' });
    i.addEventListener('input', () => { e.remove(); i.classList.remove('mk-campo-erro'); }, { once: true });
  }
  function msg(t, tipo) { const m = document.getElementById('mkMsg'); if (!m) return; m.textContent = t; m.className = 'mk-msg ' + (tipo || ''); m.hidden = !t; }
  if (document.getElementById('mkExcluir')) document.getElementById('mkExcluir').onclick = async () => {
    const b = document.getElementById('mkExcluir');
    if (CONF !== base.id) { CONF = base.id; b.textContent = 'Toque de novo para excluir'; return; }
    CONF = null;
    const { error } = await X.sb.from('marketing_posts').delete().eq('id', base.id);
    if (error) { X.aviso('Não excluiu: ' + error.message); return; }
    LISTA = LISTA.filter(x => x.id !== base.id); apagarRasc(base.id); X.limpo && X.limpo(); X.aviso('Post excluído.'); fecharPost();
  };
}
const navVisivel = () => { const n = document.getElementById('nav'); return !!n && !n.hidden; };
// valores do formulário para o rascunho (escolhas e caixas viram listas)
function valores(f) {
  const v = {};
  [...f.elements].forEach(e => { if (!e.name) return; if (e.type === 'radio') { if (e.checked) v[e.name] = e.value; } else if (e.type === 'checkbox') { v[e.name] = v[e.name] || []; if (e.checked) v[e.name].push(e.value); } else v[e.name] = e.value; });
  return v;
}
// devolve o rascunho: primeiro as escolhas (definem as etapas possíveis), depois textos e listas
function aplicar(f, v, etapas) {
  const campos = (n) => f.querySelectorAll(`[name="${n}"]`);
  Object.entries(v).forEach(([n, x]) => campos(n).forEach(i => { if (i.type === 'radio') i.checked = i.value === x; else if (i.type === 'checkbox') i.checked = [].concat(x || []).includes(i.value); }));
  etapas();
  Object.entries(v).forEach(([n, x]) => campos(n).forEach(i => { if (i.type !== 'radio' && i.type !== 'checkbox' && typeof x === 'string') i.value = x; }));
}
async function salvar(id, reg) {
  const b = document.getElementById('mkSalvar'); if (b) b.disabled = true;
  const r = id ? await X.sb.from('marketing_posts').update(reg).eq('id', id).select().single() : await X.sb.from('marketing_posts').insert(reg).select().single();
  if (b) b.disabled = false;
  if (r.error) {
    const t = /aprovação/.test(r.error.message) ? r.error.message : 'Não salvou: ' + r.error.message;
    X.aviso(t);
    const m = document.getElementById('mkMsg'); if (m) { m.textContent = t + ' O que você preencheu continua aqui; tente salvar de novo.'; m.className = 'mk-msg erro'; m.hidden = false; }
    return null;
  }
  if (id) LISTA[LISTA.findIndex(x => x.id === id)] = r.data; else LISTA.push(r.data);
  return r.data;
}

/* ---------- formulário de pilar, campanha e documento ---------- */
function formEst(P) {
  const { esc, campo } = X;
  const doc = DOCS.find(d => d[0] === ED_EST.chave);
  const nova = !ED_EST.id;
  const e = nova ? { tipo: ED_EST.tipo, titulo: doc ? doc[1] : '', cor: CORES[pilares().length % CORES.length], ativo: true, chave: ED_EST.chave || null, descricao: '' } : est(ED_EST.id);
  if (!e) { ED_EST = null; return tela(P, X); }
  const rot = { pilar: 'pilar', campanha: 'campanha', documento: 'documento' }[e.tipo];
  P.innerHTML = `<button class="voltar" id="mkVoltarE">‹ Estratégia</button><h1 class="titulo" style="margin-top:6px">${doc ? esc(doc[1]) : (nova ? 'Nov' + (e.tipo === 'pilar' ? 'o' : 'a') + ' <em>' + rot + '</em>' : 'Editar <em>' + rot + '</em>')}</h1>
    <form class="bloco form" id="mkE">
      ${doc ? `<div class="sub" style="margin-top:0">${doc[2]}</div>` : campo('titulo', e.tipo === 'pilar' ? 'Nome do pilar' : 'Nome da campanha', e.titulo, 'text', 'required maxlength="80"')}
      <label class="fl"><span>${doc ? 'Texto' : e.tipo === 'pilar' ? 'O que entra nesse pilar' : 'Objetivo e ideia central'}</span><textarea name="descricao" rows="${doc ? 10 : 4}">${esc(e.descricao || '')}</textarea></label>
      ${e.tipo === 'pilar' ? `<div class="fl"><span>Cor</span><div class="mk-cores">${CORES.map(c => `<label style="--c:${c}"><input type="radio" name="cor" value="${c}" ${e.cor === c ? 'checked' : ''}><span></span></label>`).join('')}</div></div>` : ''}
      ${e.tipo === 'campanha' ? `<div class="duas-col">${campo('inicio', 'Início', e.inicio, 'date')}${campo('fim', 'Fim', e.fim, 'date')}</div><label class="fc"><input type="checkbox" name="ativo" ${e.ativo ? 'checked' : ''}><span>Campanha ativa</span></label>` : ''}
      <button class="zap grande" type="submit" style="margin-top:14px;width:100%">Salvar</button>
      ${!nova && !doc ? '<button class="sec grande" type="button" id="mkExcluirE" style="margin-top:10px;width:100%">Excluir</button><div class="sub">Os posts ligados a ele continuam, só ficam sem ' + (e.tipo === 'pilar' ? 'pilar.' : 'campanha.') + '</div>' : ''}
    </form>`;
  const f = document.getElementById('mkE'), el = f.elements;
  document.getElementById('mkVoltarE').onclick = () => { if (!X.sairOk()) return; ED_EST = null; X.limpo(); rerender(); scrollTo(0, 0); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const reg = { tipo: e.tipo, descricao: el.descricao.value.trim() || null };
    if (doc) { reg.titulo = doc[1]; reg.chave = doc[0]; } else { reg.titulo = el.titulo.value.trim(); if (!reg.titulo) return; }
    if (e.tipo === 'pilar') { const c = f.querySelector('[name=cor]:checked'); reg.cor = c ? c.value : CORES[0]; if (nova) reg.ordem = pilares().length; }
    if (e.tipo === 'campanha') { reg.inicio = el.inicio.value || null; reg.fim = el.fim.value || null; reg.ativo = el.ativo.checked; }
    const r = nova ? await X.sb.from('marketing_estrategia').insert(reg).select().single() : await X.sb.from('marketing_estrategia').update(reg).eq('id', e.id).select().single();
    if (r.error) { X.aviso('Não salvou: ' + r.error.message); return; }
    if (nova) EST.push(r.data); else EST[EST.findIndex(x => x.id === e.id)] = r.data;
    ED_EST = null; X.aviso('Salvo.'); rerender(); scrollTo(0, 0);
  };
  if (document.getElementById('mkExcluirE')) document.getElementById('mkExcluirE').onclick = async () => {
    const b = document.getElementById('mkExcluirE');
    if (CONF !== e.id) { CONF = e.id; b.textContent = 'Toque de novo para excluir'; return; }
    CONF = null;
    const { error } = await X.sb.from('marketing_estrategia').delete().eq('id', e.id);
    if (error) { X.aviso('Não excluiu: ' + error.message); return; }
    EST = EST.filter(x => x.id !== e.id);
    LISTA.forEach(p => { if (p.pilar_id === e.id) p.pilar_id = null; if (p.campanha_id === e.id) p.campanha_id = null; });
    ED_EST = null; X.aviso('Excluído.'); rerender();
  };
}

/* ---------- ações ---------- */
async function mudar(id, campos, ok) {
  const { data, error } = await X.sb.from('marketing_posts').update(campos).eq('id', id).select().single();
  if (error) { X.aviso(/aprovação/.test(error.message) ? error.message : 'Não salvou: ' + error.message); return; }
  LISTA[LISTA.findIndex(x => x.id === id)] = data; X.aviso(ok); rerender();
}
async function guardarEst(chave, tipo, valores, titulo) {
  const atual = EST.find(e => e.chave === chave);
  const r = atual ? await X.sb.from('marketing_estrategia').update({ valores }).eq('id', atual.id).select().single()
    : await X.sb.from('marketing_estrategia').insert({ tipo, chave, titulo, valores }).select().single();
  if (r.error) { X.aviso('Não salvou: ' + r.error.message); return false; }
  if (atual) EST[EST.findIndex(e => e.id === atual.id)] = r.data; else EST.push(r.data);
  return true;
}

function ligar(P) {
  const q = (s) => P.querySelectorAll(s), by = (id) => document.getElementById(id);
  if (by('mkVoltar')) by('mkVoltar').onclick = () => X.ir('empresa');
  q('[data-v]').forEach(b => b.onclick = () => { if (VIEW === b.dataset.v || !X.sairOk()) return; VIEW = b.dataset.v; DIA = null; history.pushState(null, '', endereco()); rerender(); scrollTo(0, 0); });
  q('[data-p]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); abrirPost(b.dataset.p); });
  q('[data-novo]').forEach(b => b.onclick = () => abrirPost('nova', { status: b.dataset.novo }));
  q('[data-novo-dia]').forEach(b => b.onclick = () => abrirPost('nova', { status: 'producao', data_prevista: b.dataset.novoDia }));
  q('[data-mudar]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); const st = b.dataset.st; mudar(b.dataset.mudar, { status: st, ...(st === 'aprovacao' ? { ajuste: null } : {}) }, { producao: 'Foi para o roteiro ou a criação.', edicao: 'Foi para a edição.', aprovacao: 'Enviado para aprovação dos sócios.', agendado: 'Marcado como agendado.' }[st] || 'Atualizado.'); });
  q('[name=fconta]').forEach(r => r.onchange = () => { FCONTA = r.value; rerender(); });
  q('[name=sofalta]').forEach(r => r.onchange = () => { SO_FALTA = !!r.value; rerender(); });
  q('[data-tf]').forEach(i => i.onchange = () => { const c = i.dataset.campo, v = i.value || null, nome = primeiro(nomeT(v)); escalar(i.dataset.tf, { [c]: v }, c === 'gravacao_data' ? 'Prazo de gravação salvo.' : v ? `Salvo: ${nome} ${{ responsavel_id: 'faz essa parte', edicao_por: 'edita', postagem_por: 'posta' }[c]}.` : 'Salvo: ninguém escalado.'); });
  q('[data-tfg]').forEach(i => i.onchange = () => { const id = i.dataset.tfg, L = [...P.querySelectorAll(`[data-tfg="${id}"]:checked`)].map(x => x.value); escalar(id, { gravacao_equipe: L, gravacao_por: L[0] || null }, L.length ? `Salvo: grava ${L.map(u => primeiro(nomeT(u))).join(' e ')}.` : 'Salvo: ninguém grava.'); });
  q('[data-mover]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); mover(b.dataset.mover, b.dataset.g); });
  q('[data-gravar]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); const pp = LISTA.find(x => x.id === b.dataset.gravar); if (!pp) return;
    if (!equipeG(pp).length) { abrirPost(pp.id, { status: 'gravacao' }); X.aviso('Escolha quem grava e até quando, e salve.'); return; }
    mudar(pp.id, { status: 'gravacao' }, `Foi para a gravação com ${nomesG(pp)}.`); });
  q('[data-aprovar]').forEach(b => b.onclick = () => passar(b.dataset.aprovar));
  q('[data-passar]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); passar(b.dataset.passar); });
  q('[data-publicar]').forEach(b => b.onclick = () => { abrirPost(b.dataset.publicar, { status: 'publicado' }); X.aviso('Cole o link do post no Instagram e salve.'); });
  q('[data-aj]').forEach(b => b.onclick = () => { AJ = b.dataset.aj; rerender(); const t = by('mkAjTxt'); if (t) t.focus(); });
  q('[data-ajc]').forEach(b => b.onclick = () => { AJ = null; rerender(); });
  q('[data-ajok]').forEach(b => b.onclick = () => { const t = (by('mkAjTxt').value || '').trim(); if (!t) { X.aviso('Escreva o que precisa ajustar.'); return; } AJ = null; { const pp = LISTA.find(x => x.id === b.dataset.ajok) || {}; mudar(b.dataset.ajok, { status: voltaAjuste(pp), ajuste: t }, ehVideo(pp) ? 'Devolvido para a edição com o ajuste.' : 'Devolvido para a criação com o ajuste.'); } });
  q('[data-dia]').forEach(b => b.onclick = () => { DIA = b.dataset.dia; rerender(); });
  q('[data-sdia]').forEach(b => b.onclick = () => { DIA = b.dataset.sdia === DIA || !b.dataset.sdia ? null : b.dataset.sdia; rerender(); });
  q('[data-est]').forEach(b => b.onclick = () => { ED_EST = { id: b.dataset.est }; rerender(); scrollTo(0, 0); });
  q('[data-novo-est]').forEach(b => b.onclick = () => { ED_EST = { tipo: b.dataset.novoEst }; rerender(); scrollTo(0, 0); });
  q('[data-doc]').forEach(b => b.onclick = () => { const x = EST.find(e => e.chave === b.dataset.doc); ED_EST = x ? { id: x.id, chave: x.chave } : { tipo: 'documento', chave: b.dataset.doc }; rerender(); scrollTo(0, 0); });
  if (by('mkMes')) by('mkMes').onclick = (e) => { const b = e.target.closest('button'); if (b) { MES = mesMais(MES, +b.dataset.n); DIA = null; rerender(); } };
  if (by('mkExigir')) by('mkExigir').onchange = async (e) => { const ok = await guardarEst('config', 'config', { ...((cfg() || {}).valores || {}), aprovacao: e.target.checked }, 'Configuração do marketing'); if (ok) X.aviso(e.target.checked ? 'Aprovação obrigatória ligada.' : 'Aprovação obrigatória desligada.'); rerender(); };
  if (by('mkMeta')) by('mkMeta').onsubmit = async (ev) => {
    ev.preventDefault(); const el = ev.target.elements, n = (x) => x.value === '' ? null : Math.max(0, Math.round(+x.value));
    if (await guardarEst('meta-' + MES, 'meta', { posts: n(el.posts), reels: n(el.reels) }, 'Meta ' + MES)) { X.aviso('Metas salvas.'); rerender(); }
  };
  q('[name=idfmt]').forEach(r => r.onchange = () => { ID_FMT = r.value; });
  if (by('mkIdOk')) {
    const salvarIdeia = async () => {
      const t = by('mkIdTxt').value.trim(); if (!t) return;
      by('mkIdOk').disabled = true;
      const { data, error } = await X.sb.from('marketing_posts').insert({ titulo: t, formato: ID_FMT, status: 'ideia', responsavel_id: X.meuId }).select().single();
      by('mkIdOk').disabled = false;
      if (error) { X.aviso('Não salvou: ' + error.message); return; }
      LISTA.push(data); X.aviso('Ideia guardada.'); rerender(); const i = document.getElementById('mkIdTxt'); if (i) i.focus();
    };
    by('mkIdOk').onclick = salvarIdeia;
    by('mkIdTxt').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); salvarIdeia(); } };
  }
}
