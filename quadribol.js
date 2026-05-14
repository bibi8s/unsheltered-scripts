'use strict';


var POSICOES = ['artilheiro1','artilheiro2','batedor','goleiro','apanhador'];

var POS_LABEL = {
  artilheiro1:'Artilheiro', artilheiro2:'Artilheiro',
  batedor:'Batedor', goleiro:'Goleiro', apanhador:'Apanhador'
};

var TURN_ORDER = [
  'A_artilheiro1','B_artilheiro1',
  'A_artilheiro2','B_artilheiro2',
  'A_batedor','B_batedor',
  'A_goleiro','B_goleiro',
  'A_apanhador','B_apanhador'
];

var MAIN_ATTR = {
  artilheiro1:'destreza', artilheiro2:'destreza',
  batedor:'forca', goleiro:'resistencia', apanhador:'agilidade'
};

var NPC_ATTRS = {
  artilheiro1:['destreza','agilidade','carisma','resistencia'],
  artilheiro2:['destreza','agilidade','carisma','resistencia'],
  batedor:    ['forca','determinacao','agilidade','resistencia'],
  goleiro:    ['resistencia','sabedoria','determinacao','forca'],
  apanhador:  ['agilidade','sabedoria','carisma','determinacao']
};

var ACOES = {
  artilheiro1:[
    {id:'arremessar', nome:'Arremessar', desc:'Tenta marcar gol. Rola contra o Goleiro adversario.'},
    {id:'passar',     nome:'Passar',     desc:'Passa a Goles para o parceiro (+2 no arremesso).'},
    {id:'fintar',     nome:'Fintar',     desc:'Desvia do Balaco adversario. Usa agilidade + carisma.'}
  ],
  artilheiro2:[
    {id:'arremessar', nome:'Arremessar', desc:'Tenta marcar gol. Rola contra o Goleiro adversario.'},
    {id:'passar',     nome:'Passar',     desc:'Passa a Goles para o parceiro (+2 no arremesso).'},
    {id:'fintar',     nome:'Fintar',     desc:'Desvia do Balaco adversario. Usa agilidade + carisma.'}
  ],
  batedor:[
    {id:'lancar_balaco', nome:'Lancar Balaco',  desc:'Escolhe um adversario. -2 no atributo principal.',    temAlvo:true, alvos:'adversarios'},
    {id:'proteger',      nome:'Proteger Aliado', desc:'Cobre um aliado contra o Balaco adversario.',          temAlvo:true, alvos:'aliados'},
    {id:'interceptar',   nome:'Interceptar',     desc:'Bloqueia o passe entre os Artilheiros adversarios.'}
  ],
  goleiro:[
    {id:'defender', nome:'Defender', desc:'Posiciona-se nos aros. +2 no roll de defesa.'},
    {id:'blitz',    nome:'Blitz',    desc:'Avanca para interceptar. Se falhar, gol automatico.'}
  ],
  apanhador:[
    {id:'rastrear',  nome:'Rastrear',  desc:'Acumula +1 de bonus para captura do Pomo de Ouro.'},
    {id:'sabotar',   nome:'Sabotar',   desc:'Cancela o bonus acumulado do Apanhador adversario.'},
    {id:'distracao', nome:'Distracao', desc:'Adversario perde a fase sem acumular rastreamento.'},
    {id:'auxiliar',  nome:'Auxiliar',  desc:'Passa a Goles para um Artilheiro aliado (+2).',             temAlvo:true, alvos:'art_aliados'}
  ]
};

var FIELD_POS = {
  'A_artilheiro1':[140,85], 'A_artilheiro2':[190,175], 'A_batedor':[235,130],
  'A_goleiro':[58,140],     'A_apanhador':[310,95],
  'B_artilheiro1':[500,85], 'B_artilheiro2':[450,175], 'B_batedor':[405,130],
  'B_goleiro':[582,140],    'B_apanhador':[330,180]
};

var TREINO_META_H = typeof QUAD_TREINO_META !== 'undefined' ? QUAD_TREINO_META : 17;
var FASE_SECS     = typeof QUAD_FASE_SECS  !== 'undefined' ? QUAD_FASE_SECS  : 45;
var FB            = typeof QUAD_FB         !== 'undefined' ? QUAD_FB         : '';
var ADMIN_UIDS    = typeof QUAD_ADMINS     !== 'undefined' ? QUAD_ADMINS     : ['1'];
var CASAS         = typeof QUAD_CASAS      !== 'undefined' ? QUAD_CASAS      : ['Grifinoria','Sonserina','Corvinal','Lufa-Lufa'];
var TREINO_OPTS   = typeof QUAD_TREINO_OPCOES !== 'undefined' ? QUAD_TREINO_OPCOES : [{h:1,energia:10,label:'1h'},{h:2,energia:20,label:'2h'},{h:3,energia:30,label:'3h'}];


var myUid         = null;
var myNome        = null;
var isAdmin       = false;
var pid           = null;
var pollTimer     = null;
var countdownTimer = null;
var treinoTimer   = null;
var selectedAcoes = {};


function fbGet(path) {
  return fetch(FB + path + '.json').then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
}
function fbPut(path, data) {
  return fetch(FB + path + '.json', {method:'PUT', body:JSON.stringify(data)});
}
function fbPatch(path, data) {
  return fetch(FB + path + '.json', {method:'PATCH', body:JSON.stringify(data)});
}


function irPara(secId) {
  $('.quad-section').attr('hidden', true);
  $('#' + secId).removeAttr('hidden');
}

function ativarNav(ativa) {
  $('#quad-nav').removeAttr('hidden');
  $('.quad-nav-btn').removeClass('quad-nav-ativa');
  var map = {
    'partida':'quad-nav-partida', 'treino':'quad-nav-treino',
    'historico':'quad-nav-hist',  'admin':'quad-nav-admin',
    'lobby':'quad-nav-partida',   'game':'quad-nav-partida',
    'encerrado':'quad-nav-hist'
  };
  if (map[ativa]) $('#' + map[ativa]).addClass('quad-nav-ativa');
}

function bindNav() {
  $('#quad-nav-partida').off('click').on('click', function() {
    if (countdownTimer) clearInterval(countdownTimer);
    if (treinoTimer)    clearInterval(treinoTimer);
    boot();
  });
  $('#quad-nav-treino').off('click').on('click', function() {
    if (countdownTimer) clearInterval(countdownTimer);
    renderTreino();
  });
  $('#quad-nav-hist').off('click').on('click', function() {
    if (countdownTimer) clearInterval(countdownTimer);
    if (treinoTimer)    clearInterval(treinoTimer);
    renderHistorico();
  });
  if (isAdmin) {
    $('#quad-nav-admin').off('click').on('click', function() {
      if (countdownTimer) clearInterval(countdownTimer);
      if (treinoTimer)    clearInterval(treinoTimer);
      renderAdminPanel();
    });
  }
}


$(function() {
  var ok = false;
  try {
    if (typeof _userdata !== 'undefined' && _userdata.user_id) {
      myUid   = 'u' + _userdata.user_id;
      myNome  = _userdata.username;
      isAdmin = ADMIN_UIDS.indexOf(String(_userdata.user_id)) !== -1;
      ok = true;
    }
  } catch(e) {}
  if (ok) { setupAdmin(); boot(); }
  else     { renderLogin(); }
});

function setupAdmin() {
  if (isAdmin) $('#quad-nav-admin').removeAttr('hidden');
}

function boot() {
  if (pollTimer) clearInterval(pollTimer);
  fbGet('/quadribol/partidas').then(function(partidas) {
    var activePid = null, activeMatch = null;
    if (partidas) {
      Object.keys(partidas).forEach(function(k) {
        var m = partidas[k];
        if (!activeMatch && (m.status === 'aguardando' || m.status === 'em_andamento')) {
          activePid = k; activeMatch = m;
        }
      });
    }
    if (activeMatch) {
      pid = activePid;
      if (activeMatch.status === 'em_andamento') { renderGame(activeMatch); }
      else                                        { renderLobby(activeMatch); }
      startPoll();
    } else {
      if (isAdmin) renderAdminPanel();
      else         renderSemPartida();
    }
  });
}

function startPoll() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(function() {
    if (!pid) return;
    fbGet('/quadribol/partidas/' + pid).then(function(m) {
      if (!m) { clearInterval(pollTimer); boot(); return; }
      if (m.status === 'encerrada') { clearInterval(pollTimer); renderEncerrada(m); return; }
      if (m.status === 'em_andamento') renderGame(m);
      else                             renderLobby(m);
    });
  }, 5000);
}


function renderLogin() {
  irPara('quad-login');
  $('#quad-nav').attr('hidden', true);

  var nomeEncontrado = false;

  $('#quad-inp-uid').off('input blur').on('input blur', function() {
    var rawUid = $(this).val().trim();
    nomeEncontrado = false;
    $('#quad-btn-entrar').prop('disabled', true);
    $('#quad-uid-preview').text('').css('color', '');
    if (!rawUid) return;
    fbGet('/saldos/u' + rawUid).then(function(d) {
      if (d && d.nome) {
        $('#quad-uid-preview').text(d.nome).css('color', 'var(--quad-accent4)');
        $('#quad-btn-entrar').prop('disabled', false);
        nomeEncontrado = true;
      } else {
        $('#quad-uid-preview').text('uid nao encontrado').css('color', 'var(--quad-muted)');
      }
    });
  });

  $('#quad-btn-entrar').off('click').on('click', function(e) {
    e.preventDefault();
    var rawUid = $('#quad-inp-uid').val().trim();
    if (!rawUid || !nomeEncontrado) return;
    fbGet('/saldos/u' + rawUid).then(function(d) {
      if (!d || !d.nome) { $('#quad-uid-preview').text('uid nao encontrado'); return; }
      myUid   = 'u' + rawUid;
      myNome  = d.nome;
      isAdmin = ADMIN_UIDS.indexOf(rawUid) !== -1;
      setupAdmin();
      boot();
    });
  });

  $('#quad-inp-uid').on('keydown', function(e) {
    if (e.key === 'Enter') $('#quad-btn-entrar').trigger('click');
  });
}


