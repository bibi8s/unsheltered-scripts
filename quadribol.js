 'use strict';

/* eslint-disable */

var POSICOES   = ['artilheiro1','artilheiro2','batedor','goleiro','apanhador'];
var POS_LABEL  = {artilheiro1:'Artilheiro',artilheiro2:'Artilheiro',batedor:'Batedor',goleiro:'Goleiro',apanhador:'Apanhador'};
var TURN_PAIRS = [
  ['A_artilheiro1','B_artilheiro1'],
  ['A_artilheiro2','B_artilheiro2'],
  ['A_batedor','B_batedor'],
  ['A_goleiro','B_goleiro'],
  ['A_apanhador','B_apanhador']
];
var MAESTRIA_BONUS = {0:0,5:1,10:1,15:1,20:1,25:1,35:2,40:2,50:2,60:2,70:3,80:3,85:3,90:3,95:4,100:4};
var MAIN_ATTR = {artilheiro1:'destreza',artilheiro2:'destreza',batedor:'forca',goleiro:'forca',apanhador:'agilidade'};
var NPC_ATTRS = {
  artilheiro1:['inteligencia','destreza','agilidade','resistencia'],
  artilheiro2:['inteligencia','destreza','agilidade','resistencia'],
  batedor:    ['forca','determinacao','agilidade','resistencia'],
  goleiro:    ['inteligencia','forca','agilidade','resistencia','sabedoria'],
  apanhador:  ['agilidade','sabedoria','determinacao','carisma','resistencia']
};

var ACOES = {
  artilheiro1:[
    {id:'arremessar',  nome:'Arremessar',    desc:'Tenta marcar gol contra o Goleiro adversario.'},
    {id:'passar',      nome:'Passar',         desc:'Passa a Goles para o parceiro. +2 no arremesso.'},
    {id:'fintar',      nome:'Fintar',         desc:'Esquiva do Balaco usando agilidade e leitura de jogo.'},
    {id:'mergulho',    nome:'Mergulho',       desc:'Avanca em alta velocidade. Vencendo: +4 arremesso. Perdendo: fica exposto.'},
    {id:'finta_passe', nome:'Finta de Passe', desc:'Engana o Goleiro. Vencendo: -3 na defesa desta fase.'}
  ],
  artilheiro2:[
    {id:'arremessar',  nome:'Arremessar',    desc:'Tenta marcar gol contra o Goleiro adversario.'},
    {id:'passar',      nome:'Passar',         desc:'Passa a Goles para o parceiro. +2 no arremesso.'},
    {id:'fintar',      nome:'Fintar',         desc:'Esquiva do Balaco usando agilidade e leitura de jogo.'},
    {id:'mergulho',    nome:'Mergulho',       desc:'Avanca em alta velocidade. Vencendo: +4 arremesso. Perdendo: fica exposto.'},
    {id:'finta_passe', nome:'Finta de Passe', desc:'Engana o Goleiro. Vencendo: -3 na defesa desta fase.'}
  ],
  batedor:[
    {id:'lancar_balaco', nome:'Lancar Balaco',  desc:'Acerta um adversario. -2 no atributo principal.',     temAlvo:true, alvos:'adversarios'},
    {id:'proteger',      nome:'Proteger',        desc:'Cobre um aliado contra o Balaco adversario.',          temAlvo:true, alvos:'aliados'},
    {id:'interceptar',   nome:'Interceptar',     desc:'Bloqueia o passe dos Artilheiros adversarios.'},
    {id:'derrubar',      nome:'Derrubar',        desc:'Colisao direta. Vencendo: alvo perde o proximo par.', temAlvo:true, alvos:'adversarios'},
    {id:'pressao_aerea', nome:'Pressao Aerea',   desc:'Intimida um adversario. Vencendo: -2 no proximo roll.',temAlvo:true, alvos:'adversarios'}
  ],
  goleiro:[
    {id:'defender',            nome:'Defender',            desc:'Posiciona-se nos aros. +2 no roll de defesa.'},
    {id:'blitz',               nome:'Blitz',               desc:'Avanca para interceptar. Se falhar, gol automatico.'},
    {id:'lancar_goles',        nome:'Lancar Goles',        desc:'Arremessa a Goles para um Artilheiro aliado (+2).',temAlvo:true,alvos:'art_aliados'},
    {id:'antecipar',           nome:'Antecipar',           desc:'Le o jogo. Vencendo: +5 defesa esta fase.'},
    {id:'derrubar_artilheiro', nome:'Derrubar Artilheiro', desc:'Avanca e colide. Vencendo: artilheiro nao arremessa.',temAlvo:true,alvos:'art_adversarios'}
  ],
  apanhador:[
    {id:'rastrear',      nome:'Rastrear',          desc:'Acumula +1 de bonus para captura do Pomo.'},
    {id:'sabotar',       nome:'Sabotar',            desc:'Zera o rastreamento do Apanhador adversario.'},
    {id:'distracao',     nome:'Distracao',          desc:'Adversario perde a fase sem acumular rastreamento.'},
    {id:'auxiliar',      nome:'Auxiliar',           desc:'Passa a Goles para um Artilheiro aliado (+2).',temAlvo:true,alvos:'art_aliados'},
    {id:'mergulho_pomo', nome:'Mergulho pelo Pomo', desc:'Captura antecipada do Pomo. Perdendo: -2 rastreamento.'},
    {id:'carregar',      nome:'Carregar',           desc:'Derruba o Apanhador adversario. Vencendo: perde rastreamento e proximo par.'}
  ]
};

var ACOES_CAPITAO = [
  {id:'motivar',    nome:'Motivar',    desc:'Da +3 no proximo roll de um aliado.', temAlvo:true, alvos:'aliados'},
  {id:'estrategia', nome:'Estrategia', desc:'Cancela um debuff ativo de um aliado.', temAlvo:true, alvos:'aliados'}
];

var FIELD_POS = {
  'A_artilheiro1':[140,85],'A_artilheiro2':[190,175],'A_batedor':[235,130],
  'A_goleiro':[58,140],'A_apanhador':[310,95],
  'B_artilheiro1':[500,85],'B_artilheiro2':[450,175],'B_batedor':[405,130],
  'B_goleiro':[582,140],'B_apanhador':[330,180]
};

// --- ESTADO ---
var TREINO_META_H=typeof QUAD_TREINO_META!=='undefined'?QUAD_TREINO_META:17;
var FASE_SECS=typeof QUAD_FASE_SECS!=='undefined'?QUAD_FASE_SECS:45;
var FB=typeof QUAD_FB!=='undefined'?QUAD_FB:'';
var ADMIN_UIDS=typeof QUAD_ADMINS!=='undefined'?QUAD_ADMINS:['1'];
var CASAS=typeof QUAD_CASAS!=='undefined'?QUAD_CASAS:['Grifinoria','Sonserina','Corvinal','Lufa-Lufa'];
var TREINO_OPTS=typeof QUAD_TREINO_OPCOES!=='undefined'?QUAD_TREINO_OPCOES:[{h:1,energia:10,label:'1h'},{h:2,energia:20,label:'2h'},{h:3,energia:30,label:'3h'}];
var VUVUZELA_COOLDOWN=typeof QUAD_VUVUZELA_COOLDOWN!=='undefined'?QUAD_VUVUZELA_COOLDOWN*1000:30000;
var TREINO_OPTS_LOCAL=TREINO_OPTS;
var myUid=null,myNome=null,isAdmin=false,pid=null;
var pollTimer=null,countdownTimer=null,treinoTimer=null;
var selectedAcoes={},selectedCapAcao={};
var currentView=null,lastTurnoPar=-1,logFaseVis=null,eraMinhVez=false;
var lastVuvuzelaTs=0,lastVuvuzelaClick=0;

// --- FIREBASE ---
function fbGet(p){return fetch(FB+p+'.json').then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});}
function fbPut(p,d){return fetch(FB+p+'.json',{method:'PUT',body:JSON.stringify(d)});}
function fbPatch(p,d){return fetch(FB+p+'.json',{method:'PATCH',body:JSON.stringify(d)});}
function fbDel(p){return fetch(FB+p+'.json',{method:'DELETE'});}

// --- HELPERS ---
function getAttr(slot,attr){var b=(slot.atributos&&slot.atributos[attr])?slot.atributos[attr]:10;if(slot.debuff&&slot.debuff.atributo===attr)b=Math.max(1,b+slot.debuff.valor);return b;}
function b3(slot,attr){return Math.floor(getAttr(slot,attr)/3);}
function vassB(slot){return(slot.vassoura&&slot.vassoura.bonus)?slot.vassoura.bonus:0;}
function roll2(a,b,bonus){bonus=bonus||0;return Math.floor(Math.random()*Math.max(1,Math.floor(a)))+1+Math.floor(Math.random()*Math.max(1,Math.floor(b)))+1+bonus;}
function maestBase(slot){if(!slot.maestria)return 0;var pct=parseInt(slot.maestria.quadribol)||0;var niveis=[0,5,10,15,20,25,35,40,50,60,70,80,85,90,95,100];var c=0;niveis.forEach(function(n){if(pct>=n)c=n;});return MAESTRIA_BONUS[c]||0;}
function maestB(slot,tipo){if(!slot.maestria)return 0;var map={artilheiro1:'artilheiro',artilheiro2:'artilheiro',goleiro:'defesa',batedor:'manobras',apanhador:'pomo'};var chave=map[tipo||slot.posicao||'']||'artilheiro';return maestBase(slot)+(parseInt(slot.maestria[chave])||0);}
function prefixoCasa(n){return n?n.charAt(0).toUpperCase()+'. ':'';}
function corDaCasa(n,p){var cores=typeof QUAD_CORES_CASAS!=='undefined'?QUAD_CORES_CASAS:{};var pad={fill:'#1a0f2e',stroke:'#8b44c5',texto:'#bda6c7'};var c=cores[n]||pad;return c[p]||pad[p];}
function todosConfirmados(match){return['A','B'].every(function(t){return POSICOES.every(function(p){return match.times[t].slots[p]&&match.times[t].slots[p].confirmado;});});}
function euSouCapitaoDo(match,time){return POSICOES.some(function(pos){var sl=match.times[time].slots[pos];return sl&&sl.uid===myUid&&sl.capitao;});}
function encontrarMeusSlots(match){var r=[];['A','B'].forEach(function(t){var souCap=euSouCapitaoDo(match,t);POSICOES.forEach(function(pos){var slot=match.times[t].slots[pos];if(!slot)return;if(slot.uid===myUid)r.push({time:t,pos:pos,slot:slot});else if(slot.uid==='npc'&&souCap)r.push({time:t,pos:pos,slot:Object.assign({},slot,{nomeDisplay:slot.nome+' (NPC)'})});});});return r;}
function escolherAcaoNpc(pos,match,t){var lista=ACOES[pos]||[];var sem=lista.filter(function(a){return!a.temAlvo;});var pool=sem.length?sem:lista;var a=pool[Math.floor(Math.random()*pool.length)];var alvo=null;if(a.temAlvo){if(a.alvos==='adversarios')alvo=POSICOES[Math.floor(Math.random()*POSICOES.length)];else if(a.alvos==='aliados'){var ali=POSICOES.filter(function(p){return p!==pos;});alvo=ali[Math.floor(Math.random()*ali.length)];}else if(a.alvos==='art_aliados'||a.alvos==='art_adversarios')alvo=Math.random()>0.5?'artilheiro1':'artilheiro2';}return{acao:a.id,alvo:alvo,ts:Date.now()};}

// --- NAV ---
function irPara(id){$('.quad-section').attr('hidden',true);$('#'+id).removeAttr('hidden');currentView=id;}
function ativarNav(ativa){$('#quad-nav').removeAttr('hidden');$('.quad-nav-btn').removeClass('quad-nav-ativa');var map={partida:'quad-nav-partida',treino:'quad-nav-treino',historico:'quad-nav-hist',admin:'quad-nav-admin',lobby:'quad-nav-partida',game:'quad-nav-partida',encerrado:'quad-nav-hist'};if(map[ativa])$('#'+map[ativa]).addClass('quad-nav-ativa');}
function bindNav(){$('#quad-nav-partida').off('click').on('click',function(){if(countdownTimer)clearInterval(countdownTimer);if(treinoTimer)clearInterval(treinoTimer);boot();});$('#quad-nav-treino').off('click').on('click',function(){if(countdownTimer)clearInterval(countdownTimer);renderTreino();});$('#quad-nav-hist').off('click').on('click',function(){if(countdownTimer)clearInterval(countdownTimer);if(treinoTimer)clearInterval(treinoTimer);renderHistorico();});if(isAdmin)$('#quad-nav-admin').off('click').on('click',function(){if(countdownTimer)clearInterval(countdownTimer);if(treinoTimer)clearInterval(treinoTimer);renderAdminPanel();});}

// --- BOOT ---
$(function(){try{if(typeof _userdata!=='undefined'&&_userdata.user_id){myUid='u'+_userdata.user_id;myNome=_userdata.username;isAdmin=ADMIN_UIDS.indexOf(String(_userdata.user_id))!==-1;if(isAdmin)$('#quad-nav-admin').removeAttr('hidden');boot();}}catch(e){}});

function boot(){if(pollTimer)clearInterval(pollTimer);fbGet('/quadribol/partida_ativa').then(function(ativa){if(ativa&&ativa.pid&&(ativa.status==='aguardando'||ativa.status==='em_andamento')){pid=ativa.pid;fbGet('/quadribol/partidas/'+pid).then(function(m){if(!m){renderSemPartida();return;}if(m.status==='em_andamento')renderGame(m);else renderLobby(m);startPoll();});}else{pid=null;if(isAdmin)renderAdminPanel();else renderSemPartida();}});}

function startPoll(intervalo){if(pollTimer)clearInterval(pollTimer);pollTimer=setInterval(function(){if(!pid)return;fbGet('/quadribol/partidas/'+pid).then(function(m){if(!m){clearInterval(pollTimer);boot();return;}if(m.status==='encerrada'){clearInterval(pollTimer);renderEncerrada(m);return;}verificarVuvuzelas(m);if(m.status==='em_andamento'){if(intervalo!==3000){clearInterval(pollTimer);startPoll(3000);}if(currentView==='quad-game'||currentView==='quad-lobby'||currentView==='quad-sem-partida'||!currentView)renderGame(m);}else{if(currentView==='quad-lobby'||currentView==='quad-sem-partida'||!currentView)renderLobby(m);}});},intervalo||5000);}

function renderSemPartida(){irPara('quad-sem-partida');ativarNav('partida');bindNav();}

// --- LOBBY ---
function renderLobby(match){irPara('quad-lobby');ativarNav('lobby');bindNav();var tA=match.times.A,tB=match.times.B;var allConfirmed=todosConfirmados(match);var mySlots=encontrarMeusSlots(match);var pendente=null;for(var i=0;i<mySlots.length;i++){if(!mySlots[i].slot.confirmado){pendente=mySlots[i];break;}}$('#quad-lobby-nome-a').text(tA.nome);$('#quad-lobby-nome-b').text(tB.nome);$('#quad-lobby-titulo-a').text(tA.nome);$('#quad-lobby-titulo-b').text(tB.nome);$('#quad-lobby-subtitulo').text(allConfirmed?'todos prontos! aguardando inicio.':'aguardando confirmacoes...');if(pendente){$('#quad-meu-slot').removeAttr('hidden');$('#quad-meu-pos-badge').text(POS_LABEL[pendente.pos]);$('#quad-meu-time-nome').text(pendente.time==='A'?tA.nome:tB.nome);if(pendente.slot.capitao)$('#quad-meu-cap-badge').removeAttr('hidden');else $('#quad-meu-cap-badge').attr('hidden',true);carregarVassouras();}else{$('#quad-meu-slot').attr('hidden',true);}$('#quad-lobby-lista-a').html(gerarListaJogadores(tA.slots,'A'));$('#quad-lobby-lista-b').html(gerarListaJogadores(tB.slots,'B'));if(isAdmin){$('#quad-lobby-admin-btns').removeAttr('hidden');$('#quad-btn-iniciar').prop('disabled',!allConfirmed).text(allConfirmed?'iniciar partida':'aguardando confirmacoes...');$('#quad-btn-iniciar').off('click').on('click',iniciarPartida);$('#quad-btn-cancelar-lobby').off('click').on('click',cancelarPartida);}$('#quad-btn-confirmar-lobby').off('click').on('click',confirmarPresenca);if(isAdmin)setTimeout(function(){$('.quad-btn-editar-slot').off('click').on('click',function(){editarSlotAdmin($(this).data('slot'),match);});},150);}

function gerarListaJogadores(slots,time){return POSICOES.map(function(pos){var s=slots[pos];if(!s)return'';var isNpc=s.uid==='npc';var dotClass=isNpc?'quad-dot-npc':s.confirmado?'quad-dot-ok':'quad-dot-wait';var badge=isNpc?'<span class="quad-badge quad-badge-npc">npc</span>':s.confirmado?'<span class="quad-badge quad-badge-ok">confirmado</span>':'<span class="quad-badge quad-badge-wait">aguardando</span>';var editBtn=isAdmin?'<button type="button" class="quad-btn quad-btn-ghost quad-btn-sm quad-btn-editar-slot" data-slot="'+(time||'A')+'_'+pos+'" style="padding:2px 7px;font-size:10px;"><i class="fa fa-pencil"></i></button>':'';var fotoHtml=s.foto?'<img src="'+s.foto+'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;margin-right:6px;border:1px solid #b764e840;flex-shrink:0;">':'';return'<div class="quad-player-row"><span class="quad-dot '+dotClass+'"></span>'+fotoHtml+'<div style="flex:1;"><div class="quad-player-nome">'+s.nome+(s.capitao?' <span class="quad-badge quad-badge-cap">cap</span>':'')+'</div><div class="quad-player-meta">'+POS_LABEL[pos]+'</div></div>'+badge+editBtn+'</div>';}).join('');}

function editarSlotAdmin(slotKey,match){var p=slotKey.split('_');var t=p[0];var pos=p.slice(1).join('_');var sl=match.times[t].slots[pos]||{};var modal=$('<div class="quad-modal-overlay">').html('<div class="quad-modal" style="max-width:340px;"><div class="quad-sec-title">editar slot — '+POS_LABEL[pos]+' — Time '+t+'</div><div style="margin-bottom:8px;"><div class="quad-slot-label">uid (vazio = NPC)</div><input type="text" id="quad-edit-uid" class="quad-input" value="'+(sl.uid==='npc'?'':(sl.uid||'').replace('u',''))+'" placeholder="uid"><div id="quad-edit-nome" class="quad-slot-preview" style="margin-top:4px;">'+(sl.nome||'')+'</div></div><label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;"><input type="checkbox" id="quad-edit-cap"'+(sl.capitao?' checked':'')+'>capitao</label><div style="display:flex;gap:8px;"><button type="button" id="quad-edit-cancelar" class="quad-btn quad-btn-ghost" style="flex:1;">cancelar</button><button type="button" id="quad-edit-salvar" class="quad-btn quad-btn-primary" style="flex:1;">salvar</button></div><div id="quad-edit-msg" class="quad-muted" style="margin-top:6px;"></div></div>');$('body').append(modal);modal.on('click',function(e){if($(e.target).hasClass('quad-modal-overlay'))modal.remove();});$('#quad-edit-uid').on('blur',function(){var v=$(this).val().trim();if(!v){$('#quad-edit-nome').text('NPC');return;}fbGet('/saldos/u'+v).then(function(d){$('#quad-edit-nome').text(d&&d.nome?d.nome:'uid nao encontrado');});});$('#quad-edit-cancelar').on('click',function(){modal.remove();});$('#quad-edit-salvar').on('click',function(){var rawUid=$('#quad-edit-uid').val().trim();var isCap=$('#quad-edit-cap').is(':checked');var $msg=$('#quad-edit-msg');if(rawUid){fbGet('/saldos/u'+rawUid).then(function(d){if(!d){$msg.text('uid nao encontrado.');return;}Promise.all([fbGet('/atributos/u'+rawUid),buscarVassoura(rawUid),fbGet('/maestria/u'+rawUid)]).then(function(r){var sd={uid:'u'+rawUid,nome:d.nome,posicao:pos,capitao:isCap,confirmado:false,atributos:r[0]||{},vassoura:r[1]||{nome:'Vassoura Padrao de Hogwarts',bonus:1},maestria:r[2]||{quadribol:0,artilheiro:0,defesa:0,manobras:0,pomo:0},debuff:null,rastreamento:0};fbPatch('/quadribol/partidas/'+pid+'/times/'+t+'/slots/'+pos,sd).then(function(){$msg.text('salvo!');setTimeout(function(){modal.remove();},800);});});});}else{var nd={uid:'npc',nome:'NPC',posicao:pos,capitao:false,confirmado:true,atributos:{forca:8,resistencia:8,agilidade:8,destreza:8,sabedoria:8,carisma:8,inteligencia:8,determinacao:8},vassoura:{nome:'Vassoura Padrao',bonus:1},maestria:{quadribol:0,artilheiro:0,defesa:0,manobras:0,pomo:0},debuff:null,rastreamento:0};fbPatch('/quadribol/partidas/'+pid+'/times/'+t+'/slots/'+pos,nd).then(function(){$msg.text('salvo!');setTimeout(function(){modal.remove();},800);});}});}

