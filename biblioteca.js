(function () {

var _bibEl = document.getElementById('bibliobx');
if (!_bibEl) return;


var DB              = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
var ADMINS          = ['1'];
var HORA_ABERTURA   = 9;
var HORA_FECHAMENTO = 20;
var LIMITE_HORAS_DIA = 6;

var MARCOS = [
  { horas: 12,  recompensas: [{ nome: '✦ Pontos da Casa +5',  descricao: 'Conquistado por 12h de estudo na biblioteca. Precisa ser resgatado no tópico de pontos para a casa. | Uso Único.', categoria: 'Outros', valor: 0 }] },
  { horas: 24,  recompensas: [{ nome: '✦ Pontos da Casa +5',  descricao: 'Conquistado por 24h de estudo na biblioteca. Precisa ser resgatado no tópico de pontos para a casa. | Uso Único.', categoria: 'Outros', valor: 0 }] },
  { horas: 42,  recompensas: [{ nome: '✦ Pontos da Casa +5',  descricao: 'Conquistado por 42h de estudo na biblioteca. Precisa ser resgatado no tópico de pontos para a casa. | Uso Único.', categoria: 'Outros', valor: 0 }] },
  { horas: 70,  recompensas: [{ nome: '✦ Pontos da Casa +10', descricao: 'Conquistado por 70h de estudo na biblioteca. Precisa ser resgatado no tópico de pontos para a casa. | Uso Único.', categoria: 'Outros', valor: 0 }] },
  { horas: 80,  recompensas: [{ nome: '✦ Pontos da Casa +10', descricao: 'Conquistado por 80h de estudo na biblioteca. Precisa ser resgatado no tópico de pontos para a casa. | Uso Único.', categoria: 'Outros', valor: 0 }] },
  { horas: 100, recompensas: [
    { nome: '✦ Pontos da Casa +15', descricao: 'Conquistado por 100h de estudo na biblioteca. Precisa ser resgatado no tópico de pontos para a casa. | Uso Único.', categoria: 'Outros', valor: 0 },
    { nome: '✦ Atributo Resgatável', descricao: 'Pode ser trocado por +1 em Inteligência, Sabedoria ou Determinação.', categoria: 'Outros', valor: 0 }
  ]}
];

var MESAS = [
  { id: 'central',  label: 'Mesa Central',            limite: 0, efeito: null },
  { id: 'janela',   label: 'Perto da Janela',          limite: 4, efeito: 'janela' },
  { id: 'fundo',    label: 'Mesa do Fundo',            limite: 4, efeito: 'fundo' },
  { id: 'corredor', label: 'Corredor das Prateleiras', limite: 4, efeito: 'corredor' }
];

var INTERACOES = [
  { id: 'cutucar',     label: 'Cutucar',     emoji: '<i class="ph ph-hand-pointing"></i>',      tipo: 'horas',   mod:  0.01 },
  { id: 'impulsionar', label: 'Impulsionar', emoji: '<i class="ph ph-lightbulb-filament"></i>', tipo: 'horas',   mod:  0.02 },
  { id: 'atrapalhar',  label: 'Atrapalhar',  emoji: '<i class="ph ph-trash"></i>',              tipo: 'horas',   mod: -0.04 },
  { id: 'energizar',   label: 'Energizar',   emoji: '<i class="ph ph-lightning"></i>',          tipo: 'energia', valor: 5   }
];

var ENERGIA_POR_HORA = { central: 5, janela: 4, fundo: 5, corredor: 5 };

var EFEITO_LABELS = {
  cutucar:     { label: 'Cutucar',     mod: '+1% horas',   cls: 'bib-ef-neutro'   },
  impulsionar: { label: 'Impulsionar', mod: '+2% horas',   cls: 'bib-ef-positivo' },
  atrapalhar:  { label: 'Atrapalhar',  mod: '-4% horas',   cls: 'bib-ef-negativo' },
  energizar:   { label: 'Energizar',   mod: '+5 energia',  cls: 'bib-ef-positivo' }
};


var STATUS_GENERICOS = [
'Folheando um livro antigo...',
'Perdido entre as páginas...',
'Fazendo anotações...',
'Buscando referências...',
'Concentrado nos estudos...',
'Revisando anotações...',
'Decifrando runas antigas...',
'Consultando o índice...',
'Copiando passagens importantes...',
'Lendo o sumário...',
'Marcando a página com cuidado...',
'Comparando duas passagens do texto...',
'Relendo o mesmo parágrafo pela terceira vez...',
'Organizando os papéis sobre a mesa...',
'Seguindo a linha com o dedo...',
'Virando as páginas devagar...',
'Pousando o livro por um momento...',
'Procurando uma palavra no dicionário...'
];
var STATUS_POR_LIVRO = [
'Folheando "{livro}"...',
'Concentrado na leitura de "{livro}"...',
'Sublinhando trechos de "{livro}"...',
'Relendo o capítulo de "{livro}"...',
'Fascinado por "{livro}"...',
'Chegando ao fim de um capítulo de "{livro}"...',
'Perdeu a noção do tempo ao ler "{livro}"...',
'Voltando ao começo de "{livro}"...',
'Tentando entender uma passagem difícil de "{livro}"...',
'Com "{livro}" aberto sobre a mesa...',
'Dobrando a página de "{livro}" para não perder a página...',
];
var STATUS_POR_MESA = {
  janela:   ['Olhando pela janela entre uma página e outra...','Iluminando o livro com a luz da janela...'],
  fundo:    ['Escondido entre as prateleiras do fundo...','Na penumbra do fundo da biblioteca...'],
  corredor: ['Andando pelo corredor...','Consultando os títulos nas prateleiras...']
};

function getStatusAleatorio(sessao) {
  if (sessao.mesa_id && STATUS_POR_MESA[sessao.mesa_id] && Math.random() < 0.30) {
    var l = STATUS_POR_MESA[sessao.mesa_id]; return l[Math.floor(Math.random()*l.length)];
  }
  if (sessao.livro && Math.random() < 0.40) {
    return STATUS_POR_LIVRO[Math.floor(Math.random()*STATUS_POR_LIVRO.length)].replace('{livro}', sessao.livro);
  }
  return STATUS_GENERICOS[Math.floor(Math.random()*STATUS_GENERICOS.length)];
}


function dbGet(p)      { return fetch(DB+p+'.json').then(function(r){ return r.json(); }); }
function dbPatch(p, d) { return fetch(DB+p+'.json', { method:'PATCH', body:JSON.stringify(d) }); }
function dbPut(p, d)   { return fetch(DB+p+'.json', { method:'PUT',   body:JSON.stringify(d) }); }
function dbPost(p, d)  { return fetch(DB+p+'.json', { method:'POST',  body:JSON.stringify(d) }); }
function dbDel(p)      { return fetch(DB+p+'.json', { method:'DELETE' }); }
function fkey(uid)     { return 'u'+String(uid).replace(/^u/i,''); }
  
function getMeuGrupo(uid) {
  return dbGet('/biblioteca/membros/'+fkey(uid)+'/grupo_id');
}
function setMeuGrupo(uid, gid) {
  return dbPut('/biblioteca/membros/'+fkey(uid)+'/grupo_id', gid || null);
}

function getUser() {
  if (typeof _userdata !== 'undefined' && _userdata && _userdata.user_id)
    return { uid: String(_userdata.user_id).trim(), nome: _userdata.username||'', logado: true };
  return { logado: false };
}
function isAdmin(uid) { return ADMINS.indexOf(uid) !== -1; }
function aberta()     { var h = new Date().getHours(); return h >= HORA_ABERTURA && h < HORA_FECHAMENTO; }
function mesAtual()   { var d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function diaAtual()   { var d = new Date(); return mesAtual()+'-'+String(d.getDate()).padStart(2,'0'); }
function fmtHoras(h)  { h = Math.max(0,h); var hh=Math.floor(h), mm=Math.round((h-hh)*60); return mm>0 ? hh+'h'+String(mm).padStart(2,'0') : hh+'h'; }
function fmtData(ts)  { var d=new Date(ts); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
function fmtPct(v)    { return (v >= 0 ? '+' : '')+v+'%'; }
function fmtTerminaEm(ms) { if (ms <= 0) return 'concluido'; return 'termina em '+Math.ceil(ms/3600000)+'h'; }
function fmtTimerCrescente(ms) {
  ms = Math.max(0,ms);
  var s=Math.floor(ms/1000), hh=Math.floor(s/3600), mm=Math.floor((s%3600)/60), ss=s%60;
  return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
}


function getAtributos(uid) {
  return dbGet('/atributos/'+fkey(uid)).then(function(d){ return d||{}; });
}
function bonusInteligencia(atributos) {
  return 1 + ((atributos.inteligencia||0)/25)*0.20;
}
function descontoEnergiaDeterminacao(atributos, custoBase) {
  return Math.max(0, custoBase - Math.floor(((atributos.determinacao||0)/25)*2));
}
function bonusSabedoria(atributos) {
  return 1 + ((atributos.sabedoria||0)/25)*0.15;
}
function resumoAtributos(atributos) {
  var int  = atributos.inteligencia || 0;
  var det  = atributos.determinacao || 0;
  var sab  = atributos.sabedoria    || 0;
  return [
    { label: 'Inteligência', val: int,  bonus: fmtPct(Math.round((int/25)*20))  + ' horas efetivas' },
    { label: 'Determinação', val: det,  bonus: '-'+Math.floor((det/25)*2)+' energia/h' },
    { label: 'Sabedoria',    val: sab,  bonus: fmtPct(Math.round((sab/25)*15)) + ' em buffs recebidos' }
  ];
}


function getCooldownsHoje(remetenteUid) {
  return dbGet('/biblioteca/cooldowns/'+diaAtual()+'/'+fkey(remetenteUid)).then(function(d){ return d||{}; });
}
function marcarCooldown(remetenteUid, alvoUid, tipo) {
  var path = '/biblioteca/cooldowns/'+diaAtual()+'/'+fkey(remetenteUid)+'/'+fkey(alvoUid);
  return dbGet(path).then(function(d){ var a=d||{}; a[tipo]=Date.now(); return dbPut(path,a); });
}
function temCooldown(cd, alvoUid, tipo) { var x=cd[fkey(alvoUid)]; return !!(x&&x[tipo]); }


function getEnergia(uid) {
  return dbGet('/status-perfil/'+fkey(uid)).then(function(d){
    return d ? { cur:d.energia_cur||0, tot:d.energia_tot||0 } : { cur:0, tot:0 };
  });
}
function descontarEnergia(uid, qtd) {
  return dbGet('/status-perfil/'+fkey(uid)).then(function(d){
    if (!d) return false;
    return dbPatch('/status-perfil/'+fkey(uid),{ energia_cur:Math.max(0,(d.energia_cur||0)-qtd) }).then(function(){ return true; });
  });
}
function adicionarEnergia(uid, qtd) {
  return dbGet('/status-perfil/'+fkey(uid)).then(function(d){
    if (!d) return;
    return dbPatch('/status-perfil/'+fkey(uid),{ energia_cur:Math.min(d.energia_tot||0,(d.energia_cur||0)+qtd) });
  });
}


function getNome(uid) {
  return dbGet('/saldos/'+fkey(uid)).then(function(d){ return d&&d.nome ? d.nome : 'u'+uid; });
}
function getLivros(uid) {
  return dbGet('/inventario/'+fkey(uid)).then(function(inv){
    if (!inv) return [];
    return Object.values(inv).filter(function(it){ return it&&it.categoria==='Livros'&&it.nome; }).map(function(it){ return it.nome; });
  });
}


function contarMesa(ativas, mesaId) {
  if (!ativas) return 0;
  return Object.values(ativas).filter(function(s){ return s&&s.mesa_id===mesaId; }).length;
}
 
function getBonusGrupo(grupoId) {
  if (!grupoId) return Promise.resolve(1);
  return dbGet('/biblioteca/grupos/'+grupoId).then(function(g){
    if (!g||!g.membros) return 1;
    var qtd = Object.keys(g.membros).filter(function(k){ return g.membros[k]; }).length;
    if (qtd >= 4) return 1.10;
    if (qtd === 3) return 1.07;
    if (qtd === 2) return 1.05;
    if (qtd === 1) return 1.02;
    return 1;
  });
}

function getBonusEvento() {
  return dbGet('/biblioteca/evento').then(function(ev){
    if (!ev||!ev.ativo) return 1;
    if (ev.expira_em && Date.now()>ev.expira_em) return 1;
    return ev.multiplicador||1;
  });
}


function getProgresso(uid) {
  return dbGet('/biblioteca/progresso/'+fkey(uid)+'/'+mesAtual()).then(function(d){
    return d||{ horas_efetivas:0, marcos_processados:[] };
  });
}


function calcularHorasReais(sessao) {
  var fim = Math.min(Date.now(), sessao.termina_em);
  return Math.max(0, (fim - sessao.inicio_em) / 3600000);
}

function getHorasReaisHoje(uid) {
  return dbGet('/biblioteca/historico/'+fkey(uid)).then(function(hist){
    if (!hist) return 0;
    var hoje = diaAtual();
    var total = 0;
    Object.values(hist).filter(Boolean).forEach(function(s){
      if (!s.inicio_em) return;
      var d = new Date(s.inicio_em);
      var dia = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      if (dia === hoje) total += (s.horas_reais || 0);
    });
    return parseFloat(total.toFixed(4));
  });
}


function calcularHorasEfetivas(sessao, bonusGrupo, bonusEvento, atributos) {
  var agora = Date.now();
  var fim   = Math.min(agora, sessao.termina_em);
  var horasReais = Math.max(0,(fim-sessao.inicio_em)/3600000);
  var modInteracoes = 0;
  if (sessao.interacoes_recebidas) {
    var ir = sessao.interacoes_recebidas, bSab = bonusSabedoria(atributos);
    modInteracoes += (ir.cutucar||0)*0.01*bSab;
    modInteracoes += (ir.impulsionar||0)*0.02*bSab;
    if (sessao.mesa_id !== 'fundo') modInteracoes += (ir.atrapalhar||0)*(-0.04);
  }
  var bonusMesa = sessao.mesa_id==='corredor' ? 1.05 : 1;
  var efetivas  = horasReais * bonusMesa * bonusGrupo * bonusEvento * bonusInteligencia(atributos) * (1+modInteracoes);
  return parseFloat(Math.max(0,efetivas).toFixed(4));
}


function processarColeta(uid, nome, sessao) {
  return Promise.all([getBonusGrupo(sessao.grupo_id||null), getBonusEvento(), getAtributos(uid)]).then(function(res){
    var bonusGrupo=res[0], bonusEvento=res[1], atributos=res[2];
    var horasEfetivas = calcularHorasEfetivas(sessao, bonusGrupo, bonusEvento, atributos);
    var horasReais    = calcularHorasReais(sessao);
    var bonusMesa     = sessao.mesa_id==='corredor' ? 1.05 : 1;
    var bonusTotal    = bonusMesa * bonusGrupo * bonusEvento * bonusInteligencia(atributos);
    var bonusPct      = Math.round((bonusTotal-1)*100);

    return getProgresso(uid).then(function(prog){
      var totalAgora        = parseFloat(((prog.horas_efetivas||0)+horasEfetivas).toFixed(4));
      var marcosProcessados = prog.marcos_processados||[];
      var novasRecompensas  = [];
      MARCOS.forEach(function(marco){
        if (totalAgora>=marco.horas && marcosProcessados.indexOf(marco.horas)===-1) {
          novasRecompensas = novasRecompensas.concat(marco.recompensas);
          marcosProcessados.push(marco.horas);
        }
      });

      return dbPut('/biblioteca/progresso/'+fkey(uid)+'/'+mesAtual(), {
        horas_efetivas: totalAgora,
        marcos_processados: marcosProcessados
      }).then(function(){
        var promessas = novasRecompensas.map(function(item){
          return dbPost('/inventario/'+fkey(uid),{ nome:item.nome, descricao:item.descricao, quantidade:1, categoria:item.categoria, valor:item.valor||0, origem:'biblioteca' });
        });

        promessas.push(dbPost('/biblioteca/historico/'+fkey(uid), {
          inicio_em:      sessao.inicio_em,
          horas_reais:    horasReais,
          horas_efetivas: horasEfetivas,
          bonus_pct:      bonusPct,
          mesa_label:     sessao.mesa_label||'Mesa Central',
          livro:          sessao.livro||null
        }));

        promessas.push(atualizarRanking(uid, nome, horasEfetivas));

        return Promise.all(promessas).then(function(){
          return { horasEfetivas:horasEfetivas, novasRecompensas:novasRecompensas, totalAgora:totalAgora, bonusPct:bonusPct };
        });
      });
    });
  });
}


function atualizarRanking(uid, nome, horas) {
  var path = '/biblioteca/ranking/'+mesAtual()+'/'+fkey(uid);
  return dbGet(path).then(function(d){
    return dbPut(path,{ nome:nome, horas:parseFloat(((d&&d.horas?d.horas:0)+horas).toFixed(4)) });
  });
}

function limparExpiradas(ativas) {
  if (!ativas) return Promise.resolve();
  var agora=Date.now(), promessas=[];
  Object.keys(ativas).forEach(function(k){
    var s=ativas[k];
    if (!s||!s.termina_em||agora<=s.termina_em) return;

    promessas.push(
      dbGet('/biblioteca/ativas/'+k).then(function(atual){
        // Se já foi deletada por outra chamada concorrente, para aqui
        if (!atual||atual.termina_em>agora) return;

        // Deleta ANTES de processar
        return dbDel('/biblioteca/ativas/'+k).then(function(){
          return getNome(atual.uid).then(function(nome){
            return processarColeta(atual.uid,nome,atual).then(function(res){
              if (res.novasRecompensas.length>0)
                bibToast(nome+' atingiu um marco! '+res.novasRecompensas.map(function(r){ return r.nome; }).join(', '),6000);
            });
          });
        });
      })
    );
  });
  return Promise.all(promessas);
}


function criarGrupo(uid, nomeUsuario, nomeGrupo) {
  var membros = {}; membros[fkey(uid)] = { nome: nomeUsuario, uid: uid };
  return dbPost('/biblioteca/grupos', {
    nome:      nomeGrupo || 'Grupo de Estudo',
    lider:     uid,
    membros:   membros,
    criado_em: Date.now()
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    return setMeuGrupo(uid, d.name).then(function(){ return d.name; });
  });
}

function entrarGrupo(uid, nomeUsuario, gid) {
  return getMeuGrupo(uid).then(function(grupoAtual){
    if (grupoAtual) {
      bibToast('Você já está em um grupo. Saia primeiro para entrar em outro.', 4000);
      return null;
    }
    var p = {}; p[fkey(uid)] = { nome: nomeUsuario, uid: uid };
    return dbPatch('/biblioteca/grupos/'+gid+'/membros', p)
      .then(function(){ return setMeuGrupo(uid, gid); })
      .catch(function(){
        var rollback = {}; rollback[fkey(uid)] = null;
        dbPatch('/biblioteca/grupos/'+gid+'/membros', rollback);
        bibToast('Erro ao entrar no grupo. Tente novamente.', 4000);
        return null;
      });
  });
}

function sairGrupo(uid, gid) {
  var p = {}; p[fkey(uid)] = null;
  return dbPatch('/biblioteca/grupos/'+gid+'/membros', p)
    .then(function(){ return setMeuGrupo(uid, null); });
}

function deletarGrupo(liderUid, gid) {
  return dbGet('/biblioteca/grupos/'+gid).then(function(g){
    if (!g) return;
    var promessas = [];
    if (g.membros) {
      Object.keys(g.membros).forEach(function(k){
        var m = g.membros[k]; if (!m) return;
        promessas.push(setMeuGrupo(m.uid, null));
      });
    }
    return Promise.all(promessas).then(function(){ return dbDel('/biblioteca/grupos/'+gid); });
  });
}


function bibToast(msg, dur) {
  var t=document.getElementById('bib-toast'); if (!t) return;
  t.textContent=msg; t.style.opacity='1';
  setTimeout(function(){ t.style.opacity='0'; },dur||4000);
}


var _timerUI=null;
function iniciarTimerUI(inicio_em) {
  if (_timerUI) clearInterval(_timerUI);
  function atualizar(){ var el=document.getElementById('bib-timer'); if (!el){ clearInterval(_timerUI); return; } el.textContent=fmtTimerCrescente(Date.now()-inicio_em); }
  atualizar(); _timerUI=setInterval(atualizar,1000);
}


var _statusTicker=null;
function iniciarStatusTicker(sessao, uid) {
  if (_statusTicker) clearInterval(_statusTicker);
  function atualizar(){ dbPatch('/biblioteca/ativas/'+fkey(uid),{ status:getStatusAleatorio(sessao) }); }
  atualizar(); _statusTicker=setInterval(atualizar,180000);
}
function pararStatusTicker(){ if (_statusTicker){ clearInterval(_statusTicker); _statusTicker=null; } }


function registrarEfeitoLog(alvoUid, tipo, remetenteNome) {
  var entry = { tipo: tipo, remetente_nome: remetenteNome, ts: Date.now() };
  return dbPost('/biblioteca/ativas/'+fkey(alvoUid)+'/interacoes_recebidas/log', entry);
}


function renderCards(ativas, user) {
  var el=document.getElementById('bib-cards'); if (!el) return;
  var agora=Date.now();
  var lista=Object.values(ativas||{}).filter(function(s){ return s&&s.uid&&s.termina_em>agora; });
  if (!lista.length){ el.innerHTML='<div class="bib-vazia">A biblioteca está vazia no momento.</div>'; return; }

  var minhaSessao=user.logado ? ativas[fkey(user.uid)] : null;
  var euEstouDentro=minhaSessao&&minhaSessao.termina_em>agora;
  var cdPromise=(user.logado&&euEstouDentro) ? getCooldownsHoje(user.uid) : Promise.resolve({});

  cdPromise.then(function(cd){
    el.innerHTML=lista.map(function(s){
      var ehEu=user.logado&&String(s.uid)===String(user.uid);
      var podeInteragir=euEstouDentro&&!ehEu;
      var btns='';
      if (podeInteragir) {
        var visiveis=INTERACOES.filter(function(a){ return !(a.id==='atrapalhar'&&s.mesa_id==='fundo'); });
        btns='<div class="bib-card-acoes">'+
          visiveis.map(function(a){
            var usado=temCooldown(cd,s.uid,a.id);
            return '<button class="bib-card-btn'+(usado?' bib-card-btn-usado':'')+'" data-alvo="'+s.uid+'" data-tipo="'+a.id+'" title="'+a.label+(usado?' (Já usado hoje)':'')+'"'+(usado?' disabled':'')+'>'+a.emoji+'</button>';
          }).join('')+'</div>';
      }
      var efeitoLabel=s.mesa_id==='janela'?' · -1 energia/h':s.mesa_id==='fundo'?' · Imune a atrapalhar':s.mesa_id==='corredor'?' · +5% horas':'';
      var statusTxt=s.status||(s.livro?'Lendo "'+s.livro+'"':'Estudando...');
      return '<div class="bib-card'+(ehEu?' bib-card-eu':'')+'">' +
        '<div class="bib-card-nome">'+(s.nome||'u'+s.uid)+'</div>'+
        (s.mesa_label?'<div class="bib-card-mesa">'+s.mesa_label+efeitoLabel+'</div>':'')+
        '<div class="bib-card-status">'+statusTxt+'</div>'+
        '<div class="bib-card-termina">'+fmtTerminaEm(s.termina_em-agora)+'</div>'+
        btns+'</div>';
    }).join('');

    if (euEstouDentro) {
      var nomeRemetente = user.nome || ('u'+user.uid);
      el.querySelectorAll('.bib-card-btn:not([disabled])').forEach(function(btn){
        btn.addEventListener('click',function(){
          var alvoUid=btn.dataset.alvo, tipo=btn.dataset.tipo;
          var acao=INTERACOES.filter(function(a){ return a.id===tipo; })[0]; if (!acao) return;
          btn.disabled=true; btn.classList.add('bib-card-btn-usado');
          marcarCooldown(user.uid,alvoUid,tipo);
          registrarEfeitoLog(alvoUid, tipo, nomeRemetente);
          if (acao.tipo==='energia') {
            adicionarEnergia(alvoUid,acao.valor).then(function(){ bibToast('Energizou! +'+acao.valor+' energia.'); });
          } else {
            dbGet('/biblioteca/ativas/'+fkey(alvoUid)).then(function(sa){
              if (!sa) return;
              if (tipo==='atrapalhar'&&sa.mesa_id==='fundo'){ bibToast('Esse jogador está no fundo e é imune!'); return; }
              var ir=sa.interacoes_recebidas||{}; ir[tipo]=(ir[tipo]||0)+1;
              dbPatch('/biblioteca/ativas/'+fkey(alvoUid),{ interacoes_recebidas:ir }).then(function(){
                bibToast(acao.label+' aplicado! '+(acao.mod>0?'+':'')+Math.round(acao.mod*100)+'%');
              });
            });
          }
        });
      });
    }
  });
}


function renderPainelEntrar(user) {
  var painel=document.getElementById('bib-painel-usuario'); if (!painel) return;
  if (!aberta()){ painel.innerHTML='<div class="bib-aviso-sb">A biblioteca está fechada. Aberta das '+HORA_ABERTURA+'h às '+HORA_FECHAMENTO+'h.</div>'; return; }

  var escolha={ mesa:null, livro:null, horas:null, custo:null };

  function step1() {
    dbGet('/biblioteca/ativas').then(function(ativas){
      painel.innerHTML='<div class="bib-sb-titulo">Onde vai sentar?</div><div class="bib-mesas-grid">'+
        MESAS.map(function(m){
          var ocu=contarMesa(ativas,m.id), cheio=m.limite>0&&ocu>=m.limite;
          var hint=m.efeito==='janela'?'-1 energia/h':m.efeito==='fundo'?'imune atrapalhar':m.efeito==='corredor'?'+5% horas':'';
          var vagas=m.limite>0?(m.limite-ocu)+' vagas':'';
          return '<button class="bib-btn-mesa'+(cheio?' bib-btn-mesa-cheio':'')+'" data-id="'+m.id+'"'+(cheio?' disabled':'')+'>'+m.label+
            (hint?'<span class="bib-mesa-hint">'+hint+'</span>':'')+
            (vagas?'<span class="bib-mesa-vagas">'+vagas+'</span>':'')+
            '</button>';
        }).join('')+'</div>';
      painel.querySelectorAll('.bib-btn-mesa:not([disabled])').forEach(function(btn){
        btn.addEventListener('click',function(){ escolha.mesa=MESAS.filter(function(m){ return m.id===btn.dataset.id; })[0]||null; step2(); });
      });
    });
  }

  function step2() {
    getLivros(user.uid).then(function(livros){
      painel.innerHTML='<div class="bib-sb-titulo">Algum livro?</div>'+
        '<select class="bib-select" id="bib-livro-sel"><option value="">Nenhum</option>'+livros.map(function(l){ return '<option>'+l+'</option>'; }).join('')+'</select>'+
        '<div class="bib-step-row"><button class="bib-btn-mini" id="bib-v1">Voltar</button><button class="bib-btn-confirmar" id="bib-prox2">Próximo</button></div>';
      document.getElementById('bib-v1').addEventListener('click',step1);
      document.getElementById('bib-prox2').addEventListener('click',function(){ escolha.livro=document.getElementById('bib-livro-sel').value||null; step3(); });
    });
  }

  function step3() {
    Promise.all([getEnergia(user.uid), getAtributos(user.uid), getHorasReaisHoje(user.uid)]).then(function(res){
      var eng=res[0], atributos=res[1], horasHoje=res[2];
      var restante = parseFloat((LIMITE_HORAS_DIA - horasHoje).toFixed(4));

      if (restante <= 0) {
        painel.innerHTML=
          '<div class="bib-sb-titulo">Limite diário atingido</div>'+
          '<p class="bib-sb-hint">Você já estudou '+fmtHoras(horasHoje)+' hoje. O limite é '+LIMITE_HORAS_DIA+'h por dia.</p>'+
          '<div class="bib-step-row"><button class="bib-btn-mini" id="bib-v2b">Voltar</button></div>';
        document.getElementById('bib-v2b').addEventListener('click', step2);
        return;
      }

      var custoBase=ENERGIA_POR_HORA[escolha.mesa?escolha.mesa.id:'central']||5;
      painel.innerHTML='<div class="bib-sb-titulo">Quanto tempo?</div>'+
        (horasHoje > 0 ? '<div class="bib-sb-hint">Já estudou '+fmtHoras(horasHoje)+' hoje. Restam '+fmtHoras(restante)+'.</div>' : '')+
        '<div class="bib-horas-grid">'+
        [1,2,3,4,5,6].map(function(h){
          var excede = h > restante;
          var custo=descontoEnergiaDeterminacao(atributos,custoBase*h), pode=eng.cur>=custo && !excede;
          return '<button class="bib-btn-horas'+(!pode?' bib-btn-horas-sem':'')+'" data-horas="'+h+'" data-custo="'+custo+'"'+(!pode?' disabled':'')+'>'+
            h+'h<span class="bib-horas-custo">'+(excede ? 'limite' : '-'+custo+' energia')+'</span></button>';
        }).join('')+'</div>'+
        '<div class="bib-sb-hint">Energia: '+eng.cur+'/'+eng.tot+'</div>'+
        '<div class="bib-step-row"><button class="bib-btn-mini" id="bib-v2">Voltar</button></div>';
      document.getElementById('bib-v2').addEventListener('click',step2);
      painel.querySelectorAll('.bib-btn-horas:not([disabled])').forEach(function(btn){
        btn.addEventListener('click',function(){ escolha.horas=parseInt(btn.dataset.horas); escolha.custo=parseInt(btn.dataset.custo); step4(); });
      });
    });
  }

  function step4() {
    painel.innerHTML='<div class="bib-sb-titulo">Confirmar entrada</div>'+
      '<div class="bib-resumo">'+
        '<div>'+(escolha.mesa?escolha.mesa.label:'Mesa Central')+'</div>'+
        (escolha.livro?'<div>"'+escolha.livro+'"</div>':'')+
        '<div>'+escolha.horas+'h · -'+escolha.custo+' energia</div>'+
      '</div>'+
      '<div class="bib-step-row"><button class="bib-btn-mini" id="bib-v3">Voltar</button><button class="bib-btn-confirmar" id="bib-confirmar">Entrar</button></div>';
    document.getElementById('bib-v3').addEventListener('click',step3);
    document.getElementById('bib-confirmar').addEventListener('click',function(){ confirmarEntrada(user,escolha.mesa,escolha.livro,escolha.horas,escolha.custo); });
  }

  step1();
}


function confirmarEntrada(user, mesa, livro, horas, custo) {
  var painel=document.getElementById('bib-painel-usuario');
  if (painel) painel.innerHTML='<div class="bib-sb-titulo">Entrando...</div>';
  Promise.all([getNome(user.uid), getMeuGrupo(user.uid)]).then(function(res){
  var nome = res[0], grupoId = res[1] || null;
    getHorasReaisHoje(user.uid).then(function(horasHoje){
      if (horas > LIMITE_HORAS_DIA - horasHoje) {
        bibToast('Limite diário atingido! Restam '+fmtHoras(LIMITE_HORAS_DIA - horasHoje)+' hoje.', 5000);
        renderPainelEntrar(user); return;
      }
      descontarEnergia(user.uid,custo).then(function(ok){
        if (!ok){ bibToast('Energia insuficiente!'); renderPainelEntrar(user); return; }
        var agora=Date.now();
        var sessao={ uid:user.uid, nome:nome, inicio_em:agora, termina_em:agora+horas*3600000,
          mesa_id:mesa?mesa.id:'central', mesa_label:mesa?mesa.label:'Mesa Central',
          livro:livro||null, grupo_id:grupoId, interacoes_recebidas:{}, status:null };
        dbPut('/biblioteca/ativas/'+fkey(user.uid),sessao).then(function(){
          renderPainelSessao(user,sessao);
          iniciarStatusTicker(sessao,user.uid);
          carregarBiblioteca(user);
        });
      });
    });
  });
}


function renderPainelSessao(user, sessao) {
  var painel=document.getElementById('bib-painel-usuario'); if (!painel) return;
  var concluida=Date.now()>=sessao.termina_em;
  painel.innerHTML='<div class="bib-sb-titulo">'+(concluida?'Sessão concluída!':'Estudando')+'</div>'+
    (concluida
      ? '<p class="bib-sb-hint">Suas horas foram registradas automaticamente.</p>'
      : '<div id="bib-timer" class="bib-timer">00:00:00</div>'+
        '<p class="bib-sb-hint">'+sessao.mesa_label+(sessao.livro?' · "'+sessao.livro+'"':'')+'</p>'+
        '<button id="bib-btn-sair" class="bib-btn-mini" style="margin-top:10px;display:block;width:100%">Encerrar sessão</button>');
  if (!concluida) {
    document.getElementById('bib-btn-sair').addEventListener('click',function(){
      if (window.confirm('Encerrar agora? As horas estudadas serão registradas.')) encerrarSessao(user,sessao);
    });
    iniciarTimerUI(sessao.inicio_em);
    iniciarStatusTicker(sessao,user.uid);
  }
}

function encerrarSessao(user, sessao) {
  if (_timerUI){ clearInterval(_timerUI); _timerUI=null; }
  pararStatusTicker();
  var painel=document.getElementById('bib-painel-usuario');
  if (painel) painel.innerHTML='<div class="bib-sb-titulo">Encerrando...</div>';
  getNome(user.uid).then(function(nome){
    processarColeta(user.uid,nome,sessao).then(function(res){
      dbDel('/biblioteca/ativas/'+fkey(user.uid)).then(function(){
        var msg=fmtHoras(res.horasEfetivas)+' registradas'+(res.bonusPct>0?' (bônus total +'+res.bonusPct+'%)':'')+'.';
        if (res.novasRecompensas.length>0) msg+=' Marco atingido! '+res.novasRecompensas.map(function(r){ return r.nome; }).join(', ')+'!';
        bibToast(msg,6000);
        renderPainelEntrar(user); renderSidebarInfo(user); carregarBiblioteca(user);
      });
    });
  });
}


function renderSidebarInfo(user) {
  var el=document.getElementById('bib-sb-info'); if (!el) return;
  Promise.all([getProgresso(user.uid), getNome(user.uid), getAtributos(user.uid)]).then(function(res){
    var prog=res[0], nome=res[1], atributos=res[2];
    var total=prog.horas_efetivas||0;
    var marcosProc=prog.marcos_processados||[];
    var proximoMarco=MARCOS.filter(function(m){ return marcosProc.indexOf(m.horas)===-1; })[0];
    var atList=resumoAtributos(atributos);
    el.innerHTML=
      '<div class="bib-sb-nome">'+nome+'</div>'+
      '<div class="bib-sb-stat"><span>Total este mês</span><span class="bib-sb-val">'+fmtHoras(total)+'</span></div>'+
      (proximoMarco
        ? '<div class="bib-sb-stat"><span>Próximo marco</span><span class="bib-sb-val">'+fmtHoras(proximoMarco.horas-total)+'</span></div>'+
          '<div class="bib-marco-track"><div class="bib-marco-fill" style="width:'+Math.min(100,(total/proximoMarco.horas)*100)+'%"></div></div>'
        : '<div class="bib-sb-stat"><span>Todos os marcos conquistados!</span></div>')+
      '<div class="bib-atrib-titulo">Atributos</div>'+
      atList.map(function(a){
        return '<div class="bib-atrib-linha">'+
          '<span class="bib-atrib-label">'+a.label+'</span>'+
          '<span class="bib-atrib-val">'+a.val+'</span>'+
          '<span class="bib-atrib-bonus">'+a.bonus+'</span>'+
        '</div>';
      }).join('');
  });
}


function renderTabs(user) {
  var sec=document.getElementById('bib-tabs-section'); if (!sec) return;
  var abas=[
    { id:'efeitos',   label:'Efeitos'   },
    { id:'historico', label:'Histórico' },
    { id:'atributos', label:'Atributos' }
  ];
  if (isAdmin(user.uid)) abas.push({ id:'admin', label:'Admin' });

  sec.innerHTML=
    '<div class="bib-tabs">'+
      abas.map(function(a){ return '<button class="bib-tab" data-tab="'+a.id+'">'+a.label+'</button>'; }).join('')+
    '</div>'+
    '<div id="bib-tab-content"></div>'+
    '<div class="bib-botoes-extra">'+
      '<button class="bib-btn-extra" id="bib-btn-ranking" title="Ranking"><i class="fa-solid fa-trophy"></i></button>'+
      '<button class="bib-btn-extra" id="bib-btn-grupos"  title="Grupos"><i class="fa-solid fa-user-group"></i></button>'+
    '</div>';

  document.getElementById('bib-btn-ranking').addEventListener('click',function(){ abrirModal('Ranking',function(mel){ renderRanking(mel); }); });
  document.getElementById('bib-btn-grupos').addEventListener('click',function(){ abrirModal('Grupos',function(mel){ renderGrupos(user,mel); }); });

  sec.querySelectorAll('.bib-tab').forEach(function(btn){
    btn.addEventListener('click',function(){
      sec.querySelectorAll('.bib-tab').forEach(function(b){ b.classList.remove('bib-tab-ativo'); });
      btn.classList.add('bib-tab-ativo');
      var el=document.getElementById('bib-tab-content'); el.innerHTML='';
      if      (btn.dataset.tab==='efeitos')   renderEfeitos(user,el);
      else if (btn.dataset.tab==='historico') renderHistorico(user,el);
      else if (btn.dataset.tab==='atributos') renderAtributosTab(user,el);
      else if (btn.dataset.tab==='admin')     renderAdmin(el);
    });
  });

  sec.querySelector('.bib-tab').classList.add('bib-tab-ativo');
  renderEfeitos(user, document.getElementById('bib-tab-content'));
}


function abrirModal(titulo, renderFn) {
  var existing=document.getElementById('bib-modal');
  if (existing) existing.remove();
  var overlay=document.createElement('div');
  overlay.id='bib-modal';
  overlay.innerHTML=
    '<div class="bib-modal-box">'+
      '<div class="bib-modal-header"><span>'+titulo+'</span><button class="bib-modal-fechar" id="bib-modal-fechar">✕</button></div>'+
      '<div class="bib-modal-corpo" id="bib-modal-corpo"></div>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){ if (e.target===overlay) overlay.remove(); });
  document.getElementById('bib-modal-fechar').addEventListener('click',function(){ overlay.remove(); });
  renderFn(document.getElementById('bib-modal-corpo'));
}


function renderEfeitos(user, el) {
  el.innerHTML='<p class="bib-tab-info">Carregando...</p>';
  dbGet('/biblioteca/ativas/'+fkey(user.uid)).then(function(sessao){
    if (!sessao||!sessao.termina_em||sessao.termina_em<Date.now()) {
      el.innerHTML='<p class="bib-tab-info">Nenhuma sessão ativa no momento.</p>'; return;
    }
    var log = sessao.interacoes_recebidas && sessao.interacoes_recebidas.log;
    if (!log||!Object.keys(log).length) {
      el.innerHTML='<p class="bib-tab-info">Nenhum efeito recebido nesta sessão.</p>'; return;
    }
    var lista = Object.values(log).filter(Boolean).sort(function(a,b){ return b.ts-a.ts; });
    el.innerHTML='<div class="bib-efeitos-lista">'+
      lista.map(function(e){
        var info = EFEITO_LABELS[e.tipo] || { label: e.tipo, mod: '', cls: '' };
        var hora = new Date(e.ts).toLocaleTimeString('pt-BR',{ day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
        return '<div class="bib-efeito-item '+info.cls+'">'+
          '<span class="bib-ef-remetente">'+e.remetente_nome+'</span>'+
          '<span class="bib-ef-tipo">'+info.label+'</span>'+
          '<span class="bib-ef-mod">'+info.mod+'</span>'+
          '<span class="bib-ef-hora">'+hora+'</span>'+
        '</div>';
      }).join('')+
    '</div>';
  });
}

function renderHistorico(user, el) {
  el.innerHTML='<p class="bib-tab-info">Carregando...</p>';
  dbGet('/biblioteca/historico/'+fkey(user.uid)).then(function(hist){
    if (!hist){ el.innerHTML='<p class="bib-tab-info">Nenhuma sessão registrada ainda.</p>'; return; }
    var lista=Object.values(hist).filter(Boolean).sort(function(a,b){ return b.inicio_em-a.inicio_em; }).slice(0,30);
    if (!lista.length){ el.innerHTML='<p class="bib-tab-info">Nenhuma sessão registrada ainda.</p>'; return; }
    el.innerHTML='<div class="bib-hist-lista">'+lista.map(function(s){
      return '<div class="bib-hist-item">'+
        '<span class="bib-hist-data">'+fmtData(s.inicio_em)+'</span>'+
        '<span class="bib-hist-horas">'+fmtHoras(s.horas_efetivas)+'</span>'+
        (s.bonus_pct>0?'<span class="bib-hist-bonus">+'+s.bonus_pct+'%</span>':'')+
        (s.mesa_label?'<span class="bib-hist-det">'+s.mesa_label+'</span>':'')+
        (s.livro?'<span class="bib-hist-det">"'+s.livro+'"</span>':'')+
      '</div>';
    }).join('')+'</div>';
  });
}

function renderAtributosTab(user, el) {
  el.innerHTML='<p class="bib-tab-info">Carregando...</p>';
  getAtributos(user.uid).then(function(atributos){
    var lista=resumoAtributos(atributos);
    el.innerHTML='<div class="bib-atrib-tab">'+
      lista.map(function(a){
        var barra=Math.round((a.val/25)*100);
        return '<div class="bib-atrib-bloco">'+
          '<div class="bib-atrib-topo"><span class="bib-atrib-label">'+a.label+'</span><span class="bib-atrib-val-grande">'+a.val+'/25</span></div>'+
          '<div class="bib-marco-track"><div class="bib-marco-fill" style="width:'+barra+'%"></div></div>'+
          '<div class="bib-atrib-desc">'+a.bonus+'</div>'+
        '</div>';
      }).join('')+
    '</div>';
  });
}


function renderRanking(el) {
  el.innerHTML='<p class="bib-tab-info">Carregando...</p>';
  dbGet('/biblioteca/ranking/'+mesAtual()).then(function(dados){
    if (!dados){ el.innerHTML='<p class="bib-tab-info">Sem dados para este mês.</p>'; return; }
    var lista=Object.values(dados).filter(Boolean).sort(function(a,b){ return b.horas-a.horas; }).slice(0,10);
    var m=mesAtual().split('-');
    el.innerHTML='<div class="bib-ranking"><p class="bib-ranking-mes">Top 10 — '+m[1]+'/'+m[0]+'</p>'+
      lista.map(function(p,i){
        return '<div class="bib-rank-item"><span class="bib-rank-pos">'+(i+1)+'</span><span class="bib-rank-nome">'+p.nome+'</span><span class="bib-rank-horas">'+fmtHoras(p.horas)+'</span></div>';
      }).join('')+'</div>';
  });
}


function renderGrupos(user, el) {
  getMeuGrupo(user.uid).then(function(meuGid){
    meuGid = meuGid || null;

    dbGet('/biblioteca/grupos').then(function(grupos){
      var html = '<div class="bib-grupos-wrap">';

      if (!meuGid) {
        html += '<div class="bib-grupo-criar">'+
          '<input class="bib-select" id="bib-nome-grupo" type="text" maxlength="40" placeholder="Nome do grupo (obrigatório)">'+
          '<button class="bib-btn-confirmar" id="bib-criar-grupo">Criar grupo</button>'+
        '</div>';
      } else {
        html += '<p class="bib-tab-info bib-grupo-ativo-aviso">Você já está em um grupo. Saia primeiro para entrar em outro.</p>';
      }

      var gids = Object.keys(grupos || {});
      if (gids.length > 0) {
        html += '<div class="bib-grupos-lista">';
        gids.forEach(function(gid){
          var g = grupos[gid];
          var membros = Object.values(g.membros||{}).filter(Boolean);
          var qtd = membros.length;
          var cheio = qtd >= 4;
          var bonus = qtd >= 4 ? '+10%' : qtd === 3 ? '+7%' : qtd === 2 ? '+5%' : '+2%';
          var ehMeu = gid === meuGid;
          var ehLider = String(g.lider) === String(user.uid);

          html += '<div class="bib-grupo-card">'+
            '<div class="bib-grupo-nome">'+(g.nome||'Grupo de Estudo')+'</div>'+
            '<div class="bib-grupo-membros">'+membros.map(function(m){ return m.nome; }).join(', ')+'</div>'+
            '<div class="bib-grupo-rodape">'+
              '<span class="bib-grupo-bonus">Bônus: '+bonus+' · '+qtd+'/4</span>';

          if (ehMeu) {
            if (ehLider) {
              html += '<button class="bib-btn-mini bib-deletar-grupo" data-gid="'+gid+'" style="color:#c06060;">Deletar grupo</button>';
            } else {
              html += '<button class="bib-btn-mini bib-sair-grupo" data-gid="'+gid+'">Sair</button>';
            }
          } else if (!meuGid && !cheio) {
            html += '<button class="bib-btn-hora bib-entrar-grupo" data-gid="'+gid+'">Entrar</button>';
          } else if (!meuGid && cheio) {
            html += '<span class="bib-grupo-cheio">Cheio</span>';
          }

          html += '</div></div>';
        });
        html += '</div>';
      } else {
        html += '<p class="bib-tab-info">Nenhum grupo criado ainda.</p>';
      }

      html += '</div>';
      el.innerHTML = html;

      var bcBtn = el.querySelector('#bib-criar-grupo');
      if (bcBtn) {
        bcBtn.addEventListener('click', function(){
          var nomeInput = el.querySelector('#bib-nome-grupo');
          var nomeGrupo = nomeInput ? nomeInput.value.trim() : '';
          if (!nomeGrupo){ bibToast('Digite um nome para o grupo.', 3000); return; }
          getNome(user.uid).then(function(n){
            criarGrupo(user.uid, n, nomeGrupo).then(function(){ renderGrupos(user, el); });
          });
        });
      }

      el.querySelectorAll('.bib-entrar-grupo').forEach(function(btn){
        btn.addEventListener('click', function(){
          getNome(user.uid).then(function(n){
            entrarGrupo(user.uid, n, btn.dataset.gid).then(function(res){
              if (res !== null) renderGrupos(user, el);
            });
          });
        });
      });

      el.querySelectorAll('.bib-sair-grupo').forEach(function(btn){
        btn.addEventListener('click', function(){
          sairGrupo(user.uid, btn.dataset.gid).then(function(){ renderGrupos(user, el); });
        });
      });

      el.querySelectorAll('.bib-deletar-grupo').forEach(function(btn){
        btn.addEventListener('click', function(){
          if (!window.confirm('Deletar o grupo? Todos os membros serão removidos.')) return;
          deletarGrupo(user.uid, btn.dataset.gid).then(function(){ renderGrupos(user, el); });
        });
      });
    });
  });
}


function renderAdmin(el) {
  dbGet('/biblioteca/evento').then(function(ev){
    var evAtivo=ev&&ev.ativo&&(!ev.expira_em||Date.now()<ev.expira_em);
    el.innerHTML='<div class="bib-sb-titulo">Evento</div>'+
      (evAtivo
        ? '<div class="bib-admin-linha"><span>Ativo x'+ev.multiplicador+'</span><button class="bib-btn-mini" id="bib-ev-parar">Encerrar</button></div>'
        : '<div class="bib-ev-form"><select class="bib-select" id="bib-ev-mult"><option value="1.5">x1.5</option><option value="2">x2</option><option value="3">x3</option></select><select class="bib-select" id="bib-ev-horas"><option value="1">1h</option><option value="2">2h</option><option value="3">3h</option><option value="6">6h</option></select><button class="bib-btn-confirmar" id="bib-ev-ativar">Ativar</button></div>');
    var bp=document.getElementById('bib-ev-parar');
    if (bp) bp.addEventListener('click',function(){ dbPut('/biblioteca/evento',{ativo:false}).then(function(){ renderAdmin(el); }); });
    var ba=document.getElementById('bib-ev-ativar');
    if (ba) ba.addEventListener('click',function(){
      dbPut('/biblioteca/evento',{ ativo:true, multiplicador:parseFloat(document.getElementById('bib-ev-mult').value), expira_em:Date.now()+parseInt(document.getElementById('bib-ev-horas').value)*3600000 }).then(function(){ renderAdmin(el); });
    });
  });
}


var _pollingBib=null;
function carregarBiblioteca(user){
  dbGet('/biblioteca/ativas').then(function(ativas){ limparExpiradas(ativas); renderCards(ativas,user); renderBadgeEvento(); });
}
function renderBadgeEvento(){
  dbGet('/biblioteca/evento').then(function(ev){
    var badge=document.getElementById('bib-evento-badge'); if (!badge) return;
    var ativo=ev&&ev.ativo&&(!ev.expira_em||Date.now()<ev.expira_em);
    if (ativo){
      var expira=ev.expira_em?new Date(ev.expira_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):null;
      badge.textContent='Evento ativo: x'+ev.multiplicador+(expira?' até '+expira:''); badge.style.display='block';
    } else { badge.style.display='none'; }
  });
}


function init() {
  var user=getUser();

  _bibEl.innerHTML=
    '<div id="bib-wrapper"><div id="bib-bg"></div><div id="bib-layout">'+
    (user.logado
      ? '<div id="bib-sidebar">'+
          '<div class="bib-sb-secao" id="bib-sb-info"></div>'+
          '<div class="bib-sb-secao" id="bib-painel-usuario"></div>'+
          '<div class="bib-sb-secao bib-sb-secao-tabs" id="bib-tabs-section"></div>'+
        '</div>'
      : '')+
    '<div id="bib-main">'+
      '<div id="bib-main-header">Biblioteca de Hogwarts — '+HORA_ABERTURA+'h às '+HORA_FECHAMENTO+'h</div>'+
      '<div id="bib-evento-badge"></div>'+
      '<div id="bib-cards"></div>'+
    '</div>'+
    '</div></div><div id="bib-toast"></div>';

  if (user.logado) {
    renderSidebarInfo(user);
    dbGet('/biblioteca/ativas/'+fkey(user.uid)).then(function(sessao){
      if (sessao&&sessao.termina_em&&sessao.termina_em>Date.now()) renderPainelSessao(user,sessao);
      else renderPainelEntrar(user);
    });
    renderTabs(user);
  }

  carregarBiblioteca(user);
  _pollingBib=setInterval(function(){ carregarBiblioteca(user); },30000);
}

init();

})();
