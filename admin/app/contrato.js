// Maktub Go: contrato da Gestão de Milhas gerado direto da ficha do cliente.
// O texto do contrato fica no banco (tabela contrato_modelos), visível só para a equipe:
// assim os dados da Maktub e do sócio não ficam em arquivo público, e o modelo pode mudar sem mexer no código.
// Fluxo: conferir dados > gerar PDF > enviar ao Autentique (função contrato-autentique) > assinado volta para a ficha e para o painel do cliente.

const ESTADOS_CIVIS = ['solteiro(a)', 'casado(a)', 'divorciado(a)', 'viúvo(a)', 'separado(a)', 'em união estável'];
const STATUS = { gerado: ['Gerado', ''], enviado: ['Aguardando assinatura', 'alerta'], assinado: ['Assinado', 'ok'], recusado: ['Recusado', 'alerta'], cancelado: ['Cancelado', ''] };
const LIMITE_GRATIS = 10, AVISO_LIMITE = 8;
const so = (t) => String(t || '').replace(/\D/g, '');
const fmtCpf = (cpf) => { const d = so(cpf); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (cpf || ''); };
const fmtCep = (c) => { const d = so(c); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (c || ''); };
const cpfOk = (c) => { const d = so(c); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return dv(9) === +d[9] && dv(10) === +d[10]; };
const dinheiro = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const centavos = (v) => Math.round(Number(v || 0) * 100);
const dataExtensa = (iso) => { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); };
const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const lembrar = (k, v) => { try { if (v === undefined) return localStorage.getItem('mk_ctr_' + k) || ''; localStorage.setItem('mk_ctr_' + k, v); } catch (_) { return ''; } };

// ---------- valor por extenso (reais e centavos) ----------
const UN = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
function ate999(n) {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100, p = [];
  if (c) p.push(CT[c]);
  if (r) p.push(r < 20 ? UN[r] : DZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UN[r % 10] : ''));
  return p.join(' e ');
}
function inteiroExtenso(n) {
  if (n === 0) return 'zero';
  const nomes = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']], grupos = [];
  let x = n; while (x > 0) { grupos.push(x % 1000); x = Math.floor(x / 1000); }
  const partes = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i]; if (!g) continue;
    partes.push({ g, t: i === 1 && g === 1 ? 'mil' : ate999(g) + (i ? ' ' + nomes[i][g === 1 ? 0 : 1] : '') });
  }
  // "e" antes do último grupo quando ele é menor que 100 ou centena redonda: dois mil e quinhentos, mil e um
  return partes.map((p, k) => k === 0 ? p.t : (k === partes.length - 1 && (p.g < 100 || p.g % 100 === 0) ? ' e ' : ' ') + p.t).join('');
}
export function extenso(valor) {
  const tot = centavos(valor), r = Math.floor(tot / 100), c = tot % 100;
  const milhaoRedondo = r >= 1e6 && r % 1e6 === 0;
  const reais = r ? inteiroExtenso(r) + (milhaoRedondo ? ' de' : '') + (r === 1 ? ' real' : ' reais') : '';
  const cent = c ? inteiroExtenso(c) + (c === 1 ? ' centavo' : ' centavos') : '';
  return reais && cent ? reais + ' e ' + cent : reais || cent || 'zero reais';
}