// --- JOGO ---
function renderGame(match){var fase=match.fase_atual;var faseObj=(match.fases&&match.fases[fase])?match.fases[fase]:{};var acoes=faseObj.acoes||{};var capAcoes=faseObj.cap_acoes||{};var tA=match.times.A,tB=match.times.B;var mySlots=encontrarMeusSlots(match);var parAtual=match.turno_par||0;var parSlots=TURN_PAIRS[parAtual]||[];var eMinhaVezAgora=mySlots.some(function(s){return parSlots.indexOf(s.time+'_'+s.pos)!==-1&&!acoes[s.time+'_'+s.pos];});var ehEspectador=mySlots.length===0;var parMudou=parAtual!==lastTurnoPar;if(parMudou){lastTurnoPar=parAtual;selectedAcoes={};eraMinhVez=false;}if(eMinhaVezAgora&&!eraMinhVez)tocarSomVez();eraMinhVez=eMinhaVezAgora;if(currentView!=='quad-game'){irPara('quad-game');ativarNav('game');bindNav();}$('#quad-game-nome-a').text(tA.nome);$('#quad-game-nome-b').text(tB.nome);$('#quad-game-score-a').text(tA.placar);$('#quad-game-score-b').text(tB.placar);$('#quad-fase-label').text('fase '+fase+' / '+(typeof QUAD_FASES_TOTAL!=='undefined'?QUAD_FASES_TOTAL:12));var posNomePar=parSlots.length?POS_LABEL[parSlots[0].split('_').slice(1).join('_')]:'';var jogadoresPar=parSlots.map(function(sk){var p=sk.split('_');var t=p[0];var pos2=p.slice(1).join('_');var sl2=match.times[t]&&match.times[t].slots[pos2];return sl2?prefixoCasa(match.times[t].nome)+sl2.nome:'';}).filter(Boolean).join(' x ');var $banner=$('#quad-turno-banner');if(eMinhaVezAgora){$banner.addClass('quad-turno-banner-sua-vez');$('#quad-turno-texto').html('<span class="quad-turno-sua-vez-texto">SUA VEZ!</span> <span class="quad-muted" style="font-size:11px;">'+posNomePar+'</span>');}else{$banner.removeClass('quad-turno-banner-sua-vez');$('#quad-turno-texto').html('<span class="quad-muted" style="font-size:11px;">'+posNomePar+'</span> <span class="quad-turno-outro-nome">'+jogadoresPar+'</span>');}$('#quad-turno-num').text('par '+(parAtual+1)+' / '+TURN_PAIRS.length);$('#quad-campo').html(gerarSvgField(match,acoes));renderLogSection(match,fase,faseObj,logFaseVis===null?fase:logFaseVis);var $aw=$('#quad-acoes-wrap');if(ehEspectador){if(parMudou||$aw.is(':empty')){$aw.empty();renderPainelEspectador(match,$aw);}}else{var meusPar=mySlots.filter(function(s){return parSlots.indexOf(s.time+'_'+s.pos)!==-1;});var todosAgiram=meusPar.length>0&&meusPar.every(function(s){return!!acoes[s.time+'_'+s.pos];});var temSel=!todosAgiram&&Object.keys(selectedAcoes).some(function(k){return selectedAcoes[k]&&selectedAcoes[k].acao;});if(parMudou||$aw.is(':empty')||!temSel){$aw.empty();if(mySlots.length>0){mySlots.forEach(function(s){$aw.append(gerarPainelAcoes(s,match,acoes));});var slotCap=mySlots.find(function(s){return s.slot.capitao&&s.slot.uid===myUid;});if(slotCap)$aw.append(gerarPainelCapitao(slotCap.time,match,!!capAcoes[slotCap.time]));}}}if(isAdmin){$('#quad-game-admin-ctrl').removeAttr('hidden');$('#quad-btn-reiniciar-fase').off('click').on('click',reiniciarFase);$('#quad-btn-encerrar').off('click').on('click',function(){if(!confirm('Encerrar a partida? O placar atual sera o final.'))return;var vF=tA.placar>=tB.placar?'A':'B';var lc={};if(match.fases)Object.keys(match.fases).forEach(function(f){var fo=match.fases[f];if(fo&&fo.resultado&&fo.resultado.log)lc[f]=fo.resultado.log;});Promise.all([fbPatch('/quadribol/partidas/'+pid,{status:'encerrada',vencedor:vF,pomo_capturado:false}),fbPut('/quadribol/historico/'+pid,{data:Date.now(),nomeA:tA.nome,nomeB:tB.nome,placarA:tA.placar,placarB:tB.placar,vencedor:vF,nomeVencedor:match.times[vF].nome,pomo_capturado:false,fases:fase,log_completo:lc}),fbDel('/quadribol/partida_ativa')]).then(function(){processarApostas(pid,vF);clearInterval(pollTimer);boot();});});}else{$('#quad-game-admin-ctrl').attr('hidden',true);}if(parMudou)iniciarCountdown(match.turno_deadline||match.fase_deadline,match);setTimeout(function(){bindAcoesBtns(mySlots,match,acoes,parSlots);$('#quad-log-nav').off('click','.quad-log-nav-btn').on('click','.quad-log-nav-btn',function(){logFaseVis=parseInt($(this).data('fase'));renderLogSection(match,fase,faseObj,logFaseVis);$('#quad-log-nav .quad-log-nav-btn').removeClass('quad-log-nav-btn-ativa');$(this).addClass('quad-log-nav-btn-ativa');});},100);}

// --- PAINEIS ---
function gerarPainelAcoes(mySlot,match,acoes){var sk=mySlot.time+'_'+mySlot.pos;var jaAgiu=!!acoes[sk];var parAtual=match.turno_par||0;var parSlots=TURN_PAIRS[parAtual]||[];var eMinhaVez=parSlots.indexOf(sk)!==-1;var bloq=jaAgiu||!eMinhaVez;var novas=['mergulho','finta_passe','derrubar','pressao_aerea','antecipar','derrubar_artilheiro','mergulho_pomo','carregar'];var stHtml;if(jaAgiu)stHtml='<div class="quad-acao-status quad-acao-status-aguardando">acao enviada, aguardando os outros.</div>';else if(!eMinhaVez)stHtml='<div class="quad-acao-status" style="background:var(--quad-fnd-tab);border:var(--quad-borda2);">aguardando sua vez...</div>';else stHtml='<div class="quad-acao-status quad-acao-status-sua-vez">SUA VEZ, escolha uma acao.</div>';var lista=ACOES[mySlot.pos]||[];var bHtml='<div class="quad-acao-grid">'+lista.map(function(a){var sel=(selectedAcoes[sk]&&selectedAcoes[sk].acao===a.id)?' quad-acao-selecionada':'';var isNova=novas.indexOf(a.id)!==-1?' quad-acao-btn-novo':'';var alvo=a.temAlvo?' data-alvo="true" data-alvos="'+(a.alvos||'')+'"':'';return'<button class="quad-acao-btn'+sel+isNova+'" type="button" data-slot="'+sk+'" data-acao="'+a.id+'"'+alvo+(bloq?' disabled':'')+'>'+
'<div class="quad-acao-nome">'+a.nome+'</div><div class="quad-acao-desc">'+a.desc+'</div></button>';}).join('')+'</div>';var cHtml;if(jaAgiu)cHtml='<button class="quad-btn quad-btn-full" disabled style="background:var(--quad-fnd-tab);color:var(--quad-muted);">acao confirmada!</button>';else if(!eMinhaVez)cHtml='<button class="quad-btn quad-btn-full" disabled style="background:var(--quad-fnd-tab);color:var(--quad-muted);">aguardando sua vez...</button>';else cHtml='<button class="quad-btn quad-btn-accent quad-btn-full quad-btn-confirmar-acao" type="button" data-slot="'+sk+'">confirmar acao</button>';var div=document.createElement('div');div.className='quad-card';div.style.marginBottom='8px';var pref=prefixoCasa(match.times[mySlot.time].nome);div.innerHTML='<div class="quad-sec-title quad-sec-title-ficha" data-uid="'+(mySlot.slot.uid||'')+'" style="cursor:pointer;">'+pref+(mySlot.slot.nome||'')+' - '+POS_LABEL[mySlot.pos]+(mySlot.slot.capitao?' <span class="quad-badge quad-badge-cap">cap</span>':'')+' <span class="quad-ficha-hint quad-muted" style="font-size:10px;">(ver ficha)</span></div>'+stHtml+bHtml+'<div id="quad-alvo-'+sk+'" class="quad-alvo-wrap" hidden></div>'+cHtml;return div;}

function gerarPainelCapitao(myTime,match,jaUsou){var div=document.createElement('div');div.className='quad-card quad-cap-panel';div.style.marginBottom='8px';if(jaUsou){div.innerHTML='<div class="quad-cap-header"><span class="quad-badge quad-badge-cap">capitao</span> acao de lideranca</div><div class="quad-acao-status quad-acao-status-aguardando">acao de lideranca usada esta fase.</div>';return div;}var bHtml='<div class="quad-acao-grid">'+ACOES_CAPITAO.map(function(a){var sel=selectedCapAcao.acao===a.id?' quad-acao-selecionada':'';var alvo=a.temAlvo?' data-alvo="true" data-alvos="'+a.alvos+'"':'';return'<button class="quad-acao-btn quad-cap-acao-btn'+sel+'" type="button" data-cap="true" data-time="'+myTime+'" data-acao="'+a.id+'"'+alvo+'><div class="quad-acao-nome">'+a.nome+'</div><div class="quad-acao-desc">'+a.desc+'</div></button>';}).join('')+'</div>';div.innerHTML='<div class="quad-cap-header"><span class="quad-badge quad-badge-cap">capitao</span> acao de lideranca <span class="quad-muted" style="font-size:10px;">1x por fase</span></div>'+bHtml+'<div id="quad-alvo-cap-'+myTime+'" class="quad-alvo-wrap" hidden></div><button class="quad-btn quad-btn-accent quad-btn-full quad-btn-confirmar-cap" type="button" data-time="'+myTime+'">confirmar lideranca</button>';return div;}

// --- FICHA ---
function abrirFichaJogador(uid,match){if(!uid||uid==='npc')return;Promise.all([fbGet('/atributos/'+uid),fbGet('/maestria/'+uid)]).then(function(r){var attrs=r[0]||{},maest=r[1]||{};var slotInfo=null;['A','B'].forEach(function(t){POSICOES.forEach(function(pos){var sl=match.times[t]&&match.times[t].slots[pos];if(sl&&sl.uid===uid)slotInfo=sl;});});var attrList=['inteligencia','forca','destreza','agilidade','resistencia','sabedoria','carisma','determinacao'];var attrLabels={inteligencia:'Inteligencia',forca:'Forca',destreza:'Destreza',agilidade:'Agilidade',resistencia:'Resistencia',sabedoria:'Sabedoria',carisma:'Carisma',determinacao:'Determinacao'};var attrsHtml=attrList.map(function(a){var val=attrs[a]||10;var pct=Math.min(100,(val/25)*100);var isD=slotInfo&&slotInfo.debuff&&slotInfo.debuff.atributo===a;return'<div class="quad-ficha-attr-row"><span class="quad-ficha-attr-nome">'+(attrLabels[a]||a)+'</span><div class="quad-ficha-attr-track"><div class="quad-ficha-attr-bar'+(isD?' quad-ficha-attr-debuff':'')+'" style="width:'+pct+'%"></div></div><span class="quad-ficha-attr-val'+(isD?' quad-ficha-attr-val-debuff':'')+'">'+val+(isD?' ('+slotInfo.debuff.valor+')':'')+'</span></div>';}).join('');var vassoura=(slotInfo&&slotInfo.vassoura)?slotInfo.vassoura:{nome:'Vassoura Padrao de Hogwarts',bonus:1};var debuffHtml=(slotInfo&&slotInfo.debuff)?'<div class="quad-ficha-debuff"><i class="fa fa-exclamation-triangle"></i> Debuff: -2 em '+slotInfo.debuff.atributo+' por '+(slotInfo.debuff.fases||1)+' fase(s)</div>':'';var rast=(slotInfo&&slotInfo.rastreamento)?slotInfo.rastreamento:0;var nome=(slotInfo&&slotInfo.nome)||uid;var maestHtml=Object.keys(maest).filter(function(k){return k!=='quadribol';}).map(function(k){return'<div class="quad-ficha-maest-item"><span>'+k+'</span><span class="quad-accent">'+maest[k]+'</span></div>';}).join('')||'<p class="quad-muted" style="font-size:11px;">sem maestria especializada.</p>';var modal=$('<div class="quad-modal-overlay">').html('<div class="quad-modal quad-modal-ficha"><div class="quad-ficha-header"><div class="quad-ficha-nome">'+nome+'</div>'+(slotInfo&&slotInfo.capitao?'<span class="quad-badge quad-badge-cap">capitao</span>':'')+' <button type="button" class="quad-ficha-fechar"><i class="fa fa-times"></i></button></div>'+debuffHtml+'<div class="quad-ficha-vassoura"><i class="fa fa-magic"></i> '+vassoura.nome+' <span class="quad-accent">+'+vassoura.bonus+'</span></div>'+(rast?'<div class="quad-ficha-vassoura" style="margin-top:4px;"><i class="fa fa-eye"></i> Rastreamento do Pomo: <span class="quad-accent">+'+rast+'</span></div>':'')+'<div class="quad-sec-title" style="margin:12px 0 6px;">atributos</div>'+attrsHtml+'<div class="quad-sec-title" style="margin:12px 0 6px;">maestria</div><div class="quad-muted" style="font-size:11px;margin-bottom:6px;">quadribol geral: '+(maest.quadribol||0)+'%</div><div class="quad-ficha-maest-grid">'+maestHtml+'</div></div>');$('body').append(modal);modal.on('click',function(e){if($(e.target).hasClass('quad-modal-overlay'))modal.remove();});modal.find('.quad-ficha-fechar').on('click',function(){modal.remove();});});}

// --- BIND ACOES ---
function bindAcoesBtns(mySlots,match,acoes,parSlots){$('.quad-sec-title-ficha').off('click').on('click',function(){abrirFichaJogador($(this).data('uid'),match);});mySlots.forEach(function(s){var sk=s.time+'_'+s.pos;var sel=selectedAcoes[sk];if(!sel||!sel.acao||acoes[sk])return;$('.quad-acao-btn[data-slot="'+sk+'"][data-acao="'+sel.acao+'"]').addClass('quad-acao-selecionada');var acaoObj=(ACOES[s.pos]||[]).find(function(a){return a.id===sel.acao;});if(acaoObj&&acaoObj.temAlvo){renderAlvoSelect(sk,match,acaoObj.alvos);if(sel.alvo)setTimeout(function(){$('input[name="alvo-'+sk+'"][value="'+sel.alvo+'"]').prop('checked',true);},50);}});$('.quad-acao-btn:not(.quad-cap-acao-btn)').off('click').on('click',function(){var sk=$(this).data('slot');var acaoId=$(this).data('acao');$('.quad-acao-btn[data-slot="'+sk+'"]').removeClass('quad-acao-selecionada');$(this).addClass('quad-acao-selecionada');if(!selectedAcoes[sk])selectedAcoes[sk]={};selectedAcoes[sk].acao=acaoId;selectedAcoes[sk].alvo=null;renderAlvoSelect(sk,match,$(this).data('alvos'));});$('.quad-btn-confirmar-acao').off('click').on('click',function(){var sk=$(this).data('slot');var sa=selectedAcoes[sk];if(!sa||!sa.acao){alert('Escolha uma acao primeiro.');return;}submeterAcao(sk,sa.acao,sa.alvo||null);$(this).prop('disabled',true).text('acao confirmada!');$('.quad-acao-btn[data-slot="'+sk+'"]').prop('disabled',true).css('opacity','.5');});$('.quad-cap-acao-btn').off('click').on('click',function(){var acaoId=$(this).data('acao');var myTime=$(this).data('time');$('.quad-cap-acao-btn').removeClass('quad-acao-selecionada');$(this).addClass('quad-acao-selecionada');selectedCapAcao={acao:acaoId,alvo:null};renderAlvoSelectCap(myTime,match);});$('.quad-btn-confirmar-cap').off('click').on('click',function(){var myTime=$(this).data('time');if(!selectedCapAcao.acao){alert('Escolha uma acao de lideranca.');return;}submeterCapAcao(myTime,selectedCapAcao.acao,selectedCapAcao.alvo);$(this).prop('disabled',true).text('lideranca confirmada!');$('.quad-cap-acao-btn').prop('disabled',true).css('opacity','.5');});}

function renderAlvoSelect(sk,match,alvos){var parts=sk.split('_');var t=parts[0];var pos=parts.slice(1).join('_');var advT=t==='A'?'B':'A';var $wrap=$('#quad-alvo-'+sk);if(!alvos){$wrap.attr('hidden',true);return;}var lista=[];if(alvos==='adversarios')POSICOES.forEach(function(p){var sl=match.times[advT].slots[p];if(sl)lista.push({val:p,label:sl.nome+' ('+POS_LABEL[p]+')'});});else if(alvos==='aliados')POSICOES.forEach(function(p){if(p===pos)return;var sl=match.times[t].slots[p];if(sl)lista.push({val:p,label:sl.nome+' ('+POS_LABEL[p]+')'});});else if(alvos==='art_aliados')['artilheiro1','artilheiro2'].forEach(function(p){var sl=match.times[t].slots[p];if(sl)lista.push({val:p,label:sl.nome+' ('+POS_LABEL[p]+')'});});else if(alvos==='art_adversarios')['artilheiro1','artilheiro2'].forEach(function(p){var sl=match.times[advT].slots[p];if(sl)lista.push({val:p,label:sl.nome+' ('+POS_LABEL[p]+')'});});var html='<div class="quad-alvo-titulo">escolha o alvo:</div>'+lista.map(function(item){return'<label class="quad-alvo-radio"><input type="radio" name="alvo-'+sk+'" value="'+item.val+'" style="width:auto;accent-color:var(--quad-accent2);">'+item.label+'</label>';}).join('');$wrap.html(html).removeAttr('hidden');var $f=$('input[name="alvo-'+sk+'"]').first();if($f.length){$f.prop('checked',true);selectedAcoes[sk].alvo=$f.val();}$('input[name="alvo-'+sk+'"]').on('change',function(){selectedAcoes[sk].alvo=$(this).val();});}

function renderAlvoSelectCap(myTime,match){var $wrap=$('#quad-alvo-cap-'+myTime);var lista=[];POSICOES.forEach(function(pos){var sl=match.times[myTime].slots[pos];if(sl&&sl.uid!==myUid)lista.push({val:pos,label:sl.nome+' ('+POS_LABEL[pos]+')'});});var html='<div class="quad-alvo-titulo">escolha o aliado:</div>'+lista.map(function(item){return'<label class="quad-alvo-radio"><input type="radio" name="alvo-cap-'+myTime+'" value="'+item.val+'" style="width:auto;accent-color:var(--quad-accent2);">'+item.label+'</label>';}).join('');$wrap.html(html).removeAttr('hidden');var $f=$('input[name="alvo-cap-'+myTime+'"]').first();if($f.length){$f.prop('checked',true);selectedCapAcao.alvo=$f.val();}$('input[name="alvo-cap-'+myTime+'"]').on('change',function(){selectedCapAcao.alvo=$(this).val();});}

// --- SUBMISSAO ---
function submeterAcao(sk,acaoId,alvo){var matchAtual=null,faseAtual=null;fbGet('/quadribol/partidas/'+pid).then(function(m){if(!m)return;matchAtual=m;faseAtual=m.fase_atual;var p=sk.split('_');var t=p[0];var pos=p.slice(1).join('_');var slot=m.times[t]&&m.times[t].slots[pos]?m.times[t].slots[pos]:{};var lista=ACOES[pos]||[];var ao=lista.find(function(a){return a.id===acaoId;});var rtDesc=(slot.nome||sk)+' escolheu '+(ao?ao.nome:acaoId)+'.';return Promise.all([fbPut('/quadribol/partidas/'+pid+'/fases/'+faseAtual+'/acoes/'+sk,{acao:acaoId,alvo:alvo||null,ts:Date.now()}),fbPut('/quadribol/partidas/'+pid+'/fases/'+faseAtual+'/log_rt/'+sk,rtDesc)]);}).then(function(){if(!matchAtual)return;var par=matchAtual.turno_par||0;var parSlots=TURN_PAIRS[par]||[];var parceiro=parSlots[0]===sk?parSlots[1]:parSlots[0];return fbGet('/quadribol/partidas/'+pid+'/fases/'+faseAtual+'/acoes/'+parceiro);}).then(function(parcAcao){if(parcAcao!==null)fbGet('/quadribol/partidas/'+pid).then(function(m){if(m)avancarPar(m);});});}

function submeterCapAcao(myTime,acaoId,alvo){fbGet('/quadribol/partidas/'+pid).then(function(m){if(!m)return;fbPut('/quadribol/partidas/'+pid+'/fases/'+m.fase_atual+'/cap_acoes/'+myTime,{acao:acaoId,alvo:alvo||null,ts:Date.now(),uid:myUid});});}

// --- REINICIAR FASE ---
function reiniciarFase(){if(!confirm('Reiniciar a fase atual?\nTodas as acoes serao apagadas e todos jogarao novamente.'))return;fbGet('/quadribol/partidas/'+pid).then(function(m){if(!m)return;var fase=m.fase_atual;var novoDeadline=Date.now()+FASE_SECS*1000;Promise.all([fbPut('/quadribol/partidas/'+pid+'/fases/'+fase,{status:'aberta',acoes:{},log_rt:{},log_pares:{}}),fbPatch('/quadribol/partidas/'+pid,{turno_par:0,turno_deadline:novoDeadline,fase_deadline:novoDeadline})]).then(function(){selectedAcoes={};selectedCapAcao={};lastTurnoPar=-1;});});}

// --- COUNTDOWN ---
function iniciarCountdown(deadline,match){if(countdownTimer)clearInterval(countdownTimer);function tick(){var rem=Math.max(0,Math.floor((deadline-Date.now())/1000));var pct=Math.max(0,(rem/FASE_SECS)*100);var urg=rem<=15;$('#quad-timer-bar').css('width',pct+'%').toggleClass('quad-timer-bar-urgente',urg);$('#quad-timer-secs').text(rem+'s').toggleClass('quad-timer-secs-urgente',urg);if(rem===0){clearInterval(countdownTimer);if(!isAdmin)return;fbGet('/quadribol/partidas/'+pid).then(function(m){if(!m||m.status!=='em_andamento')return;var par=m.turno_par||0;var fo=m.fases&&m.fases[m.fase_atual]?m.fases[m.fase_atual]:{};var ac=fo.acoes||{};var algumFaltou=(TURN_PAIRS[par]||[]).some(function(sk){return!ac[sk];});if(algumFaltou)reiniciarFase();else avancarPar(m);});}}tick();countdownTimer=setInterval(tick,1000);}

