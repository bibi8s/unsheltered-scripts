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
  { id: 'banheiro', label: 'Mesa perto do Banheiro', limite: 2, buff: 'banheiro', cor: 'verde',   desc: '-4% horas · atrapalhar ∞', energia: 5 }
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
function fmtHoras(h) {
  h = Math.max(0, h || 0);
  var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return mm > 0 ? hh + 'h' + String(mm).padStart(2,'0') : hh + 'h';
}
function fmtData(ts) {
  var d = new Date(ts);
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
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
      dbGet('/status-perfil/' + fkey(user.uid))
    ]).then(function(res) {
      var ativas       = res[0] || {};
      var inv          = res[1] || {};
      var at           = res[2] || {};
      var perfil       = res[3] || {};
      var det          = at.determinacao || 0;
      var energiaAtual = perfil.energia_cur || 0;

      var livros = Object.values(inv)
        .filter(function(it){ return it && it.categoria === 'Livros' && it.nome; })
        .map(function(it){ return it.nome; });

      var mesaSel  = null;
      var horasSel = null;

      var mesasHtml = MESAS.map(function(m) {
        var ocu   = Object.values(ativas).filter(function(s){ return s && s.mesa_id === m.id; }).length;
        var cheio = m.limite > 0 && ocu >= m.limite;
        return '<button class="btnmesa' + (cheio ? ' cheio' : '') + '" data-id="' + m.id + '"' + (cheio ? ' disabled' : '') + '>' +
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

        dbPut('/biblioteca/ativas/' + fkey(user.uid), sessao).then(function() {
          dbPatch('/status-perfil/' + fkey(user.uid), { energia_cur: energiaAtual - custo });
          fecharModal();
          esconderEntrada();
          renderSidebar(user, sessao, at);
          carregarBiblioteca(user);
          iniciarCrono(agora);
        });
      });
    });
  });
}

/* ===================== SIDEBAR ===================== */
function renderSidebar(user, sessao, atributos) {
  var el = document.getElementById('bibside');
  if (!el) return;

  var at      = atributos || {};
  var int     = at.inteligencia || 0;
  var det     = at.determinacao || 0;
  var sab     = at.sabedoria    || 0;
  var bonusInt = Math.round((int / 25) * 20);
  var descDet  = Math.floor((det / 25) * 2);
  var bonusSab = Math.round((sab / 25) * 15);

  dbGet('/biblioteca/progresso/' + fkey(user.uid) + '/' + mesAtual()).then(function(prog) {
    prog = prog || { horas_efetivas: 0, marcos_resgatados: [] };
    var total      = prog.horas_efetivas    || 0;
    var resgatados = prog.marcos_resgatados || [];
    var proximo    = MARCOS.filter(function(m){ return resgatados.indexOf(m.horas) === -1 && total < m.horas; })[0];

    var livroHtml = sessao && sessao.livro
      ? '<div id="sidelivro"><span class="sidelabel">Lendo</span><span class="sidelivronome">' + sessao.livro + '</span></div>'
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
'<button class="btnand" id="btand2"><i class="fa-solid fa-door-open"></i> Sessão Restrita</button>' +
'<button class="btnand" id="btand3"><i class="fa-solid fa-stairs"></i> Andar Inferior</button>' +
      '</div>';

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
      trocarAndar(num);
    });
  } else if (num === 3) {
    dbGet('/atributos/' + fkey(user.uid)).then(function(at){
      at = at || {};
      if ((at.resistencia || 0) < 10 || (at.sabedoria || 0) < 5) {
        abrirModal('<p id="bibmsg">Você precisa de Resistência +10 e Sabedoria +5 para acessar o andar profundo.</p>');
        return;
      }
      dbGet('/biblioteca/acesso/restrita/' + fkey(user.uid)).then(function(acesso){
        if (!acesso && !isAdmin(user.uid)) {
          abrirModal('<p id="bibmsg">Você não tem acesso à sessão restrita.</p>');
          return;
        }
        trocarAndar(num);
      });
    });
  }
}

