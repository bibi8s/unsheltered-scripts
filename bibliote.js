(function(){

/* ===================== CONFIG ===================== */
var DB = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
var B_CONFIG = window.B_CONFIG || { hora_abertura: 6, hora_fechamento: 23 };
var ADMINS = ['1'];

/* ===================== MESAS ===================== */
var MESAS = [
  { id: 'central',  label: 'Mesa Central',          limite: 0, buff: null,       cor: 'cinza',   desc: 'Sem bônus',               energia: 5 },
  { id: 'corredor', label: 'Mesa do Corredor',       limite: 5, buff: 'corredor', cor: 'laranja', desc: '+5% horas estudadas',      energia: 5 },
  { id: 'fundo',    label: 'Mesa do Fundo',          limite: 3, buff: 'fundo',    cor: 'azul',    desc: 'Imune a atrapalhar',       energia: 5 },
  { id: 'janela',   label: 'Mesa perto da Janela',   limite: 3, buff: 'janela',   cor: 'amarelo', desc: '-1 energia/hora',          energia: 4 },
  { id: 'banheiro', label: 'Mesa perto do Banheiro', limite: 2, buff: 'banheiro', cor: 'verde',   desc: '-4% horas · atrapalhar 5', energia: 5 }
];

/* ===================== MARCOS ===================== */
var MARCOS = [
  { horas: 12,  recompensas: [{ nome: '✦ Pontos da Casa +5',  descricao: 'Conquistado por 12h de estudo.', categoria: 'Off-Game', valor: 0 }] },
  { horas: 24,  recompensas: [{ nome: '✦ Pontos da Casa +5',  descricao: 'Conquistado por 24h de estudo.', categoria: 'Off-Game', valor: 0 }] },
  { horas: 42,  recompensas: [{ nome: '✦ Pontos da Casa +5',  descricao: 'Conquistado por 42h de estudo.', categoria: 'Off-Game', valor: 0 }] },
  { horas: 70,  recompensas: [{ nome: '✦ Pontos da Casa +10', descricao: 'Conquistado por 70h de estudo.', categoria: 'Off-Game', valor: 0 }] },
  { horas: 80,  recompensas: [{ nome: '✦ Pontos da Casa +10', descricao: 'Conquistado por 80h de estudo.', categoria: 'Off-Game', valor: 0 }] },
  { horas: 100, recompensas: [
    { nome: '✦ Pontos da Casa +15',  descricao: 'Conquistado por 100h de estudo.', categoria: 'Off-Game', valor: 0 },
    { nome: '✦ Atributo Resgatável', descricao: '+1 em INT, SAB ou DET.',           categoria: 'Off-Game', valor: 0 }
  ]}
];

/* ===================== ENERGIA ===================== */
var ENERGIA_BASE = { central: 5, corredor: 5, fundo: 5, janela: 4, banheiro: 5 };

/* ===================== FIREBASE ===================== */
function dbGet(p)      { return fetch(DB + p + '.json').then(function(r){ return r.json(); }); }
function dbPut(p, d)   { return fetch(DB + p + '.json', { method: 'PUT',   body: JSON.stringify(d) }); }
function dbPatch(p, d) { return fetch(DB + p + '.json', { method: 'PATCH', body: JSON.stringify(d) }); }
function dbPost(p, d)  { return fetch(DB + p + '.json', { method: 'POST',  body: JSON.stringify(d) }); }
function fkey(uid)     { return 'u' + String(uid).replace(/^u/i, ''); }

/* ===================== USUARIO ===================== */
function getUser() {
  if (typeof _userdata !== 'undefined' && _userdata && _userdata.user_id)
    return { uid: String(_userdata.user_id).trim(), nome: _userdata.username || '', logado: true };
  return { logado: false };
}
function isAdmin(uid) { return ADMINS.indexOf(String(uid)) !== -1; }

/* ===================== UTILS ===================== */
function mesAtual() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function diaAtual() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function fmtHoras(h) {
  h = Math.max(0, h || 0);
  var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? hh + 'h' + String(mm).padStart(2,'0') : hh + 'h';
}
function fmtData(ts) {
  var d = new Date(ts);
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}
function fmtDataISO(ts) {
  var d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function descontoEnergia(det, custo) {
  return Math.max(0, custo - Math.floor((det / 25) * 2));
}

/* ===================== MODAL ===================== */
function abrirModal(conteudo) {
  var m = document.getElementById('bibmod');
  if (m) m.remove();
  var div = document.createElement('div');
  div.id = 'bibmod';
  div.innerHTML = '<div id="bibmodbox">' + conteudo + '</div>';
  document.getElementById('bibliobx1').appendChild(div);
  div.addEventListener('click', function(e){ if (e.target === div) div.remove(); });
}
function fecharModal() {
  var m = document.getElementById('bibmod');
  if (m) m.remove();
}

/* ===================== ENTRADA ===================== */
function esconderEntrada() {
  var ov  = document.getElementById('overlay');
  var btn = document.getElementById('btnbib');
  if (ov)  ov.style.display  = 'none';
  if (btn) btn.style.display = 'none';
}
function mostrarEntrada() {
  var ov  = document.getElementById('overlay');
  var btn = document.getElementById('btnbib');
  if (ov)  ov.style.display  = 'block';
  if (btn) btn.style.display = 'block';
}

function abrirEntrada(user) {
  dbGet('/biblioteca/acesso/geral/' + fkey(user.uid)).then(function(acesso) {
    if (!acesso && !isAdmin(user.uid)) {
      abrirModal('<p id="bibmsg">Você não tem permissão para entrar na biblioteca.</p>');
      return;
    }
    Promise.all([
      dbGet('/biblioteca/ativas'),
      dbGet('/inventario/' + fkey(user.uid)),
      dbGet('/atributos/' + fkey(user.uid)),
      dbGet('/status-perfil/' + fkey(user.uid)),
      dbGet('/biblioteca/vagas-banheiro/' + diaAtual()),
      dbGet('/biblioteca/mesa-hoje/' + diaAtual() + '/' + fkey(user.uid))
    ]).then(function(res) {
      var ativas        = res[0] || {};
      var inv           = res[1] || {};
      var at            = res[2] || {};
      var perfil        = res[3] || {};
      var vagasBanheiro = res[4] || 0;
      var mesaHoje      = res[5] || null;
      var det           = at.determinacao || 0;
      var energiaAtual  = perfil.energia_cur || 0;

      var livros = Object.values(inv)
        .filter(function(it){ return it && it.categoria === 'Livros' && it.nome; })
        .map(function(it){ return it.nome; });

      var mesaSel  = null;
      var horasSel = null;

      var mesasHtml = MESAS.map(function(m) {
        var ocu   = Object.values(ativas).filter(function(s){ return s && s.mesa_id === m.id; }).length;
        var cheio = m.limite > 0 && ocu >= m.limite;
        if (m.id === 'banheiro') cheio = vagasBanheiro >= 2;
        var bloqueado         = mesaHoje && mesaHoje !== m.id && mesaHoje === 'banheiro';
        var bloqueadoBanheiro = m.id === 'banheiro' && mesaHoje && mesaHoje !== 'banheiro';
        var disabled = cheio || bloqueado || bloqueadoBanheiro;
        return '<button class="btnmesa' + (disabled ? ' cheio' : '') + '" data-id="' + m.id + '"' + (disabled ? ' disabled' : '') + '>' +
          m.label + '<small>' + m.desc + '</small>' +
        '</button>';
      }).join('');

      var livrosHtml = '<option value="">Nenhum</option>' +
        livros.map(function(l){ return '<option value="' + l + '">' + l + '</option>'; }).join('');

      var horasHtml = [1,2,3,4,5,6].map(function(h){
        return '<button class="btnhora" data-horas="' + h + '">' + h + 'h</button>';
      }).join('');

      abrirModal(
        '<div id="modent">' +
          '<div id="modmesas"><p>Mesa</p>' + mesasHtml + '</div>' +
          '<div id="modlivro"><p>Livro</p><select id="selvlivro">' + livrosHtml + '</select></div>' +
          '<div id="modhoras"><p>Horas</p>' + horasHtml + '</div>' +
          '<div id="modinfo"><span id="infomesa">—</span> · <span id="infoenergia">—</span></div>' +
          '<button id="btnentrar">Entrar</button>' +
        '</div>'
      );

      function atualizarInfo() {
        if (!mesaSel || !horasSel) return;
        var mesa  = MESAS.filter(function(m){ return m.id === mesaSel; })[0];
        var custo = descontoEnergia(det, ENERGIA_BASE[mesaSel] * horasSel);
        document.getElementById('infomesa').textContent    = mesa.label + ' · ' + mesa.desc;
        document.getElementById('infoenergia').textContent = '-' + custo + ' energia (você tem ' + energiaAtual + ')';
      }

      document.querySelectorAll('.btnmesa').forEach(function(btn) {
        btn.addEventListener('click', function() {
          document.querySelectorAll('.btnmesa').forEach(function(b){ b.classList.remove('sel'); });
          btn.classList.add('sel');
          mesaSel = btn.dataset.id;
          atualizarInfo();
        });
      });

      document.querySelectorAll('.btnhora').forEach(function(btn) {
        btn.addEventListener('click', function() {
          document.querySelectorAll('.btnhora').forEach(function(b){ b.classList.remove('sel'); });
          btn.classList.add('sel');
          horasSel = parseInt(btn.dataset.horas);
          atualizarInfo();
        });
      });

      document.getElementById('btnentrar').addEventListener('click', function() {
        if (!mesaSel || !horasSel) { alert('Escolha uma mesa e o tempo de estudo.'); return; }
        var mesa  = MESAS.filter(function(m){ return m.id === mesaSel; })[0];
        var custo = descontoEnergia(det, ENERGIA_BASE[mesaSel] * horasSel);
        var livro = document.getElementById('selvlivro').value || null;
        if (energiaAtual < custo) { alert('Energia insuficiente!'); return; }

        var agora  = Date.now();
        var sessao = {
          uid:        user.uid,
          nome:       user.nome,
          inicio_em:  agora,
          termina_em: agora + horasSel * 3600000,
          mesa_id:    mesa.id,
          mesa_label: mesa.label,
          mesa_cor:   mesa.cor,
          livro:      livro,
          status:     'Estudando'
        };

        var promessas = [
          dbPut('/biblioteca/ativas/' + fkey(user.uid), sessao),
          dbPatch('/status-perfil/' + fkey(user.uid), { energia_cur: energiaAtual - custo }),
          dbPut('/biblioteca/mesa-hoje/' + diaAtual() + '/' + fkey(user.uid), mesa.id)
        ];
        if (mesa.id === 'banheiro') {
          promessas.push(dbPut('/biblioteca/vagas-banheiro/' + diaAtual(), (vagasBanheiro + 1)));
        }
        Promise.all(promessas).then(function() {
          fecharModal();
          esconderEntrada();
          renderSidebar(user, sessao, at);
          carregarBiblioteca(user);
iniciarCrono(agora, agora + horasSel * 3600000, user);
        });
      });
    });
  });
}

/* ===================== SIDEBAR ===================== */
function renderSidebar(user, sessao, atributos) {
  var el = document.getElementById('bibside');
  if (!el) return;

  var at       = atributos || {};
  var int      = at.inteligencia || 0;
  var det      = at.determinacao || 0;
  var sab      = at.sabedoria    || 0;
  var bonusInt = Math.round((int / 25) * 20);
  var descDet  = Math.floor((det / 25) * 2);
  var bonusSab = Math.round((sab / 25) * 15);

  dbGet('/biblioteca/progresso/' + fkey(user.uid) + '/' + mesAtual()).then(function(prog) {
    prog = prog || { horas_efetivas: 0, marcos_resgatados: [] };
    var total      = prog.horas_efetivas    || 0;
    var resgatados = prog.marcos_resgatados || [];
    var proximo    = MARCOS.filter(function(m){ return resgatados.indexOf(m.horas) === -1 && total < m.horas; })[0];

    var bonusSessao = 0;
    if (sessao) {
      var bMesa  = sessao.mesa_id === 'corredor' ? 5 : sessao.mesa_id === 'banheiro' ? -4 : 0;
      var bDupla = sessao.bonus_dupla ? 5 : 0;
      var bInt   = Math.round((sessao.bonus_interacoes || 0) * 100);
      bonusSessao = bMesa + bDupla + bInt;
    }

    var livroHtml = sessao
      ? '<div id="sidelivro">' +
          (sessao.livro ? '<span class="sidelabel">Lendo</span><span class="sidelivronome">' + sessao.livro + '</span>' : '') +
          (bonusSessao !== 0
            ? '<span class="sidelabel">Bônus atual</span><span class="sidebonus">' + (bonusSessao > 0 ? '+' : '') + bonusSessao + '% horas efetivas</span>'
            : '') +
        '</div>'
      : '';

    var progressoHtml =
      '<div id="sideprog">' +
        '<div class="sidebloco">' +
          '<span class="sidelabel">Horas este mês</span>' +
          '<span class="sideval">' + fmtHoras(total) + '</span>' +
        '</div>' +
        (proximo
          ? '<div class="sidebloco">' +
              '<span class="sidelabel">Próximo marco</span>' +
              '<span class="sideval">' + fmtHoras(proximo.horas) + '</span>' +
              '<div class="marcobarra"><span style="width:' + Math.min(100, Math.round((total / proximo.horas) * 100)) + '%"></span></div>' +
            '</div>'
          : '<div class="sidebloco"><span class="sidelabel">Todos os marcos conquistados!</span></div>') +
      '</div>';

    el.innerHTML =
      '<div id="sideatribs">' +
        '<div class="sidebloco">' +
          '<span class="sidelabel">Inteligência</span>' +
          '<span class="sideval">' + int + '</span>' +
          '<span class="sidebonus">+' + bonusInt + '% horas efetivas</span>' +
        '</div>' +
        '<div class="sidebloco">' +
          '<span class="sidelabel">Determinação</span>' +
          '<span class="sideval">' + det + '</span>' +
          '<span class="sidebonus">-' + descDet + ' energia/hora</span>' +
        '</div>' +
        '<div class="sidebloco">' +
          '<span class="sidelabel">Sabedoria</span>' +
          '<span class="sideval">' + sab + '</span>' +
          '<span class="sidebonus">+' + bonusSab + '% em buffs recebidos</span>' +
        '</div>' +
      '</div>' +
      progressoHtml +
      livroHtml +
      '<div id="sideandares">' +
        '<button class="btnand" id="btnsair"><i class="fa-solid fa-right-from-bracket"></i> Sair da Biblioteca</button>' +
        '<button class="btnand" id="btand2"><i class="fa-solid fa-door-open"></i> Sessão Restrita</button>' +
        '<button class="btnand" id="btand3"><i class="fa-solid fa-stairs"></i> Andar Inferior</button>' +
      '</div>';

    var bs = document.getElementById('btnsair');
    if (bs) bs.addEventListener('click', function(){
      if (!confirm('Sair da biblioteca? Suas horas serão registradas.')) return;
      encerrarSessao(user);
    });
    document.getElementById('btand2').addEventListener('click', function(){ irParaAndar(2, user); });
    document.getElementById('btand3').addEventListener('click', function(){ irParaAndar(3, user); });
  });
}

/* ===================== ANDARES ===================== */
function irParaAndar(num, user) {
  if (num === 2) {
    dbGet('/biblioteca/acesso/restrita/' + fkey(user.uid)).then(function(acesso){
      if (!acesso && !isAdmin(user.uid)) {
        abrirModal('<p id="bibmsg">Você não tem acesso à sessão restrita.</p>');
        return;
      }
      trocarAndar(2);
      renderSessaoRestrita(user);
    });
  } else if (num === 3) {
    dbGet('/atributos/' + fkey(user.uid)).then(function(at){
      at = at || {};
      if ((at.resistencia || 0) < 10 || (at.sabedoria || 0) < 5) {
var m = document.getElementById('bibmod');
if (m) m.remove();
var div = document.createElement('div');
div.id = 'bibmod';
div.innerHTML = '<div id="modbloqueado"><p>Você precisa de Resistência +10 e Sabedoria +5 para acessar o andar inferior da sessão restrita.</p></div>';
document.getElementById('bibliobx1').appendChild(div);
div.addEventListener('click', function(e){ if (e.target === div) div.remove(); });

        return;
      }
      dbGet('/biblioteca/acesso/restrita/' + fkey(user.uid)).then(function(acesso){
        if (!acesso && !isAdmin(user.uid)) {
          abrirModal('<p id="bibmsg">Você não tem acesso à sessão restrita.</p>');
          return;
        }
trocarAndar(3);
        renderAndar3(user);
      });
    });
  }
}


function trocarAndar(num) {
  document.getElementById('and1').style.display = num === 1 ? 'block' : 'none';
  document.getElementById('and2').style.display = num === 2 ? 'block' : 'none';
  document.getElementById('and3').style.display = num === 3 ? 'block' : 'none';

var bgs = {
    1: 'https://i.imgur.com/Y30aMOY.jpeg',
    2: 'https://i.imgur.com/U5CQEAB.jpeg',
    3: 'https://i.imgur.com/8ptyOh9.png'
  };
  document.getElementById('bibliobx1').style.backgroundImage = 'url(' + bgs[num] + ')';

  if (num !== 1) {
    var andEl = document.getElementById('and' + num);
    if (!andEl.querySelector('#btnvoltar')) {
      var btn = document.createElement('button');
      btn.id = 'btnvoltar';
      btn.textContent = 'Voltar';
      btn.addEventListener('click', function(){ trocarAndar(1); });
      andEl.insertBefore(btn, andEl.firstChild);
    }
  }
}

/* ===================== CARDS ===================== */
function renderCards(ativas, user) {
  var el = document.getElementById('bibcards');
  if (!el) return;
  var agora = Date.now();
  var lista = Object.values(ativas || {}).filter(function(s){ return s && s.termina_em > agora; });
  if (!lista.length) { el.innerHTML = '<p id="bibvazia">A biblioteca está vazia.</p>'; return; }

  var euAtivo    = user.logado && ativas[fkey(user.uid)] && ativas[fkey(user.uid)].termina_em > agora;
  var euSessao   = ativas[fkey(user.uid)];
  var noBanheiro = euAtivo && euSessao && euSessao.mesa_id === 'banheiro';

  var enviosPromise = euAtivo ? getEnviosHoje(user.uid) : Promise.resolve({});
enviosPromise.then(function(envios){
    el.innerHTML = lista.map(function(s) {
      var mesa     = MESAS.filter(function(m){ return m.id === s.mesa_id; })[0] || MESAS[0];
      var ehEu     = user.logado && String(s.uid) === String(user.uid);
      var botoesHtml = '';

      if (euAtivo && !ehEu) {
        botoesHtml = '<div class="cardacoes">' +
          INTERACOES.map(function(a){
            var jaUsou = envios.alvos && envios.alvos[fkey(s.uid)] && envios.alvos[fkey(s.uid)][a.id];
var usado;
if (a.id === 'atrapalhar' && noBanheiro) {
  usado = jaUsou ? true : false;
} else {
  var limite = 2;
  var limiteGlobal = (envios[a.id] || 0) >= limite;
  usado = jaUsou || limiteGlobal;
}
            return '<button class="btnint' + (usado ? ' usado' : '') + '" data-alvo="' + s.uid + '" data-tipo="' + a.id + '" title="' + a.label + '"' + (usado ? ' disabled' : '') + '>' +
              '<i class="fa-solid ' + a.emoji + '"></i>' +
            '</button>';
          }).join('') +
        '</div>';
      }

      return '<div class="card ' + mesa.cor + '">' +
        '<span class="cnome">' + (s.nome || s.uid) + '</span>' +
        '<span class="cmesa">' + mesa.label + '</span>' +
        (mesa.desc ? '<span class="cdesc">' + mesa.desc + '</span>' : '') +
    (s.livro ? '<span class="clivro">' + s.livro + '</span>' : '<span class="clivro">usando livro emprestado</span>') +
        '<span class="crestante">' + fmtHoras(Math.max(0, (s.termina_em - Date.now()) / 3600000)) + ' restantes</span>' +

        (ehEu
          ? '<span class="cstatus" contenteditable="true" data-uid="' + s.uid + '">' + (s.status || 'Estudando') + '</span>'
          : '<span class="cstatus">' + (s.status || 'Estudando') + '</span>') +
        botoesHtml +
      '</div>';
    }).join('');

    el.querySelectorAll('.cstatus[contenteditable]').forEach(function(span) {
      span.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          dbPatch('/biblioteca/ativas/' + fkey(span.dataset.uid), { status: span.textContent.trim() });
          span.blur();
        }
      });
    });

    el.querySelectorAll('.btnint:not([disabled])').forEach(function(btn){
      btn.addEventListener('click', function(){
        var alvo = btn.dataset.alvo;
        var tipo = btn.dataset.tipo;
        btn.disabled = true;
        btn.classList.add('usado');
        registrarEnvio(user.uid, alvo, tipo);
        aplicarInteracao(alvo, tipo, user.nome);
      });
    });
  });
}