// --- PROGRESSAO DE PARES ---
function avancarPar(match){var parAtual=match.turno_par||0;var proximoPar=parAtual+1;var fase=match.fase_atual;fbGet('/quadribol/partidas/'+pid+'/fases/'+fase+'/acoes').then(function(acoes){acoes=acoes||{};resolverParImediato(match,acoes,parAtual).then(function(){if(proximoPar>=TURN_PAIRS.length){fbGet('/quadribol/partidas/'+pid).then(function(m){if(m)resolverFase(m);});return;}var novoDeadline=Date.now()+FASE_SECS*1000;var npcP=[];TURN_PAIRS[proximoPar].forEach(function(sk){var skP=sk.split('_');var skT=skP[0];var skPos=skP.slice(1).join('_');var skSl=match.times[skT]&&match.times[skT].slots[skPos];if(skSl&&skSl.uid==='npc'&&!euSouCapitaoDo(match,skT)){var na=escolherAcaoNpc(skPos,match,skT);npcP.push(fbPut('/quadribol/partidas/'+pid+'/fases/'+fase+'/acoes/'+sk,na));npcP.push(fbPut('/quadribol/partidas/'+pid+'/fases/'+fase+'/log_rt/'+sk,(skSl.nome||'NPC')+' agiu automaticamente.'));}});var todosNpc=TURN_PAIRS[proximoPar].every(function(sk){var sp=sk.split('_');var t2=sp[0];var p2=sp.slice(1).join('_');var sl2=match.times[t2]&&match.times[t2].slots[p2];return sl2&&sl2.uid==='npc'&&!euSouCapitaoDo(match,t2);});Promise.all(npcP).then(function(){fbPatch('/quadribol/partidas/'+pid,{turno_par:proximoPar,turno_deadline:novoDeadline}).then(function(){if(todosNpc)setTimeout(function(){fbGet('/quadribol/partidas/'+pid).then(function(m2){if(m2)avancarPar(m2);});},400);});});});});}

// --- RESOLVER PAR (log em tempo real) ---
function resolverParImediato(match,acoes,parIdx){var parSlots=TURN_PAIRS[parIdx]||[];var logE=[],saves=[];function slF(t,pos){return match.times[t]&&match.times[t].slots[pos]?match.times[t].slots[pos]:{};}function advT(t){return t==='A'?'B':'A';}function log(txt,tipo,sub){logE.push({text:txt,type:tipo||'normal',sub:sub||null});}parSlots.forEach(function(sk){var p=sk.split('_');var t=p[0];var pos=p.slice(1).join('_');var sl2=slF(t,pos);var ac=acoes[sk];if(!ac||ac.acao==='passou'){log(sl2.nome+' nao agiu.','muted');return;}if(pos==='batedor'){if(ac.acao==='lancar_balaco'&&ac.alvo)log(sl2.nome+' mira o Balaco em '+slF(advT(t),ac.alvo).nome+'.');else if(ac.acao==='derrubar'&&ac.alvo)log(sl2.nome+' avanca para derrubar '+slF(advT(t),ac.alvo).nome+'.','debuff');else if(ac.acao==='pressao_aerea'&&ac.alvo)log(sl2.nome+' pressiona '+slF(advT(t),ac.alvo).nome+' no ar.','debuff');else if(ac.acao==='proteger'&&ac.alvo)log(sl2.nome+' cobre '+slF(t,ac.alvo).nome+'.');else if(ac.acao==='interceptar')log(sl2.nome+' tenta interceptar o passe.');}else if(pos==='goleiro'){if(ac.acao==='defender')log(sl2.nome+' se posiciona nos aros.');else if(ac.acao==='blitz')log(sl2.nome+' parte em Blitz!','debuff');else if(ac.acao==='lancar_goles'&&ac.alvo)log(sl2.nome+' lanca a Goles para '+slF(t,ac.alvo).nome+'.');else if(ac.acao==='antecipar')log(sl2.nome+' le o jogo com atencao.');else if(ac.acao==='derrubar_artilheiro'&&ac.alvo)log(sl2.nome+' avanca para derrubar '+slF(advT(t),ac.alvo).nome+'.','debuff');}else if(pos==='artilheiro1'||pos==='artilheiro2'){if(ac.acao==='arremessar')log(sl2.nome+' avanca para arremessar.');else if(ac.acao==='passar')log(sl2.nome+' passa a Goles para o parceiro.');else if(ac.acao==='fintar')log(sl2.nome+' executa uma finta.');else if(ac.acao==='mergulho')log(sl2.nome+' mergulha em alta velocidade!','debuff');else if(ac.acao==='finta_passe')log(sl2.nome+' finge o passe para enganar o Goleiro.');}else if(pos==='apanhador'){if(ac.acao==='rastrear')log(sl2.nome+' rastreia o Pomo.','pomo');else if(ac.acao==='sabotar')log(sl2.nome+' tenta sabotar '+slF(advT(t),'apanhador').nome+'.');else if(ac.acao==='distracao')log(sl2.nome+' finge ver o Pomo!','debuff');else if(ac.acao==='auxiliar'&&ac.alvo)log(sl2.nome+' passa a Goles para '+slF(t,ac.alvo).nome+'.');else if(ac.acao==='mergulho_pomo')log(sl2.nome+' mergulha em direcao ao Pomo!','pomo');else if(ac.acao==='carregar')log(sl2.nome+' avanca em colisao contra '+slF(advT(t),'apanhador').nome+'.','debuff');}});if(!logE.length)return Promise.resolve();saves.push(fbPut('/quadribol/partidas/'+pid+'/fases/'+match.fase_atual+'/log_pares/par'+parIdx,logE));return Promise.all(saves).catch(function(e){console.error('resolverParImediato error:',e);});}

// --- RESOLVER FASE ---
function resolverFase(match){var fase=match.fase_atual;var faseObj=match.fases&&match.fases[fase]?match.fases[fase]:{};if(!faseObj||faseObj.status!=='aberta')return;fbPut('/quadribol/partidas/'+pid+'/fases/'+fase+'/status','resolvendo').then(function(){return fbGet('/quadribol/partidas/'+pid+'/fases/'+fase+'/status');}).then(function(status){if(status!=='resolvendo')return null;return fbGet('/quadribol/partidas/'+pid+'/fases/'+fase+'/acoes');}).then(function(acoes){if(acoes===undefined)return;acoes=acoes||{};var npcP=[];['A','B'].forEach(function(t){POSICOES.forEach(function(pos){var sl=match.times[t].slots[pos];var key=t+'_'+pos;if(sl&&!acoes[key]){var na=escolherAcaoNpc(pos,match,t);acoes[key]=na;npcP.push(fbPut('/quadribol/partidas/'+pid+'/fases/'+fase+'/acoes/'+key,na));}});});return Promise.all(npcP).then(function(){return acoes;});}).then(function(acoes){if(!acoes)return;fbGet('/quadribol/partidas/'+pid+'/fases/'+fase+'/cap_acoes').then(function(capAcoes){processarAcoes(match,acoes,capAcoes||{},fase);});}).catch(function(e){console.error('resolverFase error:',e);fbPut('/quadribol/partidas/'+pid+'/fases/'+fase+'/status','aberta');});}

// --- PROCESSAR ACOES ---
function processarAcoes(match,acoes,capAcoes,faseNum){var tA=match.times.A,tB=match.times.B;var logArr=[],placarA=tA.placar,placarB=tB.placar;var novosDebuffs={},novoRastreia={},interceptados={},passeBonus={};var blitzResult={},distracoes={},protegidos={};var mergulhoBonus={},expostos={},fintaPasseDebuff={};var antecipeBonus={},derrubados={},fintouB={};var pomoCapturado=false,vencedor=null,saves=[];function sl(t,pos){return match.times[t].slots[pos]||{};}function advT(t){return t==='A'?'B':'A';}function log(txt,tipo,sub){logArr.push({text:'\u2736 '+txt,type:tipo||'normal',sub:sub||null});}function deduzirHp(uid,v){return fbGet('/status-perfil/'+uid).then(function(s){if(s)return fbPatch('/status-perfil/'+uid,{hp_cur:Math.max(0,(s.hp_cur||0)-v)});});}var HP=typeof QUAD_HP_DANO!=='undefined'?QUAD_HP_DANO:10;
// 1. Capitao
['A','B'].forEach(function(t){var ca=capAcoes[t];if(!ca||!ca.alvo)return;var capNome='Capitao';POSICOES.forEach(function(pos){var s=sl(t,pos);if(s.uid===ca.uid)capNome=s.nome;});if(ca.acao==='motivar'){passeBonus[t+'_'+ca.alvo]=(passeBonus[t+'_'+ca.alvo]||0)+3;log(capNome+' motivou '+sl(t,ca.alvo).nome+'.','cap','A lideranca ecoa no campo. +3 no proximo roll.');}else if(ca.acao==='estrategia'){var alvSl=sl(t,ca.alvo);if(alvSl.debuff){novosDebuffs[t+'_'+ca.alvo]=null;log(capNome+' usou Estrategia em prol de '+alvSl.nome+'.','cap','Debuff cancelado.');}else log(capNome+' tentou Estrategia, mas '+alvSl.nome+' nao tinha debuff.','muted');}});
// 2. Finta de passe
['A','B'].forEach(function(t){['artilheiro1','artilheiro2'].forEach(function(pos){var ac=acoes[t+'_'+pos];var ast=sl(t,pos);if(!ac||ac.acao!=='finta_passe')return;var gs=sl(advT(t),'goleiro');if(roll2(getAttr(ast,'inteligencia'),getAttr(ast,'destreza'),vassB(ast))>roll2(getAttr(gs,'inteligencia'),getAttr(gs,'forca'),vassB(gs))){fintaPasseDebuff[advT(t)]=3;log(ast.nome+' fez uma Finta de Passe.','debuff',gs.nome+' foi enganado. -3 na defesa desta fase.');}else log(ast.nome+' tentou enganar o Goleiro, mas foi lido.','muted');});});
// 3. Antecipar
['A','B'].forEach(function(t){var ac=acoes[t+'_goleiro'];var gs=sl(t,'goleiro');if(!ac||ac.acao!=='antecipar')return;var advArt=sl(advT(t),'artilheiro1');if(roll2(getAttr(gs,'inteligencia'),getAttr(gs,'agilidade'),vassB(gs))>roll2(getAttr(advArt,'inteligencia'),getAttr(advArt,'destreza'),vassB(advArt))){antecipeBonus[t]=5;log(gs.nome+' antecipou o jogo.','ok','+5 na defesa desta fase.');}else log(gs.nome+' tentou antecipar mas nao conseguiu.','muted');});
// 4. Mergulho
['A','B'].forEach(function(t){['artilheiro1','artilheiro2'].forEach(function(pos){var ac=acoes[t+'_'+pos];var ast=sl(t,pos);if(!ac||ac.acao!=='mergulho')return;var gs=sl(advT(t),'goleiro');if(roll2(getAttr(ast,'agilidade'),getAttr(ast,'destreza'),vassB(ast))>roll2(getAttr(gs,'forca'),getAttr(gs,'agilidade'),b3(gs,'inteligencia')+vassB(gs))){mergulhoBonus[t+'_'+pos]=4;log(ast.nome+' fez um Mergulho impressionante.','ok','Ganhou impulso. +4 no arremesso.');}else{expostos[t+'_'+pos]=true;log(ast.nome+' tentou mergulhar mas foi bloqueado.','debuff','Ficou exposto. Goleiro ganha +2 contra este arremesso.');}});});
// 5. Fintar
['A','B'].forEach(function(t){['artilheiro1','artilheiro2'].forEach(function(pos){var ac=acoes[t+'_'+pos];var ast=sl(t,pos);if(!ac||ac.acao!=='fintar')return;var bs=sl(advT(t),'batedor');if(roll2(getAttr(ast,'agilidade'),getAttr(ast,'inteligencia'),vassB(ast))>roll2(getAttr(bs,'forca'),getAttr(bs,'determinacao'),vassB(bs))){fintouB[t+'_'+pos]=true;log(ast.nome+' executou uma finta perfeita.','ok','Imune ao Balaco esta fase.');}else log(ast.nome+' tentou fintar, mas o Batedor previu.','muted');});});
// 6. Goleiro derrubar artilheiro
['A','B'].forEach(function(t){var ac=acoes[t+'_goleiro'];var gs=sl(t,'goleiro');if(!ac||ac.acao!=='derrubar_artilheiro'||!ac.alvo)return;var alvPos=ac.alvo;var als=sl(advT(t),alvPos);if(roll2(getAttr(gs,'forca'),getAttr(gs,'agilidade'),vassB(gs))>roll2(getAttr(als,'agilidade'),getAttr(als,'destreza'),vassB(als))){derrubados[advT(t)+'_'+alvPos]=true;log(gs.nome+' derrubou '+als.nome+' no ar!','debuff',als.nome+' nao podera arremessar esta fase. -'+HP+' HP.');if(als.uid&&als.uid!=='npc')saves.push(deduzirHp(als.uid,HP));}else log(gs.nome+' tentou derrubar '+als.nome+', mas errou a colisao.','muted');});
// 7. Interceptar
['A','B'].forEach(function(t){var ac=acoes[t+'_batedor'];var bs=sl(t,'batedor');if(!ac||ac.acao!=='interceptar')return;var as1=sl(advT(t),'artilheiro1');if(roll2(getAttr(bs,'forca'),getAttr(bs,'determinacao'),vassB(bs))>roll2(getAttr(as1,'destreza'),getAttr(as1,'agilidade'),vassB(as1))){interceptados[advT(t)]=true;log(bs.nome+' interceptou o passe adversario!','debuff','Artilheiros adversarios perdem bonus de passe.');}else log(bs.nome+' tentou interceptar mas falhou.','muted');});
// 8. Passe bonus
['A','B'].forEach(function(t){['artilheiro1','artilheiro2'].forEach(function(pos){var ac=acoes[t+'_'+pos];var ast=sl(t,pos);if(ac&&ac.acao==='passar'&&!interceptados[t]){var parc=pos==='artilheiro1'?t+'_artilheiro2':t+'_artilheiro1';passeBonus[parc]=(passeBonus[parc]||0)+2;log(ast.nome+' passou a Goles para o parceiro.','normal','+2 no arremesso.');}});var acGol=acoes[t+'_goleiro'];var gs=sl(t,'goleiro');if(acGol&&acGol.acao==='lancar_goles'&&acGol.alvo){var ak=t+'_'+acGol.alvo;passeBonus[ak]=(passeBonus[ak]||0)+2;log(gs.nome+' lancou a Goles para '+sl(t,acGol.alvo).nome+'.','normal','+2 no arremesso.');}var acAph=acoes[t+'_apanhador'];var aph=sl(t,'apanhador');if(acAph&&acAph.acao==='auxiliar'&&acAph.alvo){var ak2=t+'_'+acAph.alvo;passeBonus[ak2]=(passeBonus[ak2]||0)+2;log(aph.nome+' auxiliou '+sl(t,acAph.alvo).nome+'.','normal','+2 no arremesso.');}});
// 9. Blitz
['A','B'].forEach(function(t){var ac=acoes[t+'_goleiro'];var gs=sl(t,'goleiro');if(!ac||ac.acao!=='blitz')return;var as1=sl(advT(t),'artilheiro1');if(roll2(getAttr(gs,'forca'),getAttr(gs,'agilidade'),b3(gs,'inteligencia')+vassB(gs))>=roll2(getAttr(as1,'destreza'),getAttr(as1,'agilidade'),vassB(as1))){blitzResult[t]='ok';log(gs.nome+' executou o Blitz com sucesso!','ok','Interceptou a Goles.');}else{blitzResult[t]='fail';log(gs.nome+' tentou o Blitz e falhou!','debuff','Os aros ficaram desprotegidos.');}});
// 10. Proteger
['A','B'].forEach(function(t){var ac=acoes[t+'_batedor'];if(ac&&ac.acao==='proteger'&&ac.alvo){protegidos[t+'_'+ac.alvo]=true;log(sl(t,'batedor').nome+' protegeu '+sl(t,ac.alvo).nome+'.','ok');}});
// 11. Lancar balaco
['A','B'].forEach(function(t){var ac=acoes[t+'_batedor'];var bs=sl(t,'batedor');if(!ac||ac.acao!=='lancar_balaco'||!ac.alvo)return;var alvPos=ac.alvo;var alvT=advT(t);var als=sl(alvT,alvPos);var alvKey=alvT+'_'+alvPos;if(fintouB[alvKey]){log(bs.nome+' lancou o Balaco em '+als.nome+'.','muted',als.nome+' se esquivou com uma finta. Sem efeito.');return;}if(protegidos[alvKey]){log(bs.nome+' lancou o Balaco em '+als.nome+'.','muted',als.nome+' estava protegido. Sem efeito.');return;}if(roll2(getAttr(bs,'forca'),getAttr(bs,'determinacao'),vassB(bs))>roll2(getAttr(als,'agilidade'),getAttr(als,'resistencia'),vassB(als))){novosDebuffs[alvKey]={atributo:MAIN_ATTR[alvPos]||'agilidade',valor:-2,fases:1};log(bs.nome+' acertou o Balaco em '+als.nome+'!','debuff','-2 em '+MAIN_ATTR[alvPos]+' e -'+HP+' HP.');if(als.uid&&als.uid!=='npc')saves.push(deduzirHp(als.uid,HP));}else log(bs.nome+' lancou o Balaco em '+als.nome+', mas errou.','muted');});
// 12. Derrubar (batedor)
['A','B'].forEach(function(t){var ac=acoes[t+'_batedor'];var bs=sl(t,'batedor');if(!ac||ac.acao!=='derrubar'||!ac.alvo)return;var alvPos=ac.alvo;var als=sl(advT(t),alvPos);if(roll2(getAttr(bs,'forca'),getAttr(bs,'determinacao'),vassB(bs))>roll2(getAttr(als,'agilidade'),getAttr(als,'resistencia'),vassB(als))){derrubados[advT(t)+'_'+alvPos]=true;log(bs.nome+' derrubou '+als.nome+' em colisao aerea!','debuff',als.nome+' caiu. Nao agira no proximo par desta fase. -'+HP+' HP.');if(als.uid&&als.uid!=='npc')saves.push(deduzirHp(als.uid,HP));}else log(bs.nome+' tentou derrubar '+als.nome+', mas foi evitado.','muted');});
// 13. Pressao aerea
['A','B'].forEach(function(t){var ac=acoes[t+'_batedor'];var bs=sl(t,'batedor');if(!ac||ac.acao!=='pressao_aerea'||!ac.alvo)return;var als=sl(advT(t),ac.alvo);if(roll2(getAttr(bs,'forca'),getAttr(bs,'determinacao'),vassB(bs))>roll2(getAttr(als,'determinacao'),getAttr(als,'inteligencia')||getAttr(als,'sabedoria'))){if(!novosDebuffs[advT(t)+'_'+ac.alvo])novosDebuffs[advT(t)+'_'+ac.alvo]={atributo:MAIN_ATTR[ac.alvo]||'agilidade',valor:-2,fases:1};log(bs.nome+' intimidou '+als.nome+' no ar.','debuff','-2 em '+MAIN_ATTR[ac.alvo]+' no proximo roll de '+als.nome+'.');}else log(bs.nome+' tentou intimidar '+als.nome+', sem efeito.','muted');});
// 14. Arremessar
['A','B'].forEach(function(t){['artilheiro1','artilheiro2'].forEach(function(pos){var ac=acoes[t+'_'+pos];var ast=sl(t,pos);if(!ac||ac.acao!=='arremessar')return;if(derrubados[t+'_'+pos]){log(ast.nome+' estava caido e nao conseguiu arremessar.','debuff');return;}var golvT=advT(t);var gs=sl(golvT,'goleiro');if(blitzResult[golvT]==='fail'){if(t==='A')placarA+=10;else placarB+=10;log(ast.nome+' arremessou com os aros desprotegidos.','gol','GOL! +10 para '+match.times[t].nome+'.');return;}var defBonus=(acoes[golvT+'_goleiro']&&acoes[golvT+'_goleiro'].acao==='defender')?2:0;var antB=antecipeBonus[golvT]||0;var fintaD=fintaPasseDebuff[golvT]||0;var expostoB=expostos[t+'_'+pos]?2:0;var atk=roll2(getAttr(ast,'destreza'),getAttr(ast,'agilidade'),b3(ast,'inteligencia')+(passeBonus[t+'_'+pos]||0)+(mergulhoBonus[t+'_'+pos]||0)+vassB(ast)+maestB(ast,'artilheiro'));var def=roll2(getAttr(gs,'forca'),getAttr(gs,'agilidade'),b3(gs,'inteligencia')+defBonus+antB-fintaD+expostoB+vassB(gs)+maestB(gs,'defesa'));if(atk>def){if(t==='A')placarA+=10;else placarB+=10;log(ast.nome+' arremessou a Goles nos aros.','gol','GOOOOL! +10 para '+match.times[t].nome+'.');}else log(ast.nome+' arremessou.','normal',gs.nome+' defendeu os aros.');});});
// 15. Apanhador
['A','B'].forEach(function(t){var ac=acoes[t+'_apanhador'];var sl2=sl(t,'apanhador');if(!ac)return;if(ac.acao==='rastrear'&&!distracoes[t]){novoRastreia[t+'_apanhador']=(sl2.rastreamento||0)+1;log(sl2.nome+' rastreou o Pomo.','pomo','Bonus acumulado: +'+novoRastreia[t+'_apanhador']+'.');}else if(ac.acao==='sabotar'){var advAph=sl(advT(t),'apanhador');if(roll2(getAttr(sl2,'agilidade'),getAttr(sl2,'determinacao'),vassB(sl2))>roll2(getAttr(advAph,'agilidade'),getAttr(advAph,'determinacao'),vassB(advAph))){novoRastreia[advT(t)+'_apanhador']=0;log(sl2.nome+' sabotou '+advAph.nome+'.','debuff','Rastreamento zerado.');}else log(sl2.nome+' tentou sabotar, mas falhou.','muted');}else if(ac.acao==='distracao'){distracoes[advT(t)]=true;log(sl2.nome+' fez uma Distracao.','debuff',sl(advT(t),'apanhador').nome+' perdeu a fase e nao rastreou.');}else if(ac.acao==='carregar'){var advAph2=sl(advT(t),'apanhador');if(roll2(getAttr(sl2,'determinacao'),getAttr(sl2,'agilidade'),vassB(sl2))>roll2(getAttr(advAph2,'agilidade'),getAttr(advAph2,'sabedoria'),vassB(advAph2))){novoRastreia[advT(t)+'_apanhador']=0;derrubados[advT(t)+'_apanhador']=true;log(sl2.nome+' derrubou '+advAph2.nome+'!','debuff','Rastreamento zerado. '+advAph2.nome+' perde o proximo par. -'+HP+' HP.');if(advAph2.uid&&advAph2.uid!=='npc')saves.push(deduzirHp(advAph2.uid,HP));}else log(sl2.nome+' tentou derrubar '+advAph2.nome+', mas foi esquivado.','muted');}});
// 16. Pomo
var pomoFase=match.pomo_fase||9;if(faseNum>=pomoFase&&!match.pomo_capturado){var aphA=sl('A','apanhador'),aphB=sl('B','apanhador');var rastA=novoRastreia['A_apanhador']!==undefined?novoRastreia['A_apanhador']:(aphA.rastreamento||0);var rastB=novoRastreia['B_apanhador']!==undefined?novoRastreia['B_apanhador']:(aphB.rastreamento||0);var rA=roll2(getAttr(aphA,'agilidade'),getAttr(aphA,'determinacao'),b3(aphA,'sabedoria')+b3(aphA,'carisma')+rastA+vassB(aphA)+maestB(aphA,'pomo'));var rB=roll2(getAttr(aphB,'agilidade'),getAttr(aphB,'determinacao'),b3(aphB,'sabedoria')+b3(aphB,'carisma')+rastB+vassB(aphB)+maestB(aphB,'pomo'));log('O POMO DE OURO APARECEU!','pomo',aphA.nome+' e '+aphB.nome+' disputam, ambos tomam -'+HP+' HP.');if(aphA.uid&&aphA.uid!=='npc')saves.push(deduzirHp(aphA.uid,HP));if(aphB.uid&&aphB.uid!=='npc')saves.push(deduzirHp(aphB.uid,HP));if(rA>=rB){placarA+=150;pomoCapturado=true;vencedor='A';log(aphA.nome+' capturou o Pomo de Ouro!','pomo','+150 para '+tA.nome+'!');}else{placarB+=150;pomoCapturado=true;vencedor='B';log(aphB.nome+' capturou o Pomo de Ouro!','pomo','+150 para '+tB.nome+'!');}}
// 16b. Mergulho pelo Pomo
if(!pomoCapturado){['A','B'].forEach(function(t){var ac=acoes[t+'_apanhador'];var sl2=sl(t,'apanhador');if(!ac||ac.acao!=='mergulho_pomo')return;var pomoMin=(match.pomo_fase||9)-2;if(faseNum<pomoMin){log(sl2.nome+' mergulhou pelo Pomo, mas ainda e cedo demais.','muted');return;}var advAph=sl(advT(t),'apanhador');var rastSl2=novoRastreia[t+'_apanhador']!==undefined?novoRastreia[t+'_apanhador']:(sl2.rastreamento||0);var rastAdv=novoRastreia[advT(t)+'_apanhador']!==undefined?novoRastreia[advT(t)+'_apanhador']:(advAph.rastreamento||0);if(roll2(getAttr(sl2,'agilidade'),getAttr(sl2,'determinacao'),b3(sl2,'sabedoria')+rastSl2+vassB(sl2)+maestB(sl2,'pomo'))>roll2(getAttr(advAph,'agilidade'),getAttr(advAph,'determinacao'),b3(advAph,'sabedoria')+rastAdv+vassB(advAph)+maestB(advAph,'pomo'))){if(t==='A'){placarA+=150;vencedor='A';}else{placarB+=150;vencedor='B';}pomoCapturado=true;log(sl2.nome+' mergulhou e capturou o Pomo antecipado!','pomo','+150 para '+match.times[t].nome+'!');}else{novoRastreia[t+'_apanhador']=Math.max(0,rastSl2-2);log(sl2.nome+' mergulhou pelo Pomo mas errou.','debuff','-2 de rastreamento acumulado.');}});}
// Salvar
var nextFase=faseNum+1;var fasesFinal=typeof QUAD_FASES_TOTAL!=='undefined'?QUAD_FASES_TOTAL:12;var isEncerrada=pomoCapturado||nextFase>fasesFinal;var vencedorFinal=vencedor||(placarA>=placarB?'A':'B');saves.push(fbPatch('/quadribol/partidas/'+pid+'/fases/'+faseNum,{status:'resolvida',resultado:{log:logArr,placar_A:placarA,placar_B:placarB}}));saves.push(fbPatch('/quadribol/partidas/'+pid+'/times/A',{placar:placarA}));saves.push(fbPatch('/quadribol/partidas/'+pid+'/times/B',{placar:placarB}));Object.keys(novosDebuffs).forEach(function(k){var p=k.split('_');saves.push(fbPatch('/quadribol/partidas/'+pid+'/times/'+p[0]+'/slots/'+p.slice(1).join('_'),{debuff:novosDebuffs[k]}));});Object.keys(novoRastreia).forEach(function(k){var p=k.split('_');saves.push(fbPatch('/quadribol/partidas/'+pid+'/times/'+p[0]+'/slots/'+p.slice(1).join('_'),{rastreamento:novoRastreia[k]}));});['A','B'].forEach(function(t){POSICOES.forEach(function(pos){var sl2=match.times[t].slots[pos];var key=t+'_'+pos;if(sl2&&sl2.debuff&&!novosDebuffs.hasOwnProperty(key)){var rem=sl2.debuff.fases-1;saves.push(fbPatch('/quadribol/partidas/'+pid+'/times/'+t+'/slots/'+pos,{debuff:rem>0?{atributo:sl2.debuff.atributo,valor:sl2.debuff.valor,fases:rem}:null}));}});});if(isEncerrada){var lc={};if(match.fases)Object.keys(match.fases).forEach(function(f){var fo=match.fases[f];if(fo&&fo.resultado&&fo.resultado.log)lc[f]=fo.resultado.log;});lc[faseNum]=logArr;saves.push(fbPatch('/quadribol/partidas/'+pid,{status:'encerrada',pomo_capturado:pomoCapturado,vencedor:vencedorFinal}));saves.push(fbPut('/quadribol/historico/'+pid,{data:Date.now(),nomeA:tA.nome,nomeB:tB.nome,placarA:placarA,placarB:placarB,vencedor:vencedorFinal,nomeVencedor:match.times[vencedorFinal].nome,pomo_capturado:pomoCapturado,fases:faseNum,log_completo:lc}));saves.push(fbDel('/quadribol/partida_ativa'));processarApostas(pid,vencedorFinal);}else{selectedAcoes={};selectedCapAcao={};var ndf=Date.now()+FASE_SECS*1000;saves.push(fbPatch('/quadribol/partidas/'+pid,{fase_atual:nextFase,fase_deadline:ndf,turno_par:0,turno_deadline:ndf}));saves.push(fbPut('/quadribol/partidas/'+pid+'/fases/'+nextFase,{status:'aberta',acoes:{},log_rt:{}}));}Promise.all(saves).then(function(){if(!isEncerrada){var par0=TURN_PAIRS[0]||[];var npcP=[];var todosNpc=true;par0.forEach(function(sk){var sp=sk.split('_');var skT=sp[0];var skPos=sp.slice(1).join('_');var skSl=match.times[skT]&&match.times[skT].slots[skPos];if(skSl&&skSl.uid==='npc'&&!euSouCapitaoDo(match,skT)){var na=escolherAcaoNpc(skPos,match,skT);npcP.push(fbPut('/quadribol/partidas/'+pid+'/fases/'+nextFase+'/acoes/'+sk,na));npcP.push(fbPut('/quadribol/partidas/'+pid+'/fases/'+nextFase+'/log_rt/'+sk,(skSl.nome||'NPC')+' agiu automaticamente.'));}else todosNpc=false;});Promise.all(npcP).then(function(){if(todosNpc&&npcP.length>0)setTimeout(function(){fbGet('/quadribol/partidas/'+pid).then(function(m2){if(m2)avancarPar(m2);});},400);});}}).catch(function(e){console.error('processarAcoes error:',e);fbPut('/quadribol/partidas/'+pid+'/fases/'+faseNum+'/status','aberta');});}

