(function () {

var _el = document.getElementById('caldeiraobx');
if (!_el) return;

var DB             = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
var ADMINS         = ['1'];
var INATIVIDADE_MS = 35 * 60 * 1000;
var STATUS_TIMER   = 8 * 60 * 1000;
var CONSUMO_TIMER  = 5 * 60 * 1000;
var ATENDENTE_TTL  = 3 * 60 * 1000;  

var STATUS_GENERICOS = [
  'está olhando o cardápio',
  'está conversando animadamente',
  'está apoiado no balcão',
  'está observando os outros clientes',
  'está esperando seu pedido',
  'está folheando um jornal',
  'está curtindo a música ambiente',
  'está batendo um papo com o garçom',
  'está rindo de alguma piada',
  'está com um olhar distante'
];

function statusGenerico() {
  return STATUS_GENERICOS[Math.floor(Math.random() * STATUS_GENERICOS.length)];
}
function statusConsumo(item) {
  if (item.destino === 'inventario') return 'guardou ' + item.nome + ' na bolsa';
  var verbo = item.tipo === 'comida' ? (Math.random() < 0.5 ? 'está comendo ' : 'está saboreando ') : 'está bebendo ';
  return verbo + item.nome;
}
function statusRecebendo(itemNome, remetenteNome) {
  return 'recebeu ' + itemNome + ' de ' + remetenteNome;
}

function dbGet(p)      { return fetch(DB+p+'.json').then(function(r){ return r.json(); }); }
function dbPatch(p, d) { return fetch(DB+p+'.json', { method:'PATCH',  body:JSON.stringify(d) }); }
function dbPut(p, d)   { return fetch(DB+p+'.json', { method:'PUT',    body:JSON.stringify(d) }); }
function dbPost(p, d)  { return fetch(DB+p+'.json', { method:'POST',   body:JSON.stringify(d) }); }
function dbDel(p)      { return fetch(DB+p+'.json', { method:'DELETE' }); }
function fkey(uid)     { return 'u'+String(uid).replace(/^u/i,''); }

function getUser() {
  if (typeof _userdata !== 'undefined' && _userdata && _userdata.user_id)
    return { uid: String(_userdata.user_id).trim(), loginNome: _userdata.username||'', logado: true };
  return { logado: false };
}
function isAdmin(uid) { return ADMINS.indexOf(uid) !== -1; }
function fmtData(ts) {
  var d = new Date(ts);
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function diaAtual() {
  var d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function getNome(uid) {
  return dbGet('/saldos/'+fkey(uid)).then(function(d){ return d&&d.nome ? d.nome : 'u'+uid; });
}

 
function getFuncionarioDisponivel() {
  return dbGet('/caldeirao/funcionarios').then(function(funcs) {
    if (!funcs) return null;
    var agora = Date.now();
    var lista = Object.keys(funcs).map(function(k) {
      var f = funcs[k]; if (!f) return null;
      f._key = k; return f;
    }).filter(function(f) {
      return f && (!f.ocupado_ate || agora > f.ocupado_ate);
    });
    if (!lista.length) return null;
    var escolhido = lista[Math.floor(Math.random() * lista.length)];
 
    return dbPatch('/caldeirao/funcionarios/'+escolhido._key, {
      ocupado_ate: agora + ATENDENTE_TTL
    }).then(function() { return escolhido; });
  });
}

function limparInativos(ativas) {
  if (!ativas) return Promise.resolve();
  var agora = Date.now(), promessas = [];
  Object.keys(ativas).forEach(function(k) {
    var s = ativas[k]; if (!s) return;
    if (agora - (s.ultimo_ativo || s.entrou_em || 0) > INATIVIDADE_MS)
      promessas.push(dbDel('/caldeirao/ativas/'+k));
  });
  return Promise.all(promessas);
}

function pingAtivo(uid) {
  return dbPatch('/caldeirao/ativas/'+fkey(uid), { ultimo_ativo: Date.now() });
}

var _statusTimer  = null;
var _consumoTimer = null;

function iniciarStatusTicker(uid) {
  pararStatusTicker();
  _statusTimer = setInterval(function() {
    dbPatch('/caldeirao/ativas/'+fkey(uid), { status: statusGenerico(), ultimo_ativo: Date.now() });
  }, STATUS_TIMER);
}

function pararStatusTicker() {
  if (_statusTimer)  { clearInterval(_statusTimer);  _statusTimer  = null; }
  if (_consumoTimer) { clearTimeout(_consumoTimer);  _consumoTimer = null; }
}

function setStatusConsumo(uid, item) {
  if (_consumoTimer) clearTimeout(_consumoTimer);
  dbPatch('/caldeirao/ativas/'+fkey(uid), { status: statusConsumo(item), ultimo_ativo: Date.now() });
  _consumoTimer = setTimeout(function() {
    dbPatch('/caldeirao/ativas/'+fkey(uid), { status: statusGenerico() });
  }, CONSUMO_TIMER);
}
 
function setStatusPresente(alvoUid, itemNome, remetenteNome) {
  dbPatch('/caldeirao/ativas/'+fkey(alvoUid), {
    status: statusRecebendo(itemNome, remetenteNome),
    ultimo_ativo: Date.now()
  });
  setTimeout(function() {
    dbPatch('/caldeirao/ativas/'+fkey(alvoUid), { status: statusGenerico() });
  }, CONSUMO_TIMER);
}

function verificarLimiteDiario(uid, itemId, limite) {
  if (!limite || limite <= 0) return Promise.resolve(true);
  return dbGet('/caldeirao/limite_diario/'+diaAtual()+'/'+fkey(uid)+'/'+itemId).then(function(qtd) {
    return (qtd || 0) < limite;
  });
}

function incrementarLimiteDiario(uid, itemId) {
  return dbGet('/caldeirao/limite_diario/'+diaAtual()+'/'+fkey(uid)+'/'+itemId).then(function(qtd) {
    return dbPut('/caldeirao/limite_diario/'+diaAtual()+'/'+fkey(uid)+'/'+itemId, (qtd || 0) + 1);
  });
}

function getLimiteDiarioUsado(uid, itemId) {
  return dbGet('/caldeirao/limite_diario/'+diaAtual()+'/'+fkey(uid)+'/'+itemId).then(function(qtd) {
    return qtd || 0;
  });
}

function resolverEfeitos(item) {
  if (item.efeitos && Array.isArray(item.efeitos) && item.efeitos.length) return item.efeitos;
  if (item.efeito === 'hp' || item.efeito === 'energia')
    return [{ tipo: item.efeito, valor: item.valor_efeito || 0 }];
  return [];
}

function aplicarEfeitos(uid, item) {
  var efeitos = resolverEfeitos(item);
  if (!efeitos.length || item.destino === 'inventario') return Promise.resolve();
  return dbGet('/status-perfil/'+fkey(uid)).then(function(d) {
    if (!d) return;
    var patch = {};
    efeitos.forEach(function(ef) {
      if (ef.tipo === 'hp') {
        patch.hp_cur = Math.max(0, Math.min(d.hp_tot || 0, (d.hp_cur || 0) + (ef.valor || 0)));
      } else if (ef.tipo === 'energia') {
        patch.energia_cur = Math.max(0, Math.min(d.energia_tot || 0, (d.energia_cur || 0) + (ef.valor || 0)));
      }
    });
    if (Object.keys(patch).length) return dbPatch('/status-perfil/'+fkey(uid), patch);
  });
}

function labelEfeitos(item) {
  var efeitos = resolverEfeitos(item);
  if (item.destino === 'inventario') return 'Vai pro baú';
  return efeitos.map(function(ef) {
    var sinal = ef.valor >= 0 ? '+' : '';
    return sinal + ef.valor + (ef.tipo === 'hp' ? ' HP' : ' EN');
  }).join(' / ');
}

function adicionarInventario(uid, item) {
  return dbPost('/inventario/'+fkey(uid), {
    nome: item.nome, descricao: item.descricao || '',
    categoria: 'Consumiveis', icone: item.icone || '',
    quantidade: 1, valor: item.preco || 0, origem: 'caldeirao'
  });
} 
function comprarItem(user, itemId, item, nomePersonagem) {
  return verificarLimiteDiario(user.uid, itemId, item.limite_diario).then(function(pode) {
    if (!pode) { caldToast('Limite diário atingido para este item.'); return false; }
    return dbGet('/saldos/'+fkey(user.uid)).then(function(saldo) {
      var saldoAtual = saldo ? (saldo.saldo || 0) : 0;
      if (saldoAtual < item.preco) { caldToast('Saldo insuficiente. Você tem '+saldoAtual+' Galeões.'); return false; }
      return dbGet('/caldeirao/catalogo/'+itemId).then(function(itemAtual) {
        if (!itemAtual) { caldToast('Item não encontrado.'); return false; }
        var ilimitado = itemAtual.estoque_max === 0 || itemAtual.ilimitado;
        if (!ilimitado && itemAtual.estoque <= 0) { caldToast('Item esgotado.'); return false; }

        var promessas = [];
        promessas.push(dbPatch('/saldos/'+fkey(user.uid), { saldo: saldoAtual - item.preco }));
        if (!ilimitado) promessas.push(dbPatch('/caldeirao/catalogo/'+itemId, { estoque: itemAtual.estoque - 1 }));
        if (item.destino === 'inventario') promessas.push(adicionarInventario(user.uid, item));
        else promessas.push(aplicarEfeitos(user.uid, item));
        if (item.limite_diario) promessas.push(incrementarLimiteDiario(user.uid, itemId));
        promessas.push(dbPost('/caldeirao/historico', {
          uid: user.uid, nome: nomePersonagem, item: item.nome,
          preco: item.preco, efeitos: resolverEfeitos(item),
          efeito: item.efeito || null, valor_efeito: item.valor_efeito || null,
          destino: item.destino, ts: Date.now()
        }));
        promessas.push(pingAtivo(user.uid));
        animarGaleoes(-item.preco);
        atualizarStatusBarOtimista(user.uid, nomePersonagem, item, saldoAtual - item.preco);
        return Promise.all(promessas).then(function() {
          setStatusConsumo(user.uid, item);
          caldToast('Comprado: '+item.nome+'!', 5000);
          renderStatusBar(user.uid, nomePersonagem);
          registrarPedidoCaldeirao(nomePersonagem, item.nome, null, item.preco);
          return true;
        });
      });
    });
  });
}

 
function presentearItem(user, itemId, item, nomeRemetente, alvoUid, alvoNome) {
  return dbGet('/saldos/'+fkey(user.uid)).then(function(saldo) {
    var saldoAtual = saldo ? (saldo.saldo || 0) : 0;
    if (saldoAtual < item.preco) { caldToast('Saldo insuficiente. Você tem '+saldoAtual+' Galeões.'); return false; }
    return dbGet('/caldeirao/catalogo/'+itemId).then(function(itemAtual) {
      if (!itemAtual) { caldToast('Item não encontrado.'); return false; }
      var ilimitado = itemAtual.estoque_max === 0 || itemAtual.ilimitado;
      if (!ilimitado && itemAtual.estoque <= 0) { caldToast('Item esgotado.'); return false; }

      var promessas = [];
      promessas.push(dbPatch('/saldos/'+fkey(user.uid), { saldo: saldoAtual - item.preco }));
      if (!ilimitado) promessas.push(dbPatch('/caldeirao/catalogo/'+itemId, { estoque: itemAtual.estoque - 1 }));
       
      if (item.destino === 'inventario') promessas.push(adicionarInventario(alvoUid, item));
      else promessas.push(aplicarEfeitos(alvoUid, item));
      promessas.push(dbPost('/caldeirao/historico', {
        uid: alvoUid, nome: alvoNome, item: item.nome,
        preco: item.preco, efeitos: resolverEfeitos(item),
        efeito: item.efeito || null, valor_efeito: item.valor_efeito || null,
        destino: item.destino,
        remetente_uid: user.uid, remetente_nome: nomeRemetente,
        ts: Date.now()
      }));
      promessas.push(pingAtivo(user.uid));
      animarGaleoes(-item.preco);
      return Promise.all(promessas).then(function() {
        setStatusPresente(alvoUid, item.nome, nomeRemetente);
        caldToast(item.nome+' enviado para '+alvoNome+'!', 5000);
        renderStatusBar(user.uid, nomeRemetente);
        registrarPedidoCaldeirao(nomeRemetente, item.nome, alvoNome, item.preco);
        return true;
      });
    });
  });
}
 
function registrarPedidoCaldeirao(nomeCliente, nomeItem, nomeDestino, preco) {
  var mensagem =
    '<div class="atualizabx">\n' +
    '[b] Cliente:[/b] "' + nomeCliente + '"\n' +
    '[b] Compra:[/b] "' + nomeItem + '"\n' +
    '[b] Valor:[/b] "' + (preco || 0).toLocaleString('pt-BR') + ' Galeões"' +
    (nomeDestino ? '\n[b] Destino:[/b] "' + nomeDestino + '"' : '') +
    '\n</div>';
  if (typeof $ !== 'undefined' && $.post) {
    $.post('/post', {
      mode: 'reply',
      post: '610',
      t: '610',
      subject: 'Consumo — O Caldeirão Furado',
      message: mensagem
    });
  }
}
 
function entrar(user, nomePersonagem) {
  return getFuncionarioDisponivel().then(function(func) {
    var statusInicial = func
      ? 'sendo atendido por ' + func.nome
      : 'sendo atendido por um funcionário';
    return dbPut('/caldeirao/ativas/'+fkey(user.uid), {
      uid: user.uid, nome: nomePersonagem,
      status: statusInicial,
      entrou_em: Date.now(), ultimo_ativo: Date.now()
    });
  });
}

function sair(uid) {
  pararStatusTicker();
  return dbDel('/caldeirao/ativas/'+fkey(uid));
}

function caldToast(msg, dur) {
  var t = document.getElementById('cald-toast'); if (!t) return;
  t.textContent = msg; t.style.opacity = '1';
  setTimeout(function() { t.style.opacity = '0'; }, dur || 4000);
}

function renderPresentes(ativas) {
  var el = document.getElementById('cald-presentes'); if (!el) return;
  var agora = Date.now();
  var lista = Object.values(ativas || {}).filter(function(s) {
    return s && s.uid && (agora - (s.ultimo_ativo || s.entrou_em || 0) <= INATIVIDADE_MS);
  });
  if (!lista.length) { el.innerHTML = '<div class="cald-vazia">O Caldeirão Furado está vazio no momento.</div>'; return; }
  el.innerHTML = lista.map(function(s) {
    return '<div class="cald-presente">'+
      '<span class="cald-presente-nome">'+(s.nome||'u'+s.uid)+'</span>'+
      '<span class="cald-presente-sep">·</span>'+
      '<span class="cald-presente-status">'+(s.status||'está aqui')+'</span>'+
    '</div>';
  }).join('');
}

function renderPainelEntrar(user) {
  var sb = document.getElementById('cald-statusbar');
  if (sb) sb.style.display = 'none';
  var el = document.getElementById('cald-painel'); if (!el) return;
  el.innerHTML =
    '<div class="cald-entrar">'+
      '<p class="cald-entrar-txt">Entre no Caldeirão Furado</p>'+
      '<button id="cald-btn-entrar" class="cald-btn-principal">Entrar</button>'+
    '</div>';
  document.getElementById('cald-btn-entrar').addEventListener('click', function() {
    el.innerHTML = '<p class="cald-hint">Entrando...</p>';
    getNome(user.uid).then(function(nome) {
      entrar(user, nome).then(function() {
        iniciarStatusTicker(user.uid);
        document.getElementById('cald-statusbar').style.display = 'flex';
        renderStatusBar(user.uid, nome);
        carregarCaldeirao(user);
        renderPainelLogado(user, nome);
      });
    });
  });
}

function renderPainelLogado(user, nomePersonagem) {
  var el = document.getElementById('cald-painel'); if (!el) return;
  dbGet('/caldeirao/funcionarios/'+fkey(user.uid)).then(function(func) {
    var podGerir = isAdmin(user.uid) || !!func;
    el.innerHTML =
      '<div class="cald-tabs">'+
        '<button class="cald-tab cald-tab-ativo" data-tab="cardapio">Cardápio</button>'+
        '<button class="cald-tab" data-tab="equipe">Equipe</button>'+
        '<button class="cald-tab" data-tab="historico">Histórico</button>'+
        (podGerir ? '<button class="cald-tab" data-tab="gerenciar">Gerenciar</button>' : '')+
      '</div>'+
      '<div id="cald-tab-content"></div>'+
      '<button id="cald-btn-sair" class="cald-btn-sair">Sair do Caldeirão</button>';

    el.querySelectorAll('.cald-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        el.querySelectorAll('.cald-tab').forEach(function(b) { b.classList.remove('cald-tab-ativo'); });
        btn.classList.add('cald-tab-ativo');
        renderTab(user, nomePersonagem, btn.dataset.tab, podGerir);
        pingAtivo(user.uid);
      });
    });

    document.getElementById('cald-btn-sair').addEventListener('click', function() {
      sair(user.uid).then(function() { renderPainelEntrar(user); carregarCaldeirao(user); });
    });

    renderTab(user, nomePersonagem, 'cardapio', podGerir);
  });
}

function renderTab(user, nomePersonagem, aba, podGerir) {
  var el = document.getElementById('cald-tab-content'); if (!el) return;
  el.innerHTML = '';
  if      (aba === 'cardapio')              renderCardapio(user, nomePersonagem, el);
  else if (aba === 'equipe')                renderEquipe(el);
  else if (aba === 'historico')             renderHistorico(el);
  else if (aba === 'gerenciar' && podGerir) renderGerenciar(user, el);
}

function renderIcone(icone) {
  if (!icone) return '';
  if (icone.startsWith('http') || icone.startsWith('/'))
    return '<img src="'+icone+'" style="width:36px;height:36px;object-fit:contain;border-radius:4px;">';
  return icone;
}

function renderCardapio(user, nomePersonagem, el) {
  el.innerHTML = '<p class="cald-hint">Carregando...</p>';
  Promise.all([
    dbGet('/caldeirao/catalogo'),
    dbGet('/saldos/'+fkey(user.uid)),
    dbGet('/caldeirao/limite_diario/'+diaAtual()+'/'+fkey(user.uid)),
    dbGet('/caldeirao/ativas')
  ]).then(function(res) {
    var catalogo   = res[0] || {};
    var saldo      = res[1];
    var usadoHoje  = res[2] || {};
    var ativas     = res[3] || {};
    var saldoAtual = saldo ? (saldo.saldo || 0) : 0;
    var agora      = Date.now();
 
    var presentes = Object.values(ativas).filter(function(s) {
      return s && s.uid && String(s.uid) !== String(user.uid) &&
        (agora - (s.ultimo_ativo || s.entrou_em || 0) <= INATIVIDADE_MS);
    });

    var itens = Object.keys(catalogo).map(function(id) {
      var it = catalogo[id]; it._id = id; return it;
    }).filter(function(it) { return it && it.nome; });

    if (!itens.length) { el.innerHTML = '<p class="cald-hint">Nenhum item disponível no momento.</p>'; return; }

    el.innerHTML =
      '<p class="cald-saldo-info">Seu saldo: <strong>'+saldoAtual+' Galeões</strong></p>'+
      '<div class="cald-grid">'+
      itens.map(function(it) {
        var ilimitado     = it.ilimitado || it.estoque_max === 0;
        var esgotado      = !ilimitado && it.estoque <= 0;
        var usadoItem     = usadoHoje[it._id] || 0;
        var limiteAtingido = it.limite_diario && usadoItem >= it.limite_diario;
        var semSaldo      = saldoAtual < it.preco;
        var bloqueado     = esgotado || limiteAtingido;
        var efeitoLabel   = labelEfeitos(it);
        var estoqueLabel  = ilimitado ? 'Ilimitado' : esgotado ? 'Esgotado' : 'Estoque: '+it.estoque;
        var limiteLabel   = it.limite_diario ? (limiteAtingido ? 'Limite diário atingido' : usadoItem+'/'+it.limite_diario+' hoje') : '';

       
        var selectPresentes = presentes.length
          ? '<select class="cald-input cald-sel-presente" data-id="'+it._id+'" style="font-size:11px;padding:4px 6px;margin-top:4px">'+
              presentes.map(function(p) {
                return '<option value="'+p.uid+'" data-nome="'+(p.nome||'u'+p.uid)+'">'+(p.nome||'u'+p.uid)+'</option>';
              }).join('')+
            '</select>'
          : '';

        var btnPresentear = (!bloqueado && !semSaldo && presentes.length)
          ? '<button class="cald-btn-comprar cald-btn-presentear" data-id="'+it._id+'" style="background:rgba(126,207,160,.2);border-color:rgba(126,207,160,.4);margin-top:4px;font-size:11px">🎁 Presentear</button>'
          : '';

        return '<div class="cald-card'+(bloqueado?' cald-card-esgotado':'')+'">'+
          '<div class="cald-card-icone">'+renderIcone(it.icone)+'</div>'+
          '<div class="cald-card-info">'+
            '<div class="cald-card-nome">'+it.nome+'</div>'+
            '<div class="cald-card-desc">'+(it.descricao||'')+'</div>'+
            '<div class="cald-card-rodape">'+
              '<span class="cald-card-preco">'+it.preco+' G</span>'+
              (efeitoLabel ? '<span class="cald-card-efeito">'+efeitoLabel+'</span>' : '')+
              '<span class="cald-card-estoque'+(esgotado||limiteAtingido?' cald-esgotado':'')+'">'+
                (limiteAtingido ? limiteLabel : estoqueLabel+(limiteLabel?' · '+limiteLabel:''))+
              '</span>'+
            '</div>'+
            (selectPresentes ? '<div class="cald-presentear-wrap">'+selectPresentes+btnPresentear+'</div>' : '')+
          '</div>'+
          (!bloqueado && !semSaldo
            ? '<button class="cald-btn-comprar cald-btn-comprar-proprio" data-id="'+it._id+'">Comprar</button>'
            : '<button class="cald-btn-comprar" disabled>'+(bloqueado?(limiteAtingido?'Limite':'Esgotado'):'Sem saldo')+'</button>')+
        '</div>';
      }).join('')+
      '</div>';
 
    el.querySelectorAll('.cald-btn-comprar-proprio').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.id, item = catalogo[id]; if (!item) return;
        btn.disabled = true; btn.textContent = '...';
        comprarItem(user, id, item, nomePersonagem).then(function(ok) {
          if (ok) renderCardapio(user, nomePersonagem, el);
          else { btn.disabled = false; btn.textContent = 'Comprar'; }
        });
      });
    });
 
    el.querySelectorAll('.cald-btn-presentear').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id   = btn.dataset.id;
        var item = catalogo[id]; if (!item) return;
        var wrap = btn.closest('.cald-presentear-wrap');
        var sel  = wrap ? wrap.querySelector('.cald-sel-presente') : null;
        if (!sel) return;
        var alvoUid  = sel.value;
        var alvoNome = sel.options[sel.selectedIndex].dataset.nome || ('u'+alvoUid);
        if (!window.confirm('Enviar "'+item.nome+'" para '+alvoNome+'?')) return;
        btn.disabled = true; btn.textContent = '...';
        presentearItem(user, id, item, nomePersonagem, alvoUid, alvoNome).then(function(ok) {
          if (ok) renderCardapio(user, nomePersonagem, el);
          else { btn.disabled = false; btn.textContent = '🎁 Presentear'; }
        });
      });
    });
  });
}