/* ===================== INTERACOES ===================== */
var INTERACOES = [
  { id: 'cutucar',     label: 'Cutucar',          emoji: 'fa-hand-point-right', bonus: 0.02  },
  { id: 'impulsionar', label: 'Impulsionar',       emoji: 'fa-bolt',             bonus: 0.04  },
  { id: 'atrapalhar',  label: 'Atrapalhar',        emoji: 'fa-ban',              bonus: -0.04 },
  { id: 'livro',       label: 'Atingir com livro', emoji: 'fa-book',             hp: -5       }
];

function getEnviosHoje(uid) {
  return dbGet('/biblioteca/interacoes-enviadas/' + fkey(uid) + '/' + diaAtual()).then(function(d){ return d || {}; });
}

function registrarEnvio(uid, alvoUid, tipo) {
  var path = '/biblioteca/interacoes-enviadas/' + fkey(uid) + '/' + diaAtual();
  return dbGet(path).then(function(d){
    d = d || {};
    d[tipo] = (d[tipo] || 0) + 1;
    if (!d.alvos) d.alvos = {};
    if (!d.alvos[fkey(alvoUid)]) d.alvos[fkey(alvoUid)] = {};
    d.alvos[fkey(alvoUid)][tipo] = true;
    return dbPut(path, d);
  });
}