// --- LOG ---
function renderLogSection(match,faseAtual,faseObj,faseVis){var fases=match.fases||{};var navHtml='';for(var f=1;f<=faseAtual;f++){var ativa=f===faseVis?' quad-log-nav-btn-ativa':'';navHtml+='<button type="button" class="quad-log-nav-btn'+ativa+'" data-fase="'+f+'">'+f+'</button>';}$('#quad-log-nav').html(navHtml);var $box=$('#quad-log-box').empty();function renderEntradas(arr){(arr||[]).forEach(function(e){var obj=typeof e==='string'?{text:e,type:'normal',sub:null}:e;var div=document.createElement('div');div.className='quad-log-entry'+(obj.type?' quad-log-entry-'+obj.type:'');div.innerHTML='<span class="quad-log-main">'+(obj.text||'')+'</span>'+(obj.sub?'<span class="quad-log-sub">'+obj.sub+'</span>':'');$box.append(div);});}if(parseInt(faseVis)===parseInt(faseAtual)){if(faseObj.resultado){$('#quad-log-titulo').text('fase '+faseAtual+' resultado');renderEntradas(faseObj.resultado.log);}else{$('#quad-log-titulo').text('fase '+faseAtual);var rtE=faseObj.log_rt||{};var lp=faseObj.log_pares||{};if(Object.keys(rtE).length||Object.keys(lp).length){Object.values(rtE).forEach(function(txt){var div=document.createElement('div');div.className='quad-log-entry';div.innerHTML='<span class="quad-log-main">'+(typeof txt==='string'?txt:(txt.text||''))+'</span>';$box.append(div);});Object.keys(lp).sort().forEach(function(pk){var entries=lp[pk];if(!Array.isArray(entries))return;$box.append('<div class="quad-log-par-sep">'+pk.replace('par','par ')+'</div>');renderEntradas(entries);});}else $box.html('<div class="quad-log-entry quad-log-entry-muted">aguardando acoes...</div>');}}else{var fo=fases[faseVis];$('#quad-log-titulo').text('fase '+faseVis);if(fo&&fo.resultado&&fo.resultado.log)renderEntradas(fo.resultado.log);else $box.html('<div class="quad-log-entry quad-log-entry-muted">sem log para esta fase.</div>');}if($box[0])$box.scrollTop(0);}

// --- SVG CAMPO ---
function gerarSvgField(match,acoes){var playersHtml='';var nomeA=match.times.A.nome,nomeB=match.times.B.nome;['A','B'].forEach(function(t){var casaNome=t==='A'?nomeA:nomeB;POSICOES.forEach(function(pos){var sl=match.times[t].slots[pos];if(!sl)return;var key=t+'_'+pos;var xy=FIELD_POS[key]||[320,140];var x=xy[0],y=xy[1];var ehMeu=sl.uid===myUid;var agiu=!!acoes[key];var temDebuff=sl.debuff&&sl.debuff.valor;var circFill,circStroke,strokeDash;if(ehMeu){circFill='#8b44c5';circStroke='#bda6c7';strokeDash='';}else{circFill=corDaCasa(casaNome,'fill');circStroke=agiu?corDaCasa(casaNome,'stroke'):'#EF9F27';strokeDash=agiu?'':'stroke-dasharray="3,2"';}var textColor=ehMeu?'#fff':corDaCasa(casaNome,'texto');var pref=prefixoCasa(casaNome);var nomeCurto=pref+(sl.nome.length>5?sl.nome.substring(0,5):sl.nome);var posAbrev=pos==='artilheiro1'||pos==='artilheiro2'?'ART':pos==='batedor'?'BAT':pos==='goleiro'?'GOL':'APH';var badgeSvg=temDebuff?'<circle cx="14" cy="-14" r="6" fill="#E24B4A"/><text x="14" y="-11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">-2</text>':agiu?'<circle cx="14" cy="-14" r="6" fill="#1D9E75"/><text x="14" y="-11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">ok</text>':'';playersHtml+='<g transform="translate('+x+','+y+')"><circle r="19" fill="'+circFill+'" stroke="'+circStroke+'" stroke-width="'+(ehMeu?'2':'1.5')+'" '+strokeDash+'/><text y="2" text-anchor="middle" font-size="9" fill="'+textColor+'" font-weight="600">'+posAbrev+'</text><text y="12" text-anchor="middle" font-size="8" fill="'+textColor+'">'+nomeCurto+'</text>'+badgeSvg+'</g>';});});return'<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="fg" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#0f1a0a"/><stop offset="100%" stop-color="#080d06"/></radialGradient></defs><rect width="640" height="280" rx="10" fill="url(#fg)"/><ellipse cx="320" cy="140" rx="295" ry="118" fill="none" stroke="#1a3010" stroke-width="1.5"/><line x1="320" y1="22" x2="320" y2="258" stroke="#1a3010" stroke-width="1" stroke-dasharray="4,4"/><ellipse cx="320" cy="140" rx="48" ry="40" fill="none" stroke="#1a3010" stroke-width="1"/><ellipse cx="40" cy="140" rx="22" ry="50" fill="none" stroke="#1a3010" stroke-width="1.5"/><ellipse cx="600" cy="140" rx="22" ry="50" fill="none" stroke="#1a3010" stroke-width="1.5"/><g transform="translate(16,112)"><rect x="0" y="0" width="3" height="56" rx="1.5" fill="#bda6c750"/><circle cx="1.5" cy="0" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="28" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="56" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/></g><g transform="translate(621,112)"><rect x="0" y="0" width="3" height="56" rx="1.5" fill="#bda6c750"/><circle cx="1.5" cy="0" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="28" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="56" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/></g><text x="80" y="272" text-anchor="middle" font-size="9" fill="'+corDaCasa(nomeA,'stroke')+'88">'+nomeA.toUpperCase()+'</text><text x="560" y="272" text-anchor="middle" font-size="9" fill="'+corDaCasa(nomeB,'stroke')+'88">'+nomeB.toUpperCase()+'</text>'+playersHtml+'</svg>';}

// --- ESPECTADOR ---
function renderPainelEspectador(match,$wrap){var torcidaKey='torcida_'+pid+'_'+myUid;var jaEh=sessionStorage.getItem(torcidaKey);if(!jaEh){fbGet('/quadribol/partidas/'+pid+'/torcedores/'+myUid).then(function(td){if(td&&td.time){sessionStorage.setItem(torcidaKey,td.time);renderPainelEspectador(match,$wrap.empty());return;}var div=document.createElement('div');div.className='quad-card';div.innerHTML='<div class="quad-sec-title">torcida</div><p class="quad-muted" style="margin-bottom:12px;">escolha o time para torcer.</p><div style="display:flex;gap:8px;"><button type="button" class="quad-btn quad-btn-primary quad-btn-torcida" data-time="A" style="flex:1;">'+match.times.A.nome+'</button><button type="button" class="quad-btn quad-btn-danger quad-btn-torcida" data-time="B" style="flex:1;">'+match.times.B.nome+'</button></div>';$wrap.html('').append(div);setTimeout(function(){$('.quad-btn-torcida').on('click',function(){var t=$(this).data('time');sessionStorage.setItem(torcidaKey,t);fbPut('/quadribol/partidas/'+pid+'/torcedores/'+myUid,{time:t,nome:myNome||myUid,ts:Date.now()});renderPainelEspectador(match,$wrap.empty());});},100);});return;}var meuTime=jaEh;var parAtual=match.turno_par||0;var parSlots=TURN_PAIRS[parAtual]||[];var optsAlvo=parSlots.filter(function(sk){return sk.split('_')[0]===meuTime;}).map(function(sk){var p=sk.split('_');var t=p[0];var pos2=p.slice(1).join('_');var sl=match.times[t]&&match.times[t].slots[pos2];return sl?'<option value="'+sk+'">'+prefixoCasa(match.times[t].nome)+sl.nome+' ('+POS_LABEL[pos2]+')</option>':'';}).join('');var torcedores=match.torcedores||{};var torcA=Object.values(torcedores).filter(function(td){return td.time==='A';}).map(function(td){return td.nome;}).join(', ');var torcB=Object.values(torcedores).filter(function(td){return td.time==='B';}).map(function(td){return td.nome;}).join(', ');var div=document.createElement('div');div.className='quad-card';div.innerHTML='<div class="quad-sec-title">torcida '+match.times[meuTime].nome+'</div><div id="quad-torcida-info" style="font-size:10px;color:var(--quad-muted);margin-bottom:8px;">'+match.times.A.nome+': '+(torcA||'--')+' | '+match.times.B.nome+': '+(torcB||'--')+'</div><div style="margin-bottom:8px;"><div class="quad-slot-label">jogador para receber bonus</div><select id="quad-alvo-torcida" class="quad-input">'+optsAlvo+'</select></div><div style="margin-bottom:10px;"><div class="quad-slot-label">bonus de tempo (0-15s)</div><input type="range" id="quad-range-torcida" min="0" max="15" value="10" style="width:100%;accent-color:var(--quad-accent2);"><div style="text-align:center;font-size:12px;color:var(--quad-accent4);margin-top:2px;"><span id="quad-val-torcida">10</span>s de bonus</div></div><div style="display:flex;gap:8px;"><button type="button" id="quad-btn-dar-bonus" class="quad-btn quad-btn-primary" style="flex:1;">dar bonus de tempo</button><button type="button" id="quad-btn-vuvuzela" class="quad-btn quad-btn-ghost" title="Vuvuzela!"><i class="fa fa-bullhorn"></i></button></div><div id="quad-torcida-msg" class="quad-muted" style="margin-top:6px;"></div>';$wrap.append(div);var apostasDiv=document.createElement('div');apostasDiv.className='quad-card';apostasDiv.innerHTML='<div class="quad-sec-title">apostas</div><p class="quad-muted" style="margin-bottom:8px;">aposte Galeoes no '+match.times[meuTime].nome+'. Ganhe 3x o valor.</p><input type="number" id="quad-inp-aposta" class="quad-input" placeholder="valor em Galeoes" min="1" style="margin-bottom:8px;"><button type="button" class="quad-btn quad-btn-primary quad-btn-apostar" data-time="'+meuTime+'" style="width:100%;">apostar no '+match.times[meuTime].nome+'</button><div id="quad-aposta-msg" class="quad-muted" style="margin-top:6px;"></div>';$wrap.append(apostasDiv);setTimeout(function(){$('#quad-range-torcida').on('input',function(){$('#quad-val-torcida').text($(this).val());});var $vuvu=$('#quad-btn-vuvuzela');var agoraC=Date.now();if(agoraC-lastVuvuzelaClick<VUVUZELA_COOLDOWN){$vuvu.prop('disabled',true);setTimeout(function(){$vuvu.prop('disabled',false);},VUVUZELA_COOLDOWN-(agoraC-lastVuvuzelaClick));}$vuvu.off('click').on('click',function(){var agora=Date.now();if(agora-lastVuvuzelaClick<VUVUZELA_COOLDOWN)return;lastVuvuzelaClick=agora;$(this).prop('disabled',true);setTimeout(function(){$vuvu.prop('disabled',false);},VUVUZELA_COOLDOWN);fbPut('/quadribol/partidas/'+pid+'/torcida_sons/'+agora,{uid:myUid,ts:agora});});$('#quad-btn-dar-bonus').on('click',function(){var alvSk=$('#quad-alvo-torcida').val();var bonus=parseInt($('#quad-range-torcida').val())||0;if(!alvSk)return;fbGet('/quadribol/partidas/'+pid+'/torcida_buffs/'+parAtual+'/'+alvSk).then(function(ex){if(ex){$('#quad-torcida-msg').text('este jogador ja recebeu um bonus neste par.');return;}fbPut('/quadribol/partidas/'+pid+'/torcida_buffs/'+parAtual+'/'+alvSk,{uid:myUid,bonus:bonus,ts:Date.now()}).then(function(){$('#quad-torcida-msg').text('+'+bonus+'s enviado!');tocarVuvuzela();});});});$('.quad-btn-apostar').on('click',function(){var t=$(this).data('time');var val=parseInt($('#quad-inp-aposta').val())||0;if(val<1){$('#quad-aposta-msg').text('informe um valor valido.');return;}fbGet('/quadribol/apostas/'+pid+'/'+myUid).then(function(ex){if(ex){$('#quad-aposta-msg').text('voce ja apostou nesta partida.');return;}fbGet('/saldos/'+myUid).then(function(saldo){var atual=saldo?(saldo.saldo||0):0;if(atual<val){$('#quad-aposta-msg').text('Galeoes insuficientes.');return;}Promise.all([fbPatch('/saldos/'+myUid,{saldo:atual-val}),fbPut('/quadribol/apostas/'+pid+'/'+myUid,{time:t,valor:val,status:'pendente'})]).then(function(){$('#quad-aposta-msg').text('aposta de '+val+' Galeoes registrada!');});});});});},100);}

// --- ENCERRADA ---
function renderEncerrada(match){if(countdownTimer)clearInterval(countdownTimer);irPara('quad-encerrado');ativarNav('encerrado');bindNav();var tA=match.times.A,tB=match.times.B;var v=match.vencedor;var vNome=v==='A'?tA.nome:(v==='B'?tB.nome:'Empate');$('#quad-enc-nome-a').text(tA.nome);$('#quad-enc-nome-b').text(tB.nome);$('#quad-enc-score-a').text(tA.placar).toggleClass('quad-placar-num-vencedor',v==='A');$('#quad-enc-score-b').text(tB.placar).toggleClass('quad-placar-num-vencedor',v==='B');if(match.pomo_capturado)$('#quad-enc-pomo').removeAttr('hidden');else $('#quad-enc-pomo').attr('hidden',true);$('#quad-enc-vencedor').text(vNome+' venceu!');$('#quad-enc-sub').text((v==='A'?tA.placar:tB.placar)+' x '+(v==='A'?tB.placar:tA.placar)+' contra '+(v==='A'?tB.nome:tA.nome));if(isAdmin)$('#quad-btn-enc-nova').removeAttr('hidden');else $('#quad-btn-enc-nova').attr('hidden',true);$('#quad-btn-enc-hist').off('click').on('click',renderHistorico);$('#quad-btn-enc-nova').off('click').on('click',function(){pid=null;renderAdminPanel();});}