function renderSemPartida() {
  irPara('quad-sem-partida');
  ativarNav('partida');
  bindNav();
}


function renderLobby(match) {
  irPara('quad-lobby');
  ativarNav('lobby');
  bindNav();

  var tA = match.times.A;
  var tB = match.times.B;
  var allConfirmed = todosConfirmados(match);
  var mySlots = encontrarMeusSlots(match);
  var pendente = null;
  for (var i = 0; i < mySlots.length; i++) {
    if (!mySlots[i].slot.confirmado) { pendente = mySlots[i]; break; }
  }

  $('#quad-lobby-nome-a').text(tA.nome);
  $('#quad-lobby-nome-b').text(tB.nome);
  $('#quad-lobby-titulo-a').text(tA.nome);
  $('#quad-lobby-titulo-b').text(tB.nome);
  $('#quad-lobby-subtitulo').text(allConfirmed ? 'todos prontos! aguardando inicio.' : 'aguardando confirmacoes...');


  if (pendente) {
    $('#quad-meu-slot').removeAttr('hidden');
    $('#quad-meu-pos-badge').text(POS_LABEL[pendente.pos]);
    $('#quad-meu-time-nome').text(pendente.time === 'A' ? tA.nome : tB.nome);
    if (pendente.slot.capitao) $('#quad-meu-cap-badge').removeAttr('hidden');
    else                       $('#quad-meu-cap-badge').attr('hidden', true);
    carregarVassouras();
  } else {
    $('#quad-meu-slot').attr('hidden', true);
  }


  $('#quad-lobby-lista-a').html(gerarListaJogadores(tA.slots));
  $('#quad-lobby-lista-b').html(gerarListaJogadores(tB.slots));


  if (isAdmin) {
    $('#quad-lobby-admin-btns').removeAttr('hidden');
    $('#quad-btn-iniciar').prop('disabled', !allConfirmed).text(allConfirmed ? 'iniciar partida' : 'aguardando confirmacoes...');
    $('#quad-btn-iniciar').off('click').on('click', iniciarPartida);
    $('#quad-btn-cancelar-lobby').off('click').on('click', cancelarPartida);
  }

  $('#quad-btn-confirmar-lobby').off('click').on('click', confirmarPresenca);
}

function gerarListaJogadores(slots) {
  return POSICOES.map(function(pos) {
    var s = slots[pos];
    if (!s) return '';
    var isNpc = s.uid === 'npc';
    var dotClass = isNpc ? 'quad-dot-npc' : s.confirmado ? 'quad-dot-ok' : 'quad-dot-wait';
    var badge = isNpc
      ? '<span class="quad-badge quad-badge-npc">npc</span>'
      : s.confirmado
        ? '<span class="quad-badge quad-badge-ok">confirmado</span>'
        : '<span class="quad-badge quad-badge-wait">aguardando</span>';
    return '<div class="quad-player-row">' +
      '<span class="quad-dot ' + dotClass + '"></span>' +
      '<div style="flex:1;">' +
        '<div class="quad-player-nome">' + s.nome + (s.capitao ? ' <span class="quad-badge quad-badge-cap">cap</span>' : '') + '</div>' +
        '<div class="quad-player-meta">' + POS_LABEL[pos] + '</div>' +
      '</div>' +
      badge +
    '</div>';
  }).join('');
}

function carregarVassouras() {
  var rawUid = myUid.replace('u', '');
  var $sel = $('#quad-sel-vassoura');
  $sel.html('<option value="padrao">Vassoura Padrao de Hogwarts (+1)</option>');
  Promise.all([fbGet('/inventario/' + myUid), fbGet('/mochila/' + myUid)]).then(function(r) {
    var todos = Object.assign({}, r[0]||{}, r[1]||{});
    var opts = '<option value="padrao">Vassoura Padrao de Hogwarts (+1)</option>';
    var lista = [];
    Object.values(todos).forEach(function(item) {
      if (!item || !item.descricao) return;
      var m = item.descricao.match(/Percorre\s+(\d+)\s+metros\s+por\s+turno/i);
      if (m) {
        var vel = parseInt(m[1]);
        lista.push({nome: item.nome||'Vassoura', velocidade: vel, bonus: Math.floor(vel/10)});
        opts += '<option value="' + (lista.length-1) + '">' + (item.nome||'Vassoura') + ' (+' + Math.floor(vel/10) + ')</option>';
      }
    });
    $sel.html(opts).data('lista', lista);
  });
}

function confirmarPresenca() {
  var vassOpt  = $('#quad-sel-vassoura').val();
  var listaV   = $('#quad-sel-vassoura').data('lista') || [];
  var vassoura = vassOpt === 'padrao' || !vassOpt
    ? {nome:'Vassoura Padrao de Hogwarts', velocidade:10, bonus:1}
    : (listaV[parseInt(vassOpt)] || {nome:'Vassoura Padrao de Hogwarts', velocidade:10, bonus:1});

  fbGet('/quadribol/partidas/' + pid).then(function(match) {
    var mySlots  = encontrarMeusSlots(match);
    var promises = [];
    mySlots.forEach(function(s) {
      if (!s.slot.confirmado) {
        promises.push(fbPatch('/quadribol/partidas/' + pid + '/times/' + s.time + '/slots/' + s.pos, {confirmado:true, vassoura:vassoura}));
      }
    });
    return Promise.all(promises);
  });
}

function iniciarPartida() {
  var agora    = Date.now();
  var deadline = agora + FASE_SECS * 1000;
  fbPatch('/quadribol/partidas/' + pid, {
    status:'em_andamento', fase_atual:1,
    fase_deadline:deadline, turno_idx:0, turno_deadline:deadline,
    fases:{1:{status:'aberta', acoes:{}}}
  });
}

function cancelarPartida() {
  if (!confirm('Cancelar a partida?')) return;
  fbPatch('/quadribol/partidas/' + pid, {status:'encerrada'}).then(function() {
    pid = null; clearInterval(pollTimer); renderAdminPanel();
  });
}


function renderGame(match) {
  irPara('quad-game');
  ativarNav('game');
  bindNav();

  var fase    = match.fase_atual;
  var faseObj = (match.fases && match.fases[fase]) ? match.fases[fase] : {};
  var acoes   = faseObj.acoes || {};
  var tA      = match.times.A;
  var tB      = match.times.B;
  var mySlots = encontrarMeusSlots(match);


  $('#quad-game-nome-a').text(tA.nome);
  $('#quad-game-nome-b').text(tB.nome);
  $('#quad-game-score-a').text(tA.placar);
  $('#quad-game-score-b').text(tB.placar);
  $('#quad-fase-label').text('fase ' + fase + ' / ' + (typeof QUAD_FASES_TOTAL !== 'undefined' ? QUAD_FASES_TOTAL : 12));


  var turnoIdx     = match.turno_idx || 0;
  var turnoSlotKey = TURN_ORDER[turnoIdx] || '';
  var eMinhaVez    = mySlots.some(function(s) { return (s.time + '_' + s.pos) === turnoSlotKey; });
  var turnoNome    = '';

  if (turnoSlotKey) {
    var tParts = turnoSlotKey.split('_');
    var tTime  = tParts[0]; var tPos = tParts.slice(1).join('_');
    var tSlot  = match.times[tTime] && match.times[tTime].slots[tPos] ? match.times[tTime].slots[tPos] : null;
    turnoNome  = tSlot ? tSlot.nome + ' — ' + POS_LABEL[tPos] + ' (Time ' + tTime + ')' : 'NPC';
  }

  var $banner = $('#quad-turno-banner');
  if (eMinhaVez) {
    $banner.addClass('quad-turno-banner-sua-vez');
    $('#quad-turno-texto').html('<span class="quad-turno-sua-vez-texto">SUA VEZ!</span>');
  } else {
    $banner.removeClass('quad-turno-banner-sua-vez');
    $('#quad-turno-texto').html('vez de: <span class="quad-turno-outro-nome">' + turnoNome + '</span>');
  }
  $('#quad-turno-num').text('turno ' + (turnoIdx + 1) + ' / ' + TURN_ORDER.length);

  
  $('#quad-campo').html(gerarSvgField(match, acoes));

  
  var prevFase = fase - 1;
  $('#quad-log-titulo').text('log — fase ' + prevFase);
  var $logBox = $('#quad-log-box').empty();
  if (prevFase >= 1 && match.fases && match.fases[prevFase] && match.fases[prevFase].resultado) {
    var logArr = match.fases[prevFase].resultado.log || [];
    logArr.forEach(function(e) {
      var div = document.createElement('div');
      div.className = 'quad-log-entry' + (e.type ? ' quad-log-entry-' + e.type : '');
      div.textContent = e.text || e;
      $logBox.append(div);
    });
  } else {
    $logBox.html('<div class="quad-log-entry" style="color:var(--quad-accent5)">nenhum evento ainda.</div>');
  }


  var $acoesWrap = $('#quad-acoes-wrap').empty();
  if (mySlots.length > 0) {
    mySlots.forEach(function(s) {
      $acoesWrap.append(gerarPainelAcoes(s, match, acoes));
    });
  } else {
    $acoesWrap.html('<div class="quad-card"><p class="quad-muted" style="text-align:center;padding:.5rem 0;">voce e espectador nesta partida.</p></div>');
  }

  if (isAdmin) {
    $('#quad-game-admin-ctrl').removeAttr('hidden');
    $('#quad-btn-encerrar').off('click').on('click', function() {
      if (!confirm('Encerrar a partida agora? O placar atual sera o final.')) return;
      var vF = tA.placar >= tB.placar ? 'A' : 'B';
      Promise.all([
        fbPatch('/quadribol/partidas/' + pid, {status:'encerrada', vencedor:vF, pomo_capturado:false}),
        fbPut('/quadribol/historico/' + pid, {
          data:Date.now(), nomeA:tA.nome, nomeB:tB.nome,
          placarA:tA.placar, placarB:tB.placar,
          vencedor:vF, nomeVencedor:match.times[vF].nome,
          pomo_capturado:false, fases:fase
        })
      ]).then(function() { clearInterval(pollTimer); boot(); });
    });
  } else {
    $('#quad-game-admin-ctrl').attr('hidden', true);
  }

 
  var deadlineParaUsar = match.turno_deadline || match.fase_deadline;
  iniciarCountdown(deadlineParaUsar, match);

  
  setTimeout(function() {
    $('.quad-acao-btn').off('click').on('click', function() {
      var slotKey = $(this).data('slot');
      var acaoId  = $(this).data('acao');
      $('.quad-acao-btn[data-slot="' + slotKey + '"]').removeClass('quad-acao-selecionada');
      $(this).addClass('quad-acao-selecionada');
      if (!selectedAcoes[slotKey]) selectedAcoes[slotKey] = {};
      selectedAcoes[slotKey].acao = acaoId;
      selectedAcoes[slotKey].alvo = null;
      renderAlvoSelect(slotKey, match, $(this).data('alvos'));
    });
    $('.quad-btn-confirmar-acao').off('click').on('click', function() {
      var slotKey = $(this).data('slot');
      var sa      = selectedAcoes[slotKey];
      if (!sa || !sa.acao) { alert('Escolha uma acao primeiro.'); return; }
      submeterAcao(slotKey, sa.acao, sa.alvo || null);
      $(this).prop('disabled', true).text('acao confirmada!');
      $('.quad-acao-btn[data-slot="' + slotKey + '"]').prop('disabled', true).css('opacity', '.5');
    });
  }, 100);
}