function aplicarInteracao(alvoUid, tipo, remetenteNome) {
  var acao = INTERACOES.filter(function(a){ return a.id === tipo; })[0];
  if (!acao) return;
  var promessas = [];

  if (acao.hp) {
    promessas.push(
      dbGet('/status-perfil/' + fkey(alvoUid)).then(function(perfil){
        perfil = perfil || {};
        return dbPatch('/status-perfil/' + fkey(alvoUid), { hp_cur: Math.max(0, (perfil.hp_cur || 0) + acao.hp) });
      })
    );
  }

  promessas.push(dbPost('/biblioteca/interacoes/' + fkey(alvoUid), {
    tipo: tipo, label: acao.label, remetente_nome: remetenteNome,
    bonus: acao.bonus || null, hp: acao.hp || null, visto: false, ts: Date.now()
  }));

  if (acao.bonus) {
    promessas.push(
      dbGet('/biblioteca/ativas/' + fkey(alvoUid)).then(function(sessao){
        if (!sessao) return;
        return dbPatch('/biblioteca/ativas/' + fkey(alvoUid), { bonus_interacoes: (sessao.bonus_interacoes || 0) + acao.bonus });
      })
    );
  }

  return Promise.all(promessas);
}

function abrirInteracoes(user) {
  Promise.all([
    dbGet('/biblioteca/interacoes/' + fkey(user.uid)),
    dbGet('/biblioteca/interacoes-enviadas/' + fkey(user.uid) + '/' + diaAtual()),
    dbGet('/saldos')
  ]).then(function(res){
    var recebidas = res[0] || {};
    var enviados  = res[1] || {};
    var saldos    = res[2] || {};
var listaRec = Object.keys(recebidas).filter(function(k){ return recebidas[k]; }).map(function(k){
  return Object.assign({ _id: k }, recebidas[k]);
}).sort(function(a,b){ return b.ts - a.ts; });

    var alvos     = enviados.alvos || {};

    var listaEnv = Object.keys(alvos).map(function(uid){
      var nome = saldos[uid] && saldos[uid].nome ? saldos[uid].nome : uid;
      var acoes = Object.keys(alvos[uid]).join(', ');
      return { uid: uid, nome: nome, acoes: acoes };
    });

    abrirModal(
      '<div id="modint">' +
        '<p class="modtitle">Interações</p>' +
        '<div id="inttabs">' +
          '<button class="admtab ativo" id="tabrec">Recebidas</button>' +
          '<button class="admtab" id="tabenv">Enviadas hoje</button>' +
        '</div>' +
        '<div id="intconteudo">' +
          renderInteracoesRecebidas(listaRec) +
        '</div>' +
      '</div>'
    );

document.getElementById('intconteudo').addEventListener('click', function(e){
  var btn = e.target.closest('.intdel');
  if (btn) {
    var item = btn.closest('.intitem');
    var key  = btn.dataset.key;
    item.remove();
    fetch(DB + '/biblioteca/interacoes/' + fkey(user.uid) + '/' + key + '.json', { method: 'DELETE' });
  }
});

 
   document.getElementById('tabrec').addEventListener('click', function(){
      document.querySelectorAll('#inttabs .admtab').forEach(function(b){ b.classList.remove('ativo'); });
      this.classList.add('ativo');
      document.getElementById('intconteudo').innerHTML = renderInteracoesRecebidas(listaRec);
    });

    document.getElementById('tabenv').addEventListener('click', function(){
      document.querySelectorAll('#inttabs .admtab').forEach(function(b){ b.classList.remove('ativo'); });
      this.classList.add('ativo');
      document.getElementById('intconteudo').innerHTML = !listaEnv.length
        ? '<p id="bibmsg">Nenhuma interação enviada hoje.</p>'
        : listaEnv.map(function(e){
            return '<div class="intitem">' +
              '<span class="intremetente">' + e.nome + '</span>' +
              '<span class="intlabel">' + e.acoes + '</span>' +
            '</div>';
          }).join('');
    });

    marcarInteracoesVistas(user);
  });
}

function renderInteracoesRecebidas(lista) {
  if (!lista.length) return '<p id="bibmsg">Nenhuma interação recebida ainda.</p>';
  return lista.map(function(i){
    return '<div class="intitem">' +
      '<span class="intremetente">' + i.remetente_nome + '</span>' +
      '<span class="intlabel">' + i.label + '</span>' +
      '<span class="intdata">' + fmtData(i.ts) + '</span>' +
'<button style="position:absolute;top:3px;right:2px;background:#793030;border:1px solid #262626;color:#d0d0d0;cursor:pointer;width:25px;height:25px;font-size:11px;border-radius:100px" class="intdel" data-key="' + i._id + '"><i class="fa-solid fa-xmark"></i></button>' +
    '</div>';
  }).join('');
}




/* ===================== CRONOMETRO ===================== */
var _crono = null;
var _cronoId = 0;