// --- HISTORICO ---
function renderHistorico(){irPara('quad-historico');ativarNav('historico');bindNav();var $lista=$('#quad-hist-lista').html('<p class="quad-muted quad-center">carregando...</p>');fbGet('/quadribol/historico').then(function(historico){if(!historico){$lista.html('<p class="quad-muted quad-center">nenhuma partida registrada ainda.</p>');return;}var entradas=Object.values(historico).sort(function(a,b){return b.data-a.data;});$lista.empty();entradas.forEach(function(h,idx){var data=new Date(h.data);var dataStr=data.toLocaleDateString('pt-BR')+' '+data.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});var isA=h.vencedor==='A';var div=document.createElement('div');div.className='quad-hist-item';div.innerHTML='<div class="quad-hist-data"><span>'+dataStr+'</span>'+(h.pomo_capturado?'<span class="quad-badge quad-badge-pos">Pomo capturado</span>':'')+'</div><div class="quad-placar-header" style="padding:.25rem 0;"><div><div class="quad-time-nome-big" style="'+(isA?'color:#5DCAA5':'')+'">'+h.nomeA+(isA?' *':'')+'</div><div class="quad-placar-num" style="font-size:28px;'+(isA?'color:#5DCAA5':'')+'">'+( h.placarA||0)+'</div></div><div class="quad-placar-vs">x</div><div><div class="quad-time-nome-big" style="'+(!isA?'color:#5DCAA5':'')+'">'+h.nomeB+(!isA?' *':'')+'</div><div class="quad-placar-num" style="font-size:28px;'+(!isA?'color:#5DCAA5':'')+'">'+( h.placarB||0)+'</div></div></div>'+(h.log_completo?'<button type="button" class="quad-btn quad-btn-ghost quad-btn-sm" id="quad-logmod-'+idx+'-btn" style="margin-top:6px;">ver log completo</button><div id="quad-logmod-'+idx+'" hidden></div>':'');$lista.append(div);if(h.log_completo){(function(logC,modalId){$('#quad-hist-lista').off('click','#quad-logmod-'+modalId+'-btn').on('click','#quad-logmod-'+modalId+'-btn',function(){var $mod=$('#quad-logmod-'+modalId);if(!$mod.attr('hidden')){$mod.attr('hidden',true);$(this).text('ver log completo');return;}$(this).text('fechar log');var html='';Object.keys(logC).sort(function(a,b){return parseInt(a)-parseInt(b);}).forEach(function(f){var lista=Array.isArray(logC[f])?logC[f]:Object.values(logC[f]);html+='<div style="font-size:10px;color:var(--quad-muted);margin:8px 0 4px;text-transform:uppercase;">fase '+f+'</div>';lista.forEach(function(e){if(!e)return;html+='<div class="quad-log-entry'+(e.type?' quad-log-entry-'+e.type:'')+'"><span class="quad-log-main">'+(e.text||String(e))+'</span>'+(e.sub?'<span class="quad-log-sub">'+e.sub+'</span>':'')+'</div>';});});$mod.html('<div class="quad-log-box" style="max-height:300px;overflow-y:auto;margin-top:8px;">'+html+'</div>').removeAttr('hidden');});})(h.log_completo,idx);}})}); }

// ─── LOG ───────────────────────────────────────────────────────────────────────

function renderLogSection(match, faseAtual, faseObj, faseVis) {
  var fases=match.fases||{};
  var navHtml='';
  for (var f=1;f<=faseAtual;f++) {
    var ativa=f===faseVis?' quad-log-nav-btn-ativa':'';
    navHtml+='<button type="button" class="quad-log-nav-btn'+ativa+'" data-fase="'+f+'">'+f+'</button>';
  }
  $('#quad-log-nav').html(navHtml);
  var $box=$('#quad-log-box').empty();

  function renderEntradas(entradas) {
    (entradas||[]).forEach(function(e) {
      var obj=typeof e==='string'?{text:e,type:'normal',sub:null}:e;
      var div=document.createElement('div');
      div.className='quad-log-entry'+(obj.type?' quad-log-entry-'+obj.type:'');
      div.innerHTML='<span class="quad-log-main">'+(obj.text||'')+'</span>'+
        (obj.sub?'<span class="quad-log-sub">'+obj.sub+'</span>':'');
      $box.append(div);
    });
  }

  if (parseInt(faseVis)===parseInt(faseAtual)) {
    if (faseObj.resultado) {
      $('#quad-log-titulo').text('fase '+faseAtual+' — resultado');
      renderEntradas(faseObj.resultado.log);
    } else {
      $('#quad-log-titulo').text('fase '+faseAtual+' — em andamento');
      var rtEntradas=faseObj.log_rt||{};
      var logPares=faseObj.log_pares||{};
      if (Object.keys(rtEntradas).length||Object.keys(logPares).length) {
        Object.values(rtEntradas).forEach(function(txt) {
          var div=document.createElement('div'); div.className='quad-log-entry quad-log-entry-muted';
          div.innerHTML='<span class="quad-log-main">'+(typeof txt==='string'?txt:(txt.text||''))+'</span>';
          $box.append(div);
        });
        Object.keys(logPares).sort().forEach(function(parKey) {
          var entries=logPares[parKey]; if (!Array.isArray(entries)) return;
          $box.append('<div class="quad-log-par-sep">— '+parKey.replace('par','par ')+' —</div>');
          renderEntradas(entries);
        });
      } else {
        $box.html('<div class="quad-log-entry quad-log-entry-muted">aguardando ações...</div>');
      }
    }
  } else {
    var fo=fases[faseVis];
    $('#quad-log-titulo').text('fase '+faseVis);
    if (fo&&fo.resultado&&fo.resultado.log) renderEntradas(fo.resultado.log);
    else $box.html('<div class="quad-log-entry quad-log-entry-muted">sem log para esta fase.</div>');
  }
  if ($box[0]) $box.scrollTop(0);
}

// ─── ESPECTADOR ────────────────────────────────────────────────────────────────

function renderPainelEspectador(match, $wrap) {
  var tA=match.times.A, tB=match.times.B;
  var torcedores=match.torcedores||{};
  var minhaT=torcedores[myUid]?torcedores[myUid].time:null;
  var torcA=Object.values(torcedores).filter(function(td){return td.time==='A';}).map(function(td){return td.nome;}).join(', ')||'—';
  var torcB=Object.values(torcedores).filter(function(td){return td.time==='B';}).map(function(td){return td.nome;}).join(', ')||'—';
  var div=document.createElement('div'); div.className='quad-card';
  div.innerHTML='<div class="quad-sec-title">torcida</div>'+
    '<div id="quad-torcida-info" class="quad-muted" style="font-size:12px;margin-bottom:8px;">'+
      tA.nome+': '+torcA+'<br>'+tB.nome+': '+torcB+'</div>'+
    (minhaT?
      '<div class="quad-acao-status quad-acao-status-aguardando">torcendo por '+match.times[minhaT].nome+'!</div>':
      '<div style="display:flex;gap:8px;">'+
        '<button type="button" class="quad-btn quad-btn-accent" style="flex:1;" id="quad-torcer-a">torcer por '+tA.nome+'</button>'+
        '<button type="button" class="quad-btn quad-btn-ghost" style="flex:1;" id="quad-torcer-b">torcer por '+tB.nome+'</button>'+
      '</div>')+
    (typeof QUAD_VUVUZELA!=='undefined'&&QUAD_VUVUZELA?
      '<button type="button" class="quad-btn quad-btn-ghost quad-btn-full" style="margin-top:8px;" id="quad-btn-vuvuzela">📯 vuvuzela!</button>':'')+
    '<div id="quad-vuvuzela-avisos" style="margin-top:6px;"></div>';
  $wrap.append(div);
  $('#quad-torcer-a').on('click',function(){ torcer('A',tA.nome); });
  $('#quad-torcer-b').on('click',function(){ torcer('B',tB.nome); });
  $('#quad-btn-vuvuzela').on('click',function() {
    var agora=Date.now();
    if (agora-lastVuvuzelaClick<VUVUZELA_COOLDOWN){ $('#quad-vuvuzela-avisos').text('espera um pouco...'); return; }
    lastVuvuzelaClick=agora;
    fbPut('/quadribol/partidas/'+pid+'/vuvuzelas/'+myUid,{uid:myUid,nome:myNome,ts:agora});
  });
}

function torcer(time, nomeTime) {
  fbPut('/quadribol/partidas/'+pid+'/torcedores/'+myUid,{uid:myUid,nome:myNome,time:time});
  $('#quad-torcer-a,#quad-torcer-b').replaceWith('<div class="quad-acao-status quad-acao-status-aguardando">torcendo por '+nomeTime+'!</div>');
}

function verificarVuvuzelas(match) {
  var vuvs=match.vuvuzelas||{};
  var agora=Date.now();
  Object.keys(vuvs).forEach(function(uid) {
    var v=vuvs[uid];
    if (!v||agora-v.ts>5000||v.ts<=lastVuvuzelaTs) return;
    lastVuvuzelaTs=v.ts;
    tocarVuvuzela(v.nome);
    fbDel('/quadribol/partidas/'+pid+'/vuvuzelas/'+uid);
  });
}

function tocarVuvuzela(nome) {
  try {
    var ctx=new (window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator(); var gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value=480; osc.type='sawtooth'; gain.gain.value=0.12;
    osc.start(); gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.8); osc.stop(ctx.currentTime+0.8);
  } catch(e){}
  var $av=$('#quad-vuvuzela-avisos');
  var aviso=$('<div class="quad-muted" style="font-size:12px;">📯 '+nome+' tocou a vuvuzela!</div>');
  $av.prepend(aviso); setTimeout(function(){ aviso.fadeOut(function(){ aviso.remove(); }); },3000);
}

function tocarSomVez() {
  try {
    var ctx=new (window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator(); var gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value=880; osc.type='sine'; gain.gain.value=0.1;
    osc.start(); gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3); osc.stop(ctx.currentTime+0.3);
  } catch(e){}
}

// ─── CAMPO SVG ─────────────────────────────────────────────────────────────────

function gerarSvgField(match, acoes) {
  var w=640,h=280;
  var parts=['<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:200px;">'];
  parts.push('<rect width="'+w+'" height="'+h+'" fill="#0a0614" rx="8"/>');
  parts.push('<ellipse cx="320" cy="140" rx="240" ry="110" fill="none" stroke="#2a1a4a" stroke-width="1.5"/>');
  parts.push('<line x1="320" y1="30" x2="320" y2="250" stroke="#2a1a4a" stroke-width="1"/>');
  parts.push('<circle cx="320" cy="140" r="18" fill="none" stroke="#8b44c5" stroke-width="1" opacity="0.5"/>');
  // Aros
  ['58','582'].forEach(function(cx){ ['110','140','170'].forEach(function(cy){ parts.push('<circle cx="'+cx+'" cy="'+cy+'" r="7" fill="none" stroke="#b764e8" stroke-width="1.5"/>'); }); });
  // Pomo
  parts.push('<circle cx="320" cy="140" r="6" fill="#f0c040" opacity="0.7"/>');
  // Jogadores
  ['A','B'].forEach(function(t) {
    POSICOES.forEach(function(pos) {
      var key=t+'_'+pos; var coords=FIELD_POS[key]; if(!coords) return;
      var sl=match.times[t].slots[pos]; if(!sl) return;
      var agiu=!!acoes[key];
      var fill=corDaCasa(match.times[t].nome,'fill');
      var stroke=corDaCasa(match.times[t].nome,'stroke');
      var texto=corDaCasa(match.times[t].nome,'texto');
      parts.push('<circle cx="'+coords[0]+'" cy="'+coords[1]+'" r="14" fill="'+fill+'" stroke="'+(agiu?'#1D9E75':stroke)+'" stroke-width="'+(agiu?2:1.5)+'"/>');
      var inicial=(sl.nome||'?').charAt(0).toUpperCase();
      parts.push('<text x="'+coords[0]+'" y="'+(coords[1]+5)+'" text-anchor="middle" font-size="11" fill="'+texto+'" font-family="serif">'+inicial+'</text>');
      var posL=POS_LABEL[pos].charAt(0);
      parts.push('<text x="'+coords[0]+'" y="'+(coords[1]+24)+'" text-anchor="middle" font-size="8" fill="#787878">'+posL+'</text>');
      if (sl.debuff) parts.push('<circle cx="'+(coords[0]+10)+'" cy="'+(coords[1]-10)+'" r="4" fill="#9b0000"/>');
    });
  });
  parts.push('</svg>');
  return parts.join('');
}

// ─── LOBBY / PARTIDA ───────────────────────────────────────────────────────────

function carregarVassouras() {
  fbGet('/inventario/'+myUid+'/vassouras').then(function(vassouras) {
    vassouras=vassouras||{};
    var opcoes=Object.keys(vassouras).map(function(k){ var v=vassouras[k]; return '<option value="'+k+'">'+v.nome+' (+'+v.bonus+')</option>'; }).join('');
    if (!opcoes) opcoes='<option value="">sem vassoura — bônus 0</option>';
    $('#quad-select-vassoura').html(opcoes);
  });
}

function confirmarPresenca() {
  var vassouraId=$('#quad-select-vassoura').val();
  fbGet('/quadribol/partidas/'+pid).then(function(m) {
    if (!m) return;
    var mySlots=encontrarMeusSlots(m);
    if (!mySlots.length) return;
    var s=mySlots[0]; var slotPath='/quadribol/partidas/'+pid+'/times/'+s.time+'/slots/'+s.pos;
    var p=[];
    if (vassouraId) {
      fbGet('/inventario/'+myUid+'/vassouras/'+vassouraId).then(function(v) {
        p.push(fbPatch(slotPath,{confirmado:true,vassoura:v||{nome:'Padrão',bonus:1}}));
        Promise.all(p).then(function(){ $('#quad-btn-confirmar-lobby').prop('disabled',true).text('confirmado!'); });
      });
    } else {
      p.push(fbPatch(slotPath,{confirmado:true,vassoura:{nome:'Vassoura Padrão',bonus:1}}));
      Promise.all(p).then(function(){ $('#quad-btn-confirmar-lobby').prop('disabled',true).text('confirmado!'); });
    }
  });
}

function iniciarPartida() {
  var agora=Date.now(); var deadline=agora+FASE_SECS*1000;
  lastTurnoPar=-1;
  Promise.all([
    fbPatch('/quadribol/partidas/'+pid,{status:'em_andamento',fase_atual:1,fase_deadline:deadline,turno_par:0,turno_deadline:deadline,fases:{1:{status:'aberta',acoes:{},log_rt:{}}}}),
    fbPut('/quadribol/partida_ativa',{pid:pid,status:'em_andamento'})
  ]);
}

function cancelarPartida() {
  if (!confirm('Cancelar a partida?')) return;
  Promise.all([
    fbPatch('/quadribol/partidas/'+pid,{status:'encerrada'}),
    fbDel('/quadribol/partida_ativa')
  ]).then(function(){ pid=null; clearInterval(pollTimer); renderAdminPanel(); });
}

function buscarVassoura(uid) {
  return fbGet('/inventario/u'+uid+'/vassouras').then(function(vassouras) {
    vassouras=vassouras||{};
    var keys=Object.keys(vassouras);
    if (!keys.length) return {nome:'Vassoura Padrão de Hogwarts',bonus:1};
    return vassouras[keys[0]];
  });
}
// ── busca no cadastro próprio primeiro, cai nos caminhos do fórum se não tiver ──
function buscarDadosJogador(rawUid) {
  return fbGet('/quadribol/jogadores/u'+rawUid).then(function(reg) {
    if (reg && reg.atributos) return reg;
    return Promise.all([
      fbGet('/saldos/u'+rawUid),
      fbGet('/atributos/u'+rawUid),
      buscarVassoura(rawUid),
      fbGet('/maestria/u'+rawUid)
    ]).then(function(r) {
      return {
        nome:      r[0] && r[0].nome ? r[0].nome : 'u'+rawUid,
        foto:      null,
        atributos: r[1] || {},
        vassoura:  r[2] || {nome:'Vassoura Padrão de Hogwarts', bonus:1},
        maestria:  r[3] || {quadribol:0,artilheiro:0,defesa:0,manobras:0,pomo:0}
      };
    });
  });
}

// ── aba de cadastro de jogadores no admin ──────────────────────────────────────
function renderAdminJogadores() {
  var $div = $('#quad-adm-jogadores').empty();
  var attrList = ['forca','resistencia','agilidade','destreza','sabedoria','carisma','inteligencia','determinacao'];
  var attrLabel = {forca:'Força',resistencia:'Resistência',agilidade:'Agilidade',destreza:'Destreza',sabedoria:'Sabedoria',carisma:'Carisma',inteligencia:'Inteligência',determinacao:'Determinação'};
  var maestList = ['quadribol','artilheiro','defesa','manobras','pomo'];
  var maestLabel = {quadribol:'Quadribol %',artilheiro:'Artilharia',defesa:'Defesa',manobras:'Manobras',pomo:'Pomo'};

  function montar(uid, dados) {
    dados = dados || {};
    var attrs = dados.atributos || {};
    var maest = dados.maestria  || {};
    var vass  = dados.vassoura  || {};
    var attrGrid = attrList.map(function(a) {
      return '<div><div class="quad-slot-label">'+attrLabel[a]+'</div>'+
        '<input type="number" class="quad-input quad-jog-attr" data-attr="'+a+'" min="1" max="25" value="'+(attrs[a]||10)+'"></div>';
    }).join('');
    var maestGrid = maestList.map(function(k) {
      var max = k==='quadribol' ? 100 : 5;
      return '<div><div class="quad-slot-label">'+maestLabel[k]+'</div>'+
        '<input type="number" class="quad-input quad-jog-maest" data-maest="'+k+'" min="0" max="'+max+'" value="'+(maest[k]||0)+'"></div>';
    }).join('');

    $div.html(
      '<div class="quad-card">'+
        '<div class="quad-sec-title">cadastrar jogador</div>'+
        '<div style="display:flex;gap:8px;margin-bottom:8px;">'+
          '<div style="flex:1;"><div class="quad-slot-label">uid</div>'+
            '<input type="text" id="quad-jog-uid" class="quad-input" placeholder="uid" value="'+(uid||'')+'">'+
            '<div id="quad-jog-preview" class="quad-slot-preview">'+(dados.nome||'')+'</div>'+
          '</div>'+
          '<button type="button" id="quad-jog-buscar" class="quad-btn quad-btn-ghost" style="align-self:flex-end;">buscar</button>'+
        '</div>'+
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">'+
          '<div style="flex:1;"><div class="quad-slot-label">url da foto</div>'+
            '<input type="text" id="quad-jog-foto" class="quad-input" placeholder="https://..." value="'+(dados.foto||'')+'"></div>'+
          '<div id="quad-jog-foto-prev" style="width:56px;height:56px;border-radius:8px;overflow:hidden;border:var(--quad-borda2);background:var(--quad-fnd-tab);flex-shrink:0;">'+
            (dados.foto?'<img src="'+dados.foto+'" style="width:100%;height:100%;object-fit:cover;">':'')+
          '</div>'+
        '</div>'+
        '<div style="display:flex;gap:8px;margin-bottom:10px;">'+
          '<div style="flex:1;"><div class="quad-slot-label">vassoura</div>'+
            '<input type="text" id="quad-jog-vass-nome" class="quad-input" placeholder="nome" value="'+(vass.nome||'')+'"></div>'+
          '<div style="flex:0 0 64px;"><div class="quad-slot-label">bônus</div>'+
            '<input type="number" id="quad-jog-vass-bonus" class="quad-input" min="0" max="10" value="'+(vass.bonus||1)+'"></div>'+
        '</div>'+
        '<div class="quad-slot-label" style="margin-bottom:6px;">atributos</div>'+
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">'+attrGrid+'</div>'+
        '<div class="quad-slot-label" style="margin-bottom:6px;">maestria</div>'+
        '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px;">'+maestGrid+'</div>'+
        '<div style="display:flex;gap:8px;">'+
          '<button type="button" id="quad-jog-salvar" class="quad-btn quad-btn-primary" style="flex:1;">salvar</button>'+
          '<button type="button" id="quad-jog-limpar" class="quad-btn quad-btn-ghost">novo</button>'+
        '</div>'+
        '<div id="quad-jog-msg" class="quad-muted" style="margin-top:6px;font-size:12px;"></div>'+
      '</div>'+
      '<div class="quad-card" style="margin-top:8px;">'+
        '<div class="quad-sec-title">cadastrados</div>'+
        '<div id="quad-jog-lista"><p class="quad-muted">carregando...</p></div>'+
      '</div>'
    );

    $('#quad-jog-foto').on('blur', function() {
      var url = $(this).val().trim();
      $('#quad-jog-foto-prev').html(url?'<img src="'+url+'" style="width:100%;height:100%;object-fit:cover;">':'');
    });

    $('#quad-jog-buscar').on('click', function() {
      var rawUid = $('#quad-jog-uid').val().trim(); if (!rawUid) return;
      buscarDadosJogador(rawUid).then(function(d) { montar(rawUid, d); $('#quad-jog-uid').val(rawUid); });
    });

    $('#quad-jog-salvar').on('click', function() {
      var rawUid = $('#quad-jog-uid').val().trim();
      if (!rawUid) { alert('Informe o uid.'); return; }
      var novosAttrs = {}; $('.quad-jog-attr').each(function(){ novosAttrs[$(this).data('attr')] = parseInt($(this).val())||10; });
      var novosMaest = {}; $('.quad-jog-maest').each(function(){ novosMaest[$(this).data('maest')] = parseInt($(this).val())||0; });
      var d2 = {
        nome:       $('#quad-jog-preview').text() || 'u'+rawUid,
        foto:       $('#quad-jog-foto').val().trim() || null,
        vassoura:   {nome:$('#quad-jog-vass-nome').val().trim()||'Vassoura Padrão', bonus:parseInt($('#quad-jog-vass-bonus').val())||1},
        atributos:  novosAttrs,
        maestria:   novosMaest,
        atualizado: Date.now()
      };
      fbPut('/quadribol/jogadores/u'+rawUid, d2).then(function() {
        $('#quad-jog-msg').text('salvo!');
        carregarLista();
      });
    });

    $('#quad-jog-limpar').on('click', function() { montar(null, null); });
    carregarLista();
  }

  function carregarLista() {
    fbGet('/quadribol/jogadores').then(function(jogadores) {
      var $lista = $('#quad-jog-lista').empty();
      if (!jogadores || !Object.keys(jogadores).length) { $lista.html('<p class="quad-muted">nenhum cadastrado.</p>'); return; }
      Object.keys(jogadores).sort().forEach(function(uid) {
        var j = jogadores[uid];
        var thumb = j.foto
          ? '<img src="'+j.foto+'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:8px;border:var(--quad-borda);flex-shrink:0;">'
          : '<div style="width:36px;height:36px;border-radius:50%;background:var(--quad-fnd-tab);margin-right:8px;flex-shrink:0;"></div>';
        var row = $('<div class="quad-player-row" style="cursor:pointer;">').html(
          thumb+
          '<div style="flex:1;"><div class="quad-player-nome">'+j.nome+'</div>'+
          '<div class="quad-player-meta">'+(j.vassoura?j.vassoura.nome+' +'+j.vassoura.bonus:'')+'</div></div>'+
          '<button type="button" class="quad-btn quad-btn-ghost quad-btn-sm">editar</button>'
        );
        row.on('click', function() { montar(uid.replace('u',''), j); $('#quad-jog-uid').val(uid.replace('u','')); });
        $lista.append(row);
      });
    });
  }

  montar(null, null);
}
// ─── ENCERRADA ─────────────────────────────────────────────────────────────────