function trocarAndar(num) {
  document.getElementById('and1').style.display = num === 1 ? 'block' : 'none';
  document.getElementById('and2').style.display = num === 2 ? 'block' : 'none';
  document.getElementById('and3').style.display = num === 3 ? 'block' : 'none';

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

  var euAtivo = user.logado && ativas[fkey(user.uid)] && ativas[fkey(user.uid)].termina_em > agora;

  Promise.resolve(euAtivo ? getEnviosHoje(user.uid) : {}).then(function(envios){
    el.innerHTML = lista.map(function(s) {
      var mesa  = MESAS.filter(function(m){ return m.id === s.mesa_id; })[0] || MESAS[0];
      var ehEu  = user.logado && String(s.uid) === String(user.uid);
      var botoesHtml = '';

      if (euAtivo && !ehEu) {
        botoesHtml = '<div class="cardacoes">' +
          INTERACOES.map(function(a){
            var usado = (envios[a.id] || 0) >= 2;
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
        btn.disabled = true;
        btn.classList.add('usado');
        registrarEnvio(user.uid, btn.dataset.tipo);
        aplicarInteracao(btn.dataset.alvo, btn.dataset.tipo, user.nome);
      });
    });
  });
}

/* ===================== INTERACOES ===================== */
var INTERACOES = [
  { id: 'cutucar',     label: 'Cutucar',           emoji: 'fa-hand-point-right', bonus: 0.02  },
  { id: 'impulsionar', label: 'Impulsionar',        emoji: 'fa-bolt',             bonus: 0.03  },
  { id: 'atrapalhar',  label: 'Atrapalhar',         emoji: 'fa-ban',              bonus: -0.04 },
  { id: 'livro',       label: 'Atingir com livro',  emoji: 'fa-book',             hp: -5       }
];

function getEnviosHoje(uid) {
  return dbGet('/biblioteca/interacoes-enviadas/' + fkey(uid) + '/' + diaAtual()).then(function(d){ return d || {}; });
}

function registrarEnvio(uid, tipo) {
  var path = '/biblioteca/interacoes-enviadas/' + fkey(uid) + '/' + diaAtual();
  return dbGet(path).then(function(d){
    d = d || {};
    d[tipo] = (d[tipo] || 0) + 1;
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
        var novoHp = Math.max(0, (perfil.hp_cur || 0) + acao.hp);
        return dbPatch('/status-perfil/' + fkey(alvoUid), { hp_cur: novoHp });
      })
    );
  }

  promessas.push(
dbPost('/biblioteca/interacoes/' + fkey(alvoUid), {
  tipo:           tipo,
  label:          acao.label,
  remetente_nome: remetenteNome,
  bonus:          acao.bonus || null,
  hp:             acao.hp    || null,
  visto:          false,
  ts:             Date.now()
})
  );

  if (acao.bonus) {
    promessas.push(
      dbGet('/biblioteca/ativas/' + fkey(alvoUid)).then(function(sessao){
        if (!sessao) return;
        var bonusAtual = sessao.bonus_interacoes || 0;
        return dbPatch('/biblioteca/ativas/' + fkey(alvoUid), { bonus_interacoes: bonusAtual + acao.bonus });
      })
    );
  }

  return Promise.all(promessas);
}

function abrirInteracoes(user) {
  dbGet('/biblioteca/interacoes/' + fkey(user.uid)).then(function(dados){
    if (!dados) { abrirModal('<p id="bibmsg">Nenhuma interação recebida ainda.</p>'); return; }
    var lista = Object.values(dados).filter(Boolean).sort(function(a,b){ return b.ts - a.ts; });
    abrirModal(
      '<div id="modint"><p class="modtitle">Interações recebidas</p>' +
      lista.map(function(i){
        return '<div class="intitem">' +
          '<span class="intremetente">' + i.remetente_nome + '</span>' +
          '<span class="intlabel">' + i.label + '</span>' +
          '<span class="intdata">' + fmtData(i.ts) + '</span>' +
        '</div>';
      }).join('') +
      '</div>'
    );
  marcarInteracoesVistas(user);
  });
}

