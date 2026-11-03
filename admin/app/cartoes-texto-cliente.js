// IA de cartões, Etapa 7: a estratégia de cartões que a equipe publica no painel do cliente.
// O texto sai de modelos prontos (aprovados pela equipe), preenchidos pela simulação. Sem IA, custo zero.
// O cliente lê só a última versão publicada (função minha_estrategia_cartoes): objetivo, agora, próximo passo e foco.
// Junto vai o plano de cartões (plano_cartoes_itens): o que fazer com cada cartão e os passos, com caixinha de feito.

const MODELOS = [
  ['cartao_certo', 'Já está no cartão certo'],
  ['subir_mesmo_banco', 'Subir no mesmo banco'],
  ['outro_banco', 'Abrir relacionamento com outro banco'],
  ['cortar_anuidade', 'Cortar anuidade'],
  ['sala_familia', 'Sala VIP para a família'],
];
const FRASE_PRIORIDADE = { mais_milhas: 'juntar mais milhas para as suas viagens', sala_vip: 'ter sala VIP sem limite nas suas viagens', cortar_anuidade: 'pagar menos anuidade' };
const RESSALVA = 'A aprovação de cartão, limite e upgrade depende do banco.';
const chave = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const dataBR = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR'); };

// os nomes que entram nos modelos, vindos da escada da simulação
function dadosDaEscada(ctx, R) {
  const porId = Object.fromEntries(R.caminhos.map(c => [c.id, c]));
  const ag = porId[R.escada.agora] || null, fo = porId[R.escada.foco] || ag;
  return { ag, fo, programa: R.programa || 'seu programa preferido', agora: ag ? ag.principal.cartao : 'seu cartão principal', foco: fo ? fo.principal.cartao : 'o próximo cartão',
    banco: fo ? fo.principal.banco || '' : '', prioridade: (R.objetivos[0] || {}).chave || null };
}
// qual modelo combina com a escada do cliente
export function sugerirModelo(ctx, R) {
  const E = dadosDaEscada(ctx, R);
  if (!E.fo || (E.ag && E.ag.id === E.fo.id)) return 'cartao_certo';
  if (E.prioridade === 'cortar_anuidade') return 'cortar_anuidade';
  if (E.prioridade === 'sala_vip' && E.fo.sala && E.fo.sala.adicionais > 0) return 'sala_familia';
  const bancosCli = new Set([...(ctx.bancos || []).map(b => chave(b.banco)), ...(ctx.cartoes || []).map(k => chave(k.banco))]);
  return bancosCli.has(chave(E.banco)) ? 'subir_mesmo_banco' : 'outro_banco';
}
// os quatro textos de cada modelo (textos aprovados pela equipe)
export function preencherModelo(modelo, ctx, R) {
  const E = dadosDaEscada(ctx, R);
  const T = {
    cartao_certo: { objetivo: `Aproveitar ao máximo os cartões que você já tem, juntando mais milhas na ${E.programa}.`,
      agora: `Concentrar os gastos no ${E.agora}, que já é o cartão certo para o seu perfil.`,
      proximo_passo: 'A equipe acompanha a sua pontuação todo mês e negocia as anuidades que não estiverem trazendo retorno.',
      foco: `Manter o ${E.agora} como principal, com uma carteira mais enxuta.` },
    subir_mesmo_banco: { objetivo: `${(FRASE_PRIORIDADE[E.prioridade] || 'juntar mais milhas para as suas viagens').replace(/^./, c => c.toUpperCase())}, juntando mais milhas na ${E.programa}.`,
      agora: `Concentrar os gastos no ${E.agora}, que já é o seu principal.`,
      proximo_passo: `Com a movimentação maior, a equipe conversa com o ${E.banco || 'banco'} para aumentar o seu limite e pedir o upgrade.`,
      foco: `Chegar ao ${E.foco}.` },
    outro_banco: { objetivo: 'Chegar a um cartão que combine mais com o seu jeito de viajar.',
      agora: `Seguir concentrando os gastos no ${E.agora} enquanto a equipe prepara o próximo passo.`,
      proximo_passo: `Começar o relacionamento com o ${E.banco || 'banco'}, que é o caminho para o ${E.foco}. A equipe orienta cada etapa.`,
      foco: `Ter o ${E.foco} como cartão principal.` },
    cortar_anuidade: { objetivo: 'Pagar menos anuidade sem perder o que você usa de verdade.',
      agora: 'A equipe conversa com os bancos para negociar as anuidades dos cartões que hoje trazem pouco retorno.',
      proximo_passo: 'Depois da negociação, decidir com você quais cartões ficam e quais podem sair.',
      foco: `Uma carteira mais enxuta, com o ${E.foco} como principal.` },
    sala_familia: { objetivo: 'Ter sala VIP para você e para quem viaja com você.',
      agora: `Concentrar os gastos no ${E.agora}.`,
      proximo_passo: `A equipe cuida do pedido do ${E.foco} e dos cartões adicionais para a família.`,
      foco: `O ${E.foco}, com sala VIP ilimitada para você e acesso próprio para quem tiver o cartão adicional.` },
  };
  return T[modelo] || T.cartao_certo;
}

