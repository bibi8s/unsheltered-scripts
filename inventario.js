// @charset UTF-8
var DB = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';

async function dbGet(p) { var r = await fetch(DB + p + '.json'); return r.json(); }
async function dbPatch(p, d) { await fetch(DB + p + '.json', { method: 'PATCH', body: JSON.stringify(d) }); }
async function dbPost(p, d) { await fetch(DB + p + '.json', { method: 'POST', body: JSON.stringify(d) }); }

function normalizar(nome) {
  return String(nome).toLowerCase()
    .replace(/[àáâãä]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
    .replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function getInvUID() {
  var el = document.getElementById('inv-uid');
  if (el) return el.textContent.trim();
  var match = window.location.pathname.match(/\/u(\d+)/i);
  if (match) return match[1];
  return typeof _userdata !== 'undefined' ? String(_userdata.user_id) : null;
}

function isAdmin() {
  return typeof _userdata !== 'undefined' && _userdata.user_level >= 1;
}

function podeEditar(uid) {
  if (typeof _userdata === 'undefined') return false;
  return isAdmin() || String(_userdata.user_id) === String(uid);
}

function gringToast(msg, erro) {
  var t = document.getElementById('gring-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'gring-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = erro ? 'toast-erro' : '';
  t.style.opacity = '1';
  t.style.transform = 'translateY(0)';
  setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; }, 3500);
}


var DECAIMENTO_TABELA = {
  'comum':    { 'comum': 1, 'incomum': 2, 'magico': 3, 'epico': 4, 'lendario': null },
  'incomum':  { 'comum': 1, 'incomum': 1, 'magico': 2, 'epico': 3, 'lendario': null },
  'magico':   { 'comum': 1, 'incomum': 1, 'magico': 1, 'epico': 2, 'lendario': 4   },
  'epico':    { 'comum': 0, 'incomum': 1, 'magico': 1, 'epico': 1, 'lendario': 2   },
  'lendario': { 'comum': 0, 'incomum': 0, 'magico': 1, 'epico': 1, 'lendario': 1   }
};

function normalizarRaridade(r) {
  var s = r.toLowerCase().trim()
    .replace(/[\u00e1\u00e0\u00e3]/g, 'a')
    .replace(/[\u00e9\u00ea]/g, 'e')
    .replace(/[\u00ed]/g, 'i')
    .replace(/[\u00f3\u00f4]/g, 'o')
    .replace(/[\u00fa]/g, 'u')
    .replace(/[\u00e7]/g, 'c');
  var validas = { 'comum': 1, 'incomum': 1, 'magico': 1, 'epico': 1, 'lendario': 1 };
  return validas[s] ? s : null;
}

function getRotuloConservacao(atual, max) {
  if (!max || atual <= 0) return 'Quebrado';
  var pct = Math.round((atual / max) * 100);
  if (pct >= 100) return 'Perfeito';
  if (pct >= 75)  return 'Bom';
  if (pct >= 50)  return 'Gasto';
  if (pct >= 25)  return 'Danificado';
  return 'Critico';
}

function atualizarDescricaoDurabilidade(descricao, novoAtual, max) {
  if (!descricao) return descricao;
  var rotulo = getRotuloConservacao(novoAtual, max);
  return descricao.replace(
    /Estado de conserva[\u00e7c][a\u00e3]o do item:\s*[^\.]+\.\s*\d+\/\d+\./i,
    'Estado de conserva\u00e7\u00e3o do item: ' + rotulo + '. ' + novoAtual + '/' + max + '.'
  );
}

function parsearDurabilidade(descricao) {
  if (!descricao) return null;
  var m = descricao.match(/Estado de conserva[\u00e7c][a\u00e3]o do item:\s*[^\.]+\.\s*(\d+)\/(\d+)\./i);
  if (!m) return null;
  var atual = parseInt(m[1]);
  var max = parseInt(m[2]);
  if (isNaN(atual) || isNaN(max) || max <= 0) return null;
  return { atual: atual, max: max, quebrado: atual <= 0 };
}

function parsearRaridade(descricao) {
  if (!descricao) return null;
  var m = descricao.match(/Classifica[\u00e7c][a\u00e3]o do item:\s*([^\.|\n]+)\./i);
  if (!m) return null;
  return normalizarRaridade(m[1]);
}

async function garantirCamposDurabilidade(no, item) {
  if (item.durabilidade && item.raridade) return item;
  var updates = {};
  if (!item.durabilidade) {
    var pd = parsearDurabilidade(item.descricao);
    if (pd) { updates.durabilidade = pd; item.durabilidade = pd; }
  }
  if (!item.raridade) {
    var pr = parsearRaridade(item.descricao);
    if (pr) { updates.raridade = pr; item.raridade = pr; }
  }
  if (Object.keys(updates).length) await dbPatch(no, updates);
  return item;
}

function getDurExibicao(item) {
  if (item.durabilidade) return item.durabilidade;
  return parsearDurabilidade(item.descricao);
}

function renderDurabilidade(item, chave, local, admin) {
  var dur = getDurExibicao(item);
  if (!dur) return '';

  var max = dur.max || 1;
  var atual = dur.atual !== undefined ? dur.atual : max;
  var pct = Math.max(0, Math.min(100, Math.round((atual / max) * 100)));
  var cor = pct >= 75 ? '#4caf65' : pct >= 50 ? '#9cb84c' : pct >= 25 ? '#c9a84c' : '#e05555';
  var quebrado = dur.quebrado === true || atual <= 0;
  var rar = item.raridade || parsearRaridade(item.descricao);

  var html = '<div class="dur-wrap">' +
    '<div class="dur-row">' +
    '<div class="dur-track">' +
    '<div class="dur-bar" style="width:' + pct + '%;background:' + cor + ';"></div>' +
    '</div>' +
    '<span class="dur-label" style="color:' + (quebrado ? '#e05555' : cor) + ';">' +
    (quebrado ? 'QUEBRADO' : atual + '/' + max) + '</span>' +
    (rar ? '<span class="dur-rar">[' + rar + ']</span>' : '') +
    '</div>';

  if (admin && !quebrado) {
    html += '<div class="dur-admin-row">' +
      '<button onclick="aplicarDecaimento1(\'' + local + '\',\'' + chave + '\')" title="Aplicar 1 uso" class="btn-dur-decay"><i class="ph ph-hammer"></i></button>';
    if (atual < max) {
      html += '<button onclick="aplicarReparo1(\'' + local + '\',\'' + chave + '\')" title="Reparar item" class="btn-dur-repair"><i class="ph ph-hammer"></i></button>';
    }
    html += '<button onclick="abrirModalUsoAtivo(\'' + local + '\',\'' + chave + '\')" class="btn-dur-uso">uso ativo</button>' +
      '</div>';
  }

  html += '</div>';
  return html;
}


async function aplicarDecaimento1(local, chave) {
  if (!isAdmin()) { gringToast('Sem permissao.', true); return; }
  var uid = getInvUID();
  if (!uid) return;
  var no = local === 'bau' ? '/inventario/u' + uid + '/' + chave : '/mochila/u' + uid + '/' + chave;
  var item = await dbGet(no);
  item = await garantirCamposDurabilidade(no, item);
  if (!item.durabilidade) { gringToast('Item sem durabilidade.', true); return; }
  var dur = item.durabilidade;
  if (dur.quebrado || dur.atual <= 0) { gringToast('Item ja esta quebrado.', true); return; }
  var novoAtual = Math.max(0, dur.atual - 1);
  var quebrado = novoAtual <= 0;
  var novaDesc = atualizarDescricaoDurabilidade(item.descricao, novoAtual, dur.max);
  await dbPatch(no, { durabilidade: { max: dur.max, atual: novoAtual, quebrado: quebrado }, descricao: novaDesc });
  gringToast(item.nome + ': ' + dur.atual + ' -> ' + novoAtual + (quebrado ? ' - QUEBRADO!' : '.'));
  if (local === 'bau') carregarInventario(); else carregarMochila();
}

async function aplicarReparo1(local, chave) {
  if (!isAdmin()) { gringToast('Sem permissao.', true); return; }
  var uid = getInvUID();
  if (!uid) return;
  var no = local === 'bau' ? '/inventario/u' + uid + '/' + chave : '/mochila/u' + uid + '/' + chave;
  var item = await dbGet(no);
  item = await garantirCamposDurabilidade(no, item);
  if (!item.durabilidade) { gringToast('Item sem durabilidade.', true); return; }
  var dur = item.durabilidade;
  if (dur.quebrado || dur.atual <= 0) { gringToast('Item quebrado nao pode ser reparado.', true); return; }
  if (dur.atual >= dur.max) { gringToast('Item ja esta no estado maximo.', true); return; }
  var novaDesc = atualizarDescricaoDurabilidade(item.descricao, dur.max, dur.max);
  await dbPatch(no, { durabilidade: { max: dur.max, atual: dur.max, quebrado: false }, descricao: novaDesc });
  gringToast(item.nome + ': reparado. Agora ' + dur.max + '/' + dur.max + '.');
  if (local === 'bau') carregarInventario(); else carregarMochila();
}

function abrirModalUsoAtivo(local, chave) {
  if (!isAdmin()) return;
  var existente = document.getElementById('modal-uso-ativo');
  if (existente) existente.remove();
  var modal = document.createElement('div');
  modal.id = 'modal-uso-ativo';
  modal.className = 'modal-overlay';
  var rars = ['comum', 'incomum', 'magico', 'epico', 'lendario'];
  var btns = '';
  for (var i = 0; i < rars.length; i++) {
    btns += '<button onclick="confirmarUsoAtivo(\'' + local + '\',\'' + chave + '\',\'' + rars[i] + '\')" class="modal-btn-rar">' + rars[i] + '</button>';
  }
  modal.innerHTML =
    '<div class="modal-box">' +
    '<div class="modal-title">USO ATIVO</div>' +
    '<div class="modal-subtitle">Raridade do oponente enfrentado:</div>' +
    '<div class="modal-btns">' + btns + '</div>' +
    '<button onclick="document.getElementById(\'modal-uso-ativo\').remove()" class="modal-btn-cancel">CANCELAR</button>' +
    '</div>';
  document.body.appendChild(modal);
}

async function confirmarUsoAtivo(local, chave, raridadeOponente) {
  if (!isAdmin()) { gringToast('Sem permissao.', true); return; }
  var uid = getInvUID();
  if (!uid) return;
  var modal = document.getElementById('modal-uso-ativo');
  if (modal) modal.remove();
  var no = local === 'bau' ? '/inventario/u' + uid + '/' + chave : '/mochila/u' + uid + '/' + chave;
  var item = await dbGet(no);
  item = await garantirCamposDurabilidade(no, item);
  if (!item.durabilidade) { gringToast('Item sem durabilidade.', true); return; }
  if (!item.raridade || !DECAIMENTO_TABELA[item.raridade]) {
    gringToast('Raridade do item nao identificada na descricao.', true); return;
  }
  var decaimento = DECAIMENTO_TABELA[item.raridade][raridadeOponente];
  var dur = item.durabilidade;
  if (decaimento === 0) { gringToast(item.nome + ' nao decai contra ' + raridadeOponente + '.'); return; }
  var novoAtual, quebrado;
  if (decaimento === null) {
    novoAtual = 0; quebrado = true;
  } else {
    novoAtual = Math.max(0, dur.atual - decaimento);
    quebrado = novoAtual <= 0;
  }
  var novaDesc = atualizarDescricaoDurabilidade(item.descricao, novoAtual, dur.max);
  await dbPatch(no, { durabilidade: { max: dur.max, atual: novoAtual, quebrado: quebrado }, descricao: novaDesc });
  var desc = decaimento === null ? 'quebra total' : '-' + decaimento + ' uso(s)';
  gringToast(item.nome + ': ' + desc + '. Agora ' + novoAtual + '/' + dur.max + (quebrado ? ' - QUEBRADO!' : '.'));
  if (local === 'bau') carregarInventario(); else carregarMochila();
}


var MOCHILA_BASE = 10;

function getMondayAtual() {
  var d = new Date();
  var day = d.getDay();
  var diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

async function getLimiteMochila(uid) {
  var lim = await dbGet('/mochila-limite/u' + uid);
  return MOCHILA_BASE + (lim && lim.extra ? lim.extra : 0);
}

async function getMochilaTravada(uid) {
  var r = await dbGet('/mochila-travada/u' + uid);
  return r === true;
}

async function alternarTravaMochila() {
  if (!isAdmin()) { gringToast('Sem permissao.', true); return; }
  var uid = getInvUID();
  if (!uid) return;
  var travada = await getMochilaTravada(uid);
  await fetch(DB + '/mochila-travada/u' + uid + '.json', { method: 'PUT', body: JSON.stringify(!travada) });
  gringToast(travada ? 'Mochila destravada.' : 'Mochila travada.');
  carregarMochila();
}


async function carregarInventario() {
  var uid = getInvUID();
  var el = document.getElementById('inv-bau');
  if (!uid || !el) return;

  var admin = isAdmin();
  var pode = podeEditar(uid);
  var r = await fetch(DB + '/inventario/u' + uid + '.json');
  var data = await r.json();
  var catalogo = await dbGet('/itens') || {};

  if (!data || !Object.keys(data).length) {
    el.innerHTML = '<em class="inv-empty">Nenhum item no bau.</em>';
    return;
  }

  var ordem = ['Livros', 'Consumíveis', 'Ingredientes', 'Objetos Mágicos', 'Ferramentas', 'Outros', 'Off-Game', 'Moldura'];
  var icones = {
    'Livros':          'fa-book',
    'Consumíveis':     'fa-flask',
    'Ingredientes':    'fa-seedling',
    'Objetos Mágicos': 'fa-wand-magic-sparkles',
    'Ferramentas':     'fa-wrench',
    'Outros':          'fa-box',
    'Off-Game':        'fa-gamepad',
    'Moldura':         'fa-image'
  };
  var grupos = {};
  ordem.forEach(function(c) { grupos[c] = []; });

  Object.entries(data).forEach(function(entry) {
    var chave = entry[0]; var item = entry[1];
    var cat = item.categoria && grupos[item.categoria] ? item.categoria : 'Outros';
    var qtd = item.quantidade && item.quantidade > 1 ? ' (x' + item.quantidade + ')' : '';
    var itemId = item.item_id || normalizar(item.nome);
    var dadosCat = catalogo[itemId] || {};
    var icone = dadosCat.icone || item.icone || '';
    var descricao = item.descricao || dadosCat.descricao || '';
    var uid_item = 'item-' + chave;

    grupos[cat].push(
      '<div class="inv-item">' +
      '<div class="inv-item-row">' +
      (icone ? '<img src="' + icone + '" style="width:32px;height:32px;object-fit:contain;flex-shrink:0;">' : '') +
      '<span style="flex:1"><b>' + item.nome + '</b>' + qtd + '</span>' +
      (descricao ?
'<span onclick="var i=this.querySelector(\'i\');i.classList.toggle(\'ph-arrow-circle-down\');i.classList.toggle(\'ph-arrow-circle-up\');document.getElementById(\'' + uid_item + '\').classList.toggle(\'aberto\')" class="inv-desc-toggle inv-desc-toggle--bau"><i class="ph-fill ph-arrow-circle-down"></i></span>'      : '') +
      (pode ?
        '<div class="inv-item-btns">' +
        (admin ? '<button onclick="removerUmDoBau(\'' + chave + '\')" class="btn-inv btn-inv-red" title="Remover 1 unidade"><i class="ph ph-minus-circle"></i></button>' : '') +
        '<button onclick="moverParaMochila(\'' + chave + '\')" class="btn-inv btn-inv-move" title="Mover para mochila">&#8594; mochila</button>' +
        '</div>'
      : '') +
      '</div>' +
      '<div id="' + uid_item + '" class="inv-desc">' + descricao + '</div>' +
      renderDurabilidade(item, chave, 'bau', admin) +
      '</div>'
    );
  });

  if (!ordem.some(function(c) { return grupos[c].length > 0; })) {
    el.innerHTML = '<em class="inv-empty">Nenhum item no bau.</em>';
    return;
  }

  var primeiraAtiva = null;
  for (var ci = 0; ci < ordem.length; ci++) {
    if (grupos[ordem[ci]].length > 0) { primeiraAtiva = ordem[ci]; break; }
  }

  var tabsHtml = '<div class="inv-tabs">';
  ordem.forEach(function(cat) {
    var temItem = grupos[cat].length > 0;
    var ativo = cat === primeiraAtiva;
    var classes = 'inv-tab' + (temItem ? ' tem-item' : '') + (ativo ? ' ativo' : '');
    tabsHtml += '<button data-tab-inv001="' + cat + '" onclick="mostrarAbaBau(\'' + cat + '\')" class="' + classes + '">' +
      '<i class="fa-solid ' + icones[cat] + '"></i>' +
      '<span>' + cat + '</span>' +
      '</button>';
  });
  tabsHtml += '</div>';

  var paineis = '';
  ordem.forEach(function(cat) {
    var ativo = cat === primeiraAtiva;
    var conteudo = grupos[cat].length
      ? grupos[cat].join('')
      : '<em class="inv-empty">Nenhum item nesta categoria.</em>';
    paineis += '<div data-painel-inv001="' + cat + '" class="inv-painel' + (ativo ? '' : ' oculto') + '">' + conteudo + '</div>';
  });

  el.innerHTML = tabsHtml + paineis;
}

function mostrarAbaBau(cat) {
  var abas = document.querySelectorAll('[data-tab-inv001]');
  var paineis = document.querySelectorAll('[data-painel-inv001]');
  for (var i = 0; i < abas.length; i++) {
    abas[i].classList.toggle('ativo', abas[i].getAttribute('data-tab-inv001') === cat);
  }
  for (var j = 0; j < paineis.length; j++) {
    paineis[j].classList.toggle('oculto', paineis[j].getAttribute('data-painel-inv001') !== cat);
  }
}

async function removerUmDoBau(chaveItem) {
  if (!isAdmin()) { gringToast('Sem permissao.', true); return; }
  var uid = getInvUID();
  if (!uid) return;
  var item = await dbGet('/inventario/u' + uid + '/' + chaveItem);
  if (!item) { gringToast('Item nao encontrado.', true); return; }
  var qtd = item.quantidade || 1;
  if (qtd > 1) {
    await dbPatch('/inventario/u' + uid + '/' + chaveItem, { quantidade: qtd - 1 });
    gringToast('1x ' + item.nome + ' removido do bau.');
  } else {
    await fetch(DB + '/inventario/u' + uid + '/' + chaveItem + '.json', { method: 'DELETE' });
    gringToast(item.nome + ' removido do bau.');
  }
  carregarInventario();
}

async function carregarMochila() {
  var uid = getInvUID();
  var el = document.getElementById('inv-mochila');
  var elSlots = document.getElementById('mochila-slots');
  if (!uid || !el) return;

  var admin = isAdmin();
  var pode = podeEditar(uid);
  var travada = await getMochilaTravada(uid);
  var data = await dbGet('/mochila/u' + uid);
  var limite = await getLimiteMochila(uid);
  var catalogo = await dbGet('/itens') || {};
  var usados = data ? Object.keys(data).length : 0;
  var semanaAtual = getMondayAtual();

  if (elSlots) {
    var cor = usados >= limite ? '#e05555' : usados >= limite * 0.8 ? '#c9a84c' : '#4caf65';
    elSlots.innerHTML =
      '<span class="mochila-slots-label" style="color:' + cor + ';">' + usados + ' / ' + limite + ' espacos</span>' +
      (admin ?
        '<button onclick="alternarTravaMochila()" class="mochila-lock-btn" style="color:' + (travada ? '#e05555' : '#7a9e7e') + ';" title="' + (travada ? 'Destravar mochila' : 'Travar mochila') + '"><i class="ph ph-' + (travada ? 'lock' : 'lock-open') + '"></i></button>'
      : '') +
      (travada ?
        '<span class="mochila-lock-label"><i class="ph ph-lock"></i> mochila travada</span>'
      : '');
  }

  if (!data || !Object.keys(data).length) {
    el.innerHTML = '<em class="inv-empty">Mochila vazia.</em>';
    return;
  }

  var html = Object.entries(data).map(function(entry) {
    var chave = entry[0]; var item = entry[1];
    var qtd = item.quantidade && item.quantidade > 1 ? ' (x' + item.quantidade + ')' : '';
    var itemId = item.item_id || normalizar(item.nome);
    var dadosCat = catalogo[itemId] || {};
    var icone = dadosCat.icone || item.icone || '';
    var descricao = item.descricao || dadosCat.descricao || '';
    var uid_item = 'mochila-' + chave;
    var emCooldown = item.semana && item.semana === semanaAtual;

    var btnBau = '';
    if (pode && !travada) {
      if (emCooldown) {
        btnBau = '<span onclick="gringToast(\'Este item so pode ser devolvido ao bau a partir da proxima segunda-feira.\', true)" class="btn-inv-blocked">bloqueado</span>';
      } else {
        btnBau = '<button onclick="moverParaBau(\'' + chave + '\')" class="btn-inv btn-inv-move" title="Devolver ao bau">&#8594; bau</button>';
      }
    }

    return '<div class="inv-item">' +
      '<div class="inv-item-row">' +
      (icone ? '<img src="' + icone + '" style="width:32px;height:32px;object-fit:contain;flex-shrink:0;">' : '') +
      '<span style="flex:1"><b>' + item.nome + '</b>' + qtd + '</span>' +
      (descricao ?
'<span onclick="var i=this.querySelector(\'i\');i.classList.toggle(\'ph-arrow-circle-down\');i.classList.toggle(\'ph-arrow-circle-up\');document.getElementById(\'' + uid_item + '\').classList.toggle(\'aberto\')" class="inv-desc-toggle"><i class="ph-fill ph-arrow-circle-down"></i></span>'      : '') +
      (pode && !travada ?
        '<div class="inv-item-btns">' +
        (admin ? '<button onclick="removerUmDaMochila(\'' + chave + '\')" class="btn-inv btn-inv-red" title="Remover 1 unidade"><i class="ph ph-minus-circle"></i></button>' : '') +
        btnBau +
        '</div>'
      : '') +
      '</div>' +
      '<div id="' + uid_item + '" class="inv-desc">' + descricao + '</div>' +
      renderDurabilidade(item, chave, 'mochila', admin) +
      '</div>';
  }).join('');

  el.innerHTML = html;
}

async function removerUmDaMochila(chaveItem) {
  if (!isAdmin()) { gringToast('Sem permissao.', true); return; }
  var uid = getInvUID();
  if (!uid) return;
  var travada = await getMochilaTravada(uid);
  if (travada) { gringToast('Mochila travada.', true); return; }
  var item = await dbGet('/mochila/u' + uid + '/' + chaveItem);
  if (!item) { gringToast('Item nao encontrado.', true); return; }
  var qtd = item.quantidade || 1;
  if (qtd > 1) {
    await dbPatch('/mochila/u' + uid + '/' + chaveItem, { quantidade: qtd - 1 });
    gringToast('1x ' + item.nome + ' removido da mochila.');
  } else {
    await fetch(DB + '/mochila/u' + uid + '/' + chaveItem + '.json', { method: 'DELETE' });
    gringToast(item.nome + ' removido da mochila.');
  }
  carregarMochila();
}

async function moverParaMochila(chaveItem) {
  var uid = getInvUID();
  if (!podeEditar(uid)) { gringToast('Sem permissao.', true); return; }
  var travada = await getMochilaTravada(uid);
  if (travada) { gringToast('Mochila travada.', true); return; }

  var item = await dbGet('/inventario/u' + uid + '/' + chaveItem);
  if (!item) { gringToast('Item nao encontrado.', true); return; }

  var data = await dbGet('/mochila/u' + uid);
  var usados = data ? Object.keys(data).length : 0;
  var limite = await getLimiteMochila(uid);

  if (usados >= limite) {
    gringToast('Mochila cheia! (' + usados + '/' + limite + ' espacos usados)', true);
    return;
  }

  if (!item.durabilidade && data) {
    var chaves = Object.keys(data);
    for (var i = 0; i < chaves.length; i++) {
      if (data[chaves[i]].nome === item.nome) {
        gringToast('Este item ja esta na mochila!', true);
        return;
      }
    }
  }

  var novoItem = {
    nome: item.nome,
    descricao: item.descricao || '',
    categoria: item.categoria || 'Outros',
    valor: item.valor || 0,
    quantidade: item.quantidade || 1,
    origem: item.origem || 'bau',
    semana: getMondayAtual()
  };
  if (item.raridade) novoItem.raridade = item.raridade;
  if (item.tipo_dur) novoItem.tipo_dur = item.tipo_dur;
  if (item.durabilidade) novoItem.durabilidade = item.durabilidade;

  await fetch(DB + '/inventario/u' + uid + '/' + chaveItem + '.json', { method: 'DELETE' });
  await dbPost('/mochila/u' + uid, novoItem);

  gringToast(item.nome + ' movido para a mochila!');
  carregarInventario();
  carregarMochila();
}

async function moverParaBau(chaveItem) {
  var uid = getInvUID();
  if (!podeEditar(uid)) { gringToast('Sem permissao.', true); return; }
  var travada = await getMochilaTravada(uid);
  if (travada) { gringToast('Mochila travada.', true); return; }

  var item = await dbGet('/mochila/u' + uid + '/' + chaveItem);
  if (!item) { gringToast('Item nao encontrado.', true); return; }

  if (!item.durabilidade) {
    var invAtual = await dbGet('/inventario/u' + uid);
    var chaveEx = null;
    if (invAtual) {
      var ks = Object.keys(invAtual);
      for (var k = 0; k < ks.length; k++) {
        if (invAtual[ks[k]].nome === item.nome) { chaveEx = ks[k]; break; }
      }
    }
    if (chaveEx) {
      await dbPatch('/inventario/u' + uid + '/' + chaveEx, { quantidade: (invAtual[chaveEx].quantidade || 1) + (item.quantidade || 1) });
      await fetch(DB + '/mochila/u' + uid + '/' + chaveItem + '.json', { method: 'DELETE' });
      gringToast(item.nome + ' devolvido ao bau!');
      carregarInventario();
      carregarMochila();
      return;
    }
  }

  var novoItem = {
    nome: item.nome,
    descricao: item.descricao || '',
    categoria: item.categoria || 'Outros',
    valor: item.valor || 0,
    quantidade: item.quantidade || 1,
    origem: item.origem || 'mochila'
  };
  if (item.raridade) novoItem.raridade = item.raridade;
  if (item.tipo_dur) novoItem.tipo_dur = item.tipo_dur;
  if (item.durabilidade) novoItem.durabilidade = item.durabilidade;

  await fetch(DB + '/mochila/u' + uid + '/' + chaveItem + '.json', { method: 'DELETE' });
  await dbPost('/inventario/u' + uid, novoItem);

  gringToast(item.nome + ' devolvido ao bau!');
  carregarInventario();
  carregarMochila();
}

setTimeout(function () {
  carregarInventario();
  carregarMochila();
}, 1500);