function gerarPainelAcoes(mySlot, match, acoes) {
  var slotKey  = mySlot.time + '_' + mySlot.pos;
  var jaAgiu   = !!acoes[slotKey];
  var turnoIdx = match.turno_idx || 0;
  var eMinhaVezAgora = !TURN_ORDER[turnoIdx] || TURN_ORDER[turnoIdx] === slotKey;
  var bloqueado = jaAgiu || !eMinhaVezAgora;

 
  var statusHtml;
  if (jaAgiu) {
    statusHtml = '<div class="quad-acao-status quad-acao-status-aguardando">acao enviada! aguardando os outros.</div>';
  } else if (!eMinhaVezAgora) {
    statusHtml = '<div class="quad-acao-status" style="background:var(--quad-fnd-tab);border:var(--quad-borda2);">aguardando sua vez...</div>';
  } else {
    statusHtml = '<div class="quad-acao-status quad-acao-status-sua-vez">SUA VEZ — escolha uma acao abaixo.</div>';
  }

 
  var lista = ACOES[mySlot.pos] || [];
  var botoesHtml = '<div class="quad-acao-grid">' + lista.map(function(a) {
    var sel  = (selectedAcoes[slotKey] && selectedAcoes[slotKey].acao === a.id) ? ' quad-acao-selecionada' : '';
    var alvo = a.temAlvo ? ' data-alvo="true" data-alvos="' + (a.alvos||'') + '"' : '';
    return '<button class="quad-acao-btn' + sel + '" type="button"' +
      ' data-slot="' + slotKey + '" data-acao="' + a.id + '"' + alvo +
      (bloqueado ? ' disabled' : '') + '>' +
      '<div class="quad-acao-nome">' + a.nome + '</div>' +
      '<div class="quad-acao-desc">' + a.desc + '</div>' +
    '</button>';
  }).join('') + '</div>';

 
  var alvoHtml = '<div id="quad-alvo-' + slotKey + '" class="quad-alvo-wrap" hidden></div>';

  var confirmarHtml;
  if (jaAgiu) {
    confirmarHtml = '<button class="quad-btn quad-btn-full" disabled style="background:var(--quad-fnd-tab);color:var(--quad-muted);">acao confirmada!</button>';
  } else if (!eMinhaVezAgora) {
    confirmarHtml = '<button class="quad-btn quad-btn-full" disabled style="background:var(--quad-fnd-tab);color:var(--quad-muted);">aguardando sua vez...</button>';
  } else {
    confirmarHtml = '<button class="quad-btn quad-btn-accent quad-btn-full quad-btn-confirmar-acao" type="button" data-slot="' + slotKey + '">confirmar acao</button>';
  }

  var div = document.createElement('div');
  div.className = 'quad-card';
  div.style.marginBottom = '8px';
  div.innerHTML =
    '<div class="quad-sec-title">sua acao — ' + POS_LABEL[mySlot.pos] +
    (mySlot.slot.capitao ? ' <span class="quad-badge quad-badge-cap">cap</span>' : '') + '</div>' +
    statusHtml + botoesHtml + alvoHtml + confirmarHtml;
  return div;
}

function renderAlvoSelect(slotKey, match, alvos) {
  var parts = slotKey.split('_');
  var t     = parts[0]; var pos = parts.slice(1).join('_');
  var advT  = t === 'A' ? 'B' : 'A';
  var $wrap = $('#quad-alvo-' + slotKey);

  if (!alvos) { $wrap.attr('hidden', true); return; }

  var lista = [];
  if (alvos === 'adversarios') {
    POSICOES.forEach(function(p) {
      var sl = match.times[advT].slots[p];
      if (sl) lista.push({val:p, label:sl.nome + ' (' + POS_LABEL[p] + ')'});
    });
  } else if (alvos === 'aliados') {
    POSICOES.forEach(function(p) {
      if (p === pos) return;
      var sl = match.times[t].slots[p];
      if (sl) lista.push({val:p, label:sl.nome + ' (' + POS_LABEL[p] + ')'});
    });
  } else if (alvos === 'art_aliados') {
    ['artilheiro1','artilheiro2'].forEach(function(p) {
      var sl = match.times[t].slots[p];
      if (sl) lista.push({val:p, label:sl.nome + ' (' + POS_LABEL[p] + ')'});
    });
  }

  var radioHtml = '<div class="quad-alvo-titulo">escolha o alvo:</div>' +
    lista.map(function(item) {
      return '<label class="quad-alvo-radio">' +
        '<input type="radio" name="alvo-' + slotKey + '" value="' + item.val + '" style="width:auto;accent-color:var(--quad-accent2);">' +
        item.label +
      '</label>';
    }).join('');

  $wrap.html(radioHtml).removeAttr('hidden');

  var $first = $('input[name="alvo-' + slotKey + '"]').first();
  if ($first.length) { $first.prop('checked', true); selectedAcoes[slotKey].alvo = $first.val(); }

  $('input[name="alvo-' + slotKey + '"]').on('change', function() {
    selectedAcoes[slotKey].alvo = $(this).val();
  });
}

function gerarSvgField(match, acoes) {
  var playersHtml = '';
  ['A','B'].forEach(function(t) {
    var isTimeA = t === 'A';
    POSICOES.forEach(function(pos) {
      var sl  = match.times[t].slots[pos]; if (!sl) return;
      var key = t + '_' + pos;
      var xy  = FIELD_POS[key] || [320,140];
      var x = xy[0], y = xy[1];
      var ehMeu = sl.uid === myUid;
      var agiu  = !!acoes[key];
      var temDebuff = sl.debuff && sl.debuff.valor;
      var circFill, circStroke, strokeDash;
      if (ehMeu) { circFill = '#8b44c5'; circStroke = '#bda6c7'; strokeDash = ''; }
      else if (isTimeA) { circFill = '#1a0f2e'; circStroke = agiu ? '#8b44c5' : '#EF9F27'; strokeDash = agiu ? '' : 'stroke-dasharray="3,2"'; }
      else              { circFill = '#1a0a0a'; circStroke = agiu ? '#9b0000' : '#EF9F27'; strokeDash = agiu ? '' : 'stroke-dasharray="3,2"'; }
      var textColor = ehMeu ? '#fff' : (isTimeA ? '#bda6c7' : '#ff9090');
      var nomeCurto = sl.nome.length > 6 ? sl.nome.substring(0,6) : sl.nome;
      var posAbrev  = pos === 'artilheiro1'||pos === 'artilheiro2' ? 'ART' : pos === 'batedor' ? 'BAT' : pos === 'goleiro' ? 'GOL' : 'APH';
      var badgeSvg  = temDebuff
        ? '<circle cx="14" cy="-14" r="6" fill="#E24B4A"/><text x="14" y="-11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">-2</text>'
        : agiu
          ? '<circle cx="14" cy="-14" r="6" fill="#1D9E75"/><text x="14" y="-11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">ok</text>'
          : '';
      playersHtml += '<g transform="translate(' + x + ',' + y + ')">' +
        '<circle r="19" fill="' + circFill + '" stroke="' + circStroke + '" stroke-width="' + (ehMeu?'2':'1.5') + '" ' + strokeDash + '/>' +
        '<text y="2" text-anchor="middle" font-size="9" fill="' + textColor + '" font-weight="600">' + posAbrev + '</text>' +
        '<text y="12" text-anchor="middle" font-size="8" fill="' + textColor + '">' + nomeCurto + '</text>' +
        badgeSvg + '</g>';
    });
  });
  return '<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><radialGradient id="fg" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#0f1a0a"/><stop offset="100%" stop-color="#080d06"/></radialGradient></defs>' +
    '<rect width="640" height="280" rx="10" fill="url(#fg)"/>' +
    '<ellipse cx="320" cy="140" rx="295" ry="118" fill="none" stroke="#1a3010" stroke-width="1.5"/>' +
    '<line x1="320" y1="22" x2="320" y2="258" stroke="#1a3010" stroke-width="1" stroke-dasharray="4,4"/>' +
    '<ellipse cx="320" cy="140" rx="48" ry="40" fill="none" stroke="#1a3010" stroke-width="1"/>' +
    '<ellipse cx="40" cy="140" rx="22" ry="50" fill="none" stroke="#1a3010" stroke-width="1.5"/>' +
    '<ellipse cx="600" cy="140" rx="22" ry="50" fill="none" stroke="#1a3010" stroke-width="1.5"/>' +
    '<g transform="translate(16,112)"><rect x="0" y="0" width="3" height="56" rx="1.5" fill="#bda6c750"/><circle cx="1.5" cy="0" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="28" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="56" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/></g>' +
    '<g transform="translate(621,112)"><rect x="0" y="0" width="3" height="56" rx="1.5" fill="#bda6c750"/><circle cx="1.5" cy="0" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="28" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="56" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/></g>' +
    playersHtml + '</svg>';
}


