// Maktub Go: calendário de período (ida e volta num toque só).
// Toca na data de ida e abre um calendário: o 1º toque marca a ida, o 2º marca a volta e fecha sozinho.
// Sem par de volta (ou com "Somente ida"), o 1º toque já fecha. Tocar na volta reabre no período escolhido, esperando a volta.
// Vale para todo campo de data que tem par conhecido (ida e volta, embarque e retorno, check-in e check-out, início e fim),
// sem mudar os formulários: o par é achado pelo nome do campo. O teclado continua digitando a data direto no campo.

// [sufixo do início, sufixos possíveis do fim]
const PARES = [['data_viagem', ['data_volta', 'data_retorno']], ['data_ida', ['data_volta']], ['p_di', ['p_df']], ['hotel_checkin', ['hotel_checkout']],
  ['embarque', ['retorno']], ['entrada', ['saida']], ['ida', ['volta']], ['voos.0.data', ['voos.1.data']]];
const chave = (el) => el.getAttribute('name') || el.dataset.k || el.dataset.dp || '';
// "opcoes.0.embarque" termina em "embarque"; "data_ida" é a chave inteira
const termina = (k, s) => k === s || k.endsWith('.' + s);
const papel = (el) => {
  const k = chave(el);
  for (const [ini, fins] of PARES) {
    if (termina(k, ini)) return { tipo: 'ida', outro: fins.map(f => k.slice(0, k.length - ini.length) + f) };
    const f = fins.find(x => termina(k, x)); if (f) return { tipo: 'volta', outro: [k.slice(0, k.length - f.length) + ini] };
  }
  return null;
};
// o par mais perto no formulário (mesmo serviço do card, mesma opção da cotação, mesma pergunta do diagnóstico)
function parDe(el, nomes) {
  const it = el.dataset.it;
  const sel = nomes.map(n => ['name', 'data-k', 'data-dp'].map(a => `input[type="date"][${a}="${n}"]${it != null ? `[data-it="${it}"]` : ''}`).join(',')).join(',');
  let a = el.parentElement;
  for (let i = 0; a && i < 8; i++, a = a.parentElement) { const x = a.querySelector(sel); if (x && x !== el) return x; }
  return null;
}
const visivel = (el) => !!el && !el.disabled && !el.readOnly && el.offsetParent !== null && !el.closest('[hidden]');

