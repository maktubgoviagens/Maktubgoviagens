// IA de cartões, Etapa 7: a estratégia de cartões que a equipe publica no painel do cliente.
// O texto sai de modelos prontos (aprovados pela equipe), preenchidos pela simulação. Sem IA, custo zero.
// O cliente lê só a última versão publicada (função minha_estrategia_cartoes): objetivo, agora, próximo passo e foco.

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

export async function desenharTextoCliente(ctx, R) {
  const { X } = ctx, { sb, esc } = X, box = ctx.el.querySelector('#cxTexto');
  if (!box) return;
  if (!ctx.textos) {
    const r = await sb.from('estrategia_cliente').select('*').eq('cliente_id', ctx.c.id).order('criado_em', { ascending: false });
    if (!box.isConnected) return;
    if (r.error) { box.innerHTML = '<div class="secao">Estratégia para o cliente</div><section class="bloco" style="margin-top:0">' + X.tec('<div class="config">Rode no Supabase o 73-estrategia-cliente.sql para publicar a estratégia no painel.</div>') + '</section>'; return; }
    ctx.textos = r.data || [];
  }
  const pub = ctx.textos.find(t => t.status === 'publicado') || null, rasc = ctx.textos.find(t => t.status === 'rascunho') || null;
  const ver = (t) => `<div style="font-size:16px;line-height:1.5"><b style="font-weight:600">Objetivo:</b> ${esc(t.objetivo)}</div>
    ${t.agora ? `<div style="font-size:16px;line-height:1.5;margin-top:4px"><b style="font-weight:600">Agora:</b> ${esc(t.agora)}</div>` : ''}
    ${t.proximo_passo ? `<div style="font-size:16px;line-height:1.5;margin-top:4px"><b style="font-weight:600">Próximo passo:</b> ${esc(t.proximo_passo)}</div>` : ''}
    ${t.foco ? `<div style="font-size:16px;line-height:1.5;margin-top:4px"><b style="font-weight:600">Foco:</b> ${esc(t.foco)}</div>` : ''}
    <div style="font-size:13px;color:var(--tinta-3);margin-top:6px;font-style:italic">${RESSALVA}</div>`;
  const aberto = ctx.textoEditando || (!pub && !!R);
  let form = '';
  if (aberto && R) {
    const base = ctx.textoEditando === 'rascunho' && rasc ? rasc : null;
    const modelo = (base && base.modelo) || ctx.textoModelo || sugerirModelo(ctx, R), sug = sugerirModelo(ctx, R);
    const v = base || preencherModelo(modelo, ctx, R);
    const area = (k, rot) => `<label class="fl"><span>${rot}</span><textarea name="tc_${k}" rows="2">${esc(v[k] || '')}</textarea></label>`;
    form = `<div style="margin-top:10px;padding:10px 12px;border:1px solid var(--dourado)">
      <label class="fl"><span>Modelo de texto</span><select name="tc_modelo">${MODELOS.map(([k, l]) => `<option value="${k}"${k === modelo ? ' selected' : ''}>${l}${k === sug ? ' (sugerido)' : ''}</option>`).join('')}</select></label>
      ${area('objetivo', 'Objetivo')}${area('agora', 'Agora')}${area('proximo_passo', 'Próximo passo')}${area('foco', 'Foco')}
      <div class="sub" style="font-size:13px">No painel, abaixo do texto, aparece sempre: "${RESSALVA}" Não use números nem prometa aprovação.</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="zap" type="button" id="tcPublicar" style="flex:2">Publicar no painel do cliente</button><button class="sec" type="button" id="tcRascunho" style="flex:1">Salvar rascunho</button>${pub ? '<button class="sec" type="button" id="tcCancelar" style="flex:1">Cancelar</button>' : ''}</div></div>`;
  }
  box.innerHTML = `<div class="secao">Estratégia para o cliente</div><section class="bloco" style="margin-top:0">
    ${pub ? `<div style="font-size:13px;color:var(--tinta-3)">Publicado no painel em ${dataBR(pub.publicado_em)} <span class="tag ok">no painel</span></div><div style="margin-top:6px">${ver(pub)}</div>` : '<div class="sub" style="margin-top:0;font-size:13px">Nada publicado ainda. O texto sai de um modelo aprovado, preenchido pela escada da simulação. Ajuste o que quiser antes de publicar.</div>'}
    ${rasc && !aberto ? `<div style="font-size:13px;color:var(--tinta-3);margin-top:8px">Há um rascunho salvo em ${dataBR(rasc.atualizado_em)}. <button class="mini" type="button" id="tcAbrirRasc">abrir rascunho</button></div>` : ''}
    ${!aberto && R ? '<button class="sec" type="button" id="tcNovo" style="width:100%;margin-top:10px">Preparar para o cliente</button>' : ''}
    ${!R && !pub ? '<div class="vazio">Complete o que falta no perfil para preparar o texto.</div>' : ''}
    ${form}</section>`;
  const q = (k) => box.querySelector(`[name=tc_${k}]`);
  if (box.querySelector('#tcNovo')) box.querySelector('#tcNovo').onclick = () => { ctx.textoEditando = 'novo'; ctx.textoModelo = null; desenharTextoCliente(ctx, R); };
  if (box.querySelector('#tcAbrirRasc')) box.querySelector('#tcAbrirRasc').onclick = () => { ctx.textoEditando = 'rascunho'; desenharTextoCliente(ctx, R); };
  if (box.querySelector('#tcCancelar')) box.querySelector('#tcCancelar').onclick = () => { ctx.textoEditando = null; desenharTextoCliente(ctx, R); };
  if (!form) return;
  q('modelo').onchange = () => {
    const v = preencherModelo(q('modelo').value, ctx, R);
    ['objetivo', 'agora', 'proximo_passo', 'foco'].forEach(k => { q(k).value = v[k]; });
    ctx.textoModelo = q('modelo').value;
  };
  const linha = () => ({ modelo: q('modelo').value, objetivo: q('objetivo').value.trim(), agora: q('agora').value.trim() || null, proximo_passo: q('proximo_passo').value.trim() || null, foco: q('foco').value.trim() || null });
  const temTravessao = (o) => /[—–]/.test([o.objetivo, o.agora, o.proximo_passo, o.foco].join(' '));
  box.querySelector('#tcRascunho').onclick = async () => {
    const o = linha(); if (!o.objetivo) { X.aviso('Preencha o objetivo.'); return; }
    const agora = new Date().toISOString();
    const r = rasc ? await sb.from('estrategia_cliente').update({ ...o, atualizado_em: agora }).eq('id', rasc.id)
      : await sb.from('estrategia_cliente').insert({ ...o, cliente_id: ctx.c.id, status: 'rascunho', criado_por: X.D.meuId || null });
    if (r.error) { X.aviso('Não salvou: ' + X.limparTec(r.error.message)); return; }
    ctx.textos = null; ctx.textoEditando = null; X.aviso('Rascunho salvo. O cliente ainda não vê.'); desenharTextoCliente(ctx, R);
  };
  const bp = box.querySelector('#tcPublicar');
  bp.onclick = async () => {
    const o = linha(); if (!o.objetivo) { X.aviso('Preencha o objetivo.'); return; }
    if (temTravessao(o)) { X.aviso('Tire o travessão do texto antes de publicar.'); return; }
    if (bp.dataset.ok !== '1') { bp.dataset.ok = '1'; bp.textContent = 'Confirmar: publicar no painel'; return; }
    bp.disabled = true;
    const agora = new Date().toISOString();
    const r = rasc ? await sb.from('estrategia_cliente').update({ ...o, status: 'publicado', publicado_em: agora, publicado_por: X.D.meuId || null, atualizado_em: agora }).eq('id', rasc.id).select().single()
      : await sb.from('estrategia_cliente').insert({ ...o, cliente_id: ctx.c.id, status: 'publicado', publicado_em: agora, publicado_por: X.D.meuId || null, criado_por: X.D.meuId || null }).select().single();
    if (r.error) { bp.disabled = false; X.aviso('Não publicou: ' + X.limparTec(r.error.message)); return; }
    // a versão publicada anterior vai para arquivado (nada é apagado)
    if (pub) await sb.from('estrategia_cliente').update({ status: 'arquivado', atualizado_em: agora }).eq('id', pub.id);
    ctx.textos = null; ctx.textoEditando = null; X.aviso('Publicado no painel do cliente.'); desenharTextoCliente(ctx, R);
  };
}