// ---------- PDF ----------
let PDFMAKE = null;
function script(src) { return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não carregou ' + src)); document.head.appendChild(s); }); }
async function pdfMake() {
  if (PDFMAKE) return PDFMAKE;
  if (!window.pdfMake) await script('/admin/app/lib/pdfmake.min.js?v=0.2.23');
  if (!window.pdfMake.vfs || !Object.keys(window.pdfMake.vfs).length) await script('/admin/app/lib/vfs_fonts.js?v=0.2.23');
  PDFMAKE = window.pdfMake; return PDFMAKE;
}
async function logoDataUrl() {
  try {
    const b = await (await fetch('/ativos/logo-verde-transparente.png')).blob();
    return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(b); });
  } catch (_) { return null; }
}
const CHAVE = /\{\{\s*([a-z_]+)\s*\}\}/g;
export function camposDoModelo(blocos) {
  const s = new Set();
  const ver = (t) => { for (const m of String(t || '').matchAll(CHAVE)) s.add(m[1]); };
  (blocos || []).forEach(b => { (b.r || []).forEach(r => ver(r[0])); (b.linhas || []).forEach(l => l.forEach(ver)); });
  return [...s];
}
const trocar = (t, dados) => String(t || '').replace(CHAVE, (_, k) => (dados[k] !== undefined && dados[k] !== null && String(dados[k]).trim() !== '') ? String(dados[k]) : `[${k}]`);
export async function gerarPdf(modelo, dados) {
  const pm = await pdfMake(), logo = await logoDataUrl();
  const content = [];
  if (logo) content.push({ image: logo, width: 120, alignment: 'center', margin: [0, 0, 0, 16] });
  (modelo.blocos || []).forEach((b, i, todos) => {
    if (b.k === 'tabela') {
      const nc = (b.linhas[0] || []).length;
      content.push({ table: { widths: nc === 2 ? ['38%', '62%'] : Array(nc).fill('*'), headerRows: 1, body: b.linhas.map((l, i) => l.map(c => ({ text: trocar(c, dados), bold: i === 0, fontSize: 9.5, color: i === 0 ? '#1B4332' : '#222' }))) },
        layout: { hLineColor: () => '#cfc6ad', vLineColor: () => '#cfc6ad', fillColor: (i) => i === 0 ? '#EBE0C4' : null }, margin: [0, 4, 0, 12] });
      // tabela curta fica na mesma página do título que vem antes dela
      if (b.linhas.length <= 4 && content.length > 1 && todos[i - 1] && todos[i - 1].k !== 'tabela') { const t = content.pop(), h = content.pop(); content.push({ stack: [h, t], unbreakable: true }); }
      return;
    }
    const texto = (b.r || []).map(([t, neg]) => ({ text: trocar(t, dados), bold: !!neg }));
    if (b.k === 'h1') content.push({ text: texto, style: 'titulo' });
    else if (b.k === 'h2') content.push({ text: texto, style: 'clausula' });
    else content.push({ text: texto, style: 'p' });
  });
  const doc = {
    pageSize: 'A4', pageMargins: [56, 56, 56, 56], content,
    info: { title: `Contrato Gestão de Milhas - ${dados.nome_completo || ''}`, author: 'Maktub Go', subject: modelo.versao || '' },
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.25, color: '#222' },
    styles: { titulo: { fontSize: 15, bold: true, color: '#1B4332', alignment: 'center', margin: [0, 0, 0, 14] }, clausula: { fontSize: 11, bold: true, color: '#1B4332', margin: [0, 12, 0, 4] }, p: { alignment: 'justify', margin: [0, 0, 0, 6] } },
    footer: (atual, total) => ({ columns: [{ text: 'Maktub Go · Contrato Gestão de Milhas', fontSize: 7.5, color: '#888' }, { text: `Página ${atual} de ${total}`, alignment: 'right', fontSize: 7.5, color: '#888' }], margin: [56, 20, 56, 0] })
  };
  return await new Promise((ok, erro) => { try { pm.createPdf(doc).getBlob(ok); } catch (e) { erro(e); } });
}