/* ---------- datas ---------- */
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEM = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dt = (s) => new Date(s + 'T12:00:00');
const hoje = () => iso(new Date());
const mesMais = (k, n) => { const [y, m] = k.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const curta = (s) => { if (!s) return ''; const d = dt(s); return `${d.getDate()} de ${MESES[d.getMonth()].slice(0, 3)}`; };
const noites = (a, b) => Math.round((dt(b) - dt(a)) / 864e5);

function estilos() {
  if (document.getElementById('perEstilo')) return;
  const s = document.createElement('style'); s.id = 'perEstilo';
  s.textContent = `.per-caixa{padding-top:14px}
.per-tit{font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--verde);margin:0 0 4px}
.per-sel{display:flex;gap:8px;margin:6px 0 10px}.per-sel span{flex:1;border:1px solid var(--linha);border-radius:12px;background:#fff;padding:8px 12px;font-size:14px;color:var(--tinta-3)}
.per-sel b{display:block;font-size:16px;font-weight:500;color:var(--tinta)}.per-sel span.on{border-color:var(--verde);box-shadow:inset 0 0 0 1px var(--verde)}
.per-meses{display:grid;grid-template-columns:1fr;gap:18px}
.per-nav{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px}.per-nav b{font-size:16px;font-weight:600;color:var(--verde)}
.per-nav button{background:none;border:1px solid var(--linha);border-radius:12px;width:40px;height:40px;font-size:22px;color:var(--verde);cursor:pointer}.per-nav button[hidden]{display:block;visibility:hidden}
.per-grade{display:grid;grid-template-columns:repeat(7,1fr);row-gap:2px}
.per-grade .h{text-align:center;font-size:14px;color:var(--tinta-3);padding:4px 0}
.per-grade button{height:44px;border:0;background:none;font:inherit;font-size:16px;color:var(--tinta);cursor:pointer;border-radius:999px;position:relative}
.per-grade button.hj{font-weight:700;color:var(--verde)}
.per-grade button.entre{background:#EBE0C4;border-radius:0}
.per-grade button.ini,.per-grade button.fim{background:var(--verde);color:#fff;font-weight:600}
.per-grade button.ini.tem-fim{border-radius:999px 0 0 999px}.per-grade button.fim{border-radius:0 999px 999px 0}.per-grade button.ini.fim{border-radius:999px}
.per-grade button:focus-visible{outline:2px solid var(--dourado,#A88B4A);outline-offset:-2px}
.per-acoes{display:flex;gap:8px;margin-top:12px}.per-acoes button{flex:1}
.per-dica{font-size:14px;color:var(--tinta-3);margin:8px 0 0;text-align:center}
@media(min-width:760px){.per-caixa{left:50%!important;right:auto!important;bottom:auto!important;top:50%;transform:translate(-50%,-50%);width:680px;border-radius:14px!important}.per-meses{grid-template-columns:1fr 1fr}}
@media(prefers-reduced-motion:no-preference){@keyframes perSobe{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}@media(max-width:759px){.per-caixa{animation:perSobe .18s ease-out}}}`;
  document.head.appendChild(s);
}

/* ---------- a folha do calendário ----------
   o: { ida, volta, comVolta, foco: 'ida' | 'volta', rotIda, rotVolta } -> Promise<{ ida, volta } | null> */
function folha(o) {
  estilos();
  return new Promise((ok) => {
    let ida = o.ida || '', volta = o.comVolta ? (o.volta || '') : '', esperando = o.comVolta && o.foco === 'volta' && ida ? 'volta' : 'ida';
    const largo = () => window.matchMedia('(min-width:760px)').matches;
    let mes = (ida || volta || hoje()).slice(0, 7), sobre = '';
    const el = document.createElement('div'); el.className = 'folha';
    const fim = (v) => { el.remove(); document.removeEventListener('keydown', tecla); ok(v); };
    const tecla = (e) => { if (e.key === 'Escape') fim(null); };
    const grade = (k, nav) => {
      const [y, m] = k.split('-').map(Number), prim = (new Date(y, m - 1, 1).getDay() + 6) % 7, n = new Date(y, m, 0).getDate(), hj = hoje();
      const ate = esperando === 'volta' && ida && !volta && sobre > ida ? sobre : volta;
      let h = SEM.map(d => `<div class="h">${d}</div>`).join('') + '<div></div>'.repeat(prim);
      for (let d = 1; d <= n; d++) {
        const s = `${k}-${String(d).padStart(2, '0')}`, c = [s === hj ? 'hj' : '', s === ida ? 'ini' + (ate && ate > ida ? ' tem-fim' : '') : '', ate && s === ate ? 'fim' : '', ida && ate && s > ida && s < ate ? 'entre' : ''].join(' ');
        h += `<button type="button" data-d="${s}" class="${c}" aria-label="${d} de ${MESES[m - 1]}${s === ida ? ', ida' : ''}${s === volta ? ', volta' : ''}">${d}</button>`;
      }
      return `<div><div class="per-nav"><button type="button" data-n="-1" aria-label="Mês anterior" ${nav === 'dir' ? 'hidden' : ''}>‹</button><b>${MESES[m - 1].replace(/^./, c => c.toUpperCase())} de ${y}</b><button type="button" data-n="1" aria-label="Próximo mês" ${nav === 'esq' ? 'hidden' : ''}>›</button></div><div class="per-grade">${h}</div></div>`;
    };
    const desenha = () => {
      const tit = !o.comVolta ? 'Escolha a data' : esperando === 'volta' ? 'Agora, a ' + (o.rotVolta || 'volta').toLowerCase() : 'Escolha a ' + (o.rotIda || 'ida').toLowerCase();
      const dois = largo();
      el.innerHTML = `<div class="folha-fundo"></div><div class="folha-caixa per-caixa" role="dialog" aria-label="${tit}">
        <div class="per-tit">${tit}</div>
        ${o.comVolta ? `<div class="per-sel"><span class="${esperando === 'ida' ? 'on' : ''}">${o.rotIda || 'Ida'}<b>${ida ? curta(ida) : 'a escolher'}</b></span><span class="${esperando === 'volta' ? 'on' : ''}">${o.rotVolta || 'Volta'}<b>${volta ? curta(volta) : 'a escolher'}</b></span></div>` : ''}
        <div class="per-meses">${dois ? grade(mes, 'esq') + grade(mesMais(mes, 1), 'dir') : grade(mes)}</div>
        ${o.comVolta && ida && volta ? `<div class="per-dica">${noites(ida, volta)} ${noites(ida, volta) === 1 ? 'noite' : 'noites'}</div>` : ''}
        <div class="per-acoes"><button type="button" class="sec" data-a="limpar">Limpar</button><button type="button" class="sec" data-a="fechar">Fechar</button></div></div>`;
      el.querySelector('.folha-fundo').onclick = () => fim(null);
      el.querySelector('[data-a="fechar"]').onclick = () => fim(o.comVolta && ida ? { ida, volta } : null);
      el.querySelector('[data-a="limpar"]').onclick = () => { ida = ''; volta = ''; esperando = 'ida'; desenha(); };
      el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { mes = mesMais(mes, +b.dataset.n); desenha(); });
      el.querySelectorAll('[data-d]').forEach(b => {
        b.onclick = () => {
          const s = b.dataset.d;
          if (!o.comVolta) return fim({ ida: s, volta: '' });
          // 1º toque: ida (a volta antiga sai); 2º toque: volta e fecha. Data antes da ida vira a nova ida.
          if (esperando === 'ida' || s < ida) { ida = s; volta = ''; esperando = 'volta'; desenha(); return; }
          volta = s; desenha(); setTimeout(() => fim({ ida, volta }), 160);
        };
        // no computador, passar o mouse já mostra o período
        b.onmouseenter = () => { if (esperando === 'volta' && ida && !volta && sobre !== b.dataset.d) { sobre = b.dataset.d; const sc = el.querySelector('.per-caixa').scrollTop; desenha(); el.querySelector('.per-caixa').scrollTop = sc; } };
      });
      // celular: deslizar troca o mês
      const mz = el.querySelector('.per-meses'); let x0 = null;
      mz.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      mz.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) { mes = mesMais(mes, dx < 0 ? 1 : -1); desenha(); } });
    };
    desenha(); document.body.appendChild(el); document.addEventListener('keydown', tecla);
  });
}