function iniciarCrono(inicio, termina, user) {
  if (_crono) { clearInterval(_crono); _crono = null; }
  var highId = setTimeout(function(){}, 0);
  for (var i = 0; i < highId; i++) { clearInterval(i); }
  var myId = ++_cronoId;

  function tick() {
    if (myId !== _cronoId) return;
    var el = document.getElementById('crono');
    if (!el) { clearInterval(_crono); return; }
    var agora = Date.now();
if (agora >= termina) {
      clearInterval(_crono);
      _crono = null;
      encerrarSessao(user);
      return;
    }

    var ms = agora - inicio;
    var s  = Math.floor(ms / 1000);
    el.textContent = String(Math.floor(s/3600)).padStart(2,'0') + ':' + String(Math.floor((s%3600)/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
  }
  tick();
  _crono = setInterval(tick, 1000);
}



/* ===================== RANKING ===================== */
function abrirRanking() {
  dbGet('/biblioteca/ranking').then(function(todos){
    todos = todos || {};
    var meses = Object.keys(todos).sort().reverse();
    if (!meses.length) { abrirModal('<p id="bibmsg">Sem dados ainda.</p>'); return; }

    var mesSel = mesAtual();

    function renderRanking(mes) {
      var dados = todos[mes] || {};
      var lista = Object.values(dados).filter(Boolean).sort(function(a,b){ return b.horas - a.horas; }).slice(0,10);
      return '<div id="modrank">' +
        '<p class="modtitle">Ranking</p>' +
        '<div id="ranktabs">' +
          meses.map(function(m){
            return '<button class="admtab' + (m === mes ? ' ativo' : '') + '" data-mes="' + m + '">' + m + '</button>';
          }).join('') +
        '</div>' +
        (!lista.length ? '<p id="bibmsg">Sem dados este mês.</p>' :
          lista.map(function(p, i){
            return '<div class="rankitem"><span class="rankpos">' + (i+1) + '</span><span class="ranknome">' + p.nome + '</span><span class="rankhoras">' + fmtHoras(p.horas) + '</span></div>';
          }).join('')) +
      '</div>';
    }

    abrirModal(renderRanking(mesSel));

    document.getElementById('bibmodbox').addEventListener('click', function(e){
      var btn = e.target.closest('[data-mes]');
      if (!btn) return;
      document.querySelectorAll('#ranktabs .admtab').forEach(function(b){ b.classList.remove('ativo'); });
      btn.classList.add('ativo');
      document.getElementById('bibmodbox').innerHTML = renderRanking(btn.dataset.mes);
    });
  });
}


/* ===================== HISTORICO ===================== */
function abrirHistorico(user) {
  dbGet('/biblioteca/historico/' + fkey(user.uid)).then(function(hist){
    if (!hist) { abrirModal('<p id="bibmsg">Nenhuma sessão registrada.</p>'); return; }
    var lista = Object.values(hist).filter(Boolean).sort(function(a,b){ return b.inicio_em - a.inicio_em; }).slice(0,20);
    abrirModal(
      '<div id="modhist"><p class="modtitle">Histórico</p>' +
      lista.map(function(s){
        return '<div class="histitem">' +
          '<span class="histdata">' + fmtData(s.inicio_em) + '</span>' +
          '<span class="histhoras">' + fmtHoras(s.horas_efetivas) + '</span>' +
          (s.bonus_pct > 0 ? '<span class="histdet histbonus">+' + s.bonus_pct + '%</span>' : '') +
          (s.mesa_label ? '<span class="histdet">' + s.mesa_label + '</span>' : '') +
          (s.livro ? '<span class="histdet">"' + s.livro + '"</span>' : '') +
        '</div>';
      }).join('') + '</div>'
    );
  });
}

/* ===================== BILHETES ===================== */
var LIMITE_BILHETES_DIA = 5;
var LIMITE_ENERGIA_DIA  = 3;

function abrirBilhetes(user) {
  dbGet('/biblioteca/bilhetes/' + fkey(user.uid)).then(function(bilhetes) {
    bilhetes = bilhetes || {};
    var ids   = Object.keys(bilhetes).filter(function(id){ return bilhetes[id]; });
    var lista = ids.map(function(id){ return Object.assign({ _id: id }, bilhetes[id]); }).sort(function(a,b){ return b.ts - a.ts; });

    abrirModal(
      '<div id="modbilh"><p class="modtitle">Bilhetes</p>' +
      '<button class="btnbar" id="btnenvbilh" style="margin-bottom:16px"><i class="fas fa-envelope-open"></i></button>' +
      (!lista.length ? '<p id="bibmsg">Nenhum bilhete recebido.</p>' :
        lista.map(function(b){
          return '<div class="bilhitem' + (!b.lido ? ' bilhnovo' : '') + '">' +
            '<div class="bilhheader"><span class="bilhremetente">' + b.remetente_nome + '</span><span class="bilhdata">' + fmtData(b.ts) + '</span></div>' +
            '<div class="bilhtexto">' + b.mensagem + '</div>' +
            (b.com_energia && !b.energia_resgatada ? '<button class="btnresgatar bilhenergia" data-id="' + b._id + '">Resgatar +5 energia</button>' :
             b.com_energia && b.energia_resgatada  ? '<span class="marcook">Energia resgatada ✓</span>' : '') +
            '<button class="bilhdel" data-id="' + b._id + '"><i class="fa-solid fa-trash"></i></button>' +
          '</div>';
        }).join('')) +
      '</div>'
    );

    marcarBilhetesLidos(user, bilhetes);
    document.getElementById('btnenvbilh').addEventListener('click', function(){ abrirEnviarBilhete(user); });

    document.querySelectorAll('.bilhenergia').forEach(function(btn){
      btn.addEventListener('click', function(){
        btn.disabled = true;
        dbGet('/status-perfil/' + fkey(user.uid)).then(function(perfil){
          perfil = perfil || {};
          dbPatch('/status-perfil/' + fkey(user.uid), { energia_cur: Math.min(perfil.energia_tot || 0, (perfil.energia_cur || 0) + 5) });
          dbPatch('/biblioteca/bilhetes/' + fkey(user.uid) + '/' + btn.dataset.id, { energia_resgatada: true });
          btn.replaceWith(Object.assign(document.createElement('span'), { className: 'marcook', textContent: 'Energia resgatada ✓' }));
        });
      });
    });

    document.querySelectorAll('.bilhdel').forEach(function(btn){
      btn.addEventListener('click', function(){
        fetch(DB + '/biblioteca/bilhetes/' + fkey(user.uid) + '/' + btn.dataset.id + '.json', { method: 'DELETE' });
        btn.closest('.bilhitem').remove();
      });
    });
  });
}

function abrirEnviarBilhete(user) {
  Promise.all([
    dbGet('/biblioteca/bilhetes-enviados/' + fkey(user.uid) + '/' + diaAtual()),
    dbGet('/biblioteca/acesso/geral')
  ]).then(function(res){
    var enviados    = res[0] || { total: 0, energia: 0 };
    var cadastrados = res[1] || {};

    if (enviados.total >= LIMITE_BILHETES_DIA) {
      abrirModal('<p id="bibmsg">Você já enviou ' + LIMITE_BILHETES_DIA + ' bilhetes hoje.</p>');
      return;
    }

    var uids = Object.keys(cadastrados).filter(function(k){ return cadastrados[k] && k !== fkey(user.uid); });

    dbGet('/saldos').then(function(saldos){
      saldos = saldos || {};
      var opcoesHtml  = uids.map(function(k){
        return '<option value="' + k + '">' + (saldos[k] && saldos[k].nome ? saldos[k].nome : k) + '</option>';
      }).join('');
      var podeEnergia = enviados.energia < LIMITE_ENERGIA_DIA;

      abrirModal(
        '<div id="modenvbilh"><p class="modtitle">Enviar Bilhete</p>' +
        '<p class="marcototal">Bilhetes restantes hoje: ' + (LIMITE_BILHETES_DIA - enviados.total) + '</p>' +
        '<select id="bilhdestinatario" class="selvlivro"><option value="">Escolha um destinatário</option>' + opcoesHtml + '</select>' +
        '<textarea id="bilhtexto" maxlength="300" placeholder="Escreva seu bilhete..."></textarea>' +
        (podeEnergia
          ? '<label id="bilhenergialabel"><input type="checkbox" id="bilhenergiachk"> Incluir +5 energia (' + (LIMITE_ENERGIA_DIA - enviados.energia) + ' restantes hoje)</label>'
          : '<p id="bilhenergiaaviso">Limite de energia diário atingido.</p>') +
        '<button id="btnenviar" class="btnresgatar">Enviar</button></div>'
      );

      document.getElementById('btnenviar').addEventListener('click', function(){
        var dest    = document.getElementById('bilhdestinatario').value;
        var texto   = document.getElementById('bilhtexto').value.trim();
        var energia = podeEnergia && document.getElementById('bilhenergiachk') && document.getElementById('bilhenergiachk').checked;
        if (!dest)  { alert('Escolha um destinatário.'); return; }
        if (!texto) { alert('Escreva algo no bilhete.'); return; }

        fetch(DB + '/biblioteca/bilhetes/' + dest + '.json', { method: 'POST', body: JSON.stringify({
          remetente_uid: user.uid, remetente_nome: user.nome, mensagem: texto,
          com_energia: energia, energia_resgatada: false, lido: false, ts: Date.now()
        })}).then(function(){
          return dbPut('/biblioteca/bilhetes-enviados/' + fkey(user.uid) + '/' + diaAtual(), {
            total:   (enviados.total  || 0) + 1,
            energia: energia ? (enviados.energia || 0) + 1 : (enviados.energia || 0)
          });
        }).then(function(){ abrirModal('<p id="bibmsg">Bilhete enviado!</p>'); });
      });
    });
  });
}

function marcarBilhetesLidos(user, bilhetes) {
  Object.keys(bilhetes).forEach(function(id){
    if (bilhetes[id] && !bilhetes[id].lido)
      dbPatch('/biblioteca/bilhetes/' + fkey(user.uid) + '/' + id, { lido: true });
  });
}

/* ===================== MARCOS ===================== */
function abrirMarcos(user) {
  dbGet('/biblioteca/progresso/' + fkey(user.uid) + '/' + mesAtual()).then(function(prog) {
    prog = prog || { horas_efetivas: 0, marcos_resgatados: [] };
    var total      = prog.horas_efetivas    || 0;
    var resgatados = prog.marcos_resgatados || [];

    abrirModal(
      '<div id="modmarc"><p class="modtitle">Marcos</p>' +
      '<p class="marcototal">Total este mês: ' + fmtHoras(total) + '</p>' +
      MARCOS.map(function(m) {
        var atingido  = total >= m.horas;
        var resgatado = resgatados.indexOf(m.horas) !== -1;
        return '<div class="marcoitem' + (!atingido ? ' marcolocked' : '') + '">' +
          '<div class="marcohoras">' + fmtHoras(m.horas) + '</div>' +
          '<div class="marcorecomp">' + m.recompensas.map(function(r){ return r.nome; }).join(', ') + '</div>' +
          (resgatado
            ? '<span class="marcook">Resgatado ✓</span>'
            : atingido
              ? '<button class="btnresgatar" data-horas="' + m.horas + '">Resgatar</button>'
              : '<div class="marcolock"><i class="fa-solid fa-lock"></i><div class="marcobarra"><span style="width:' + Math.min(100, Math.round((total / m.horas) * 100)) + '%"></span></div></div>') +
        '</div>';
      }).join('') + '</div>'
    );

    document.querySelectorAll('.btnresgatar').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var horas = parseInt(btn.dataset.horas);
        var marco = MARCOS.filter(function(m){ return m.horas === horas; })[0];
        if (!marco) return;
        btn.disabled = true;
        Promise.all(marco.recompensas.map(function(item) {
          return dbPost('/inventario/' + fkey(user.uid), { nome: item.nome, descricao: item.descricao, quantidade: 1, categoria: item.categoria, valor: item.valor, origem: 'biblioteca' });
        })).then(function() {
          resgatados = resgatados.concat([horas]);
          return dbPatch('/biblioteca/progresso/' + fkey(user.uid) + '/' + mesAtual(), { marcos_resgatados: resgatados });
        }).then(function() {
          btn.replaceWith(Object.assign(document.createElement('span'), { className: 'marcook', textContent: 'Resgatado ✓' }));
        });
      });
    });
  });
}

/* ===================== LIVROS / MAESTRIAS ===================== */
function abrirLivros(user) {
  Promise.all([
    dbGet('/biblioteca/historico/' + fkey(user.uid)),
dbGet('/biblioteca/progresso/' + fkey(user.uid) + '/' + mesAtual() + '/maestrias'),
    dbGet('/biblioteca/livros'),
    dbGet('/maestrias')
  ]).then(function(res) {
    var hist        = res[0] || {};
    var progMaest   = res[1] || { resgatadas: [], livros: {} };
    var livrosCat   = res[2] || {};
    var maestriaCat = res[3] || {};
    var resgatadas  = progMaest.resgatadas || [];
    var livrosProg  = progMaest.livros     || {};

    var diasPorLivro = {};
    Object.values(hist).filter(Boolean).forEach(function(s) {
      if (!s.livro || !s.inicio_em) return;
      var dia = fmtDataISO(s.inicio_em);
      if (!diasPorLivro[s.livro]) diasPorLivro[s.livro] = {};
      diasPorLivro[s.livro][dia] = true;
    });

    var livrosEstudados = Object.keys(diasPorLivro);
    if (!livrosEstudados.length) {
      abrirModal('<p id="bibmsg">Você ainda não estudou nenhum livro.</p>');
      return;
    }

    var podeResgatar = resgatadas.length < 2;
    var html = '<div id="modlivros"><p class="modtitle">Progresso de Livros</p>';

    livrosEstudados.forEach(function(livro) {
      var dias       = Object.keys(diasPorLivro[livro]).length;
      var pct        = Math.min(100, Math.round((dias / 10) * 100));
      var atingido   = dias >= 10;
      var jaResgatou = livrosProg[livro] && livrosProg[livro].resgatado;
      var livroData  = livrosCat[livro] || null;
      var maestrias  = livroData && livroData.maestrias ? livroData.maestrias : [];

      var selectHtml = '';
      if (maestrias.length && !jaResgatou) {
        var disabled = (!atingido || !podeResgatar) ? ' disabled' : '';
        selectHtml =
          '<select class="selvlivro livromaestsel" data-livro="' + livro + '"' + disabled + '>' +
            '<option value="">Escolha uma maestria</option>' +
            maestrias.map(function(slug){
              var m = maestriaCat[slug];
              return '<option value="' + slug + '">' + (m ? m.nome : slug) + '</option>';
            }).join('') +
          '</select>' +
          (atingido && podeResgatar
            ? '<button class="btnresgatar livromaestresg" data-livro="' + livro + '">Resgatar</button>'
            : !atingido
              ? '<span class="marcolock" style="font-size:10px;font-family:IBM Plex Mono">Disponível em ' + (10 - dias) + ' dias</span>'
              : '<span class="marcolock" style="font-size:10px;font-family:IBM Plex Mono">Limite de 2/mês atingido</span>');
      } else if (jaResgatou) {
        selectHtml = '<span class="marcook">Maestria resgatada ✓</span>';
      }

      html +=
        '<div class="livroitem">' +
          '<div class="livronome">' + livro + '</div>' +
          '<div class="livrodies">' + dias + '/10 dias</div>' +
          '<div class="marcobarra"><span style="width:' + pct + '%"></span></div>' +
          selectHtml +
        '</div>';
    });

    html += '</div>';
    abrirModal(html);

    document.querySelectorAll('.livromaestresg').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var livro = btn.dataset.livro;
        var sel   = document.querySelector('.livromaestsel[data-livro="' + livro + '"]');
        if (!sel || !sel.value) { alert('Escolha uma maestria.'); return; }
        var slug  = sel.value;
        var mNome = maestriaCat[slug] ? maestriaCat[slug].nome : slug;
        btn.disabled = true;

        dbPost('/inventario/' + fkey(user.uid), {
          nome:      '✦ Maestria: ' + mNome,
          descricao: 'Para resgatar é necessário fazer uma solicitação no tópico "obtenção de maestrias".',
          categoria: 'Off-Game', valor: 0, origem: 'biblioteca'
        }).then(function() {
          var novasResgatadas = resgatadas.concat([slug]);
          var novosLivros = Object.assign({}, livrosProg);
          novosLivros[livro] = { resgatado: true, maestria: slug };
return dbPut('/biblioteca/progresso/' + fkey(user.uid) + '/' + mesAtual() + '/maestrias', { resgatadas: novasResgatadas, livros: novosLivros });
        }).then(function() {
          btn.replaceWith(Object.assign(document.createElement('span'), { className: 'marcook', textContent: 'Maestria resgatada ✓' }));
        });
      });
    });
  });
}