function renderEncerrada(match) {
  irPara('quad-encerrada');
  ativarNav('encerrado');
  bindNav();
  var vF=match.vencedor||'A';
  var vNome=match.times[vF]?match.times[vF].nome:'?';
  var placarA=match.times.A.placar||0;
  var placarB=match.times.B.placar||0;
  $('#quad-enc-vencedor').text(vNome);
  $('#quad-enc-placar').text(match.times.A.nome+' '+placarA+' × '+placarB+' '+match.times.B.nome);
  $('#quad-enc-pomo').text(match.pomo_capturado?'Pomo de Ouro capturado.':'Partida encerrada por decisão administrativa.');
  var logArr=[];
  if (match.fases) Object.keys(match.fases).sort(function(a,b){return Number(a)-Number(b);}).forEach(function(f) {
    var fo=match.fases[f]; if(!fo||!fo.resultado||!fo.resultado.log) return;
    logArr.push({text:'── fase '+f+' ──',type:'muted',sub:null});
    fo.resultado.log.forEach(function(e){ logArr.push(e); });
  });
  var $box=$('#quad-enc-log').empty();
  logArr.forEach(function(obj) {
    var div=document.createElement('div');
    div.className='quad-log-entry'+(obj.type?' quad-log-entry-'+obj.type:'');
    div.innerHTML='<span class="quad-log-main">'+(obj.text||'')+'</span>'+(obj.sub?'<span class="quad-log-sub">'+obj.sub+'</span>':'');
    $box.append(div);
  });
}

// ─── HISTÓRICO ─────────────────────────────────────────────────────────────────

function renderHistorico() {
  irPara('quad-historico');
  ativarNav('historico');
  bindNav();
  var $box=$('#quad-hist-lista').html('<div class="quad-muted" style="padding:16px;">carregando...</div>');
  fbGet('/quadribol/historico').then(function(hist) {
    hist=hist||{};
    var partidas=Object.keys(hist).sort(function(a,b){return (hist[b].data||0)-(hist[a].data||0);});
    if (!partidas.length){ $box.html('<div class="quad-muted" style="padding:16px;">nenhuma partida encerrada.</div>'); return; }
    $box.empty();
    partidas.forEach(function(k) {
      var h=hist[k];
      var data=new Date(h.data||0); var dataStr=data.toLocaleDateString('pt-BR');
      var div=document.createElement('div'); div.className='quad-card'; div.style.marginBottom='8px';
      div.innerHTML='<div class="quad-sec-title" style="margin-bottom:4px;">'+h.nomeA+' × '+h.nomeB+'</div>'+
        '<div class="quad-muted" style="font-size:12px;">'+h.placarA+' × '+h.placarB+' — '+dataStr+'</div>'+
        '<div class="quad-accent" style="font-size:12px;margin-top:2px;">vencedor: '+(h.nomeVencedor||'—')+'</div>'+
        (h.pomo_capturado?'<span class="quad-badge quad-badge-ok" style="margin-top:4px;">pomo capturado</span>':'');
      $box.append(div);
    });
  });
}

// ─── TREINO ────────────────────────────────────────────────────────────────────

function renderTreino() {
  irPara('quad-treino');
  ativarNav('treino');
  bindNav();
  if (treinoTimer) clearInterval(treinoTimer);
  var $box=$('#quad-treino-box').html('<div class="quad-muted" style="padding:16px;">carregando...</div>');
  fbGet('/quadribol-treino/'+myUid).then(function(treino) {
    treino=treino||{};
    var hoje=new Date().toISOString().slice(0,10);
    var hojeTreino=treino[hoje]||{horas:0,energia_gasta:0};
    var total=hojeTreino.horas||0;
    var restante=TREINO_META_H-total;
    $box.empty();
    var div=document.createElement('div'); div.className='quad-card';
    div.innerHTML='<div class="quad-sec-title">treino do dia</div>'+
      '<div class="quad-muted" style="margin-bottom:8px;">horas treinadas hoje: <strong class="quad-accent">'+total+'h</strong> / '+TREINO_META_H+'h</div>'+
      '<div class="quad-treino-barra-track"><div class="quad-treino-barra" style="width:'+Math.min(100,(total/TREINO_META_H)*100)+'%"></div></div>'+
      (restante<=0?'<div class="quad-acao-status quad-acao-status-aguardando" style="margin-top:8px;">meta diária atingida!</div>':
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">'+
          TREINO_OPTS.map(function(op){
            var podeUsar=total+op.h<=TREINO_META_H;
            return '<button type="button" class="quad-btn quad-btn-accent quad-btn-treino" data-h="'+op.h+'" data-energia="'+op.energia+'"'+(podeUsar?'':' disabled')+'>'+op.label+' ('+op.energia+' energia)</button>';
          }).join('')+'</div>')+
      '<div id="quad-treino-msg" class="quad-muted" style="margin-top:6px;font-size:12px;"></div>';
    $box.append(div);
    $('.quad-btn-treino').on('click',function() {
      var h=parseInt($(this).data('h')); var energia=parseInt($(this).data('energia'));
      iniciarTreino(h,energia,hoje);
    });
    if (typeof QUAD_TREINO_HISTORICO!=='undefined'&&QUAD_TREINO_HISTORICO) carregarAdminTreinos($box, treino);
  });
}

function iniciarTreino(horas, energia, hoje) {
  if (!hoje) hoje=new Date().toISOString().slice(0,10);
  var $msg=$('#quad-treino-msg'); $msg.text('iniciando treino...');
  fbGet('/status-perfil/'+myUid).then(function(status) {
    status=status||{}; var energiaAtual=status.energia_cur||0;
    if (energiaAtual<energia){ $msg.text('energia insuficiente.'); return; }
    fbGet('/quadribol-treino/'+myUid+'/'+hoje).then(function(hojeTreino) {
      hojeTreino=hojeTreino||{horas:0,energia_gasta:0};
      var novoTotal=hojeTreino.horas+horas;
      if (novoTotal>TREINO_META_H){ $msg.text('ultrapassaria o limite de '+TREINO_META_H+'h.'); return; }
      Promise.all([
        fbPatch('/quadribol-treino/'+myUid+'/'+hoje,{horas:novoTotal,energia_gasta:hojeTreino.energia_gasta+energia}),
        fbPatch('/status-perfil/'+myUid,{energia_cur:Math.max(0,energiaAtual-energia)})
      ]).then(function(){ $msg.text('treino de '+horas+'h concluído! -'+energia+' energia.'); setTimeout(renderTreino,1200); });
    });
  });
}

// ─── ADMIN PANEL ───────────────────────────────────────────────────────────────

function renderAdminPanel() {
  if (!isAdmin) return;
  irPara('quad-admin');
  ativarNav('admin');
  bindNav();
  fbGet('/quadribol/partida_ativa').then(function(ativa) {
    if (ativa&&ativa.pid) {
      fbGet('/quadribol/partidas/'+ativa.pid).then(function(m) {
        if (!m) { renderFormCriarPartida(); return; }
        if (m.status==='em_andamento'||m.status==='aguardando') { $('#quad-admin-box').html('<div class="quad-acao-status quad-acao-status-aguardando">partida ativa: '+m.times.A.nome+' × '+m.times.B.nome+'</div><button type="button" class="quad-btn quad-btn-danger quad-btn-full" id="quad-btn-admin-cancelar" style="margin-top:8px;">cancelar partida ativa</button>'); $('#quad-btn-admin-cancelar').on('click',cancelarPartida); }
        else renderFormCriarPartida();
      });
    } else { renderFormCriarPartida(); }
  });
  carregarAdminHist();
}

function renderFormCriarPartida() {
  var casasOpts=CASAS.map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join('');
  var posHtml=POSICOES.map(function(pos) {
    return '<div class="quad-slot-grupo">'+
      '<div class="quad-slot-label">'+POS_LABEL[pos]+'</div>'+
      '<div style="display:flex;gap:6px;">'+
        gerarSlotInput('A',pos)+gerarSlotInput('B',pos)+
      '</div></div>';
  }).join('');
  var html='<div class="quad-card">'+
    '<div class="quad-sec-title">nova partida</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:10px;">'+
      '<div style="flex:1;"><div class="quad-slot-label">Time A</div><input type="text" id="quad-nome-a" class="quad-input" placeholder="ex: Grifinória" value="'+CASAS[0]+'"></div>'+
      '<div style="flex:1;"><div class="quad-slot-label">Time B</div><input type="text" id="quad-nome-b" class="quad-input" placeholder="ex: Sonserina" value="'+CASAS[1]+'"></div>'+
    '</div>'+posHtml+
    '<div style="display:flex;gap:8px;margin-top:10px;">'+
      '<input type="number" id="quad-pomo-fase" class="quad-input" placeholder="fase do pomo" value="9" style="flex:1;">'+
      '<input type="number" id="quad-fases-total" class="quad-input" placeholder="total de fases" value="12" style="flex:1;">'+
    '</div>'+
    '<button type="button" id="quad-btn-criar" class="quad-btn quad-btn-primary quad-btn-full" style="margin-top:10px;">criar partida</button>'+
    '<div id="quad-criar-msg" class="quad-muted" style="margin-top:6px;font-size:12px;"></div>'+
  '</div>';
  $('#quad-admin-box').html(html);
  bindSlotHandlers();
  $('#quad-btn-criar').on('click', criarPartida);
}

function gerarSlotInput(time, pos) {
  var id='slot-'+time+'-'+pos;
  return '<div style="flex:1;"><div class="quad-slot-label" style="font-size:10px;">Time '+time+'</div>'+
    '<input type="text" id="'+id+'-uid" class="quad-input quad-input-sm" placeholder="uid (vazio=NPC)">'+
    '<div id="'+id+'-nome" class="quad-slot-preview"></div>'+
    '<label style="display:flex;align-items:center;gap:4px;font-size:10px;margin-top:2px;cursor:pointer;"><input type="checkbox" id="'+id+'-cap" style="width:auto;">cap</label>'+
  '</div>';
}

function bindSlotHandlers() {
  POSICOES.forEach(function(pos) {
    ['A','B'].forEach(function(t) {
      var $uid=$('#slot-'+t+'-'+pos+'-uid');
      $uid.on('blur',function() {
        var v=$(this).val().trim(); var $preview=$('#slot-'+t+'-'+pos+'-nome');
        if (!v){ $preview.text('NPC'); return; }
        fbGet('/saldos/u'+v).then(function(d){ $preview.text(d&&d.nome?d.nome:'uid não encontrado'); });
      });
    });
  });
}

function criarPartida() {
  var $btn=$('#quad-btn-criar'); var $msg=$('#quad-criar-msg');
  $btn.prop('disabled',true).text('criando...');
  var nomeA=$('#quad-nome-a').val().trim()||'Time A';
  var nomeB=$('#quad-nome-b').val().trim()||'Time B';
  var pomoFase=parseInt($('#quad-pomo-fase').val())||9;
  var fasesFinal=parseInt($('#quad-fases-total').val())||12;
  var slotsA={}, slotsB={};
  var promises=[];

  function coletarSlot(time,pos,slots) {
    var uid=$('#slot-'+time+'-'+pos+'-uid').val().trim();
    var isCap=$('#slot-'+time+'-'+pos+'-cap').is(':checked');
    if (!uid) {
      slots[pos]={uid:'npc',nome:'NPC',posicao:pos,capitao:false,confirmado:true,atributos:{forca:8,resistencia:8,agilidade:8,destreza:8,sabedoria:8,carisma:8,inteligencia:8,determinacao:8},vassoura:{nome:'Vassoura Padrão',bonus:1},maestria:{quadribol:0,artilheiro:0,defesa:0,manobras:0,pomo:0},debuff:null,rastreamento:0};
      return Promise.resolve();
    }
    return Promise.all([fbGet('/saldos/u'+uid),fbGet('/atributos/u'+uid),buscarVassoura(uid),fbGet('/maestria/u'+uid)]).then(function(r) {
      var saldo=r[0]||{}; var attrs=r[1]||{}; var vassoura=r[2]||{nome:'Vassoura Padrão',bonus:1}; var maest=r[3]||{};
      slots[pos]={uid:'u'+uid,nome:saldo.nome||('u'+uid),posicao:pos,capitao:isCap,confirmado:false,atributos:attrs,vassoura:vassoura,maestria:maest,debuff:null,rastreamento:0};
    });
  }

  POSICOES.forEach(function(pos){ promises.push(coletarSlot('A',pos,slotsA)); promises.push(coletarSlot('B',pos,slotsB)); });
  Promise.all(promises).then(function() {
    var newPid='p'+Date.now();
    var partida={status:'aguardando',criado:Date.now(),pomo_fase:pomoFase,fases_total:fasesFinal,pomo_capturado:false,fase_atual:1,turno_par:0,times:{A:{nome:nomeA,placar:0,slots:slotsA},B:{nome:nomeB,placar:0,slots:slotsB}}};
    fbPut('/quadribol/partidas/'+newPid,partida).then(function() {
      pid=newPid;
      Promise.all([fbPut('/quadribol/partida_ativa',{pid:newPid,status:'aguardando'})]).then(function() {
        $btn.prop('disabled',false).text('criar partida');
        $msg.text('partida criada!');
        renderLobby(partida);
        startPoll();
      });
    });
  }).catch(function(e){ console.error(e); $btn.prop('disabled',false).text('criar partida'); $msg.text('erro ao criar partida.'); });
}

function carregarAdminHist($container) {
  var target=$container||$('#quad-hist-admin');
  if (!target||!target.length) return;
  fbGet('/quadribol/historico').then(function(hist) {
    hist=hist||{};
    var partidas=Object.keys(hist).sort(function(a,b){return(hist[b].data||0)-(hist[a].data||0);}).slice(0,5);
    if (!partidas.length) return;
    var html='<div class="quad-sec-title" style="margin-top:12px;">últimas partidas</div>';
    partidas.forEach(function(k) {
      var h=hist[k]; var data=new Date(h.data||0).toLocaleDateString('pt-BR');
      html+='<div class="quad-player-row" style="margin-bottom:4px;"><div style="flex:1;"><div class="quad-player-nome">'+h.nomeA+' '+h.placarA+' × '+h.placarB+' '+h.nomeB+'</div><div class="quad-player-meta">'+data+' — vencedor: '+(h.nomeVencedor||'—')+'</div></div></div>';
    });
    target.append(html);
  });
}

function renderAdminMaestria() {
  var $box=$('#quad-admin-maestria'); if (!$box.length) return;
  var uid=$('#quad-admin-maestria-uid').val().trim(); if (!uid) return;
  fbGet('/maestria/u'+uid).then(function(maest) {
    maest=maest||{quadribol:0,artilheiro:0,defesa:0,manobras:0,pomo:0};
    var campos=['quadribol','artilheiro','defesa','manobras','pomo'];
    var html='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">'+campos.map(function(c){
      return '<div><div class="quad-slot-label">'+c+'</div><input type="number" class="quad-input quad-input-sm quad-maestria-campo" data-campo="'+c+'" value="'+(maest[c]||0)+'" min="0" max="100" style="width:70px;"></div>';
    }).join('')+'</div>'+
    '<button type="button" class="quad-btn quad-btn-primary" style="margin-top:8px;" id="quad-btn-salvar-maestria">salvar maestria</button>'+
    '<div id="quad-maestria-msg" class="quad-muted" style="font-size:12px;margin-top:4px;"></div>';
    $box.html(html);
    $('#quad-btn-salvar-maestria').on('click',function() {
      var data={}; $('.quad-maestria-campo').each(function(){ data[$(this).data('campo')]=parseInt($(this).val())||0; });
      fbPatch('/maestria/u'+uid,data).then(function(){ $('#quad-maestria-msg').text('salvo!'); });
    });
  });
}

// ─── APOSTAS ───────────────────────────────────────────────────────────────────

function processarApostas(partidaId, vencedor) {
  if (typeof QUAD_APOSTAS_ATIVO==='undefined'||!QUAD_APOSTAS_ATIVO) return;
  fbGet('/apostas/'+partidaId).then(function(apostas) {
    if (!apostas) return;
    var saves=[];
    Object.keys(apostas).forEach(function(uid) {
      var a=apostas[uid]; if (!a||a.time!==vencedor) return;
      saves.push(fbGet('/saldos/'+uid).then(function(saldo) {
        saldo=saldo||{}; var premio=Math.floor((a.valor||0)*1.8);
        return fbPatch('/saldos/'+uid,{saldo:(saldo.saldo||0)+premio});
      }));
    });
    Promise.all(saves);
  });
}

// --- ADMIN PANEL ---
function renderAdminPanel(){irPara('quad-admin');ativarNav('admin');bindNav();var optsA=CASAS.map(function(c){return'<option>'+c+'</option>';}).join('');var optsB=CASAS.map(function(c,i){return'<option'+(i===1?' selected':'')+'>'+c+'</option>';}).join('');$('#quad-casaA').html(optsA);$('#quad-casaB').html(optsB);var $sA=$('#quad-slots-a').empty();var $sB=$('#quad-slots-b').empty();POSICOES.forEach(function(pos){$sA.append(gerarSlotInput(pos,'A'));$sB.append(gerarSlotInput(pos,'B'));});$('.quad-admin-tab').off('click').on('click',function(){var alvo=$(this).data('alvo');$('.quad-admin-tab').removeClass('quad-admin-tab-ativa');$(this).addClass('quad-admin-tab-ativa');$('.quad-adm-aba').attr('hidden',true);$('#'+alvo).removeAttr('hidden');if(alvo==='quad-adm-treinos')carregarAdminTreinos();if(alvo==='quad-adm-hist')carregarAdminHist();if(alvo==='quad-adm-maestria')renderAdminMaestria();if(alvo==='quad-adm-jogadores')renderAdminJogadores();});bindSlotHandlers();$('#quad-btn-criar').off('click').on('click',criarPartida);}

function gerarSlotInput(pos,time){var attrs=NPC_ATTRS[pos]||[];var attrGrid=attrs.map(function(a){return'<div><div class="quad-slot-attr-lbl">'+a+'</div><input type="number" id="npc-attr-'+time+'-'+pos+'-'+a+'" class="quad-input" min="1" max="25" value="12" style="font-size:11px;padding:4px 6px;"></div>';}).join('');var div=document.createElement('div');div.className='quad-slot-item';div.innerHTML='<div class="quad-slot-label">'+POS_LABEL[pos]+'</div><div class="quad-slot-controls"><input type="text" id="uid-'+time+'-'+pos+'" class="quad-input" placeholder="uid"><label class="quad-slot-check"><input type="checkbox" id="npc-'+time+'-'+pos+'" style="width:auto;"> npc</label><label class="quad-slot-check"><input type="checkbox" id="cap-'+time+'-'+pos+'" style="width:auto;"> cap</label></div><div class="quad-slot-preview" id="preview-'+time+'-'+pos+'"></div><div class="quad-slot-npc-extra" id="npc-extra-'+time+'-'+pos+'" style="display:none;"><input type="text" id="npc-nome-'+time+'-'+pos+'" class="quad-input" placeholder="nome do npc"><div class="quad-slot-attrs-grid">'+attrGrid+'</div></div>';return div;}

function bindSlotHandlers(){POSICOES.forEach(function(pos){['A','B'].forEach(function(t){$('#uid-'+t+'-'+pos).off('blur').on('blur',function(){var v=$(this).val().trim();if(!v||$('#npc-'+t+'-'+pos).is(':checked'))return;fbGet('/saldos/u'+v).then(function(d){$('#preview-'+t+'-'+pos).text(d&&d.nome?d.nome:'uid nao encontrado');});});$('#npc-'+t+'-'+pos).off('change').on('change',function(){var checked=$(this).is(':checked');$('#uid-'+t+'-'+pos).prop('disabled',checked);$('#npc-extra-'+t+'-'+pos).css('display',checked?'block':'none');if(!checked)$('#preview-'+t+'-'+pos).text('');});});});}

function criarPartida(){var casaA=$('#quad-casaA').val();var casaB=$('#quad-casaB').val();if(casaA===casaB){alert('Os dois times nao podem ser da mesma casa.');return;}$('#quad-btn-criar').prop('disabled',true).text('aguarde...');var times={A:{nome:casaA,placar:0,slots:{}},B:{nome:casaB,placar:0,slots:{}}};var promises=[],erros=[];POSICOES.forEach(function(pos){['A','B'].forEach(function(t){var isNpc=$('#npc-'+t+'-'+pos).is(':checked');var isCap=$('#cap-'+t+'-'+pos).is(':checked');var rawUid=$('#uid-'+t+'-'+pos).val().trim();if(isNpc){var npcNome=$('#npc-nome-'+t+'-'+pos).val().trim()||('NPC '+POS_LABEL[pos]);var npcAttrs={};(NPC_ATTRS[pos]||[]).forEach(function(a){var v=parseInt($('#npc-attr-'+t+'-'+pos+'-'+a).val());npcAttrs[a]=isNaN(v)?12:Math.min(25,Math.max(1,v));});times[t].slots[pos]=npcSlot(pos,npcNome,npcAttrs);}else if(rawUid){var p2=Promise.all([fbGet('/saldos/u'+rawUid),fbGet('/atributos/u'+rawUid),buscarVassoura(rawUid),fbGet('/maestria/u'+rawUid)]).then(function(r){times[t].slots[pos]={uid:'u'+rawUid,nome:r[0]&&r[0].nome?r[0].nome:'Jogador',posicao:pos,capitao:isCap,confirmado:false,atributos:r[1]||{},vassoura:r[2]||{nome:'Vassoura Padrao de Hogwarts',bonus:1},maestria:r[3]||{quadribol:0,artilheiro:0,defesa:0,manobras:0,pomo:0},debuff:null,rastreamento:0};});promises.push(p2);}else erros.push(POS_LABEL[pos]+' (Time '+t+')');});});if(erros.length){alert('Preencha o uid ou marque como NPC:\n'+erros.join('\n'));$('#quad-btn-criar').prop('disabled',false).text('criar partida');return;}Promise.all(promises).then(function(){var newPid='p'+Date.now();var pomoMin=typeof QUAD_POMO_MIN!=='undefined'?QUAD_POMO_MIN:8;var pomoMax=typeof QUAD_POMO_MAX!=='undefined'?QUAD_POMO_MAX:11;var pomoFase=pomoMin+Math.floor(Math.random()*(pomoMax-pomoMin+1));var partida={status:'aguardando',fase_atual:1,fase_deadline:null,turno_par:0,turno_deadline:null,pomo_fase:pomoFase,pomo_capturado:false,criado_em:Date.now(),times:times,fases:{}};Promise.all([fbPut('/quadribol/partidas/'+newPid,partida),fbPut('/quadribol/partida_ativa',{pid:newPid,status:'aguardando'})]).then(function(){pid=newPid;renderLobby(partida);startPoll();$('#quad-btn-criar').prop('disabled',false).text('criar partida');});});}