function renderEquipe(el) {
  el.innerHTML = '<p class="cald-hint">Carregando...</p>';
  dbGet('/caldeirao/funcionarios').then(function(funcs) {
    if (!funcs || !Object.keys(funcs).length) { el.innerHTML = '<p class="cald-hint">Nenhum funcionário cadastrado.</p>'; return; }
    el.innerHTML = '<div class="cald-func-lista">'+
      Object.values(funcs).filter(Boolean).map(function(f) {
        return '<div class="cald-func-card">'+
          '<div><div class="cald-func-nome">'+f.nome+'</div><div class="cald-func-cargo">'+(f.cargo||'Funcionário')+'</div></div>'+
        '</div>';
      }).join('')+'</div>';
  });
}

function renderHistorico(el) {
  el.innerHTML = '<p class="cald-hint">Carregando...</p>';
  dbGet('/caldeirao/historico').then(function(hist) {
    if (!hist) { el.innerHTML = '<p class="cald-hint">Nenhuma compra registrada ainda.</p>'; return; }
    var lista = Object.values(hist).filter(Boolean).sort(function(a,b){ return b.ts-a.ts; }).slice(0, 30);
    el.innerHTML = '<div class="cald-hist-lista">'+
      lista.map(function(h) {
        var efeitoStr = '';
        if (h.efeitos && Array.isArray(h.efeitos) && h.efeitos.length) {
          efeitoStr = h.efeitos.map(function(ef) {
            var sinal = ef.valor >= 0 ? '+' : '';
            return sinal + ef.valor + (ef.tipo === 'hp' ? ' HP' : ' EN');
          }).join(' / ');
        } else if (h.efeito === 'hp') {
          efeitoStr = '+'+h.valor_efeito+' HP';
        } else if (h.efeito === 'energia') {
          efeitoStr = '+'+h.valor_efeito+' EN';
        } else if (h.destino === 'inventario') {
          efeitoStr = 'baú';
        } 
        var presenteStr = h.remetente_nome
          ? '<span class="cald-hist-efeito" style="background:rgba(126,207,160,.15);color:#7ecfa0">🎁 de '+h.remetente_nome+'</span>'
          : '';
        return '<div class="cald-hist-item">'+
          '<span class="cald-hist-data">'+fmtData(h.ts)+'</span>'+
          '<span class="cald-hist-nome">'+h.nome+'</span>'+
          '<span class="cald-hist-item-nome">'+h.item+'</span>'+
          (efeitoStr ? '<span class="cald-hist-efeito">'+efeitoStr+'</span>' : '')+
          presenteStr+
          '<span class="cald-hist-preco">'+h.preco+' G</span>'+
        '</div>';
      }).join('')+'</div>';
  });
}