/* ===================== BADGES ===================== */
function atualizarBadges(user) {
  Promise.all([
    dbGet('/biblioteca/bilhetes/' + fkey(user.uid)),
    dbGet('/biblioteca/interacoes/' + fkey(user.uid)),
    dbGet('/biblioteca/convites/' + fkey(user.uid))
  ]).then(function(res) {
    var nBilh  = Object.values(res[0] || {}).filter(function(b){ return b && !b.lido; }).length;
    var nInt   = Object.values(res[1] || {}).filter(function(i){ return i && !i.visto; }).length;
    var nDupla = Object.values(res[2] || {}).filter(function(c){ return c && !c.aceito && !c.expirado && fmtDataISO(c.ts) === diaAtual(); }).length;
    setBadge('btnbilh', nBilh);
    setBadge('btnint',  nInt);
    setBadge('btndupla', nDupla);
  });
}

function setBadge(btnId, count) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  var badge = btn.querySelector('.badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'badge';
    btn.appendChild(badge);
  }
  badge.textContent   = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function marcarInteracoesVistas(user) {
  dbGet('/biblioteca/interacoes/' + fkey(user.uid)).then(function(dados){
    if (!dados) return;
    Object.keys(dados).forEach(function(id){
      if (dados[id] && !dados[id].visto)
        dbPatch('/biblioteca/interacoes/' + fkey(user.uid) + '/' + id, { visto: true });
    });
  });
}

/* ===================== DUPLAS ===================== */
function abrirDuplas(user) {
  Promise.all([
    dbGet('/biblioteca/duplas/hoje/' + diaAtual()),
    dbGet('/biblioteca/convites/' + fkey(user.uid)),
    dbGet('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(user.uid))
  ]).then(function(res) {
    var todasDuplas = res[0] || {};
    var convites    = res[1] || {};
    var minhaDupla  = res[2] || null;

    var duplesVistas = {};
    var listadup = Object.values(todasDuplas).filter(Boolean).filter(function(d){
      var chave = [d.uid1, d.uid2].sort().join('-');
      if (duplesVistas[chave]) return false;
      duplesVistas[chave] = true;
      return true;
    });

    var todasHtml = !listadup.length
      ? '<p id="bibmsg">Nenhuma dupla formada hoje.</p>'
      : listadup.map(function(d){
          return '<div class="duplaitem"><span class="duplanome">' + d.nome1 + '</span><span class="duplaand">&</span><span class="duplanome">' + d.nome2 + '</span></div>';
        }).join('');

    var minhaDuplaHtml = minhaDupla
      ? '<div id="duplabox"><span class="duplanome">' + minhaDupla.nome1 + '</span><span class="duplaand"> & </span><span class="duplanome">' + minhaDupla.nome2 + '</span><span class="duplabonus">+5% bônus de horas</span></div>'
      : '';

    var ids       = Object.keys(convites).filter(function(id){ return convites[id]; });
    var listaconv = ids.map(function(id){ return Object.assign({ _id: id }, convites[id]); }).sort(function(a,b){ return b.ts - a.ts; });

    var convitesHtml = '';
    if (!minhaDupla && listaconv.length) {
      convitesHtml = '<p class="admlabel">Convites recebidos</p>' +
        listaconv.map(function(c){
          var expirado = c.expirado || fmtDataISO(c.ts) !== diaAtual();
          return '<div class="conviteitem"><span class="convitenome">' + c.remetente_nome + '</span>' +
            (expirado
  ? '<span class="conviteexp">Expirado</span><button style="background:#2c2c2c;border:1px solid #262626;color:#d0d0d0;cursor:pointer;width:25px;height:25px;font-size:11px;border-radius:100px;margin-left:8px" class="convdel" data-id="' + c._id + '"><i class="fa-solid fa-xmark"></i></button>'
  : '<button class="btnresgatar conviteaceitar" data-id="' + c._id + '" data-uid="' + c.remetente_uid + '" data-nome="' + c.remetente_nome + '">Aceitar</button>')+
          '</div>';
        }).join('');
    }

    abrirModal(
      '<div id="moddupla"><p class="modtitle">Duplas de Hoje</p>' +
      minhaDuplaHtml +
      '<div id="listaduplas">' + todasHtml + '</div>' +
      (convitesHtml ? '<div id="convitelista">' + convitesHtml + '</div>' : '') +
      (!minhaDupla ? '<button class="btnresgatar" id="btnconvidar">Convidar alguém</button>' : '') +
      '</div>'
    );

var cl = document.getElementById('convitelista');
if (cl) cl.addEventListener('click', function(e){
  var btn = e.target.closest('.convdel');
  if (btn) {
    btn.closest('.conviteitem').remove();
    fetch(DB + '/biblioteca/convites/' + fkey(user.uid) + '/' + btn.dataset.id + '.json', { method: 'DELETE' });
  }
});



    var bc = document.getElementById('btnconvidar');
    if (bc) bc.addEventListener('click', function(){ abrirConvidar(user); });

    document.querySelectorAll('.conviteaceitar').forEach(function(btn){
      btn.addEventListener('click', function(){
        var remUid = btn.dataset.uid, remNome = btn.dataset.nome, convId = btn.dataset.id;
        btn.disabled = true;
        dbGet('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(remUid)).then(function(duplaRem){
          if (duplaRem) {
            dbPatch('/biblioteca/convites/' + fkey(user.uid) + '/' + convId, { expirado: true });
            btn.replaceWith(Object.assign(document.createElement('span'), { className: 'conviteexp', textContent: 'Expirado' }));
            return;
          }
          var dupla = { uid1: remUid, nome1: remNome, uid2: user.uid, nome2: user.nome, bonus: 0.05, ts: Date.now() };
          Promise.all([
            dbPut('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(user.uid), dupla),
            dbPut('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(remUid),   dupla),
            dbPatch('/biblioteca/ativas/' + fkey(user.uid), { bonus_dupla: 0.05 }),
            dbPatch('/biblioteca/ativas/' + fkey(remUid),   { bonus_dupla: 0.05 }),
            dbPatch('/biblioteca/convites/' + fkey(user.uid) + '/' + convId, { aceito: true })
          ]).then(function(){ abrirDuplas(user); });
        });
      });
    });
  });
}

function abrirConvidar(user) {
  dbGet('/biblioteca/ativas').then(function(ativas){
    var agora = Date.now();
    var disponiveis = Object.values(ativas || {}).filter(function(s){
      return s && s.termina_em > agora && String(s.uid) !== String(user.uid);
    });
    if (!disponiveis.length) { abrirModal('<p id="bibmsg">Nenhum estudante disponível no momento.</p>'); return; }

    abrirModal(
      '<div id="modconvidar"><p class="modtitle">Convidar para Dupla</p>' +
      disponiveis.map(function(s){
        return '<div class="conviteitem"><span class="convitenome">' + s.nome + '</span>' +
          '<button class="btnresgatar btnenvconvite" data-uid="' + s.uid + '" data-nome="' + s.nome + '">Convidar</button></div>';
      }).join('') + '</div>'
    );

    document.querySelectorAll('.btnenvconvite').forEach(function(btn){
      btn.addEventListener('click', function(){
        btn.disabled = true;
        dbGet('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(user.uid)).then(function(minhaDupla){
          if (minhaDupla) { abrirModal('<p id="bibmsg">Você já tem uma dupla hoje.</p>'); return; }
          dbPost('/biblioteca/convites/' + fkey(btn.dataset.uid), {
            remetente_uid: user.uid, remetente_nome: user.nome,
            expirado: false, aceito: false, ts: Date.now()
          }).then(function(){
            btn.replaceWith(Object.assign(document.createElement('span'), { className: 'marcook', textContent: 'Convite enviado ✓' }));
            atualizarBadges(user);
          });
        });
      });
    });
  });
}
/* ===================== SESSAO RESTRITA ===================== */
function renderSessaoRestrita(user) {
  var el = document.getElementById('and2');
  var btnVoltar = el.querySelector('#btnvoltar');

  Promise.all([
    dbGet('/restrita/itens'),
    dbGet('/restrita/progresso/' + fkey(user.uid)),
    dbGet('/restrita/hoje/' + diaAtual() + '/' + fkey(user.uid))
  ]).then(function(res){
    var itens    = res[0] || {};
    var prog     = res[1] || {};
    var hojeItem = res[2] || null;

    var listaItens = Object.keys(itens).filter(function(k){ return itens[k]; });
    if (!listaItens.length) {
      el.innerHTML = '';
      if (btnVoltar) el.appendChild(btnVoltar);
      el.insertAdjacentHTML('beforeend', '<p id="bibmsg">Nenhum item disponível ainda.</p>');
      return;
    }

    var grid = '<div id="ritgrid">' +
      listaItens.map(function(id){
        var it        = itens[id];
        var iprog     = prog[id] || { dias: [], resgatado: false };
        var dias      = Array.isArray(iprog.dias) ? iprog.dias : [];
        var resgatado = iprog.resgatado || false;
        var pct       = Math.min(100, Math.round((dias.length / it.dias) * 100));
        var atingido  = dias.length >= it.dias;
        var jafez     = hojeItem === id;
        var outroHoje = hojeItem && hojeItem !== id;

        var botaoHtml;
        if (resgatado) {
          botaoHtml = '<span class="marcook">Resgatado ✓</span>';
        } else if (atingido) {
          botaoHtml = '<button class="btnresgatar ritresg" data-id="' + id + '">Resgatar</button>';
        } else if (jafez) {
          botaoHtml = '<span class="ritfeito">Feito hoje ✓</span>';
        } else if (outroHoje) {
          botaoHtml = '<button class="btnresgatar" disabled>Bloqueado</button>';
        } else {
          botaoHtml = '<button class="btnresgatar ritacao" data-id="' + id + '">' + it.botao + '</button>';
        }

        return '<div class="ritcard">' +
          '<div class="riticone"><img src="' + it.imagem + '" alt="' + it.nome + '"></div>' +
          '<div class="ritnome">' + it.nome + '</div>' +
          '<div class="ritprog">' + dias.length + '/' + it.dias + ' dias</div>' +
          '<div class="marcobarra"><span style="width:' + pct + '%"></span></div>' +
          botaoHtml +
        '</div>';
      }).join('') +
    '</div>';

    el.innerHTML = grid;
    if (btnVoltar) el.insertBefore(btnVoltar, el.firstChild);

    el.querySelectorAll('.ritacao').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id   = btn.dataset.id;
        var iprog = prog[id] || { dias: [], resgatado: false };
        var dias  = Array.isArray(iprog.dias) ? iprog.dias.slice() : [];
        if (dias.indexOf(diaAtual()) === -1) dias.push(diaAtual());
        btn.disabled = true;
        Promise.all([
          dbPut('/restrita/progresso/' + fkey(user.uid) + '/' + id, { dias: dias, resgatado: false }),
          dbPut('/restrita/hoje/' + diaAtual() + '/' + fkey(user.uid), id)
        ]).then(function(){
          prog[id]  = { dias: dias, resgatado: false };
          hojeItem  = id;
          renderSessaoRestrita(user);
        });
      });
    });

    el.querySelectorAll('.ritresg').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.dataset.id;
        var it = itens[id];
        abrirModal(
          '<div id="modrit">' +
            '<p class="modtitle">Resgatar item</p>' +
            '<div style="text-align:center;margin-bottom:12px"><img src="' + it.imagem + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px"></div>' +
            '<div class="livronome" style="text-align:center;margin-bottom:8px">' + it.item_nome + '</div>' +
            '<div style="text-align:center;margin-bottom:16px;color:#aaa;font-size:11px;font-family:IBM Plex Mono">' + (it.item_desc || '') + '</div>' +
            '<button class="btnresgatar" id="btnconfirmresg">Confirmar resgate</button>' +
          '</div>'
        );
        document.getElementById('btnconfirmresg').addEventListener('click', function(){
          this.disabled = true;
 dbPost('/inventario/' + fkey(user.uid), {
            nome:      it.item_nome,
            descricao: it.item_desc,
            categoria: it.item_categoria,
            imagem:    it.imagem,
            valor:     0,
            origem:    'restrita'
          }) .then(function(){
            return dbPut('/restrita/progresso/' + fkey(user.uid) + '/' + id + '/resgatado', true);
          }).then(function(){
            fecharModal();
            renderSessaoRestrita(user);
          });
        });
      });
    });
  });
}