function npcSlot(pos,nome,atribsCustom){var at={forca:12,resistencia:12,agilidade:12,destreza:12,sabedoria:12,carisma:12,inteligencia:12,determinacao:12};if(atribsCustom)Object.keys(atribsCustom).forEach(function(k){at[k]=atribsCustom[k];});return{uid:'npc',nome:nome||'NPC',posicao:pos,capitao:false,confirmado:true,atributos:at,vassoura:{nome:'Vassoura Padrao de Hogwarts',velocidade:10,bonus:1},debuff:null,rastreamento:0};}

function buscarVassoura(rawUid){return Promise.all([fbGet('/inventario/u'+rawUid),fbGet('/mochila/u'+rawUid)]).then(function(r){var todos=Object.assign({},r[0]||{},r[1]||{});for(var k in todos){var v=detectarVassoura(todos[k]);if(v)return v;}return null;});}

function detectarVassoura(item){if(!item||!item.descricao)return null;var desc=item.descricao;var ehV=desc.indexOf('Cabo:')!==-1||/Percorre\s+\d+\s+metros/i.test(desc);if(!ehV)return null;var bonus=1;var mano=desc.match(/Manobrabilidade:\s*(\d+)%/i);if(mano)bonus=Math.max(1,Math.floor(parseInt(mano[1])/10));else{var perc=desc.match(/Percorre\s+(\d+)\s+metros/i);if(perc)bonus=Math.max(1,Math.floor(parseInt(perc[1])/10));}return{nome:item.nome||'Vassoura',bonus:bonus};}

// --- LOBBY ACOES ---
function carregarVassouras(){var $sel=$('#quad-sel-vassoura');$sel.html('<option value="padrao">Vassoura Padrao de Hogwarts (+1)</option>');Promise.all([fbGet('/inventario/'+myUid),fbGet('/mochila/'+myUid)]).then(function(r){var todos=Object.assign({},r[0]||{},r[1]||{});var opts='<option value="padrao">Vassoura Padrao de Hogwarts (+1)</option>';var lista=[];Object.values(todos).forEach(function(item){var v=detectarVassoura(item);if(!v)return;lista.push(v);opts+='<option value="'+(lista.length-1)+'">'+v.nome+' (+'+v.bonus+')</option>';});$sel.html(opts).data('lista',lista);});}

function confirmarPresenca(){var vassOpt=$('#quad-sel-vassoura').val();var listaV=$('#quad-sel-vassoura').data('lista')||[];var vassoura=vassOpt==='padrao'||!vassOpt?{nome:'Vassoura Padrao de Hogwarts',velocidade:10,bonus:1}:(listaV[parseInt(vassOpt)]||{nome:'Vassoura Padrao de Hogwarts',velocidade:10,bonus:1});fbGet('/quadribol/partidas/'+pid).then(function(match){var mySlots=encontrarMeusSlots(match);var promises=[];mySlots.forEach(function(s){if(!s.slot.confirmado)promises.push(fbPatch('/quadribol/partidas/'+pid+'/times/'+s.time+'/slots/'+s.pos,{confirmado:true,vassoura:vassoura}));});return Promise.all(promises);});}

function iniciarPartida(){var agora=Date.now();var deadline=agora+FASE_SECS*1000;lastTurnoPar=-1;Promise.all([fbPatch('/quadribol/partidas/'+pid,{status:'em_andamento',fase_atual:1,fase_deadline:deadline,turno_par:0,turno_deadline:deadline,fases:{1:{status:'aberta',acoes:{},log_rt:{}}}}),fbPut('/quadribol/partida_ativa',{pid:pid,status:'em_andamento'})]);}

function cancelarPartida(){if(!confirm('Cancelar a partida?'))return;Promise.all([fbPatch('/quadribol/partidas/'+pid,{status:'encerrada'}),fbDel('/quadribol/partida_ativa')]).then(function(){pid=null;clearInterval(pollTimer);renderAdminPanel();});}

// --- ADMIN TREINOS / HIST / MAESTRIA ---
function carregarAdminTreinos(){var $lista=$('#quad-adm-treinos-lista').html('<p class="quad-muted quad-center">carregando...</p>');fbGet('/quadribol/treinos/sessoes').then(function(sessoes){if(!sessoes){$lista.html('<p class="quad-muted quad-center">nenhum treino ativo.</p>');return;}$lista.empty();Object.keys(sessoes).forEach(function(sid){var s=sessoes[sid];if(!s||(s.status!=='ativa'&&s.status!=='aguardando'))return;var elapsed=s.status==='ativa'?Math.floor((Date.now()-s.inicio)/60000):0;var div=document.createElement('div');div.className='quad-adm-item';div.innerHTML='<div class="quad-adm-item-info"><div class="quad-adm-item-nome">'+s.nomeA+' x '+s.nomeB+'</div><div class="quad-adm-item-meta">'+s.duracao_h+'h '+(s.status==='ativa'?elapsed+'min':'aguardando parceiro')+'</div></div><button type="button" class="quad-btn quad-btn-danger quad-btn-sm quad-btn-interromper" data-sid="'+sid+'" data-joga="'+s.jogadorA+'" data-jogb="'+s.jogadorB+'">interromper</button>';$lista.append(div);});if(!$lista.children().length)$lista.html('<p class="quad-muted quad-center">nenhum treino ativo.</p>');$('.quad-btn-interromper').off('click').on('click',function(){var sid=$(this).data('sid');var jogA=$(this).data('joga');var jogB=$(this).data('jogb');if(!confirm('Interromper? As horas nao serao contabilizadas.'))return;Promise.all([fbPut('/quadribol/treinos/sessoes/'+sid+'/status','cancelada'),fbPatch('/quadribol/treinos/jogadores/'+jogA,{sessao_id:null}),fbPatch('/quadribol/treinos/jogadores/'+jogB,{convite_sid:null,sessao_id:null})]).then(carregarAdminTreinos);});});}

function carregarAdminHist(){var $lista=$('#quad-adm-hist-lista').html('<p class="quad-muted quad-center">carregando...</p>');fbGet('/quadribol/historico').then(function(historico){if(!historico){$lista.html('<p class="quad-muted quad-center">nenhuma partida registrada.</p>');return;}var entradas=Object.values(historico).sort(function(a,b){return b.data-a.data;});$lista.empty();entradas.forEach(function(h){var div=document.createElement('div');div.className='quad-adm-item';div.innerHTML='<div class="quad-adm-item-info"><div class="quad-adm-item-nome">'+h.nomeA+' '+h.placarA+' x '+h.placarB+' '+h.nomeB+'</div><div class="quad-adm-item-meta">'+new Date(h.data).toLocaleDateString('pt-BR')+(h.nomeVencedor?' '+h.nomeVencedor:'')+'</div></div>';$lista.append(div);});});}

function renderAdminMaestria(){var $div=$('#quad-adm-maestria').empty();var pcts=[0,5,10,15,20,25,35,40,50,60,70,80,85,90,95,100];var opts=pcts.map(function(p){return'<option value="'+p+'">'+p+'%</option>';}).join('');var espOpts=[0,1,2,3,4,5].map(function(v){return'<option value="'+v+'">'+v+'</option>';}).join('');$div.html('<div class="quad-card"><div class="quad-sec-title">definir maestria por usuario</div><div style="margin-bottom:10px;"><div class="quad-slot-label">uid</div><input type="text" id="quad-maest-uid" class="quad-input" placeholder="uid do jogador"><div id="quad-maest-nome" class="quad-slot-preview"></div></div><div style="margin-bottom:8px;"><div class="quad-slot-label">Maestria em Quadribol (%)</div><select id="quad-maest-pct" class="quad-input">'+opts+'</select></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;"><div><div class="quad-slot-label">Artilharia</div><select id="quad-maest-art" class="quad-input">'+espOpts+'</select></div><div><div class="quad-slot-label">Defesa</div><select id="quad-maest-def" class="quad-input">'+espOpts+'</select></div><div><div class="quad-slot-label">Manobras Aereas</div><select id="quad-maest-man" class="quad-input">'+espOpts+'</select></div><div><div class="quad-slot-label">Captura do Pomo</div><select id="quad-maest-pom" class="quad-input">'+espOpts+'</select></div></div><div style="display:flex;gap:8px;"><button type="button" id="quad-maest-buscar" class="quad-btn quad-btn-ghost">carregar atual</button><button type="button" id="quad-maest-salvar" class="quad-btn quad-btn-primary" style="flex:1;">salvar</button></div><div id="quad-maest-msg" class="quad-muted" style="margin-top:6px;"></div></div>');setTimeout(function(){$('#quad-maest-uid').on('blur',function(){var v=$(this).val().trim();if(!v)return;fbGet('/saldos/u'+v).then(function(d){$('#quad-maest-nome').text(d&&d.nome?d.nome:'uid nao encontrado');});});$('#quad-maest-buscar').on('click',function(){var rawUid=$('#quad-maest-uid').val().trim();if(!rawUid)return;fbGet('/maestria/u'+rawUid).then(function(m){if(!m){$('#quad-maest-msg').text('sem maestria, valores zerados.');return;}$('#quad-maest-pct').val(m.quadribol||0);$('#quad-maest-art').val(m.artilheiro||0);$('#quad-maest-def').val(m.defesa||0);$('#quad-maest-man').val(m.manobras||0);$('#quad-maest-pom').val(m.pomo||0);$('#quad-maest-msg').text('dados carregados.');});});$('#quad-maest-salvar').on('click',function(){var rawUid=$('#quad-maest-uid').val().trim();if(!rawUid){alert('Informe o uid.');return;}var dados={quadribol:parseInt($('#quad-maest-pct').val())||0,artilheiro:parseInt($('#quad-maest-art').val())||0,defesa:parseInt($('#quad-maest-def').val())||0,manobras:parseInt($('#quad-maest-man').val())||0,pomo:parseInt($('#quad-maest-pom').val())||0};fbPut('/maestria/u'+rawUid,dados).then(function(){$('#quad-maest-msg').text('maestria salva!');});});},100);}

// --- TREINO ---
function semanaAtual(){var d=new Date();var oneJan=new Date(d.getFullYear(),0,1);var week=Math.ceil(((d-oneJan)/86400000+oneJan.getDay()+1)/7);return d.getFullYear()+'-W'+String(week).padStart(2,'0');}
function getEnergiaAtual(){return fbGet('/status-perfil/'+myUid).then(function(s){return s?(s.energia_cur||0):0;});}
function deduzirEnergia(custo){return fbGet('/status-perfil/'+myUid).then(function(s){if(!s)return;return fbPatch('/status-perfil/'+myUid,{energia_cur:Math.max(0,(s.energia_cur||0)-custo)});});}
function adicionarPack(){var key='pack_maestria_'+Date.now();return fbPut('/inventario/'+myUid+'/'+key,{nome:'1 Ponto em Maestria de Quadribol',descricao:'Resgate este ponto no topico de obtencao de maestria. Obtido ao completar '+TREINO_META_H+'h de treino na semana.',quantidade:1,tipo:'pack_maestria',obtido_em:Date.now()});}

function renderTreino(){if(treinoTimer)clearInterval(treinoTimer);irPara('quad-treino');ativarNav('treino');bindNav();var semana=semanaAtual();Promise.all([fbGet('/quadribol/treinos/jogadores/'+myUid),fbGet('/quadribol/treinos/sessoes')]).then(function(r){var dados=r[0];var sessoes=r[1]||{};var horas=(dados&&dados.semana===semana)?(dados.horas_semana||0):0;var packFeito=dados&&dados.semana===semana&&!!dados.pack_resgatado;var pct=Math.min(100,(horas/TREINO_META_H)*100).toFixed(0);var faltam=Math.max(0,TREINO_META_H-horas).toFixed(1);$('#quad-tr-horas').text(horas.toFixed(1)+'h');$('#quad-tr-faltam').text(faltam+'h restantes');$('#quad-tr-bar').css('width',pct+'%').toggleClass('quad-progress-bar-ok',packFeito);$('#quad-tr-pack-msg').text(packFeito?'pack desta semana ja resgatado.':'meta: '+TREINO_META_H+'h por semana.');var $campo=$('#quad-campo-treino').empty();Object.keys(sessoes).forEach(function(sid){var s=sessoes[sid];if(!s||s.status!=='ativa')return;if(s.jogadorA===myUid||s.jogadorB===myUid)return;var elapsed=Math.floor((Date.now()-s.inicio)/60000);var hh=Math.floor(elapsed/60);var mm=elapsed%60;var tempoStr=(hh>0?hh+'h ':'')+mm+'min';var card=document.createElement('div');card.className='quad-card-treino';card.innerHTML='<div class="quad-card-treino-info"><div class="quad-card-treino-nomes">'+s.nomeA+' x '+s.nomeB+'</div><div class="quad-card-treino-meta">'+tempoStr+' treinando</div></div><button type="button" class="quad-btn quad-btn-ghost quad-btn-sm quad-btn-atrapalhar" data-sid="'+sid+'" style="color:var(--quad-tema);">atrapalhar</button>';$campo.append(card);});if(!$campo.children().length)$campo.html('<p class="quad-muted quad-center" style="padding:1rem 0;">nenhuma dupla treinando no momento.</p>');$('.quad-btn-atrapalhar').off('click').on('click',function(){var sid=$(this).data('sid');var s=sessoes[sid];if(!s)return;atrapalharTreino(sid,s,semana);});var $cont=$('#quad-treino-conteudo').empty();if(dados&&dados.sessao_id&&sessoes[dados.sessao_id]){var sid=dados.sessao_id;var sessao=sessoes[sid];if(sessao.status==='ativa'){if(Date.now()>=sessao.inicio+sessao.duracao_h*3600000){processarFimTreino(sid,sessao,dados,semana);return;}renderTreinoAtivo(sid,sessao,dados,semana,$cont);return;}if(sessao.status==='aguardando'){renderTreinoAguardando(sid,sessao,$cont);return;}fbPatch('/quadribol/treinos/jogadores/'+myUid,{convite_sid:null});}if(dados&&dados.convite_sid&&sessoes[dados.convite_sid]){var sconv=sessoes[dados.convite_sid];if(sconv.status==='aguardando'){renderTreinoConvite(dados.convite_sid,sconv,dados,semana,$cont);return;}fbPatch('/quadribol/treinos/jogadores/'+myUid,{convite_sid:null});}renderTreinoForm(dados,semana,$cont);if(treinoTimer)clearInterval(treinoTimer);treinoTimer=setInterval(function(){renderTreino();},10000);});}

function renderTreinoForm(dados,semana,$cont){var optsHtml=TREINO_OPTS_LOCAL.map(function(o,i){return'<option value="'+i+'">'+o.label+'</option>';}).join('');var div=document.createElement('div');div.className='quad-card';div.innerHTML='<div class="quad-sec-title">iniciar sessao</div><div class="quad-treino-form-grid"><div><div class="quad-slot-label">uid do parceiro</div><input type="text" id="quad-inp-parc" class="quad-input" placeholder="uid"><div id="quad-preview-parc" class="quad-slot-preview"></div></div><div><div class="quad-slot-label">duracao</div><select id="quad-sel-duracao" class="quad-input">'+optsHtml+'</select></div></div><button type="button" id="quad-btn-convidar" class="quad-btn quad-btn-accent quad-btn-full">enviar convite</button>';$cont.append(div);setTimeout(function(){$('#quad-inp-parc').on('blur',function(){var v=$(this).val().trim();if(!v)return;fbGet('/saldos/u'+v).then(function(d){$('#quad-preview-parc').text(d&&d.nome?d.nome:'uid nao encontrado');});});$('#quad-btn-convidar').on('click',function(){var parcRaw=$('#quad-inp-parc').val().trim();var idx=parseInt($('#quad-sel-duracao').val());var opcao=TREINO_OPTS_LOCAL[idx];if(!parcRaw){alert('Informe o uid do parceiro.');return;}if('u'+parcRaw===myUid){alert('Voce nao pode treinar sozinho.');return;}$(this).prop('disabled',true).text('verificando...');getEnergiaAtual().then(function(energia){if(energia<opcao.energia){alert('Energia insuficiente. Precisa de '+opcao.energia+'.');$('#quad-btn-convidar').prop('disabled',false).text('enviar convite');return;}criarSessaoTreino('u'+parcRaw,opcao);});});},100);}

function criarSessaoTreino(parcUid,opcao){var sid='tr'+Date.now();Promise.all([fbGet('/saldos/'+myUid),fbGet('/saldos/'+parcUid)]).then(function(r){var sessao={jogadorA:myUid,jogadorB:parcUid,nomeA:r[0]?r[0].nome:myUid,nomeB:r[1]?r[1].nome:parcUid,duracao_h:opcao.h,energia:opcao.energia,inicio:null,status:'aguardando',criado_em:Date.now()};Promise.all([fbPut('/quadribol/treinos/sessoes/'+sid,sessao),fbPatch('/quadribol/treinos/jogadores/'+myUid,{sessao_id:sid}),fbPatch('/quadribol/treinos/jogadores/'+parcUid,{convite_sid:sid})]).then(function(){deduzirEnergia(opcao.energia).then(function(){renderTreino();});});});}

function renderTreinoAguardando(sid,sessao,$cont){var div=document.createElement('div');div.className='quad-card quad-card-hl';div.innerHTML='<div class="quad-sec-title">aguardando parceiro</div><p style="font-size:13px;margin-bottom:6px;">convite enviado para <span class="quad-accent">'+sessao.nomeB+'</span>.</p><p class="quad-muted" style="margin-bottom:12px;">'+sessao.energia+' de energia ja foram deduzidos.</p><button type="button" id="quad-btn-cancelar-tr" class="quad-btn quad-btn-ghost quad-btn-full">cancelar convite</button>';$cont.append(div);setTimeout(function(){$('#quad-btn-cancelar-tr').on('click',function(){Promise.all([fbPut('/quadribol/treinos/sessoes/'+sid+'/status','cancelada'),fbPatch('/quadribol/treinos/jogadores/'+myUid,{sessao_id:null}),fbPatch('/quadribol/treinos/jogadores/'+sessao.jogadorB,{convite_sid:null})]).then(function(){deduzirEnergia(-sessao.energia);renderTreino();});});},100);if(treinoTimer)clearInterval(treinoTimer);treinoTimer=setInterval(function(){renderTreino();},5000);}

function renderTreinoConvite(sid,sessao,dados,semana,$cont){var opcao=TREINO_OPTS_LOCAL.find(function(o){return o.h===sessao.duracao_h;})||TREINO_OPTS_LOCAL[0];var div=document.createElement('div');div.className='quad-card quad-card-hl';div.innerHTML='<div class="quad-sec-title">convite de treino recebido</div><p class="quad-convite-texto"><span class="quad-accent">'+sessao.nomeA+'</span> quer treinar com voce.</p><p class="quad-muted" style="margin-bottom:12px;">'+sessao.duracao_h+'h custo: '+opcao.energia+' de energia.</p><div class="quad-convite-btns"><button type="button" id="quad-btn-aceitar" class="quad-btn quad-btn-accent">aceitar</button><button type="button" id="quad-btn-recusar" class="quad-btn quad-btn-ghost">recusar</button></div>';$cont.append(div);setTimeout(function(){$('#quad-btn-aceitar').on('click',function(){$(this).prop('disabled',true).text('verificando...');getEnergiaAtual().then(function(energia){if(energia<opcao.energia){alert('Energia insuficiente.');$('#quad-btn-aceitar').prop('disabled',false).text('aceitar');return;}deduzirEnergia(opcao.energia).then(function(){var agora=Date.now();Promise.all([fbPatch('/quadribol/treinos/sessoes/'+sid,{status:'ativa',inicio:agora}),fbPatch('/quadribol/treinos/jogadores/'+myUid,{sessao_id:sid,convite_sid:null})]).then(function(){renderTreino();});});});});$('#quad-btn-recusar').on('click',function(){Promise.all([fbPut('/quadribol/treinos/sessoes/'+sid+'/status','cancelada'),fbPatch('/quadribol/treinos/jogadores/'+myUid,{convite_sid:null})]).then(function(){renderTreino();});});},100);}