function iniciarCountdown(deadline, match) {
  if (countdownTimer) clearInterval(countdownTimer);
  function tick() {
    var rem = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    var pct = Math.max(0, (rem / FASE_SECS) * 100);
    var urg = rem <= 15;
    $('#quad-timer-bar').css('width', pct + '%').toggleClass('quad-timer-bar-urgente', urg);
    $('#quad-timer-secs').text(rem + 's').toggleClass('quad-timer-secs-urgente', urg);
    if (rem === 0) {
      clearInterval(countdownTimer);
      fbGet('/quadribol/partidas/' + pid).then(function(m) {
        if (!m || m.status !== 'em_andamento') return;
        var turnoSlot = TURN_ORDER[m.turno_idx || 0];
        if (!turnoSlot) return;
        var faseObj = m.fases && m.fases[m.fase_atual] ? m.fases[m.fase_atual] : {};
        if (!(faseObj.acoes && faseObj.acoes[turnoSlot])) {
          fbPut('/quadribol/partidas/' + pid + '/fases/' + m.fase_atual + '/acoes/' + turnoSlot, {acao:'passou', alvo:null, ts:Date.now()})
            .then(function() { fbGet('/quadribol/partidas/' + pid).then(function(m2) { if (m2) avancarTurno(m2); }); });
        }
      });
    }
  }
  tick();
  countdownTimer = setInterval(tick, 1000);
}


function submeterAcao(slotKey, acaoId, alvo) {
  fbGet('/quadribol/partidas/' + pid + '/fase_atual').then(function(fase) {
    return fbPut('/quadribol/partidas/' + pid + '/fases/' + fase + '/acoes/' + slotKey, {acao:acaoId, alvo:alvo||null, ts:Date.now()});
  }).then(function() {
    return fbGet('/quadribol/partidas/' + pid);
  }).then(function(m) { if (m) avancarTurno(m); });
}

function avancarTurno(match) {
  var turnoAtual = match.turno_idx || 0;
  var proximoIdx = turnoAtual + 1;
  while (proximoIdx < TURN_ORDER.length) {
    var sk   = TURN_ORDER[proximoIdx];
    var skP  = sk.split('_'); var skT = skP[0]; var skPos = skP.slice(1).join('_');
    var skSl = match.times[skT] && match.times[skT].slots[skPos] ? match.times[skT].slots[skPos] : null;
    if (skSl && skSl.uid !== 'npc') break;
    var npcAcao = escolherAcaoNpc(skPos, match, skT);
    fbPut('/quadribol/partidas/' + pid + '/fases/' + match.fase_atual + '/acoes/' + sk, npcAcao);
    proximoIdx++;
  }
  if (proximoIdx >= TURN_ORDER.length) {
    fbGet('/quadribol/partidas/' + pid).then(function(m) { if (m) resolverFase(m); });
  } else {
    var novoDeadline = Date.now() + FASE_SECS * 1000;
    fbPatch('/quadribol/partidas/' + pid, {turno_idx:proximoIdx, turno_deadline:novoDeadline});
  }
}

function escolherAcaoNpc(pos, match, t) {
  var lista = ACOES[pos] || [];
  var sem   = lista.filter(function(a) { return !a.temAlvo; });
  var pool  = sem.length ? sem : lista;
  var a     = pool[Math.floor(Math.random() * pool.length)];
  var alvo  = null;
  if (a.temAlvo) {
    var advT  = t === 'A' ? 'B' : 'A';
    if (a.alvos === 'adversarios')  alvo = POSICOES[Math.floor(Math.random() * POSICOES.length)];
    else if (a.alvos === 'aliados') { var ali = POSICOES.filter(function(p){ return p !== pos; }); alvo = ali[Math.floor(Math.random()*ali.length)]; }
    else if (a.alvos === 'art_aliados') alvo = Math.random() > 0.5 ? 'artilheiro1' : 'artilheiro2';
  }
  return {acao:a.id, alvo:alvo, ts:Date.now()};
}

function resolverFase(match) {
  var fase    = match.fase_atual;
  var faseObj = match.fases && match.fases[fase] ? match.fases[fase] : {};
  if (!faseObj || faseObj.status !== 'aberta') return;
  fbPut('/quadribol/partidas/' + pid + '/fases/' + fase + '/status', 'resolvendo').then(function() {
    return fbGet('/quadribol/partidas/' + pid + '/fases/' + fase + '/status');
  }).then(function(status) {
    if (status !== 'resolvendo') return null;
    return fbGet('/quadribol/partidas/' + pid + '/fases/' + fase + '/acoes');
  }).then(function(acoes) {
    if (!acoes && acoes !== null) return;
    acoes = acoes || {};
    var npcPromises = [];
    ['A','B'].forEach(function(t) {
      POSICOES.forEach(function(pos) {
        var sl = match.times[t].slots[pos]; var key = t + '_' + pos;
        if (sl && !acoes[key]) {
          var na = escolherAcaoNpc(pos, match, t); acoes[key] = na;
          npcPromises.push(fbPut('/quadribol/partidas/' + pid + '/fases/' + fase + '/acoes/' + key, na));
        }
      });
    });
    return Promise.all(npcPromises).then(function() { return acoes; });
  }).then(function(acoes) { if (acoes) processarAcoes(match, acoes, fase); });
}

function getAttr(slot, attr) {
  var base = (slot.atributos && slot.atributos[attr]) ? slot.atributos[attr] : 10;
  if (slot.debuff && slot.debuff.atributo === attr) base = Math.max(1, base + slot.debuff.valor);
  return base;
}
function vassB(slot) { return (slot.vassoura && slot.vassoura.bonus) ? slot.vassoura.bonus : 0; }
function roll2(a, b, bonus) {
  bonus = bonus || 0;
  return Math.floor(Math.random() * Math.max(1,Math.floor(a))) + 1 + Math.floor(Math.random() * Math.max(1,Math.floor(b))) + 1 + bonus;
}