/* ===================== CRONOMETRO ===================== */
var _crono = null;
function iniciarCrono(inicio) {
  if (_crono) clearInterval(_crono);
  function tick() {
    var el = document.getElementById('crono');
    if (!el) { clearInterval(_crono); return; }
    var ms = Date.now() - inicio;
    var s  = Math.floor(ms / 1000);
    var hh = Math.floor(s / 3600);
    var mm = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    el.textContent = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
  }
  tick();
  _crono = setInterval(tick, 1000);
}

/* ===================== RANKING ===================== */
function abrirRanking() {
  dbGet('/biblioteca/ranking/' + mesAtual()).then(function(dados){
    if (!dados) { abrirModal('<p id="bibmsg">Sem dados este mês.</p>'); return; }
    var lista = Object.values(dados).filter(Boolean).sort(function(a,b){ return b.horas - a.horas; }).slice(0,10);
    abrirModal(
      '<div id="modrank"><p class="modtitle">Ranking</p>' +
      lista.map(function(p, i){
        return '<div class="rankitem">' +
          '<span class="rankpos">' + (i+1) + '</span>' +
          '<span class="ranknome">' + p.nome + '</span>' +
          '<span class="rankhoras">' + fmtHoras(p.horas) + '</span>' +
        '</div>';
      }).join('') +
      '</div>'
    );
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
          (s.mesa_label ? '<span class="histdet">' + s.mesa_label + '</span>' : '') +
          (s.livro ? '<span class="histdet">"' + s.livro + '"</span>' : '') +
        '</div>';
      }).join('') +
      '</div>'
    );
  });
}
/* ===================== BILHETES ===================== */
var LIMITE_BILHETES_DIA = 5;
var LIMITE_ENERGIA_DIA  = 3;