/* ===================== ANDAR 3 ===================== */
function renderAndar3(user) {
  var el = document.getElementById('and3');
  var btnVoltar = el.querySelector('#btnvoltar');

  var posicoes = [
    { top: '42%',  left: '7%'  },
    { top: '84%', left: '35%' },
    { top: '15%',  left: '44%' },
    { top: '55%', left: '73%' },
    { top: '42%', left: '12%' },
    { top: '71%', left: '14%' },
    { top: '69%', left: '57%' },
    { top: '50%', left: '1%'  },
    { top: '65%', left: '27%' },
    { top: '55%', left: '20%' }
  ];

  Promise.all([
    dbGet('/andar3/icones'),
    dbGet('/andar3/drops'),
    dbGet('/andar3/hoje/' + diaAtual() + '/' + fkey(user.uid))
  ]).then(function(res){
    var icones  = res[0] || {};
    var drops   = res[1] || {};
    var hoje    = res[2] || null;
    var jaAgiu  = hoje ? true : false;

    var html = '<div id="and3grid">';
    for (var i = 1; i <= 10; i++) {
      var ic  = icones[i] || {};
      var pos = posicoes[i-1];
      var img = ic.imagem
        ? '<img src="' + ic.imagem + '" style="width:' + (ic.width || '60px') + ';height:' + (ic.height || '60px') + ';object-fit:contain">'
        : '';
      html += '<button class="and3icone' + (jaAgiu ? ' and3usado' : '') + '" data-icone="' + i + '" style="position:absolute;top:' + pos.top + ';left:' + pos.left + ';background:none;border:none;cursor:' + (jaAgiu ? 'default' : 'pointer') + ';padding:0"' + (jaAgiu ? ' disabled' : '') + '>' + img + '</button>';
    }
    html += '</div>';

    el.innerHTML = html;
    if (btnVoltar) el.insertBefore(btnVoltar, el.firstChild);

    el.querySelectorAll('.and3icone:not([disabled])').forEach(function(btn){
      btn.addEventListener('click', function(){
        var iconeId = parseInt(btn.dataset.icone);
        btn.disabled = true;
        el.querySelectorAll('.and3icone').forEach(function(b){ b.disabled = true; b.classList.add('and3usado'); b.style.cursor = 'default'; });

        var pool = Object.keys(drops).filter(function(k){
          var d = drops[k];
          if (!d) return false;
          if (!d.icones || !d.icones.length) return true;
          return d.icones.indexOf(iconeId) !== -1;
        });

        var ganhou = null;
        pool.forEach(function(k){
          if (ganhou) return;
          var d = drops[k];
          if (Math.random() * 100 < (parseFloat(d.chance) || 0)) ganhou = { id: k, drop: d };
        });

        dbPut('/andar3/hoje/' + diaAtual() + '/' + fkey(user.uid), {
          icone_id: iconeId,
          ganhou:   ganhou ? true : false,
          item_nome: ganhou ? ganhou.drop.nome : null
        });

        if (!ganhou) {
          var m = document.getElementById('bibmod');
          if (m) m.remove();
          var div = document.createElement('div');
          div.id = 'bibandari';
          div.innerHTML = '<div id="bibandaribox"><p class="modtitle">Não há nada aqui.</p><button class="btnresgatar" id="btnfecharandari">Fechar</button></div>';
          document.getElementById('bibliobx1').appendChild(div);
          div.addEventListener('click', function(e){ if (e.target === div) div.remove(); });
          document.getElementById('btnfecharandari').addEventListener('click', function(){ div.remove(); });
          return;
        }

        var d = ganhou.drop;
        var promessas = [
          dbPost('/inventario/' + fkey(user.uid), {
            nome:      d.nome,
            descricao: d.desc,
            categoria: d.categoria || 'Off-Game',
            imagem:    d.imagem || null,
            valor:     0,
            origem:    'andar3'
          })
        ];

        if (d.eh_saude) {
          promessas.push(dbPost('/andar3/notificacoes', {
            uid: user.uid, nome: user.nome, item_nome: d.nome, ts: Date.now(), visto: false
          }));
        }

        Promise.all(promessas).then(function(){
          var m = document.getElementById('bibmod');
          if (m) m.remove();
          var div = document.createElement('div');
          div.id = 'bibandari';
          div.innerHTML =
            '<div id="bibandaribox">' +
              '<p class="modtitle">Você encontrou algo!</p>' +
              (d.imagem ? '<img src="' + d.imagem + '" style="width:80px;height:80px;object-fit:contain;display:block;margin:12px auto">' : '') +
              '<div class="livronome" style="text-align:center;margin-bottom:8px">' + d.nome + '</div>' +
              '<div style="text-align:center;color:#aaa;font-size:11px;font-family:IBM Plex Mono;margin-bottom:16px">' + (d.desc || '') + '</div>' +
              '<button class="btnresgatar" id="btnfecharandari">Fechar</button>' +
            '</div>';
          document.getElementById('bibliobx1').appendChild(div);
          div.addEventListener('click', function(e){ if (e.target === div) div.remove(); });
          document.getElementById('btnfecharandari').addEventListener('click', function(){ div.remove(); });
        });
      });
    });
  });
}