function processarAcoes(match, acoes, faseNum) {
  var tA = match.times.A, tB = match.times.B;
  var logArr = [], placarA = tA.placar, placarB = tB.placar;
  var novosDebuffs = {}, novoRastreia = {}, interceptados = {}, passeBonus = {}, blitzResult = {}, distracoes = {}, protegidos = {};
  var pomoCapturado = false, vencedor = null;
  function sl(t,pos) { return match.times[t].slots[pos] || {}; }
  function advT(t) { return t==='A'?'B':'A'; }
  function log(text, type) { logArr.push({text:text, type:type||'normal'}); }

  /* 1. INTERCEPTAR */
  ['A','B'].forEach(function(t) {
    var ac=acoes[t+'_batedor']; var bs=sl(t,'batedor');
    if (ac&&ac.acao==='interceptar') {
      var as1=sl(advT(t),'artilheiro1');
      if (roll2(getAttr(bs,'forca'),getAttr(bs,'determinacao'),vassB(bs)) > roll2(getAttr(as1,'agilidade'),6,vassB(as1))) {
        interceptados[advT(t)]=true; log(bs.nome+' interceptou o passe dos Artilheiros adversarios!','debuff');
      } else { log(bs.nome+' tentou interceptar mas falhou.'); }
    }
  });
  /* 2. PASSAR */
  ['A','B'].forEach(function(t) { ['artilheiro1','artilheiro2'].forEach(function(pos) {
    var ac=acoes[t+'_'+pos]; var sl2=sl(t,pos);
    if (ac&&ac.acao==='passar'&&!interceptados[t]) {
      var parc=pos==='artilheiro1'?t+'_artilheiro2':t+'_artilheiro1';
      passeBonus[parc]=(passeBonus[parc]||0)+2; log(sl2.nome+' passou a Goles para o parceiro (+2).');
    }
  }); });
  /* 3. AUXILIAR */
  ['A','B'].forEach(function(t) {
    var ac=acoes[t+'_apanhador']; var sl2=sl(t,'apanhador');
    if (ac&&ac.acao==='auxiliar'&&ac.alvo) {
      var ak=t+'_'+ac.alvo; passeBonus[ak]=(passeBonus[ak]||0)+2;
      log(sl2.nome+' passou a Goles para '+(sl(t,ac.alvo).nome||ac.alvo)+' (+2).');
    }
  });
  /* 4. BLITZ */
  ['A','B'].forEach(function(t) {
    var ac=acoes[t+'_goleiro']; var gs=sl(t,'goleiro');
    if (ac&&ac.acao==='blitz') {
      var as1=sl(advT(t),'artilheiro1');
      if (roll2(getAttr(gs,'resistencia'),getAttr(gs,'sabedoria'),vassB(gs)) >= roll2(getAttr(as1,'destreza'),getAttr(as1,'agilidade'),vassB(as1))) {
        blitzResult[t]='ok'; log(gs.nome+' executou Blitz com sucesso!','gol');
      } else { blitzResult[t]='fail'; log(gs.nome+' tentou Blitz mas falhou — aros vulneraveis!','debuff'); }
    }
  });
  /* 5. PROTEGER */
  ['A','B'].forEach(function(t) {
    var ac=acoes[t+'_batedor'];
    if (ac&&ac.acao==='proteger'&&ac.alvo) {
      protegidos[t+'_'+ac.alvo]=true; log(sl(t,'batedor').nome+' protegeu '+sl(t,ac.alvo).nome+' do Balaco.');
    }
  });
  /* 6. LANCAR BALACO */
  ['A','B'].forEach(function(t) {
    var ac=acoes[t+'_batedor']; var bs=sl(t,'batedor');
    if (ac&&ac.acao==='lancar_balaco'&&ac.alvo) {
      var alvPos=ac.alvo; var alvT=advT(t); var als=sl(alvT,alvPos); var alvKey=alvT+'_'+alvPos;
      if (protegidos[alvKey]) { log(bs.nome+' lancou o Balaco em '+als.nome+', mas ele estava protegido!'); return; }
      if (roll2(getAttr(bs,'forca'),getAttr(bs,'determinacao'),vassB(bs)) > roll2(getAttr(als,'agilidade'),6,vassB(als))) {
        novosDebuffs[alvKey]={atributo:MAIN_ATTR[alvPos]||'agilidade', valor:-2, fases:1};
        log(bs.nome+' acertou o Balaco em '+als.nome+'! -2 em '+(MAIN_ATTR[alvPos]||'agilidade')+'.','debuff');
      } else { log(bs.nome+' lancou o Balaco em '+als.nome+' mas errou.'); }
    }
  });
  /* 7. ARREMESSAR */
  ['A','B'].forEach(function(t) { ['artilheiro1','artilheiro2'].forEach(function(pos) {
    var ac=acoes[t+'_'+pos]; var ast=sl(t,pos); if (!ac||ac.acao!=='arremessar') return;
    var golvT=advT(t); var gs=sl(golvT,'goleiro');
    if (blitzResult[golvT]==='fail') {
      if(t==='A') placarA+=10; else placarB+=10;
      log(ast.nome+' arremessou — GOL AUTOMATICO! Aros estavam expostos.','gol'); return;
    }
    var defBonus=(acoes[golvT+'_goleiro']&&acoes[golvT+'_goleiro'].acao==='defender')?2:0;
    if (roll2(getAttr(ast,'destreza'),getAttr(ast,'agilidade'),(passeBonus[t+'_'+pos]||0)+vassB(ast)) > roll2(getAttr(gs,'resistencia'),getAttr(gs,'sabedoria'),defBonus+vassB(gs))) {
      if(t==='A') placarA+=10; else placarB+=10; log(ast.nome+' arremessou a Goles — GOOOOL! +10 pontos.','gol');
    } else { log(ast.nome+' arremessou — defendido por '+(gs.nome||'Goleiro')+'!'); }
  }); });
  /* 8. FINTAR */
  ['A','B'].forEach(function(t) { ['artilheiro1','artilheiro2'].forEach(function(pos) {
    var ac=acoes[t+'_'+pos]; if (ac&&ac.acao==='fintar') log(sl(t,pos).nome+' executou uma finta, desviando do Balaco.');
  }); });
  /* 9. DISTRACAO */
  ['A','B'].forEach(function(t) {
    var ac=acoes[t+'_apanhador']; var sl2=sl(t,'apanhador');
    if (ac&&ac.acao==='distracao') { distracoes[advT(t)]=true; log(sl2.nome+' fingiu ver o Pomo! '+sl(advT(t),'apanhador').nome+' perdeu a fase.','debuff'); }
  });
  /* 10. RASTREAR / SABOTAR */
  ['A','B'].forEach(function(t) {
    var ac=acoes[t+'_apanhador']; var sl2=sl(t,'apanhador'); if (!ac) return;
    if (ac.acao==='rastrear'&&!distracoes[t]) {
      novoRastreia[t+'_apanhador']=(sl2.rastreamento||0)+1;
      log(sl2.nome+' rastreou o Pomo. bonus: +'+ novoRastreia[t+'_apanhador']+'.');
    } else if (ac.acao==='sabotar') {
      var advSl=sl(advT(t),'apanhador');
      if (roll2(getAttr(sl2,'agilidade'),getAttr(sl2,'carisma'),vassB(sl2)) > roll2(getAttr(advSl,'agilidade'),6,vassB(advSl))) {
        novoRastreia[advT(t)+'_apanhador']=0; log(sl2.nome+' sabotou '+advSl.nome+' — rastreamento zerado!','debuff');
      } else { log(sl2.nome+' tentou sabotar mas falhou.'); }
    }
  });
  /* 11. POMO */
  var pomoFase = match.pomo_fase || 9;
  if (faseNum >= pomoFase && !match.pomo_capturado) {
    var aphA=sl('A','apanhador'), aphB=sl('B','apanhador');
    var rastA=novoRastreia['A_apanhador']!==undefined?novoRastreia['A_apanhador']:(aphA.rastreamento||0);
    var rastB=novoRastreia['B_apanhador']!==undefined?novoRastreia['B_apanhador']:(aphB.rastreamento||0);
    var rA=roll2(getAttr(aphA,'agilidade'),getAttr(aphA,'sabedoria'),rastA+vassB(aphA));
    var rB=roll2(getAttr(aphB,'agilidade'),getAttr(aphB,'sabedoria'),rastB+vassB(aphB));
    log('O POMO DE OURO APARECEU! '+aphA.nome+' e '+aphB.nome+' disputam...','pomo');
    if (rA >= rB) { placarA+=150; pomoCapturado=true; vencedor='A'; log(aphA.nome+' capturou o Pomo! +150 para '+tA.nome+'!','pomo'); }
    else          { placarB+=150; pomoCapturado=true; vencedor='B'; log(aphB.nome+' capturou o Pomo! +150 para '+tB.nome+'!','pomo'); }
  }

 
  var nextFase       = faseNum + 1;
  var fasesFinal     = typeof QUAD_FASES_TOTAL !== 'undefined' ? QUAD_FASES_TOTAL : 12;
  var isEncerrada    = pomoCapturado || nextFase > fasesFinal;
  var vencedorFinal  = vencedor || (placarA >= placarB ? 'A' : 'B');
  var saves = [
    fbPatch('/quadribol/partidas/' + pid + '/fases/' + faseNum, {status:'resolvida', resultado:{log:logArr, placar_A:placarA, placar_B:placarB}}),
    fbPatch('/quadribol/partidas/' + pid + '/times/A', {placar:placarA}),
    fbPatch('/quadribol/partidas/' + pid + '/times/B', {placar:placarB})
  ];
  Object.keys(novosDebuffs).forEach(function(k) { var p=k.split('_'); saves.push(fbPatch('/quadribol/partidas/'+pid+'/times/'+p[0]+'/slots/'+p.slice(1).join('_'), {debuff:novosDebuffs[k]})); });
  Object.keys(novoRastreia).forEach(function(k) { var p=k.split('_'); saves.push(fbPatch('/quadribol/partidas/'+pid+'/times/'+p[0]+'/slots/'+p.slice(1).join('_'), {rastreamento:novoRastreia[k]})); });
  ['A','B'].forEach(function(t) { POSICOES.forEach(function(pos) {
    var sl2=match.times[t].slots[pos]; var key=t+'_'+pos;
    if (sl2&&sl2.debuff&&!novosDebuffs[key]) {
      var rem=sl2.debuff.fases-1;
      saves.push(fbPatch('/quadribol/partidas/'+pid+'/times/'+t+'/slots/'+pos, {debuff:rem>0?{atributo:sl2.debuff.atributo,valor:sl2.debuff.valor,fases:rem}:null}));
    }
  }); });
  if (isEncerrada) {
    saves.push(fbPatch('/quadribol/partidas/' + pid, {status:'encerrada', pomo_capturado:pomoCapturado, vencedor:vencedorFinal}));
    saves.push(fbPut('/quadribol/historico/' + pid, {
      data:Date.now(), nomeA:tA.nome, nomeB:tB.nome,
      placarA:placarA, placarB:placarB,
      vencedor:vencedorFinal, nomeVencedor:match.times[vencedorFinal].nome,
      pomo_capturado:pomoCapturado, fases:faseNum
    }));
  } else {
    selectedAcoes = {};
    var primeiroHumano = 0;
    while (primeiroHumano < TURN_ORDER.length) {
      var sk=TURN_ORDER[primeiroHumano]; var skP=sk.split('_'); var skT=skP[0]; var skPos=skP.slice(1).join('_');
      var skSl=match.times[skT]&&match.times[skT].slots[skPos]?match.times[skT].slots[skPos]:null;
      if (skSl && skSl.uid !== 'npc') break;
      primeiroHumano++;
    }
    var novoDeadlineFase = Date.now() + FASE_SECS * 1000;
    saves.push(fbPatch('/quadribol/partidas/' + pid, {fase_atual:nextFase, fase_deadline:novoDeadlineFase, turno_idx:primeiroHumano, turno_deadline:novoDeadlineFase}));
    saves.push(fbPut('/quadribol/partidas/' + pid + '/fases/' + nextFase, {status:'aberta', acoes:{}}));
  }
  Promise.all(saves);
}

function renderEncerrada(match) {
  if (countdownTimer) clearInterval(countdownTimer);
  irPara('quad-encerrado');
  ativarNav('encerrado');
  bindNav();

  var tA = match.times.A, tB = match.times.B;
  var v  = match.vencedor;
  var vNome = v === 'A' ? tA.nome : (v === 'B' ? tB.nome : 'Empate');

  $('#quad-enc-nome-a').text(tA.nome);
  $('#quad-enc-nome-b').text(tB.nome);
  $('#quad-enc-score-a').text(tA.placar).toggleClass('quad-placar-num-vencedor', v === 'A');
  $('#quad-enc-score-b').text(tB.placar).toggleClass('quad-placar-num-vencedor', v === 'B');

  if (match.pomo_capturado) $('#quad-enc-pomo').removeAttr('hidden');
  else                      $('#quad-enc-pomo').attr('hidden', true);

  $('#quad-enc-vencedor').text(vNome + ' venceu!');
  var lNome   = v === 'A' ? tB.nome : tA.nome;
  var vPlacar = v === 'A' ? tA.placar : tB.placar;
  var lPlacar = v === 'A' ? tB.placar : tA.placar;
  $('#quad-enc-sub').text(vPlacar + ' × ' + lPlacar + ' contra ' + lNome);

  if (isAdmin) $('#quad-btn-enc-nova').removeAttr('hidden'); else $('#quad-btn-enc-nova').attr('hidden', true);

  $('#quad-btn-enc-hist').off('click').on('click', renderHistorico);
  $('#quad-btn-enc-nova').off('click').on('click', function() { pid = null; renderAdminPanel(); });
}

