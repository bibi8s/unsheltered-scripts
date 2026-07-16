'use strict';



function whenReady(fn){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fn);
  }else{
    fn();
  }
}



var QUAD_FB_PARTIDAS = 'https://quadribol-d5572-default-rtdb.firebaseio.com';
var QUAD_FB_PERSONAGENS = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';

var QUAD_ADMINS = ['1']; 


var QUAD_FASES_TOTAL = 15;
var QUAD_TURNO_SECS = 45;
var QUAD_CAPITAO_DECISAO_SEGUNDOS = 25;
var QUAD_ORDEM_ESCOLHA_SEGUNDOS = 20;
var QUAD_HP_DANO = 15;


var QUAD_POMO_MIN = 10;
var QUAD_POMO_MAX = 14;
var QUAD_POMO_BONUS_FASES = 5;


var QUAD_POSTURAS = {
  of:  { nome:'Ofensiva',    artilheiros:2,  goleiro:-2 },
  def: { nome:'Defensiva',   goleiro:2,      batedor:2,  artilheiros:-2 },
  eq:  { nome:'Equilibrada', todos:1 }
};


var QUAD_COMBOS = [
  { id:'cobertura', nome:'Cobertura Perfeita', condicao:['proteger','mergulho_ou_arremessar'], bonus:3 },
  { id:'muralha',   nome:'Muralha',            condicao:['antecipar','interceptar'],           bonus:2 },
  { id:'vigilancia',nome:'Vigilância',         condicao:['rastrear','proteger_apanhador'],     bonusRastreio:1 },
  { id:'cerco',     nome:'Cerco',              condicao:['blitz','interceptar_mesmo_alvo'],    debuffPermanente:-2 }
];


var QUAD_ATRAPALHAR_CUSTO = 5;
var QUAD_ATRAPALHAR_PENALIDADE = 0.02;



var QUAD_EVENTO_CHANCE = 0.10;

var QUAD_EVENTOS_FASE = [
  { id:'chuva', nome:'Chuva Forte', afeta:['artilheiro'], penalidade:2 },
  { id:'tempestade', nome:'Tempestade', afeta:['goleiro','batedor'], penalidade:2 },
  { id:'ventania', nome:'Ventania', afeta:['apanhador'], penalidade:2 },
  { id:'passaros', nome:'Invasão de Pássaros', afeta:['artilheiro','goleiro','batedor','apanhador'], penalidade:1 }
];


var QUAD_TREINO_META = 17;
var QUAD_TREINO_OPCOES = [
  { h:1, energia:10, label:'1h — 10 energia' },
  { h:2, energia:20, label:'2h — 20 energia' },
  { h:3, energia:30, label:'3h — 30 energia' }
];


var QUAD_BOOST_MULTIPLICADOR = 2;


var QUAD_CASAS = ['Grifinoria', 'Sonserina', 'Corvinal', 'Lufa-Lufa'];

var QUAD_CORES_CASAS = {
  'Grifinoria': { fill:'#3D0000', stroke:'#C9A84C', texto:'#FFD700' },
  'Sonserina':  { fill:'#0D2B1A', stroke:'#5E8A5E', texto:'#A8C5A0' },
  'Corvinal':   { fill:'#0A1628', stroke:'#6B4E2C', texto:'#7B9FCE' },
  'Lufa-Lufa':  { fill:'#3B2800', stroke:'#D4AC0D', texto:'#F5D485' }
};


var QUAD_MVP_DEBUFF = 3;
var QUAD_MVP_CONTROLE = 2;
var QUAD_MVP_BLITZ = 3;
var QUAD_MVP_APANHADOR_SABOTAR = 2;
var QUAD_MVP_APANHADOR_CARREGAR = 3;
var QUAD_MVP_APANHADOR_DISTRACAO = 2;
var QUAD_MVP_COMBO = 5;



var QUAD_VUVUZELA_COOLDOWN = 30;
var QUAD_APOSTA_MULTIPLICADOR = 3;

var QUAD_APOSTA_MAX = 5000;

var QUAD_SOM_VUVUZELA = [
  'https://64.media.tumblr.com/3457b24f9c9605601351debfad5f2d29/3ddcc497dd2de816-ca/3be2b6e21b21fccf151d7b1e9adfdf7a41ef82a3.mp3',
  'https://64.media.tumblr.com/2d9df066aaa6d3389fc299d49f06c38b/b63572ff62d12c25-2b/9c3a45a027c41141b70a029068b5e5542b4ee21b.mp3',
  'https://64.media.tumblr.com/c6e9aeac24e3c4b47f7fb2264c8ae2fc/39776e866410fe1e-2d/93d22964b4290512a45bda9b4b40eda6f6d7e4a8.mp3',
  'https://64.media.tumblr.com/009ed4cf320541d224f78d479bbd4463/3c3b2c2c738dcb48-9f/bab4f2bf292ad2e5b60d8947457e1e3450b10d8f.mp3',
  'https://64.media.tumblr.com/1fea86a6d8ddab85e1c0ddd81e1d03da/7274bcb320232a18-59/693deb8673f5ce8223d1c3f375df54ac31fa3950.mp3'
];



document.querySelectorAll('.qtab').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.qtab').forEach(function(b){ b.classList.remove('on'); });
    document.querySelectorAll('.qsec').forEach(function(s){ s.hidden = true; });

    btn.classList.add('on');
    var alvo = document.getElementById(btn.dataset.alvo);
    if(alvo) alvo.hidden = false;
  });
});



function fbGet(base, caminho){
  return fetch(base + caminho + '.json')
    .then(function(r){ return r.ok ? r.json() : null; })
    .catch(function(){ return null; });
}

function fbPut(base, caminho, dado){
  return fetch(base + caminho + '.json', { method:'PUT', body:JSON.stringify(dado) });
}

function fbPatch(base, caminho, dado){
  return fetch(base + caminho + '.json', { method:'PATCH', body:JSON.stringify(dado) });
}

function fbDel(base, caminho){
  return fetch(base + caminho + '.json', { method:'DELETE' });
}

var myUid = null;
var myNome = null;
var isAdmin = false;

function q1iniciar(){
  try{
    if(typeof _userdata !== 'undefined' && _userdata.user_id){
      myUid = 'u' + _userdata.user_id;
      myNome = _userdata.username;
      isAdmin = QUAD_ADMINS.indexOf(String(_userdata.user_id)) !== -1;
    }
  }catch(e){}

  document.getElementById('q1tadm').hidden = !isAdmin;
}

whenReady(function(){
  q1iniciar();
  boot();
});



var pid = null;
var pollTimer = null;

var vazioPollTimer = null;

function boot(){
  if(pollTimer) clearInterval(pollTimer);

  fbGet(QUAD_FB_PARTIDAS, '/partida_ativa').then(function(ativa){
    if(ativa && ativa.pid && (ativa.status === 'aguardando' || ativa.status === 'em_andamento')){
      if(vazioPollTimer){ clearInterval(vazioPollTimer); vazioPollTimer = null; }
      pid = ativa.pid;
      carregarPartida();
      pollTimer = setInterval(carregarPartida, 4000);
    }else{
      pid = null;
      if(isAdmin){
        document.getElementById('q1tadm').click();
      }else{
        mostrarVazio();
        if(!vazioPollTimer) vazioPollTimer = setInterval(boot, 6000);
      }
    }
  });
}

function carregarPartida(){
  if(!pid) return;
  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    if(!match){
      clearInterval(pollTimer);
      boot();
      return;
    }
    if(match.status === 'em_andamento'){
      iniciarJogo(match);
    }else{
      renderLobby(match);
    }
  });
}

function mostrarVazio(){
  document.getElementById('q3vazio').hidden = false;
  document.getElementById('q3lobby').hidden = true;
  document.getElementById('q3jogo').hidden = true;
  document.getElementById('q3admbar').hidden = true;
  pararPollVuvuzela();
}




var POSICOES = ['artilheiro1','artilheiro2','batedor','goleiro','apanhador'];

var POS_LABEL = {
  artilheiro1:'Artilheiro', artilheiro2:'Artilheiro',
  batedor:'Batedor', goleiro:'Goleiro', apanhador:'Apanhador'
};

var POS_ABREV = {
  artilheiro1:'ART', artilheiro2:'ART',
  batedor:'BAT', goleiro:'GOL', apanhador:'APH'
};

var POSTURA_LABEL = {
  of:'Postura ofensiva', def:'Postura defensiva', eq:'Postura equilibrada'
};



function encontrarMeuSlot(match){
  var achado = null;
  ['A','B'].forEach(function(t){
    POSICOES.forEach(function(pos){
      var slot = match.times[t].slots[pos];
      if(slot && slot.uid === myUid) achado = { time:t, pos:pos, slot:slot };
    });
  });
  return achado;
}

var vassourasCarregadasPid = null;

function renderLobby(match){
  pararPollVuvuzela();
  document.getElementById('q3vazio').hidden = true;
  document.getElementById('q3jogo').hidden = true;
  document.getElementById('q3lobby').hidden = false;
  document.getElementById('q3admbar').hidden = !isAdmin;

  var timeA = match.times.A;
  var timeB = match.times.B;

  document.getElementById('q3nomea').innerHTML = nomeCasaComEmblema(timeA.nome);
  document.getElementById('q3nomeb').innerHTML = nomeCasaComEmblema(timeB.nome);
  document.getElementById('q3colnomea').innerHTML = nomeCasaComEmblema(timeA.nome);
  document.getElementById('q3colnomeb').innerHTML = nomeCasaComEmblema(timeB.nome);

  var meu = encontrarMeuSlot(match);

  var elMeu = document.getElementById('q3meu');
  var elVassouraRow = document.getElementById('q3vassoura').parentNode;
  var elConfirmar = document.getElementById('q3confirmar');
  var elPosturaEdit = document.getElementById('q3rowpostura');
  var elPosturaVer = document.getElementById('q3rowposturaver');

  if(!meu){
    elMeu.hidden = true;
    elVassouraRow.hidden = true;
    elConfirmar.hidden = true;
    elPosturaEdit.hidden = true;
    elPosturaVer.hidden = true;
  }else{
    elMeu.hidden = false;
    document.getElementById('q3meupos').textContent = POS_LABEL[meu.pos];
    document.getElementById('q3meutime').textContent = meu.time === 'A' ? timeA.nome : timeB.nome;
    document.getElementById('q3meucap').hidden = !meu.slot.capitao;

    var postura = match.times[meu.time].postura;

    if(meu.slot.capitao){
      elPosturaEdit.hidden = false;
      elPosturaVer.hidden = true;
      if(postura) document.getElementById('q3postura').value = postura;

      document.getElementById('q3postura').onchange = function(){
        fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + meu.time, { postura: this.value });
      };
    }else{
      elPosturaEdit.hidden = true;
      if(postura){
        elPosturaVer.hidden = false;
        document.getElementById('q3posturaver').textContent = POSTURA_LABEL[postura];
      }else{
        elPosturaVer.hidden = true;
      }
    }

    if(meu.slot.confirmado){
      elVassouraRow.hidden = true;
      elConfirmar.hidden = false;
      elConfirmar.innerHTML = '<i class="fa fa-times"></i> cancelar presença';
      elConfirmar.onclick = function(){ cancelarPresenca(meu); };
    }else{
      elVassouraRow.hidden = false;
      elConfirmar.hidden = false;
      elConfirmar.innerHTML = '<i class="fa fa-check"></i> confirmar presença';
      elConfirmar.onclick = function(){ confirmarPresenca(meu); };
      if(vassourasCarregadasPid !== pid){
        vassourasCarregadasPid = pid;
        carregarVassouras();
      }
    }
  }

  var podeTrocar = isAdmin && match.status === 'aguardando';
  montarColuna('q3cola', timeA.slots, 'A', podeTrocar);
  montarColuna('q3colb', timeB.slots, 'B', podeTrocar);

  var elIniciarWrap = document.getElementById('q3iniciarwrap');
  if(!isAdmin){
    elIniciarWrap.hidden = true;
  }else{
    elIniciarWrap.hidden = false;

    var totalSlots = 0, totalConfirmados = 0;
    ['A','B'].forEach(function(t){
      POSICOES.forEach(function(pos){
        var s = match.times[t].slots[pos];
        if(!s) return;
        totalSlots++;
        if(s.confirmado) totalConfirmados++;
      });
    });

    var elBtn = document.getElementById('q3iniciarpartida');
    var elStatus = document.getElementById('q3iniciarstatus');
    var todosConfirmaram = (totalConfirmados === totalSlots) && totalSlots > 0;

    elBtn.disabled = !todosConfirmaram;
    elStatus.textContent = totalConfirmados + ' de ' + totalSlots + ' confirmados';

    elBtn.onclick = function(){
      if(!todosConfirmaram) return;
      fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid, {
        status: 'em_andamento',
        turno_idx: 0
      });
    };
  }
}

function montarColuna(id, slots, time, podeTrocar){
  var col = document.getElementById(id);
  col.innerHTML = '';
  POSICOES.forEach(function(pos){
    var slot = slots[pos];
    if(!slot) return;
    var row = document.createElement('div');
    row.className = 'q3jog';
    var fotoHtml = slot.foto
      ? '<img class="q3jogfoto" src="' + slot.foto + '">'
      : '<div class="q3jogfoto q3jogfotovazia"><i class="fa fa-user"></i></div>';
    row.innerHTML =
      fotoHtml +
      '<i class="fa ' + (slot.confirmado ? 'fa-circle' : 'fa-circle-o') + ' q3dot"></i>' +
      '<span class="q3jognome">' + escaparHtml(slot.nome) + '</span>' +
      '<span class="q3jogpos">' + POS_ABREV[pos] + '</span>' +
      (podeTrocar ? '<button type="button" class="q3trocarbtn" data-time="' + time + '" data-pos="' + pos + '" title="trocar jogador"><i class="fa fa-exchange"></i></button>' : '');
    col.appendChild(row);
  });

  if(podeTrocar){
    col.querySelectorAll('.q3trocarbtn').forEach(function(btn){
      btn.onclick = function(){
        fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(matchAtual){
          if(matchAtual) abrirModalTroca(matchAtual, btn.dataset.time, btn.dataset.pos);
        });
      };
    });
  }
}



var SLOT_POS_BASE_TROCA = {
  artilheiro1: 'artilheiro', artilheiro2: 'artilheiro',
  batedor: 'batedor', goleiro: 'goleiro', apanhador: 'apanhador'
};

function abrirModalTroca(match, time, pos){
  var casa = match.times[time].nome;
  var posBase = SLOT_POS_BASE_TROCA[pos];

  fbGet(QUAD_FB_PARTIDAS, '/jogadores').then(function(jogadores){
    jogadores = jogadores || {};

    var candidatos = Object.keys(jogadores)
      .map(function(id){ return Object.assign({ id:id }, jogadores[id]); })
      .filter(function(j){ return j.casa === casa && j.posicao === posBase; })
      .sort(function(a, b){ return (b.titular ? 1 : 0) - (a.titular ? 1 : 0); });

    var sel = document.getElementById('q3trocaselect');

    if(!candidatos.length){
      sel.innerHTML = '<option value="">nenhum jogador disponível nessa posição/casa</option>';
    }else{
      sel.innerHTML = candidatos.map(function(c){
        return '<option value="' + c.id + '">' + escaparHtml(c.nome) +
          (c.titular ? '' : ' (reserva)') + (c.isNpc ? ' [NPC]' : '') + '</option>';
      }).join('');
    }

    document.getElementById('q3trocatitulo').innerHTML =
      'trocar ' + escaparHtml(POS_LABEL[pos]) + ' — ' + nomeCasaComEmblema(match.times[time].nome);

    var modal = document.getElementById('q3trocamodal');
    modal.dataset.time = time;
    modal.dataset.pos = pos;
    modal.hidden = false;
  });
}

document.getElementById('q3trocafechar').onclick = function(){
  document.getElementById('q3trocamodal').hidden = true;
};

document.getElementById('q3trocaconfirmar').onclick = function(){
  var modal = document.getElementById('q3trocamodal');
  var time = modal.dataset.time, pos = modal.dataset.pos;
  var novoId = document.getElementById('q3trocaselect').value;
  if(!novoId || !pid) return;

  Promise.all([
    fbGet(QUAD_FB_PARTIDAS, '/jogadores/' + novoId),
    fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid)
  ]).then(function(r){
    var cad = r[0], matchAtual = r[1];
    if(!cad || !matchAtual) return;

    var slotAtual = matchAtual.times[time].slots[pos];

    var novoSlot = {
      uid: cad.isNpc ? 'npc' : novoId,
      nome: cad.nome,
      capitao: !!(slotAtual && slotAtual.capitao),
      confirmado: !!cad.isNpc,
      foto: cad.foto || null
    };

    if(cad.isNpc){
      novoSlot.atributos = cad.atributos || {};
      novoSlot.vassoura = cad.vassoura || { nome:'Vassoura Padrao de Hogwarts', bonus:1 };
      novoSlot.maestria = {
        quadribol: cad.maestriaPct || 0,
        artilheiro: (cad.especializacoes && cad.especializacoes.artilheiro) || 0,
        defesa: (cad.especializacoes && cad.especializacoes.defesa) || 0,
        manobras: (cad.especializacoes && cad.especializacoes.manobras) || 0,
        pomo: (cad.especializacoes && cad.especializacoes.pomo) || 0
      };
    }

    fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + time + '/slots/' + pos, novoSlot).then(function(){
      modal.hidden = true;
      carregarPartida();
    });
  });
};

function cancelarPartidaAdmin(){
  if(!isAdmin || !pid) return;
  if(!confirm('Cancelar esta partida? Ela será apagada por completo, sem deixar registro no histórico.')) return;

  var pidAtual = pid;

  Promise.all([
    fbDel(QUAD_FB_PARTIDAS, '/partida_ativa'),
    fbDel(QUAD_FB_PARTIDAS, '/partidas/' + pidAtual)
  ]).then(function(){
    if(pollTimer) clearInterval(pollTimer);
    if(jogoPollTimer) clearInterval(jogoPollTimer);
    pid = null;
    boot();
  });
}

document.getElementById('q3admcancelar').onclick = cancelarPartidaAdmin;

function extrairPercentualVassoura(desc, regex){
  var m = desc.match(regex);
  return m ? parseInt(m[1]) : 0;
}

function detectarVassoura(item){
  if(!item || !item.descricao) return null;
  var desc = item.descricao;
  if(desc.indexOf('Cabo:') === -1) return null;

  
  var ehRaro = /raro/i.test(desc);
  var bonus = ehRaro ? 2 : 1;

  
  
  var manobrabilidade = extrairPercentualVassoura(desc, /Manobrabilidade:\s*(\d+)%/i);
  var estabilidade = extrairPercentualVassoura(desc, /Estabilidade:\s*(\d+)%/i);
  var aceleracao = extrairPercentualVassoura(desc, /Acelera[cç][aã]o(?:\/Freagem)?:\s*(\d+)%/i);
  var velocidade = extrairPercentualVassoura(desc, /Velocidade[^:]*:\s*(\d+)%/i);
  var resistencia = extrairPercentualVassoura(desc, /Resist[eê]ncia:\s*(\d+)%/i);
  var altitude = extrairPercentualVassoura(desc, /Altitude:\s*(\d+)%/i);

  return {
    nome: item.nome || 'Vassoura',
    bonus: bonus,
    atributos: {
      manobrabilidade: manobrabilidade,
      estabilidade: estabilidade,
      velocidade: Math.max(aceleracao, velocidade),
      resistencia: resistencia,
      altitude: altitude
    }
  };
}

function carregarVassouras(){
  var sel = document.getElementById('q3vassoura');
  Promise.all([
    fbGet(QUAD_FB_PERSONAGENS, '/inventario/' + myUid),
    fbGet(QUAD_FB_PERSONAGENS, '/mochila/' + myUid)
  ]).then(function(r){
    var todos = Object.assign({}, r[0] || {}, r[1] || {});
    var opts = '<option value="padrao">Vassoura Padrão de Hogwarts (+1)</option>';
    var lista = [];
    Object.values(todos).forEach(function(item){
      var v = detectarVassoura(item);
      if(!v) return;
      lista.push(v);
      opts += '<option value="' + (lista.length - 1) + '">' + escaparHtml(v.nome) + ' (+' + v.bonus + ')</option>';
    });
    sel.innerHTML = opts;
    sel.dataset.lista = JSON.stringify(lista);
  });
}

function confirmarPresenca(meu){
  var sel = document.getElementById('q3vassoura');
  var lista = JSON.parse(sel.dataset.lista || '[]');
  var vassoura = (sel.value === 'padrao' || !sel.value)
    ? { nome:'Vassoura Padrao de Hogwarts', bonus:1 }
    : (lista[parseInt(sel.value)] || { nome:'Vassoura Padrao de Hogwarts', bonus:1 });

  Promise.all([
    fbGet(QUAD_FB_PERSONAGENS, '/atributos/' + myUid),
    fbGet(QUAD_FB_PERSONAGENS, '/maestrias-personagem/' + myUid),
    fbGet(QUAD_FB_PARTIDAS, '/jogadores/' + myUid)
  ]).then(function(r){
    var atributos = r[0] || {};
    var maestrias = r[1] || {};
    var cadastro = r[2] || {};

    var pctQuadribol = maestrias.maestria_em_quadribol ? (maestrias.maestria_em_quadribol.porcentagem || 0) : 0;
    var pctVoo = maestrias.maestria_em_voo ? (maestrias.maestria_em_voo.porcentagem || 0) : 0;

    var maestria = {
      quadribol: pctQuadribol,
      voo: pctVoo,
      artilheiro: (cadastro.especializacoes && cadastro.especializacoes.artilheiro) || 0,
      defesa: (cadastro.especializacoes && cadastro.especializacoes.defesa) || 0,
      manobras: (cadastro.especializacoes && cadastro.especializacoes.manobras) || 0,
      pomo: (cadastro.especializacoes && cadastro.especializacoes.pomo) || 0
    };

    fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + meu.time + '/slots/' + meu.pos, {
      confirmado: true,
      vassoura: vassoura,
      atributos: atributos,
      maestria: maestria,
      foto: cadastro.foto || null
    }).then(carregarPartida);
  });
}

function cancelarPresenca(meu){
  fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + meu.time + '/slots/' + meu.pos, {
    confirmado: false
  }).then(carregarPartida);
}



function escaparHtml(txt){
  var d = document.createElement('div');
  d.textContent = txt == null ? '' : String(txt);
  return d.innerHTML;
}