function htmlFormEfeitos(efeitos) {
  var rows = (efeitos && efeitos.length) ? efeitos : [{ tipo: 'hp', valor: 0 }];
  return '<div id="ger-efeitos-wrap">'+
    '<div id="ger-efeitos-lista">'+
      rows.map(function(ef, i) { return htmlEfeitoRow(ef, i); }).join('')+
    '</div>'+
    '<button type="button" class="cald-btn-ger-sm" id="ger-ef-add" style="margin-top:6px">+ Efeito</button>'+
  '</div>';
}

function htmlEfeitoRow(ef, i) {
  return '<div class="ger-ef-row" data-i="'+i+'" style="display:flex;gap:6px;align-items:center;margin-bottom:4px">'+
    '<select class="cald-input ger-ef-tipo" style="flex:1" data-i="'+i+'">'+
      '<option value="hp"'+(ef.tipo==='hp'?' selected':'')+'>HP</option>'+
      '<option value="energia"'+(ef.tipo==='energia'?' selected':'')+'>Energia</option>'+
    '</select>'+
    '<input class="cald-input ger-ef-valor" type="number" placeholder="ex: 10 ou -5" value="'+(ef.valor||0)+'" style="flex:1" data-i="'+i+'">'+
    '<button type="button" class="cald-btn-ger-sm ger-ef-rm" data-i="'+i+'" style="padding:2px 8px">✕</button>'+
  '</div>';
}