const DECISOES = [['manter', 'Manter'], ['manter_por_enquanto', 'Manter por enquanto'], ['negociar', 'Negociar'], ['cancelar', 'Cancelar']];
const ROT_DEC = Object.fromEntries(DECISOES);
const DE_ACAO = { manter: 'manter', negociar: 'negociar', cortar: 'cancelar', avaliar: 'manter' };
// tarefa e responsável sugeridos pela decisão (cancelar é com o cliente, que fala com o banco; negociar a equipe acompanha)
const tarefaDe = (dec, cartao) => dec === 'cancelar' ? `Cancelar o ${cartao}` : dec === 'negociar' ? `Negociar a anuidade do ${cartao}` : null;
const respDe = (dec) => dec === 'negociar' ? 'equipe' : 'cliente';

// o plano inicial: cartões pela carteira ideal e os passos pela escada
export function montarPlano(ctx, R) {
  const C = (R && R.carteira_ideal && R.carteira_ideal.itens) || [], idsCartoes = new Set((ctx.cartoes || []).map(k => k.id));
  const cartoes = C.map(i => { const dec = DE_ACAO[i.acao] || 'manter';
    return { tipo: 'cartao', cartao_id: idsCartoes.has(i.id) ? i.id : null, cartao: i.cartao, decisao: dec, motivo: i.frase || '', tarefa: tarefaDe(dec, i.cartao), responsavel: respDe(dec) }; });
  const E = R ? dadosDaEscada(ctx, R) : null, passos = [];
  if (E && E.ag) passos.push({ tipo: 'passo', tarefa: `Concentrar os gastos no ${E.agora}`, responsavel: 'cliente' });
  if (E && E.fo && E.ag && E.fo.id !== E.ag.id) passos.push({ tipo: 'passo', responsavel: 'equipe',
    tarefa: chave(E.fo.principal.banco) === chave(E.ag.principal.banco) ? `Pedir aumento de limite e o upgrade para o ${E.foco}` : `Começar o relacionamento com o ${E.banco} para chegar ao ${E.foco}` });
  return { cartoes, passos };
}