function slugCasaEmblema(nomeCasa){
  if(!nomeCasa) return '';
  return nomeCasa.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

function emblemaCasa(nomeCasa){
  var slug = slugCasaEmblema(nomeCasa);
  if(!slug) return '';
  return '<i class="wl wl-' + slug + '-nor2"></i> ';
}

function nomeCasaComEmblema(nomeCasa){
  return emblemaCasa(nomeCasa) + escaparHtml(nomeCasa);
}



var jogoPollTimer = null;
var lastTurnoRenderizado = -1;
var faseComTimeoutIniciado = null;
var ultimoComboMostrado = null;
var souComentaristaRegistrado = false;

function iniciarJogo(match){
  if(pollTimer) clearInterval(pollTimer);

  document.getElementById('q3vazio').hidden = true;
  document.getElementById('q3lobby').hidden = true;
  document.getElementById('q3jogo').hidden = false;
  document.getElementById('q3admbar').hidden = !isAdmin;

  lastTurnoRenderizado = -1;
  faseComTimeoutIniciado = null;
  ultimoComboMostrado = null;

  fbGet(QUAD_FB_PARTIDAS, '/comentaristas/' + myUid).then(function(c){
    souComentaristaRegistrado = !!c;
    document.getElementById('q3muralcomlabel').hidden = !souComentaristaRegistrado;
  });

  document.getElementById('q3muralenviar').onclick = enviarMural;
  document.getElementById('q3muraltexto').onkeydown = function(e){
    if(e.key === 'Enter'){ e.preventDefault(); enviarMural(); }
  };

  atualizarJogo();
  jogoPollTimer = setInterval(atualizarJogo, 2500);
  iniciarPollVuvuzela();
}

function renderMural(match){
  var lista = document.getElementById('q3murallista');
  if(!lista) return;

  var mural = match.mural || {};
  var entradas = Object.keys(mural).map(function(k){ return mural[k]; })
    .sort(function(a, b){ return (a.ts || 0) - (b.ts || 0); })
    .slice(-50);

  if(!entradas.length){
    lista.innerHTML = '<div class="q3muralmsg" style="opacity:.4;font-style:italic;">nenhum comentário ainda. seja o primeiro!</div>';
    return;
  }

  lista.innerHTML = '';
  entradas.forEach(function(m){
    var div = document.createElement('div');
    div.className = 'q3muralmsg' + (m.tipo === 'comentarista' ? ' q3muralcomentarista' : '');
    div.innerHTML = '<span class="q3muralnome">' + escaparHtml(m.nome) + ':</span> ' + escaparHtml(m.texto);
    lista.appendChild(div);
  });
}

function enviarMural(){
  var input = document.getElementById('q3muraltexto');
  var texto = input.value.trim();
  if(!texto || !pid) return;

  var comoComentarista = souComentaristaRegistrado && document.getElementById('q3muralcom').checked;
  var key = 'm' + Date.now() + Math.floor(Math.random() * 1000);

  var entrada = {
    uid: myUid,
    nome: myNome,
    texto: texto,
    tipo: comoComentarista ? 'comentarista' : 'torcida',
    ts: Date.now()
  };

  fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/mural/' + key, entrada).then(function(){
    input.value = '';
  });
}

function atualizarJogo(){
  if(!pid) return;
  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    if(!match){ clearInterval(jogoPollTimer); boot(); return; }

    if(match.status === 'encerrada'){
      clearInterval(jogoPollTimer);
      renderFim(match);
      return;
    }

    if(match.status !== 'em_andamento'){ clearInterval(jogoPollTimer); boot(); return; }

    var fase = match.fase_atual;
    var faseObj = (match.fases && match.fases[fase]) || {};

    if(!faseObj.fila){
      document.getElementById('q3ordemescolha').hidden = false;
      document.getElementById('q3jogoconteudo').hidden = true;

      if(faseComTimeoutIniciado !== fase){
        faseComTimeoutIniciado = fase;
        iniciarTimeoutOrdem(fase);
      }

      renderEscolhaOrdem(match);
    }else{
      document.getElementById('q3ordemescolha').hidden = true;
      document.getElementById('q3jogoconteudo').hidden = false;
      renderJogo(match);
    }
  });
}

function renderJogo(match){
  var fase = match.fase_atual || 1;
  var faseObj = (match.fases && match.fases[fase]) || {};
  var fila = faseObj.fila || [];
  var turnoIdx = match.turno_idx || 0;
  var atual = fila[turnoIdx] || {};
  var timeA = match.times.A;
  var timeB = match.times.B;

  var elOrdem = document.getElementById('q3ordem');
  elOrdem.innerHTML = fila.map(function(item, i){
    var cls = i === turnoIdx ? 'q3ordematual' : '';
    return '<span class="' + cls + '">' + item.time + POS_ABREV[item.pos] + '</span>';
  }).join(' → ');

var elJog = document.getElementById('q3jogadores');
  elJog.innerHTML = '';
  ['A','B'].forEach(function(t){
    POSICOES.forEach(function(pos){
      var slot = match.times[t].slots[pos];
      if(!slot) return;
      var ehAtual = atual.time === t && atual.pos === pos;
      var div = document.createElement('div');
      div.className = 'q3pbox' + (ehAtual ? ' q3pvez' : '');
      div.dataset.time = t;
      div.dataset.pos = pos;
      div.innerHTML = '<div class="q3pnome">' + escaparHtml(abreviarNome(slot.nome)) + '</div><div class="q3ppos">' + POS_ABREV[pos] + '</div>';
      elJog.appendChild(div);
    });
  });

  document.querySelectorAll('.q3pbox').forEach(function(box){
    box.onclick = function(){ abrirFicha(match, box.dataset.time, box.dataset.pos); };
  });


  document.getElementById('q3placarnomea').innerHTML = nomeCasaComEmblema(timeA.nome);
  document.getElementById('q3placarnomeb').innerHTML = nomeCasaComEmblema(timeB.nome);
  document.getElementById('q3pontosa').textContent = timeA.placar || 0;
  document.getElementById('q3pontosb').textContent = timeB.placar || 0;

  var bonus = match.pomo_bonus;
  document.getElementById('q3ladoa').classList.toggle('q3bonus', !!(bonus && bonus.time === 'A'));
  document.getElementById('q3ladob').classList.toggle('q3bonus', !!(bonus && bonus.time === 'B'));

  var faseParaLog = faseObj.resultado ? fase : fase - 1;
  var objParaLog = (match.fases && match.fases[faseParaLog]) || {};
  var elLog = document.getElementById('q3log');
  elLog.innerHTML = '';
  var log = (objParaLog.resultado && objParaLog.resultado.log) || [];
  log.slice().reverse().forEach(function(entrada){
    var div = document.createElement('div');
    div.className = 'q3logl' + (entrada.combo ? ' q3logcombo' : '');
    div.textContent = typeof entrada === 'string' ? entrada : entrada.text;
    elLog.appendChild(div);
  });

  var destaquesDaFase = log.filter(function(e){ return e.combo || e.evento; });
  var elCombo = document.getElementById('q3combo');
  if(destaquesDaFase.length && ultimoComboMostrado !== faseParaLog){
    ultimoComboMostrado = faseParaLog;
    elCombo.innerHTML = '<i class="fa fa-bolt"></i> ' + destaquesDaFase.map(function(e){ return e.nome; }).join(', ');
    elCombo.hidden = false;
    setTimeout(function(){ elCombo.hidden = true; }, 4000);
  }

  renderMural(match);

  if(turnoIdx !== lastTurnoRenderizado){
    lastTurnoRenderizado = turnoIdx;
    acaoSelecionada = {};
    iniciarCountdown(match.turno_deadline || (Date.now() + QUAD_TURNO_SECS * 1000));
    renderAcoes(match);
  }
}

function abreviarNome(nome){
  if(!nome) return '';
  var partes = nome.trim().split(/\s+/);
  if(partes.length === 1) return partes[0];
  return partes[0].charAt(0) + '. ' + partes[partes.length - 1];
}



var ACOES = {
  artilheiro:[
    { id:'arremessar', nome:'Arremessar', desc:'Tenta marcar gol contra o Goleiro adversário.' },
    { id:'passar', nome:'Passar', desc:'Passa a Goles para o parceiro. +2 no arremesso.' },
    { id:'fintar', nome:'Fintar', desc:'Esquiva do Balaço usando agilidade e leitura de jogo.' },
    { id:'mergulho', nome:'Mergulho', desc:'Avança em alta velocidade. Vencendo: +4 arremesso.' },
    { id:'finta_passe', nome:'Finta de Passe', desc:'Engana o Goleiro. Vencendo: -3 na defesa desta fase.' }
  ],
  batedor:[
    { id:'lancar_balaco', nome:'Lançar Balaço', desc:'Acerta um adversário. -2 no atributo principal.', alvos:'adversarios' },
    { id:'proteger', nome:'Proteger', desc:'Cobre um aliado contra o Balaço adversário.', alvos:'aliados' },
    { id:'interceptar', nome:'Interceptar', desc:'Bloqueia o passe dos Artilheiros adversários.' },
    { id:'derrubar', nome:'Derrubar', desc:'Colisão direta. Vencendo: alvo perde o próximo par.', alvos:'adversarios' },
    { id:'pressao_aerea', nome:'Pressão Aérea', desc:'Intimida adversário. Vencendo: -2 no próximo roll.', alvos:'adversarios' }
  ],
  goleiro:[
    { id:'defender', nome:'Defender', desc:'Posiciona-se nos aros. +2 no roll de defesa.' },
    { id:'blitz', nome:'Blitz', desc:'Avança para interceptar. Se falhar, gol automático.' },
    { id:'lancar_goles', nome:'Lançar Goles', desc:'Arremessa a Goles para um Artilheiro aliado (+2).', alvos:'art_aliados' },
    { id:'antecipar', nome:'Antecipar', desc:'Lê o jogo. Vencendo: +5 defesa esta fase.' },
    { id:'derrubar_artilheiro', nome:'Derrubar Artilheiro', desc:'Vencendo: artilheiro não arremessa.', alvos:'art_adversarios' }
  ],
  apanhador:[
    { id:'rastrear', nome:'Rastrear', desc:'Acumula +1 de bônus para captura do Pomo.' },
    { id:'sabotar', nome:'Sabotar', desc:'Zera o rastreamento do Apanhador adversário.' },
    { id:'distracao', nome:'Distração', desc:'Adversário perde a fase sem acumular rastreamento.' },
    { id:'auxiliar', nome:'Auxiliar', desc:'Passa a Goles para um Artilheiro aliado (+2).', alvos:'art_aliados' },
    { id:'mergulho_pomo', nome:'Mergulho pelo Pomo', desc:'Captura antecipada. Perdendo: -2 rastreamento.' },
    { id:'carregar', nome:'Carregar', desc:'Derruba o Apanhador adversário e zera o rastreio dele.' }
  ]
};

function acoesDaPosicao(pos){
  var chave = (pos === 'artilheiro1' || pos === 'artilheiro2') ? 'artilheiro' : pos;
  return ACOES[chave] || [];
}

function encontrarMeusSlots(match){
  var r = [];
  ['A','B'].forEach(function(t){
    var souCap = POSICOES.some(function(pos){
      var s = match.times[t].slots[pos];
      return s && s.uid === myUid && s.capitao;
    });
    POSICOES.forEach(function(pos){
      var slot = match.times[t].slots[pos];
      if(!slot) return;
      if(slot.uid === myUid){
        r.push({ time:t, pos:pos, slot:slot });
      }else if(slot.uid === 'npc' && souCap){
        r.push({ time:t, pos:pos, slot:slot, viaCapitao:true });
      }
    });
  });
  return r;
}

var acaoSelecionada = {};

function renderAcoes(match){
  var elAcoes = document.getElementById('q3acoes');
  elAcoes.innerHTML = '';

  var fase = match.fase_atual || 1;
  var faseObj = (match.fases && match.fases[fase]) || {};
  var acoesFase = faseObj.acoes || {};
  var fila = faseObj.fila || [];
  var turnoIdx = match.turno_idx || 0;
  var atual = fila[turnoIdx] || {};

  var meusSlots = encontrarMeusSlots(match);

  var pend = faseObj.pendente_capitao;
  if(pend){
    var partsPend = pend.sk.split('_');
    var tPend = partsPend[0], posPend = partsPend[1];
    var souCapDoPendente = POSICOES.some(function(p){
      var s = match.times[tPend].slots[p];
      return s && s.uid === myUid && s.capitao;
    });
    if(souCapDoPendente){
      elAcoes.appendChild(gerarPainelDecisaoCapitao(tPend, posPend, match));
    }
  }

  if(!meusSlots.length && !pend){
    renderTorcida(match, elAcoes);
    ['A','B'].forEach(function(time){
      if(souCapitaoDoTime(match, time)){
        var painel = gerarPainelCapitao(match, time);
        if(painel) elAcoes.appendChild(painel);
      }
    });
    bindAcoesEventos();
    bindCapitaoEventos(match);
    return;
  }

  meusSlots.forEach(function(item){
    var sk = item.time + '_' + item.pos;
    var jaAgiu = !!acoesFase[sk];
    var eMinhaVez = atual.time === item.time && atual.pos === item.pos;
    var titulo = POS_LABEL[item.pos] + (item.viaCapitao ? ' (NPC)' : '');

    var box = document.createElement('div');
    box.className = 'qcard';
    box.id = 'q3card_' + sk;

    if(jaAgiu){
      box.innerHTML = '<div class="qlbl">' + titulo + '</div><div>Ação enviada, aguardando os outros.</div>';
    }else if(!eMinhaVez){
      box.innerHTML = '<div class="qlbl">' + titulo + '</div><div>Aguardando sua vez...</div>';
}else{
      var lista = acoesDaPosicao(item.pos);
      var html = '<div class="qlbl">' + titulo + '</div>';
      if(item.pos === 'apanhador'){
        html += '<div id="q3rastreiotxt">rastreio atual: ' + (item.slot.rastreamento || 0) + '</div>';
      }
      html += '<div class="q3acoesgrid">';

      lista.forEach(function(a){
        html += '<button type="button" class="q3acaobtn" data-sk="' + sk + '" data-acao="' + a.id + '" data-alvos="' + (a.alvos || '') + '">' + a.nome + '</button>';
      });
      html += '</div>';
      html += '<div class="q3alvo" id="q3alvo_' + sk + '" hidden></div>';
      html += '<label class="q3boostcheck"><input type="checkbox" class="q3boost" data-sk="' + sk + '"' + (item.slot.boost_usado ? ' disabled' : '') + '> usar boost</label>';
      html += '<button type="button" class="q3confirmaracao" data-sk="' + sk + '" data-time="' + item.time + '" data-pos="' + item.pos + '">confirmar ação</button>';
      box.innerHTML = html;
    }

    elAcoes.appendChild(box);
  });

  ['A','B'].forEach(function(time){
    if(souCapitaoDoTime(match, time)){
      var painel = gerarPainelCapitao(match, time);
      if(painel) elAcoes.appendChild(painel);
    }
  });

  bindAcoesEventos();
  bindCapitaoEventos(match);
}

function gerarPainelDecisaoCapitao(time, pos, match){
  var sk = time + '_' + pos;
  var slot = match.times[time].slots[pos];
  var lista = acoesDaPosicao(pos);

  var box = document.createElement('div');
  box.className = 'qcard';
  box.id = 'q3carddecisao_' + sk;
  box.style.borderLeft = '3px solid var(--accent4)';

  var html = '<div class="qlbl"><i class="fa fa-flag"></i> decisão de capitão — ' + escaparHtml(slot.nome) + ' está ausente</div>';

  html += '<div class="q3acoesgrid">';
  lista.forEach(function(a){
    html += '<button type="button" class="q3acaobtn" data-sk="' + sk + '" data-acao="' + a.id + '" data-alvos="' + (a.alvos || '') + '">' + a.nome + '</button>';
  });
  html += '</div>';
  html += '<div class="q3alvo" id="q3alvo_' + sk + '" hidden></div>';
  html += '<button type="button" class="q3confirmardecisao" data-sk="' + sk + '" data-time="' + time + '" data-pos="' + pos + '">confirmar decisão</button>';
  box.innerHTML = html;
  return box;
}

function bindAcoesEventos(){
  document.querySelectorAll('.q3acaobtn').forEach(function(btn){
    btn.onclick = function(){
      var sk = btn.dataset.sk;
      document.querySelectorAll('.q3acaobtn[data-sk="' + sk + '"]').forEach(function(b){ b.classList.remove('q3sel'); });
      btn.classList.add('q3sel');

      if(!acaoSelecionada[sk]) acaoSelecionada[sk] = {};
      acaoSelecionada[sk].acao = btn.dataset.acao;
      acaoSelecionada[sk].alvo = null;

      renderAlvo(sk, btn.dataset.alvos);
    };
  });

  document.querySelectorAll('.q3boost').forEach(function(chk){
    chk.onchange = function(){
      var sk = chk.dataset.sk;
      if(!acaoSelecionada[sk]) acaoSelecionada[sk] = {};
      acaoSelecionada[sk].boost = chk.checked;
    };
  });

  document.querySelectorAll('.q3confirmaracao').forEach(function(btn){
    btn.onclick = function(){
      var sk = btn.dataset.sk;
      var sel = acaoSelecionada[sk];
      if(!sel || !sel.acao){ alert('Escolha uma ação primeiro.'); return; }

      document.querySelectorAll('.q3confirmaracao').forEach(function(b){ b.disabled = true; });

      confirmarAcao(btn.dataset.time, btn.dataset.pos, sel.acao, sel.alvo || null, !!sel.boost);
    };
  });

  document.querySelectorAll('.q3confirmardecisao').forEach(function(btn){
    btn.onclick = function(){
      var sk = btn.dataset.sk;
      var sel = acaoSelecionada[sk];
      if(!sel || !sel.acao){ alert('Escolha uma ação primeiro.'); return; }

      btn.disabled = true;
      confirmarDecisaoCapitao(btn.dataset.time, btn.dataset.pos, sel.acao, sel.alvo || null);
    };
  });
}

function renderAlvo(sk, alvos){
  var wrap = document.getElementById('q3alvo_' + sk);
  if(!alvos){ wrap.hidden = true; return; }

  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    var parts = sk.split('_');
    var t = parts[0], pos = parts[1];
    var advT = t === 'A' ? 'B' : 'A';
    var lista = [];

    if(alvos === 'adversarios'){
      POSICOES.forEach(function(p){ var s = match.times[advT].slots[p]; if(s) lista.push({ val:p, label:escaparHtml(s.nome) + ' (' + POS_LABEL[p] + ')' }); });
    }else if(alvos === 'aliados'){
      POSICOES.forEach(function(p){ if(p === pos) return; var s = match.times[t].slots[p]; if(s) lista.push({ val:p, label:escaparHtml(s.nome) + ' (' + POS_LABEL[p] + ')' }); });
    }else if(alvos === 'art_aliados'){
      ['artilheiro1','artilheiro2'].forEach(function(p){ var s = match.times[t].slots[p]; if(s) lista.push({ val:p, label:escaparHtml(s.nome) + ' (' + POS_LABEL[p] + ')' }); });
    }else if(alvos === 'art_adversarios'){
      ['artilheiro1','artilheiro2'].forEach(function(p){ var s = match.times[advT].slots[p]; if(s) lista.push({ val:p, label:escaparHtml(s.nome) + ' (' + POS_LABEL[p] + ')' }); });
    }

    wrap.innerHTML = lista.map(function(item){
      return '<label class="q3alvoradio"><input type="radio" name="alvo_' + sk + '" value="' + item.val + '"> ' + item.label + '</label>';
    }).join('');
    wrap.hidden = false;

    document.querySelectorAll('input[name="alvo_' + sk + '"]').forEach(function(r){
      r.onchange = function(){ acaoSelecionada[sk].alvo = r.value; };
    });
  });
}

function confirmarAcao(time, pos, acaoId, alvo, usouBoost){
  var sk = time + '_' + pos;

  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    if(!match) return;
    var fase = match.fase_atual;

    var promessas = [
      fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/acoes/' + sk, {
        acao: acaoId, alvo: alvo || null, boost: !!usouBoost, ts: Date.now()
      })
    ];

    if(usouBoost){
      promessas.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + time + '/slots/' + pos, { boost_usado: true }));
    }

    Promise.all(promessas).then(function(){
      var box = document.getElementById('q3card_' + sk);
      if(box) box.innerHTML = '<div class="qlbl">' + POS_LABEL[pos] + '</div><div>Ação enviada, aguardando os outros.</div>';
      avancarTurno();
    });
  });
}

function confirmarDecisaoCapitao(time, pos, acaoId, alvo){
  var sk = time + '_' + pos;

  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    if(!match) return;
    var fase = match.fase_atual;

    Promise.all([
      fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/acoes/' + sk, {
        acao: acaoId, alvo: alvo || null, boost:false, ts: Date.now(), decidido_por_capitao:true
      }),
      fbDel(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/pendente_capitao')
    ]).then(function(){
      var box = document.getElementById('q3carddecisao_' + sk);
      if(box) box.innerHTML = '<div class="qlbl">decisão enviada</div>';
      avancarTurno();
    });
  });
}



function avancarTurno(){
  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    if(!match) return;

    var fase = match.fase_atual;
    var faseObj = (match.fases && match.fases[fase]) || {};
    var fila = faseObj.fila || [];
    var turnoIdx = match.turno_idx || 0;
    var atual = fila[turnoIdx];
    if(!atual) return;

    var sk = atual.time + '_' + atual.pos;
    var acoesFase = faseObj.acoes || {};

    if(!acoesFase[sk]){
      document.querySelectorAll('.q3confirmaracao').forEach(function(b){ b.disabled = false; });
      return;
    }

    var proximoIdx = turnoIdx + 1;

    if(proximoIdx >= fila.length){
      resolverFase(match);
    }else{
      fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid, {
        turno_idx: proximoIdx,
        turno_deadline: Date.now() + QUAD_TURNO_SECS * 1000
      });
    }
  });
}



var MAESTRIA_TIERS = [0,25,35,70,95];
var MAESTRIA_BONUS = [0,1,2,3,4];

function getAtributo(slot, attr){
  var valor = slot.atributos ? slot.atributos[attr] : undefined;
  var base = (valor === undefined || valor === null) ? 10 : valor;
  if(slot.debuff && slot.debuff.atributo === attr) base = Math.max(1, base + slot.debuff.valor);
  return base;
}

function modAtributo(slot, attr, divisor){
  return Math.floor(getAtributo(slot, attr) / divisor);
}

function bonusVassoura(slot, tipoAcao){
  
  
  if(!slot.vassoura) return 0;
  return slot.vassoura.bonus || 0;
}

function bonusMaestriaBase(slot){
  if(!slot.maestria) return 0;
  var pct = slot.maestria.quadribol || 0;
  var tier = 0;
  MAESTRIA_TIERS.forEach(function(t, i){ if(pct >= t) tier = i; });
  return MAESTRIA_BONUS[tier];
}

function bonusMaestriaEspecializada(slot, especialidade){
  if(!slot.maestria) return 0;
  return slot.maestria[especialidade] || 0;
}

function bonusPostura(match, time, pos){
  var posturaId = match.times[time].postura;
  if(!posturaId) return 0;
  var config = QUAD_POSTURAS[posturaId];
  if(!config) return 0;

  var chave = (pos === 'artilheiro1' || pos === 'artilheiro2') ? 'artilheiros' : pos;
  var bonus = 0;
  if(config.todos) bonus += config.todos;
  if(config[chave] !== undefined) bonus += config[chave];
  return bonus;
}