/* ---------- liga em todo o app (uma vez): toque num campo de data com par abre o calendário ---------- */
const ROT = { data_viagem: ['Ida', 'Volta'], data_ida: ['Ida', 'Volta'], p_di: ['Início', 'Fim'], hotel_checkin: ['Check-in', 'Check-out'], embarque: ['Embarque', 'Retorno'], entrada: ['Check-in', 'Check-out'], ida: ['Ida', 'Volta'], 'voos.0.data': ['Voo de ida', 'Voo de volta'] };
const pos = (el, v) => { if (el.value === v) return; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
let ABERTO = 0;
export async function abrir(el) {
  const p = papel(el); if (!p || el.disabled || el.readOnly || Date.now() - ABERTO < 400) return;
  ABERTO = Date.now();
  const outro = parDe(el, p.outro), elIda = p.tipo === 'ida' ? el : outro, elVolta = p.tipo === 'volta' ? el : outro;
  // volta escondida ("Somente ida") ou sem par: um toque só
  const comVolta = !!(elIda && elVolta && visivel(elVolta) && visivel(elIda));
  const k = chave(elIda || el), base = Object.keys(ROT).find(x => termina(k, x)), [rotIda, rotVolta] = ROT[base] || ['Ida', 'Volta'];
  const r = await folha({ ida: elIda ? elIda.value : el.value, volta: elVolta ? elVolta.value : '', comVolta, foco: p.tipo, rotIda, rotVolta });
  if (!r) return;
  if (!comVolta) { pos(el, r.ida); return; }
  pos(elIda, r.ida); if (r.volta || elVolta.value) pos(elVolta, r.volta);
}
export function ligar(raiz) {
  const alvo = (e) => { const t = e.target; return t && t.matches && t.matches('input[type="date"]') && papel(t) && !t.disabled && !t.readOnly ? t : null; };
  // toque ou clique: abre o nosso calendário no lugar do do aparelho (o teclado continua digitando no campo)
  const toque = (e) => { const t = alvo(e); if (!t) return; e.preventDefault(); t.blur(); abrir(t); };
  raiz.addEventListener('touchstart', toque, { passive: false });
  raiz.addEventListener('mousedown', (e) => { if (e.button === 0) toque(e); });
  // clique que chega pelo rótulo do campo (sem passar pelo mousedown) também abre; o intervalo curto evita abrir duas vezes
  raiz.addEventListener('click', (e) => { const t = alvo(e); if (!t) return; e.preventDefault(); abrir(t); });
  // Enter ou espaço num campo de data focado pelo teclado também abre
  raiz.addEventListener('keydown', (e) => { const t = alvo(e); if (t && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); abrir(t); } });
}