function renderTreinoAtivo(sid,sessao,dados,semana,$cont){var parcNome=sessao.jogadorA===myUid?sessao.nomeB:sessao.nomeA;var fimTs=sessao.inicio+sessao.duracao_h*3600000;var div=document.createElement('div');div.innerHTML='<div class="quad-card quad-card-hl"><div class="quad-sec-title">treino em andamento</div><div class="quad-treino-ativo-header"><span class="quad-accent">'+parcNome+'</span><span class="quad-badge quad-badge-pos">'+sessao.duracao_h+'h</span></div><div style="text-align:center;margin:1.5rem 0;"><div id="quad-tr-countdown" class="quad-treino-countdown">--:--:--</div><p class="quad-muted">tempo restante</p></div><div class="quad-progress-track"><div id="quad-tr-progbar" class="quad-progress-bar" style="width:0%"></div></div></div><div class="quad-card"><div class="quad-sec-title">status</div><div class="quad-status-treino-row"><input type="text" id="quad-inp-status-tr" class="quad-input" placeholder="o que voce esta praticando..." value="'+(sessao.status_msg||'')+'"><button type="button" id="quad-btn-salvar-status" class="quad-btn quad-btn-ghost">salvar</button></div></div>';$cont.append(div);function atualizarTimer(){var restMs=Math.max(0,fimTs-Date.now());var restSec=Math.floor(restMs/1000);var hh=Math.floor(restSec/3600),mm=Math.floor((restSec%3600)/60),ss=restSec%60;$('#quad-tr-countdown').text(String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0'));var pct=Math.min(100,((sessao.duracao_h*3600000-restMs)/(sessao.duracao_h*3600000))*100).toFixed(1);$('#quad-tr-progbar').css('width',pct+'%');if(restMs===0){clearInterval(treinoTimer);processarFimTreino(sid,sessao,dados,semana);}}atualizarTimer();if(treinoTimer)clearInterval(treinoTimer);treinoTimer=setInterval(atualizarTimer,1000);var campoStatus=sessao.jogadorA===myUid?'status_a':'status_b';setTimeout(function(){$('#quad-btn-salvar-status').on('click',function(){var msg=$('#quad-inp-status-tr').val().trim();var patch={};patch[campoStatus]=msg;fbPatch('/quadribol/treinos/sessoes/'+sid,patch);$(this).text('salvo!');var $b=$(this);setTimeout(function(){$b.text('salvar');},1500);});},100);}

function processarFimTreino(sid,sessao,dados,semana){var horasAntes=(dados&&dados.semana===semana)?(dados.horas_semana||0):0;var horasDepois=horasAntes+sessao.duracao_h;var packAntes=(dados&&dados.semana===semana)?!!dados.pack_resgatado:false;var packAgora=!packAntes&&horasDepois>=TREINO_META_H;var saves2=[fbPatch('/quadribol/treinos/jogadores/'+myUid,{semana:semana,horas_semana:horasDepois,pack_resgatado:packAntes||packAgora,sessao_id:null}),fbPut('/quadribol/treinos/sessoes/'+sid+'/status','concluida')];if(packAgora)saves2.push(adicionarPack());Promise.all(saves2).then(function(){var $cont=$('#quad-treino-conteudo').empty();var div=document.createElement('div');div.className='quad-card';div.style.textAlign='center';div.style.padding='2rem';div.innerHTML='<div style="font-size:32px;margin-bottom:.5rem;">v</div><h2 class="quad-titulo" style="font-size:22px;margin-bottom:.5rem;">treino concluido!</h2><p class="quad-muted" style="margin-bottom:1.5rem;">+'+sessao.duracao_h+'h registradas. '+horasDepois.toFixed(1)+'h no total esta semana.</p>'+(packAgora?'<div style="background:#1D9E7515;border:1px solid #1D9E7544;border-radius:6px;padding:1rem;margin-bottom:1.5rem;"><p style="color:#5DCAA5;font-weight:500;">Pack recebido no inventario!</p><p class="quad-muted" style="margin-top:4px;">1 Ponto em Maestria de Quadribol.</p></div>':'')+'<button type="button" id="quad-btn-novo-treino" class="quad-btn quad-btn-primary">novo treino</button>';$cont.append(div);setTimeout(function(){$('#quad-btn-novo-treino').on('click',renderTreino);},100);});}

function atrapalharTreino(sid,sessao,semana){var CUSTO=10;getEnergiaAtual().then(function(energia){if(energia<CUSTO){alert('Energia insuficiente. Precisa de '+CUSTO+' de energia.');return;}Promise.all([fbGet('/quadribol/treinos/jogadores/'+sessao.jogadorA),fbGet('/quadribol/treinos/jogadores/'+sessao.jogadorB)]).then(function(r){var dadosA=r[0]||{},dadosB=r[1]||{};var hA=(dadosA.semana===semana)?(dadosA.horas_semana||0):0;var hB=(dadosB.semana===semana)?(dadosB.horas_semana||0):0;Promise.all([deduzirEnergia(CUSTO),fbPatch('/quadribol/treinos/jogadores/'+sessao.jogadorA,{horas_semana:Math.max(0,parseFloat((hA*(1-0.02)).toFixed(2)))}),fbPatch('/quadribol/treinos/jogadores/'+sessao.jogadorB,{horas_semana:Math.max(0,parseFloat((hB*(1-0.02)).toFixed(2)))})]).then(function(){alert('Voce atrapalhou o treino! -2% das horas de cada jogador.');renderTreino();});});});}

// --- APOSTAS ---
function processarApostas(partidaId,vencedorTime){fbGet('/quadribol/apostas/'+partidaId).then(function(apostas){if(!apostas)return;Object.keys(apostas).forEach(function(uid){var a=apostas[uid];if(!a||a.status!=='pendente')return;if(a.time===vencedorTime){fbGet('/saldos/'+uid).then(function(s){if(!s)return;fbPatch('/saldos/'+uid,{saldo:(s.saldo||0)+a.valor*3});fbPut('/quadribol/apostas/'+partidaId+'/'+uid+'/status','ganhou');});}else fbPut('/quadribol/apostas/'+partidaId+'/'+uid+'/status','perdeu');});});}

// --- SOM ---
function verificarVuvuzelas(m){var sons=m.torcida_sons||{};var timestamps=Object.keys(sons).map(Number).sort();timestamps.forEach(function(ts){if(ts>lastVuvuzelaTs){lastVuvuzelaTs=ts;tocarVuvuzela();}});}
function tocarSomVez(){try{var ctx=new(window.AudioContext||window.webkitAudioContext)();var osc=ctx.createOscillator();var gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type='sine';osc.frequency.setValueAtTime(880,ctx.currentTime);osc.frequency.setValueAtTime(1100,ctx.currentTime+0.12);gain.gain.setValueAtTime(0.25,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.35);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.35);}catch(e){}}
function tocarVuvuzela(){var sons=typeof QUAD_SOM_VUVUZELA!=='undefined'&&QUAD_SOM_VUVUZELA;if(sons){var url=Array.isArray(sons)?sons[Math.floor(Math.random()*sons.length)]:sons;try{var a=new Audio(url);a.volume=0.6;a.play();}catch(e){}return;}try{var ctx=new(window.AudioContext||window.webkitAudioContext)();var osc=ctx.createOscillator();var gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.setValueAtTime(233,ctx.currentTime);gain.gain.setValueAtTime(0.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.9);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.9);}catch(e){}}

function renderAdminPanel(){irPara('quad-admin');ativarNav('admin');bindNav();var optsA=CASAS.map(function(c){return'<option>'+c+'</option>';}).join('');var optsB=CASAS.map(function(c,i){return'<option'+(i===1?' selected':'')+'>'+c+'</option>';}).join('');$('#quad-casaA').html(optsA);$('#quad-casaB').html(optsB);$('.quad-admin-tab').off('click').on('click',function(){var alvo=$(this).data('alvo');$('.quad-admin-tab').removeClass('quad-admin-tab-ativa');$(this).addClass('quad-admin-tab-ativa');$('.quad-adm-aba').attr('hidden',true);$('#'+alvo).removeAttr('hidden');if(alvo==='quad-adm-treinos')carregarAdminTreinos();if(alvo==='quad-adm-hist')carregarAdminHist();if(alvo==='quad-adm-maestria')renderAdminMaestria();if(alvo==='quad-adm-jogadores')renderAdminJogadores();});fbGet('/quadribol/jogadores').then(function(jogadores){jogadores=jogadores||{};var $sA=$('#quad-slots-a').empty();var $sB=$('#quad-slots-b').empty();POSICOES.forEach(function(pos){$sA.append(gerarSlotInput(pos,'A',jogadores));$sB.append(gerarSlotInput(pos,'B',jogadores));});bindSlotHandlers();$('#quad-btn-criar').off('click').on('click',criarPartida);});}

function gerarSlotInput(pos,time,jogadores){var opts='<option value="">— NPC —</option>';Object.keys(jogadores||{}).sort().forEach(function(uid){var j=(jogadores||{})[uid];opts+='<option value="'+uid+'">'+j.nome+'</option>';});var div=document.createElement('div');div.className='quad-slot-item';div.innerHTML='<div class="quad-slot-label">'+POS_LABEL[pos]+'</div><div class="quad-slot-controls"><select id="sel-'+time+'-'+pos+'" class="quad-input">'+opts+'</select><label class="quad-slot-check"><input type="checkbox" id="cap-'+time+'-'+pos+'" style="width:auto;"> cap</label></div>';return div;}
function renderPainelEspectador(match,$wrap){var tA=match.times.A,tB=match.times.B;var torcedores=match.torcedores||{};var minhaT=torcedores[myUid]?torcedores[myUid].time:null;var torcA=Object.values(torcedores).filter(function(td){return td.time==='A';}).map(function(td){return td.nome;}).join(', ')||'—';var torcB=Object.values(torcedores).filter(function(td){return td.time==='B';}).map(function(td){return td.nome;}).join(', ')||'—';var div=document.createElement('div');div.className='quad-card';div.innerHTML='<div class="quad-sec-title">torcida</div><div class="quad-muted" style="font-size:12px;margin-bottom:8px;">'+tA.nome+': '+torcA+'<br>'+tB.nome+': '+torcB+'</div>'+(minhaT?'<div class="quad-acao-status quad-acao-status-aguardando">torcendo por '+match.times[minhaT].nome+'!</div>':'<div style="display:flex;gap:8px;"><button type="button" class="quad-btn quad-btn-accent" style="flex:1;" id="quad-torcer-a">torcer por '+tA.nome+'</button><button type="button" class="quad-btn quad-btn-ghost" style="flex:1;" id="quad-torcer-b">torcer por '+tB.nome+'</button></div>')+'<button type="button" class="quad-btn quad-btn-ghost quad-btn-full" style="margin-top:8px;" id="quad-btn-vuvuzela">📯 vuvuzela!</button><div id="quad-vuvuzela-avisos" style="margin-top:6px;"></div>';$wrap.append(div);if(minhaT){var apostasDiv=document.createElement('div');apostasDiv.className='quad-card';apostasDiv.innerHTML='<div class="quad-sec-title">apostas</div><p class="quad-muted" style="margin-bottom:8px;">aposte Galeoes no '+match.times[minhaT].nome+'. Ganhe 3x o valor.</p><input type="number" id="quad-inp-aposta" class="quad-input" placeholder="valor em Galeoes" min="1" style="margin-bottom:8px;"><button type="button" class="quad-btn quad-btn-primary quad-btn-apostar" data-time="'+minhaT+'" style="width:100%;">apostar no '+match.times[minhaT].nome+'</button><div id="quad-aposta-msg" class="quad-muted" style="margin-top:6px;"></div>';$wrap.append(apostasDiv);}$('#quad-torcer-a').on('click',function(){torcer('A',tA.nome);});$('#quad-torcer-b').on('click',function(){torcer('B',tB.nome);});$('#quad-btn-vuvuzela').on('click',function(){var agora=Date.now();if(agora-lastVuvuzelaClick<VUVUZELA_COOLDOWN){$('#quad-vuvuzela-avisos').text('espera um pouco...');return;}lastVuvuzelaClick=agora;fbPut('/quadribol/partidas/'+pid+'/vuvuzelas/'+myUid,{uid:myUid,nome:myNome,ts:agora});});setTimeout(function(){$('.quad-btn-apostar').on('click',function(){var t=$(this).data('time');var val=parseInt($('#quad-inp-aposta').val())||0;if(val<1){$('#quad-aposta-msg').text('informe um valor valido.');return;}fbGet('/quadribol/apostas/'+pid+'/'+myUid).then(function(ex){if(ex){$('#quad-aposta-msg').text('voce ja apostou nesta partida.');return;}fbGet('/saldos/'+myUid).then(function(saldo){var atual=saldo?(saldo.saldo||0):0;if(atual<val){$('#quad-aposta-msg').text('Galeoes insuficientes.');return;}Promise.all([fbPatch('/saldos/'+myUid,{saldo:atual-val}),fbPut('/quadribol/apostas/'+pid+'/'+myUid,{time:t,valor:val,status:'pendente'})]).then(function(){$('#quad-aposta-msg').text('aposta de '+val+' Galeoes registrada!');});});});});},100);}

function iniciarPartida(){var agora=Date.now();var deadline=agora+FASE_SECS*1000;lastTurnoPar=-1;fbGet('/quadribol/partidas/'+pid).then(function(m){if(!m)return;Promise.all([fbPatch('/quadribol/partidas/'+pid,{status:'em_andamento',fase_atual:1,fase_deadline:deadline,turno_par:0,turno_deadline:deadline,fases:{1:{status:'aberta',acoes:{},log_rt:{}}}}),fbPut('/quadribol/partida_ativa',{pid:pid,status:'em_andamento'})]).then(function(){var par0=TURN_PAIRS[0]||[];var npcP=[];var todosNpc=true;par0.forEach(function(sk){var sp=sk.split('_');var t=sp[0];var pos=sp.slice(1).join('_');var sl=m.times[t]&&m.times[t].slots[pos];if(sl&&sl.uid==='npc'&&!euSouCapitaoDo(m,t)){var na=escolherAcaoNpc(pos,m,t);npcP.push(fbPut('/quadribol/partidas/'+pid+'/fases/1/acoes/'+sk,na));npcP.push(fbPut('/quadribol/partidas/'+pid+'/fases/1/log_rt/'+sk,(sl.nome||'NPC')+' agiu automaticamente.'));}else todosNpc=false;});if(npcP.length)Promise.all(npcP).then(function(){if(todosNpc)setTimeout(function(){fbGet('/quadribol/partidas/'+pid).then(function(m2){if(m2)avancarPar(m2);});},400);});});});}
function gerarSvgField(match,acoes){var playersHtml='';var nomeA=match.times.A.nome,nomeB=match.times.B.nome;['A','B'].forEach(function(t){var casaNome=t==='A'?nomeA:nomeB;POSICOES.forEach(function(pos){var sl=match.times[t].slots[pos];if(!sl)return;var key=t+'_'+pos;var xy=FIELD_POS[key]||[320,140];var x=xy[0],y=xy[1];var ehMeu=sl.uid===myUid;var agiu=!!acoes[key];var temDebuff=sl.debuff&&sl.debuff.valor;var circFill,circStroke,strokeDash;if(ehMeu){circFill='#8b44c5';circStroke='#bda6c7';strokeDash='';}else{circFill=corDaCasa(casaNome,'fill');circStroke=agiu?corDaCasa(casaNome,'stroke'):'#EF9F27';strokeDash=agiu?'':'stroke-dasharray="3,2"';}var textColor=ehMeu?'#fff':corDaCasa(casaNome,'texto');var pref=prefixoCasa(casaNome);var nomeCurto=pref+(sl.nome.length>5?sl.nome.substring(0,5):sl.nome);var posAbrev=pos==='artilheiro1'||pos==='artilheiro2'?'ART':pos==='batedor'?'BAT':pos==='goleiro'?'GOL':'APH';var badgeSvg=temDebuff?'<circle cx="14" cy="-14" r="6" fill="#E24B4A"/><text x="14" y="-11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">-2</text>':agiu?'<circle cx="14" cy="-14" r="6" fill="#1D9E75"/><text x="14" y="-11" text-anchor="middle" font-size="7" fill="#fff" font-weight="700">ok</text>':'';playersHtml+='<g transform="translate('+x+','+y+')"><circle r="19" fill="'+circFill+'" stroke="'+circStroke+'" stroke-width="'+(ehMeu?'2':'1.5')+'" '+strokeDash+'/><text y="2" text-anchor="middle" font-size="9" fill="'+textColor+'" font-weight="600">'+posAbrev+'</text><text y="12" text-anchor="middle" font-size="8" fill="'+textColor+'">'+nomeCurto+'</text>'+badgeSvg+'</g>';});});return'<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="fg" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#0f1a0a"/><stop offset="100%" stop-color="#080d06"/></radialGradient></defs><rect width="640" height="280" rx="10" fill="url(#fg)"/><ellipse cx="320" cy="140" rx="295" ry="118" fill="none" stroke="#1a3010" stroke-width="1.5"/><line x1="320" y1="22" x2="320" y2="258" stroke="#1a3010" stroke-width="1" stroke-dasharray="4,4"/><ellipse cx="320" cy="140" rx="48" ry="40" fill="none" stroke="#1a3010" stroke-width="1"/><ellipse cx="40" cy="140" rx="22" ry="50" fill="none" stroke="#1a3010" stroke-width="1.5"/><ellipse cx="600" cy="140" rx="22" ry="50" fill="none" stroke="#1a3010" stroke-width="1.5"/><g transform="translate(16,112)"><rect x="0" y="0" width="3" height="56" rx="1.5" fill="#bda6c750"/><circle cx="1.5" cy="0" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="28" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="56" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/></g><g transform="translate(621,112)"><rect x="0" y="0" width="3" height="56" rx="1.5" fill="#bda6c750"/><circle cx="1.5" cy="0" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="28" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/><circle cx="1.5" cy="56" r="7" fill="none" stroke="#bda6c750" stroke-width="1.5"/></g><text x="80" y="272" text-anchor="middle" font-size="9" fill="'+corDaCasa(nomeA,'stroke')+'88">'+nomeA.toUpperCase()+'</text><text x="560" y="272" text-anchor="middle" font-size="9" fill="'+corDaCasa(nomeB,'stroke')+'88">'+nomeB.toUpperCase()+'</text>'+playersHtml+'</svg>';}
function criarPartida(){var casaA=$('#quad-casaA').val();var casaB=$('#quad-casaB').val();if(casaA===casaB){alert('Os dois times nao podem ser da mesma casa.');return;}$('#quad-btn-criar').prop('disabled',true).text('aguarde...');var times={A:{nome:casaA,placar:0,slots:{}},B:{nome:casaB,placar:0,slots:{}}};var promises=[];function coletarSlot(t,pos){var uid=$('#sel-'+t+'-'+pos).val();var isCap=$('#cap-'+t+'-'+pos).is(':checked');if(!uid){times[t].slots[pos]=npcSlot(pos,'NPC '+POS_LABEL[pos],null);return Promise.resolve();}return fbGet('/quadribol/jogadores/'+uid).then(function(j){if(!j){times[t].slots[pos]=npcSlot(pos,'NPC',null);return;}times[t].slots[pos]={uid:j.uid||uid,nome:j.nome,posicao:pos,capitao:isCap,confirmado:false,atributos:j.atributos||{},vassoura:j.vassoura||{nome:'Vassoura Padrao de Hogwarts',bonus:1},maestria:j.maestria||{quadribol:0,artilheiro:0,defesa:0,manobras:0,pomo:0},foto:j.foto||null,debuff:null,rastreamento:0};});}POSICOES.forEach(function(pos){['A','B'].forEach(function(t){promises.push(coletarSlot(t,pos));});});Promise.all(promises).then(function(){var newPid='p'+Date.now();var pomoMin=typeof QUAD_POMO_MIN!=='undefined'?QUAD_POMO_MIN:8;var pomoMax=typeof QUAD_POMO_MAX!=='undefined'?QUAD_POMO_MAX:11;var pomoFase=pomoMin+Math.floor(Math.random()*(pomoMax-pomoMin+1));var partida={status:'aguardando',fase_atual:1,fase_deadline:null,turno_par:0,turno_deadline:null,pomo_fase:pomoFase,pomo_capturado:false,criado_em:Date.now(),times:times,fases:{}};Promise.all([fbPut('/quadribol/partidas/'+newPid,partida),fbPut('/quadribol/partida_ativa',{pid:newPid,status:'aguardando'})]).then(function(){pid=newPid;renderLobby(partida);startPoll();$('#quad-btn-criar').prop('disabled',false).text('criar partida');});});}
function renderEncerrada(match){if(countdownTimer)clearInterval(countdownTimer);irPara('quad-encerrado');ativarNav('encerrado');bindNav();var tA=match.times.A,tB=match.times.B;var v=match.vencedor;var vNome=v==='A'?tA.nome:(v==='B'?tB.nome:'Empate');$('#quad-enc-nome-a').text(tA.nome);$('#quad-enc-nome-b').text(tB.nome);$('#quad-enc-score-a').text(tA.placar).toggleClass('quad-placar-num-vencedor',v==='A');$('#quad-enc-score-b').text(tB.placar).toggleClass('quad-placar-num-vencedor',v==='B');if(match.pomo_capturado)$('#quad-enc-pomo').removeAttr('hidden');else $('#quad-enc-pomo').attr('hidden',true);$('#quad-enc-vencedor').text(vNome+' venceu!');$('#quad-enc-sub').text((v==='A'?tA.placar:tB.placar)+' x '+(v==='A'?tB.placar:tA.placar)+' contra '+(v==='A'?tB.nome:tA.nome));if(isAdmin)$('#quad-btn-enc-nova').removeAttr('hidden');else $('#quad-btn-enc-nova').attr('hidden',true);$('#quad-btn-enc-hist').off('click').on('click',renderHistorico);$('#quad-btn-enc-nova').off('click').on('click',function(){pid=null;renderAdminPanel();});var $sec=$('#quad-encerrado');$sec.find('.quad-enc-log-wrap').remove();if(match.fases){var logDiv=$('<div class="quad-enc-log-wrap quad-card" style="margin-top:12px;"><div class="quad-sec-title">log completo</div><div class="quad-log-box" style="max-height:320px;overflow-y:auto;"></div></div>');var $box=logDiv.find('.quad-log-box');Object.keys(match.fases).sort(function(a,b){return Number(a)-Number(b);}).forEach(function(f){var fo=match.fases[f];if(!fo||!fo.resultado||!fo.resultado.log)return;$box.append('<div class="quad-log-par-sep">fase '+f+'</div>');fo.resultado.log.forEach(function(e){var obj=typeof e==='string'?{text:e,type:'normal',sub:null}:e;var d=document.createElement('div');d.className='quad-log-entry'+(obj.type?' quad-log-entry-'+obj.type:'');d.innerHTML='<span class="quad-log-main">'+(obj.text||'')+'</span>'+(obj.sub?'<span class="quad-log-sub">'+obj.sub+'</span>':'');$box.append(d);});});$sec.append(logDiv);}}

function verificarVuvuzelas(match){var vuvs=match.vuvuzelas||{};var agora=Date.now();Object.keys(vuvs).forEach(function(uid){var v=vuvs[uid];if(!v||agora-v.ts>5000||v.ts<=lastVuvuzelaTs)return;lastVuvuzelaTs=v.ts;tocarVuvuzela(v.nome);fbDel('/quadribol/partidas/'+pid+'/vuvuzelas/'+uid);});}