function bonusBoost(acaoObj, bonusBase){
  if(!acaoObj || !acaoObj.boost) return 0;
  return bonusBase * (QUAD_BOOST_MULTIPLICADOR - 1);
}

function tierDe(pct){
  var tier = 0;
  MAESTRIA_TIERS.forEach(function(t, i){ if(pct >= t) tier = i; });
  return MAESTRIA_BONUS[tier];
}

var EVENTO_ATRIBUTO_VASSOURA = {
  chuva: 'estabilidade',
  tempestade: 'resistencia',
  ventania: 'manobrabilidade',
  passaros: 'velocidade'
};

function bonusEvento(evento, pos, slot){
  if(!evento || !pos) return 0;
  var chave = (pos === 'artilheiro1' || pos === 'artilheiro2') ? 'artilheiro' : pos;
  if(evento.afeta.indexOf(chave) === -1) return 0;

  var penalidade = evento.penalidade;

  var atributoChave = EVENTO_ATRIBUTO_VASSOURA[evento.id];
  var pctVassoura = (slot && slot.vassoura && slot.vassoura.atributos && atributoChave) ? (slot.vassoura.atributos[atributoChave] || 0) : 0;
  var pctVoo = (slot && slot.maestria && slot.maestria.voo) || 0;

  var reducao = tierDe(pctVassoura) + tierDe(pctVoo);
  penalidade = Math.max(0, penalidade - reducao);

  return -penalidade;
}

var QUAD_TETO_BONUS_FIXO = 25;

function rolar(slot, atributoPrincipal, atributoSecundario, opcoes){
  opcoes = opcoes || {};
  var dado = 1 + Math.floor(Math.random() * 20);

  var modPrincipal = modAtributo(slot, atributoPrincipal, 2);
  var modSecundario = atributoSecundario ? modAtributo(slot, atributoSecundario, 3) : 0;
  var vassoura = bonusVassoura(slot, opcoes.tipoVassoura);
  var maestBase = bonusMaestriaBase(slot);
  var maestEsp = opcoes.especialidade ? bonusMaestriaEspecializada(slot, opcoes.especialidade) : 0;
  var postura = opcoes.match ? bonusPostura(opcoes.match, opcoes.time, opcoes.pos) : 0;
  var evento = bonusEvento(opcoes.evento, opcoes.pos, slot);
  var situacional = opcoes.situacional || 0;

  var bonusBaseTotal = modPrincipal + modSecundario + vassoura + maestBase + maestEsp + postura + evento + situacional;
  bonusBaseTotal = Math.min(QUAD_TETO_BONUS_FIXO, bonusBaseTotal);

  var boost = bonusBoost(opcoes.acaoObj, bonusBaseTotal);

  var total = dado + bonusBaseTotal + boost;
  if(dado === 1) total -= 10;

  return { total: total, critico20: dado === 20 };
}

function vencedor(a, b){
  if(a.critico20 && !b.critico20) return true;
  if(b.critico20 && !a.critico20) return false;
  return a.total > b.total;
}

function vencedorOuIgual(a, b){
  if(a.critico20 && !b.critico20) return true;
  if(b.critico20 && !a.critico20) return false;
  return a.total >= b.total;
}



function rolarPomo(slot, opcoes){
  var extra = modAtributo(slot, 'sabedoria', 3) + modAtributo(slot, 'carisma', 3) + (opcoes.rastreio || 0);
  var opcoesFinal = Object.assign({}, opcoes, {
    situacional: (opcoes.situacional || 0) + extra,
    tipoVassoura: 'manobrabilidade',
    especialidade: 'pomo'
  });
  return rolar(slot, 'agilidade', 'determinacao', opcoesFinal);
}

function resolverApanhadorEPomo(match, acoes, faseNum, combosRef, evento, lideranca){
  var logArr = [];
  var novoRastreio = {};
  var derrubadosApanhador = {};
  var pomoBonusNovo = null;
  var distracoes = {};
  var promessasHp = [];
  var pontosMvp = {};

  function sl(t, pos){ return match.times[t].slots[pos] || {}; }
  function advT(t){ return t === 'A' ? 'B' : 'A'; }
  function log(txt){ logArr.push({ text: txt }); }
  function somarMvp(sk, valor){ pontosMvp[sk] = (pontosMvp[sk] || 0) + valor; }
  function rastreioAtual(t){
    var slot = sl(t, 'apanhador');
    return novoRastreio[t + '_apanhador'] !== undefined ? novoRastreio[t + '_apanhador'] : (slot.rastreamento || 0);
  }

  ['A','B'].forEach(function(t){
    var ac = acoes[t + '_apanhador'], sl2 = sl(t, 'apanhador');
    if(ac && ac.acao === 'distracao'){
      distracoes[advT(t)] = true;
      somarMvp(t + '_apanhador', QUAD_MVP_APANHADOR_DISTRACAO);
      log(sl2.nome + ' fez uma Distração. ' + sl(advT(t), 'apanhador').nome + ' perdeu a fase, sem rastrear.');
    }
  });

  ['A','B'].forEach(function(t){
    var ac = acoes[t + '_apanhador'], sl2 = sl(t, 'apanhador');
    if(!ac) return;

    if(ac.acao === 'rastrear' && !distracoes[t]){
      var extraCombo = (combosRef && combosRef.rastreioExtra[t + '_apanhador']) || 0;
      novoRastreio[t + '_apanhador'] = rastreioAtual(t) + 1 + extraCombo;
      log(sl2.nome + ' rastreou o Pomo. Bônus acumulado: +' + novoRastreio[t + '_apanhador'] + '.');
    }else if(ac.acao === 'sabotar'){
      var bonusMotivarSab = (lideranca && lideranca[t] && lideranca[t].tipo === 'motivar' && lideranca[t].alvo === 'apanhador') ? 3 : 0;
      var advAph = sl(advT(t), 'apanhador');
      var rAtk = rolar(sl2, 'agilidade', 'determinacao', { match:match, time:t, pos:'apanhador', tipoVassoura:'manobrabilidade', especialidade:'pomo', acaoObj:ac, evento:evento, situacional:bonusMotivarSab });
      var rDef = rolar(advAph, 'agilidade', 'determinacao', { match:match, time:advT(t), pos:'apanhador', tipoVassoura:'manobrabilidade', especialidade:'pomo', evento:evento });
      if(vencedor(rAtk, rDef)){
        novoRastreio[advT(t) + '_apanhador'] = 0;
        somarMvp(t + '_apanhador', QUAD_MVP_APANHADOR_SABOTAR);
        log(sl2.nome + ' sabotou ' + advAph.nome + '. Rastreamento zerado.');
      }else{
        log(sl2.nome + ' tentou sabotar, mas falhou.');
      }
    }else if(ac.acao === 'carregar'){
      var advAph2 = sl(advT(t), 'apanhador');
      var rAtk2 = rolar(sl2, 'determinacao', 'agilidade', { match:match, time:t, pos:'apanhador', tipoVassoura:'velocidade', especialidade:'pomo', acaoObj:ac, evento:evento });
      var rDef2 = rolar(advAph2, 'agilidade', 'sabedoria', { match:match, time:advT(t), pos:'apanhador', tipoVassoura:'manobrabilidade', especialidade:'pomo', evento:evento });
      if(vencedor(rAtk2, rDef2)){
        novoRastreio[advT(t) + '_apanhador'] = 0;
        derrubadosApanhador[advT(t) + '_apanhador'] = true;
        somarMvp(t + '_apanhador', QUAD_MVP_APANHADOR_CARREGAR);
        log(sl2.nome + ' derrubou ' + advAph2.nome + '! Rastreamento zerado, ele perde o próximo par. -' + QUAD_HP_DANO + ' HP.');
        if(advAph2.uid && advAph2.uid !== 'npc') promessasHp.push(deduzirHp(advAph2.uid, QUAD_HP_DANO));
      }else{
        log(sl2.nome + ' tentou derrubar ' + advAph2.nome + ', mas foi esquivado.');
      }
    }
  });

  if(!match.pomo_capturado){
    ['A','B'].forEach(function(t){
      if(pomoBonusNovo) return;
      var ac = acoes[t + '_apanhador'], sl2 = sl(t, 'apanhador');
      if(!ac || ac.acao !== 'mergulho_pomo') return;
      if(derrubadosApanhador[t + '_apanhador']){
        log(sl2.nome + ' estava caído e não conseguiu mergulhar pelo Pomo.');
        return;
      }

      var pomoMin = (match.pomo_fase || QUAD_POMO_MIN) - 2;
      if(faseNum < pomoMin){
        log(sl2.nome + ' mergulhou pelo Pomo, mas ainda é cedo demais.');
        return;
      }

      var advAph = sl(advT(t), 'apanhador');
      var rMeu = rolarPomo(sl2, { match:match, time:t, pos:'apanhador', acaoObj:ac, rastreio: rastreioAtual(t), evento:evento });
      var rAdv = rolarPomo(advAph, { match:match, time:advT(t), pos:'apanhador', rastreio: rastreioAtual(advT(t)), evento:evento });

      if(vencedor(rMeu, rAdv)){
        pomoBonusNovo = { time:t };
        log(sl2.nome + ' mergulhou e capturou o Pomo antecipado! ' + match.times[t].nome + ' ganha a janela de gol em dobro.');
      }else{
        novoRastreio[t + '_apanhador'] = Math.max(0, rastreioAtual(t) - 2);
        log(sl2.nome + ' mergulhou pelo Pomo mas errou. -2 de rastreamento.');
      }
    });
  }

if(!match.pomo_capturado && !pomoBonusNovo && faseNum >= (match.pomo_fase || QUAD_POMO_MIN)){
    var aphACaido = !!derrubadosApanhador['A_apanhador'];
    var aphBCaido = !!derrubadosApanhador['B_apanhador'];

    if(aphACaido && !aphBCaido){
      pomoBonusNovo = { time:'B' };
      log('O POMO DE OURO APARECEU! ' + sl('A','apanhador').nome + ' estava caído e não pôde disputar. ' +
        sl('B','apanhador').nome + ' capturou o Pomo sem oposição! ' + match.times.B.nome + ' ganha a janela de gol em dobro.');
    }else if(aphBCaido && !aphACaido){
      pomoBonusNovo = { time:'A' };
      log('O POMO DE OURO APARECEU! ' + sl('B','apanhador').nome + ' estava caído e não pôde disputar. ' +
        sl('A','apanhador').nome + ' capturou o Pomo sem oposição! ' + match.times.A.nome + ' ganha a janela de gol em dobro.');
    }else{
      var aphA = sl('A', 'apanhador'), aphB = sl('B', 'apanhador');
      var rA = rolarPomo(aphA, { match:match, time:'A', pos:'apanhador', rastreio: rastreioAtual('A'), evento:evento });
      var rB = rolarPomo(aphB, { match:match, time:'B', pos:'apanhador', rastreio: rastreioAtual('B'), evento:evento });

      log('O POMO DE OURO APARECEU! ' + aphA.nome + ' e ' + aphB.nome + ' disputam. Ambos tomam -' + QUAD_HP_DANO + ' HP.');
      if(aphA.uid && aphA.uid !== 'npc') promessasHp.push(deduzirHp(aphA.uid, QUAD_HP_DANO));
      if(aphB.uid && aphB.uid !== 'npc') promessasHp.push(deduzirHp(aphB.uid, QUAD_HP_DANO));

      if(vencedor(rA, rB)){
        pomoBonusNovo = { time:'A' };
        log(aphA.nome + ' capturou o Pomo de Ouro! ' + match.times.A.nome + ' ganha a janela de gol em dobro.');
      }else if(vencedor(rB, rA)){
        pomoBonusNovo = { time:'B' };
        log(aphB.nome + ' capturou o Pomo de Ouro! ' + match.times.B.nome + ' ganha a janela de gol em dobro.');
      }else{
 
        var rastA = rastreioAtual('A'), rastB = rastreioAtual('B');
        if(rastA > rastB){
          pomoBonusNovo = { time:'A' };
          log('Empate na disputa! ' + aphA.nome + ' vence no desempate por ter mais rastreio (' + rastA + ' vs ' + rastB + ').');
        }else if(rastB > rastA){
          pomoBonusNovo = { time:'B' };
          log('Empate na disputa! ' + aphB.nome + ' vence no desempate por ter mais rastreio (' + rastB + ' vs ' + rastA + ').');
        }else{
          pomoBonusNovo = { time: Math.random() < 0.5 ? 'A' : 'B' };
          log('Empate total na disputa (mesmo rastreio)! ' + match.times[pomoBonusNovo.time].nome + ' venceu no sorteio.');
        }
      }
    }
  }


  return Promise.all(promessasHp).then(function(){
    return {
      logArr: logArr,
      novoRastreio: novoRastreio,
      derrubadosApanhador: derrubadosApanhador,
      pomoCapturadoNestaFase: !!pomoBonusNovo,
      pomoBonusNovo: pomoBonusNovo,
      pontosMvp: pontosMvp
    };
  });
}



function resolverFase(match){
  var fase = match.fase_atual;
  var faseObj = (match.fases && match.fases[fase]) || {};
  if(faseObj.status === 'resolvendo' || faseObj.status === 'resolvida') return;

  fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase, { status:'resolvendo' }).then(function(){
    return fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/status');
  }).then(function(status){
    if(status !== 'resolvendo') return;

    var acoes = faseObj.acoes || {};
    var bonusAtivo = (match.pomo_bonus && fase <= match.pomo_bonus.ate_fase) ? match.pomo_bonus : null;
    var combos = detectarCombos(match, acoes);
    var evento = sortearEvento();
    var lideranca = { A: faseObj.lideranca_A || null, B: faseObj.lideranca_B || null };

    var savesEvento = evento
      ? fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/evento', evento)
      : Promise.resolve();

    savesEvento.then(function(){
      resolverArtGolBat(match, acoes, fase, bonusAtivo, combos, evento, lideranca).then(function(r1){
        resolverApanhadorEPomo(match, acoes, fase, combos, evento, lideranca).then(function(r2){
          fecharFase(match, fase, r1, r2, evento);
        });
      });
    });
  });
}

function fecharFase(match, faseNum, r1, r2, evento){
  var logArr = r1.logArr.concat(r2.logArr);
  if(evento){
    logArr.unshift({ text: 'Evento: ' + evento.nome + '.', evento:true, nome:evento.nome });
  }
  var placarA = r1.placarA;
  var placarB = r1.placarB;
  var saves = [];

  saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + faseNum, {
    status:'resolvida',
    resultado: { log: logArr, placar_A: placarA, placar_B: placarB }
  }));
  saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/A', { placar: placarA }));
  saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/B', { placar: placarB }));

  Object.keys(r1.novosDebuffs).forEach(function(key){
    var parts = key.split('_'); var t = parts[0], pos = parts.slice(1).join('_');
    saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + t + '/slots/' + pos, { debuff: r1.novosDebuffs[key] }));
  });

  ['A','B'].forEach(function(t){
    POSICOES.forEach(function(pos){
      var slot = match.times[t].slots[pos];
      var key = t + '_' + pos;
      if(slot && slot.debuff && !r1.novosDebuffs.hasOwnProperty(key)){
        var restante = slot.debuff.fases - 1;
        saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + t + '/slots/' + pos, {
          debuff: restante > 0 ? { atributo:slot.debuff.atributo, valor:slot.debuff.valor, fases:restante } : null
        }));
      }
    });
  });

  Object.keys(r2.novoRastreio).forEach(function(key){
    var parts = key.split('_'); var t = parts[0], pos = parts.slice(1).join('_');
    saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + t + '/slots/' + pos, { rastreamento: r2.novoRastreio[key] }));
  });

  if(r2.pomoBonusNovo){
    saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid, {
      pomo_capturado: true,
      pomo_bonus: { time: r2.pomoBonusNovo.time, ate_fase: faseNum + QUAD_POMO_BONUS_FASES }
    }));
  }

  var pontuadoresAcumulados = Object.assign({}, match.pontuadores || {});
  Object.keys(r1.pontosMvp).forEach(function(sk){
    pontuadoresAcumulados[sk] = (pontuadoresAcumulados[sk] || 0) + r1.pontosMvp[sk];
  });
  Object.keys(r2.pontosMvp).forEach(function(sk){
    pontuadoresAcumulados[sk] = (pontuadoresAcumulados[sk] || 0) + r2.pontosMvp[sk];
  });
  saves.push(fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/pontuadores', pontuadoresAcumulados));

  var nextFase = faseNum + 1;
  var isEncerrada = nextFase > QUAD_FASES_TOTAL;

  if(isEncerrada){
var vencedorFinal = placarA > placarB ? 'A' : (placarB > placarA ? 'B' : null);
processarApostas(vencedorFinal);



    var mvpSk = null, mvpPontos = -1;
    Object.keys(pontuadoresAcumulados).forEach(function(sk){
      if(pontuadoresAcumulados[sk] > mvpPontos){ mvpPontos = pontuadoresAcumulados[sk]; mvpSk = sk; }
    });
    var mvpNome = null;
    if(mvpSk){
      var partsMvp = mvpSk.split('_');
      var slotMvp = match.times[partsMvp[0]].slots[partsMvp.slice(1).join('_')];
      mvpNome = slotMvp ? slotMvp.nome : null;
    }

    saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid, { status:'encerrada', vencedor: vencedorFinal }));
    saves.push(fbPut(QUAD_FB_PARTIDAS, '/historico/' + pid, {
      data: Date.now(),
      nomeA: match.times.A.nome, nomeB: match.times.B.nome,
      placarA: placarA, placarB: placarB,
      vencedor: vencedorFinal,
      nomeVencedor: vencedorFinal ? match.times[vencedorFinal].nome : 'Empate',
      nomeMvp: mvpNome, pontosMvp: mvpPontos > 0 ? mvpPontos : 0
    }));
    saves.push(fbDel(QUAD_FB_PARTIDAS, '/partida_ativa'));
  }else{
    saves.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid, { fase_atual: nextFase }));
    saves.push(fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + nextFase, { acoes:{} }));
  }

  Promise.all(saves);
}




var MAIN_ATTR = {
  artilheiro1:'destreza', artilheiro2:'destreza',
  batedor:'forca', goleiro:'forca', apanhador:'agilidade'
};

function deduzirHp(uid, valor){
  return fbGet(QUAD_FB_PERSONAGENS, '/status-perfil/' + uid).then(function(s){
    if(!s) return;
    return fbPatch(QUAD_FB_PERSONAGENS, '/status-perfil/' + uid, { hp_cur: Math.max(0, (s.hp_cur || 0) - valor) });
  });
}