function bindEfeitosForm(wrap) {
  function reindexar() {
    wrap.querySelectorAll('.ger-ef-row').forEach(function(row, i) {
      row.dataset.i = i;
      row.querySelector('.ger-ef-tipo').dataset.i = i;
      row.querySelector('.ger-ef-valor').dataset.i = i;
      row.querySelector('.ger-ef-rm').dataset.i = i;
    });
  }
  wrap.querySelectorAll('.ger-ef-rm').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var rows = wrap.querySelectorAll('.ger-ef-row');
      if (rows.length <= 1) return;
      btn.closest('.ger-ef-row').remove();
      reindexar();
    });
  });
  var addBtn = wrap.querySelector('#ger-ef-add');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      var lista = wrap.querySelector('#ger-efeitos-lista');
      var idx   = lista.querySelectorAll('.ger-ef-row').length;
      lista.insertAdjacentHTML('beforeend', htmlEfeitoRow({ tipo: 'hp', valor: 0 }, idx));
      bindEfeitosForm(wrap);
    });
  }
}

function lerEfeitosForm(wrap) {
  var efeitos = [];
  wrap.querySelectorAll('.ger-ef-row').forEach(function(row) {
    var tipo  = row.querySelector('.ger-ef-tipo').value;
    var valor = parseInt(row.querySelector('.ger-ef-valor').value) || 0;
    efeitos.push({ tipo: tipo, valor: valor });
  });
  return efeitos;
}