/* ===================== ADMIN ===================== */
function abrirAdmin(user) {
  if (!isAdmin(user.uid)) return;

  abrirModal(
    '<div id="modadm"><p class="modtitle">Painel Admin</p>' +
    '<div id="admtabs">' +
      '<button class="admtab ativo" data-tab="ativos">Ativos</button>' +
      '<button class="admtab" data-tab="geral">Acesso Geral</button>' +
      '<button class="admtab" data-tab="restrita">Acesso Restrito</button>' +
      '<button class="admtab" data-tab="mesas">Mesas</button>' +
      '<button class="admtab" data-tab="livros">Livros</button>' +
'<button class="admtab" data-tab="restrita-itens">Sessão Restrita</button>' +
'<button class="admtab" data-tab="andar3">Andar Inferior</button>' +

    '</div>' +
    '<div id="admconteudo"></div></div>'
  );

  function renderAba(tab) {
    var el = document.getElementById('admconteudo');
    el.innerHTML = '<p class="admsub">Carregando...</p>';

    if (tab === 'ativos') {
      dbGet('/biblioteca/ativas').then(function(ativas){
        var lista = Object.values(ativas || {}).filter(Boolean);
        el.innerHTML = !lista.length ? '<p id="bibmsg">Nenhum ativo agora.</p>' :
          lista.map(function(s){
            return '<div class="admitem"><span class="admnome">' + (s.nome || s.uid) + '</span>' +
              '<span class="admsub">' + (s.mesa_label || '') + '</span>' +
              '<button class="btnresgatar admexpulsar" data-uid="' + s.uid + '">Expulsar</button></div>';
          }).join('');
        el.querySelectorAll('.admexpulsar').forEach(function(btn){
          btn.addEventListener('click', function(){
            btn.disabled = true;
            fetch(DB + '/biblioteca/ativas/' + fkey(btn.dataset.uid) + '.json', { method: 'DELETE' })
              .then(function(){ btn.closest('.admitem').remove(); });
          });
        });
      });

    } else if (tab === 'geral' || tab === 'restrita') {
      var path = '/biblioteca/acesso/' + (tab === 'geral' ? 'geral' : 'restrita');
      Promise.all([dbGet(path), dbGet('/saldos')]).then(function(res){
        var acesso = res[0] || {}, saldos = res[1] || {};
        var lista  = Object.keys(acesso).filter(function(k){ return acesso[k]; });
        var inputId = 'admadd' + tab, btnId = 'btnadd' + tab;
        el.innerHTML =
          '<div class="admaddrow">' +
            '<input class="adminput" type="text" id="' + inputId + '" placeholder="ID do usuário">' +
            '<button class="btnresgatar" id="' + btnId + '">Adicionar</button>' +
          '</div>' +
          (!lista.length ? '<p id="bibmsg">Nenhum cadastrado.</p>' : lista.map(function(uid){
            return '<div class="admitem"><span class="admnome">' + (saldos[uid] && saldos[uid].nome ? saldos[uid].nome : uid) + '</span>' +
              '<button class="btnresgatar admrem" data-path="' + path + '" data-uid="' + uid + '">Remover</button></div>';
          }).join(''));
        document.getElementById(btnId).addEventListener('click', function(){
          var uid = document.getElementById(inputId).value.trim();
          if (!uid) return;
          var p = {}; p[fkey(uid)] = true;
          dbPatch(path, p).then(function(){ renderAba(tab); });
        });
        el.querySelectorAll('.admrem').forEach(function(btn){
          btn.addEventListener('click', function(){
            btn.disabled = true;
            var p = {}; p[btn.dataset.uid] = null;
            dbPatch(btn.dataset.path, p).then(function(){ btn.closest('.admitem').remove(); });
          });
        });
      });

    } else if (tab === 'mesas') {
      el.innerHTML = MESAS.map(function(m){
        return '<div class="admitem"><span class="admnome">' + m.label + '</span>' +
          '<span class="admsub">atual: ' + (m.limite || '5') + '</span>' +
          '<input class="adminput" type="number" min="0" max="20" data-mesa="' + m.id + '" value="' + (m.limite || 0) + '"></div>';
      }).join('') + '<button class="btnresgatar" id="btnsalvarmesas">Salvar</button>';
      document.getElementById('btnsalvarmesas').addEventListener('click', function(){
        document.querySelectorAll('.adminput[data-mesa]').forEach(function(input){
          var mesa = MESAS.filter(function(m){ return m.id === input.dataset.mesa; })[0];
          if (mesa) mesa.limite = parseInt(input.value) || 0;
        });
        dbPut('/biblioteca/config/mesas', MESAS.reduce(function(acc, m){ acc[m.id] = m.limite; return acc; }, {}))
          .then(function(){ document.getElementById('btnsalvarmesas').textContent = 'Salvo ✓'; });
      });

    } else if (tab === 'livros') {
      dbGet('/biblioteca/livros').then(function(livros){
        livros = livros || {};
        var lista = Object.keys(livros);
        el.innerHTML =
          '<p class="admsub" style="margin-bottom:8px">Formato: Nome do Livro: Maestria1, Maestria2</p>' +
          '<textarea id="admlivrotxt" rows="6" class="adminput" style="width:100%;box-sizing:border-box;resize:vertical" placeholder="Introdução e Guia dos Feitiços, 1º Ano: Percepção"></textarea>' +
          '<button class="btnresgatar" id="btnimp" style="margin-top:8px">Importar</button>' +
          '<div id="admlivrolista" style="margin-top:16px">' +
          (!lista.length ? '<p id="bibmsg">Nenhum livro cadastrado.</p>' :
            lista.map(function(nome){
              var maestrias = livros[nome] && livros[nome].maestrias ? livros[nome].maestrias.join(', ') : '—';
              return '<div class="admitem"><span class="admnome">' + nome + '</span><span class="admsub">' + maestrias + '</span>' +
                '<button class="btnresgatar admdellivro" data-nome="' + nome + '">Remover</button></div>';
            }).join('')) +
          '</div>';

        document.getElementById('btnimp').addEventListener('click', function(){
          var txt = document.getElementById('admlivrotxt').value.trim();
          if (!txt) return;
          var linhas = txt.split('\n').filter(function(l){ return l.trim(); });
          var promessas = linhas.map(function(linha){
            var partes = linha.split(':');
            if (partes.length < 2) return Promise.resolve();
            var nome      = partes[0].trim();
            var maestrias = partes[1].split(',').map(function(m){ return m.trim(); }).filter(Boolean);
            return dbPut('/biblioteca/livros/' + encodeURIComponent(nome), { maestrias: maestrias });
          });
          Promise.all(promessas).then(function(){ renderAba('livros'); });
        });

        el.querySelectorAll('.admdellivro').forEach(function(btn){
          btn.addEventListener('click', function(){
            btn.disabled = true;
            fetch(DB + '/biblioteca/livros/' + encodeURIComponent(btn.dataset.nome) + '.json', { method: 'DELETE' })
              .then(function(){ btn.closest('.admitem').remove(); });
          });
        });
      });

    } else if (tab === 'restrita-itens') {
      dbGet('/restrita/itens').then(function(itens){
        itens = itens || {};
        var lista = Object.keys(itens).filter(function(k){ return itens[k]; });
        el.innerHTML =
          '<div class="admaddrow" style="flex-direction:column;gap:8px">' +
            '<input class="adminput" id="ritnome"    placeholder="Nome do item">' +
            '<input class="adminput" id="ritimagem"  placeholder="URL da imagem (imgur)">' +
            '<input class="adminput" id="ritbotao"   placeholder="Texto do botão (ex: Estudar)">' +
            '<input class="adminput" id="ritdias"    placeholder="Dias necessários" type="number" min="1">' +
            '<input class="adminput" id="ritiname"   placeholder="Nome do item no inventário">' +
            '<textarea class="adminput" id="ritidesc" placeholder="Descrição do item no inventário" rows="2" style="resize:vertical"></textarea>' +
            '<input class="adminput" id="riticat"    placeholder="Categoria no inventário (ex: Off-Game)">' +
            '<button class="btnresgatar" id="btnritadd">Adicionar</button>' +
          '</div>' +
          '<div id="ritlista" style="margin-top:16px;display:flex;flex-direction:column;gap:6px">' +
          (!lista.length ? '<p id="bibmsg">Nenhum item cadastrado.</p>' :
            lista.map(function(id){
              var it = itens[id];
              return '<div class="admitem">' +
                '<img src="' + it.imagem + '" style="width:32px;height:32px;object-fit:cover;border-radius:4px">' +
                '<span class="admnome">' + it.nome + '</span>' +
                '<span class="admsub">' + it.botao + ' · ' + it.dias + ' dias</span>' +
'<button class="btnresgatar admeditr" data-id="' + id + '">Editar</button>' +
'<button class="btnresgatar admdelrit" data-id="' + id + '">Remover</button>' +

              '</div>';
            }).join('')) +
          '</div>';

        document.getElementById('btnritadd').addEventListener('click', function(){
          var nome   = document.getElementById('ritnome').value.trim();
          var imagem = document.getElementById('ritimagem').value.trim();
          var botao  = document.getElementById('ritbotao').value.trim();
          var dias   = parseInt(document.getElementById('ritdias').value) || 1;
          var iname  = document.getElementById('ritiname').value.trim();
          var idesc  = document.getElementById('ritidesc').value.trim();
          var icat   = document.getElementById('riticat').value.trim();
          if (!nome || !imagem || !botao || !iname) { alert('Preencha todos os campos obrigatórios.'); return; }
          var id = nome.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          dbPut('/restrita/itens/' + id, { nome: nome, imagem: imagem, botao: botao, dias: dias, item_nome: iname, item_desc: idesc, item_categoria: icat || 'Off-Game' })
            .then(function(){ renderAba('restrita-itens'); });
        });
el.querySelectorAll('.admeditr').forEach(function(btn){
          btn.addEventListener('click', function(){
            var id = btn.dataset.id;
            var it = itens[id];
            abrirModal(
              '<div id="modadmedit"><p class="modtitle">Editar item</p>' +
              '<div class="admaddrow" style="flex-direction:column;gap:8px">' +
                '<input class="adminput" id="editnome"   value="' + it.nome   + '" placeholder="Nome">' +
                '<input class="adminput" id="editimagem" value="' + it.imagem + '" placeholder="URL imagem">' +
                '<input class="adminput" id="editbotao"  value="' + it.botao  + '" placeholder="Texto botão">' +
                '<input class="adminput" id="editdias"   value="' + it.dias   + '" type="number" min="1" placeholder="Dias">' +
                '<input class="adminput" id="editiname"  value="' + it.item_nome + '" placeholder="Nome no inventário">' +
                '<textarea class="adminput" id="editidesc" rows="2" style="resize:vertical" placeholder="Descrição">' + (it.item_desc || '') + '</textarea>' +
                '<input class="adminput" id="editicat"   value="' + (it.item_categoria || 'Off-Game') + '" placeholder="Categoria">' +
                '<button class="btnresgatar" id="btnsalvaredit">Salvar</button>' +
              '</div></div>'
            );
            document.getElementById('btnsalvaredit').addEventListener('click', function(){
              var atualizado = {
                nome:           document.getElementById('editnome').value.trim(),
                imagem:         document.getElementById('editimagem').value.trim(),
                botao:          document.getElementById('editbotao').value.trim(),
                dias:           parseInt(document.getElementById('editdias').value) || 1,
                item_nome:      document.getElementById('editiname').value.trim(),
                item_desc:      document.getElementById('editidesc').value.trim(),
                item_categoria: document.getElementById('editicat').value.trim() || 'Off-Game'
              };
              if (!atualizado.nome || !atualizado.imagem || !atualizado.botao || !atualizado.item_nome) {
                alert('Preencha todos os campos obrigatórios.'); return;
              }
              dbPut('/restrita/itens/' + id, atualizado).then(function(){
                fecharModal();
                renderAba('restrita-itens');
              });
            });
          });
        });

        el.querySelectorAll('.admdelrit').forEach(function(btn){
          btn.addEventListener('click', function(){
            btn.disabled = true;
            fetch(DB + '/restrita/itens/' + btn.dataset.id + '.json', { method: 'DELETE' })
              .then(function(){ btn.closest('.admitem').remove(); });
          });
        });
});
} else if (tab === 'andar3') {
      Promise.all([
        dbGet('/andar3/icones'),
        dbGet('/andar3/drops'),
        dbGet('/andar3/notificacoes')
      ]).then(function(res){
        var icones = res[0] || {};
        var drops  = res[1] || {};
        var notifs = res[2] || {};

        var listaNotifs = Object.values(notifs).filter(Boolean).sort(function(a,b){ return b.ts - a.ts; });

        var notifsHtml = !listaNotifs.length ? '' :
          '<div style="margin-bottom:16px">' +
          '<p class="admlabel" style="margin-bottom:8px">Notificações de saúde</p>' +
          listaNotifs.map(function(n){
            return '<div class="admitem"><span class="admnome">' + n.nome + '</span><span class="admsub">' + n.item_nome + ' · ' + fmtData(n.ts) + '</span></div>';
          }).join('') +
          '</div>';

        var iconesHtml = '<p class="admlabel" style="margin-bottom:8px;margin-top:8px">Ícones</p>';
        for (var i = 1; i <= 10; i++) {
          var ic = icones[i] || {};
          iconesHtml +=
            '<div class="admitem" style="flex-wrap:wrap;gap:6px;padding:8px 0">' +
              '<span class="admnome" style="width:100%">Ícone ' + i + '</span>' +
              '<input class="adminput" style="flex:2" placeholder="URL imagem" data-campo="imagem" data-id="' + i + '" value="' + (ic.imagem || '') + '">' +
              '<input class="adminput" style="width:60px" placeholder="width" data-campo="width" data-id="' + i + '" value="' + (ic.width || '60px') + '">' +
              '<input class="adminput" style="width:60px" placeholder="height" data-campo="height" data-id="' + i + '" value="' + (ic.height || '60px') + '">' +
            '</div>';
        }
        iconesHtml += '<button class="btnresgatar" id="btnsalvaricones" style="margin-bottom:16px">Salvar ícones</button>';

        var listaDrops = Object.keys(drops).filter(function(k){ return drops[k]; });
        var dropsHtml =
          '<p class="admlabel" style="margin-bottom:8px;margin-top:8px">Drops</p>' +
          '<div class="admaddrow" style="flex-direction:column;gap:6px;margin-bottom:12px">' +
            '<input class="adminput" id="dropnome"    placeholder="Nome do item">' +
            '<textarea class="adminput" id="dropdesc" rows="2" style="resize:vertical" placeholder="Descrição"></textarea>' +
            '<input class="adminput" id="dropimagem"  placeholder="URL imagem do item">' +
            '<input class="adminput" id="dropcat"     placeholder="Categoria (Off-Game)">' +
            '<input class="adminput" id="dropchance"  placeholder="Chance % (ex: 30)" type="number" min="0" max="100">' +
            '<input class="adminput" id="dropicones"  placeholder="Ícones permitidos (ex: 1,3,7 — vazio = todos)">' +
            '<label style="font-family:IBM Plex Mono;font-size:10px;color:#888;display:flex;align-items:center;gap:4px"><input type="checkbox" id="dropehsaude"> Item de saúde</label>' +
            '<button class="btnresgatar" id="btnadddrop">Adicionar drop</button>' +
          '</div>' +
          (!listaDrops.length ? '<p id="bibmsg">Nenhum drop cadastrado.</p>' :
            listaDrops.map(function(id){
              var d = drops[id];
              var iconesStr = d.icones && d.icones.length ? d.icones.join(', ') : 'todos';
              return '<div class="admitem">' +
                (d.imagem ? '<img src="' + d.imagem + '" style="width:28px;height:28px;object-fit:contain">' : '') +
                '<span class="admnome">' + d.nome + '</span>' +
                '<span class="admsub">' + d.chance + '% · ícones: ' + iconesStr + (d.eh_saude ? ' · saúde' : '') + '</span>' +
                '<button class="btnresgatar admdroped" data-id="' + id + '">Remover</button>' +
              '</div>';
            }).join(''));

        el.innerHTML = notifsHtml + iconesHtml + dropsHtml;

        document.getElementById('btnsalvaricones').addEventListener('click', function(){
          var promessas = [];
          for (var i = 1; i <= 10; i++) {
            var dados = {};
            el.querySelectorAll('[data-id="' + i + '"]').forEach(function(input){
              dados[input.dataset.campo] = input.value.trim();
            });
            promessas.push(dbPut('/andar3/icones/' + i, dados));
          }
          Promise.all(promessas).then(function(){
            document.getElementById('btnsalvaricones').textContent = 'Salvo ✓';
          });
        });

        document.getElementById('btnadddrop').addEventListener('click', function(){
          var nome    = document.getElementById('dropnome').value.trim();
          var desc    = document.getElementById('dropdesc').value.trim();
          var imagem  = document.getElementById('dropimagem').value.trim();
          var cat     = document.getElementById('dropcat').value.trim() || 'Off-Game';
          var chance  = parseFloat(document.getElementById('dropchance').value) || 0;
          var iconesRaw = document.getElementById('dropicones').value.trim();
          var ehSaude = document.getElementById('dropehsaude').checked;
          var iconesList = iconesRaw ? iconesRaw.split(',').map(function(x){ return parseInt(x.trim()); }).filter(Boolean) : [];
          if (!nome) { alert('Nome obrigatório.'); return; }
          dbPost('/andar3/drops', { nome: nome, desc: desc, imagem: imagem, categoria: cat, chance: chance, icones: iconesList, eh_saude: ehSaude })
            .then(function(){ renderAba('andar3'); });
        });

        el.querySelectorAll('.admdroped').forEach(function(btn){
          btn.addEventListener('click', function(){
            btn.disabled = true;
            fetch(DB + '/andar3/drops/' + btn.dataset.id + '.json', { method: 'DELETE' })
              .then(function(){ btn.closest('.admitem').remove(); });
          });
        });
      });
    }

  }
  renderAba('ativos');

  document.querySelectorAll('.admtab').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.admtab').forEach(function(b){ b.classList.remove('ativo'); });
      btn.classList.add('ativo');
      renderAba(btn.dataset.tab);
    });
  });
}