function resolverArtGolBat(match, acoes, fase, bonusAtivo, combos, evento, lideranca){
  var logArr = [];
  var placarA = match.times.A.placar || 0;
  var placarB = match.times.B.placar || 0;
  var novosDebuffs = {};
  var promessasHp = [];
  var pontosMvp = {};

  var protegidos = {}, interceptados = {}, blitzResult = {}, mergulhoBonus = {},
      expostos = {}, fintaPasseDebuff = {}, antecipeBonus = {}, derrubados = {},
      fintouB = {}, passeBonus = {};

  function sl(t, pos){ return match.times[t].slots[pos] || {}; }
  function advT(t){ return t === 'A' ? 'B' : 'A'; }
  function log(txt){ logArr.push({ text: txt }); }
  function somarMvp(sk, valor){ pontosMvp[sk] = (pontosMvp[sk] || 0) + valor; }
  function opcoesRoll(t, pos, tipoVassoura, especialidade, acaoObj, situacional){
    var bonusMotivar = (lideranca && lideranca[t] && lideranca[t].tipo === 'motivar' && lideranca[t].alvo === pos) ? 3 : 0;
    return { match:match, time:t, pos:pos, tipoVassoura:tipoVassoura, especialidade:especialidade, acaoObj:acaoObj, situacional:(situacional||0) + bonusMotivar, evento:evento };
  }
  function pontosGol(t){ return (bonusAtivo && bonusAtivo.time === t) ? 20 : 10; }

  ['A','B'].forEach(function(t){
    ['artilheiro1','artilheiro2'].forEach(function(pos){
      var ac = acoes[t + '_' + pos], ast = sl(t, pos);
      if(!ac || ac.acao !== 'finta_passe') return;
      var gs = sl(advT(t), 'goleiro');
      var rAtk = rolar(ast, 'inteligencia', 'destreza', opcoesRoll(t, pos, 'bonus', 'artilheiro', ac));
      var rDef = rolar(gs, 'inteligencia', 'forca', opcoesRoll(advT(t), 'goleiro', 'bonus', 'defesa'));
      if(vencedor(rAtk, rDef)){
        fintaPasseDebuff[advT(t)] = 3;
        somarMvp(t + '_' + pos, QUAD_MVP_CONTROLE);
        log(ast.nome + ' enganou o Goleiro com uma Finta de Passe. -3 na defesa dele.');
      }else{
        log(ast.nome + ' tentou uma Finta de Passe, mas foi lido.');
      }
    });
  });

  ['A','B'].forEach(function(t){
    if(combos.ignorarAcao[t + '_goleiro']) return;
    var ac = acoes[t + '_goleiro'], gs = sl(t, 'goleiro');
    if(!ac || ac.acao !== 'antecipar') return;
    var advArt = sl(advT(t), 'artilheiro1');
    var rDef = rolar(gs, 'inteligencia', 'agilidade', opcoesRoll(t, 'goleiro', 'estabilidade', 'defesa', ac));
    var rAtk = rolar(advArt, 'inteligencia', 'destreza', opcoesRoll(advT(t), 'artilheiro1', 'bonus', 'artilheiro'));
    if(vencedor(rDef, rAtk)){
      antecipeBonus[t] = 5;
      somarMvp(t + '_goleiro', QUAD_MVP_CONTROLE);
      log(gs.nome + ' antecipou o jogo. +5 na defesa desta fase.');
    }else{
      log(gs.nome + ' tentou antecipar, mas não conseguiu.');
    }
  });

  ['A','B'].forEach(function(t){
    ['artilheiro1','artilheiro2'].forEach(function(pos){
      var ac = acoes[t + '_' + pos], ast = sl(t, pos);
      if(!ac || ac.acao !== 'mergulho') return;
      var gs = sl(advT(t), 'goleiro');
      var situ = combos.protegidoComboBonus[t + '_' + pos] || 0;
      var rAtk = rolar(ast, 'agilidade', 'destreza', opcoesRoll(t, pos, 'manobrabilidade', 'artilheiro', ac, situ));
      var rDef = rolar(gs, 'forca', 'agilidade', opcoesRoll(advT(t), 'goleiro', 'estabilidade', 'defesa'));
      if(vencedor(rAtk, rDef)){
        mergulhoBonus[t + '_' + pos] = 4;
        log(ast.nome + ' fez um Mergulho impressionante. +4 no arremesso.');
      }else{
        expostos[t + '_' + pos] = true;
        log(ast.nome + ' tentou mergulhar mas foi bloqueado. Ficou exposto.');
      }
    });
  });

  ['A','B'].forEach(function(t){
    ['artilheiro1','artilheiro2'].forEach(function(pos){
      var ac = acoes[t + '_' + pos], ast = sl(t, pos);
      if(!ac || ac.acao !== 'fintar') return;
      var bs = sl(advT(t), 'batedor');
      var rAtk = rolar(ast, 'agilidade', 'inteligencia', opcoesRoll(t, pos, 'manobrabilidade', 'artilheiro', ac));
      var rDef = rolar(bs, 'forca', 'determinacao', opcoesRoll(advT(t), 'batedor', 'manobrabilidade', 'manobras'));
      if(vencedor(rAtk, rDef)){
        fintouB[t + '_' + pos] = true;
        somarMvp(t + '_' + pos, QUAD_MVP_CONTROLE);
        log(ast.nome + ' executou uma finta perfeita. Imune ao Balaço esta fase.');
      }else{
        log(ast.nome + ' tentou fintar, mas o Batedor previu.');
      }
    });
  });

  ['A','B'].forEach(function(t){
    var ac = acoes[t + '_goleiro'], gs = sl(t, 'goleiro');
    if(!ac || ac.acao !== 'derrubar_artilheiro' || !ac.alvo) return;
    var als = sl(advT(t), ac.alvo);
    var rAtk = rolar(gs, 'forca', 'agilidade', opcoesRoll(t, 'goleiro', 'velocidade', 'defesa', ac));
    var rDef = rolar(als, 'agilidade', 'destreza', opcoesRoll(advT(t), ac.alvo, 'bonus', 'artilheiro'));
    if(vencedor(rAtk, rDef)){
      derrubados[advT(t) + '_' + ac.alvo] = true;
      somarMvp(t + '_goleiro', QUAD_MVP_DEBUFF);
      log(gs.nome + ' derrubou ' + als.nome + ' no ar! Não vai arremessar esta fase. -' + QUAD_HP_DANO + ' HP.');
      if(als.uid && als.uid !== 'npc') promessasHp.push(deduzirHp(als.uid, QUAD_HP_DANO));
    }else{
      log(gs.nome + ' tentou derrubar ' + als.nome + ', mas errou.');
    }
  });

  ['A','B'].forEach(function(t){
    if(combos.ignorarAcao[t + '_batedor']) return;
    var ac = acoes[t + '_batedor'], bs = sl(t, 'batedor');
    if(!ac || ac.acao !== 'interceptar') return;
    var as1 = sl(advT(t), 'artilheiro1');
    var rAtk = rolar(bs, 'forca', 'determinacao', opcoesRoll(t, 'batedor', 'bonus', 'manobras', ac));
    var rDef = rolar(as1, 'destreza', 'agilidade', opcoesRoll(advT(t), 'artilheiro1', 'bonus', 'artilheiro'));
    if(vencedor(rAtk, rDef)){
      interceptados[advT(t)] = true;
      somarMvp(t + '_batedor', QUAD_MVP_CONTROLE);
      log(bs.nome + ' interceptou o passe adversário! Artilheiros adversários perdem o bônus.');
    }else{
      log(bs.nome + ' tentou interceptar, mas falhou.');
    }
  });

  ['A','B'].forEach(function(t){
    ['artilheiro1','artilheiro2'].forEach(function(pos){
      var ac = acoes[t + '_' + pos], ast = sl(t, pos);
      if(ac && ac.acao === 'passar' && !interceptados[t]){
        var parc = pos === 'artilheiro1' ? t + '_artilheiro2' : t + '_artilheiro1';
        passeBonus[parc] = (passeBonus[parc] || 0) + 2;
        log(ast.nome + ' passou a Goles para o parceiro. +2 no arremesso.');
      }
    });
    var acGol = acoes[t + '_goleiro'], gs = sl(t, 'goleiro');
    if(acGol && acGol.acao === 'lancar_goles' && acGol.alvo){
      var ak = t + '_' + acGol.alvo;
      passeBonus[ak] = (passeBonus[ak] || 0) + 2;
      log(gs.nome + ' lançou a Goles para ' + sl(t, acGol.alvo).nome + '. +2 no arremesso.');
    }
    var acAph = acoes[t + '_apanhador'], aph = sl(t, 'apanhador');
    if(acAph && acAph.acao === 'auxiliar' && acAph.alvo){
      var ak2 = t + '_' + acAph.alvo;
      passeBonus[ak2] = (passeBonus[ak2] || 0) + 2;
      log(aph.nome + ' auxiliou ' + sl(t, acAph.alvo).nome + '. +2 no arremesso.');
    }
  });

  ['A','B'].forEach(function(t){
    if(combos.ignorarAcao[t + '_goleiro']) return;
    var ac = acoes[t + '_goleiro'], gs = sl(t, 'goleiro');
    if(!ac || ac.acao !== 'blitz') return;
    var as1 = sl(advT(t), 'artilheiro1');
    var rDef = rolar(gs, 'forca', 'agilidade', opcoesRoll(t, 'goleiro', 'velocidade', 'defesa', ac));
    var rAtk = rolar(as1, 'destreza', 'agilidade', opcoesRoll(advT(t), 'artilheiro1', 'bonus', 'artilheiro'));
    if(vencedorOuIgual(rDef, rAtk)){
      blitzResult[t] = 'ok';
      somarMvp(t + '_goleiro', QUAD_MVP_BLITZ);
      log(gs.nome + ' executou o Blitz com sucesso! Interceptou a Goles.');
    }else{
      blitzResult[t] = 'fail';
      log(gs.nome + ' tentou o Blitz e falhou! Os aros ficaram desprotegidos.');
    }
  });

  ['A','B'].forEach(function(t){
    var ac = acoes[t + '_batedor'];
    if(ac && ac.acao === 'proteger' && ac.alvo){
      protegidos[t + '_' + ac.alvo] = true;
      log(sl(t, 'batedor').nome + ' protegeu ' + sl(t, ac.alvo).nome + '.');
    }
  });

  ['A','B'].forEach(function(t){
    var ac = acoes[t + '_batedor'], bs = sl(t, 'batedor');
    if(!ac || ac.acao !== 'lancar_balaco' || !ac.alvo) return;
    var alvT = advT(t), als = sl(alvT, ac.alvo), alvKey = alvT + '_' + ac.alvo;

    if(fintouB[alvKey]){ log(bs.nome + ' lançou o Balaço em ' + als.nome + ', mas ele esquivou.'); return; }
    if(protegidos[alvKey]){ log(bs.nome + ' lançou o Balaço em ' + als.nome + ', mas estava protegido.'); return; }

    var rAtk = rolar(bs, 'forca', 'determinacao', opcoesRoll(t, 'batedor', 'velocidade', 'manobras', ac));
    var rDef = rolar(als, 'agilidade', 'resistencia', opcoesRoll(alvT, ac.alvo, 'bonus', null));
    if(vencedor(rAtk, rDef)){
      novosDebuffs[alvKey] = { atributo: MAIN_ATTR[ac.alvo] || 'agilidade', valor:-2, fases:1 };
      somarMvp(t + '_batedor', QUAD_MVP_DEBUFF);
      log(bs.nome + ' acertou o Balaço em ' + als.nome + '! -2 em ' + MAIN_ATTR[ac.alvo] + ' e -' + QUAD_HP_DANO + ' HP.');
      if(als.uid && als.uid !== 'npc') promessasHp.push(deduzirHp(als.uid, QUAD_HP_DANO));
    }else{
      log(bs.nome + ' lançou o Balaço em ' + als.nome + ', mas errou.');
    }
  });

  ['A','B'].forEach(function(t){
    var ac = acoes[t + '_batedor'], bs = sl(t, 'batedor');
    if(!ac || ac.acao !== 'derrubar' || !ac.alvo) return;
    var als = sl(advT(t), ac.alvo);
    var rAtk = rolar(bs, 'forca', 'determinacao', opcoesRoll(t, 'batedor', 'velocidade', 'manobras', ac));
    var rDef = rolar(als, 'agilidade', 'resistencia', opcoesRoll(advT(t), ac.alvo, 'bonus', null));
    if(vencedor(rAtk, rDef)){
      derrubados[advT(t) + '_' + ac.alvo] = true;
      somarMvp(t + '_batedor', QUAD_MVP_DEBUFF);
      log(bs.nome + ' derrubou ' + als.nome + ' em colisão! Não age no próximo par. -' + QUAD_HP_DANO + ' HP.');
      if(als.uid && als.uid !== 'npc') promessasHp.push(deduzirHp(als.uid, QUAD_HP_DANO));
    }else{
      log(bs.nome + ' tentou derrubar ' + als.nome + ', mas foi evitado.');
    }
  });

  ['A','B'].forEach(function(t){
    var ac = acoes[t + '_batedor'], bs = sl(t, 'batedor');
    if(!ac || ac.acao !== 'pressao_aerea' || !ac.alvo) return;
    var als = sl(advT(t), ac.alvo);
    var rAtk = rolar(bs, 'forca', 'determinacao', opcoesRoll(t, 'batedor', 'velocidade', 'manobras', ac));
    var rDef = rolar(als, 'determinacao', 'inteligencia', opcoesRoll(advT(t), ac.alvo, 'bonus', null));
    if(vencedor(rAtk, rDef)){
      var key = advT(t) + '_' + ac.alvo;
      if(!novosDebuffs[key]) novosDebuffs[key] = { atributo: MAIN_ATTR[ac.alvo] || 'agilidade', valor:-2, fases:1 };
      somarMvp(t + '_batedor', QUAD_MVP_DEBUFF);
      log(bs.nome + ' intimidou ' + als.nome + ' no ar. -2 no próximo roll dele.');
    }else{
      log(bs.nome + ' tentou intimidar ' + als.nome + ', sem efeito.');
    }
  });

  ['A','B'].forEach(function(t){
    ['artilheiro1','artilheiro2'].forEach(function(pos){
      var ac = acoes[t + '_' + pos], ast = sl(t, pos);
      if(!ac || ac.acao !== 'arremessar') return;

      if(derrubados[t + '_' + pos]){
        log(ast.nome + ' estava caído e não conseguiu arremessar.');
        return;
      }

      var golvT = advT(t), gs = sl(golvT, 'goleiro');

      if(blitzResult[golvT] === 'fail'){
        var ptsBlitz = pontosGol(t);
        if(t === 'A') placarA += ptsBlitz; else placarB += ptsBlitz;
        somarMvp(t + '_' + pos, ptsBlitz);
        log(ast.nome + ' arremessou com os aros desprotegidos. GOL! +' + ptsBlitz + ' para ' + match.times[t].nome + '.');
        return;
      }

      var situAtk = (passeBonus[t + '_' + pos] || 0) + (mergulhoBonus[t + '_' + pos] || 0) + (combos.protegidoComboBonus[t + '_' + pos] || 0);
      var situDef = (acoes[golvT + '_goleiro'] && acoes[golvT + '_goleiro'].acao === 'defender' ? 2 : 0)
        + (antecipeBonus[golvT] || 0)
        - (fintaPasseDebuff[golvT] || 0)
        + (expostos[t + '_' + pos] ? 2 : 0);

      var rAtk = rolar(ast, 'destreza', 'agilidade', opcoesRoll(t, pos, 'velocidade', 'artilheiro', ac, situAtk));
      var rDef = rolar(gs, 'forca', 'agilidade', opcoesRoll(golvT, 'goleiro', 'estabilidade', 'defesa', acoes[golvT + '_goleiro'], situDef));

      if(vencedor(rAtk, rDef)){
        var pts = pontosGol(t);
        if(t === 'A') placarA += pts; else placarB += pts;
        somarMvp(t + '_' + pos, pts);
        log(ast.nome + ' arremessou a Goles nos aros. GOOOOL! +' + pts + ' para ' + match.times[t].nome + '.');
      }else{
        log(ast.nome + ' arremessou, mas ' + gs.nome + ' defendeu.');
      }
    });
  });

  Object.keys(combos.antecipeBonusExtra).forEach(function(t){ antecipeBonus[t] = combos.antecipeBonusExtra[t]; });
  Object.keys(combos.interceptadosExtra).forEach(function(t){ interceptados[t] = true; });
  Object.keys(combos.blitzResultCombo).forEach(function(t){ blitzResult[t] = combos.blitzResultCombo[t]; });
  Object.keys(combos.debuffsPermanentes).forEach(function(key){
    novosDebuffs[key] = Object.assign({ fases:9999, permanente:true }, combos.debuffsPermanentes[key]);
  });
  Object.keys(combos.pontosMvp).forEach(function(sk){
    pontosMvp[sk] = (pontosMvp[sk] || 0) + combos.pontosMvp[sk];
  });

  return Promise.all(promessasHp).then(function(){
    return { logArr: combos.log.concat(logArr), placarA: placarA, placarB: placarB, novosDebuffs: novosDebuffs, pontosMvp: pontosMvp };
  });
}





var DEFAULT_ORDEM = ['artilheiro1','artilheiro2','batedor','goleiro','apanhador'];
var ordemRascunho = null;
var ordemTimeoutId = null;

function montarFila(ordemA, ordemB){
  var fila = [];
  for(var i = 0; i < 5; i++){
    fila.push({ time:'A', pos: ordemA[i] });
    fila.push({ time:'B', pos: ordemB[i] });
  }
  return fila;
}

function renderEscolhaOrdem(match){
  var fase = match.fase_atual;
  var faseObj = (match.fases && match.fases[fase]) || {};
  var meu = encontrarMeuSlot(match);
  var souCapitao = !!(meu && meu.slot.capitao);

  var elLista = document.getElementById('q3ordemlista');
  var elConfirmar = document.getElementById('q3ordemconfirmar');
  var elStatus = document.getElementById('q3ordemstatus');

  var jaConfirmei = meu && faseObj['ordem_' + meu.time];

  if(souCapitao && !jaConfirmei){
    if(!ordemRascunho) ordemRascunho = DEFAULT_ORDEM.slice();

    elLista.hidden = false;
    elConfirmar.hidden = false;

    elLista.innerHTML = ordemRascunho.map(function(pos, i){
      return '<div class="q3ordemitem">' +
        '<button type="button" class="q3ordembtn" data-dir="-1" data-idx="' + i + '">▲</button>' +
        '<span>' + POS_LABEL[pos] + '</span>' +
        '<button type="button" class="q3ordembtn" data-dir="1" data-idx="' + i + '">▼</button>' +
        '</div>';
    }).join('');

    document.querySelectorAll('.q3ordembtn').forEach(function(btn){
      btn.onclick = function(){
        var i = parseInt(btn.dataset.idx);
        var dir = parseInt(btn.dataset.dir);
        var j = i + dir;
        if(j < 0 || j >= ordemRascunho.length) return;
        var tmp = ordemRascunho[i];
        ordemRascunho[i] = ordemRascunho[j];
        ordemRascunho[j] = tmp;
        renderEscolhaOrdem(match);
      };
    });

    elConfirmar.onclick = function(){
      fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/ordem_' + meu.time, ordemRascunho).then(function(){
        ordemRascunho = null;
        verificarFila();
      });
    };
  }else{
    elLista.hidden = true;
    elConfirmar.hidden = true;
  }

  var okA = !!faseObj.ordem_A;
  var okB = !!faseObj.ordem_B;
  elStatus.textContent = match.times.A.nome + ': ' + (okA ? 'pronto' : 'aguardando') +
    ' · ' + match.times.B.nome + ': ' + (okB ? 'pronto' : 'aguardando');
}

function verificarFila(){
  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    if(!match) return;
    var fase = match.fase_atual;
    var faseObj = (match.fases && match.fases[fase]) || {};

    if(faseObj.fila) return;

    if(faseObj.ordem_A && faseObj.ordem_B){
      var fila = montarFila(faseObj.ordem_A, faseObj.ordem_B);
      fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/fila', fila).then(function(){
        fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid, {
          turno_idx: 0,
          turno_deadline: Date.now() + QUAD_TURNO_SECS * 1000
        });
      });
    }
  });
}

function iniciarTimeoutOrdem(fase){
  if(ordemTimeoutId) clearTimeout(ordemTimeoutId);
  ordemTimeoutId = setTimeout(function(){
    fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
      if(!match || match.fase_atual !== fase) return;
      var faseObj = (match.fases && match.fases[fase]) || {};
      if(faseObj.fila) return;

      var proms = [];
      if(!faseObj.ordem_A) proms.push(fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/ordem_A', DEFAULT_ORDEM));
      if(!faseObj.ordem_B) proms.push(fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/ordem_B', DEFAULT_ORDEM));
      Promise.all(proms).then(verificarFila);
    });
  }, QUAD_ORDEM_ESCOLHA_SEGUNDOS * 1000);
}



var countdownTimer = null;

function iniciarCountdown(deadline){
  if(countdownTimer) clearInterval(countdownTimer);

  function tick(){
    var restanteMs = Math.max(0, deadline - Date.now());
    var restanteSeg = Math.ceil(restanteMs / 1000);
    var pct = Math.max(0, (restanteMs / (QUAD_TURNO_SECS * 1000)) * 100);

    document.getElementById('q3cronobarra').style.width = pct + '%';
    document.getElementById('q3cronoseg').textContent = restanteSeg + 's';

    if(restanteMs <= 0){
      clearInterval(countdownTimer);
      expirarTurno();
    }
  }

  tick();
  countdownTimer = setInterval(tick, 1000);
}

function escolherAcaoNpc(pos){
  var lista = acoesDaPosicao(pos);
  var semAlvo = lista.filter(function(a){ return !a.alvos; });
  var pool = semAlvo.length ? semAlvo : lista;
  var acao = pool[Math.floor(Math.random() * pool.length)];
  return { acao: acao.id, alvo: null, boost:false, ts: Date.now(), automatica:true };
}

function expirarTurno(){
  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    if(!match || match.status !== 'em_andamento') return;

    var fase = match.fase_atual;
    var faseObj = (match.fases && match.fases[fase]) || {};
    var fila = faseObj.fila || [];
    var turnoIdx = match.turno_idx || 0;
    var atual = fila[turnoIdx];
    if(!atual) return;

    var sk = atual.time + '_' + atual.pos;
    var acoesFase = faseObj.acoes || {};
    if(acoesFase[sk]) return;

    var pend = faseObj.pendente_capitao;

    if(pend && pend.sk === sk){
      if(Date.now() >= pend.deadline){
        fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/acoes/' + sk, escolherAcaoNpc(atual.pos))
          .then(function(){
            return fbDel(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/pendente_capitao');
          }).then(avancarTurno);
      }
      return;
    }

    var temCapitao = POSICOES.some(function(p){
      var s = match.times[atual.time].slots[p];
      return s && s.capitao && s.uid && s.uid !== 'npc' && s.uid !== match.times[atual.time].slots[atual.pos].uid;
    });

    if(temCapitao){
      fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/pendente_capitao', {
        sk: sk,
        deadline: Date.now() + QUAD_CAPITAO_DECISAO_SEGUNDOS * 1000
      });
    }else{
      fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/acoes/' + sk, escolherAcaoNpc(atual.pos))
        .then(avancarTurno);
    }
  });
}


function detectarCombos(match, acoes){
  var combos = {
    ignorarAcao: {},
    antecipeBonusExtra: {},
    interceptadosExtra: {},
    blitzResultCombo: {},
    debuffsPermanentes: {},
    rastreioExtra: {},
    protegidoComboBonus: {},
    pontosMvp: {},
    log: [],
    nomesAtivos: []
  };

  function sl(t, pos){ return match.times[t].slots[pos] || {}; }
  function advT(t){ return t === 'A' ? 'B' : 'A'; }
  function somarMvp(sk, valor){ combos.pontosMvp[sk] = (combos.pontosMvp[sk] || 0) + valor; }

  ['A','B'].forEach(function(t){
    var acBat = acoes[t + '_batedor'];
    var acGol = acoes[t + '_goleiro'];
    var acAph = acoes[t + '_apanhador'];

    if(acBat && acBat.acao === 'proteger' && acBat.alvo){
      var alvoSk = t + '_' + acBat.alvo;
      var acAlvo = acoes[alvoSk];
      if(acAlvo && (acAlvo.acao === 'mergulho' || acAlvo.acao === 'arremessar')){
        combos.protegidoComboBonus[alvoSk] = (combos.protegidoComboBonus[alvoSk] || 0) + 3;
        combos.log.push({ text: 'Combo: Cobertura Perfeita. ' + sl(t, acBat.alvo).nome + ' age protegido, bonus extra.', combo:true, nome:'Cobertura Perfeita' });
        combos.nomesAtivos.push('Cobertura Perfeita');
        somarMvp(t + '_batedor', QUAD_MVP_COMBO);
        somarMvp(alvoSk, QUAD_MVP_COMBO);
      }
    }

    if(acAph && acAph.acao === 'rastrear' && acBat && acBat.acao === 'proteger' && acBat.alvo === 'apanhador'){
      combos.rastreioExtra[t + '_apanhador'] = (combos.rastreioExtra[t + '_apanhador'] || 0) + 1;
      combos.log.push({ text: 'Combo: Vigilancia. ' + sl(t, 'apanhador').nome + ' ganha rastreio extra.', combo:true, nome:'Vigilancia' });
      combos.nomesAtivos.push('Vigilancia');
      somarMvp(t + '_batedor', QUAD_MVP_COMBO);
      somarMvp(t + '_apanhador', QUAD_MVP_COMBO);
    }

    if(acGol && acGol.acao === 'antecipar' && acBat && acBat.acao === 'interceptar'){
      var advArt = sl(advT(t), 'artilheiro1');
      var rGol = rolar(sl(t, 'goleiro'), 'inteligencia', 'agilidade', { match:match, time:t, pos:'goleiro', tipoVassoura:'estabilidade', especialidade:'defesa', acaoObj:acGol });
      var rBat = rolar(sl(t, 'batedor'), 'forca', 'determinacao', { match:match, time:t, pos:'batedor', tipoVassoura:'bonus', especialidade:'manobras', acaoObj:acBat });
      var rCombo = { total:(rGol.total + rBat.total) / 2, critico20: rGol.critico20 || rBat.critico20 };
      var rDef = rolar(advArt, 'inteligencia', 'destreza', { match:match, time:advT(t), pos:'artilheiro1', tipoVassoura:'bonus', especialidade:'artilheiro' });

      combos.ignorarAcao[t + '_goleiro'] = true;
      combos.ignorarAcao[t + '_batedor'] = true;

      if(vencedor(rCombo, rDef)){
        combos.antecipeBonusExtra[t] = 7;
        combos.interceptadosExtra[advT(t)] = true;
        combos.log.push({ text: 'Combo: Muralha. ' + sl(t, 'goleiro').nome + ' e ' + sl(t, 'batedor').nome + ' formam uma defesa perfeita.', combo:true, nome:'Muralha' });
        combos.nomesAtivos.push('Muralha');
        somarMvp(t + '_goleiro', QUAD_MVP_COMBO);
        somarMvp(t + '_batedor', QUAD_MVP_COMBO);
      }else{
        combos.log.push({ text: sl(t, 'goleiro').nome + ' e ' + sl(t, 'batedor').nome + ' tentaram a Muralha, mas falharam.' });
      }
    }

    if(!combos.ignorarAcao[t + '_batedor'] && acGol && acGol.acao === 'blitz' && acBat && acBat.acao === 'interceptar'){
      var advArt2 = sl(advT(t), 'artilheiro1');
      var rGol2 = rolar(sl(t, 'goleiro'), 'forca', 'agilidade', { match:match, time:t, pos:'goleiro', tipoVassoura:'velocidade', especialidade:'defesa', acaoObj:acGol });
      var rBat2 = rolar(sl(t, 'batedor'), 'forca', 'determinacao', { match:match, time:t, pos:'batedor', tipoVassoura:'bonus', especialidade:'manobras', acaoObj:acBat });
      var rCombo2 = { total:(rGol2.total + rBat2.total) / 2, critico20: rGol2.critico20 || rBat2.critico20 };
      var rDef2 = rolar(advArt2, 'destreza', 'agilidade', { match:match, time:advT(t), pos:'artilheiro1', tipoVassoura:'bonus', especialidade:'artilheiro' });

      combos.ignorarAcao[t + '_goleiro'] = true;
      combos.ignorarAcao[t + '_batedor'] = true;

      if(vencedorOuIgual(rCombo2, rDef2)){
        combos.blitzResultCombo[t] = 'ok';
        combos.interceptadosExtra[advT(t)] = true;
        combos.debuffsPermanentes[advT(t) + '_artilheiro1'] = { atributo: MAIN_ATTR.artilheiro1, valor:-2 };
        combos.log.push({ text: 'Combo: Cerco. ' + sl(t, 'goleiro').nome + ' e ' + sl(t, 'batedor').nome + ' encurralam ' + advArt2.nome + '. Debuff permanente aplicado.', combo:true, nome:'Cerco' });
        combos.nomesAtivos.push('Cerco');
        somarMvp(t + '_goleiro', QUAD_MVP_COMBO);
        somarMvp(t + '_batedor', QUAD_MVP_COMBO);
      }else{
        combos.blitzResultCombo[t] = 'fail';
        combos.log.push({ text: sl(t, 'goleiro').nome + ' e ' + sl(t, 'batedor').nome + ' tentaram o Cerco, mas falharam.' });
      }
    }
  });

  return combos;
}