function renderGerenciar(user, el) {
  var admin = isAdmin(user.uid);
  el.innerHTML = '<p class="cald-hint">Carregando...</p>';
  dbGet('/caldeirao/catalogo').then(function(catalogo) {
    catalogo = catalogo || {};
    var itens = Object.keys(catalogo).map(function(id) { var it = catalogo[id]; if(it) it._id = id; return it; }).filter(Boolean);

    var htmlNovoItem = admin
      ? '<div class="cald-ger-secao">'+
          '<div class="cald-ger-titulo">Novo item</div>'+
          '<div class="cald-ger-form" id="ger-form-novo">'+
            '<input class="cald-input" id="ger-icone" placeholder="Ícone (emoji ou URL)">'+
            '<input class="cald-input" id="ger-nome" placeholder="Nome do item">'+
            '<input class="cald-input" id="ger-desc" placeholder="Descrição">'+
            '<input class="cald-input" id="ger-preco" type="number" min="1" placeholder="Preço em Galeões">'+
            '<select class="cald-input" id="ger-tipo">'+
              '<option value="bebida">Bebida</option>'+
              '<option value="comida">Comida</option>'+
              '<option value="outro">Outro</option>'+
            '</select>'+
            '<select class="cald-input" id="ger-destino">'+
              '<option value="consumo">Consumo imediato (aplica efeitos)</option>'+
              '<option value="inventario">Vai pro baú</option>'+
            '</select>'+
            '<div id="ger-efeitos-container">'+htmlFormEfeitos([])+'</div>'+
            '<div class="cald-ger-row">'+
              '<label class="cald-check-label"><input type="checkbox" id="ger-ilimitado"> Estoque ilimitado</label>'+
            '</div>'+
            '<div id="ger-estoque-wrap">'+
              '<input class="cald-input" id="ger-estoque" type="number" min="1" max="15" value="15" placeholder="Estoque inicial (máx 15)">'+
            '</div>'+
            '<input class="cald-input" id="ger-limite" type="number" min="0" placeholder="Limite por jogador por dia (0 = sem limite)">'+
            '<button class="cald-btn-ger" id="ger-btn-add">Adicionar item</button>'+
          '</div>'+
        '</div>'
      : '';

    el.innerHTML =
      htmlNovoItem +
      '<div class="cald-ger-secao">'+
        '<div class="cald-ger-titulo">Estoque</div>'+
        (!itens.length ? '<p class="cald-hint">Nenhum item cadastrado.</p>' :
          '<div class="cald-est-lista">'+
          itens.map(function(it) {
            var ilimitado = it.ilimitado || it.estoque_max === 0;
            return '<div class="cald-est-item">'+
              '<span class="cald-est-icone">'+renderIcone(it.icone||'')+'</span>'+
              '<span class="cald-est-nome">'+it.nome+(it.limite_diario?' <span class="cald-est-limite">lim/dia: '+it.limite_diario+'</span>':'')+'</span>'+
              '<span class="cald-est-qtd">'+(ilimitado?'∞':it.estoque+'/'+it.estoque_max)+'</span>'+
              (!ilimitado ? '<input class="cald-input cald-input-sm" type="number" min="0" max="15" value="15" id="rep-'+it._id+'">' : '')+
              (!ilimitado ? '<button class="cald-btn-ger-sm cald-btn-repor" data-id="'+it._id+'">Repor</button>' : '')+
              (admin ? '<button class="cald-btn-ger-sm cald-btn-editar" data-id="'+it._id+'">Editar</button>' : '')+
              (admin ? '<button class="cald-btn-ger-sm cald-btn-rm" data-id="'+it._id+'">✕</button>' : '')+
            '</div>';
          }).join('')+'</div>'
        )+
      '</div>'+
      (admin ?
        '<div class="cald-ger-secao" id="ger-secao-editar" style="display:none">'+
          '<div class="cald-ger-titulo">Editar item</div>'+
          '<div class="cald-ger-form" id="ger-form-editar"></div>'+
        '</div>' : '')+
      (admin ?
        '<div class="cald-ger-secao">'+
          '<div class="cald-ger-titulo">Funcionários</div>'+
          '<div class="cald-ger-form">'+
            '<input class="cald-input" id="func-uid" placeholder="UID do usuário">'+
            '<input class="cald-input" id="func-nome" placeholder="Nome do personagem">'+
            '<input class="cald-input" id="func-cargo" placeholder="Cargo">'+
            '<button class="cald-btn-ger" id="func-btn-add">Adicionar funcionário</button>'+
          '</div>'+
          '<div id="cald-func-admin-lista"></div>'+
        '</div>' : '');

    if (admin) {
      var efCont  = el.querySelector('#ger-efeitos-container');
      var selDest = el.querySelector('#ger-destino');
      selDest.addEventListener('change', function() {
        efCont.style.display = selDest.value === 'inventario' ? 'none' : 'block';
      });
      var chkIlim    = el.querySelector('#ger-ilimitado');
      var estoqueWrap = el.querySelector('#ger-estoque-wrap');
      chkIlim.addEventListener('change', function() {
        estoqueWrap.style.display = chkIlim.checked ? 'none' : 'block';
      });
      bindEfeitosForm(efCont);

      el.querySelector('#ger-btn-add').addEventListener('click', function() {
        var nome     = el.querySelector('#ger-nome').value.trim();
        var preco    = parseInt(el.querySelector('#ger-preco').value) || 0;
        var destino  = el.querySelector('#ger-destino').value;
        var ilimitado = el.querySelector('#ger-ilimitado').checked;
        var estoque  = ilimitado ? 0 : Math.min(15, parseInt(el.querySelector('#ger-estoque').value) || 15);
        var limite   = parseInt(el.querySelector('#ger-limite').value) || 0;
        if (!nome || preco <= 0) { caldToast('Preencha nome e preço.'); return; }
        var efeitos  = destino === 'consumo' ? lerEfeitosForm(efCont) : [];
        var novoItem = {
          icone: el.querySelector('#ger-icone').value.trim() || '',
          nome: nome, descricao: el.querySelector('#ger-desc').value.trim(),
          preco: preco, tipo: el.querySelector('#ger-tipo').value,
          destino: destino, ilimitado: ilimitado,
          estoque: estoque, estoque_max: estoque, efeitos: efeitos
        };
        if (limite > 0) novoItem.limite_diario = limite;
        dbPost('/caldeirao/catalogo', novoItem).then(function() {
          caldToast('Item adicionado!'); renderGerenciar(user, el);
        });
      });

      el.querySelectorAll('.cald-btn-editar').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id    = btn.dataset.id;
          var it    = catalogo[id]; if (!it) return;
          var secao = el.querySelector('#ger-secao-editar');
          var form  = el.querySelector('#ger-form-editar');
          secao.style.display = 'block';
          secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var ilimitado      = it.ilimitado || it.estoque_max === 0;
          var efeitosAtuais  = resolverEfeitos(it);
          form.innerHTML =
            '<input class="cald-input" id="edit-icone" placeholder="Ícone (emoji ou URL)" value="'+(it.icone||'')+'">'+
            '<input class="cald-input" id="edit-nome" placeholder="Nome do item" value="'+(it.nome||'')+'">'+
            '<input class="cald-input" id="edit-desc" placeholder="Descrição" value="'+(it.descricao||'')+'">'+
            '<input class="cald-input" id="edit-preco" type="number" min="1" placeholder="Preço em Galeões" value="'+(it.preco||0)+'">'+
            '<select class="cald-input" id="edit-tipo">'+
              '<option value="bebida"'+(it.tipo==='bebida'?' selected':'')+'>Bebida</option>'+
              '<option value="comida"'+(it.tipo==='comida'?' selected':'')+'>Comida</option>'+
              '<option value="outro"'+(it.tipo==='outro'?' selected':'')+'>Outro</option>'+
            '</select>'+
            '<select class="cald-input" id="edit-destino">'+
              '<option value="consumo"'+(it.destino==='consumo'?' selected':'')+'>Consumo imediato (aplica efeitos)</option>'+
              '<option value="inventario"'+(it.destino==='inventario'?' selected':'')+'>Vai pro baú</option>'+
            '</select>'+
            '<div id="edit-efeitos-container" style="'+(it.destino==='inventario'?'display:none':'')+'">'+
              htmlFormEfeitos(efeitosAtuais)+
            '</div>'+
            '<div class="cald-ger-row">'+
              '<label class="cald-check-label"><input type="checkbox" id="edit-ilimitado"'+(ilimitado?' checked':'')+'>Estoque ilimitado</label>'+
            '</div>'+
            '<div id="edit-estoque-wrap" style="'+(ilimitado?'display:none':'')+'">'+
              '<input class="cald-input" id="edit-estoque" type="number" min="0" max="15" value="'+(it.estoque||0)+'" placeholder="Estoque atual">'+
              '<input class="cald-input" id="edit-estoque-max" type="number" min="0" max="15" value="'+(it.estoque_max||0)+'" placeholder="Estoque máximo">'+
            '</div>'+
            '<input class="cald-input" id="edit-limite" type="number" min="0" placeholder="Limite por jogador por dia (0 = sem limite)" value="'+(it.limite_diario||0)+'">'+
            '<div style="display:flex;gap:8px">'+
              '<button class="cald-btn-ger" id="edit-btn-salvar">Salvar alterações</button>'+
              '<button class="cald-btn-ger-sm" id="edit-btn-cancelar">Cancelar</button>'+
            '</div>';

          var editEfCont  = form.querySelector('#edit-efeitos-container');
          var editSelDest = form.querySelector('#edit-destino');
          editSelDest.addEventListener('change', function() {
            editEfCont.style.display = editSelDest.value === 'inventario' ? 'none' : 'block';
          });
          var editChkIlim = form.querySelector('#edit-ilimitado');
          var editEstWrap = form.querySelector('#edit-estoque-wrap');
          editChkIlim.addEventListener('change', function() {
            editEstWrap.style.display = editChkIlim.checked ? 'none' : 'block';
          });
          bindEfeitosForm(editEfCont);
          form.querySelector('#edit-btn-cancelar').addEventListener('click', function() {
            secao.style.display = 'none';
          });
          form.querySelector('#edit-btn-salvar').addEventListener('click', function() {
            var nomeEdit       = form.querySelector('#edit-nome').value.trim();
            var precoEdit      = parseInt(form.querySelector('#edit-preco').value) || 0;
            var destinoEdit    = form.querySelector('#edit-destino').value;
            var ilimEdit       = form.querySelector('#edit-ilimitado').checked;
            var estoqueEdit    = ilimEdit ? 0 : Math.min(15, parseInt(form.querySelector('#edit-estoque').value) || 0);
            var estoqueMaxEdit = ilimEdit ? 0 : Math.min(15, parseInt(form.querySelector('#edit-estoque-max').value) || 0);
            var limiteEdit     = parseInt(form.querySelector('#edit-limite').value) || 0;
            if (!nomeEdit || precoEdit <= 0) { caldToast('Preencha nome e preço.'); return; }
            var efeitosEdit    = destinoEdit === 'consumo' ? lerEfeitosForm(editEfCont) : [];
            var itemAtualizado = {
              icone: form.querySelector('#edit-icone').value.trim() || '',
              nome: nomeEdit, descricao: form.querySelector('#edit-desc').value.trim(),
              preco: precoEdit, tipo: form.querySelector('#edit-tipo').value,
              destino: destinoEdit, ilimitado: ilimEdit,
              estoque: estoqueEdit, estoque_max: estoqueMaxEdit,
              efeitos: efeitosEdit,
              limite_diario: limiteEdit > 0 ? limiteEdit : null
            };
            dbPut('/caldeirao/catalogo/'+id, itemAtualizado).then(function() {
              caldToast('Item atualizado!');
              secao.style.display = 'none';
              renderGerenciar(user, el);
            });
          });
        });
      });

      el.querySelectorAll('.cald-btn-rm').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (!window.confirm('Remover este item?')) return;
          dbDel('/caldeirao/catalogo/'+btn.dataset.id).then(function() { renderGerenciar(user, el); });
        });
      });

      carregarFuncsAdmin(el);
      el.querySelector('#func-btn-add').addEventListener('click', function() {
        var uid   = el.querySelector('#func-uid').value.trim();
        var nome  = el.querySelector('#func-nome').value.trim();
        var cargo = el.querySelector('#func-cargo').value.trim();
        if (!uid || !nome) { caldToast('UID e nome são obrigatórios.'); return; }
        dbPut('/caldeirao/funcionarios/'+fkey(uid), { uid:uid, nome:nome, cargo:cargo }).then(function() {
          caldToast('Funcionário adicionado!'); carregarFuncsAdmin(el);
        });
      });
    }

    el.querySelectorAll('.cald-btn-repor').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id  = btn.dataset.id;
        var qtd = Math.min(15, parseInt(el.querySelector('#rep-'+id).value) || 0);
        dbPatch('/caldeirao/catalogo/'+id, { estoque: qtd, estoque_max: qtd }).then(function() {
          caldToast('Estoque reposto!'); renderGerenciar(user, el);
        });
      });
    });
  });
}

