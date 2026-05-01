(function() {
  var _INVDB = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var STAFF_IDS = [1, 2, 4, 6];

  function invGetUID() {
    var el = document.querySelector('[name="username"]');
    return el ? el.value.trim() : null;
  }

  function invIsStaff() {
    return typeof _userdata !== 'undefined' && STAFF_IDS.indexOf(parseInt(_userdata.user_id)) !== -1;
  }

  window.invToggleInset = function() {
    var cat = document.getElementById('inv-categoria').value;
    var row = document.getElementById('inv-inset-row');
    if (row) row.style.display = cat === 'Moldura' ? 'block' : 'none';
  };

  function invMostrarMsg(tipo, texto) {
    var msg = document.getElementById('inv-msg');
    var err = document.getElementById('inv-err');
    if (tipo === 'ok') {
      msg.style.display = 'inline';
      err.style.display = 'none';
      setTimeout(function() { msg.style.display = 'none'; }, 2500);
    } else {
      err.textContent = texto;
      err.style.display = 'inline';
      msg.style.display = 'none';
      setTimeout(function() { err.style.display = 'none'; }, 3000);
    }
  }

  window.invAdicionarItem = function() {
    if (!invIsStaff()) { invMostrarMsg('err', 'Sem permissão.'); return; }
    var uid = invGetUID();
    if (!uid) { invMostrarMsg('err', 'UID não encontrado.'); return; }
    var nome      = document.getElementById('inv-nome').value.trim();
    var desc      = document.getElementById('inv-desc').value.trim();
    var qtd       = parseInt(document.getElementById('inv-qtd').value) || 1;
    var categoria = document.getElementById('inv-categoria').value || 'Outros';
    var valor     = parseInt(document.getElementById('inv-valor').value) || 0;
    var inset     = categoria === 'Moldura' ? (document.getElementById('inv-inset').value.trim() || '-18px') : null;
    if (!nome) { invMostrarMsg('err', 'Informe o nome do item.'); return; }
    var btn = document.getElementById('inv-btn');
    btn.disabled = true;
    var uidKey = 'u' + String(uid).replace(/^u/i, '');
    fetch(_INVDB + '/inventario/' + uidKey + '.json')
      .then(function(r) { return r.json(); })
      .then(function(invAtual) {
        var chaveEx = null;
        if (invAtual) {
          var ks = Object.keys(invAtual);
          for (var i = 0; i < ks.length; i++) {
            if (invAtual[ks[i]].nome === nome) { chaveEx = ks[i]; break; }
          }
        }
        var itemData = { nome: nome, descricao: desc, quantidade: qtd, categoria: categoria, valor: valor, origem: 'staff' };
        if (inset) itemData.inset = inset;
        var req;
        if (chaveEx) {
          var qtdAtual = invAtual[chaveEx].quantidade || 1;
          var patch = { quantidade: qtdAtual + qtd, categoria: categoria, valor: valor };
          if (inset) patch.inset = inset;
          req = fetch(_INVDB + '/inventario/' + uidKey + '/' + chaveEx + '.json', { method: 'PATCH', body: JSON.stringify(patch) });
        } else {
          req = fetch(_INVDB + '/inventario/' + uidKey + '.json', { method: 'POST', body: JSON.stringify(itemData) });
        }
        return req;
      })
      .then(function() {
        invMostrarMsg('ok');
        document.getElementById('inv-nome').value = '';
        document.getElementById('inv-desc').value = '';
        document.getElementById('inv-qtd').value = '1';
        document.getElementById('inv-categoria').value = 'Outros';
        document.getElementById('inv-valor').value = '0';
        document.getElementById('inv-inset').value = '-18px';
        window.invToggleInset();
        btn.disabled = false;
      })
      .catch(function() {
        invMostrarMsg('err', 'Erro ao salvar.');
        btn.disabled = false;
      });
  };
var _catalogoCache = null;
  function getCatalogo() {
    if (_catalogoCache) return Promise.resolve(_catalogoCache);
    return fetch(_INVDB + '/itens.json').then(function(r){ return r.json(); }).then(function(d){ _catalogoCache = d||{}; return _catalogoCache; });
  }

  function iniciarAutocomplete() {
    var input = document.getElementById('inv-nome');
    if (!input) return;
    var lista = document.createElement('div');
    lista.style.cssText = 'position:absolute;z-index:9999;background:#0d0d1a;border:1px solid #4a3f6b;border-radius:4px;max-height:200px;overflow-y:auto;width:100%;display:none;top:100%;left:0;';
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(lista);
    input.addEventListener('input', function() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { lista.style.display='none'; return; }
      getCatalogo().then(function(cat) {
        var res = Object.values(cat).filter(function(it){ return it&&it.nome&&it.nome.toLowerCase().indexOf(q)!==-1; }).slice(0,10);
        if (!res.length) { lista.style.display='none'; return; }
        lista.innerHTML = res.map(function(it){
          return '<div class="inv-ac-opt" data-nome="'+it.nome+'" data-desc="'+(it.descricao||'')+'" data-cat="'+(it.categoria||'Outros')+'" data-val="'+(it.valor||0)+'" style="padding:6px 10px;cursor:pointer;font-size:12px;color:#e0d6f5;border-bottom:1px solid #4a3f6b22;display:flex;align-items:center;gap:6px;">'+
            (it.icone?'<img src="'+it.icone+'" style="width:16px;height:16px;object-fit:contain;">':'')+
            '<span>'+it.nome+'</span><span style="font-size:10px;color:#9d8ec0;">'+it.categoria+'</span></div>';
        }).join('');
        lista.style.display = 'block';
        lista.querySelectorAll('.inv-ac-opt').forEach(function(el){
          el.addEventListener('mouseenter', function(){ el.style.background='#1a1a2e'; });
          el.addEventListener('mouseleave', function(){ el.style.background=''; });
          el.addEventListener('click', function(){
            document.getElementById('inv-nome').value = el.dataset.nome;
            var d=document.getElementById('inv-desc'); if(d) d.value=el.dataset.desc;
            var c=document.getElementById('inv-categoria'); if(c) c.value=el.dataset.cat;
            var v=document.getElementById('inv-valor'); if(v) v.value=el.dataset.val;
            lista.style.display='none';
            if(typeof invToggleInset==='function') invToggleInset();
          });
        });
      });
    });
    document.addEventListener('click', function(e){ if(!lista.contains(e.target)&&e.target!==input) lista.style.display='none'; });
  }
setTimeout(function() {
    if (!invIsStaff()) return;
    iniciarAutocomplete();
    var calcPainel = document.getElementById('calc-painel');
    var invPainel  = document.getElementById('inv-painel');
    if (!calcPainel || !invPainel) return;
    var calcTop    = parseInt(calcPainel.style.top) || 240;
    var calcHeight = calcPainel.offsetHeight;
    invPainel.style.top = (calcTop + calcHeight + 12) + 'px';
    invPainel.style.display = 'block';
  }, 700);
})();