function renderHistorico() {
  irPara('quad-historico');
  ativarNav('historico');
  bindNav();
  var $lista = $('#quad-hist-lista').html('<p class="quad-muted quad-center">carregando...</p>');
  fbGet('/quadribol/historico').then(function(historico) {
    if (!historico) { $lista.html('<p class="quad-muted quad-center">nenhuma partida registrada ainda.</p>'); return; }
    var entradas = Object.values(historico).sort(function(a,b){ return b.data - a.data; });
    $lista.empty();
    entradas.forEach(function(h) {
      var data    = new Date(h.data);
      var dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
      var isA     = h.vencedor === 'A';
      var div = document.createElement('div');
      div.className = 'quad-hist-item';
      div.innerHTML =
        '<div class="quad-hist-data"><span>' + dataStr + '</span>' + (h.pomo_capturado ? '<span class="quad-badge quad-badge-pos">Pomo capturado</span>' : '') + '</div>' +
        '<div class="quad-placar-header" style="padding:.25rem 0;">' +
          '<div>' +
            '<div class="quad-time-nome-big" style="' + (isA?'color:#5DCAA5':'')+'">' + h.nomeA + (isA?' ★':'') + '</div>' +
            '<div class="quad-placar-num" style="font-size:28px;' + (isA?'color:#5DCAA5':'') + '">' + (h.placarA||0) + '</div>' +
          '</div>' +
          '<div class="quad-placar-vs">×</div>' +
          '<div>' +
            '<div class="quad-time-nome-big" style="' + (!isA?'color:#5DCAA5':'')+'">' + h.nomeB + (!isA?' ★':'') + '</div>' +
            '<div class="quad-placar-num" style="font-size:28px;' + (!isA?'color:#5DCAA5':'') + '">' + (h.placarB||0) + '</div>' +
          '</div>' +
        '</div>';
      $lista.append(div);
    });
  });
}

var TREINO_OPTS_LOCAL = TREINO_OPTS;

function semanaAtual() {
  var d = new Date(); var oneJan = new Date(d.getFullYear(),0,1);
  var week = Math.ceil(((d - oneJan)/86400000 + oneJan.getDay() + 1)/7);
  return d.getFullYear() + '-W' + String(week).padStart(2,'0');
}

function getEnergiaAtual() {
  return fbGet('/status-perfil/' + myUid).then(function(s){ return s ? (s.energia_cur||0) : 0; });
}

function deduzirEnergia(custo) {
  return fbGet('/status-perfil/' + myUid).then(function(s) {
    if (!s) return;
    return fbPatch('/status-perfil/' + myUid, {energia_cur: Math.max(0, (s.energia_cur||0) - custo)});
  });
}

function adicionarPack() {
  var key = 'pack_maestria_' + Date.now();
  return fbPut('/inventario/' + myUid + '/' + key, {
    nome:'1 Ponto em Maestria de Quadribol',
    descricao:'Resgate este ponto no topico de obtencao de maestria. Obtido ao completar ' + TREINO_META_H + 'h de treino na semana.',
    quantidade:1, tipo:'pack_maestria', obtido_em:Date.now()
  });
}

function renderTreino() {
  if (treinoTimer) clearInterval(treinoTimer);
  irPara('quad-treino');
  ativarNav('treino');
  bindNav();

  var semana = semanaAtual();
  Promise.all([fbGet('/quadribol/treinos/jogadores/' + myUid), fbGet('/quadribol/treinos/sessoes')]).then(function(r) {
    var dados   = r[0];
    var sessoes = r[1] || {};
    var horas   = (dados && dados.semana === semana) ? (dados.horas_semana||0) : 0;
    var packFeito = dados && dados.semana === semana && !!dados.pack_resgatado;
    var pct     = Math.min(100, (horas / TREINO_META_H) * 100).toFixed(0);
    var faltam  = Math.max(0, TREINO_META_H - horas).toFixed(1);

    $('#quad-tr-horas').text(horas.toFixed(1) + 'h');
    $('#quad-tr-faltam').text(faltam + 'h restantes para o pack');
    $('#quad-tr-bar').css('width', pct + '%').toggleClass('quad-progress-bar-ok', packFeito);
    $('#quad-tr-pack-msg').text(packFeito ? 'pack desta semana ja resgatado.' : 'meta: ' + TREINO_META_H + 'h por semana.');

    var $campo = $('#quad-campo-treino').empty();
    Object.keys(sessoes).forEach(function(sid) {
      var s = sessoes[sid];
      if (!s || s.status !== 'ativa') return;
      if (s.jogadorA === myUid || s.jogadorB === myUid) return;
      var elapsed = Math.floor((Date.now() - s.inicio)/60000);
      var hh = Math.floor(elapsed/60); var mm = elapsed%60;
      var tempoStr = (hh>0?hh+'h ':'')+mm+'min';
      var card = document.createElement('div');
      card.className = 'quad-card-treino';
      card.innerHTML =
        '<div class="quad-card-treino-info">' +
          '<div class="quad-card-treino-nomes">' + s.nomeA + ' × ' + s.nomeB + '</div>' +
          '<div class="quad-card-treino-meta">' + tempoStr + ' treinando' + (s.status_msg ? ' — "' + s.status_msg + '"' : '') + '</div>' +
        '</div>' +
        '<button type="button" class="quad-btn quad-btn-ghost quad-btn-sm quad-btn-atrapalhar" data-sid="' + sid + '" style="color:var(--quad-tema);">atrapalhar</button>';
      $campo.append(card);
    });
    if (!$campo.children().length) $campo.html('<p class="quad-muted quad-center" style="padding:1rem 0;">nenhuma dupla treinando no momento.</p>');

    $('.quad-btn-atrapalhar').off('click').on('click', function() {
      var sid = $(this).data('sid');
      var s   = sessoes[sid]; if (!s) return;
      atrapalharTreino(sid, s, semana);
    });

    var $cont = $('#quad-treino-conteudo').empty();

    if (dados && dados.sessao_id && sessoes[dados.sessao_id]) {
      var sid = dados.sessao_id; var sessao = sessoes[sid];
      if (sessao.status === 'ativa') {
        if (Date.now() >= sessao.inicio + sessao.duracao_h * 3600000) {
          processarFimTreino(sid, sessao, dados, semana); return;
        }
        renderTreinoAtivo(sid, sessao, dados, semana, $cont);
        return;
      }
      if (sessao.status === 'aguardando') { renderTreinoAguardando(sid, sessao, $cont); return; }
    }

    if (dados && dados.convite_sid && sessoes[dados.convite_sid]) {
      var sconv = sessoes[dados.convite_sid];
      if (sconv.status === 'aguardando') { renderTreinoConvite(dados.convite_sid, sconv, dados, semana, $cont); return; }
      fbPatch('/quadribol/treinos/jogadores/' + myUid, {convite_sid:null});
    }

    renderTreinoForm(dados, semana, $cont);

    
    if (treinoTimer) clearInterval(treinoTimer);
    treinoTimer = setInterval(function() { renderTreino(); }, 10000);
  });
}

function renderTreinoForm(dados, semana, $cont) {
  var optsHtml = TREINO_OPTS_LOCAL.map(function(o,i) { return '<option value="'+i+'">'+o.label+'</option>'; }).join('');
  var div = document.createElement('div');
  div.className = 'quad-card';
  div.innerHTML =
    '<div class="quad-sec-title">iniciar sessao</div>' +
    '<div class="quad-treino-form-grid">' +
      '<div><div class="quad-slot-label">uid do parceiro</div><input type="text" id="quad-inp-parc" class="quad-input" placeholder="uid"><div id="quad-preview-parc" class="quad-slot-preview"></div></div>' +
      '<div><div class="quad-slot-label">duracao</div><select id="quad-sel-duracao" class="quad-input">' + optsHtml + '</select></div>' +
    '</div>' +
    '<button type="button" id="quad-btn-convidar" class="quad-btn quad-btn-accent quad-btn-full">enviar convite</button>';
  $cont.append(div);

  setTimeout(function() {
    $('#quad-inp-parc').on('blur', function() {
      var v = $(this).val().trim(); if (!v) return;
      fbGet('/saldos/u'+v).then(function(d) { $('#quad-preview-parc').text(d&&d.nome?d.nome:'uid nao encontrado'); });
    });
    $('#quad-btn-convidar').on('click', function() {
      var parcRaw = $('#quad-inp-parc').val().trim();
      var idx     = parseInt($('#quad-sel-duracao').val());
      var opcao   = TREINO_OPTS_LOCAL[idx];
      if (!parcRaw) { alert('Informe o uid do parceiro.'); return; }
      if ('u'+parcRaw === myUid) { alert('Voce nao pode treinar sozinho.'); return; }
      $(this).prop('disabled',true).text('verificando...');
      getEnergiaAtual().then(function(energia) {
        if (energia < opcao.energia) { alert('Energia insuficiente. Precisa de '+opcao.energia+'.'); $('#quad-btn-convidar').prop('disabled',false).text('enviar convite'); return; }
        criarSessaoTreino('u'+parcRaw, opcao);
      });
    });
  }, 100);
}

function criarSessaoTreino(parcUid, opcao) {
  var sid = 'tr' + Date.now();
  Promise.all([fbGet('/saldos/'+myUid), fbGet('/saldos/'+parcUid)]).then(function(r) {
    var sessao = {
      jogadorA:myUid, jogadorB:parcUid,
      nomeA:r[0]?r[0].nome:myUid, nomeB:r[1]?r[1].nome:parcUid,
      duracao_h:opcao.h, energia:opcao.energia,
      inicio:null, status:'aguardando', criado_em:Date.now()
    };
    Promise.all([
      fbPut('/quadribol/treinos/sessoes/'+sid, sessao),
      fbPatch('/quadribol/treinos/jogadores/'+myUid, {sessao_id:sid}),
      fbPatch('/quadribol/treinos/jogadores/'+parcUid, {convite_sid:sid})
    ]).then(function() { deduzirEnergia(opcao.energia).then(function(){ renderTreino(); }); });
  });
}

function renderTreinoAguardando(sid, sessao, $cont) {
  var div = document.createElement('div');
  div.className = 'quad-card quad-card-hl';
  div.innerHTML =
    '<div class="quad-sec-title">aguardando parceiro</div>' +
    '<p style="font-size:13px;margin-bottom:6px;">convite enviado para <span class="quad-accent">'+sessao.nomeB+'</span>.</p>' +
    '<p class="quad-muted" style="margin-bottom:12px;">'+sessao.energia+' de energia ja foram deduzidos.</p>' +
    '<button type="button" id="quad-btn-cancelar-tr" class="quad-btn quad-btn-ghost quad-btn-full">cancelar convite</button>';
  $cont.append(div);
  setTimeout(function() {
    $('#quad-btn-cancelar-tr').on('click', function() {
      Promise.all([
        fbPut('/quadribol/treinos/sessoes/'+sid+'/status','cancelada'),
        fbPatch('/quadribol/treinos/jogadores/'+myUid, {sessao_id:null}),
        fbPatch('/quadribol/treinos/jogadores/'+sessao.jogadorB, {convite_sid:null})
      ]).then(function() { deduzirEnergia(-sessao.energia); renderTreino(); });
    });
  }, 100);

  if (treinoTimer) clearInterval(treinoTimer);
  treinoTimer = setInterval(function() { renderTreino(); }, 5000);
}