function carregarFuncsAdmin(el) {
  var lista = el.querySelector('#cald-func-admin-lista'); if (!lista) return;
  dbGet('/caldeirao/funcionarios').then(function(funcs) {
    if (!funcs || !Object.keys(funcs).length) { lista.innerHTML = '<p class="cald-hint">Nenhum funcionário.</p>'; return; }
    lista.innerHTML = '<div class="cald-func-lista" style="margin-top:10px">'+
      Object.keys(funcs).map(function(k) {
        var f = funcs[k]; if (!f) return '';
        return '<div class="cald-func-card">'+
          '<div style="flex:1"><div class="cald-func-nome">'+f.nome+'</div><div class="cald-func-cargo">'+(f.cargo||'')+'</div></div>'+
          '<button class="cald-btn-ger-sm cald-btn-rm-func" data-key="'+k+'">✕</button>'+
        '</div>';
      }).join('')+'</div>';
    lista.querySelectorAll('.cald-btn-rm-func').forEach(function(btn) {
      btn.addEventListener('click', function() {
        dbDel('/caldeirao/funcionarios/'+btn.dataset.key).then(function() { carregarFuncsAdmin(el); });
      });
    });
  });
}

var _polling = null;

function carregarCaldeirao(user) {
  dbGet('/caldeirao/ativas').then(function(ativas) {
    limparInativos(ativas).then(function() {
      dbGet('/caldeirao/ativas').then(function(ativasLimpas) {
        renderPresentes(ativasLimpas);
      });
    });
  });
}