function sortearEvento(){
  if(Math.random() > QUAD_EVENTO_CHANCE) return null;
  return QUAD_EVENTOS_FASE[Math.floor(Math.random() * QUAD_EVENTOS_FASE.length)];
}


var capSelecionada = {};

function souCapitaoDoTime(match, time){
  return POSICOES.some(function(pos){
    var s = match.times[time].slots[pos];
    return s && s.uid === myUid && s.capitao;
  });
}

function gerarPainelCapitao(match, time){
  var fase = match.fase_atual;
  var faseObj = (match.fases && match.fases[fase]) || {};
  if(faseObj['lideranca_' + time]) return null;

  var box = document.createElement('div');
  box.className = 'qcard';
  box.id = 'q3cap_' + time;

  var html = '<div class="qlbl"><i class="fa fa-star"></i> ação de liderança</div>';
  html += '<div class="q3acoesgrid">';
  html += '<button type="button" class="q3capacaobtn" data-time="' + time + '" data-tipo="motivar">Motivar</button>';
  html += '<button type="button" class="q3capacaobtn" data-time="' + time + '" data-tipo="estrategia">Estratégia</button>';
  html += '</div>';
  html += '<div class="q3capalvo" id="q3capalvo_' + time + '" hidden></div>';
  html += '<button type="button" class="q3capconfirmar" data-time="' + time + '" disabled>confirmar liderança</button>';
  box.innerHTML = html;
  return box;
}

function renderAlvoCapitao(match, time, tipo){
  var fase = match.fase_atual;
  var faseObj = (match.fases && match.fases[fase]) || {};
  var acoesFase = faseObj.acoes || {};
  var wrap = document.getElementById('q3capalvo_' + time);
  var lista = [];

  POSICOES.forEach(function(pos){
    var slot = match.times[time].slots[pos];
    if(!slot) return;

    if(tipo === 'motivar'){
      var sk = time + '_' + pos;
      if(acoesFase[sk]) return;
      lista.push({ val:pos, label:escaparHtml(slot.nome) + ' (' + POS_LABEL[pos] + ')' });
    }else if(tipo === 'estrategia'){
      if(slot.debuff) lista.push({ val:pos, label:escaparHtml(slot.nome) + ' (' + POS_LABEL[pos] + ') — debuff ativo' });
    }
  });

  if(!lista.length){
    wrap.innerHTML = '<div class="qlbl">nenhum alvo disponível agora.</div>';
    wrap.hidden = false;
    return;
  }

  wrap.innerHTML = lista.map(function(item){
    return '<label class="q3alvoradio"><input type="radio" name="capalvo_' + time + '" value="' + item.val + '"> ' + item.label + '</label>';
  }).join('');
  wrap.hidden = false;

  document.querySelectorAll('input[name="capalvo_' + time + '"]').forEach(function(r){
    r.onchange = function(){
      capSelecionada[time].alvo = r.value;
      document.querySelector('.q3capconfirmar[data-time="' + time + '"]').disabled = false;
    };
  });
}

function bindCapitaoEventos(match){
  document.querySelectorAll('.q3capacaobtn').forEach(function(btn){
    btn.onclick = function(){
      var time = btn.dataset.time;
      var tipo = btn.dataset.tipo;

      document.querySelectorAll('.q3capacaobtn[data-time="' + time + '"]').forEach(function(b){ b.classList.remove('q3sel'); });
      btn.classList.add('q3sel');

      capSelecionada[time] = { tipo: tipo, alvo: null };
      document.querySelector('.q3capconfirmar[data-time="' + time + '"]').disabled = true;

      renderAlvoCapitao(match, time, tipo);
    };
  });

  document.querySelectorAll('.q3capconfirmar').forEach(function(btn){
    btn.onclick = function(){
      var time = btn.dataset.time;
      var sel = capSelecionada[time];
      if(!sel || !sel.tipo || !sel.alvo){ alert('Escolha o tipo e o alvo primeiro.'); return; }

      btn.disabled = true;
      confirmarLideranca(time, sel.tipo, sel.alvo);
    };
  });
}

function confirmarLideranca(time, tipo, alvoPos){
  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid).then(function(match){
    if(!match) return;
    var fase = match.fase_atual;
    var proms = [];

    proms.push(fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/fases/' + fase + '/lideranca_' + time, {
      tipo: tipo, alvo: alvoPos, ts: Date.now()
    }));

    if(tipo === 'estrategia'){
      proms.push(fbPatch(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/times/' + time + '/slots/' + alvoPos, { debuff: null }));
    }

    Promise.all(proms).then(function(){
      var box = document.getElementById('q3cap_' + time);
      if(box) box.innerHTML = '<div class="qlbl">liderança usada nesta fase.</div>';
    });
  });
}



function renderFim(match){
  pararPollVuvuzela();
  document.getElementById('q3vazio').hidden = true;
  document.getElementById('q3lobby').hidden = true;
  document.getElementById('q3jogo').hidden = true;
  document.getElementById('q3admbar').hidden = true;
  document.getElementById('q3fim').hidden = false;

  var timeA = match.times.A;
  var timeB = match.times.B;
  var v = match.vencedor;

  document.getElementById('q3fimnomea').innerHTML = nomeCasaComEmblema(timeA.nome);
  document.getElementById('q3fimnomeb').innerHTML = nomeCasaComEmblema(timeB.nome);
  document.getElementById('q3fimpontosa').textContent = timeA.placar || 0;
  document.getElementById('q3fimpontosb').textContent = timeB.placar || 0;

  var elResultado = document.getElementById('q3fimresultado');
  if(v === 'A'){
    elResultado.innerHTML = nomeCasaComEmblema(timeA.nome) + ' venceu!';
  }else if(v === 'B'){
    elResultado.innerHTML = nomeCasaComEmblema(timeB.nome) + ' venceu!';
  }else{
    elResultado.textContent = 'Empate!';
  }

  var elMvp = document.getElementById('q3fimmvp');
  var pontuadores = match.pontuadores || {};
  var mvpSk = null, mvpPontos = -1;
  Object.keys(pontuadores).forEach(function(sk){
    if(pontuadores[sk] > mvpPontos){ mvpPontos = pontuadores[sk]; mvpSk = sk; }
  });

  if(mvpSk && mvpPontos > 0){
    var partsMvp = mvpSk.split('_');
    var timeMvp = partsMvp[0], posMvp = partsMvp.slice(1).join('_');
    var slotMvp = match.times[timeMvp].slots[posMvp];
    elMvp.innerHTML = '<i class="fa fa-trophy"></i> MVP da partida: ' +
      escaparHtml(slotMvp ? slotMvp.nome : '?') + ' (' + POS_LABEL[posMvp] + ') — ' + mvpPontos + ' pontos';
  }else{
    elMvp.innerHTML = '';
  }

  var elLog = document.getElementById('q3fimlog');
  elLog.innerHTML = '';
  var fasesOrdenadas = Object.keys(match.fases || {}).map(Number).sort(function(a, b){ return a - b; });

  fasesOrdenadas.forEach(function(numFase){
    var faseObj = match.fases[numFase];
    if(!faseObj || !faseObj.resultado || !faseObj.resultado.log) return;

    var sep = document.createElement('div');
    sep.className = 'q3fimfasesep';
    sep.textContent = 'fase ' + numFase;
    elLog.appendChild(sep);

    faseObj.resultado.log.forEach(function(entrada){
      var div = document.createElement('div');
      div.className = 'q3logl' + (entrada.combo ? ' q3logcombo' : '');
      div.textContent = typeof entrada === 'string' ? entrada : entrada.text;
      elLog.appendChild(div);
    });
  });

  var elNova = document.getElementById('q3fimnova');
  if(isAdmin){
    elNova.hidden = false;
    elNova.onclick = function(){
      pid = null;
      document.getElementById('q1tadm').click();
    };
  }else{
    elNova.hidden = true;
  }
}


function renderHistorico(containerId){
  containerId = containerId || 'q4enclista';
  var lista = document.getElementById(containerId);
  lista.innerHTML = '<div class="qlbl">carregando...</div>';

  fbGet(QUAD_FB_PARTIDAS, '/historico').then(function(historico){
    if(!historico){
      lista.innerHTML = '<div class="qlbl">nenhuma partida registrada ainda.</div>';
      return;
    }

    var entradas = Object.keys(historico).map(function(pid){
      return Object.assign({ pid: pid }, historico[pid]);
    }).sort(function(a, b){ return (b.data || 0) - (a.data || 0); });

    lista.innerHTML = '';

    entradas.forEach(function(h){
      var data = new Date(h.data);
      var dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

      var div = document.createElement('div');
      div.className = 'q4item';
      div.innerHTML =
        '<div class="q4itemtopo">' +
          '<div class="q4itemplacar">' + nomeCasaComEmblema(h.nomeA) + ' ' + h.placarA + ' × ' + h.placarB + ' ' + nomeCasaComEmblema(h.nomeB) + '</div>' +
          '<div class="q4itemdata">' + dataStr + '</div>' +
        '</div>' +
        '<div class="q4itemvencedor">' + (h.nomeVencedor ? nomeCasaComEmblema(h.nomeVencedor) + ' venceu' : 'Empate') +
          (h.nomeMvp ? ' · MVP: ' + escaparHtml(h.nomeMvp) : '') + '</div>' +
        '<button type="button" class="q4itemverlog" data-pid="' + h.pid + '">ver log completo</button>' +
        '<div class="q4itemlogbox" id="q4log_' + h.pid + '_' + containerId + '" hidden></div>';

      lista.appendChild(div);
    });

    lista.querySelectorAll('.q4itemverlog').forEach(function(btn){
      btn.onclick = function(){
        var pidLog = btn.dataset.pid;
        var box = document.getElementById('q4log_' + pidLog + '_' + containerId);

        if(!box.hidden){
          box.hidden = true;
          btn.textContent = 'ver log completo';
          return;
        }

        btn.textContent = 'carregando...';
        fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pidLog).then(function(match){
          box.innerHTML = '';
          if(!match || !match.fases){
            box.innerHTML = '<div class="qlbl">log não disponível.</div>';
          }else{
            var fasesOrdenadas = Object.keys(match.fases).map(Number).sort(function(a, b){ return a - b; });
            fasesOrdenadas.forEach(function(numFase){
              var faseObj = match.fases[numFase];
              if(!faseObj || !faseObj.resultado || !faseObj.resultado.log) return;

              var sep = document.createElement('div');
              sep.className = 'q3fimfasesep';
              sep.textContent = 'fase ' + numFase;
              box.appendChild(sep);

              faseObj.resultado.log.forEach(function(entrada){
                var d = document.createElement('div');
                d.className = 'q3logl' + (entrada.combo ? ' q3logcombo' : '');
                d.textContent = typeof entrada === 'string' ? entrada : entrada.text;
                box.appendChild(d);
              });
            });
          }
          box.hidden = false;
          btn.textContent = 'fechar log';
        });
      };
    });
  });
}


function corDaCasaPorNome(nome){
  if(!nome) return null;
  if(QUAD_CORES_CASAS[nome]) return QUAD_CORES_CASAS[nome];

  var alvo = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  var chave = Object.keys(QUAD_CORES_CASAS).find(function(k){
    return k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === alvo;
  });
  return chave ? QUAD_CORES_CASAS[chave] : null;
}

var MEDALHA_POR_POSICAO = ['🥇', '🥈', '🥉'];

function renderRanking(){
  var lista = document.getElementById('q4ranklista');
  lista.innerHTML = '<div class="qlbl">carregando...</div>';

  fbGet(QUAD_FB_PARTIDAS, '/historico').then(function(historico){
    if(!historico){
      lista.innerHTML = '<div class="qlbl">nenhuma partida registrada ainda.</div>';
      return;
    }

    var stats = {};

    function garantir(nome){
      if(!stats[nome]) stats[nome] = { vitorias:0, derrotas:0, empates:0, golsPro:0, golsContra:0 };
    }

    Object.values(historico).forEach(function(h){
      garantir(h.nomeA);
      garantir(h.nomeB);

      stats[h.nomeA].golsPro += h.placarA || 0;
      stats[h.nomeA].golsContra += h.placarB || 0;
      stats[h.nomeB].golsPro += h.placarB || 0;
      stats[h.nomeB].golsContra += h.placarA || 0;

      if(!h.nomeVencedor || h.nomeVencedor === 'Empate'){
        stats[h.nomeA].empates++;
        stats[h.nomeB].empates++;
      }else if(h.nomeVencedor === h.nomeA){
        stats[h.nomeA].vitorias++;
        stats[h.nomeB].derrotas++;
      }else{
        stats[h.nomeB].vitorias++;
        stats[h.nomeA].derrotas++;
      }
    });

    var linhas = Object.keys(stats).map(function(nome){
      var s = stats[nome];
      var pontos = s.vitorias * 3 + s.empates;
      var jogos = s.vitorias + s.derrotas + s.empates;
      var saldo = s.golsPro - s.golsContra;
      return {
        nome: nome, jogos: jogos, vitorias: s.vitorias, empates: s.empates,
        derrotas: s.derrotas, saldo: saldo, pontos: pontos
      };
    }).sort(function(a, b){
      if(b.pontos !== a.pontos) return b.pontos - a.pontos;
      if(b.saldo !== a.saldo) return b.saldo - a.saldo;
      return b.vitorias - a.vitorias;
    });

    lista.innerHTML = '';

    var tabela = document.createElement('table');
    tabela.className = 'q4ranktable';
    tabela.innerHTML =
      '<thead><tr>' +
        '<th class="q4rankth-pos">#</th>' +
        '<th class="q4rankth-nome">Casa</th>' +
        '<th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th>' +
      '</tr></thead>';

    var corpo = document.createElement('tbody');

    linhas.forEach(function(l, i){
      var cores = corDaCasaPorNome(l.nome);
      var tr = document.createElement('tr');
      tr.className = 'q4ranktr' + (i === 0 ? ' q4ranktr-lider' : '');
      if(cores){
        tr.style.setProperty('--casa-stroke', cores.stroke);
        tr.style.setProperty('--casa-fill', cores.fill);
      }

      var medalha = MEDALHA_POR_POSICAO[i] || '';
      var saldoTxt = (l.saldo > 0 ? '+' : '') + l.saldo;

      tr.innerHTML =
        '<td class="q4rankpos">' + (medalha || (i + 1)) + '</td>' +
        '<td class="q4ranknome2">' + nomeCasaComEmblema(l.nome) + '</td>' +
        '<td>' + l.jogos + '</td>' +
        '<td>' + l.vitorias + '</td>' +
        '<td>' + l.empates + '</td>' +
        '<td>' + l.derrotas + '</td>' +
        '<td>' + saldoTxt + '</td>' +
        '<td class="q4rankpts">' + l.pontos + '</td>';

      corpo.appendChild(tr);
    });

    tabela.appendChild(corpo);
    lista.appendChild(tabela);
  });
}

document.getElementById('q1tpart').addEventListener('click', function(){
  renderHistorico('q4enclista');
});


document.querySelectorAll('.q4tab').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.q4tab').forEach(function(b){ b.classList.remove('on'); });
    document.querySelectorAll('.q4sub').forEach(function(s){ s.hidden = true; });

    btn.classList.add('on');
    var alvo = btn.dataset.alvo;
    var alvoEl = document.getElementById(alvo);
    if(alvoEl) alvoEl.hidden = false;

    if(alvo === 'q4enc') renderHistorico('q4enclista');
    if(alvo === 'q4rank') renderRanking();
    if(alvo === 'q4casas') iniciarJogadoresPorCasa();
  });
});



function renderTorcida(match, container){
  var torcedores = match.torcedores || {};
  var meuTorcida = torcedores[myUid];
  var timeA = match.times.A, timeB = match.times.B;

  var box = document.createElement('div');
  box.className = 'qcard';
  box.id = 'q3torcida';

  var html = '<div class="qlbl"><i class="fa fa-users"></i> torcida</div>';

  if(!meuTorcida){
    html += '<div class="q3acoesgrid">';
    html += '<button type="button" class="q3torcerbtn" data-time="A">Torcer por ' + escaparHtml(timeA.nome) + '</button>';
    html += '<button type="button" class="q3torcerbtn" data-time="B">Torcer por ' + escaparHtml(timeB.nome) + '</button>';
    html += '</div>';
  }else{
    html += '<div class="q3torcendo">Torcendo por ' + escaparHtml(match.times[meuTorcida.time].nome) + '</div>';
  }

  html += '<div class="q3torcidalistas">';
  html += '<div class="q3torcidacol"><div class="q3colnome">' + escaparHtml(timeA.nome) + '</div><div id="q3torcalist_A"></div></div>';
  html += '<div class="q3torcidacol"><div class="q3colnome">' + escaparHtml(timeB.nome) + '</div><div id="q3torcalist_B"></div></div>';
  html += '</div>';

  box.innerHTML = html;
  container.appendChild(box);

  ['A','B'].forEach(function(t){
    var nomes = Object.values(torcedores).filter(function(td){ return td.time === t; }).map(function(td){ return escaparHtml(td.nome); });
    document.getElementById('q3torcalist_' + t).innerHTML = nomes.length ? nomes.join(', ') : '<span class="q3muted">ninguém ainda</span>';
  });

  document.querySelectorAll('.q3torcerbtn').forEach(function(btn){
    btn.onclick = function(){
      fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/torcedores/' + myUid, { uid:myUid, nome:myNome, time:btn.dataset.time });
    };
  });

  if(meuTorcida){
    renderApostaPanel(match, meuTorcida.time, container);
  }

  renderVuvuzelaBtn(container);
}

function renderApostaPanel(match, meuTime, container){
  fbGet(QUAD_FB_PARTIDAS, '/apostas/' + pid + '/' + myUid).then(function(apostaExistente){
    var box = document.createElement('div');
    box.className = 'qcard';

    if(apostaExistente){
      box.innerHTML = '<div class="qlbl">sua aposta</div><div>' + apostaExistente.valor + ' Galeões em ' + escaparHtml(match.times[apostaExistente.time].nome) + ' (' + apostaExistente.status + ')</div>';
    }else{
      box.innerHTML =
        '<div class="qlbl">apostar em ' + escaparHtml(match.times[meuTime].nome) + '</div>' +
        '<input type="number" id="q3apostaval" min="1" max="' + QUAD_APOSTA_MAX + '" placeholder="até ' + QUAD_APOSTA_MAX + ' Galeões">' +
        '<button type="button" id="q3apostarbtn">apostar (paga ' + QUAD_APOSTA_MULTIPLICADOR + 'x)</button>' +
        '<div id="q3apostamsg"></div>';
    }

    container.appendChild(box);

    var btn = document.getElementById('q3apostarbtn');
    if(btn){
      btn.onclick = function(){
        var valor = parseInt(document.getElementById('q3apostaval').value) || 0;
        var msg = document.getElementById('q3apostamsg');
        if(valor < 1 || valor > QUAD_APOSTA_MAX){
          msg.textContent = 'valor inválido (máx ' + QUAD_APOSTA_MAX + ').';
          return;
        }

        fbGet(QUAD_FB_PARTIDAS, '/apostas/' + pid + '/' + myUid).then(function(existe){
          if(existe){ msg.textContent = 'você já apostou nesta partida.'; return; }

          fbGet(QUAD_FB_PERSONAGENS, '/saldos/' + myUid).then(function(saldo){
            var atual = saldo ? (saldo.saldo || 0) : 0;
            if(atual < valor){ msg.textContent = 'Galeões insuficientes.'; return; }

            Promise.all([
              fbPatch(QUAD_FB_PERSONAGENS, '/saldos/' + myUid, { saldo: atual - valor }),
              fbPut(QUAD_FB_PARTIDAS, '/apostas/' + pid + '/' + myUid, { time: meuTime, valor: valor, status:'pendente' })
            ]).then(function(){
              msg.textContent = 'aposta registrada!';
            });
          });
        });
      };
    }
  });
}

function processarApostas(vencedorTime){
  fbGet(QUAD_FB_PARTIDAS, '/apostas/' + pid).then(function(apostas){
    if(!apostas) return;
    Object.keys(apostas).forEach(function(uid){
      var a = apostas[uid];
      if(!a || a.status !== 'pendente') return;

      if(!vencedorTime){
        fbGet(QUAD_FB_PERSONAGENS, '/saldos/' + uid).then(function(s){
          if(!s) return;
          fbPatch(QUAD_FB_PERSONAGENS, '/saldos/' + uid, { saldo: (s.saldo || 0) + a.valor });
          fbPut(QUAD_FB_PARTIDAS, '/apostas/' + pid + '/' + uid + '/status', 'empatou');
        });
        return;
      }

      if(a.time === vencedorTime){
        fbGet(QUAD_FB_PERSONAGENS, '/saldos/' + uid).then(function(s){
          if(!s) return;
          fbPatch(QUAD_FB_PERSONAGENS, '/saldos/' + uid, { saldo: (s.saldo || 0) + a.valor * QUAD_APOSTA_MULTIPLICADOR });
          fbPut(QUAD_FB_PARTIDAS, '/apostas/' + pid + '/' + uid + '/status', 'ganhou');
        });
      }else{
        fbPut(QUAD_FB_PARTIDAS, '/apostas/' + pid + '/' + uid + '/status', 'perdeu');
      }
    });
  });
}



