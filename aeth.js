(function () {
  'use strict';

  var _el = document.getElementById('athenaeumbx');
  if (!_el) return;

  /* ═══════════════════════════════════════════
     CONFIG
  ═══════════════════════════════════════════ */
  var DB                = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ADMINS            = ['1'];
  var LIMITE_HORAS_DIA  = 6;
  var LIMITE_BILHETES   = 2;
  var CA_TTL            = 24 * 3600000; // contra-ataque: 24h
  var CA_BONUS          = 0.15;

  var CAMADAS = [
    { id: 'superficie', label: 'Superf\u00edcie', req_int: 0,  gph: 50,  eph: 4, duelo: true,  energia_int: true,  desc: 'Aberta a todos.' },
    { id: 'subsolo',    label: 'Subsolo',    req_int: 5,  gph: 75,  eph: 5, duelo: false, energia_int: false, desc: 'Requer 5+ Intelig\u00eancia.' },
    { id: 'profundeza', label: 'Profundeza', req_int: 10, gph: 100, eph: 7, duelo: true,  energia_int: true,  desc: 'Requer 10+ Intelig\u00eancia.' }
  ];

  var DANO = {
    superficie: { perd: 0.10, venc: 0.02 },
    profundeza:  { perd: 0.20, venc: 0.08 }
  };

  var STATUS_GENERICOS = [
    'Folheando um grim\u00f3rio antigo...',
    'Consultando documentos raros...',
    'Fazendo anota\u00e7\u00f5es minuciosas...',
    'Decifrando textos em latim...',
    'Perdido entre os volumes...',
    'Revisando refer\u00eancias bibliogr\u00e1ficas...',
    'Copiando passagens importantes...',
    'Comparando duas teorias distintas...',
    'Estudando em sil\u00eancio...',
    'Mergulhado em pesquisa profunda...',
    'Relendo o mesmo par\u00e1grafo...',
    'Organizando os papeis sobre a mesa...'
  ];
  var STATUS_LIVRO = [
    'Estudando "{l}"...',
    'Absorto na leitura de "{l}"...',
    'Consultando "{l}"...',
    'Com "{l}" aberto sobre a mesa...',
    'Relendo passagens de "{l}"...'
  ];
  var STATUS_CAMADA = {
    subsolo:    ['Mergulhado nos segredos do Subsolo...', 'Entre volumes de acesso restrito...'],
    profundeza: ['Nas profundezas do conhecimento...', 'Entre os tomos mais perigosos da cole\u00e7\u00e3o...']
  };

  function sortStatus(s) {
    if (s.camada && STATUS_CAMADA[s.camada] && Math.random() < 0.25) {
      var a = STATUS_CAMADA[s.camada]; return a[Math.floor(Math.random() * a.length)];
    }
    if (s.livro && Math.random() < 0.40) {
      return STATUS_LIVRO[Math.floor(Math.random() * STATUS_LIVRO.length)].replace('{l}', s.livro);
    }
    return STATUS_GENERICOS[Math.floor(Math.random() * STATUS_GENERICOS.length)];
  }

  /* ═══════════════════════════════════════════
     FIREBASE REST
  ═══════════════════════════════════════════ */
  function dbGet(p)      { return fetch(DB + p + '.json').then(function(r) { return r.json(); }); }
  function dbPut(p, d)   { return fetch(DB + p + '.json', { method: 'PUT',    body: JSON.stringify(d) }); }
  function dbPatch(p, d) { return fetch(DB + p + '.json', { method: 'PATCH',  body: JSON.stringify(d) }); }
  function dbPost(p, d)  { return fetch(DB + p + '.json', { method: 'POST',   body: JSON.stringify(d) }); }
  function dbDel(p)      { return fetch(DB + p + '.json', { method: 'DELETE' }); }
  function fkey(uid)     { return 'u' + String(uid).replace(/^u/i, ''); }

  /* ═══════════════════════════════════════════
     USER / UTILS
  ═══════════════════════════════════════════ */
  function getUser() {
    if (typeof _userdata !== 'undefined' && _userdata && _userdata.user_id)
      return { uid: String(_userdata.user_id).trim(), nome: _userdata.username || '', logado: true };
    return { logado: false };
  }
  function isAdmin(uid) { return ADMINS.indexOf(uid) !== -1; }
  function getCamada(id) { return CAMADAS.filter(function(c) { return c.id === id; })[0] || CAMADAS[0]; }
  function mesAtual()   { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function mesAnterior(){ var d = new Date(); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function diaAtual()   { var d = new Date(); return mesAtual() + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtHoras(h)  { h = Math.max(0, h); var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm > 0 ? hh + 'h' + String(mm).padStart(2, '0') : hh + 'h'; }
  function fmtData(ts)  { var d = new Date(ts); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
  function fmtTimer(ms) {
    ms = Math.max(0, ms);
    var s = Math.floor(ms / 1000), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }
  function fmtTermina(ms) { return ms <= 0 ? 'conclu\u00eddo' : 'termina em ' + Math.ceil(ms / 3600000) + 'h'; }

  /* ═══════════════════════════════════════════
     ATRIBUTOS / STATUS / ENERGIA / SALDO / HP
  ═══════════════════════════════════════════ */
  function getAtributos(uid) { return dbGet('/atributos/' + fkey(uid)).then(function(d) { return d || {}; }); }

  function getEnergia(uid) {
    return dbGet('/status-perfil/' + fkey(uid)).then(function(d) {
      return d ? { cur: d.energia_cur || 0, tot: d.energia_tot || 0 } : { cur: 0, tot: 0 };
    });
  }
  function descontarEnergia(uid, qtd) {
    return dbGet('/status-perfil/' + fkey(uid)).then(function(d) {
      if (!d) return false;
      return dbPatch('/status-perfil/' + fkey(uid), { energia_cur: Math.max(0, (d.energia_cur || 0) - qtd) }).then(function() { return true; });
    });
  }
  function adicionarEnergia(uid, qtd) {
    return dbGet('/status-perfil/' + fkey(uid)).then(function(d) {
      if (!d) return;
      return dbPatch('/status-perfil/' + fkey(uid), { energia_cur: Math.min(d.energia_tot || 0, (d.energia_cur || 0) + qtd) });
    });
  }
  function descontarHP(uid, pct) {
    return dbGet('/status-perfil/' + fkey(uid)).then(function(d) {
      if (!d) return;
      var dano = Math.max(1, Math.round((d.hp_tot || 100) * pct));
      return dbPatch('/status-perfil/' + fkey(uid), { hp_cur: Math.max(0, (d.hp_cur || 0) - dano) });
    });
  }
  function getNome(uid) {
    return dbGet('/saldos/' + fkey(uid)).then(function(d) { return d && d.nome ? d.nome : 'u' + uid; });
  }
  function adicionarGaleoes(uid, qtd) {
    return dbGet('/saldos/' + fkey(uid)).then(function(d) {
      if (!d) return;
      return dbPatch('/saldos/' + fkey(uid), { saldo: (d.saldo || 0) + qtd });
    });
  }
  function getLivros(uid) {
    return dbGet('/inventario/' + fkey(uid)).then(function(inv) {
      if (!inv) return [];
      return Object.values(inv).filter(function(it) { return it && it.categoria === 'Livros' && it.nome; }).map(function(it) { return it.nome; });
    });
  }

  /* ═══════════════════════════════════════════
     HORAS HOJE (cumulativo entre camadas)
  ═══════════════════════════════════════════ */
  function getHorasHoje(uid) {
    return dbGet('/athenaeum/historico/' + fkey(uid)).then(function(hist) {
      if (!hist) return 0;
      var hoje = diaAtual(), total = 0;
      Object.values(hist).filter(Boolean).forEach(function(s) {
        if (!s.inicio_em) return;
        var d = new Date(s.inicio_em);
        var dia = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (dia === hoje) total += (s.horas_reais || 0);
      });
      return parseFloat(total.toFixed(4));
    });
  }

  /* ═══════════════════════════════════════════
     SESSÃO
  ═══════════════════════════════════════════ */
  function calcSaida(sessao) {
    var fim = Math.min(Date.now(), sessao.termina_em);
    var horas = Math.max(0, (fim - sessao.inicio_em) / 3600000);
    var cam = getCamada(sessao.camada);
    return { horas: horas, galeoes: Math.floor(horas * cam.gph) };
  }

  function processarSaida(uid, nome, sessao) {
    var calc = calcSaida(sessao);
    var p = [];
    if (calc.galeoes > 0) p.push(adicionarGaleoes(uid, calc.galeoes));
    p.push(dbPost('/athenaeum/historico/' + fkey(uid), {
      inicio_em: sessao.inicio_em,
      horas_reais: parseFloat(calc.horas.toFixed(4)),
      galeoes: calc.galeoes,
      camada: sessao.camada,
      livro: sessao.livro || null
    }));
    return Promise.all(p).then(function() { return calc; });
  }

  function limparExpiradas(ativas) {
    if (!ativas) return Promise.resolve();
    var agora = Date.now();
    var p = [];
    Object.keys(ativas).forEach(function(k) {
      var s = ativas[k];
      if (!s || !s.termina_em || agora <= s.termina_em) return;
      p.push(dbGet('/athenaeum/ativas/' + k).then(function(atual) {
        if (!atual || atual.termina_em > agora) return;
        return dbDel('/athenaeum/ativas/' + k).then(function() {
          return getNome(atual.uid).then(function(nome) { return processarSaida(atual.uid, nome, atual); });
        });
      }));
    });
    return Promise.all(p);
  }

  /* ═══════════════════════════════════════════
     DUELOS
  ═══════════════════════════════════════════ */
  function poderAtaque(atr)  { return (atr.forca || 0) + (atr.agilidade || 0) + (atr.destreza || 0); }
  function poderDefesa(atr)  { return (atr.resistencia || 0) + (atr.determinacao || 0) + (atr.sabedoria || 0); }

  function resolverCombate(atrA, atrD, bonusD) {
    var pA = poderAtaque(atrA) * (0.75 + Math.random() * 0.5);
    var pD = poderDefesa(atrD) * (1 + (bonusD || 0)) * (0.75 + Math.random() * 0.5);
    return pA > pD; // true = atacante venceu
  }

  function executarDuelo(user, alvoUid, alvoNome, camadaId) {
    var danoConf = DANO[camadaId];
    if (!danoConf) return Promise.resolve(null);
    return Promise.all([getAtributos(user.uid), getAtributos(alvoUid)]).then(function(res) {
      var atrA = res[0], atrD = res[1];
      var atacVenceu = resolverCombate(atrA, atrD, 0);
      var perdedorUid = atacVenceu ? alvoUid : user.uid;
      var vencedorUid = atacVenceu ? user.uid : alvoUid;
      var vencedorNome = atacVenceu ? (user.nome || ('u' + user.uid)) : alvoNome;

      var reg = {
        atacante_uid: user.uid, atacante_nome: user.nome || ('u' + user.uid),
        defensor_uid: alvoUid,  defensor_nome: alvoNome,
        atacante_venceu: atacVenceu, camada: camadaId,
        ca_disponivel: true, ca_expira: Date.now() + CA_TTL,
        contra_atacado: false, ts: Date.now()
      };

      return dbPost('/athenaeum/duelos', reg).then(function(r) { return r.json(); }).then(function(d) {
        var dueloId = d.name;
        return Promise.all([
          descontarHP(perdedorUid, danoConf.perd),
          descontarHP(vencedorUid, danoConf.venc),
          adicionarPontoDuelo(vencedorUid, vencedorNome),
          dbPost('/athenaeum/notificacoes/' + fkey(alvoUid), {
            tipo: 'desafiado', duelo_id: dueloId,
            atacante_nome: user.nome || ('u' + user.uid),
            atacante_venceu: atacVenceu, camada: camadaId,
            lido: false, ts: Date.now()
          })
        ]).then(function() { return { atacVenceu: atacVenceu, danoConf: danoConf, dueloId: dueloId }; });
      });
    });
  }

  function executarContraAtaque(user, dueloId, notifId) {
    return dbGet('/athenaeum/duelos/' + dueloId).then(function(duelo) {
      if (!duelo)                              return { erro: 'Duelo n\u00e3o encontrado.' };
      if (duelo.contra_atacado)                return { erro: 'Contra-ataque j\u00e1 realizado.' };
      if (!duelo.ca_disponivel || Date.now() > duelo.ca_expira)
                                               return { erro: 'Prazo expirou.' };
      if (String(duelo.defensor_uid) !== String(user.uid))
                                               return { erro: 'Voc\u00ea n\u00e3o \u00e9 o defensor.' };

      var danoConf = DANO[duelo.camada];
      return Promise.all([getAtributos(duelo.atacante_uid), getAtributos(user.uid)]).then(function(res) {
        var atacVenceu = resolverCombate(res[0], res[1], CA_BONUS);
        var perdedorUid = atacVenceu ? user.uid : duelo.atacante_uid;
        var vencedorUid = atacVenceu ? duelo.atacante_uid : user.uid;
        var vencedorNome = atacVenceu ? duelo.atacante_nome : (user.nome || ('u' + user.uid));

        return Promise.all([
          dbPatch('/athenaeum/duelos/' + dueloId, { contra_atacado: true, ca_atacante_venceu: atacVenceu }),
          descontarHP(perdedorUid, danoConf.perd),
          descontarHP(vencedorUid, danoConf.venc),
          adicionarPontoDuelo(vencedorUid, vencedorNome),
          dbPatch('/athenaeum/notificacoes/' + fkey(user.uid) + '/' + notifId, { lido: true, contra_atacado: true }),
          dbPost('/athenaeum/notificacoes/' + fkey(duelo.atacante_uid), {
            tipo: 'contra-ataque', defensor_nome: user.nome || ('u' + user.uid),
            atacante_venceu: atacVenceu, lido: false, ts: Date.now()
          })
        ]).then(function() { return { atacVenceu: atacVenceu }; });
      });
    });
  }

  function adicionarPontoDuelo(uid, nome) {
    var path = '/athenaeum/ranking-duelos/' + mesAtual() + '/' + fkey(uid);
    return dbGet(path).then(function(d) {
      return dbPut(path, { nome: nome, pontos: ((d && d.pontos) || 0) + 1, uid: uid });
    });
  }

  /* ═══════════════════════════════════════════
     DROP MENSAL TOP 3
  ═══════════════════════════════════════════ */
  function verificarDropMensal() {
    var mes = mesAnterior();
    var flag = '/athenaeum/drop-processado/' + mes;
    return dbGet(flag).then(function(ok) {
      if (ok) return;
      return dbGet('/athenaeum/ranking-duelos/' + mes).then(function(rank) {
        if (!rank) { dbPut(flag, true); return; }
        var lista = Object.values(rank).filter(Boolean).sort(function(a, b) { return b.pontos - a.pontos; }).slice(0, 3);
        var p = lista.map(function(pl) {
          return dbPost('/inventario/' + fkey(pl.uid), {
            nome: '\u2756 Atributo Resgatável',
            descricao: 'Conquistado pelo top 3 do ranking de duelos da Athenaeum em ' + mes + '. Pode ser trocado por +1 em qualquer atributo. | Uso \u00danico.',
            quantidade: 1, categoria: 'Outros', valor: 0, origem: 'athenaeum-ranking'
          });
        });
        return Promise.all(p).then(function() { return dbPut(flag, true); });
      });
    });
  }

  /* ═══════════════════════════════════════════
     BILHETES
  ═══════════════════════════════════════════ */
  function getBilhetes(uid) { return dbGet('/athenaeum/bilhetes/' + fkey(uid)).then(function(d) { return d || {}; }); }

  function enviarBilhete(remUid, remNome, destUid, msg) {
    var pathEnv = '/athenaeum/bilhetes-enviados/' + fkey(remUid) + '/' + diaAtual();
    return dbGet(pathEnv).then(function(count) {
      if ((count || 0) >= LIMITE_BILHETES) { toast('Limite de ' + LIMITE_BILHETES + ' bilhetes por dia atingido.', 4000); return null; }
      return dbPost('/athenaeum/bilhetes/' + fkey(destUid), {
        remetente_uid: remUid, remetente_nome: remNome, mensagem: msg, lido: false, ts: Date.now()
      }).then(function() {
        return dbPut(pathEnv, (count || 0) + 1).then(function() { return true; });
      });
    });
  }

  function deletarBilhete(uid, id) { return dbDel('/athenaeum/bilhetes/' + fkey(uid) + '/' + id); }

  function marcarBilhetesLidos(uid, bilhetes) {
    var p = [];
    Object.keys(bilhetes).forEach(function(id) {
      if (bilhetes[id] && !bilhetes[id].lido)
        p.push(dbPatch('/athenaeum/bilhetes/' + fkey(uid) + '/' + id, { lido: true }));
    });
    return Promise.all(p);
  }

  /* ═══════════════════════════════════════════
     NOTIFICAÇÕES
  ═══════════════════════════════════════════ */
  function getNotificacoes(uid) { return dbGet('/athenaeum/notificacoes/' + fkey(uid)).then(function(d) { return d || {}; }); }
  function deletarNotif(uid, id) { return dbDel('/athenaeum/notificacoes/' + fkey(uid) + '/' + id); }

  /* ═══════════════════════════════════════════
     UI HELPERS
  ═══════════════════════════════════════════ */
  function toast(msg, dur) {
    var t = document.getElementById('ath-toast'); if (!t) return;
    t.textContent = msg; t.style.opacity = '1';
    setTimeout(function() { t.style.opacity = '0'; }, dur || 4000);
  }

  var _timer = null;
  function iniciarTimer(inicio_em) {
    if (_timer) clearInterval(_timer);
    function atualizar() { var el = document.getElementById('ath-timer'); if (!el) { clearInterval(_timer); return; } el.textContent = fmtTimer(Date.now() - inicio_em); }
    atualizar(); _timer = setInterval(atualizar, 1000);
  }

  var _statusTick = null;
  function iniciarStatusTick(sessao, uid) {
    if (_statusTick) clearInterval(_statusTick);
    function atualizar() { dbPatch('/athenaeum/ativas/' + fkey(uid), { status: sortStatus(sessao) }); }
    atualizar(); _statusTick = setInterval(atualizar, 180000);
  }
  function pararStatusTick() { if (_statusTick) { clearInterval(_statusTick); _statusTick = null; } }

  function atualizarBadge(uid) {
    var badge = document.getElementById('ath-badge-notif'); if (!badge) return;
    Promise.all([getNotificacoes(uid), getBilhetes(uid)]).then(function(res) {
      var n = Object.values(res[0]).filter(function(x) { return x && !x.lido; }).length;
      var b = Object.values(res[1]).filter(function(x) { return x && !x.lido; }).length;
      var tot = n + b; badge.textContent = tot; badge.style.display = tot > 0 ? 'inline-block' : 'none';
    });
  }

  /* ═══════════════════════════════════════════
     MODAL
  ═══════════════════════════════════════════ */
  function abrirModal(titulo, fn) {
    var ex = document.getElementById('ath-modal'); if (ex) ex.remove();
    var ov = document.createElement('div'); ov.id = 'ath-modal';
    ov.innerHTML =
      '<div class="ath-modal-box">' +
        '<div class="ath-modal-header"><span>' + titulo + '</span><button class="ath-modal-fechar" id="ath-mf">\u00d7</button></div>' +
        '<div class="ath-modal-corpo" id="ath-mc"></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.getElementById('ath-mf').addEventListener('click', function() { ov.remove(); });
    fn(document.getElementById('ath-mc'));
  }

  /* ═══════════════════════════════════════════
     RENDER CARDS
  ═══════════════════════════════════════════ */
  var _camadaVis = 'superficie';

  function renderCards(ativas, user) {
    var el = document.getElementById('ath-cards'); if (!el) return;
    var agora = Date.now();
    var lista = Object.values(ativas || {}).filter(function(s) { return s && s.uid && s.termina_em > agora && s.camada === _camadaVis; });
    if (!lista.length) { el.innerHTML = '<div class="ath-vazia">Ningu\u00e9m na ' + getCamada(_camadaVis).label + ' no momento.</div>'; return; }

    var cam = getCamada(_camadaVis);
    var minhaSessao = user.logado ? ativas[fkey(user.uid)] : null;
    var euAqui = minhaSessao && minhaSessao.termina_em > agora && minhaSessao.camada === _camadaVis;

    el.innerHTML = lista.map(function(s) {
      var ehEu = user.logado && String(s.uid) === String(user.uid);
      var podeInt = euAqui && !ehEu;
      var statusTxt = s.status || (s.livro ? 'Lendo "' + s.livro + '"' : 'Estudando...');
      var btns = '';
      if (podeInt) {
        btns = '<div class="ath-card-acoes">';
        if (cam.energia_int) btns += '<button class="ath-card-btn ath-btn-energia" data-alvo="' + s.uid + '" title="Energizar (+5 energia)"><i class="ph ph-lightning"></i></button>';
        if (cam.duelo)       btns += '<button class="ath-card-btn ath-btn-duelo"  data-alvo="' + s.uid + '" data-nome="' + (s.nome || 'u' + s.uid) + '" title="Duelar"><i class="ph ph-sword"></i></button>';
        btns += '<button class="ath-card-btn ath-btn-bilhete" data-alvo="' + s.uid + '" data-nome="' + (s.nome || 'u' + s.uid) + '" title="Bilhete"><i class="ph ph-envelope-simple"></i></button>';
        btns += '</div>';
      }
      return '<div class="ath-card' + (ehEu ? ' ath-card-eu' : '') + '">' +
        '<div class="ath-card-nome">' + (s.nome || 'u' + s.uid) + '</div>' +
        '<div class="ath-card-camada">' + getCamada(s.camada).label + '</div>' +
        '<div class="ath-card-status">' + statusTxt + '</div>' +
        '<div class="ath-card-termina">' + fmtTermina(s.termina_em - agora) + '</div>' +
        btns + '</div>';
    }).join('');

    if (euAqui) {
      el.querySelectorAll('.ath-btn-energia').forEach(function(btn) {
        btn.addEventListener('click', function() {
          btn.disabled = true; btn.classList.add('ath-btn-usado');
          adicionarEnergia(btn.dataset.alvo, 5).then(function() { toast('Energizou! +5 energia.'); });
        });
      });
      el.querySelectorAll('.ath-btn-duelo').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (!window.confirm('Duelar com ' + btn.dataset.nome + '?')) return;
          btn.disabled = true; btn.classList.add('ath-btn-usado');
          executarDuelo(user, btn.dataset.alvo, btn.dataset.nome, _camadaVis).then(function(res) {
            if (!res) return;
            var dano = res.danoConf;
            if (res.atacVenceu) {
              toast('Voc\u00ea venceu o duelo! -' + Math.round(dano.venc * 100) + '% HP. ' + btn.dataset.nome + ' perdeu ' + Math.round(dano.perd * 100) + '% HP.', 5000);
            } else {
              toast('Voc\u00ea perdeu o duelo! -' + Math.round(dano.perd * 100) + '% HP. ' + btn.dataset.nome + ' tem 24h para contra-atacar.', 5000);
            }
          });
        });
      });
      el.querySelectorAll('.ath-btn-bilhete').forEach(function(btn) {
        btn.addEventListener('click', function() { abrirModalBilhete(user, btn.dataset.alvo, btn.dataset.nome); });
      });
    }
  }

  /* ═══════════════════════════════════════════
     PAINEL ENTRADA
  ═══════════════════════════════════════════ */
  function renderPainelEntrada(user, camadaId, atributos) {
    var painel = document.getElementById('ath-painel-usuario'); if (!painel) return;
    var cam = getCamada(camadaId);

    function step1() {
      getLivros(user.uid).then(function(livros) {
        painel.innerHTML =
          '<div class="ath-sb-titulo">Entrar \u2014 ' + cam.label + '</div>' +
          '<p class="ath-sb-hint">+' + cam.gph + 'G/h \u00b7 ' + cam.eph + ' energia/h</p>' +
          '<select class="ath-select" id="ath-livro-sel"><option value="">Nenhum livro</option>' +
          livros.map(function(l) { return '<option>' + l + '</option>'; }).join('') + '</select>' +
          '<button class="ath-btn-confirmar" id="ath-prox1" style="margin-top:8px;width:100%">Pr\u00f3ximo \u203a</button>';
        document.getElementById('ath-prox1').addEventListener('click', function() {
          step2(document.getElementById('ath-livro-sel').value || null);
        });
      });
    }

    function step2(livro) {
      Promise.all([getEnergia(user.uid), getHorasHoje(user.uid)]).then(function(res) {
        var eng = res[0], horasHoje = res[1];
        var restante = parseFloat((LIMITE_HORAS_DIA - horasHoje).toFixed(4));
        if (restante <= 0) {
          painel.innerHTML = '<div class="ath-sb-titulo">Limite di\u00e1rio atingido</div>' +
            '<p class="ath-sb-hint">J\u00e1 estudou ' + fmtHoras(horasHoje) + ' hoje. Limite: ' + LIMITE_HORAS_DIA + 'h/dia.</p>';
          return;
        }
        painel.innerHTML =
          '<div class="ath-sb-titulo">Quanto tempo?</div>' +
          (horasHoje > 0 ? '<div class="ath-sb-hint">Restam ' + fmtHoras(restante) + ' hoje.</div>' : '') +
          '<div class="ath-horas-grid">' +
          [1, 2, 3, 4, 5, 6].map(function(h) {
            var excede = h > restante;
            var custo = cam.eph * h;
            var pode = eng.cur >= custo && !excede;
            return '<button class="ath-btn-horas' + (!pode ? ' ath-btn-horas-sem' : '') + '" data-horas="' + h + '" data-custo="' + custo + '"' + (!pode ? ' disabled' : '') + '>' +
              h + 'h<span class="ath-horas-custo">' + (excede ? 'limite' : '-' + custo + 'E') + '</span></button>';
          }).join('') + '</div>' +
          '<div class="ath-sb-hint">Energia: ' + eng.cur + '/' + eng.tot + '</div>' +
          '<button class="ath-btn-mini" id="ath-v1" style="margin-top:8px">Voltar</button>';
        document.getElementById('ath-v1').addEventListener('click', step1);
        painel.querySelectorAll('.ath-btn-horas:not([disabled])').forEach(function(btn) {
          btn.addEventListener('click', function() {
            confirmarEntrada(user, camadaId, livro, parseInt(btn.dataset.horas), parseInt(btn.dataset.custo), atributos);
          });
        });
      });
    }
    step1();
  }

  function confirmarEntrada(user, camadaId, livro, horas, custo, atributos) {
    var painel = document.getElementById('ath-painel-usuario');
    if (painel) painel.innerHTML = '<div class="ath-sb-titulo">Entrando...</div>';
    Promise.all([getNome(user.uid), getHorasHoje(user.uid)]).then(function(res) {
      var nome = res[0], horasHoje = res[1];
      if (horas > LIMITE_HORAS_DIA - horasHoje) { toast('Limite di\u00e1rio atingido!', 4000); renderPainelEntrada(user, camadaId, atributos); return; }
      descontarEnergia(user.uid, custo).then(function(ok) {
        if (!ok) { toast('Energia insuficiente!'); renderPainelEntrada(user, camadaId, atributos); return; }
        var agora = Date.now();
        var sessao = { uid: user.uid, nome: nome, inicio_em: agora, termina_em: agora + horas * 3600000, camada: camadaId, livro: livro || null, status: null };
        dbPut('/athenaeum/ativas/' + fkey(user.uid), sessao).then(function() {
          _camadaVis = camadaId;
          renderPainelSessao(user, sessao, atributos);
          renderNavCamadas(user, camadaId, atributos);
          iniciarStatusTick(sessao, user.uid);
          carregarPagina(user);
        });
      });
    });
  }

  /* ═══════════════════════════════════════════
     PAINEL SESSÃO
  ═══════════════════════════════════════════ */
  function renderPainelSessao(user, sessao, atributos) {
    var painel = document.getElementById('ath-painel-usuario'); if (!painel) return;
    var concluida = Date.now() >= sessao.termina_em;
    var cam = getCamada(sessao.camada);
    painel.innerHTML =
      '<div class="ath-sb-titulo">' + (concluida ? 'Sess\u00e3o conclu\u00edda!' : 'Estudando') + '</div>' +
      (concluida
        ? '<p class="ath-sb-hint">Gale\u00f5es registrados automaticamente.</p>'
        : '<div id="ath-timer" class="ath-timer">00:00:00</div>' +
          '<p class="ath-sb-hint">' + cam.label + (sessao.livro ? ' \u00b7 "' + sessao.livro + '"' : '') + ' \u00b7 +' + cam.gph + 'G/h</p>' +
          '<button id="ath-btn-sair" class="ath-btn-mini" style="margin-top:10px;display:block;width:100%">Encerrar sess\u00e3o</button>');
    if (!concluida) {
      document.getElementById('ath-btn-sair').addEventListener('click', function() {
        if (window.confirm('Encerrar agora? Os Gale\u00f5es ser\u00e3o registrados.')) encerrarSessao(user, sessao);
      });
      iniciarTimer(sessao.inicio_em);
      iniciarStatusTick(sessao, user.uid);
    }
  }

  function encerrarSessao(user, sessao) {
    if (_timer) { clearInterval(_timer); _timer = null; }
    pararStatusTick();
    var painel = document.getElementById('ath-painel-usuario');
    if (painel) painel.innerHTML = '<div class="ath-sb-titulo">Encerrando...</div>';
    getNome(user.uid).then(function(nome) {
      processarSaida(user.uid, nome, sessao).then(function(calc) {
        dbDel('/athenaeum/ativas/' + fkey(user.uid)).then(function() {
          toast('+' + calc.galeoes + ' Gale\u00f5es registrados!', 4000);
          getAtributos(user.uid).then(function(atr) { renderPainelEntrada(user, _camadaVis, atr); renderNavCamadas(user, null, atr); });
          carregarPagina(user);
        });
      });
    });
  }

  /* ═══════════════════════════════════════════
     NAV CAMADAS
  ═══════════════════════════════════════════ */
  function renderNavCamadas(user, camadaSessao, atributos) {
    var nav = document.getElementById('ath-nav-camadas'); if (!nav) return;
    nav.innerHTML = CAMADAS.map(function(c) {
      var pode = (atributos && (atributos.inteligencia || 0) >= c.req_int);
      var ativo = c.id === _camadaVis;
      return '<button class="ath-nav-btn' + (ativo ? ' ath-nav-ativo' : '') + (!pode ? ' ath-nav-bloq' : '') + '"' +
        (!pode ? ' disabled title="' + c.desc + '"' : '') + ' data-camada="' + c.id + '">' + c.label + '</button>';
    }).join('');

    nav.querySelectorAll('.ath-nav-btn:not([disabled]):not(.ath-nav-ativo)').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var novaCam = btn.dataset.camada;
        if (camadaSessao && camadaSessao !== novaCam) {
          // tem sessão ativa em camada diferente
          if (window.confirm('Trocar de camada encerra sua sess\u00e3o atual e registra os Gale\u00f5es. Continuar?')) {
            dbGet('/athenaeum/ativas/' + fkey(user.uid)).then(function(sessao) {
              if (!sessao) { mudarView(user, novaCam, atributos, null); return; }
              getNome(user.uid).then(function(nome) {
                processarSaida(user.uid, nome, sessao).then(function(calc) {
                  dbDel('/athenaeum/ativas/' + fkey(user.uid)).then(function() {
                    if (_timer) { clearInterval(_timer); _timer = null; }
                    pararStatusTick();
                    toast('+' + calc.galeoes + ' Gale\u00f5es registrados!', 3000);
                    mudarView(user, novaCam, atributos, null);
                  });
                });
              });
            });
          }
        } else {
          mudarView(user, novaCam, atributos, camadaSessao);
        }
      });
    });
  }

  function mudarView(user, camadaId, atributos, sessaoAtiva) {
    _camadaVis = camadaId;
    var header = document.getElementById('ath-main-header');
    if (header) header.textContent = 'Athenaeum \u2014 ' + getCamada(camadaId).label;
    renderNavCamadas(user, sessaoAtiva, atributos);
    if (!sessaoAtiva || sessaoAtiva !== camadaId) renderPainelEntrada(user, camadaId, atributos);
    carregarPagina(user);
  }

  /* ═══════════════════════════════════════════
     SIDEBAR INFO
  ═══════════════════════════════════════════ */
  function renderSidebarInfo(user) {
    var el = document.getElementById('ath-sb-info'); if (!el) return;
    Promise.all([getNome(user.uid), getAtributos(user.uid)]).then(function(res) {
      var nome = res[0], atr = res[1];
      var int = atr.inteligencia || 0;
      el.innerHTML =
        '<div class="ath-sb-nome">' + nome + '</div>' +
        '<div class="ath-sb-stat"><span>Intelig\u00eancia</span><span class="ath-sb-val">' + int + '/25</span></div>' +
        '<div class="ath-acesso-wrap">' +
        CAMADAS.map(function(c) {
          var pode = int >= c.req_int;
          return '<div class="ath-acesso-linha' + (pode ? ' ath-ok' : ' ath-no') + '">' + c.label + (pode ? ' \u2713' : ' \u2014 ' + c.req_int + '+ INT') + '</div>';
        }).join('') + '</div>';
    });
  }

  /* ═══════════════════════════════════════════
     TABS
  ═══════════════════════════════════════════ */
  function renderTabs(user) {
    var sec = document.getElementById('ath-tabs-section'); if (!sec) return;
    var abas = [
      { id: 'historico', label: 'Hist\u00f3rico' },
      { id: 'duelos',    label: 'Duelos' }
    ];
    if (isAdmin(user.uid)) abas.push({ id: 'admin', label: 'Admin' });

    sec.innerHTML =
      '<div class="ath-tabs">' + abas.map(function(a) { return '<button class="ath-tab" data-tab="' + a.id + '">' + a.label + '</button>'; }).join('') + '</div>' +
      '<div id="ath-tab-content"></div>' +
      '<div class="ath-botoes-extra">' +
        '<button class="ath-btn-extra" id="ath-btn-notif" title="Notifica\u00e7\u00f5es e bilhetes" style="position:relative"><i class="ph ph-bell"></i>' +
        '<span id="ath-badge-notif" style="display:none;position:absolute;top:-4px;right:-4px;background:#c06060;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;line-height:16px;text-align:center;"></span></button>' +
      '</div>';

    document.getElementById('ath-btn-notif').addEventListener('click', function() {
      abrirModal('Notifica\u00e7\u00f5es', function(mel) { renderNotificacoes(user, mel); });
    });

    sec.querySelectorAll('.ath-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        sec.querySelectorAll('.ath-tab').forEach(function(b) { b.classList.remove('ath-tab-ativo'); });
        btn.classList.add('ath-tab-ativo');
        var el = document.getElementById('ath-tab-content'); el.innerHTML = '';
        if      (btn.dataset.tab === 'historico') renderHistorico(user, el);
        else if (btn.dataset.tab === 'duelos')    renderRankDuelos(el);
        else if (btn.dataset.tab === 'admin')     renderAdmin(el);
      });
    });

    sec.querySelector('.ath-tab').classList.add('ath-tab-ativo');
    renderHistorico(user, document.getElementById('ath-tab-content'));
  }

  /* ═══════════════════════════════════════════
     NOTIFICAÇÕES + BILHETES
  ═══════════════════════════════════════════ */
  function renderNotificacoes(user, el) {
    el.innerHTML = '<p class="ath-tab-info">Carregando...</p>';
    Promise.all([getNotificacoes(user.uid), getBilhetes(user.uid)]).then(function(res) {
      var notifs = res[0], bilhetes = res[1];
      marcarBilhetesLidos(user.uid, bilhetes);
      atualizarBadge(user.uid);
      var html = '';

      // Duelos
      var nids = Object.keys(notifs).filter(function(id) { return notifs[id]; });
      if (nids.length) {
        html += '<div class="ath-notif-titulo">Duelos</div>';
        nids.sort(function(a, b) { return notifs[b].ts - notifs[a].ts; }).forEach(function(id) {
          var n = notifs[id];
          var txt;
          if (n.tipo === 'desafiado') {
            txt = n.atacante_venceu
              ? n.atacante_nome + ' te desafiou e venceu. Voc\u00ea perdeu HP.'
              : n.atacante_nome + ' te desafiou e perdeu. Voc\u00ea ainda perdeu um pouco de HP.';
          } else {
            txt = n.atacante_venceu
              ? n.defensor_nome + ' contra-atacou, mas voc\u00ea ainda venceu.'
              : n.defensor_nome + ' contra-atacou e venceu. Voc\u00ea perdeu HP adicional.';
          }
          var podeCa = n.tipo === 'desafiado' && !n.contra_atacado && n.duelo_id;
          html += '<div class="ath-notif-item' + (n.lido ? '' : ' ath-notif-novo') + '">' +
            '<span class="ath-notif-txt">' + txt + '</span>' +
            '<div class="ath-notif-acoes">' +
            (podeCa ? '<button class="ath-btn-mini ath-btn-ca" data-id="' + n.duelo_id + '" data-nid="' + id + '">Contra-atacar</button>' : '') +
            '<button class="ath-btn-mini ath-btn-del-notif" data-id="' + id + '" style="color:#c06060">\u00d7</button>' +
            '</div></div>';
        });
      }

      // Bilhetes
      var bids = Object.keys(bilhetes).filter(function(id) { return bilhetes[id]; });
      if (bids.length) {
        html += '<div class="ath-notif-titulo" style="margin-top:14px">Bilhetes</div>';
        bids.sort(function(a, b) { return bilhetes[b].ts - bilhetes[a].ts; }).forEach(function(id) {
          var b = bilhetes[id];
          html += '<div class="ath-bilhete-item' + (b.lido ? '' : ' ath-bilhete-novo') + '">' +
            '<div class="ath-bilhete-header"><span class="ath-bilhete-rem">' + b.remetente_nome + '</span><span class="ath-bilhete-data">' + fmtData(b.ts) + '</span></div>' +
            '<div class="ath-bilhete-txt">' + b.mensagem + '</div>' +
            '<button class="ath-btn-mini ath-btn-del-bil" data-id="' + id + '" style="color:#c06060;float:right">\u00d7</button>' +
            '</div>';
        });
      }

      if (!html) html = '<p class="ath-tab-info">Sem notifica\u00e7\u00f5es.</p>';
      el.innerHTML = html;

      el.querySelectorAll('.ath-btn-ca').forEach(function(btn) {
        btn.addEventListener('click', function() {
          btn.disabled = true;
          executarContraAtaque(user, btn.dataset.id, btn.dataset.nid).then(function(res) {
            if (res.erro) { toast(res.erro, 4000); btn.disabled = false; return; }
            toast(res.atacVenceu ? 'Contra-ataque: infelizmente voc\u00ea ainda perdeu.' : 'Contra-ataque bem-sucedido! Voc\u00ea venceu!', 5000);
            renderNotificacoes(user, el);
          });
        });
      });
      el.querySelectorAll('.ath-btn-del-notif').forEach(function(btn) {
        btn.addEventListener('click', function() { deletarNotif(user.uid, btn.dataset.id).then(function() { renderNotificacoes(user, el); }); });
      });
      el.querySelectorAll('.ath-btn-del-bil').forEach(function(btn) {
        btn.addEventListener('click', function() { deletarBilhete(user.uid, btn.dataset.id).then(function() { renderNotificacoes(user, el); }); });
      });
    });
  }

  /* ═══════════════════════════════════════════
     HISTÓRICO
  ═══════════════════════════════════════════ */
  function renderHistorico(user, el) {
    el.innerHTML = '<p class="ath-tab-info">Carregando...</p>';
    dbGet('/athenaeum/historico/' + fkey(user.uid)).then(function(hist) {
      if (!hist) { el.innerHTML = '<p class="ath-tab-info">Nenhuma sess\u00e3o registrada.</p>'; return; }
      var lista = Object.values(hist).filter(Boolean).sort(function(a, b) { return b.inicio_em - a.inicio_em; }).slice(0, 30);
      if (!lista.length) { el.innerHTML = '<p class="ath-tab-info">Nenhuma sess\u00e3o registrada.</p>'; return; }
      el.innerHTML = '<div class="ath-hist-lista">' + lista.map(function(s) {
        return '<div class="ath-hist-item">' +
          '<span class="ath-hist-data">' + fmtData(s.inicio_em) + '</span>' +
          '<span class="ath-hist-galeoes">+' + s.galeoes + 'G</span>' +
          '<span class="ath-hist-det">' + getCamada(s.camada).label + '</span>' +
          (s.livro ? '<span class="ath-hist-det">"' + s.livro + '"</span>' : '') +
          '</div>';
      }).join('') + '</div>';
    });
  }

  /* ═══════════════════════════════════════════
     RANK DUELOS
  ═══════════════════════════════════════════ */
  function renderRankDuelos(el) {
    el.innerHTML = '<p class="ath-tab-info">Carregando...</p>';
    dbGet('/athenaeum/ranking-duelos/' + mesAtual()).then(function(rank) {
      if (!rank) { el.innerHTML = '<p class="ath-tab-info">Sem dados este m\u00eas.</p>'; return; }
      var lista = Object.values(rank).filter(Boolean).sort(function(a, b) { return b.pontos - a.pontos; }).slice(0, 10);
      var m = mesAtual().split('-');
      el.innerHTML =
        '<div class="ath-ranking">' +
        '<p class="ath-ranking-mes">Top 10 Duelistas \u2014 ' + m[1] + '/' + m[0] + '</p>' +
        lista.map(function(p, i) {
          var med = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : '';
          return '<div class="ath-rank-item">' +
            '<span class="ath-rank-pos">' + (med || (i + 1)) + '</span>' +
            '<span class="ath-rank-nome">' + p.nome + '</span>' +
            '<span class="ath-rank-pts">' + p.pontos + ' pts</span>' +
            '</div>';
        }).join('') + '</div>' +
        '<p class="ath-rank-aviso">Top 3 recebe +1 atributo na virada do m\u00eas.</p>';
    });
  }

  /* ═══════════════════════════════════════════
     BILHETE MODAL
  ═══════════════════════════════════════════ */
  function abrirModalBilhete(user, destUid, destNome) {
    abrirModal('Enviar Bilhete', function(mel) {
      var pathEnv = '/athenaeum/bilhetes-enviados/' + fkey(user.uid) + '/' + diaAtual();
      dbGet(pathEnv).then(function(count) {
        var restantes = LIMITE_BILHETES - (count || 0);
        if (restantes <= 0) { mel.innerHTML = '<p class="ath-tab-info">Limite di\u00e1rio atingido.</p>'; return; }
        mel.innerHTML =
          '<p class="ath-tab-info">Para: ' + destNome + ' \u00b7 ' + restantes + ' bilhete(s) restante(s)</p>' +
          '<textarea class="ath-select" id="ath-bil-txt" rows="4" maxlength="300" placeholder="Escreva seu bilhete..." style="width:100%;resize:vertical;margin-bottom:8px;box-sizing:border-box;"></textarea>' +
          '<button class="ath-btn-confirmar" id="ath-bil-env">Enviar</button>';
        document.getElementById('ath-bil-env').addEventListener('click', function() {
          var txt = document.getElementById('ath-bil-txt').value.trim();
          if (!txt) { toast('Escreva algo.', 2000); return; }
          mel.innerHTML = '<p class="ath-tab-info">Enviando...</p>';
          getNome(user.uid).then(function(nome) {
            enviarBilhete(user.uid, nome, destUid, txt).then(function(ok) {
              mel.innerHTML = ok ? '<p class="ath-tab-info">Bilhete enviado!</p>' : '<p class="ath-tab-info">N\u00e3o foi poss\u00edvel enviar.</p>';
              if (ok) setTimeout(function() { var m = document.getElementById('ath-modal'); if (m) m.remove(); }, 1500);
            });
          });
        });
      });
    });
  }

  /* ═══════════════════════════════════════════
     ADMIN
  ═══════════════════════════════════════════ */
  function renderAdmin(el) {
    el.innerHTML =
      '<div class="ath-sb-titulo">Admin</div>' +
      '<button class="ath-btn-confirmar" id="ath-adm-drop">Processar drop do m\u00eas anterior</button>';
    document.getElementById('ath-adm-drop').addEventListener('click', function() {
      verificarDropMensal().then(function() { toast('Drop processado!', 3000); });
    });
  }

  /* ═══════════════════════════════════════════
     POLLING + CARREGAR
  ═══════════════════════════════════════════ */
  var _polling = null;

  function carregarPagina(user) {
    dbGet('/athenaeum/ativas').then(function(ativas) {
      limparExpiradas(ativas);
      renderCards(ativas, user);
    });
    if (user.logado) atualizarBadge(user.uid);
  }

  /* ═══════════════════════════════════════════
     BOTÃO APARATAR + INIT
  ═══════════════════════════════════════════ */
  function buildUI() {
    var user = getUser();

    _el.innerHTML =
      '<div id="ath-btn-wrap"><button id="ath-btn-aparatar" class="ath-btn-aparatar">Aparatar</button></div>' +
      '<div id="ath-wrapper" style="display:none">' +
        '<div id="ath-layout">' +
          (user.logado
            ? '<div id="ath-sidebar">' +
                '<div class="ath-sb-secao" id="ath-sb-info"></div>' +
                '<div class="ath-sb-secao ath-nav-wrap"><div id="ath-nav-camadas"></div></div>' +
                '<div class="ath-sb-secao" id="ath-painel-usuario"></div>' +
                '<div class="ath-sb-secao ath-sb-tabs" id="ath-tabs-section"></div>' +
              '</div>'
            : '') +
          '<div id="ath-main">' +
            '<div id="ath-main-header">Athenaeum \u2014 Superf\u00edcie</div>' +
            '<div id="ath-cards"></div>' +
          '</div>' +
        '</div>' +
        '<div id="ath-toast"></div>' +
      '</div>';

    document.getElementById('ath-btn-aparatar').addEventListener('click', function() {
      var wrapper = document.getElementById('ath-wrapper');
      var aberto = wrapper.style.display !== 'none';
      wrapper.style.display = aberto ? 'none' : 'block';
      if (!aberto && !wrapper.dataset.loaded) {
        wrapper.dataset.loaded = '1';
        initConteudo(user);
      }
    });
  }

  function initConteudo(user) {
    if (user.logado) {
      renderSidebarInfo(user);
      getAtributos(user.uid).then(function(atr) {
        dbGet('/athenaeum/ativas/' + fkey(user.uid)).then(function(sessao) {
          var camadaSessao = null;
          if (sessao && sessao.termina_em > Date.now()) {
            camadaSessao = sessao.camada;
            _camadaVis = sessao.camada;
            renderPainelSessao(user, sessao, atr);
            iniciarTimer(sessao.inicio_em);
            iniciarStatusTick(sessao, user.uid);
            var header = document.getElementById('ath-main-header');
            if (header) header.textContent = 'Athenaeum \u2014 ' + getCamada(sessao.camada).label;
          } else {
            renderPainelEntrada(user, _camadaVis, atr);
          }
          renderNavCamadas(user, camadaSessao, atr);
        });
      });
      renderTabs(user);
      verificarDropMensal();
    }
    carregarPagina(user);
    _polling = setInterval(function() { carregarPagina(user); }, 30000);
  }

  buildUI();

})();