function init() {
  var user = getUser();
  _el.innerHTML =
    '<div id="cald-wrapper"><div id="cald-bg"></div><div id="cald-layout">'+
    '<div id="cald-main">'+
      '<div id="cald-header">O Caldeirão Furado</div>'+
      '<div id="cald-statusbar" style="display:none"></div>'+
      '<div id="cald-presentes"></div>'+
      '<div id="cald-painel">'+
        (!user.logado ? '<div class="cald-entrar"><p class="cald-entrar-txt">Faça login para entrar.</p></div>' : '')+
      '</div>'+
    '</div>'+
    '</div></div>'+
    '<div id="cald-toast"></div>';

  if (user.logado) {
    dbGet('/caldeirao/ativas/'+fkey(user.uid)).then(function(sessao) {
      if (sessao && (Date.now() - (sessao.ultimo_ativo || sessao.entrou_em || 0)) <= INATIVIDADE_MS) {
        getNome(user.uid).then(function(nome) {
          iniciarStatusTicker(user.uid);
          document.getElementById('cald-statusbar').style.display = 'flex';
          renderStatusBar(user.uid, nome);
          renderPainelLogado(user, nome);
        });
      } else {
        renderPainelEntrar(user);
      }
    });
  }

  carregarCaldeirao(user);
  _polling = setInterval(function() { carregarCaldeirao(user); }, 30000);
}