function diaAtual() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function abrirBilhetes(user) {
  dbGet('/biblioteca/bilhetes/' + fkey(user.uid)).then(function(bilhetes) {
    bilhetes = bilhetes || {};
    var ids  = Object.keys(bilhetes).filter(function(id){ return bilhetes[id]; });
    var lista = ids.map(function(id){ return Object.assign({ _id: id }, bilhetes[id]); })
                   .sort(function(a,b){ return b.ts - a.ts; });

    var html =
      '<div id="modbilh">' +
        '<p class="modtitle">Bilhetes</p>' +
        '<button class="btnbar" id="btnenvbilh" style="margin-bottom:16px"><i class="fas fa-envelope-open"></i></button>' +
        (!lista.length
          ? '<p id="bibmsg">Nenhum bilhete recebido.</p>'
          : lista.map(function(b){
              return '<div class="bilhitem' + (!b.lido ? ' bilhnovo' : '') + '">' +
                '<div class="bilhheader">' +
                  '<span class="bilhremetente">' + b.remetente_nome + '</span>' +
                  '<span class="bilhdata">' + fmtData(b.ts) + '</span>' +
                '</div>' +
                '<div class="bilhtexto">' + b.mensagem + '</div>' +
                (b.com_energia && !b.energia_resgatada
                  ? '<button class="btnresgatar bilhenergia" data-id="' + b._id + '">Resgatar +5 energia</button>'
                  : b.com_energia && b.energia_resgatada
                    ? '<span class="marcook">Energia resgatada ✓</span>'
                    : '') +
                '<button class="bilhdel" data-id="' + b._id + '"><i class="fa-solid fa-trash"></i></button>' +
              '</div>';
            }).join('')) +
      '</div>';

    abrirModal(html);

    marcarBilhetesLidos(user, bilhetes);

    document.getElementById('btnenvbilh').addEventListener('click', function(){
      abrirEnviarBilhete(user);
    });

    document.querySelectorAll('.bilhenergia').forEach(function(btn){
      btn.addEventListener('click', function(){
        btn.disabled = true;
        dbGet('/status-perfil/' + fkey(user.uid)).then(function(perfil){
          perfil = perfil || {};
          var nova = Math.min(perfil.energia_tot || 0, (perfil.energia_cur || 0) + 5);
          dbPatch('/status-perfil/' + fkey(user.uid), { energia_cur: nova });
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
    var enviados = res[0] || { total: 0, energia: 0 };
    var cadastrados = res[1] || {};

    if (enviados.total >= LIMITE_BILHETES_DIA) {
      abrirModal('<p id="bibmsg">Você já enviou ' + LIMITE_BILHETES_DIA + ' bilhetes hoje.</p>');
      return;
    }

    var uids = Object.keys(cadastrados).filter(function(k){ return cadastrados[k] && k !== fkey(user.uid); });

    dbGet('/saldos').then(function(saldos){
      saldos = saldos || {};
      var opcoesHtml = uids.map(function(k){
        var nome = saldos[k] && saldos[k].nome ? saldos[k].nome : k;
        return '<option value="' + k + '">' + nome + '</option>';
      }).join('');

      var podeEnergia = enviados.energia < LIMITE_ENERGIA_DIA;

    abrirModal(
  '<div id="modenvbilh">' +
    '<p class="modtitle">Enviar Bilhete</p>' +
    '<p class="marcototal">Bilhetes restantes hoje: ' + (LIMITE_BILHETES_DIA - enviados.total) + '</p>' +
    '<select id="bilhdestinatario" class="selvlivro"><option value="">Escolha um destinatário</option>' + opcoesHtml + '</select>' +
    '<textarea id="bilhtexto" maxlength="300" placeholder="Escreva seu bilhete..."></textarea>' +
    (podeEnergia
      ? '<label id="bilhenergialabel"><input type="checkbox" id="bilhenergiachk"> Incluir +5 energia (' + (LIMITE_ENERGIA_DIA - enviados.energia) + ' restantes hoje)</label>'
      : '<p id="bilhenergiaaviso">Limite de energia diário atingido.</p>') +
    '<button id="btnenviar" class="btnresgatar">Enviar</button>' +
  '</div>'
);
      document.getElementById('btnenviar').addEventListener('click', function(){
        var dest    = document.getElementById('bilhdestinatario').value;
        var texto   = document.getElementById('bilhtexto').value.trim();
        var energia = podeEnergia && document.getElementById('bilhenergiachk') && document.getElementById('bilhenergiachk').checked;

        if (!dest)  { alert('Escolha um destinatário.'); return; }
        if (!texto) { alert('Escreva algo no bilhete.');  return; }

        var bilhete = {
          remetente_uid:    user.uid,
          remetente_nome:   user.nome,
          mensagem:         texto,
          com_energia:      energia,
          energia_resgatada: false,
          lido:             false,
          ts:               Date.now()
        };

        fetch(DB + '/biblioteca/bilhetes/' + dest + '.json', { method: 'POST', body: JSON.stringify(bilhete) })
          .then(function(){
            var novosEnviados = {
              total:  (enviados.total  || 0) + 1,
              energia: energia ? (enviados.energia || 0) + 1 : (enviados.energia || 0)
            };
            return dbPut('/biblioteca/bilhetes-enviados/' + fkey(user.uid) + '/' + diaAtual(), novosEnviados);
          })
          .then(function(){
            abrirModal('<p id="bibmsg">Bilhete enviado!</p>');
          });
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
    var total      = prog.horas_efetivas  || 0;
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
      : '<div class="marcolock">' +
          '<i class="fa-solid fa-lock"></i>' +
          '<div class="marcobarra"><span style="width:' + Math.min(100, Math.round((total / m.horas) * 100)) + '%"></span></div>' +
        '</div>') +
'</div>';
      }).join('') +
      '</div>'
    );

    document.querySelectorAll('.btnresgatar').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var horas = parseInt(btn.dataset.horas);
        var marco = MARCOS.filter(function(m){ return m.horas === horas; })[0];
        if (!marco) return;
        btn.disabled = true;

        var promessas = marco.recompensas.map(function(item) {
          return dbPost('/inventario/' + fkey(user.uid), {
            nome: item.nome, descricao: item.descricao, quantidade: 1,
            categoria: item.categoria, valor: item.valor, origem: 'biblioteca'
          });
        });

        Promise.all(promessas).then(function() {
          resgatados = resgatados.concat([horas]);
          return dbPatch('/biblioteca/progresso/' + fkey(user.uid) + '/' + mesAtual(), {
            marcos_resgatados: resgatados
          });
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
    dbGet('/biblioteca/progresso/' + fkey(user.uid) + '/maestrias'),
    dbGet('/biblioteca/livros'),
    dbGet('/maestrias')
  ]).then(function(res) {
    var hist       = res[0] || {};
    var progMaest  = res[1] || { resgatadas: [], livros: {} };
    var livrosCat  = res[2] || {};
    var maestriaCat = res[3] || {};

    var resgatadas = progMaest.resgatadas || [];
    var livrosProg = progMaest.livros     || {};

    var diasPorLivro = {};
    Object.values(hist).filter(Boolean).forEach(function(s) {
      if (!s.livro || !s.inicio_em) return;
      var d = new Date(s.inicio_em);
      var dia = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
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
      var dias      = Object.keys(diasPorLivro[livro]).length;
      var pct       = Math.min(100, Math.round((dias / 10) * 100));
      var atingido  = dias >= 10;
      var jaResgatou = (livrosProg[livro] && livrosProg[livro].resgatado);
      var livroData  = livrosCat[livro] || null;
      var maestrias  = livroData && livroData.maestrias ? livroData.maestrias : [];

      var selectHtml = '';
      if (atingido && !jaResgatou && podeResgatar && maestrias.length) {
        selectHtml =
          '<select class="selvlivro livromaestsel" data-livro="' + livro + '">' +
            '<option value="">Escolha uma maestria</option>' +
            maestrias.map(function(slug){
              var m = maestriaCat[slug];
              return '<option value="' + slug + '">' + (m ? m.nome : slug) + '</option>';
            }).join('') +
          '</select>' +
          '<button class="btnresgatar livromaestresg" data-livro="' + livro + '">Resgatar</button>';
      } else if (jaResgatou) {
        selectHtml = '<span class="marcook">Maestria resgatada ✓</span>';
      } else if (atingido && !podeResgatar) {
        selectHtml = '<span class="marcolock">Limite de 2 maestrias/mês atingido</span>';
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
        var slug    = sel.value;
        var mNome   = maestriaCat[slug] ? maestriaCat[slug].nome : slug;
        var mDesc   = maestriaCat[slug] ? maestriaCat[slug].descricao : '';
        btn.disabled = true;

        dbPost('/inventario/' + fkey(user.uid), {
          nome:      '✦ Maestria: ' + mNome,
          descricao: mDesc,
          categoria: 'Off-Game',
          valor:     0,
          origem:    'biblioteca'
        }).then(function() {
          var novasResgatadas = resgatadas.concat([slug]);
          var novosLivros = Object.assign({}, livrosProg);
          novosLivros[livro] = { resgatado: true, maestria: slug };
          return dbPut('/biblioteca/progresso/' + fkey(user.uid) + '/maestrias', {
            resgatadas: novasResgatadas,
            livros:     novosLivros
          });
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
    var bilhetes   = res[0] || {};
    var interacoes = res[1] || {};
    var convites   = res[2] || {};

    var nBilh   = Object.values(bilhetes).filter(function(b){ return b && !b.lido; }).length;
    var nInt    = Object.values(interacoes).filter(function(i){ return i && !i.visto; }).length;
    var nDupla  = Object.values(convites).filter(function(c){ return c && !c.aceito && !c.expirado; }).length;

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
  badge.textContent  = count;
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
    dbGet('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(user.uid)),
    dbGet('/biblioteca/convites/' + fkey(user.uid))
  ]).then(function(res) {
    var minhaDupla = res[0] || null;
    var convites   = res[1] || {};

    var duplaHtml = '';
    if (minhaDupla) {
      duplaHtml =
        '<div id="duplabox">' +
          '<span class="duplanome">' + minhaDupla.nome1 + '</span>' +
          '<span class="duplaand"> & </span>' +
          '<span class="duplanome">' + minhaDupla.nome2 + '</span>' +
          '<span class="duplabonus">+5% bônus de horas</span>' +
        '</div>';
    }

    var ids = Object.keys(convites).filter(function(id){ return convites[id]; });
    var lista = ids.map(function(id){ return Object.assign({ _id: id }, convites[id]); }).sort(function(a,b){ return b.ts - a.ts; });

    var convitesHtml = '';
    if (!minhaDupla && lista.length) {
      convitesHtml = lista.map(function(c) {
        var expirado = c.expirado || false;
        return '<div class="conviteitem">' +
          '<span class="convitenome">' + c.remetente_nome + '</span>' +
          (expirado
            ? '<span class="conviteexp">Expirado</span>'
            : '<button class="btnresgatar conviteaceitar" data-id="' + c._id + '" data-uid="' + c.remetente_uid + '" data-nome="' + c.remetente_nome + '">Aceitar</button>') +
        '</div>';
      }).join('');
    } else if (!minhaDupla && !lista.length) {
      convitesHtml = '<p id="bibmsg">Nenhum convite recebido.</p>';
    }

    var btnConvidarHtml = !minhaDupla
      ? '<button class="btnresgatar" id="btnconvidar">Convidar alguém</button>'
      : '';

    abrirModal(
      '<div id="moddupla">' +
        '<p class="modtitle">Dupla de Estudos</p>' +
        duplaHtml +
        (convitesHtml ? '<div id="convitelista">' + convitesHtml + '</div>' : '') +
        btnConvidarHtml +
      '</div>'
    );

    var bc = document.getElementById('btnconvidar');
    if (bc) bc.addEventListener('click', function(){ abrirConvidar(user); });

    document.querySelectorAll('.conviteaceitar').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var remUid  = btn.dataset.uid;
        var remNome = btn.dataset.nome;
        var convId  = btn.dataset.id;
        btn.disabled = true;

        dbGet('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(remUid)).then(function(duplaRem){
          if (duplaRem) {
            dbPatch('/biblioteca/convites/' + fkey(user.uid) + '/' + convId, { expirado: true });
            btn.replaceWith(Object.assign(document.createElement('span'), { className: 'conviteexp', textContent: 'Expirado' }));
            return;
          }

          var dupla = {
            uid1:  remUid,
            nome1: remNome,
            uid2:  user.uid,
            nome2: user.nome,
            bonus: 0.05,
            ts:    Date.now()
          };

          Promise.all([
            dbPut('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(user.uid),  dupla),
            dbPut('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(remUid), dupla),
            dbPatch('/biblioteca/ativas/' + fkey(user.uid),  { bonus_dupla: 0.05 }),
            dbPatch('/biblioteca/ativas/' + fkey(remUid), { bonus_dupla: 0.05 }),
            dbPatch('/biblioteca/convites/' + fkey(user.uid) + '/' + convId, { aceito: true })
          ]).then(function(){
            abrirDuplas(user);
          });
        });
      });
    });
  });
}

function abrirConvidar(user) {
  dbGet('/biblioteca/ativas').then(function(ativas){
    ativas = ativas || {};
    var agora = Date.now();
    var disponiveis = Object.values(ativas).filter(function(s){
      return s && s.termina_em > agora && String(s.uid) !== String(user.uid);
    });

    if (!disponiveis.length) {
      abrirModal('<p id="bibmsg">Nenhum estudante disponível no momento.</p>');
      return;
    }

    abrirModal(
      '<div id="modconvidar">' +
        '<p class="modtitle">Convidar para Dupla</p>' +
        disponiveis.map(function(s){
          return '<div class="conviteitem">' +
            '<span class="convitenome">' + s.nome + '</span>' +
            '<button class="btnresgatar btnenvconvite" data-uid="' + s.uid + '" data-nome="' + s.nome + '">Convidar</button>' +
          '</div>';
        }).join('') +
      '</div>'
    );

    document.querySelectorAll('.btnenvconvite').forEach(function(btn){
      btn.addEventListener('click', function(){
        btn.disabled = true;
        dbGet('/biblioteca/duplas/hoje/' + diaAtual() + '/' + fkey(user.uid)).then(function(minhaDupla){
          if (minhaDupla) { abrirModal('<p id="bibmsg">Você já tem uma dupla hoje.</p>'); return; }
          var convite = {
            remetente_uid:  user.uid,
            remetente_nome: user.nome,
            expirado:       false,
            aceito:         false,
            ts:             Date.now()
          };
          dbPost('/biblioteca/convites/' + fkey(btn.dataset.uid), convite).then(function(){
            btn.replaceWith(Object.assign(document.createElement('span'), { className: 'marcook', textContent: 'Convite enviado ✓' }));
            atualizarBadgeDupla(btn.dataset.uid);
          });
        });
      });
    });
  });
}

function atualizarBadgeDupla(uid) {
  dbGet('/biblioteca/convites/' + fkey(uid)).then(function(convites){
    convites = convites || {};
    var n = Object.values(convites).filter(function(c){ return c && !c.aceito && !c.expirado; }).length;
    setBadge('btndupla', n);
  });
}
 
/* ===================== POLLING ===================== */
var _polling = null;
function carregarBiblioteca(user) {
  dbGet('/biblioteca/ativas').then(function(ativas) {
    renderCards(ativas || {}, user);
  });
  atualizarBadges(user);
}


/* ===================== INIT ===================== */
function init() {
  var user = getUser();
  var el   = document.getElementById('bibliobx1');
  if (!el) return;

  el.innerHTML =
    '<div id="topbar">' +
      '<div id="uinfo">' +
        '<span id="unome">' + (user.logado ? user.nome : '') + '</span>' +
      '</div>' +
      '<div id="topbtns">' +
        '<button class="btnbar" id="btnrank" title="Ranking"><i class="fa-solid fa-trophy"></i></button>' +
        '<button class="btnbar" id="btnbilh" title="Bilhetes"><i class="fa-solid fa-envelope"></i></button>' +
        '<button class="btnbar" id="btnhist" title="Histórico"><i class="fa-solid fa-clock-rotate-left"></i></button>' +
        '<button class="btnbar" id="btnmarc" title="Marcos"><i class="fa-solid fa-award"></i></button>' +
'<button class="btnbar" id="btnint" title="Interações"><i class="fa-solid fa-star"></i></button>' +
'<button class="btnbar" id="btnlivros" title="Livros"><i class="fa-solid fa-book-open"></i></button>' +
'<button class="btnbar" id="btndupla" title="Dupla"><i class="fa-solid fa-user-group"></i></button>' +
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
  document.getElementById('btnbib').addEventListener('click',  function(){ abrirEntrada(user); });
 document.getElementById('btnint').addEventListener('click', function(){ abrirInteracoes(user); });
document.getElementById('btnlivros').addEventListener('click', function(){ abrirLivros(user); });
document.getElementById('btndupla').addEventListener('click', function(){ abrirDuplas(user); });

  dbGet('/atributos/' + fkey(user.uid)).then(function(at) {
    at = at || {};
      renderSidebar(user, null, at);
  });

  dbGet('/biblioteca/ativas/' + fkey(user.uid)).then(function(sessao) {
    if (sessao && sessao.termina_em > Date.now()) {
      esconderEntrada();
      iniciarCrono(sessao.inicio_em);
      dbGet('/atributos/' + fkey(user.uid)).then(function(at){
        renderSidebar(user, sessao, at || {});
      });
    }
  });

  carregarBiblioteca(user);
  _polling = setInterval(function(){ carregarBiblioteca(user); }, 30000);
}

init();

})();