/* ===================== ENCERRAR SESSAO ===================== */
function encerrarSessao(user) {
  if (_crono) { clearInterval(_crono); _crono = null; }
  document.getElementById('crono').textContent = '00:00:00';

  dbGet('/biblioteca/ativas/' + fkey(user.uid)).then(function(sessao) {
    if (!sessao) { mostrarEntrada(); return; }
    var agora      = Date.now();
    var horasReais = Math.max(0, (Math.min(agora, sessao.termina_em) - sessao.inicio_em) / 3600000);
    var bonusMesa  = sessao.mesa_id === 'corredor' ? 1.05 : sessao.mesa_id === 'banheiro' ? 0.96 : 1;
    var bonusDupla = sessao.bonus_dupla || 0;
    var bonusIntv  = sessao.bonus_interacoes || 0;
    var horasEfet  = parseFloat((horasReais * bonusMesa * (1 + bonusDupla + bonusIntv)).toFixed(4));

    Promise.all([
      fetch(DB + '/biblioteca/ativas/' + fkey(user.uid) + '.json', { method: 'DELETE' }),
      dbPost('/biblioteca/historico/' + fkey(user.uid), {
        inicio_em:      sessao.inicio_em,
        horas_reais:    parseFloat(horasReais.toFixed(4)),
        horas_efetivas: horasEfet,
        bonus_pct:      Math.round((bonusMesa * (1 + bonusDupla + bonusIntv) - 1) * 100),
        mesa_label:     sessao.mesa_label || 'Mesa Central',
        livro:          sessao.livro || null,
        ts:             agora
      }),
      atualizarProgresso(user.uid, horasEfet),
      atualizarRanking(user.uid, user.nome, horasEfet)
   ]).then(function(){
      trocarAndar(1);
      mostrarEntrada();
      dbGet('/atributos/' + fkey(user.uid)).then(function(at){ renderSidebar(user, null, at || {}); });
    });

  });
}

function atualizarProgresso(uid, horasEfet) {
  return dbGet('/biblioteca/progresso/' + fkey(uid) + '/' + mesAtual()).then(function(prog){
    prog = prog || { horas_efetivas: 0, marcos_resgatados: [] };
    return dbPatch('/biblioteca/progresso/' + fkey(uid) + '/' + mesAtual(), {
      horas_efetivas: parseFloat(((prog.horas_efetivas || 0) + horasEfet).toFixed(4))
    });
  });
}

function atualizarRanking(uid, nome, horasEfet) {
  return dbGet('/biblioteca/ranking/' + mesAtual() + '/' + fkey(uid)).then(function(d){
    return dbPut('/biblioteca/ranking/' + mesAtual() + '/' + fkey(uid), {
      nome: nome,
      horas: parseFloat(((d && d.horas ? d.horas : 0) + horasEfet).toFixed(4))
    });
  });
}

/* ===================== POLLING ===================== */
var _polling = null;
function carregarBiblioteca(user) {
  dbGet('/biblioteca/ativas').then(function(ativas){ renderCards(ativas || {}, user); });
  atualizarBadges(user);
}

function iniciarPolling(user) {
  if (_polling) clearInterval(_polling);
  _polling = setInterval(function(){ atualizarBadges(user); }, 30000);
}


/* ===================== INIT ===================== */
function init() {
  var user = getUser();
  var el   = document.getElementById('bibliobx1');
  if (!el) return;

  el.innerHTML =
    '<div id="topbar">' +
      '<div id="uinfo"><span id="unome">' + (user.logado ? user.nome : '') + '</span></div>' +
      '<div id="topbtns">' +
        '<button class="btnbar" id="btnrank"   title="Ranking"><i class="fa-solid fa-trophy"></i></button>' +
        '<button class="btnbar" id="btnbilh"   title="Bilhetes"><i class="fa-solid fa-envelope"></i></button>' +
        '<button class="btnbar" id="btnhist"   title="Histórico"><i class="fa-solid fa-clock-rotate-left"></i></button>' +
        '<button class="btnbar" id="btnmarc"   title="Marcos"><i class="fa-solid fa-award"></i></button>' +
        '<button class="btnbar" id="btnint"    title="Interações"><i class="fa-solid fa-star"></i></button>' +
        '<button class="btnbar" id="btnlivros" title="Livros"><i class="fa-solid fa-book-open"></i></button>' +
        '<button class="btnbar" id="btndupla"  title="Dupla"><i class="fa-solid fa-user-group"></i></button>' +
        (isAdmin(user.uid) ? '<button class="btnbar" id="btnadm" title="Admin"><i class="fa-solid fa-gear"></i></button>' : '') +
      '</div>' +
      '<div id="crono">00:00:00</div>' +
    '</div>' +
    '<div id="bibarea">' +
      '<div id="bibside"></div>' +
      '<div id="andares">' +
        '<div id="and1">' +
          '<div id="overlay"></div>' +
          '<button id="btnbib">Entrar na Biblioteca</button>' +
          '<div id="bibcards"></div>' +
        '</div>' +
        '<div id="and2"></div>' +
        '<div id="and3"></div>' +
      '</div>' +
    '</div>' +
    '<div id="admpain"></div>';

  if (!user.logado) return;

  document.getElementById('btnrank').addEventListener('click', abrirRanking);
  document.getElementById('btnbilh').addEventListener('click', function(){ abrirBilhetes(user); });
  document.getElementById('btnhist').addEventListener('click', function(){ abrirHistorico(user); });
  document.getElementById('btnmarc').addEventListener('click', function(){ abrirMarcos(user); });
  document.getElementById('btnint').addEventListener('click',  function(){ abrirInteracoes(user); });
  document.getElementById('btnlivros').addEventListener('click', function(){ abrirLivros(user); });
  document.getElementById('btndupla').addEventListener('click', function(){ abrirDuplas(user); });
  document.getElementById('btnbib').addEventListener('click',   function(){ abrirEntrada(user); });
  if (isAdmin(user.uid)) document.getElementById('btnadm').addEventListener('click', function(){ abrirAdmin(user); });

dbGet('/biblioteca/ativas/' + fkey(user.uid)).then(function(sessao) {
    if (sessao && sessao.termina_em > Date.now()) {
      esconderEntrada();
      dbGet('/atributos/' + fkey(user.uid)).then(function(at){
        renderSidebar(user, sessao, at || {});
iniciarCrono(sessao.inicio_em, sessao.termina_em, user);
      });
    } else {
      dbGet('/atributos/' + fkey(user.uid)).then(function(at){
        renderSidebar(user, null, at || {});
      });
    }
  });


carregarBiblioteca(user);
  iniciarPolling(user);

}

init();

})();