var vuvuzelaPollTimer = null;
var vuvuzelasProcessadas = {};
var lastVuvuzelaClick = 0;

function iniciarPollVuvuzela(){
  if(vuvuzelaPollTimer) clearInterval(vuvuzelaPollTimer);
  vuvuzelaPollTimer = setInterval(verificarVuvuzelas, 1000);
}

function pararPollVuvuzela(){
  if(vuvuzelaPollTimer) clearInterval(vuvuzelaPollTimer);
  vuvuzelaPollTimer = null;
}

function verificarVuvuzelas(){
  if(!pid) return;
  fbGet(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/vuvuzelas').then(function(vuvs){
    if(!vuvs) return;
    var agora = Date.now();
    Object.keys(vuvs).forEach(function(uid){
      var v = vuvs[uid];
      if(!v || agora - v.ts > 8000) return;
      var chave = uid + '_' + v.ts;
      if(vuvuzelasProcessadas[chave]) return;
      vuvuzelasProcessadas[chave] = true;
      tocarVuvuzela(v.nome);
      fbDel(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/vuvuzelas/' + uid);
    });
  });
}

function renderVuvuzelaBtn(container){
  var box = document.createElement('div');
  box.className = 'qcard';
  box.innerHTML = '<button type="button" id="q3vuvuzelabtn"><i class="fa fa-bullhorn"></i> vuvuzelar</button><div id="q3vuvuzelaavisos"></div>';
  container.appendChild(box);

  document.getElementById('q3vuvuzelabtn').onclick = function(){
    var agora = Date.now();
    if(agora - lastVuvuzelaClick < QUAD_VUVUZELA_COOLDOWN * 1000){
      document.getElementById('q3vuvuzelaavisos').textContent = 'espera um pouco...';
      return;
    }
    lastVuvuzelaClick = agora;
    fbPut(QUAD_FB_PARTIDAS, '/partidas/' + pid + '/vuvuzelas/' + myUid, { uid:myUid, nome:myNome, ts:agora });
  };
}

var _audioCtx = null;

function _getCtx(){
  if(!_audioCtx){
    try{ _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; }
  }
  if(_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function _oscVuvuzela(){
  var ctx = _getCtx();
  if(!ctx) return;
  try{
    var osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 480; osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
  }catch(e){}
}

function tocarVuvuzela(nome){
  var sons = typeof QUAD_SOM_VUVUZELA !== 'undefined' && QUAD_SOM_VUVUZELA;
  if(sons){
    var url = Array.isArray(sons) ? sons[Math.floor(Math.random() * sons.length)] : sons;
    try{
      var a = new Audio(url); a.volume = 0.6;
      var p = a.play();
      if(p && p.catch) p.catch(function(){ _oscVuvuzela(); });
    }catch(e){ _oscVuvuzela(); }
  }else{
    _oscVuvuzela();
  }

  if(nome){
    var av = document.getElementById('q3vuvuzelaavisos');
    if(av){
      var aviso = document.createElement('div');
      aviso.textContent = nome + ' tocou a vuvuzela!';
      av.prepend(aviso);
      setTimeout(function(){ aviso.remove(); }, 3000);
    }
  }
}

document.addEventListener('click', function(){ _getCtx(); }, { once:true });
document.addEventListener('touchstart', function(){ _getCtx(); }, { once:true });



function semanaAtual(){
  var d = new Date();
  var oneJan = new Date(d.getFullYear(), 0, 1);
  var week = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + String(week).padStart(2, '0');
}

function diaAtual(){
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

var QUAD_TREINO_LIMITE_DIARIO_H = 3;

var treinoPollTimer = null;
var treinoCountdownTimer = null;

function iniciarTreinoPoll(){
  if(treinoPollTimer) clearInterval(treinoPollTimer);
  renderTreino();
  treinoPollTimer = setInterval(renderTreino, 5000);
}

function pararTreinoPoll(){
  if(treinoPollTimer) clearInterval(treinoPollTimer);
  treinoPollTimer = null;
  if(treinoCountdownTimer) clearInterval(treinoCountdownTimer);
  treinoCountdownTimer = null;
}

function esconderEstadosTreino(){
  document.getElementById('q2form').hidden = true;
  document.getElementById('q2cv').hidden = true;
  document.getElementById('q2aguardando').hidden = true;
  document.getElementById('q2ativo').hidden = true;
  document.getElementById('q2rodadawrap').hidden = true;
  document.getElementById('q2concluido').hidden = true;
}

var ultimoEstadoTreinoMostrado = null;

function mostrarEstadoTreino(nome){
  var mudou = (ultimoEstadoTreinoMostrado !== nome);
  if(mudou){
    ultimoEstadoTreinoMostrado = nome;
    esconderEstadosTreino();
    document.getElementById(nome).hidden = false;
  }
  return mudou;
}

function renderTreino(){
  var semana = semanaAtual();

  Promise.all([
    fbGet(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid),
    fbGet(QUAD_FB_PARTIDAS, '/treinos/sessoes')
  ]).then(function(r){
    var dados = r[0] || {};
    var sessoes = r[1] || {};

    var horas = (dados.semana === semana) ? (dados.horas_semana || 0) : 0;
    var packFeito = (dados.semana === semana) && !!dados.pack_resgatado;
    var pct = Math.min(100, (horas / QUAD_TREINO_META) * 100);
    var faltam = Math.max(0, QUAD_TREINO_META - horas);

    document.getElementById('q2hval').textContent = horas.toFixed(1) + 'h';
    document.getElementById('q2falta').textContent = faltam.toFixed(1) + 'h restantes';
    document.getElementById('q2barra').style.width = pct + '%';

var elResgatar = document.getElementById('q2resgatar');
    if(horas >= QUAD_TREINO_META && !packFeito){
      elResgatar.hidden = false;
      elResgatar.onclick = function(){
        if(!confirm('Resgatar 1 ponto de maestria em Quadribol?')) return;
        fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { pack_resgatado: true }).then(function(){
          return fbPut(QUAD_FB_PERSONAGENS, '/inventario/' + myUid + '/pack_maestria_' + Date.now(), {
            nome: '1 Ponto em Maestria de Quadribol',
            descricao: 'Resgate este ponto no tópico de obtenção de maestria. Obtido ao completar ' + QUAD_TREINO_META + 'h de treino na semana.',
            quantidade: 1,
            tipo: 'pack_maestria',
            obtido_em: Date.now()
          });
        }).then(function(){
          return fbPut(QUAD_FB_PARTIDAS, '/treinos/drops/drop' + Date.now(), {
            uid: myUid, nome: myNome, semana: semana, data: Date.now()
          });
        }).then(renderTreino);
      };
    }else{
      elResgatar.hidden = true;
    }


    renderCampoAgora(sessoes, semana);

    if(dados.sessao_id && sessoes[dados.sessao_id]){
      var sid = dados.sessao_id, sessao = sessoes[dados.sessao_id];

      if(sessao.status === 'ativa'){
        var fim = sessao.inicio + sessao.duracao_h * 3600000;
        if(Date.now() >= fim){
          processarFimTreino(sid, sessao, semana);
        }else{
          mostrarEstadoTreino('q2ativo');
          renderTreinoAtivo(sid, sessao);
        }
        return;
      }

      if(sessao.status === 'aguardando'){
        mostrarEstadoTreino('q2aguardando');
        renderTreinoAguardando(sid, sessao);
        return;
      }

      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { sessao_id: null });
    }

    if(dados.convite_sid && sessoes[dados.convite_sid]){
      var sconv = sessoes[dados.convite_sid];
      if(sconv.status === 'aguardando'){
        mostrarEstadoTreino('q2cv');
        renderTreinoConvite(dados.convite_sid, sconv);
        return;
      }
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { convite_sid: null });
    }

    var entrouAgoraNoForm = mostrarEstadoTreino('q2form');
    renderTreinoForm(entrouAgoraNoForm);
  });
}

function renderCampoAgora(sessoes, semana){
  var campo = document.getElementById('q2campo');
  campo.innerHTML = '';
  var algum = false;

  Object.keys(sessoes).forEach(function(sid){
    var s = sessoes[sid];
    if(!s || s.status !== 'ativa') return;
    if(s.jogadorA === myUid || s.jogadorB === myUid) return;

    algum = true;
    var elapsed = Math.floor((Date.now() - s.inicio) / 60000);
    var hh = Math.floor(elapsed / 60), mm = elapsed % 60;
    var tempoStr = (hh > 0 ? hh + 'h ' : '') + mm + 'min';

    var mesmaCasa = !!(s.casaA && s.casaB && s.casaA === s.casaB);

    var div = document.createElement('div');
    div.className = 'q2par';
    div.innerHTML =
      '<div class="q2parnomes">' + escaparHtml(s.nomeA) + '<span class="q2parx">x</span>' + escaparHtml(s.nomeB) + '</div>' +
      '<div class="q2parmeta">' + tempoStr + '</div>' +
      (mesmaCasa
        ? '<span class="q2parprotegido" title="mesma casa — protegidos contra atrapalho"><i class="fa fa-shield"></i></span>'
        : '<button type="button" class="q2atrap" data-sid="' + sid + '">atrapalhar</button>');
    campo.appendChild(div);
  });

  if(!algum){
    campo.innerHTML = '<div class="qlbl">nenhuma dupla treinando agora.</div>';
  }

  document.querySelectorAll('.q2atrap').forEach(function(btn){
    btn.onclick = function(){
      atrapalharTreino(btn.dataset.sid, sessoes[btn.dataset.sid], semana);
    };
  });
}

function renderTreinoForm(limparCampos){
  document.getElementById('q2form').hidden = false;

  var elUid = document.getElementById('q2uid');
  if(limparCampos){
    document.getElementById('q2prev').textContent = '';
    elUid.value = '';
  }

  elUid.onblur = function(){
    var v = this.value.trim();
    if(!v) return;
    fbGet(QUAD_FB_PERSONAGENS, '/saldos/u' + v).then(function(d){
      document.getElementById('q2prev').textContent = d && d.nome ? d.nome : 'uid não encontrado';
    });
  };

  document.getElementById('q2conv').onclick = function(){
    var parcRaw = document.getElementById('q2uid').value.trim();
    var idx = parseInt(document.getElementById('q2dur').value);
    var opcao = QUAD_TREINO_OPCOES[idx];
    var combo = document.getElementById('q2combo').value;

    if(!parcRaw){ alert('Informe o uid do parceiro.'); return; }
    if('u' + parcRaw === myUid){ alert('Você não pode treinar sozinho.'); return; }

    fbGet(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid).then(function(s){
      var energia = s ? (s.energia_cur || 0) : 0;
      if(energia < opcao.energia){ alert('Energia insuficiente. Precisa de ' + opcao.energia + '.'); return; }
      criarSessaoTreino('u' + parcRaw, opcao, combo);
    });
  };
}



var POS_LABEL_BASE = { artilheiro:'Artilheiro', batedor:'Batedor', goleiro:'Goleiro', apanhador:'Apanhador' };

var TREINO_COMBOS = {
  artilheiro_goleiro: { posA:'artilheiro', posB:'goleiro' },
  goleiro_artilheiro: { posA:'goleiro', posB:'artilheiro' },
  batedor_batedor:    { posA:'batedor',   posB:'batedor' },
  apanhador_apanhador:{ posA:'apanhador', posB:'apanhador' }
};



var TREINO_ACAO_INFO = {
  arremessar:          { principal:'destreza',     secundario:'agilidade',    tipoVassoura:'velocidade',     especialidade:'artilheiro' },
  fintar:              { principal:'agilidade',    secundario:'inteligencia', tipoVassoura:'manobrabilidade',especialidade:'artilheiro' },
  mergulho:            { principal:'agilidade',    secundario:'destreza',     tipoVassoura:'manobrabilidade',especialidade:'artilheiro' },
  finta_passe:         { principal:'inteligencia', secundario:'destreza',     tipoVassoura:'bonus',          especialidade:'artilheiro' },
  lancar_balaco:       { principal:'forca',        secundario:'determinacao',tipoVassoura:'velocidade',      especialidade:'manobras' },
  derrubar:            { principal:'forca',        secundario:'determinacao',tipoVassoura:'velocidade',      especialidade:'manobras' },
  pressao_aerea:       { principal:'forca',        secundario:'determinacao',tipoVassoura:'velocidade',      especialidade:'manobras' },
  interceptar:         { principal:'forca',        secundario:'determinacao',tipoVassoura:'bonus',           especialidade:'manobras' },
  antecipar:           { principal:'inteligencia', secundario:'agilidade',   tipoVassoura:'estabilidade',    especialidade:'defesa' },
  blitz:               { principal:'forca',        secundario:'agilidade',   tipoVassoura:'velocidade',      especialidade:'defesa' },
  derrubar_artilheiro: { principal:'forca',        secundario:'agilidade',   tipoVassoura:'velocidade',      especialidade:'defesa' },
  sabotar:             { principal:'agilidade',    secundario:'determinacao',tipoVassoura:'manobrabilidade', especialidade:'pomo' },
  carregar:            { principal:'determinacao', secundario:'agilidade',   tipoVassoura:'velocidade',      especialidade:'pomo' }
};

function montarSlotTreino(uid){
  return Promise.all([
    fbGet(QUAD_FB_PERSONAGENS, '/atributos/' + uid),
    fbGet(QUAD_FB_PERSONAGENS, '/maestrias-personagem/' + uid),
    fbGet(QUAD_FB_PARTIDAS, '/jogadores/' + uid)
  ]).then(function(r){
    var atributos = r[0] || {};
    var maestrias = r[1] || {};
    var cadastro = r[2] || {};
    var pctQuadribol = maestrias.maestria_em_quadribol ? (maestrias.maestria_em_quadribol.porcentagem || 0) : 0;

    return {
      atributos: atributos,
      vassoura: { nome:'Vassoura Padrao de Hogwarts', bonus:1 }, 
      maestria: {
        quadribol: pctQuadribol,
        voo: 0,
        artilheiro: (cadastro.especializacoes && cadastro.especializacoes.artilheiro) || 0,
        defesa: (cadastro.especializacoes && cadastro.especializacoes.defesa) || 0,
        manobras: (cadastro.especializacoes && cadastro.especializacoes.manobras) || 0,
        pomo: (cadastro.especializacoes && cadastro.especializacoes.pomo) || 0
      }
    };
  });
}



function rolarComDetalhe(slot, atributoPrincipal, atributoSecundario, opcoes){
  opcoes = opcoes || {};
  var dado = 1 + Math.floor(Math.random() * 20);

  var modPrincipal = modAtributo(slot, atributoPrincipal, 2);
  var modSecundario = atributoSecundario ? modAtributo(slot, atributoSecundario, 3) : 0;
  var vassoura = bonusVassoura(slot, opcoes.tipoVassoura);
  var maestBase = bonusMaestriaBase(slot);
  var maestEsp = opcoes.especialidade ? bonusMaestriaEspecializada(slot, opcoes.especialidade) : 0;

  var somaBruta = modPrincipal + modSecundario + vassoura + maestBase + maestEsp;
  var bonusFixo = Math.min(QUAD_TETO_BONUS_FIXO, somaBruta);
  var total = dado + bonusFixo;
  if(dado === 1) total -= 10;

  return {
    dado: dado, principal: modPrincipal, secundario: modSecundario,
    nomePrincipal: atributoPrincipal, nomeSecundario: atributoSecundario || null,
    especialidade: opcoes.especialidade || null,
    vassoura: vassoura, maestriaBase: maestBase, maestriaEsp: maestEsp,
    bonusFixo: bonusFixo, total: total, critico20: dado === 20
  };
}

function rolarAcaoTreino(slot, acaoId){
  var info = TREINO_ACAO_INFO[acaoId];
  if(!info) return null;
  return rolarComDetalhe(slot, info.principal, info.secundario, {
    tipoVassoura: info.tipoVassoura,
    especialidade: info.especialidade
  });
}

function nomeAcaoPorId(id){
  var todas = [].concat(ACOES.artilheiro, ACOES.batedor, ACOES.goleiro, ACOES.apanhador);
  var achou = todas.filter(function(a){ return a.id === id; })[0];
  return achou ? achou.nome : id;
}

var rodadaTreinoRenderizada = -1;
var acaoTreinoSelecionada = null;
var sidTreinoAtual = null;

function renderRodadaTreino(sid, sessao){
  if(sidTreinoAtual !== sid){
    sidTreinoAtual = sid;
    rodadaTreinoRenderizada = -1;
    acaoTreinoSelecionada = null;
  }

  var totalRodadas = sessao.totalRodadas || 3;
  var rodadaAtual = sessao.rodadaAtual || 1;
  var combo = TREINO_COMBOS[sessao.combo] || TREINO_COMBOS.artilheiro_goleiro;

  var souA = (myUid === sessao.jogadorA);
  var minhaPos = souA ? combo.posA : combo.posB;
  var chaveMinhaAcao = souA ? 'acaoA' : 'acaoB';
  var chaveAcaoParceiro = souA ? 'acaoB' : 'acaoA';

  document.getElementById('q2rodadawrap').hidden = false;

  if(rodadaAtual > totalRodadas){
    document.getElementById('q2rodadalabel').hidden = true;
    document.getElementById('q2rodadaacoes').hidden = true;
    document.getElementById('q2rodadaconfirmar').hidden = true;
    document.getElementById('q2rodadaaguardando').hidden = true;
    document.getElementById('q2rodadaresultado').hidden = true;
    document.getElementById('q2rodadaproxima').hidden = true;
    document.getElementById('q2rodadafim').hidden = false;
    return;
  }

  document.getElementById('q2rodadafim').hidden = true;
  document.getElementById('q2rodadalabel').hidden = false;
  document.getElementById('q2rodadalabel').textContent =
    'rodada ' + rodadaAtual + ' de ' + totalRodadas + ' — você pratica: ' + POS_LABEL_BASE[minhaPos];

  fbGet(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid + '/rodadas/' + rodadaAtual).then(function(rodada){
    rodada = rodada || {};

    if(rodada.status === 'resolvida'){
      renderResultadoRodada(sessao, rodada, souA);
      document.getElementById('q2rodadaacoes').hidden = true;
      document.getElementById('q2rodadaconfirmar').hidden = true;
      document.getElementById('q2rodadaaguardando').hidden = true;
      document.getElementById('q2rodadaresultado').hidden = false;
      document.getElementById('q2rodadaproxima').hidden = false;
      document.getElementById('q2rodadaproxima').onclick = function(){
        fbPatch(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid, { rodadaAtual: rodadaAtual + 1 });
      };
      return;
    }

    var minhaAcaoJaEscolhida = !!rodada[chaveMinhaAcao];
    var acaoParceiroEscolhida = !!rodada[chaveAcaoParceiro];

    document.getElementById('q2rodadaresultado').hidden = true;
    document.getElementById('q2rodadaproxima').hidden = true;

    if(minhaAcaoJaEscolhida){
      document.getElementById('q2rodadaacoes').hidden = true;
      document.getElementById('q2rodadaconfirmar').hidden = true;

      if(acaoParceiroEscolhida){
        document.getElementById('q2rodadaaguardando').hidden = true;
        resolverRodadaTreino(sid, sessao, rodadaAtual);
      }else{
        document.getElementById('q2rodadaaguardando').hidden = false;
      }
      return;
    }

    document.getElementById('q2rodadaaguardando').hidden = true;

    if(rodadaTreinoRenderizada !== rodadaAtual){
      rodadaTreinoRenderizada = rodadaAtual;
      acaoTreinoSelecionada = null;
      document.getElementById('q2rodadadesc').textContent = '';

      var lista = ACOES[minhaPos].filter(function(a){ return TREINO_ACAO_INFO[a.id]; });
      var elAcoes = document.getElementById('q2rodadaacoes');
      elAcoes.innerHTML = lista.map(function(a){
        return '<button type="button" class="q2rodadaacaobtn" data-acao="' + a.id + '" data-desc="' + escaparHtml(a.desc) + '" title="' + escaparHtml(a.desc) + '">' + escaparHtml(a.nome) + '</button>';
      }).join('');

      document.querySelectorAll('.q2rodadaacaobtn').forEach(function(btn){
        btn.onclick = function(){
          document.querySelectorAll('.q2rodadaacaobtn').forEach(function(b){ b.classList.remove('q2rodadasel'); });
          btn.classList.add('q2rodadasel');
          acaoTreinoSelecionada = btn.dataset.acao;
          document.getElementById('q2rodadaconfirmar').hidden = false;
          document.getElementById('q2rodadadesc').textContent = btn.dataset.desc;
        };
      });
    }

    document.getElementById('q2rodadaacoes').hidden = false;

    document.getElementById('q2rodadaconfirmar').onclick = function(){
      if(!acaoTreinoSelecionada){ alert('Escolha uma ação primeiro.'); return; }
      var campoAcao = {};
      campoAcao[chaveMinhaAcao] = acaoTreinoSelecionada;
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid + '/rodadas/' + rodadaAtual, campoAcao).then(function(){
        document.getElementById('q2rodadaconfirmar').hidden = true;
      });
    };
  });
}

var ATRIBUTO_LABEL_CURTO = {
  destreza:'Destreza', agilidade:'Agilidade', inteligencia:'Inteligência',
  forca:'Força', determinacao:'Determinação'
};
var ESPECIALIDADE_LABEL_CURTO = { artilheiro:'Artilharia', defesa:'Defesa', manobras:'Manobras', pomo:'Pomo' };

function renderResultadoRodada(sessao, rodada, souA){
  var parcNome = souA ? sessao.nomeB : sessao.nomeA;
  var meuResultado = souA ? rodada.resultadoA : rodada.resultadoB;
  var parcResultado = souA ? rodada.resultadoB : rodada.resultadoA;
  var minhaAcao = souA ? rodada.acaoA : rodada.acaoB;
  var acaoParceiro = souA ? rodada.acaoB : rodada.acaoA;

  if(!meuResultado || !parcResultado) return;

  var euVenci = vencedor(meuResultado, parcResultado);

  function contaHtml(r){
    var nomePrincipal = ATRIBUTO_LABEL_CURTO[r.nomePrincipal] || r.nomePrincipal;
    var nomeSecundario = r.nomeSecundario ? (ATRIBUTO_LABEL_CURTO[r.nomeSecundario] || r.nomeSecundario) : null;
    var nomeEspecialidade = r.especialidade ? (ESPECIALIDADE_LABEL_CURTO[r.especialidade] || r.especialidade) : null;

    return '<div class="q2rodadaconta">' +
      'dado ' + r.dado +
      ' + ' + nomePrincipal + ' (' + r.principal + ')' +
      (nomeSecundario ? ' + ' + nomeSecundario + ' (' + r.secundario + ')' : '') +
      ' + vassoura (' + r.vassoura + ')' +
      ' + maestria' + (nomeEspecialidade ? ' de ' + nomeEspecialidade : '') + ' (' + (r.maestriaBase + r.maestriaEsp) + ')' +
      ' = total <b>' + r.total + '</b>' + (r.critico20 ? ' — CRÍTICO NATURAL!' : '') +
      '</div>';
  }

  var html =
    '<div class="q2rodadalado' + (euVenci ? ' q2rodadavencedor' : '') + '">' +
      '<b>Você</b> — ' + escaparHtml(nomeAcaoPorId(minhaAcao)) + contaHtml(meuResultado) +
    '</div>' +
    '<div class="q2rodadalado' + (!euVenci ? ' q2rodadavencedor' : '') + '">' +
      '<b>' + escaparHtml(parcNome) + '</b> — ' + escaparHtml(nomeAcaoPorId(acaoParceiro)) + contaHtml(parcResultado) +
    '</div>';

  document.getElementById('q2rodadaresultado').innerHTML = html;
}

