// Maktub Go: Atividades da equipe.
// "Dia": linha do tempo de tudo o que cada pessoa fez no app num dia, e onde cada atendimento parou.
// "Tempos": quanto tempo, de fato, cada etapa do funil leva, medido pelo log (a partir do dia em que o log entrou no ar).
// Os dados vêm da tabela log_atividades, alimentada por gatilhos no banco (log_atividades.sql).

let VISTA = 'dia', DIA = null, QUEM = null, PERIODO = 30, CACHE = {};

const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hora = (ts) => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
function dur(ms) {
  if (ms == null || !isFinite(ms)) return '-';
  const min = ms / 6e4;
  if (min < 1) return 'menos de 1 min';
  if (min < 60) return Math.round(min) + ' min';
  const h = min / 60;
  if (h < 48) return h.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' h';
  return (h / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' dias';
}
const mediana = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const media = (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;

const AREAS = {
  atendimentos: ['Comercial', 'o atendimento'], leads: ['Comercial', 'o lead do site'], cotacoes_link: ['Comercial', 'o link de cotação'],
  propostas: ['Comercial', 'a proposta'], emissoes: ['Operação', 'a emissão'], agenda_reunioes: ['Agenda', 'a reunião'],
  reunioes_internas: ['Agenda', 'a reunião interna'], pessoas: ['Clientes', 'a ficha'], pessoas_vinculos: ['Clientes', 'o vínculo'],
  documentos: ['Clientes', 'o documento'], roteiros: ['Acervo', 'o roteiro'], fornecedores: ['Fornecedores', 'o fornecedor'],
  fornecedor_avaliacoes: ['Fornecedores', 'a avaliação do fornecedor'], pagamentos_feitos: ['Financeiro', 'o pagamento'],
  despesas: ['Financeiro', 'a despesa'], despesas_fixas: ['Financeiro', 'a despesa fixa'], notas: ['Financeiro', 'a nota fiscal'],
  clientes: ['Gestão', 'o cliente da Gestão'], programas_milhas: ['Gestão', 'o programa de milhas'], extrato_milhas: ['Gestão', 'o lançamento do extrato'],
  historico_economia: ['Gestão', 'a economia gerada'], gestao_tarefas: ['Gestão', 'a tarefa da implantação'], gestao_textos: ['Gestão', 'o texto padrão'],
  reunioes: ['Gestão', 'a ata de reunião'], operacoes_milhas: ['Sócios', 'a operação de milhas'], marketing_posts: ['Marketing', 'o post'],
  marketing_estrategia: ['Marketing', 'a estratégia'], configuracoes: ['Empresa', 'as configurações']
};
const area = (l) => l.acao === 'evento' ? (AREAS[l.tabela] || [l.tabela === 'checkin' ? 'Operação' : 'Outros'])[0] : (AREAS[l.tabela] || ['Outros'])[0];
const objeto = (l) => (AREAS[l.tabela] || [null, 'o registro'])[1];
const campoNome = (k) => String(k).replace(/_app$/, '').replace(/_id$/, '').replace(/_/g, ' ');
const valor = (v) => v === true ? 'sim' : v === false ? 'não' : v === null || v === undefined || v === '' ? 'vazio' : typeof v === 'object' ? 'atualizado' : String(v).slice(0, 60);

function frase(l) {
  const r = l.rotulo ? ' ' + l.rotulo : '';
  const m = l.mudancas || {};
  if (l.acao === 'evento') return l.detalhe || 'Registrou uma ação' + r;
  if (l.acao === 'criou') {
    if (l.tabela === 'atendimentos') return `Abriu o atendimento${r}${m.etapa ? ' em ' + m.etapa : ''}${m.produto ? ' (' + m.produto + ')' : ''}`;
    if (l.tabela === 'emissoes') return `Lançou a venda${r}`;
    return `Criou ${objeto(l)}${r}`;
  }
  if (l.acao === 'excluiu') return `Excluiu ${objeto(l)}${r}`;
  const k = Object.keys(m);
  const p = (c) => m[c] && m[c].para;
  if (l.tabela === 'atendimentos') {
    if (m.resultado && ['Fechou', 'Não fechou'].includes(p('resultado'))) return `Marcou${r} como ${p('resultado')}${p('motivo_perda') ? ' (' + p('motivo_perda') + ')' : ''}`;
    if (m.etapa) return `Moveu${r} de ${m.etapa.de || 'início'} para ${p('etapa')}`;
    if (m.responsavel_id) return `Trocou o responsável de${r}`;
    if (m.proximo_passo || m.proximo_passo_data) return `Definiu o próximo passo de${r}${p('proximo_passo') ? ': ' + p('proximo_passo') : ''}`;
  }
  if (l.tabela === 'emissoes') {
    const ck = k.find(c => /^checkin_(ida|volta)$/.test(c));
    if (ck) return `${p(ck) ? 'Fez' : 'Desmarcou'} o check-in da ${ck.slice(8)} de${r}`;
    if (m.pago) return p('pago') ? `Deu baixa no recebimento de${r}` : `Desfez o recebimento de${r}`;
    if (m.pago_fornecedor) return p('pago_fornecedor') ? `Pagou o fornecedor da venda de${r}` : `Desfez o pagamento ao fornecedor de${r}`;
    if (m.nota_gerada) return `Marcou a nota fiscal de${r}`;
  }
  if (l.tabela === 'leads' && m.responsavel_id) return `Assumiu o lead${r}`;
  if (l.tabela === 'marketing_posts' && m.status) return `Moveu o post${r} para ${p('status')}`;
  if (m.status) return `Mudou o status de ${objeto(l)}${r} para ${valor(p('status'))}`;
  const nomes = k.slice(0, 4).map(campoNome).join(', ') + (k.length > 4 ? ' e mais ' + (k.length - 4) : '');
  return `Alterou ${objeto(l)}${r}${nomes ? ': ' + nomes : ''}`;
}

async function buscar(sb, ini, fim, quem) {
  const ch = [ini, fim, quem].join('|');
  if (CACHE[ch] && Date.now() - CACHE[ch].t < 60e3) return CACHE[ch];
  const { data, error } = await sb.rpc('log_periodo', { p_ini: ini, p_fim: fim, p_user: quem || null, p_tabela: null });
  return (CACHE[ch] = { t: Date.now(), data: data || [], error });
}

export async function tela(P, ctx) {
  const { $, esc, ADMIN, D } = ctx;
  if (!DIA) DIA = isoLocal(new Date());
  if (!ADMIN) QUEM = ctx.meuId;
  else if (QUEM === null) QUEM = ctx.meuId;
  const time = (D.time || []).filter(t => t.user_id);
  const pessoas = ADMIN ? `<div class="chips" id="atQuem" style="margin-top:10px">${[['todos', 'Todos'], ...time.map(t => [t.user_id, String(t.nome || '').split(' ')[0]])].map(([k, n]) => `<button data-q="${k}" class="${(QUEM || 'todos') === k ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>` : '';
  P.innerHTML = `${ADMIN ? '<button class="voltar" id="voltar">‹ Empresa</button>' : '<button class="voltar" id="voltar">‹ Voltar</button>'}
    <h1 class="titulo" style="margin-top:6px">${ADMIN ? 'Atividades da <em>equipe</em>' : 'Minhas <em>atividades</em>'}</h1>
    <div class="seg" id="atVista" style="margin-top:10px"><button data-v="dia" class="${VISTA === 'dia' ? 'on' : ''}">Dia a dia</button><button data-v="tempos" class="${VISTA === 'tempos' ? 'on' : ''}">Tempo por etapa</button></div>
    ${pessoas}<div id="atCorpo"><div class="vazio">Carregando...</div></div>`;
  $('voltar').onclick = () => ctx.ir(ADMIN ? 'empresa' : 'inicio');
  $('atVista').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b && b.dataset.v !== VISTA) { VISTA = b.dataset.v; tela(P, ctx); } };
  if ($('atQuem')) $('atQuem').onclick = (e) => { const b = e.target.closest('[data-q]'); if (!b) return; QUEM = b.dataset.q === 'todos' ? '' : b.dataset.q; tela(P, ctx); };
  const C = $('atCorpo');
  if (VISTA === 'tempos') return telaTempos(C, ctx);
  return telaDia(C, ctx, P);
}