function atualizarStatusBarOtimista(uid, nomePersonagem, item, novoSaldo) {
  var el = document.getElementById('cald-statusbar'); if (!el) return;
  var hpText = el.querySelector('.cald-sb-barra-row:nth-child(1) .cald-sb-val');
  var enText = el.querySelector('.cald-sb-barra-row:nth-child(2) .cald-sb-val');
  if (!hpText || !enText) return;
  var hpParts = hpText.textContent.split('/');
  var enParts = enText.textContent.split('/');
  var hpCur = parseInt(hpParts[0]) || 0, hpTot = parseInt(hpParts[1]) || 1;
  var enCur = parseInt(enParts[0]) || 0, enTot = parseInt(enParts[1]) || 1;
  if (item.destino !== 'inventario') {
    resolverEfeitos(item).forEach(function(ef) {
      if (ef.tipo === 'hp')      hpCur = Math.max(0, Math.min(hpTot, hpCur + (ef.valor || 0)));
      else if (ef.tipo === 'energia') enCur = Math.max(0, Math.min(enTot, enCur + (ef.valor || 0)));
    });
  }
  var hpPct = Math.min(100, Math.round(hpCur / hpTot * 100));
  var enPct = Math.min(100, Math.round(enCur / enTot * 100));
  el.querySelector('.cald-sb-fill-hp').style.width = hpPct + '%';
  el.querySelector('.cald-sb-fill-en').style.width = enPct + '%';
  hpText.textContent = hpCur + '/' + hpTot;
  enText.textContent = enCur + '/' + enTot;
  var gEl = el.querySelector('#cald-sb-g');
  if (gEl) gEl.textContent = novoSaldo.toLocaleString('pt-BR');
}

function renderStatusBar(uid, nomePersonagem) {
  var el = document.getElementById('cald-statusbar'); if (!el) return;
  Promise.all([
    dbGet('/saldos/'+fkey(uid)),
    dbGet('/status-perfil/'+fkey(uid))
  ]).then(function(res) {
    var saldo   = res[0] || {}, perfil = res[1] || {};
    var galeoes = saldo.saldo || 0;
    var hpCur   = perfil.hp_cur      || 0, hpTot = perfil.hp_tot      || 1;
    var enCur   = perfil.energia_cur  || 0, enTot = perfil.energia_tot  || 1;
    var hpPct   = Math.min(100, Math.round(hpCur / hpTot * 100));
    var enPct   = Math.min(100, Math.round(enCur / enTot * 100));
    var nome    = nomePersonagem || (saldo.nome || '');
    el.innerHTML =
      '<div class="cald-sb-topo">'+
        '<div>'+
          '<span class="cald-sb-galeoes-label">Galeões</span>'+
          '<span class="cald-sb-galeoes-val" id="cald-sb-g">'+galeoes.toLocaleString('pt-BR')+'</span>'+
        '</div>'+
        (nome ? '<span class="cald-sb-nome">'+nome+'</span>' : '')+
      '</div>'+
      '<div class="cald-sb-barras">'+
        '<div class="cald-sb-barra-row">'+
          '<span class="cald-sb-label cald-sb-label-hp">HP</span>'+
          '<div class="cald-sb-track"><div class="cald-sb-fill cald-sb-fill-hp" style="width:'+hpPct+'%"></div></div>'+
          '<span class="cald-sb-val">'+hpCur+'/'+hpTot+'</span>'+
        '</div>'+
        '<div class="cald-sb-barra-row">'+
          '<span class="cald-sb-label cald-sb-label-en">EN</span>'+
          '<div class="cald-sb-track"><div class="cald-sb-fill cald-sb-fill-en" style="width:'+enPct+'%"></div></div>'+
          '<span class="cald-sb-val">'+enCur+'/'+enTot+'</span>'+
        '</div>'+
      '</div>';
  });
}

function animarGaleoes(delta) {
  var el = document.getElementById('cald-sb-g'); if (!el) return;
  el.style.color = '#e07070';
  setTimeout(function() { el.style.color = '#d4a843'; }, 600);
}

init();

})();