// documento para o cliente (abre a janela de impressão: "Salvar como PDF")
export function gerarPDF(dados) {
  const e = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cor = { manter: '#193826', manter_por_enquanto: '#193826', negociar: '#715E32', cancelar: '#8A3B2E' };
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const tarefas = [...dados.passos.filter(p => p.tarefa), ...dados.cartoes.filter(c => c.tarefa)].map(t => t.tarefa);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Estudo de cartões</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#F7F3EA;color:#2B2B26;font-family:'Jost',sans-serif;font-size:16px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pag{width:210mm;min-height:297mm;padding:16mm 18mm 14mm;display:flex;flex-direction:column}.topo{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #A88B4A;padding-bottom:10px}
.topo img{height:110px;margin:-28px 0 -28px -18px}.topo .d{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#715E32;text-align:right}
h1{font-family:'Cormorant Garamond',serif;font-weight:400;font-size:48px;line-height:1.1;color:#193826;margin:24px 0 4px}h1 em{color:#A88B4A;font-style:italic}.cli{color:#715E32;margin:0 0 18px}
.obj{background:#EBE0C4;padding:14px 20px;margin-bottom:20px}.l{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#715E32;font-weight:500}
.obj p{margin:6px 0 0;font-family:'Cormorant Garamond',serif;font-size:22px;line-height:1.3;color:#193826}table{width:100%;border-collapse:collapse;margin:8px 0 20px}
td{border-top:1px solid #D8CDB0;padding:8px 6px;vertical-align:top}tr:last-child td{border-bottom:1px solid #D8CDB0}td.c{width:34%;font-weight:500;color:#193826}td.a{width:22%}
.tag{display:inline-block;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border:1px solid;white-space:nowrap}ol{margin:8px 0 20px;padding-left:20px}ol li{margin-bottom:6px}
.res{font-size:13px;color:#6B6B60;font-style:italic;margin-top:auto}.rod{font-size:13px;color:#715E32;letter-spacing:.12em;text-transform:uppercase;border-top:1px solid #A88B4A;padding-top:10px;margin-top:12px;display:flex;justify-content:space-between}
</style></head><body><div class="pag"><div class="topo"><img src="${location.origin}/ativos/logo-verde-transparente.png" alt="Maktub Go"><div class="d">Gestão de Milhas<br>${e(mes)}</div></div>
<h1>Estudo de <em>cartões</em></h1><p class="cli">Preparado para ${e(dados.cliente)}</p>
<div class="obj"><span class="l">Objetivo</span><p>${e(dados.objetivo)}</p></div>
${dados.cartoes.length ? `<span class="l">O que fazer com cada cartão</span><table>${dados.cartoes.map(c => `<tr><td class="c">${e(c.cartao)}</td><td class="a"><span class="tag" style="color:${cor[c.decisao]};border-color:${cor[c.decisao]}">${e(ROT_DEC[c.decisao] || c.decisao)}</span></td><td>${e(c.motivo)}</td></tr>`).join('')}</table>` : ''}
${tarefas.length ? `<span class="l">Próximos passos</span><ol>${tarefas.map(t => `<li>${e(t)}.</li>`).join('')}</ol>` : ''}
<p class="res">${RESSALVA} Qualquer cancelamento é feito só com a sua confirmação.</p><div class="rod"><span>Maktub Go · Alfaiataria de Viagens</span><span>Sua equipe Maktub</span></div></div>
<script>window.onload=function(){var imgs=[].slice.call(document.images).map(function(i){return i.decode?i.decode().catch(function(){}):null});Promise.race([Promise.all([document.fonts?document.fonts.ready:null].concat(imgs)),new Promise(function(r){setTimeout(r,3000)})]).then(function(){setTimeout(function(){window.print()},400)})}<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  return true;
}

export async function desenharTextoCliente(ctx, R) {
  const { X } = ctx, { sb, esc } = X, box = ctx.el.querySelector('#cxTexto');
  if (!box) return;
  if (!ctx.textos) {
    const r = await sb.from('estrategia_cliente').select('*').eq('cliente_id', ctx.c.id).order('criado_em', { ascending: false });
    if (!box.isConnected) return;
    if (r.error) { box.innerHTML = '<div class="secao">Estratégia para o cliente</div><section class="bloco" style="margin-top:0">' + X.tec('<div class="config">Rode no Supabase o 73-estrategia-cliente.sql para publicar a estratégia no painel.</div>') + '</section>'; return; }
    ctx.textos = r.data || [];
    const pub0 = ctx.textos.find(t => t.status === 'publicado');
    const it = pub0 ? await sb.from('plano_cartoes_itens').select('*').eq('estrategia_id', pub0.id).order('ordem') : { data: [] };
    ctx.planoPub = it.error ? null : (it.data || []);
    if (!box.isConnected) return;
  }
  const pub = ctx.textos.find(t => t.status === 'publicado') || null, rasc = ctx.textos.find(t => t.status === 'rascunho') || null;
  const ver = (t) => `<div style="font-size:16px;line-height:1.5"><b style="font-weight:600">Objetivo:</b> ${esc(t.objetivo)}</div>
    ${t.agora ? `<div style="font-size:16px;line-height:1.5;margin-top:4px"><b style="font-weight:600">Agora:</b> ${esc(t.agora)}</div>` : ''}
    ${t.proximo_passo ? `<div style="font-size:16px;line-height:1.5;margin-top:4px"><b style="font-weight:600">Próximo passo:</b> ${esc(t.proximo_passo)}</div>` : ''}
    ${t.foco ? `<div style="font-size:16px;line-height:1.5;margin-top:4px"><b style="font-weight:600">Foco:</b> ${esc(t.foco)}</div>` : ''}
    <div style="font-size:13px;color:var(--tinta-3);margin-top:6px;font-style:italic">${RESSALVA}</div>`;
  // acompanhamento do plano publicado: o que já foi feito, pelo cliente ou pela equipe
  const P = ctx.planoPub || [];
  const tarefasPub = P.filter(i => i.tarefa), feitas = tarefasPub.filter(i => i.feito_em).length;
  const verPlano = () => !P.length ? '' : `<div style="margin-top:10px"><b style="font-weight:600">Plano de cartões</b> <span style="font-size:13px;color:var(--tinta-3)">${feitas} de ${tarefasPub.length} feitos</span>
    ${P.filter(i => i.tipo === 'cartao').map(i => `<div style="font-size:14px;border-top:1px solid var(--linha);padding:5px 0"><b style="font-weight:600">${esc(i.cartao)}</b> <span class="tag ${i.decisao === 'cancelar' ? 'alerta' : i.decisao === 'negociar' ? 'ouro' : 'ok'}">${esc(ROT_DEC[i.decisao] || '')}</span> <span style="color:var(--tinta-2)">${esc(i.motivo || '')}</span></div>`).join('')}
    ${tarefasPub.length ? `<div style="margin-top:6px;font-size:13px;color:var(--tinta-3)">A fazer</div>${tarefasPub.map(i => `<label class="fc" style="margin:4px 0"><input type="checkbox" data-tcf="${i.id}" ${i.feito_em ? 'checked' : ''}><span style="font-size:14px">${esc(i.tarefa)} <small style="color:var(--tinta-3);font-size:13px">· ${i.responsavel === 'equipe' ? 'equipe' : 'cliente'}${i.feito_em ? ' · feito em ' + dataBR(i.feito_em) : ''}</small></span></label>`).join('')}` : ''}</div>`;
  const aberto = ctx.textoEditando || (!pub && !!R);
  let form = '';
  if (aberto && R) {
    const base = ctx.textoEditando === 'rascunho' && rasc ? rasc : null;
    const modelo = (base && base.modelo) || ctx.textoModelo || sugerirModelo(ctx, R), sug = sugerirModelo(ctx, R);
    const v = base || preencherModelo(modelo, ctx, R);
    if (!ctx.planoEdit) ctx.planoEdit = montarPlano(ctx, R);
    const PE = ctx.planoEdit;
    const area = (k, rot) => `<label class="fl"><span>${rot}</span><textarea name="tc_${k}" rows="2">${esc(v[k] || '')}</textarea></label>`;
    const selResp = (k, val) => `<select data-${k} style="font-size:14px">${[['cliente', 'Cliente faz'], ['equipe', 'Equipe faz']].map(([a, l]) => `<option value="${a}"${val === a ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    form = `<div style="margin-top:10px;padding:10px 12px;border:1px solid var(--dourado)">
      <label class="fl"><span>Modelo de texto</span><select name="tc_modelo">${MODELOS.map(([k, l]) => `<option value="${k}"${k === modelo ? ' selected' : ''}>${l}${k === sug ? ' (sugerido)' : ''}</option>`).join('')}</select></label>
      ${area('objetivo', 'Objetivo')}${area('agora', 'Agora')}${area('proximo_passo', 'Próximo passo')}${area('foco', 'Foco')}
      <div style="margin-top:10px"><b style="font-weight:600">Plano de cartões</b><div class="sub" style="font-size:13px;margin-top:0">Vem da carteira ideal. Troque a decisão, o motivo ou quem faz. Cancelar e negociar viram itens "a fazer" no painel do cliente.</div></div>
      ${PE.cartoes.map((c, i) => `<div style="border-top:1px solid var(--linha);padding:6px 0"><b style="font-weight:600;font-size:14px">${esc(c.cartao)}</b>
        <div class="duas-col" style="align-items:end"><label class="fl"><span>Decisão</span><select data-pdec="${i}">${DECISOES.map(([k, l]) => `<option value="${k}"${c.decisao === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>${c.tarefa ? `<label class="fl"><span>Quem faz</span>${selResp('presp="' + i + '"', c.responsavel)}</label>` : '<span></span>'}</div>
        <label class="fl"><span>Motivo</span><input data-pmot="${i}" value="${esc(c.motivo)}"></label></div>`).join('')}
      ${PE.passos.map((p, i) => `<div style="border-top:1px solid var(--linha);padding:6px 0"><div class="duas-col" style="align-items:end"><label class="fl"><span>Passo ${i + 1}</span><input data-ptar="${i}" value="${esc(p.tarefa)}"></label><label class="fl"><span>Quem faz</span>${selResp('pprs="' + i + '"', p.responsavel)}</label></div></div>`).join('')}
      <div class="sub" style="font-size:13px">No painel e no PDF, abaixo do texto, aparece sempre: "${RESSALVA}" Não use números nem prometa aprovação.</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="zap" type="button" id="tcPublicar" style="flex:2">Publicar no painel do cliente</button><button class="sec" type="button" id="tcPdf" style="flex:1">Gerar PDF</button><button class="sec" type="button" id="tcRascunho" style="flex:1">Salvar rascunho</button>${pub ? '<button class="sec" type="button" id="tcCancelar" style="flex:1">Cancelar</button>' : ''}</div></div>`;
  }
  box.innerHTML = `<div class="secao">Estratégia para o cliente</div><section class="bloco" style="margin-top:0">
    ${pub ? `<div style="font-size:13px;color:var(--tinta-3)">Publicado no painel em ${dataBR(pub.publicado_em)} <span class="tag ok">no painel</span></div><div style="margin-top:6px">${ver(pub)}</div>${verPlano()}
      <button class="sec" type="button" id="tcPdfPub" style="width:100%;margin-top:10px">Gerar PDF do que está publicado</button>` : '<div class="sub" style="margin-top:0;font-size:13px">Nada publicado ainda. O texto sai de um modelo aprovado e o plano sai da carteira ideal. Ajuste o que quiser antes de publicar.</div>'}
    ${rasc && !aberto ? `<div style="font-size:13px;color:var(--tinta-3);margin-top:8px">Há um rascunho salvo em ${dataBR(rasc.atualizado_em)}. <button class="mini" type="button" id="tcAbrirRasc">abrir rascunho</button></div>` : ''}
    ${!aberto && R ? '<button class="sec" type="button" id="tcNovo" style="width:100%;margin-top:10px">Preparar para o cliente</button>' : ''}
    ${!R && !pub ? '<div class="vazio">Complete o que falta no perfil para preparar o texto.</div>' : ''}
    ${form}</section>`;
  const nomeCli = ctx.c.nome_completo || 'você';
  const q = (k) => box.querySelector(`[name=tc_${k}]`);
  if (box.querySelector('#tcNovo')) box.querySelector('#tcNovo').onclick = () => { ctx.textoEditando = 'novo'; ctx.textoModelo = null; ctx.planoEdit = null; desenharTextoCliente(ctx, R); };
  if (box.querySelector('#tcAbrirRasc')) box.querySelector('#tcAbrirRasc').onclick = () => { ctx.textoEditando = 'rascunho'; desenharTextoCliente(ctx, R); };
  if (box.querySelector('#tcCancelar')) box.querySelector('#tcCancelar').onclick = () => { ctx.textoEditando = null; ctx.planoEdit = null; desenharTextoCliente(ctx, R); };
  if (box.querySelector('#tcPdfPub')) box.querySelector('#tcPdfPub').onclick = () => {
    if (!gerarPDF({ cliente: nomeCli, objetivo: pub.objetivo, cartoes: P.filter(i => i.tipo === 'cartao'), passos: P.filter(i => i.tipo === 'passo') })) X.aviso('Libere as janelas do navegador para gerar o PDF.');
  };
  // a equipe marca qualquer item como feito (os do cliente o cliente também marca no painel)
  box.querySelectorAll('[data-tcf]').forEach(cb => cb.onchange = async () => {
    const it = P.find(i => i.id === cb.dataset.tcf), em = cb.checked ? new Date().toISOString() : null;
    const { error } = await sb.from('plano_cartoes_itens').update({ feito_em: em, feito_por: cb.checked ? X.D.meuId || null : null }).eq('id', it.id);
    if (error) { cb.checked = !cb.checked; X.aviso('Não salvou: ' + X.limparTec(error.message)); return; }
    it.feito_em = em; desenharTextoCliente(ctx, R);
  });
  if (!form) return;
  const PE = ctx.planoEdit;
  // guarda o que a equipe digitou antes de redesenhar
  const lerPlano = () => {
    box.querySelectorAll('[data-pmot]').forEach(el => { PE.cartoes[+el.dataset.pmot].motivo = el.value.trim(); });
    box.querySelectorAll('[data-presp]').forEach(el => { PE.cartoes[+el.dataset.presp].responsavel = el.value; });
    box.querySelectorAll('[data-ptar]').forEach(el => { PE.passos[+el.dataset.ptar].tarefa = el.value.trim(); });
    box.querySelectorAll('[data-pprs]').forEach(el => { PE.passos[+el.dataset.pprs].responsavel = el.value; });
  };
  box.querySelectorAll('[data-pdec]').forEach(el => el.onchange = () => {
    lerPlano(); const c = PE.cartoes[+el.dataset.pdec]; c.decisao = el.value; c.tarefa = tarefaDe(c.decisao, c.cartao); c.responsavel = respDe(c.decisao);
    const txt = { objetivo: q('objetivo').value, agora: q('agora').value, proximo_passo: q('proximo_passo').value, foco: q('foco').value };
    desenharTextoCliente(ctx, R).then(() => Object.entries(txt).forEach(([k, v]) => { const f = box.querySelector(`[name=tc_${k}]`); if (f) f.value = v; }));
  });
  q('modelo').onchange = () => {
    const v = preencherModelo(q('modelo').value, ctx, R);
    ['objetivo', 'agora', 'proximo_passo', 'foco'].forEach(k => { q(k).value = v[k]; });
    ctx.textoModelo = q('modelo').value;
  };
  const linha = () => ({ modelo: q('modelo').value, objetivo: q('objetivo').value.trim(), agora: q('agora').value.trim() || null, proximo_passo: q('proximo_passo').value.trim() || null, foco: q('foco').value.trim() || null });
  const temTravessao = (o) => /[—–]/.test([o.objetivo, o.agora, o.proximo_passo, o.foco, ...PE.cartoes.map(c => c.motivo), ...PE.passos.map(p => p.tarefa)].join(' '));
  box.querySelector('#tcPdf').onclick = () => {
    lerPlano(); const o = linha();
    if (!gerarPDF({ cliente: nomeCli, objetivo: o.objetivo, cartoes: PE.cartoes, passos: PE.passos })) X.aviso('Libere as janelas do navegador para gerar o PDF.');
  };
  box.querySelector('#tcRascunho').onclick = async () => {
    lerPlano(); const o = linha(); if (!o.objetivo) { X.aviso('Preencha o objetivo.'); return; }
    const agora = new Date().toISOString();
    const r = rasc ? await sb.from('estrategia_cliente').update({ ...o, atualizado_em: agora }).eq('id', rasc.id)
      : await sb.from('estrategia_cliente').insert({ ...o, cliente_id: ctx.c.id, status: 'rascunho', criado_por: X.D.meuId || null });
    if (r.error) { X.aviso('Não salvou: ' + X.limparTec(r.error.message)); return; }
    ctx.textos = null; ctx.textoEditando = null; X.aviso('Rascunho do texto salvo. O cliente ainda não vê. O plano de cartões é montado de novo ao abrir.'); desenharTextoCliente(ctx, R);
  };
  const bp = box.querySelector('#tcPublicar');
  bp.onclick = async () => {
    lerPlano(); const o = linha(); if (!o.objetivo) { X.aviso('Preencha o objetivo.'); return; }
    if (temTravessao(o)) { X.aviso('Tire o travessão do texto antes de publicar.'); return; }
    if (bp.dataset.ok !== '1') { bp.dataset.ok = '1'; bp.textContent = 'Confirmar: publicar no painel'; return; }
    bp.disabled = true;
    const agora = new Date().toISOString();
    const r = rasc ? await sb.from('estrategia_cliente').update({ ...o, status: 'publicado', publicado_em: agora, publicado_por: X.D.meuId || null, atualizado_em: agora }).eq('id', rasc.id).select().single()
      : await sb.from('estrategia_cliente').insert({ ...o, cliente_id: ctx.c.id, status: 'publicado', publicado_em: agora, publicado_por: X.D.meuId || null, criado_por: X.D.meuId || null }).select().single();
    if (r.error) { bp.disabled = false; X.aviso('Não publicou: ' + X.limparTec(r.error.message)); return; }
    const itens = [...PE.passos.filter(p => p.tarefa), ...PE.cartoes].map((it, i) => ({ estrategia_id: r.data.id, cliente_id: ctx.c.id, tipo: it.tipo, cartao_id: it.cartao_id || null, cartao: it.cartao || null,
      decisao: it.decisao || null, motivo: it.motivo || null, tarefa: it.tipo === 'passo' ? it.tarefa : tarefaDe(it.decisao, it.cartao), responsavel: it.responsavel || 'cliente', ordem: i, criado_por: X.D.meuId || null }));
    const ri = itens.length ? await sb.from('plano_cartoes_itens').insert(itens) : { error: null };
    if (ri.error) X.aviso('O texto foi publicado, mas o plano de cartões não salvou: ' + X.limparTec(ri.error.message));
    // a versão publicada anterior vai para arquivado (nada é apagado)
    if (pub) await sb.from('estrategia_cliente').update({ status: 'arquivado', atualizado_em: agora }).eq('id', pub.id);
    ctx.textos = null; ctx.textoEditando = null; ctx.planoEdit = null; if (!ri.error) X.aviso('Publicado no painel do cliente.'); desenharTextoCliente(ctx, R);
  };
}
