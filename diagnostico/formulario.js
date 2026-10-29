/* ============================================================
   FORMULÁRIO DE DIAGNÓSTICO (gestão de milhas)
   O mesmo formulário aparece em /diagnostico/, na home e em
   /gestao-de-milhas/. Grava na tabela solicitacoes_acesso.
   Campos enviados: nome, whatsapp, gasto_mensal (obrigatórios),
   email, movimentacao_pix, programas, como_conheceu, indicado_por.
   As colunas antigas (cidade, viagens_ano, objetivo) continuam na
   tabela, só não são mais pedidas.
   ============================================================ */
(function(){
  var SUPABASE_URL = 'https://qzrpvavhgtklacsbhlfi.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_gKIXLgYTXCSZjNjc5Xcd4Q_EqVBdiSE';
  var TABELA = 'solicitacoes_acesso';
  var ZAP = 'https://wa.me/5521976275225?text=';

  var form = document.getElementById('formDiagnostico');
  if(!form) return;
  var $ = function(id){ return document.getElementById(id); };
  var msg = $('fdMsg'), botao = $('fdBotao'), como = $('fdComo'), campoInd = $('fdCampoInd'), opcionais = $('fdOpcionais');

  var mostraInd = function(){ campoInd.hidden = como.value !== 'Indicação'; };
  como.addEventListener('change', mostraInd);
  var convite = new URLSearchParams(location.search).get('convite');
  if(convite){ como.value = 'Indicação'; $('fdInd').value = convite.slice(0,120); mostraInd(); opcionais.open = true; }

  var esc = function(s){ return String(s || '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); };
  function dizer(html, estado){
    msg.innerHTML = html;
    if(estado){ msg.dataset.estado = estado; } else { delete msg.dataset.estado; }
  }
  function erro(texto, campo){
    form.querySelectorAll('[aria-invalid]').forEach(function(el){ el.removeAttribute('aria-invalid'); });
    dizer(texto, 'erro');
    if(campo){ campo.setAttribute('aria-invalid','true'); campo.focus(); }
  }
  async function grava(row){
    var r = await fetch(SUPABASE_URL + '/rest/v1/' + TABELA, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer ' + SUPABASE_ANON_KEY,'Prefer':'return=minimal'},
      body:JSON.stringify(row)
    });
    if(r.ok) return null;
    var t = await r.text().catch(function(){ return ''; });
    return t || ('erro ' + r.status);
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if(botao.disabled) return;
    var f = new FormData(form);
    if(f.get('site')) return;
    var row = {};
    ['nome','whatsapp','gasto_mensal','email','movimentacao_pix','programas','como_conheceu','indicado_por'].forEach(function(k){ var v = String(f.get(k) || '').trim(); row[k] = v || null; });
    if(row.como_conheceu !== 'Indicação') row.indicado_por = null;

    if(!row.nome || row.nome.length < 2) return erro('Informe seu nome.', $('fdNome'));
    if(String(row.whatsapp || '').replace(/\D/g,'').length < 10) return erro('Informe um WhatsApp com DDD.', $('fdWhats'));
    if(!row.gasto_mensal) return erro('Selecione o seu gasto mensal nos cartões.', $('fdGasto'));
    if(row.email && !/^\S+@\S+\.\S+$/.test(row.email)){ opcionais.open = true; return erro('Confira o e-mail informado.', $('fdEmail')); }

    form.querySelectorAll('[aria-invalid]').forEach(function(el){ el.removeAttribute('aria-invalid'); });
    botao.disabled = true; botao.textContent = 'Enviando…'; dizer('');
    var wa = ZAP + encodeURIComponent('Olá! Sou ' + row.nome + ' e acabei de pedir meu diagnóstico de Gestão de Milhas Maktub Go pelo site.');
    var falha = null;
    try{
      falha = await grava(row);
      if(falha && /como_conheceu/.test(falha)){ var semComo = Object.assign({}, row); delete semComo.como_conheceu; falha = await grava(semComo); }
    }catch(err){ falha = err; }
    botao.disabled = false; botao.textContent = 'Quero meu diagnóstico';
    if(falha){
      console.error(falha);
      dizer('Não conseguimos registrar agora. Envie sua solicitação pelo WhatsApp e nossa equipe dá sequência.<br><a href="' + wa + '" target="_blank" rel="noopener">Enviar pelo WhatsApp →</a>', 'erro');
      return;
    }
    if(window.gtag) gtag('event','generate_lead',{tipo:'diagnostico_gestao',pagina:location.pathname});
    form.classList.add('fd-enviado');
    form.querySelectorAll('input,select,textarea,button').forEach(function(el){ el.disabled = true; });
    dizer('<strong>Solicitação recebida, ' + esc(row.nome.split(' ')[0]) + '.</strong> Nossa equipe vai chamar você no WhatsApp para marcar a chamada do seu diagnóstico.<a class="fd-botao fd-zap" href="' + wa + '" target="_blank" rel="noopener">Falar agora no WhatsApp</a>', 'ok');
    msg.setAttribute('tabindex','-1'); msg.focus();
  });
})();