// ---------- dados do contrato ----------
// Junta tudo o que o contrato pede: ficha (pessoa), documentos, dados do contrato e condições.
export function montarDados({ p, doc, ext, cond }) {
  const total = Number(cond.valor_total) || 0;
  const impl = Math.round(total * 0.25 * 100) / 100, acomp = Math.round((total - impl) * 100) / 100, mensal = Math.round(acomp / 12 * 100) / 100;
  const cartao = cond.forma === 'cartao';
  return {
    nome_completo: (p.nome || '').trim(), nacionalidade: ext.nacionalidade || (doc && doc.nacionalidade) || '', estado_civil: ext.estado_civil || '', profissao: ext.profissao || '',
    cpf: doc && doc.cpf ? fmtCpf(doc.cpf) : '', rg: ext.rg || '', rg_orgao_uf: ext.rg_orgao_uf || '', endereco_completo: ext.endereco_completo || '', cep: ext.cep ? fmtCep(ext.cep) : '',
    email: p.email || '', telefone: p.celular || '', data_nascimento: p.nascimento ? new Date(p.nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '',
    valor_total: total ? dinheiro(total) : '', valor_total_extenso: total ? extenso(total) : '',
    valor_implantacao: total ? dinheiro(impl) : '', valor_implantacao_extenso: total ? extenso(impl) : '',
    valor_acompanhamento: total ? dinheiro(acomp) : '', valor_acompanhamento_extenso: total ? extenso(acomp) : '',
    valor_mensal: total ? dinheiro(mensal) : '', valor_mensal_extenso: total ? extenso(mensal) : '',
    forma_pagamento: cartao ? 'Parcelado no cartão de crédito' : 'À vista, via Pix', parcelas: cartao ? `${cond.parcelas}x de R$ ${dinheiro(total / (Number(cond.parcelas) || 1))}` : 'Não se aplica',
    programas_fidelidade: cond.programas || '', cidade_assinatura: cond.cidade || '', data_assinatura: cond.data ? dataExtensa(cond.data) : ''
  };
}
const ROTULO = { nome_completo: 'Nome completo', nacionalidade: 'Nacionalidade', estado_civil: 'Estado civil', profissao: 'Profissão', cpf: 'CPF', rg: 'RG', rg_orgao_uf: 'Órgão emissor e UF do RG', endereco_completo: 'Endereço completo', cep: 'CEP', email: 'E-mail', telefone: 'Celular', data_nascimento: 'Data de nascimento', valor_total: 'Valor total', forma_pagamento: 'Forma de pagamento', parcelas: 'Parcelas', programas_fidelidade: 'Programas e nº de fidelidade', cidade_assinatura: 'Cidade da assinatura', data_assinatura: 'Data da assinatura' };
export function faltando(campos, dados) { return campos.filter(k => !String(dados[k] ?? '').trim()).map(k => ROTULO[k] || k).filter((v, i, a) => a.indexOf(v) === i); }

// ---------- tela: bloco "Contrato para assinatura" na ficha da Gestão ----------
let FORM = null;
export async function bloco(el, c, X) {
  if (!el) return;
  const { sb, esc } = X;
  const pf = (X.D.pessoas || []).find(x => x.cliente_id === c.id);
  const [ct, mod] = await Promise.all([
    sb.from('contratos').select('*').eq('cliente_id', c.id).order('criado_em', { ascending: false }),
    sb.from('contrato_modelos').select('id,versao,blocos').eq('tipo', 'gestao').eq('ativo', true).order('criado_em', { ascending: false }).limit(1).maybeSingle()
  ]);
  if (!el.isConnected) return;
  if (ct.error || mod.error) { el.innerHTML = `<div class="vazio">${X.ADMIN ? 'Rode o 50-contratos.sql no Supabase para ativar os contratos.' : 'Contratos ainda não ativados.'}</div>`; return; }
  if (!mod.data) { el.innerHTML = '<div class="vazio">Nenhum modelo de contrato ativo.</div>'; return; }
  const L = ct.data || [];
  const mes = new Date().toISOString().slice(0, 7);
  el.innerHTML = `
    ${L.length ? L.map(k => { const [rot, cls] = STATUS[k.status] || [k.status, '']; return `<div class="lanc" style="align-items:flex-start"><div style="flex:1"><b>Contrato de ${new Date(k.criado_em).toLocaleDateString('pt-BR')}</b>
      <small style="display:block">${k.valor_total ? 'R$ ' + dinheiro(k.valor_total) + ' · ' : ''}${k.assinado_em ? 'assinado em ' + new Date(k.assinado_em).toLocaleDateString('pt-BR') : k.enviado_em ? 'enviado em ' + new Date(k.enviado_em).toLocaleDateString('pt-BR') : 'ainda não enviado'}</small>
      <span class="tag ${cls}" style="margin-top:6px;display:inline-block">${rot}</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        ${k.status === 'gerado' ? `<button class="mini" data-k-enviar="${k.id}">Enviar para assinatura</button>` : ''}
        ${k.status === 'enviado' && k.link_assinatura ? `<button class="mini" data-k-zap="${k.id}">Mandar link no WhatsApp</button><button class="mini" data-k-copiar="${k.id}">Copiar link</button>` : ''}
        ${k.status === 'enviado' ? `<button class="mini" data-k-status="${k.id}">Atualizar status</button>` : ''}
        <button class="mini" data-k-ver="${k.id}" data-arq="${esc(k.arquivo_assinado || k.arquivo_original || '')}">${k.arquivo_assinado ? 'Ver assinado' : 'Ver PDF'}</button>
        ${['gerado', 'enviado'].includes(k.status) && X.ADMIN ? `<button class="mini" data-k-cancelar="${k.id}">Cancelar</button>` : ''}
      </div></div></div>`; }).join('') : '<div class="vazio" style="margin-top:0">Nenhum contrato gerado ainda.</div>'}
    <button class="zap" id="ctrNovo" style="width:100%;margin-top:10px">Gerar contrato</button>
    <div id="ctrForm"></div>`;
  const acha = (id) => L.find(k => String(k.id) === String(id));
  el.querySelectorAll('[data-k-ver]').forEach(b => b.onclick = async () => {
    if (!b.dataset.arq) { X.aviso('Arquivo não encontrado.'); return; }
    const w = window.open('', '_blank');
    const { data, error } = await sb.storage.from('contratos').createSignedUrl(b.dataset.arq, 300);
    if (error) { w && w.close(); X.aviso('Não abriu: ' + error.message); } else if (w) w.location = data.signedUrl;
  });
  el.querySelectorAll('[data-k-copiar]').forEach(b => b.onclick = async () => { const k = acha(b.dataset.kCopiar); try { await navigator.clipboard.writeText(k.link_assinatura); X.aviso('Link copiado. Ele é exclusivo do cliente.'); } catch (_) { prompt('Copie o link:', k.link_assinatura); } });
  el.querySelectorAll('[data-k-zap]').forEach(b => b.onclick = () => {
    const k = acha(b.dataset.kZap), nome = String((pf && pf.nome) || c.nome_completo || '').split(' ')[0];
    const url = X.zapLink(pf && pf.celular, nome, `Oi, ${nome}! Aqui é da Maktub Go. Segue o link para assinar o contrato da sua Gestão de Milhas: ${k.link_assinatura}\n\nA assinatura é digital e leva menos de 2 minutos. Qualquer dúvida, estou por aqui.`);
    if (!url) { X.aviso('A ficha não tem celular. Copie o link e envie.'); return; }
    window.open(url, '_blank', 'noopener');
  });
  el.querySelectorAll('[data-k-enviar]').forEach(b => b.onclick = () => enviar(acha(b.dataset.kEnviar), c, X, el, b));
  el.querySelectorAll('[data-k-status]').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Consultando...';
    const { data, error } = await sb.functions.invoke('contrato-autentique', { body: { acao: 'status', contrato_id: b.dataset.kStatus } });
    if (error || !data || data.erro) { b.disabled = false; b.textContent = 'Atualizar status'; X.aviso('Não consultou: ' + ((data && data.erro) || (error && error.message) || 'erro')); return; }
    X.aviso(data.status === 'assinado' ? 'Contrato assinado. O PDF já está na ficha e no painel do cliente.' : data.status === 'recusado' ? 'O cliente recusou a assinatura.' : 'Ainda aguardando a assinatura.');
    bloco(el, c, X);
  });
  el.querySelectorAll('[data-k-cancelar]').forEach(b => b.onclick = async () => {
    if (b.dataset.conf !== '1') { b.dataset.conf = '1'; b.textContent = 'Toque de novo para cancelar'; return; }
    const { error } = await sb.from('contratos').update({ status: 'cancelado' }).eq('id', b.dataset.kCancelar);
    if (error) X.aviso('Não cancelou: ' + error.message); else { X.aviso('Contrato cancelado no app. Se já foi enviado, cancele também no Autentique.'); bloco(el, c, X); }
  });
  const enviadosMes = L.filter(k => k.enviado_em && String(k.enviado_em).slice(0, 7) === mes).length;
  X.$('ctrNovo').onclick = () => { FORM = { mes }; formulario(X.$('ctrForm'), c, pf, mod.data, X, el); };
  if (FORM) formulario(X.$('ctrForm'), c, pf, mod.data, X, el);
  void enviadosMes;
}