function resolverRodadaTreino(sid, sessao, n){
  var caminho = '/treinos/sessoes/' + sid + '/rodadas/' + n;

  fbGet(QUAD_FB_PARTIDAS, caminho).then(function(rodada){
    if(!rodada || rodada.status === 'resolvendo' || rodada.status === 'resolvida') return;

    fbPatch(QUAD_FB_PARTIDAS, caminho, { status: 'resolvendo' }).then(function(){
      return fbGet(QUAD_FB_PARTIDAS, caminho);
    }).then(function(rodadaAtual){
      if(!rodadaAtual || rodadaAtual.status !== 'resolvendo') return;
      if(!rodadaAtual.acaoA || !rodadaAtual.acaoB) return;

      Promise.all([
        montarSlotTreino(sessao.jogadorA),
        montarSlotTreino(sessao.jogadorB)
      ]).then(function(slots){
        var rA = rolarAcaoTreino(slots[0], rodadaAtual.acaoA);
        var rB = rolarAcaoTreino(slots[1], rodadaAtual.acaoB);

        fbPatch(QUAD_FB_PARTIDAS, caminho, {
          status: 'resolvida',
          resultadoA: rA,
          resultadoB: rB
        });
      });
    });
  });
}



var TREINO_RODADAS_POR_DURACAO = { 1:3, 2:5, 3:8 };


function horasTreinadasHoje(uid){
  var dia = diaAtual();
  return fbGet(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + uid).then(function(dados){
    dados = dados || {};
    return (dados.dia === dia) ? (dados.horas_dia || 0) : 0;
  });
}

function criarSessaoTreino(parcUid, opcao, combo){
  var sid = 'tr' + Date.now();

  Promise.all([
    horasTreinadasHoje(myUid),
    horasTreinadasHoje(parcUid)
  ]).then(function(horasHoje){
    var horasEuHoje = horasHoje[0], horasParcHoje = horasHoje[1];

    if(horasEuHoje + opcao.h > QUAD_TREINO_LIMITE_DIARIO_H){
      alert('Você já treinou ' + horasEuHoje.toFixed(1) + 'h hoje. O limite diário é ' + QUAD_TREINO_LIMITE_DIARIO_H + 'h, então essa sessão de ' + opcao.h + 'h não cabe hoje.');
      return;
    }
    if(horasParcHoje + opcao.h > QUAD_TREINO_LIMITE_DIARIO_H){
      alert('Seu parceiro já treinou ' + horasParcHoje.toFixed(1) + 'h hoje e não cabe mais ' + opcao.h + 'h no limite diário dele (' + QUAD_TREINO_LIMITE_DIARIO_H + 'h).');
      return;
    }

    Promise.all([
      fbGet(QUAD_FB_PERSONAGENS, '/saldos/' + myUid),
      fbGet(QUAD_FB_PERSONAGENS, '/saldos/' + parcUid),
      fbGet(QUAD_FB_PARTIDAS, '/jogadores/' + myUid),
      fbGet(QUAD_FB_PARTIDAS, '/jogadores/' + parcUid)
    ]).then(function(r){
      var casaA = r[2] ? r[2].casa : null;
      var casaB = r[3] ? r[3].casa : null;

      var sessao = {
        jogadorA: myUid, jogadorB: parcUid,
        nomeA: r[0] ? r[0].nome : myUid, nomeB: r[1] ? r[1].nome : parcUid,
        duracao_h: opcao.h, energia: opcao.energia,
        inicio: null, status: 'aguardando', criado_em: Date.now(),
        combo: combo || 'artilheiro_goleiro',
        totalRodadas: TREINO_RODADAS_POR_DURACAO[opcao.h] || 3,
        rodadaAtual: 1,
        casaA: casaA, casaB: casaB
      };

      Promise.all([
        fbPut(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid, sessao),
        fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { sessao_id: sid }),
        fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + parcUid, { convite_sid: sid })
      ]).then(function(){
        return fbGet(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid);
      }).then(function(s){
        if(s) fbPatch(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid, { energia_cur: Math.max(0, (s.energia_cur || 0) - opcao.energia) });
        renderTreino();
      });
    });
  });
}

function renderTreinoAguardando(sid, sessao){
  document.getElementById('q2aguardando').hidden = false;
  document.getElementById('q2aguardandotxt').textContent =
    'convite enviado para ' + sessao.nomeB + '. ' + sessao.energia + ' de energia já foram deduzidos.';

  document.getElementById('q2cancelarconvite').onclick = function(){
    Promise.all([
      fbPut(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid + '/status', 'cancelada'),
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { sessao_id: null }),
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + sessao.jogadorB, { convite_sid: null })
    ]).then(function(){
      return fbGet(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid);
    }).then(function(s){
      if(s) fbPatch(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid, { energia_cur: (s.energia_cur || 0) + sessao.energia });
      renderTreino();
    });
  };
}

function renderTreinoConvite(sid, sessao){
  document.getElementById('q2cv').hidden = false;
  document.getElementById('q2cvnome').textContent = sessao.nomeA;
  document.getElementById('q2cvmeta').textContent = sessao.duracao_h + 'h — custo: ' + sessao.energia + ' de energia.';

  document.querySelector('.q2aceitar').onclick = function(){
    Promise.all([
      fbGet(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid),
      horasTreinadasHoje(myUid)
    ]).then(function(r){
      var s = r[0], horasHoje = r[1];
      var energia = s ? (s.energia_cur || 0) : 0;
      if(energia < sessao.energia){ alert('Energia insuficiente.'); return; }
      if(horasHoje + sessao.duracao_h > QUAD_TREINO_LIMITE_DIARIO_H){
        alert('Você já treinou ' + horasHoje.toFixed(1) + 'h hoje. O limite diário é ' + QUAD_TREINO_LIMITE_DIARIO_H + 'h, então essa sessão de ' + sessao.duracao_h + 'h não cabe hoje.');
        return;
      }

      fbPatch(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid, { energia_cur: Math.max(0, energia - sessao.energia) }).then(function(){
        var agora = Date.now();
        Promise.all([
          fbPatch(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid, { status:'ativa', inicio: agora }),
          fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { sessao_id: sid, convite_sid: null })
        ]).then(renderTreino);
      });
    });
  };

  document.querySelector('.q2recusar').onclick = function(){
    Promise.all([
      fbPut(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid + '/status', 'cancelada'),
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { convite_sid: null })
    ]).then(renderTreino);
  };
}

function renderTreinoAtivo(sid, sessao){
  document.getElementById('q2ativo').hidden = false;
  var parcNome = sessao.jogadorA === myUid ? sessao.nomeB : sessao.nomeA;
  document.getElementById('q2ativoparc').textContent = 'treinando com ' + parcNome + ' (' + sessao.duracao_h + 'h)';

  document.getElementById('q2encerrarbtn').onclick = function(){
    encerrarTreinoAntecipado(sid, sessao);
  };

  renderRodadaTreino(sid, sessao);

  var fim = sessao.inicio + sessao.duracao_h * 3600000;

  if(treinoCountdownTimer) clearInterval(treinoCountdownTimer);

  function tick(){
    var rest = Math.max(0, fim - Date.now());
    var restSec = Math.floor(rest / 1000);
    var hh = Math.floor(restSec / 3600), mm = Math.floor((restSec % 3600) / 60), ss = restSec % 60;
    document.getElementById('q2ativocountdown').textContent =
      String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');

    var pct = Math.min(100, ((sessao.duracao_h * 3600000 - rest) / (sessao.duracao_h * 3600000)) * 100);
    document.getElementById('q2ativobarra').style.width = pct + '%';

    if(rest <= 0){
      clearInterval(treinoCountdownTimer);
      processarFimTreino(sid, sessao, semanaAtual());
    }
  }

  tick();
  treinoCountdownTimer = setInterval(tick, 1000);
}


function creditarHorasParaUid(uid, horasCreditadas){
  var semana = semanaAtual();
  var dia = diaAtual();

  return fbGet(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + uid).then(function(dados){
    dados = dados || {};
    var horasSemanaAntes = (dados.semana === semana) ? (dados.horas_semana || 0) : 0;
    var horasSemanaDepois = horasSemanaAntes + horasCreditadas;
    var horasDiaAntes = (dados.dia === dia) ? (dados.horas_dia || 0) : 0;
    var horasDiaDepois = horasDiaAntes + horasCreditadas;

    return fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + uid, {
      semana: semana, horas_semana: horasSemanaDepois,
      dia: dia, horas_dia: horasDiaDepois
    }).then(function(){
      return horasSemanaDepois;
    });
  });
}

function mostrarTelaConcluido(sid, sessao, horasCreditadas, horasSemanaDepois){
  mostrarEstadoTreino('q2concluido');
  document.getElementById('q2concluidotxt').textContent =
    '+' + horasCreditadas.toFixed(1) + 'h registradas. ' + horasSemanaDepois.toFixed(1) + 'h no total esta semana.';
  document.getElementById('q2novotreinobtn').onclick = renderTreino;

  document.getElementById('q2resumolista').hidden = true;
  document.getElementById('q2resumobtn').textContent = 'ver resumo do treino';
  document.getElementById('q2resumobtn').onclick = function(){
    var lista = document.getElementById('q2resumolista');
    if(!lista.hidden){
      lista.hidden = true;
      document.getElementById('q2resumobtn').textContent = 'ver resumo do treino';
      return;
    }
    renderResumoTreino(sid, sessao);
  };
}

function renderResumoTreino(sid, sessao){
  var lista = document.getElementById('q2resumolista');
  lista.hidden = false;
  lista.innerHTML = 'carregando...';
  document.getElementById('q2resumobtn').textContent = 'esconder resumo';

  fbGet(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid + '/rodadas').then(function(rodadas){
    if(!rodadas){
      lista.innerHTML = 'nenhuma rodada foi jogada nesse treino.';
      return;
    }

    var souA = (myUid === sessao.jogadorA);
    var parcNome = souA ? sessao.nomeB : sessao.nomeA;

    var numeros = Object.keys(rodadas).map(Number).sort(function(a, b){ return a - b; });

    lista.innerHTML = numeros.map(function(n){
      var r = rodadas[n];
      if(!r || r.status !== 'resolvida' || !r.resultadoA || !r.resultadoB) return '';

      var meuResultado = souA ? r.resultadoA : r.resultadoB;
      var parcResultado = souA ? r.resultadoB : r.resultadoA;
      var minhaAcao = souA ? r.acaoA : r.acaoB;
      var acaoParceiro = souA ? r.acaoB : r.acaoA;
      var euVenci = vencedor(meuResultado, parcResultado);

      return '<div class="q2resumorodada">' +
        '<b>rodada ' + n + ':</b> você (' + escaparHtml(nomeAcaoPorId(minhaAcao)) + ', total ' + meuResultado.total + ')' +
        (euVenci ? ' venceu ' : ' perdeu para ') +
        escaparHtml(parcNome) + ' (' + escaparHtml(nomeAcaoPorId(acaoParceiro)) + ', total ' + parcResultado.total + ')' +
        '</div>';
    }).join('') || 'nenhuma rodada foi concluída nesse treino.';
  });
}

function processarFimTreino(sid, sessao, semana){
  creditarHorasParaUid(myUid, sessao.duracao_h).then(function(horasSemanaDepois){
    Promise.all([
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { sessao_id: null }),
      fbPut(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid + '/status', 'concluida')
    ]).then(function(){
      mostrarTelaConcluido(sid, sessao, sessao.duracao_h, horasSemanaDepois);
    });
  });
}

function encerrarTreinoAntecipado(sid, sessao){
  if(!confirm('Encerrar o treino antes da hora? Você e seu parceiro recebem crédito só pelo tempo já treinado.')) return;

  if(treinoCountdownTimer) clearInterval(treinoCountdownTimer);

  var elapsedMs = Date.now() - sessao.inicio;
  var horasCreditadas = Math.min(sessao.duracao_h, Math.max(0, parseFloat((elapsedMs / 3600000).toFixed(2))));

  Promise.all([
    creditarHorasParaUid(sessao.jogadorA, horasCreditadas),
    creditarHorasParaUid(sessao.jogadorB, horasCreditadas)
  ]).then(function(resultados){
    var minhaSemanaDepois = (myUid === sessao.jogadorA) ? resultados[0] : resultados[1];

    Promise.all([
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + myUid, { sessao_id: null }),
      fbPut(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid + '/status', 'concluida')
    ]).then(function(){
      mostrarTelaConcluido(sid, sessao, horasCreditadas, minhaSemanaDepois);
    });
  });
}

function atrapalharTreino(sid, sessao, semana){
  if(sessao.casaA && sessao.casaB && sessao.casaA === sessao.casaB){
    alert('Essa dupla é da mesma casa — não pode ser atrapalhada.');
    return;
  }

  fbGet(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid).then(function(s){
    var energia = s ? (s.energia_cur || 0) : 0;
    if(energia < QUAD_ATRAPALHAR_CUSTO){ alert('Energia insuficiente. Precisa de ' + QUAD_ATRAPALHAR_CUSTO + '.'); return; }

    Promise.all([
      fbGet(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + sessao.jogadorA),
      fbGet(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + sessao.jogadorB)
    ]).then(function(r){
      var dadosA = r[0] || {}, dadosB = r[1] || {};
      var hA = (dadosA.semana === semana) ? (dadosA.horas_semana || 0) : 0;
      var hB = (dadosB.semana === semana) ? (dadosB.horas_semana || 0) : 0;

      Promise.all([
        fbPatch(QUAD_FB_PERSONAGENS, '/status-perfil/' + myUid, { energia_cur: Math.max(0, energia - QUAD_ATRAPALHAR_CUSTO) }),
        fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + sessao.jogadorA, { horas_semana: Math.max(0, parseFloat((hA * (1 - QUAD_ATRAPALHAR_PENALIDADE)).toFixed(2))) }),
        fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + sessao.jogadorB, { horas_semana: Math.max(0, parseFloat((hB * (1 - QUAD_ATRAPALHAR_PENALIDADE)).toFixed(2))) })
      ]).then(function(){
        alert('Você atrapalhou o treino!');
        renderTreino();
      });
    });
  });
}

document.getElementById('q1ttrei').addEventListener('click', iniciarTreinoPoll);
document.getElementById('q1tcampo').addEventListener('click', pararTreinoPoll);
document.getElementById('q1tpart').addEventListener('click', pararTreinoPoll);
document.getElementById('q1tadm').addEventListener('click', pararTreinoPoll);

whenReady(function(){
  iniciarTreinoPoll();
});


function popularSelectCasas(sel){
  sel.innerHTML = QUAD_CASAS.map(function(c){ return '<option value="' + c + '">' + c + '</option>'; }).join('');
}

function slugNome(nome){
  return nome.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim().replace(/\s+/g, '_');
}

var editandoNpcId = null;

function iniciarPainelJogadores(){
  popularSelectCasas(document.getElementById('q5jogcasa'));
  renderListaJogadores();

  document.getElementById('q5jognpc').onchange = function(){
    var isNpc = this.checked;
    document.getElementById('q5jogtopo').hidden = isNpc;
    document.getElementById('q5jogpreview').hidden = isNpc;
    document.getElementById('q5jognpcnomerow').hidden = !isNpc;
    document.getElementById('q5jognpccampos').hidden = !isNpc;
  };

  document.getElementById('q5jogbuscar').onclick = function(){
    var uidRaw = document.getElementById('q5joguid').value.trim();
    if(!uidRaw){ alert('Informe o uid.'); return; }
    carregarFormularioJogador('u' + uidRaw);
  };

  document.getElementById('q5jogsalvar').onclick = salvarJogador;
  document.getElementById('q5joglimpar').onclick = limparFormularioJogador;

  document.getElementById('q5jogfoto').oninput = function(){
    var url = this.value.trim();
    document.getElementById('q5jogfotoprev').innerHTML = url ? '<img src="' + url + '">' : '';
  };
}

function limparFormularioJogador(){
  editandoNpcId = null;

  document.getElementById('q5jognpc').checked = false;
  document.getElementById('q5jogtopo').hidden = false;
  document.getElementById('q5jogpreview').hidden = false;
  document.getElementById('q5jognpcnomerow').hidden = true;
  document.getElementById('q5jognpccampos').hidden = true;

  document.getElementById('q5joguid').value = '';
  document.getElementById('q5jogpreview').textContent = '';
  document.getElementById('q5jognpcnome').value = '';
  document.getElementById('q5jogfoto').value = '';
  document.getElementById('q5jogfotoprev').innerHTML = '';
  document.getElementById('q5jogcasa').value = QUAD_CASAS[0];
  document.getElementById('q5jogpos').value = 'artilheiro';
  document.getElementById('q5jogcap').checked = false;
  document.getElementById('q5jogtit').checked = false;
  document.querySelectorAll('.q5esp').forEach(function(inp){ inp.value = 0; });

  document.getElementById('q5jognpcmaestpct').value = '';
  document.getElementById('q5jognpcvassnome').value = '';
  document.getElementById('q5jognpcvassbonus').value = 1;
  document.querySelectorAll('.q5npcattr').forEach(function(inp){ inp.value = 10; });

  document.getElementById('q5jogmsg').textContent = '';
}

function carregarFormularioNpc(id, cad){
  limparFormularioJogador();
  editandoNpcId = id;

  document.getElementById('q5jognpc').checked = true;
  document.getElementById('q5jognpc').onchange(); 

  document.getElementById('q5jognpcnome').value = cad.nome || '';
  document.getElementById('q5jogfoto').value = cad.foto || '';
  if(cad.foto) document.getElementById('q5jogfotoprev').innerHTML = '<img src="' + cad.foto + '">';

  document.getElementById('q5jogcasa').value = cad.casa || QUAD_CASAS[0];
  document.getElementById('q5jogpos').value = cad.posicao || 'artilheiro';
  document.getElementById('q5jogcap').checked = !!cad.capitao;
  document.getElementById('q5jogtit').checked = !!cad.titular;

  document.querySelectorAll('.q5esp').forEach(function(inp){
    var e = inp.dataset.esp;
    inp.value = (cad.especializacoes && cad.especializacoes[e] !== undefined) ? cad.especializacoes[e] : 0;
  });

  document.getElementById('q5jognpcmaestpct').value = cad.maestriaPct || 0;
  document.getElementById('q5jognpcvassnome').value = (cad.vassoura && cad.vassoura.nome) || '';
  document.getElementById('q5jognpcvassbonus').value = (cad.vassoura && cad.vassoura.bonus) || 1;

  document.querySelectorAll('.q5npcattr').forEach(function(inp){
    var a = inp.dataset.attr;
    inp.value = (cad.atributos && cad.atributos[a] !== undefined) ? cad.atributos[a] : 10;
  });

  document.getElementById('q5jogmsg').textContent = 'editando NPC "' + cad.nome + '" — altere os campos e clique em salvar.';
}

function carregarFormularioJogador(uid){
  limparFormularioJogador();
  document.getElementById('q5joguid').value = uid.replace(/^u/, '');

  Promise.all([
    fbGet(QUAD_FB_PARTIDAS, '/jogadores/' + uid),
    fbGet(QUAD_FB_PERSONAGENS, '/saldos/' + uid)
  ]).then(function(r){
    var cad = r[0];
    var saldo = r[1];

    document.getElementById('q5jogpreview').textContent = saldo && saldo.nome ? saldo.nome : (cad && cad.nome ? cad.nome : 'não encontrado');

    if(!cad){
      document.getElementById('q5jogmsg').textContent = 'jogador ainda não cadastrado no Quadribol — preencha e salve.';
      return;
    }

    document.getElementById('q5jogfoto').value = cad.foto || '';
    if(cad.foto) document.getElementById('q5jogfotoprev').innerHTML = '<img src="' + cad.foto + '">';

    document.getElementById('q5jogcasa').value = cad.casa || QUAD_CASAS[0];
    document.getElementById('q5jogpos').value = cad.posicao || 'artilheiro';
    document.getElementById('q5jogcap').checked = !!cad.capitao;
    document.getElementById('q5jogtit').checked = !!cad.titular;

    document.querySelectorAll('.q5esp').forEach(function(inp){
      var e = inp.dataset.esp;
      inp.value = (cad.especializacoes && cad.especializacoes[e] !== undefined) ? cad.especializacoes[e] : 0;
    });

    document.getElementById('q5jogmsg').textContent = 'cadastro carregado.';
  });
}

function salvarJogador(){
  var isNpc = document.getElementById('q5jognpc').checked;

  var especializacoes = {};
  document.querySelectorAll('.q5esp').forEach(function(inp){
    especializacoes[inp.dataset.esp] = parseInt(inp.value) || 0;
  });

  if(isNpc){
    var nomeNpc = document.getElementById('q5jognpcnome').value.trim();
    if(!nomeNpc){ alert('Informe o nome do NPC.'); return; }
    var id = 'npc_' + slugNome(nomeNpc);
    var idAntigo = editandoNpcId;

    var atributos = {};
    document.querySelectorAll('.q5npcattr').forEach(function(inp){
      atributos[inp.dataset.attr] = parseInt(inp.value) || 10;
    });

    var cadNpc = {
      nome: nomeNpc,
      isNpc: true,
      foto: document.getElementById('q5jogfoto').value.trim() || null,
      casa: document.getElementById('q5jogcasa').value,
      posicao: document.getElementById('q5jogpos').value,
      capitao: document.getElementById('q5jogcap').checked,
      titular: document.getElementById('q5jogtit').checked,
      especializacoes: especializacoes,
      atributos: atributos,
      vassoura: {
        nome: document.getElementById('q5jognpcvassnome').value.trim() || 'Vassoura Padrao de Hogwarts',
        bonus: parseInt(document.getElementById('q5jognpcvassbonus').value) || 1
      },
      maestriaPct: parseInt(document.getElementById('q5jognpcmaestpct').value) || 0
    };

    fbPut(QUAD_FB_PARTIDAS, '/jogadores/' + id, cadNpc).then(function(){
      if(idAntigo && idAntigo !== id){
        return fbDel(QUAD_FB_PARTIDAS, '/jogadores/' + idAntigo);
      }
    }).then(function(){
      editandoNpcId = id;
      document.getElementById('q5jogmsg').textContent = 'NPC salvo com sucesso!';
      renderListaJogadores();
      iniciarJogadoresPorCasa();
    });
  }else{
    var uidRaw = document.getElementById('q5joguid').value.trim();
    if(!uidRaw){ alert('Informe o uid antes de salvar.'); return; }
    var uid = 'u' + uidRaw;

    fbGet(QUAD_FB_PERSONAGENS, '/saldos/' + uid).then(function(saldo){
      if(!saldo || !saldo.nome){
        alert('Não foi possível encontrar o nome desse uid em /saldos. Confira o uid (clique em "buscar" antes de salvar).');
        return;
      }

      var cad = {
        nome: saldo.nome,
        isNpc: false,
        foto: document.getElementById('q5jogfoto').value.trim() || null,
        casa: document.getElementById('q5jogcasa').value,
        posicao: document.getElementById('q5jogpos').value,
        capitao: document.getElementById('q5jogcap').checked,
        titular: document.getElementById('q5jogtit').checked,
        especializacoes: especializacoes
      };

      fbPut(QUAD_FB_PARTIDAS, '/jogadores/' + uid, cad).then(function(){
        document.getElementById('q5jogpreview').textContent = saldo.nome;
        document.getElementById('q5jogmsg').textContent = 'salvo com sucesso!';
        renderListaJogadores();
        iniciarJogadoresPorCasa();
      });
    });
  }
}