function renderTreinoConvite(sid, sessao, dados, semana, $cont) {
  var opcao = TREINO_OPTS_LOCAL.find(function(o){ return o.h === sessao.duracao_h; }) || TREINO_OPTS_LOCAL[0];
  var div = document.createElement('div');
  div.className = 'quad-card quad-card-hl';
  div.innerHTML =
    '<div class="quad-sec-title">convite de treino recebido</div>' +
    '<p class="quad-convite-texto"><span class="quad-accent">'+sessao.nomeA+'</span> quer treinar com voce.</p>' +
    '<p class="quad-muted" style="margin-bottom:12px;">'+sessao.duracao_h+'h — custo: '+opcao.energia+' de energia.</p>' +
    '<div class="quad-convite-btns">' +
      '<button type="button" id="quad-btn-aceitar" class="quad-btn quad-btn-accent">aceitar</button>' +
      '<button type="button" id="quad-btn-recusar" class="quad-btn quad-btn-ghost">recusar</button>' +
    '</div>';
  $cont.append(div);
  setTimeout(function() {
    $('#quad-btn-aceitar').on('click', function() {
      $(this).prop('disabled',true).text('verificando...');
      getEnergiaAtual().then(function(energia) {
        if (energia < opcao.energia) { alert('Energia insuficiente. Precisa de '+opcao.energia+'.'); $('#quad-btn-aceitar').prop('disabled',false).text('aceitar'); return; }
        deduzirEnergia(opcao.energia).then(function() {
          var agora = Date.now();
          Promise.all([
            fbPatch('/quadribol/treinos/sessoes/'+sid, {status:'ativa', inicio:agora}),
            fbPatch('/quadribol/treinos/jogadores/'+myUid, {sessao_id:sid, convite_sid:null})
          ]).then(function(){ renderTreino(); });
        });
      });
    });
    $('#quad-btn-recusar').on('click', function() {
      Promise.all([
        fbPut('/quadribol/treinos/sessoes/'+sid+'/status','cancelada'),
        fbPatch('/quadribol/treinos/jogadores/'+myUid, {convite_sid:null})
      ]).then(function(){ renderTreino(); });
    });
  }, 100);
}