async function telaDia(C, ctx, P) {
  const { $, esc, ADMIN, D, nomeTime } = ctx;
  const d0 = deISO(DIA), d1 = new Date(+d0 + 864e5 + 3600e3); d1.setHours(0, 0, 0, 0);
  const hoje = DIA === isoLocal(new Date());
  const nav = `<div class="mesnav" id="atDia" style="margin-top:12px"><button data-n="-1">‹</button><span>${hoje ? 'Hoje' : d0.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span><button data-n="1" ${hoje ? 'disabled style="opacity:.3"' : ''}>›</button></div>`;
  C.innerHTML = nav + '<div class="vazio">Carregando...</div>';
  const ligarNav = () => { $('atDia').onclick = (e) => { const b = e.target.closest('[data-n]'); if (!b || b.disabled) return; const d = deISO(DIA); d.setDate(d.getDate() + Number(b.dataset.n)); DIA = isoLocal(d); telaDia(C, ctx, P); }; };
  ligarNav();
  const r = await buscar(ctx.sb, d0.toISOString(), d1.toISOString(), QUEM);
  if (ctx.aba() !== 'atividades' || VISTA !== 'dia') return;
  if (r.error) {
    C.innerHTML = nav + `<div class="vazio">${/log_periodo|function|does not exist/i.test(r.error.message) ? 'O registro de atividades ainda não foi ativado no banco.' : 'Não carregou: ' + esc(r.error.message)}</div>`;
    return ligarNav();
  }
  const L = r.data.filter(l => l.ator);
  const porArea = {}; L.forEach(l => { const a = area(l); porArea[a] = (porArea[a] || 0) + 1; });
  const todos = ADMIN && !QUEM;
  const linhas = L.slice().reverse().map(l => `<div class="conv" style="grid-template-columns:auto 1fr;align-items:baseline">
      <b style="font-size:13px">${hora(l.ts)}</b><span>${esc(frase(l))}</span>
      <small>${esc(area(l))}${todos ? ' · ' + esc(String(nomeTime(l.ator) || 'Equipe').split(' ')[0]) : ''}</small></div>`).join('');
  // onde parou: atendimentos em andamento do responsável escolhido
  const alvo = QUEM || null;
  const abertos = (D.reunioes || []).filter(x => x.resultado === 'Em andamento' && (!alvo || x.responsavel_id === alvo));
  const hojeISO = isoLocal(new Date());
  abertos.sort((a, b) => String(a.proximo_passo_data || '9999').localeCompare(String(b.proximo_passo_data || '9999')));
  const atrasados = abertos.filter(x => x.proximo_passo_data && x.proximo_passo_data < hojeISO).length;
  const semPasso = abertos.filter(x => !x.proximo_passo && !x.proximo_passo_data).length;
  const diasEtapa = (x) => Math.max(0, Math.floor((Date.now() - new Date(x.etapa_desde || x.created_at || x.data)) / 864e5));
  C.innerHTML = nav + `
    <div class="numeros" style="margin-top:10px">
      <div class="num destaque"><div class="l">Ações no app</div><div class="v">${L.length}</div><div class="d">${Object.entries(porArea).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, n]) => a + ' ' + n).join(' · ') || 'nenhuma'}</div></div>
      <div class="num"><div class="l">Primeira e última</div><div class="v" style="font-size:20px">${L.length ? hora(L[0].ts) + ' · ' + hora(L[L.length - 1].ts) : '-'}</div><div class="d">início e fim no app</div></div>
    </div>
    <section class="bloco"><h2>O que foi feito</h2>${linhas || `<div class="vazio">Nenhuma ação registrada ${hoje ? 'hoje' : 'neste dia'}.</div>`}</section>
    <section class="bloco"><h2>Onde cada atendimento parou</h2>
      <div class="sub" style="margin-bottom:6px">${abertos.length} em andamento${atrasados ? ` · <span style="color:var(--alerta)">${atrasados} com retorno atrasado</span>` : ''}${semPasso ? ` · <span style="color:var(--alerta)">${semPasso} sem próximo passo</span>` : ''}</div>
      ${abertos.length ? abertos.slice(0, 60).map(x => { const atr = x.proximo_passo_data && x.proximo_passo_data < hojeISO; const sem = !x.proximo_passo && !x.proximo_passo_data; return `<button class="lin" data-at="${x.id}" style="padding:9px 0;display:block">
          <div style="display:flex;justify-content:space-between;gap:8px"><b style="font-weight:600;color:var(--verde)">${esc(x.cliente)}</b><span class="tag">${esc(ctx.etapaDe(x))}</span></div>
          <div class="sub" style="${atr || sem ? 'color:var(--alerta)' : ''}">${sem ? 'Sem próximo passo definido' : esc(x.proximo_passo || 'Retorno') + (x.proximo_passo_data ? ' · ' + deISO(x.proximo_passo_data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '')} · ${diasEtapa(x)} ${diasEtapa(x) === 1 ? 'dia' : 'dias'} nesta etapa${todos ? ' · ' + esc(String(nomeTime(x.responsavel_id) || 'sem responsável').split(' ')[0]) : ''}</div></button>`; }).join('') : '<div class="vazio">Nenhum atendimento em andamento.</div>'}
    </section>
    <div class="sub">O registro mostra o que foi feito dentro do app, no momento em que foi feito. Mover a etapa na hora certa é o que deixa os tempos verdadeiros.</div>`;
  ligarNav();
  C.querySelectorAll('[data-at]').forEach(b => b.onclick = () => ctx.abrirAtendimento(b.dataset.at));
}

// monta, para cada atendimento, a sequência de etapas com o horário de entrada em cada uma
function trilhas(L) {
  const T = {};
  L.forEach(l => {
    const id = l.registro; if (!id) return;
    const t = T[id] = T[id] || { id, passos: [], fim: null, criado: null, resp: null, gestao: false, ator: l.ator };
    const m = l.mudancas || {}, ts = +new Date(l.ts);
    if (l.acao === 'criou') {
      t.criado = ts; t.resp = m.responsavel_id || null; t.gestao = m.produto === 'Gestão de Milhas';
      t.passos.push({ etapa: m.etapa || (t.gestao ? 'Novo lead' : 'Novo lead'), ts });
    } else if (l.acao === 'alterou') {
      if (m.etapa && m.etapa.para) t.passos.push({ etapa: m.etapa.para === 'Negociação' ? 'Follow-up' : m.etapa.para === 'Proposta enviada' ? 'Reunião de proposta' : m.etapa.para, ts });
      if (m.resultado && ['Fechou', 'Não fechou'].includes(m.resultado.para) && !t.fim) t.fim = { r: m.resultado.para, ts };
      if (m.responsavel_id) t.resp = m.responsavel_id.para;
      if (m.produto) t.gestao = m.produto.para === 'Gestão de Milhas';
    }
  });
  return Object.values(T).filter(t => t.criado);
}

async function telaTempos(C, ctx) {
  const { $, esc, ADMIN, D, nomeTime } = ctx;
  const per = `<div class="seg" id="atPer" style="margin-top:12px">${[[7, '7 dias'], [30, '30 dias'], [90, '90 dias']].map(([k, t]) => `<button data-p="${k}" class="${PERIODO === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  C.innerHTML = per + '<div class="vazio">Calculando...</div>';
  const ligar = () => { $('atPer').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { PERIODO = Number(b.dataset.p); telaTempos(C, ctx); } }; };
  ligar();
  const ini = new Date(Date.now() - PERIODO * 864e5).toISOString();
  const { data, error } = await ctx.sb.rpc('log_atendimentos', { p_ini: ini });
  if (ctx.aba() !== 'atividades' || VISTA !== 'tempos') return;
  if (error) { C.innerHTML = per + `<div class="vazio">${/log_atendimentos|does not exist/i.test(error.message) ? 'O registro de atividades ainda não foi ativado no banco.' : 'Não carregou: ' + esc(error.message)}</div>`; return ligar(); }
  const atual = Object.fromEntries((D.reunioes || []).map(x => [String(x.id), x]));
  let T = trilhas(data || []).map(t => { const a = atual[t.id]; return Object.assign(t, { resp: (a && a.responsavel_id) || t.resp || t.ator, gestao: a ? a.produto === 'Gestão de Milhas' : t.gestao, cliente: a ? a.cliente : '' }); });
  if (ADMIN && QUEM) T = T.filter(t => t.resp === QUEM);
  const agora = Date.now();
  const bloco = (gestao) => {
    const LT = T.filter(t => t.gestao === gestao);
    const etapas = gestao ? ['Novo lead', 'Qualificação', 'Diagnóstico agendado', 'Diagnóstico feito', 'Reunião de proposta'] : ['Novo lead', 'Em cotação', 'Cotação enviada', 'Follow-up'];
    const desc = gestao
      ? { 'Novo lead': 'Do lead até o SDR começar a qualificar', 'Qualificação': 'Da qualificação até agendar o diagnóstico', 'Diagnóstico agendado': 'Do agendamento até fazer o diagnóstico', 'Diagnóstico feito': 'Do diagnóstico até marcar a reunião de proposta', 'Reunião de proposta': 'Da reunião de proposta até a decisão' }
      : { 'Novo lead': 'Do pedido até começar a cotar', 'Em cotação': 'Montando a cotação até enviar', 'Cotação enviada': 'Cotação enviada até o follow-up ou a decisão', 'Follow-up': 'Em follow-up até a decisão' };
    const tempos = {}, porPessoa = {};
    LT.forEach(t => {
      const ps = t.passos.slice().sort((a, b) => a.ts - b.ts);
      ps.forEach((p, i) => {
        const prox = ps[i + 1] ? ps[i + 1].ts : t.fim ? t.fim.ts : null;
        if (!prox || prox < p.ts) return;
        (tempos[p.etapa] = tempos[p.etapa] || []).push(prox - p.ts);
        const k = t.resp || '-'; porPessoa[k] = porPessoa[k] || {}; (porPessoa[k][p.etapa] = porPessoa[k][p.etapa] || []).push(prox - p.ts);
      });
    });
    const ciclos = LT.filter(t => t.fim).map(t => t.fim.ts - t.criado);
    const fechou = LT.filter(t => t.fim && t.fim.r === 'Fechou').length, decidiu = LT.filter(t => t.fim).length;
    const parados = LT.filter(t => !t.fim).map(t => { const u = t.passos.slice().sort((a, b) => b.ts - a.ts)[0]; return { t, etapa: u.etapa, ms: agora - u.ts }; }).sort((a, b) => b.ms - a.ms);
    if (!LT.length) return `<section class="bloco"><h2>${gestao ? 'Funil da Gestão de Milhas' : 'Funil de viagens'}</h2><div class="vazio">Nenhum atendimento aberto neste período desde que o registro começou.</div></section>`;
    const maxMed = Math.max(1, ...etapas.map(e => mediana(tempos[e] || []) || 0));
    return `<section class="bloco"><h2>${gestao ? 'Funil da Gestão de Milhas' : 'Funil de viagens'}</h2>
      <div class="sub" style="margin-bottom:6px">${LT.length} ${LT.length === 1 ? 'atendimento medido' : 'atendimentos medidos'} · ${decidiu} com decisão${decidiu ? ' · conversão ' + Math.round(fechou / decidiu * 100) + '%' : ''}</div>
      ${etapas.map(e => { const v = tempos[e] || []; const md = mediana(v); return `<div class="conv"><span>${esc(desc[e])}</span><b>${md === null ? '-' : dur(md)}</b><span class="m"><i style="width:${md ? Math.max(3, md / maxMed * 100) : 0}%"></i></span><small>${v.length ? `mediana de ${v.length} · média ${dur(media(v))} · mais lento ${dur(Math.max(...v))}` : 'ainda sem medição'}</small></div>`; }).join('')}
      <div class="conv"><span>Ciclo completo, do pedido à decisão</span><b>${ciclos.length ? dur(mediana(ciclos)) : '-'}</b><small>${ciclos.length ? 'mediana de ' + ciclos.length + ' · média ' + dur(media(ciclos)) : 'ainda sem decisões'}</small></div>
      ${ADMIN && !QUEM && Object.keys(porPessoa).length > 1 ? `<details style="margin-top:8px"><summary>Por pessoa</summary>${Object.entries(porPessoa).map(([k, x]) => `<div style="padding:8px 0;border-top:1px solid var(--linha)"><b style="color:var(--verde);font-weight:600">${esc(String(nomeTime(k) || 'Sem responsável').split(' ')[0])}</b><div class="sub">${etapas.filter(e => x[e]).map(e => esc(e) + ': ' + dur(mediana(x[e])) + ' (' + x[e].length + ')').join(' · ') || '-'}</div></div>`).join('')}</details>` : ''}
      ${parados.length ? `<details style="margin-top:8px"><summary>Parados agora (${parados.length})</summary>${parados.slice(0, 30).map(p => `<button class="lin" data-at="${p.t.id}" style="padding:8px 0;display:flex;justify-content:space-between;gap:8px"><span>${esc(p.t.cliente || 'Atendimento')} · ${esc(p.etapa)}</span><span style="color:${p.ms > 2 * 864e5 ? 'var(--alerta)' : 'var(--tinta-2)'};white-space:nowrap">há ${dur(p.ms)}</span></button>`).join('')}</details>` : ''}
    </section>`;
  };
  C.innerHTML = per + bloco(false) + bloco(true) + `<div class="sub" style="margin-top:6px">Conta só os atendimentos abertos depois que o registro entrou no ar. A mediana é o tempo do atendimento do meio: metade levou menos, metade levou mais. Ela não é distorcida por um caso fora da curva.</div>`;
  ligar();
  C.querySelectorAll('[data-at]').forEach(b => b.onclick = () => ctx.abrirAtendimento(b.dataset.at));
}