function renderListaJogadores(){
  var lista = document.getElementById('q5joglista');
  lista.innerHTML = '<div class="qlbl">carregando...</div>';

  fbGet(QUAD_FB_PARTIDAS, '/jogadores').then(function(jogadores){
    if(!jogadores){
      lista.innerHTML = '<div class="qlbl">nenhum jogador cadastrado ainda.</div>';
      return;
    }

    lista.innerHTML = '';

    Object.keys(jogadores).forEach(function(id){
      var j = jogadores[id];
      var row = document.createElement('div');
      row.className = 'q5item';
      row.innerHTML =
        '<div class="q5itemnome">' + escaparHtml(j.nome) + (j.capitao ? ' <i class="fa fa-star"></i>' : '') + (j.isNpc ? ' <i class="fa fa-android"></i>' : '') + '</div>' +
        '<div class="q5itemmeta">' + emblemaCasa(j.casa) + escaparHtml(j.casa) + ' · ' + escaparHtml(j.posicao) + (j.titular ? ' · titular' : ' · reserva') + '</div>' +
        '<div class="q5itembtns">' +
          '<button type="button" class="q5btneditar" data-id="' + id + '">editar</button>' +
          '<button type="button" class="q5btnperigo" data-id="' + id + '">excluir</button>' +
        '</div>';
      lista.appendChild(row);
    });

    document.querySelectorAll('#q5joglista .q5btneditar').forEach(function(btn){
      btn.onclick = function(){
        var id = btn.dataset.id;
        var j = jogadores[id];
        if(!j) return;

        if(j.isNpc){
          carregarFormularioNpc(id, j);
        }else{
          carregarFormularioJogador(id);
        }

        var formTop = document.getElementById('q5jognpclabel');
        if(formTop) formTop.scrollIntoView({ behavior:'smooth', block:'start' });
      };
    });

    document.querySelectorAll('#q5joglista .q5btnperigo').forEach(function(btn){
      btn.onclick = function(){
        if(!confirm('Excluir esse cadastro?')) return;
        fbDel(QUAD_FB_PARTIDAS, '/jogadores/' + btn.dataset.id).then(function(){
          renderListaJogadores();
          iniciarJogadoresPorCasa();
        });
      };
    });
  });
}



function iniciarPainelComentaristas(){
  renderListaComentaristas();

  document.getElementById('q5combuscar').onclick = function(){
    var uidRaw = document.getElementById('q5comuid').value.trim();
    if(!uidRaw){ alert('Informe o uid.'); return; }
    var uid = 'u' + uidRaw;

    fbGet(QUAD_FB_PERSONAGENS, '/saldos/' + uid).then(function(saldo){
      document.getElementById('q5compreview').textContent = saldo && saldo.nome ? saldo.nome : 'uid não encontrado';
      document.getElementById('q5compreview').dataset.uid = uid;
      document.getElementById('q5compreview').dataset.nome = saldo && saldo.nome ? saldo.nome : '';
    });
  };

  document.getElementById('q5comsalvar').onclick = function(){
    var preview = document.getElementById('q5compreview');
    var uid = preview.dataset.uid;
    var nome = preview.dataset.nome;

    if(!uid || !nome){
      alert('Busque um uid válido antes de cadastrar.');
      return;
    }

    fbPut(QUAD_FB_PARTIDAS, '/comentaristas/' + uid, {
      uid: uid, nome: nome, cadastrado_em: Date.now()
    }).then(function(){
      document.getElementById('q5commsg').textContent = nome + ' cadastrado como comentarista!';
      document.getElementById('q5comuid').value = '';
      preview.textContent = '';
      preview.dataset.uid = '';
      preview.dataset.nome = '';
      renderListaComentaristas();
    });
  };
}

function renderListaComentaristas(){
  var lista = document.getElementById('q5comlista');
  lista.innerHTML = '<div class="qlbl">carregando...</div>';

  fbGet(QUAD_FB_PARTIDAS, '/comentaristas').then(function(comentaristas){
    if(!comentaristas){
      lista.innerHTML = '<div class="qlbl">nenhum comentarista cadastrado ainda.</div>';
      return;
    }

    lista.innerHTML = '';

    Object.keys(comentaristas).forEach(function(uid){
      var c = comentaristas[uid];
      var row = document.createElement('div');
      row.className = 'q5item';
      row.innerHTML =
        '<div class="q5itemnome"><i class="fa fa-microphone"></i> ' + escaparHtml(c.nome) + '</div>' +
        '<div class="q5itemmeta">' + uid + '</div>' +
        '<button type="button" class="q5btnperigo" data-uid="' + uid + '">excluir</button>';
      lista.appendChild(row);
    });

    document.querySelectorAll('#q5comlista .q5btnperigo').forEach(function(btn){
      btn.onclick = function(){
        if(!confirm('Remover esse comentarista?')) return;
        fbDel(QUAD_FB_PARTIDAS, '/comentaristas/' + btn.dataset.uid).then(renderListaComentaristas);
      };
    });
  });
}



var casaSelecionadaPainel = null;

function iniciarJogadoresPorCasa(){
  var nav = document.getElementById('q4casasnav');
  if(!nav) return;

  nav.innerHTML = QUAD_CASAS.map(function(c){
    return '<button type="button" class="q5casatab" data-casa="' + c + '">' + emblemaCasa(c) + escaparHtml(c) + '</button>';
  }).join('');

  if(!casaSelecionadaPainel) casaSelecionadaPainel = QUAD_CASAS[0];

  document.querySelectorAll('#q4casasnav .q5casatab').forEach(function(btn){
    if(btn.dataset.casa === casaSelecionadaPainel) btn.classList.add('on');
    btn.onclick = function(){
      casaSelecionadaPainel = btn.dataset.casa;
      document.querySelectorAll('#q4casasnav .q5casatab').forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      renderJogadoresDaCasa(casaSelecionadaPainel);
    };
  });

  renderJogadoresDaCasa(casaSelecionadaPainel);
}

function renderJogadoresDaCasa(casa){
  var lista = document.getElementById('q4casaslista');
  if(!lista) return;
  lista.innerHTML = '<div class="qlbl">carregando...</div>';

  var POS_ABREV_CASA = { artilheiro:'Artilheiro', batedor:'Batedor', goleiro:'Goleiro', apanhador:'Apanhador' };

  fbGet(QUAD_FB_PARTIDAS, '/jogadores').then(function(jogadores){
    jogadores = jogadores || {};

    var todos = Object.keys(jogadores)
      .map(function(uid){ return Object.assign({ uid:uid }, jogadores[uid]); })
      .filter(function(j){ return j.casa === casa; })
      .sort(function(a, b){ return (b.titular ? 1 : 0) - (a.titular ? 1 : 0); });

    lista.innerHTML = '';

    if(!todos.length){
      lista.innerHTML = '<div class="q5casavazio">ninguém cadastrado nessa casa ainda.</div>';
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'q5casagrid';

    var painelCasas = document.getElementById('q4casas');
    var cores = QUAD_CORES_CASAS[casa];
    if(painelCasas){
      if(cores){
        painelCasas.style.setProperty('--casa-stroke', cores.stroke);
        painelCasas.style.setProperty('--casa-texto', cores.texto);
        painelCasas.style.setProperty('--casa-fill', cores.fill);
      }else{
        painelCasas.style.removeProperty('--casa-stroke');
        painelCasas.style.removeProperty('--casa-texto');
        painelCasas.style.removeProperty('--casa-fill');
      }
    }

    todos.forEach(function(j){
      var fotoHtml = j.foto
        ? '<div class="q5cardfoto"><img src="' + j.foto + '"></div>'
        : '<div class="q5cardfoto q5cardfotovazia"><i class="fa fa-user"></i></div>';

      var card = document.createElement('div');
      card.className = 'q5card' + (j.titular ? '' : ' reserva');
      card.innerHTML =
        (j.capitao ? '<i class="fa fa-star q5cardcap"></i>' : '') +
        fotoHtml +
        '<div class="q5cardnome">' + escaparHtml(j.nome) + '</div>' +
        '<div class="q5cardpos">' + (POS_ABREV_CASA[j.posicao] || j.posicao) + '</div>' +
        '<div class="q5cardtag">' + (j.titular ? 'titular' : 'reserva') + '</div>';

      grid.appendChild(card);
    });

    lista.appendChild(grid);
  });
}


var SLOTS_LABEL_CRIAR = {
  artilheiro1: 'Artilheiro 1', artilheiro2: 'Artilheiro 2',
  batedor: 'Batedor', goleiro: 'Goleiro', apanhador: 'Apanhador'
};

var SLOT_POS_BASE = {
  artilheiro1: 'artilheiro', artilheiro2: 'artilheiro',
  batedor: 'batedor', goleiro: 'goleiro', apanhador: 'apanhador'
};

function iniciarPainelCriar(){
  popularSelectCasas(document.getElementById('q5casaa'));
  popularSelectCasas(document.getElementById('q5casab'));
  document.getElementById('q5casab').value = QUAD_CASAS[1] || QUAD_CASAS[0];

  document.getElementById('q5casaa').onchange = function(){ montarSlotsCriar('A'); };
  document.getElementById('q5casab').onchange = function(){ montarSlotsCriar('B'); };

  montarSlotsCriar('A');
  montarSlotsCriar('B');

  document.getElementById('q5criarbtn').onclick = criarPartidaDoAdmin;
}

function montarSlotsCriar(lado){
  var casa = document.getElementById('q5casa' + lado.toLowerCase()).value;
  var container = document.getElementById('q5slots' + lado.toLowerCase());

  fbGet(QUAD_FB_PARTIDAS, '/jogadores').then(function(jogadores){
    jogadores = jogadores || {};

    container.innerHTML = '';

    POSICOES.forEach(function(posSlot){
      var posBase = SLOT_POS_BASE[posSlot];

      var candidatos = Object.keys(jogadores)
        .map(function(id){ return Object.assign({ id:id }, jogadores[id]); })
        .filter(function(j){ return j.casa === casa && j.posicao === posBase; })
        .sort(function(a, b){ return (b.titular ? 1 : 0) - (a.titular ? 1 : 0); });

      var row = document.createElement('div');
      row.className = 'q3row';

      var opts = '<option value="">-- selecione --</option>';
      candidatos.forEach(function(c){
        opts += '<option value="' + c.id + '">' + escaparHtml(c.nome) +
          (c.titular ? '' : ' (reserva)') + (c.isNpc ? ' [NPC]' : '') + (c.capitao ? ' ★' : '') + '</option>';
      });

      row.innerHTML = '<i class="fa fa-shield"></i><select data-slot="' + posSlot + '" class="q5slotsel' + lado + '">' + opts + '</select>';
      container.appendChild(row);

      var lbl = document.createElement('div');
      lbl.className = 'qlbl';
      lbl.style.marginTop = '-6px';
      lbl.style.marginBottom = '8px';
      lbl.textContent = SLOTS_LABEL_CRIAR[posSlot];
      container.insertBefore(lbl, row);
    });
  });
}

function criarPartidaDoAdmin(){
  var casaA = document.getElementById('q5casaa').value;
  var casaB = document.getElementById('q5casab').value;

  if(casaA === casaB){ alert('As duas casas precisam ser diferentes.'); return; }

  fbGet(QUAD_FB_PARTIDAS, '/jogadores').then(function(jogadores){
    jogadores = jogadores || {};

    function montarTime(lado){
      var slots = {};
      var ids = {};
      var erro = null;

      POSICOES.forEach(function(pos){
        var sel = document.querySelector('.q5slotsel' + lado + '[data-slot="' + pos + '"]');
        var id = sel ? sel.value : '';
        if(!id){ erro = 'Falta escolher ' + SLOTS_LABEL_CRIAR[pos] + ' do time ' + lado + '.'; return; }
        if(ids[id]){ erro = 'O mesmo jogador foi escolhido duas vezes no time ' + lado + '.'; return; }
        ids[id] = true;

        var cad = jogadores[id];
        if(!cad){ erro = 'Cadastro não encontrado para ' + id; return; }

        if(cad.isNpc){
          slots[pos] = {
            uid: 'npc',
            nome: cad.nome,
            capitao: !!cad.capitao,
            confirmado: true,
            foto: cad.foto || null,
            atributos: cad.atributos || {},
            vassoura: cad.vassoura || { nome:'Vassoura Padrao de Hogwarts', bonus:1 },
            maestria: {
              quadribol: cad.maestriaPct || 0,
              artilheiro: (cad.especializacoes && cad.especializacoes.artilheiro) || 0,
              defesa: (cad.especializacoes && cad.especializacoes.defesa) || 0,
              manobras: (cad.especializacoes && cad.especializacoes.manobras) || 0,
              pomo: (cad.especializacoes && cad.especializacoes.pomo) || 0
            }
          };
        }else{
          slots[pos] = {
            uid: id,
            nome: cad.nome,
            capitao: !!cad.capitao,
            confirmado: false,
            foto: cad.foto || null
          };
        }
      });

      return { slots: slots, erro: erro };
    }

    var timeA = montarTime('A');
    if(timeA.erro){ alert(timeA.erro); return; }
    var timeB = montarTime('B');
    if(timeB.erro){ alert(timeB.erro); return; }

    var temCapA = Object.values(timeA.slots).some(function(s){ return s.capitao; });
    var temCapB = Object.values(timeB.slots).some(function(s){ return s.capitao; });

    if(!temCapA){ alert('Nenhum jogador do time ' + casaA + ' está marcado como capitão no cadastro.'); return; }
    if(!temCapB){ alert('Nenhum jogador do time ' + casaB + ' está marcado como capitão no cadastro.'); return; }

    var novoPid = 'p' + Date.now();
    var match = {
      status: 'aguardando',
      fase_atual: 1,
      turno_idx: 0,
      pomo_fase: QUAD_POMO_MIN + Math.floor(Math.random() * (QUAD_POMO_MAX - QUAD_POMO_MIN + 1)),
      pomo_capturado: false,
      times: {
        A: { nome: casaA, placar: 0, postura: null, slots: timeA.slots },
        B: { nome: casaB, placar: 0, postura: null, slots: timeB.slots }
      },
      fases: {}
    };

    Promise.all([
      fbPut(QUAD_FB_PARTIDAS, '/partidas/' + novoPid, match),
      fbPut(QUAD_FB_PARTIDAS, '/partida_ativa', { pid: novoPid, status: 'aguardando' })
    ]).then(function(){
      alert('Partida criada!');
      pid = novoPid;
      document.getElementById('q1tcampo').click();
      boot();
    });
  });
}


function iniciarPainelTreinosAdmin(){
  renderTreinosAdmin();
}

function renderTreinosAdmin(){
  fbGet(QUAD_FB_PARTIDAS, '/treinos/sessoes').then(function(sessoes){
    sessoes = sessoes || {};

    var ativas = document.getElementById('q5treiativas');
    var hist = document.getElementById('q5treihist');
    ativas.innerHTML = '';
    hist.innerHTML = '';

    var listaSessoes = Object.keys(sessoes).map(function(sid){
      return Object.assign({ sid:sid }, sessoes[sid]);
    }).sort(function(a, b){ return (b.inicio || b.criado_em || 0) - (a.inicio || a.criado_em || 0); });

    var temAtiva = false, temHist = false;

    listaSessoes.forEach(function(s){
      var data = new Date(s.inicio || s.criado_em);
      var dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

      if(s.status === 'ativa'){
        temAtiva = true;
        var row = document.createElement('div');
        row.className = 'q5treirow';
        row.innerHTML =
          '<div class="q5treinomes">' + escaparHtml(s.nomeA) + ' × ' + escaparHtml(s.nomeB) + '</div>' +
          '<div class="q5treimeta">' + s.duracao_h + 'h — iniciado ' + dataStr + '</div>' +
          '<button type="button" class="q5btnperigo" data-sid="' + s.sid + '">forçar encerrar</button>';
        ativas.appendChild(row);
      }else if(s.status === 'concluida'){
        temHist = true;
        var row2 = document.createElement('div');
        row2.className = 'q5treirow';
        row2.innerHTML =
          '<div class="q5treinomes">' + escaparHtml(s.nomeA) + ' × ' + escaparHtml(s.nomeB) + '</div>' +
          '<div class="q5treimeta">' + s.duracao_h + 'h — ' + dataStr + '</div>';
        hist.appendChild(row2);
      }
    });

    if(!temAtiva) ativas.innerHTML = '<div class="qlbl">nenhuma sessão ativa agora.</div>';
    if(!temHist) hist.innerHTML = '<div class="qlbl">nenhum treino concluído ainda.</div>';

    document.querySelectorAll('#q5treiativas .q5btnperigo').forEach(function(btn){
      btn.onclick = function(){
        if(!confirm('Forçar encerrar essa sessão? A energia gasta será devolvida.')) return;
        forcarEncerrarSessao(btn.dataset.sid, sessoes[btn.dataset.sid]);
      };
    });
  });

  fbGet(QUAD_FB_PARTIDAS, '/treinos/drops').then(function(drops){
    var el = document.getElementById('q5treidrops');
    el.innerHTML = '';

    if(!drops){
      el.innerHTML = '<div class="qlbl">nenhum drop registrado ainda.</div>';
      return;
    }

    var lista = Object.values(drops).sort(function(a, b){ return (b.data || 0) - (a.data || 0); });

    lista.forEach(function(d){
      var data = new Date(d.data);
      var dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

      var row = document.createElement('div');
      row.className = 'q5treirow';
      row.innerHTML =
        '<div class="q5treinomes">' + escaparHtml(d.nome) + '</div>' +
        '<div class="q5treimeta">' + dataStr + '</div>';
      el.appendChild(row);
    });
  });
}

function forcarEncerrarSessao(sid, sessao){
  Promise.all([
    fbGet(QUAD_FB_PERSONAGENS, '/status-perfil/' + sessao.jogadorA),
    fbGet(QUAD_FB_PERSONAGENS, '/status-perfil/' + sessao.jogadorB)
  ]).then(function(r){
    var proms = [
      fbPut(QUAD_FB_PARTIDAS, '/treinos/sessoes/' + sid + '/status', 'cancelada_admin'),
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + sessao.jogadorA, { sessao_id: null }),
      fbPatch(QUAD_FB_PARTIDAS, '/treinos/jogadores/' + sessao.jogadorB, { sessao_id: null })
    ];

    if(r[0]) proms.push(fbPatch(QUAD_FB_PERSONAGENS, '/status-perfil/' + sessao.jogadorA, { energia_cur: (r[0].energia_cur || 0) + sessao.energia }));
    if(r[1]) proms.push(fbPatch(QUAD_FB_PERSONAGENS, '/status-perfil/' + sessao.jogadorB, { energia_cur: (r[1].energia_cur || 0) + sessao.energia }));

    Promise.all(proms).then(renderTreinosAdmin);
  });
}


document.querySelectorAll('.q5tab').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.q5tab').forEach(function(b){ b.classList.remove('on'); });
    document.querySelectorAll('.q5sub').forEach(function(s){ s.hidden = true; });

    btn.classList.add('on');
    var alvo = document.getElementById(btn.dataset.alvo);
    if(alvo) alvo.hidden = false;

    if(btn.dataset.alvo === 'q5criar') iniciarPainelCriar();
    if(btn.dataset.alvo === 'q5trei') iniciarPainelTreinosAdmin();
    if(btn.dataset.alvo === 'q5hist') renderHistorico('q5histlista');
    if(btn.dataset.alvo === 'q5jog') iniciarPainelJogadores();
    if(btn.dataset.alvo === 'q5com') iniciarPainelComentaristas();
  });
});

document.getElementById('q1tadm').addEventListener('click', function(){
  iniciarPainelCriar(); 
});


var ATTR_LABEL = {
  forca:'Força', resistencia:'Resistência', agilidade:'Agilidade', destreza:'Destreza',
  sabedoria:'Sabedoria', carisma:'Carisma', inteligencia:'Inteligência', determinacao:'Determinação'
};

function abrirFicha(match, time, pos){
  var slot = match.times[time].slots[pos];
  if(!slot) return;

  var modal = document.getElementById('q3fichamodal');

  document.getElementById('q3fichanome').textContent = slot.nome;
  document.getElementById('q3fichapos').innerHTML = escaparHtml(POS_LABEL[pos]) + ' — ' + nomeCasaComEmblema(match.times[time].nome);

  var fotoBox = document.getElementById('q3fichafoto');
  fotoBox.innerHTML = slot.foto ? '<img src="' + slot.foto + '">' : '';

  var attrsBox = document.getElementById('q3fichaattrs');
  var atributos = slot.atributos || {};
  attrsBox.innerHTML = Object.keys(ATTR_LABEL).map(function(a){
    return '<div class="q3fichaattr"><b>' + (atributos[a] !== undefined ? atributos[a] : '-') + '</b>' + ATTR_LABEL[a] + '</div>';
  }).join('');

  var maest = slot.maestria || {};
  document.getElementById('q3fichamaest').textContent =
    'Quadribol: ' + (maest.quadribol || 0) + '% · Artilharia ' + (maest.artilheiro || 0) +
    ' · Defesa ' + (maest.defesa || 0) + ' · Manobras ' + (maest.manobras || 0) + ' · Pomo ' + (maest.pomo || 0);

  var vass = slot.vassoura || { nome:'Vassoura Padrao de Hogwarts', bonus:1 };
  document.getElementById('q3fichavass').textContent = vass.nome + ' (+' + vass.bonus + ')';

  modal.hidden = false;
}

document.getElementById('q3fichafechar').addEventListener('click', function(){
  document.getElementById('q3fichamodal').hidden = true;
});