function renderTreinoAtivo(sid, sessao, dados, semana, $cont) {
  var horas    = (dados && dados.semana === semana) ? (dados.horas_semana||0) : 0;
  var parcNome = sessao.jogadorA === myUid ? sessao.nomeB : sessao.nomeA;
  var fimTs    = sessao.inicio + sessao.duracao_h * 3600000;
  var statusAtual = sessao.status_msg || '';

  var div = document.createElement('div');
  div.innerHTML =
    '<div class="quad-card quad-card-hl">' +
      '<div class="quad-sec-title">treino em andamento</div>' +
      '<div class="quad-treino-ativo-header"><span class="quad-accent">'+parcNome+'</span><span class="quad-badge quad-badge-pos">'+sessao.duracao_h+'h</span></div>' +
      '<div style="text-align:center;margin:1.5rem 0;">' +
        '<div id="quad-tr-countdown" class="quad-treino-countdown">--:--:--</div>' +
        '<p class="quad-muted">tempo restante</p>' +
      '</div>' +
      '<div class="quad-progress-track"><div id="quad-tr-progbar" class="quad-progress-bar" style="width:0%"></div></div>' +
    '</div>' +
    '<div class="quad-card">' +
      '<div class="quad-sec-title">status do treino</div>' +
      '<div class="quad-status-treino-row">' +
        '<input type="text" id="quad-inp-status-tr" class="quad-input" placeholder="o que voce esta praticando..." value="'+statusAtual+'">' +
        '<button type="button" id="quad-btn-salvar-status" class="quad-btn quad-btn-ghost">salvar</button>' +
      '</div>' +
    '</div>';
  $cont.append(div);

  function atualizarTimer() {
    var restMs  = Math.max(0, fimTs - Date.now());
    var restSec = Math.floor(restMs/1000);
    var hh=Math.floor(restSec/3600), mm=Math.floor((restSec%3600)/60), ss=restSec%60;
    $('#quad-tr-countdown').text(String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0'));
    var pct = Math.min(100, ((sessao.duracao_h*3600000 - restMs)/(sessao.duracao_h*3600000))*100).toFixed(1);
    $('#quad-tr-progbar').css('width', pct + '%');
    if (restMs === 0) { clearInterval(treinoTimer); processarFimTreino(sid, sessao, dados, semana); }
  }

  atualizarTimer();
  if (treinoTimer) clearInterval(treinoTimer);
  treinoTimer = setInterval(atualizarTimer, 1000);

  setTimeout(function() {
    $('#quad-btn-salvar-status').on('click', function() {
      var msg = $('#quad-inp-status-tr').val().trim();
      fbPatch('/quadribol/treinos/sessoes/'+sid, {status_msg:msg});
      $(this).text('salvo!'); var $btn = $(this);
      setTimeout(function(){ $btn.text('salvar'); }, 1500);
    });
  }, 100);
}

function processarFimTreino(sid, sessao, dados, semana) {
  var horasAntes  = (dados && dados.semana === semana) ? (dados.horas_semana||0) : 0;
  var horasDepois = horasAntes + sessao.duracao_h;
  var packAntes   = (dados && dados.semana === semana) ? !!dados.pack_resgatado : false;
  var packAgora   = !packAntes && horasDepois >= TREINO_META_H;
  var saves = [
    fbPatch('/quadribol/treinos/jogadores/'+myUid, {semana:semana, horas_semana:horasDepois, pack_resgatado:packAntes||packAgora, sessao_id:null}),
    fbPut('/quadribol/treinos/sessoes/'+sid+'/status','concluida')
  ];
  if (packAgora) saves.push(adicionarPack());
  Promise.all(saves).then(function() {
    var $cont = $('#quad-treino-conteudo').empty();
    var div = document.createElement('div');
    div.className = 'quad-card'; div.style.textAlign = 'center'; div.style.padding = '2rem';
    div.innerHTML =
      '<div style="font-size:32px;margin-bottom:.5rem;">&#x2713;</div>' +
      '<h2 class="quad-titulo" style="font-size:22px;margin-bottom:.5rem;">treino concluido!</h2>' +
      '<p class="quad-muted" style="margin-bottom:1.5rem;">+'+sessao.duracao_h+'h registradas — '+horasDepois.toFixed(1)+'h no total esta semana.</p>' +
      (packAgora ? '<div style="background:#1D9E7515;border:1px solid #1D9E7544;border-radius:6px;padding:1rem;margin-bottom:1.5rem;"><p style="color:#5DCAA5;font-weight:500;">Pack recebido no inventario!</p><p class="quad-muted" style="margin-top:4px;">1 Ponto em Maestria de Quadribol — resgate no topico.</p></div>' : '') +
      '<button type="button" id="quad-btn-novo-treino" class="quad-btn quad-btn-primary">novo treino</button>';
    $cont.append(div);
    setTimeout(function() { $('#quad-btn-novo-treino').on('click', renderTreino); }, 100);
  });
}

function atrapalharTreino(sid, sessao, semana) {
  var CUSTO = 10;
  getEnergiaAtual().then(function(energia) {
    if (energia < CUSTO) { alert('Energia insuficiente. Precisa de '+CUSTO+' de energia para atrapalhar.'); return; }
    Promise.all([fbGet('/quadribol/treinos/jogadores/'+sessao.jogadorA), fbGet('/quadribol/treinos/jogadores/'+sessao.jogadorB)]).then(function(r) {
      var dadosA=r[0]||{}, dadosB=r[1]||{};
      var hA=(dadosA.semana===semana)?(dadosA.horas_semana||0):0;
      var hB=(dadosB.semana===semana)?(dadosB.horas_semana||0):0;
      Promise.all([
        deduzirEnergia(CUSTO),
        fbPatch('/quadribol/treinos/jogadores/'+sessao.jogadorA, {horas_semana:Math.max(0,hA-parseFloat((hA*0.02).toFixed(2)))}),
        fbPatch('/quadribol/treinos/jogadores/'+sessao.jogadorB, {horas_semana:Math.max(0,hB-parseFloat((hB*0.02).toFixed(2)))})
      ]).then(function() { alert('Voce atrapalhou o treino! -2% das horas de cada jogador.'); renderTreino(); });
    });
  });
}


function renderAdminPanel() {
  irPara('quad-admin');
  ativarNav('admin');
  bindNav();

  var optsA = CASAS.map(function(c){ return '<option>'+c+'</option>'; }).join('');
  var optsB = CASAS.map(function(c,i){ return '<option'+(i===1?' selected':'')+'>'+c+'</option>'; }).join('');
  $('#quad-casaA').html(optsA);
  $('#quad-casaB').html(optsB);

 
  var $slotsA = $('#quad-slots-a').empty();
  var $slotsB = $('#quad-slots-b').empty();
  POSICOES.forEach(function(pos) {
    $slotsA.append(gerarSlotInput(pos, 'A'));
    $slotsB.append(gerarSlotInput(pos, 'B'));
  });

 
  $('.quad-admin-tab').off('click').on('click', function() {
    var alvo = $(this).data('alvo');
    $('.quad-admin-tab').removeClass('quad-admin-tab-ativa');
    $(this).addClass('quad-admin-tab-ativa');
    $('.quad-adm-aba').attr('hidden', true);
    $('#' + alvo).removeAttr('hidden');
    if (alvo === 'quad-adm-treinos') carregarAdminTreinos();
    if (alvo === 'quad-adm-hist')    carregarAdminHist();
  });

  bindSlotHandlers();
  $('#quad-btn-criar').off('click').on('click', criarPartida);
}

function gerarSlotInput(pos, time) {
  var attrs = NPC_ATTRS[pos] || [];
  var attrGrid = attrs.map(function(a) {
    return '<div><div class="quad-slot-attr-lbl">'+a+'</div><input type="number" id="npc-attr-'+time+'-'+pos+'-'+a+'" class="quad-input" min="1" max="25" value="12" style="font-size:11px;padding:4px 6px;"></div>';
  }).join('');

  var div = document.createElement('div');
  div.className = 'quad-slot-item';
  div.innerHTML =
    '<div class="quad-slot-label">'+POS_LABEL[pos]+'</div>' +
    '<div class="quad-slot-controls">' +
      '<input type="text" id="uid-'+time+'-'+pos+'" class="quad-input" placeholder="uid">' +
      '<label class="quad-slot-check"><input type="checkbox" id="npc-'+time+'-'+pos+'" style="width:auto;"> npc</label>' +
      '<label class="quad-slot-check"><input type="checkbox" id="cap-'+time+'-'+pos+'" style="width:auto;"> cap</label>' +
    '</div>' +
    '<div class="quad-slot-preview" id="preview-'+time+'-'+pos+'"></div>' +
    '<div class="quad-slot-npc-extra" id="npc-extra-'+time+'-'+pos+'">' +
      '<input type="text" id="npc-nome-'+time+'-'+pos+'" class="quad-input" placeholder="nome do npc">' +
      '<div class="quad-slot-attrs-grid">'+attrGrid+'</div>' +
    '</div>';
  return div;
}

function bindSlotHandlers() {
  POSICOES.forEach(function(pos) {
    ['A','B'].forEach(function(t) {
      $('#uid-'+t+'-'+pos).off('blur').on('blur', function() {
        var v = $(this).val().trim(); if (!v || $('#npc-'+t+'-'+pos).is(':checked')) return;
        fbGet('/saldos/u'+v).then(function(d){ $('#preview-'+t+'-'+pos).text(d&&d.nome?d.nome:'uid nao encontrado'); });
      });
      $('#npc-'+t+'-'+pos).off('change').on('change', function() {
        var checked = $(this).is(':checked');
        $('#uid-'+t+'-'+pos).prop('disabled', checked);
        $('#npc-extra-'+t+'-'+pos).css('display', checked ? 'block' : 'none');
        if (!checked) $('#preview-'+t+'-'+pos).text('');
      });
    });
  });
}

function criarPartida() {
  var casaA = $('#quad-casaA').val();
  var casaB = $('#quad-casaB').val();
  if (casaA === casaB) { alert('Os dois times nao podem ser da mesma casa.'); return; }
  $('#quad-btn-criar').prop('disabled',true).text('aguarde...');

  var times = {A:{nome:casaA, placar:0, slots:{}}, B:{nome:casaB, placar:0, slots:{}}};
  var promises = [];
  var erros = [];

  POSICOES.forEach(function(pos) {
    ['A','B'].forEach(function(t) {
      var isNpc = $('#npc-'+t+'-'+pos).is(':checked');
      var isCap = $('#cap-'+t+'-'+pos).is(':checked');
      var rawUid = $('#uid-'+t+'-'+pos).val().trim();
      if (isNpc) {
        var npcNome = $('#npc-nome-'+t+'-'+pos).val().trim() || ('NPC '+POS_LABEL[pos]);
        var npcAttrs = {};
        (NPC_ATTRS[pos]||[]).forEach(function(a) {
          var v = parseInt($('#npc-attr-'+t+'-'+pos+'-'+a).val()); npcAttrs[a] = isNaN(v)?12:Math.min(25,Math.max(1,v));
        });
        times[t].slots[pos] = npcSlot(pos, npcNome, npcAttrs);
      } else if (rawUid) {
        var p = Promise.all([fbGet('/saldos/u'+rawUid), fbGet('/atributos/u'+rawUid), buscarVassoura(rawUid)]).then(function(r) {
          times[t].slots[pos] = {uid:'u'+rawUid, nome:r[0]&&r[0].nome?r[0].nome:'Jogador', posicao:pos, capitao:isCap, confirmado:false, atributos:r[1]||{}, vassoura:r[2]||{nome:'Vassoura Padrao de Hogwarts',velocidade:10,bonus:1}, debuff:null, rastreamento:0};
        });
        promises.push(p);
      } else {
        erros.push(POS_LABEL[pos]+' (Time '+t+')');
      }
    });
  });

  if (erros.length) { alert('Preencha o uid ou marque como NPC:\n'+erros.join('\n')); $('#quad-btn-criar').prop('disabled',false).text('criar partida'); return; }

  Promise.all(promises).then(function() {
    var newPid   = 'p' + Date.now();
    var pomoFase = QUAD_POMO_MIN + Math.floor(Math.random() * (QUAD_POMO_MAX - QUAD_POMO_MIN + 1));
    var partida  = {status:'aguardando', fase_atual:1, fase_deadline:null, turno_idx:0, turno_deadline:null, pomo_fase:pomoFase, pomo_capturado:false, criado_em:Date.now(), times:times, fases:{}};
    fbPut('/quadribol/partidas/'+newPid, partida).then(function() {
      pid = newPid; renderLobby(partida); startPoll(); $('#quad-btn-criar').prop('disabled',false).text('criar partida');
    });
  });
}

function npcSlot(pos, nome, atribsCustom) {
  var atribs = {forca:12, resistencia:12, agilidade:12, destreza:12, sabedoria:12, carisma:12, inteligencia:12, determinacao:12};
  if (atribsCustom) Object.keys(atribsCustom).forEach(function(k){ atribs[k] = atribsCustom[k]; });
  return {uid:'npc', nome:nome||'NPC', posicao:pos, capitao:false, confirmado:true, atributos:atribs, vassoura:{nome:'Vassoura Padrao de Hogwarts',velocidade:10,bonus:1}, debuff:null, rastreamento:0};
}

function buscarVassoura(rawUid) {
  return Promise.all([fbGet('/inventario/u'+rawUid), fbGet('/mochila/u'+rawUid)]).then(function(r) {
    var todos = Object.assign({}, r[0]||{}, r[1]||{});
    for (var k in todos) {
      var item = todos[k]; if (!item||!item.descricao) continue;
      var m = item.descricao.match(/Percorre\s+(\d+)\s+metros\s+por\s+turno/i);
      if (m) { var vel=parseInt(m[1]); return {nome:item.nome||'Vassoura', velocidade:vel, bonus:Math.floor(vel/10)}; }
    }
    return null;
  });
}

function carregarAdminTreinos() {
  var $lista = $('#quad-adm-treinos-lista').html('<p class="quad-muted quad-center">carregando...</p>');
  fbGet('/quadribol/treinos/sessoes').then(function(sessoes) {
    if (!sessoes) { $lista.html('<p class="quad-muted quad-center">nenhum treino ativo.</p>'); return; }
    $lista.empty();
    Object.keys(sessoes).forEach(function(sid) {
      var s = sessoes[sid]; if (!s||(s.status!=='ativa'&&s.status!=='aguardando')) return;
      var elapsed = s.status==='ativa' ? Math.floor((Date.now()-s.inicio)/60000) : 0;
      var div = document.createElement('div');
      div.className = 'quad-adm-item';
      div.innerHTML =
        '<div class="quad-adm-item-info">' +
          '<div class="quad-adm-item-nome">'+s.nomeA+' × '+s.nomeB+'</div>' +
          '<div class="quad-adm-item-meta">'+s.duracao_h+'h — '+(s.status==='ativa'?elapsed+'min decorridos':'aguardando parceiro')+(s.status_msg?' — "'+s.status_msg+'"':'')+' </div>' +
        '</div>' +
        '<button type="button" class="quad-btn quad-btn-danger quad-btn-sm quad-btn-interromper" data-sid="'+sid+'" data-joga="'+s.jogadorA+'" data-jogb="'+s.jogadorB+'">interromper</button>';
      $lista.append(div);
    });
    if (!$lista.children().length) $lista.html('<p class="quad-muted quad-center">nenhum treino ativo no momento.</p>');
    $('.quad-btn-interromper').off('click').on('click', function() {
      var sid=$(this).data('sid'); var jogA=$(this).data('joga'); var jogB=$(this).data('jogb');
      if (!confirm('Interromper este treino? As horas NAO serao contabilizadas.')) return;
      Promise.all([fbPut('/quadribol/treinos/sessoes/'+sid+'/status','cancelada'), fbPatch('/quadribol/treinos/jogadores/'+jogA,{sessao_id:null}), fbPatch('/quadribol/treinos/jogadores/'+jogB,{convite_sid:null,sessao_id:null})]).then(carregarAdminTreinos);
    });
  });
}

function carregarAdminHist() {
  var $lista = $('#quad-adm-hist-lista').html('<p class="quad-muted quad-center">carregando...</p>');
  fbGet('/quadribol/historico').then(function(historico) {
    if (!historico) { $lista.html('<p class="quad-muted quad-center">nenhuma partida registrada.</p>'); return; }
    var entradas = Object.values(historico).sort(function(a,b){ return b.data-a.data; });
    $lista.empty();
    entradas.forEach(function(h) {
      var div = document.createElement('div');
      div.className = 'quad-adm-item';
      div.innerHTML =
        '<div class="quad-adm-item-info">' +
          '<div class="quad-adm-item-nome">'+h.nomeA+' '+h.placarA+' × '+h.placarB+' '+h.nomeB+'</div>' +
          '<div class="quad-adm-item-meta">'+new Date(h.data).toLocaleDateString('pt-BR')+(h.nomeVencedor?' — vencedor: '+h.nomeVencedor:'')+'</div>' +
        '</div>';
      $lista.append(div);
    });
  });
}

function todosConfirmados(match) {
  return ['A','B'].every(function(t) { return POSICOES.every(function(p) { return match.times[t].slots[p] && match.times[t].slots[p].confirmado; }); });
}

function encontrarMeusSlots(match) {
  var result = [];
  ['A','B'].forEach(function(t) { POSICOES.forEach(function(pos) {
    var slot = match.times[t].slots[pos];
    if (slot && slot.uid === myUid) result.push({time:t, pos:pos, slot:slot});
  }); });
  return result;
}