async function formulario(box, c, pf, modelo, X, el) {
  const { sb, esc, campo } = X;
  if (!pf) { box.innerHTML = '<div class="config" style="margin-top:10px">Este cliente da Gestão ainda não está ligado a uma ficha em Clientes. Ligue a ficha para puxar os dados.</div>'; return; }
  box.innerHTML = '<div class="vazio">Carregando dados...</div>';
  const [dc, ex, cnt] = await Promise.all([
    sb.from('pessoas_documentos').select('cpf,nacionalidade').eq('pessoa_id', pf.id).maybeSingle(),
    sb.from('contrato_dados_pessoa').select('*').eq('pessoa_id', pf.id).maybeSingle(),
    sb.rpc('contratos_enviados_mes')
  ]);
  const doc = dc.data || {}, ext = ex.data || {};
  const at = (X.D.reunioes || []).filter(r => r.pessoa_id === pf.id && r.produto === 'Gestão de Milhas' && Number(r.valor_estimado) > 0).sort((a, b) => (b.resultado === 'Fechou') - (a.resultado === 'Fechou') || String(b.data || '').localeCompare(String(a.data || '')))[0];
  const progs = X.programas ? X.programas(c.id) : [];
  const usados = cnt.error ? null : Number(cnt.data) || 0;
  const sel = (nome, rot, ops, v) => `<label class="fl"><span>${rot}</span><select name="${nome}"><option value="">Selecione</option>${ops.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  box.innerHTML = `<form class="bloco form" id="fCtr" style="margin-top:12px" autocomplete="off">
    <h2>Contrato da Gestão de Milhas</h2>
    <div class="sub" style="margin-top:0">Nome, e-mail, celular e nascimento vêm da ficha. O que faltar, preencha aqui: fica salvo na ficha para os próximos contratos.</div>
    <div class="lin"><span>Nome</span><span>${esc(pf.nome)}</span></div>
    <div class="lin"><span>E-mail</span><span>${pf.email ? esc(pf.email) : '<span style="color:var(--alerta)">falta na ficha</span>'}</span></div>
    <div class="lin"><span>Celular</span><span>${pf.celular ? esc(pf.celular) : '<span style="color:var(--alerta)">falta na ficha</span>'}</span></div>
    <div class="lin"><span>Nascimento</span><span>${pf.nascimento ? new Date(pf.nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '<span style="color:var(--alerta)">falta na ficha</span>'}</span></div>
    <div class="grupo">Documento e qualificação</div>
    ${campo('cpf', 'CPF', doc.cpf ? fmtCpf(doc.cpf) : '', 'text', 'inputmode="numeric" required')}
    <div class="duas-col">${campo('rg', 'RG', ext.rg, 'text', 'required')}${campo('rg_orgao_uf', 'Órgão emissor/UF', ext.rg_orgao_uf, 'text', 'required placeholder="Ex.: DETRAN/RJ"')}</div>
    <div class="duas-col">${campo('nacionalidade', 'Nacionalidade', ext.nacionalidade || doc.nacionalidade || 'brasileiro(a)', 'text', 'required')}${sel('estado_civil', 'Estado civil', ESTADOS_CIVIS, ext.estado_civil)}</div>
    ${campo('profissao', 'Profissão', ext.profissao, 'text', 'required')}
    ${campo('endereco_completo', 'Endereço completo (rua, número, complemento, bairro, cidade/UF)', ext.endereco_completo, 'text', 'required')}
    ${campo('cep', 'CEP', ext.cep ? fmtCep(ext.cep) : '', 'text', 'inputmode="numeric" required')}
    <div class="grupo">Condições</div>
    ${campo('valor_total', 'Investimento total (R$)', at ? at.valor_estimado : '', 'number', 'required')}
    <div class="sub" id="ctrConta" style="margin-top:0"></div>
    <label class="fl"><span>Forma de pagamento</span><select name="forma"><option value="pix">À vista, via Pix</option><option value="cartao">Parcelado no cartão de crédito</option></select></label>
    <div id="ctrParc" hidden>${campo('parcelas', 'Número de parcelas', '', 'number', 'min="2" max="12"')}</div>
    <label class="fl"><span>Programas e nº de fidelidade (Anexo I)</span><textarea name="programas" rows="2" placeholder="Ex.: Smiles 123456, LATAM Pass 987654">${esc(progs.join(', '))}</textarea></label>
    <div class="duas-col">${campo('cidade', 'Cidade da assinatura', lembrar('cidade'), 'text', 'required')}${campo('data', 'Data da assinatura', hojeISO(), 'date', 'required')}</div>
    <label class="fc"><input type="checkbox" name="selfie"><span>Pedir foto do documento e selfie na assinatura (pode consumir créditos do Autentique)</span></label>
    ${usados !== null ? `<div class="sub" style="${usados >= AVISO_LIMITE ? 'color:var(--alerta)' : ''}">${usados} de ${LIMITE_GRATIS} contratos enviados este mês no plano gratuito do Autentique.${usados >= AVISO_LIMITE ? ' Está perto do limite.' : ''}</div>` : ''}
    <div class="sub" id="ctrFalta" style="color:var(--alerta)"></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="sec" type="button" id="ctrBaixar" style="flex:1">Baixar para conferir</button>
      <button class="zap" type="submit" id="ctrSalvar" style="flex:2">Salvar e enviar para assinatura</button>
    </div>
    <button class="voltar" type="button" id="ctrFechar" style="margin-top:10px">Fechar</button>
  </form>`;
  const f = box.querySelector('#fCtr'), g = (n) => f.elements[n] ? f.elements[n].value.trim() : '';
  const conta = () => { const t = Number(String(g('valor_total')).replace(',', '.')) || 0; X.$('ctrConta').textContent = t ? `Implantação R$ ${dinheiro(t * 0.25)} (25%) · acompanhamento R$ ${dinheiro(t * 0.75)}, ou R$ ${dinheiro(t * 0.75 / 12)} por mês` : ''; };
  f.elements.valor_total.oninput = conta; conta();
  f.elements.forma.onchange = () => { X.$('ctrParc').hidden = g('forma') !== 'cartao'; };
  f.elements.cpf.oninput = (e) => { const d = so(e.target.value).slice(0, 11); e.target.value = d.length === 11 ? fmtCpf(d) : d; };
  X.$('ctrFechar').onclick = () => { FORM = null; box.innerHTML = ''; };
  const coletar = () => {
    const extNovo = { pessoa_id: pf.id, rg: g('rg') || null, rg_orgao_uf: g('rg_orgao_uf') || null, nacionalidade: g('nacionalidade') || null, estado_civil: g('estado_civil') || null, profissao: g('profissao') || null, endereco_completo: g('endereco_completo') || null, cep: so(g('cep')) || null };
    const cond = { valor_total: Number(String(g('valor_total')).replace(',', '.')) || 0, forma: g('forma'), parcelas: Number(g('parcelas')) || 0, programas: g('programas'), cidade: g('cidade'), data: g('data') };
    const dados = montarDados({ p: pf, doc: { cpf: g('cpf'), nacionalidade: g('nacionalidade') }, ext: extNovo, cond });
    const falta = faltando(camposDoModelo(modelo.blocos), dados);
    if (g('cpf') && !cpfOk(g('cpf'))) falta.unshift('CPF válido');
    if (cond.forma === 'cartao' && !(cond.parcelas >= 2 && cond.parcelas <= 12)) falta.push('Número de parcelas (2 a 12)');
    if (!pf.email && !pf.celular) falta.push('E-mail ou celular na ficha, para enviar o link');
    X.$('ctrFalta').textContent = falta.length ? 'Falta: ' + falta.join(', ') + '.' : '';
    return { extNovo, cond, dados, falta };
  };
  const salvarDados = async (extNovo) => {
    const r = await sb.from('contrato_dados_pessoa').upsert({ ...extNovo, atualizado_em: new Date().toISOString() });
    if (r.error) throw new Error('Não salvou os dados do contrato: ' + r.error.message);
    const cpf = so(g('cpf'));
    if (cpf && so(doc.cpf) !== cpf) { const r2 = await sb.from('pessoas_documentos').upsert({ pessoa_id: pf.id, cpf: fmtCpf(cpf) }); if (r2.error) throw new Error('Não salvou o CPF: ' + r2.error.message); }
    if (g('cidade')) lembrar('cidade', g('cidade'));
  };
  X.$('ctrBaixar').onclick = async () => {
    const { dados } = coletar();
    const b = X.$('ctrBaixar'); b.disabled = true; b.textContent = 'Gerando...';
    try { const blob = await gerarPdf(modelo, dados); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Contrato Gestao - ${dados.nome_completo || 'cliente'} (conferencia).pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 6e4); }
    catch (e) { X.aviso('Não gerou o PDF: ' + e.message); }
    b.disabled = false; b.textContent = 'Baixar para conferir';
  };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const { extNovo, cond, dados, falta } = coletar();
    if (falta.length) { X.$('ctrFalta').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const btn = X.$('ctrSalvar'); btn.disabled = true; btn.textContent = 'Gerando o contrato...';
    let criado = null;
    try {
      await salvarDados(extNovo);
      const blob = await gerarPdf(modelo, dados);
      const ins = await sb.from('contratos').insert({ cliente_id: c.id, pessoa_id: pf.id, modelo_id: modelo.id, modelo_versao: modelo.versao, dados, valor_total: cond.valor_total, forma_pagamento: cond.forma, parcelas: cond.forma === 'cartao' ? cond.parcelas : null, pedir_selfie: f.elements.selfie.checked, status: 'gerado' }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      criado = ins.data;
      const path = `${c.id}/${criado.id}/contrato.pdf`;
      const up = await sb.storage.from('contratos').upload(path, blob, { contentType: 'application/pdf', upsert: false });
      if (up.error) throw new Error('Não guardou o PDF: ' + up.error.message);
      const u = await sb.from('contratos').update({ arquivo_original: path }).eq('id', criado.id).select().single();
      if (u.error) throw new Error(u.error.message);
      FORM = null;
      await enviar(u.data, c, X, el, btn);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Salvar e enviar para assinatura';
      X.aviso(e.message + (criado ? ' O contrato ficou salvo como "Gerado": dá para tentar enviar de novo pela lista.' : ''));
      if (criado) bloco(el, c, X);
    }
  };
}

async function enviar(k, c, X, el, btn) {
  if (!k) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando ao Autentique...'; }
  const { data, error } = await X.sb.functions.invoke('contrato-autentique', { body: { acao: 'enviar', contrato_id: k.id } });
  if (error || !data || data.erro) {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar para assinatura'; }
    const msg = (data && data.erro) || (error && error.message) || 'erro desconhecido';
    X.aviso(/not found|404|Failed to send/i.test(msg) ? 'A função contrato-autentique ainda não está ativa no Supabase. O contrato ficou salvo como "Gerado".' : 'Não enviou: ' + msg);
    bloco(el, c, X); return;
  }
  X.aviso('Contrato enviado. Agora mande o link pelo WhatsApp da Maktub.');
  bloco(el, c, X);
}
