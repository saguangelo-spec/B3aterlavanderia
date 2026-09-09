let osList = [];
let clientesList = [];
let estoqueList = [];
let empresaId = null;
let unsubOS, unsubClientes, unsubEstoque;

function slugEmail(nome){
  return nome.toLowerCase().trim().replace(/[^a-z0-9]/g,'') + '@lavanderiapro.app';
}

function mostrarCadastro(){
  document.getElementById('area-login').classList.add('hidden');
  document.getElementById('area-cadastro').classList.remove('hidden');
}
function mostrarLogin(){
  document.getElementById('area-cadastro').classList.add('hidden');
  document.getElementById('area-login').classList.remove('hidden');
}

function iniciar(){
  firebase.auth().onAuthStateChanged((user) => {
    if(user){
      empresaId = user.uid;
      entrarNoApp();
    } else {
      document.getElementById('tela-login').classList.remove('hidden');
      document.getElementById('tela-app').classList.add('hidden');
    }
  });
}

function cadastrarEmpresa(){
  const nome = document.getElementById('cad-nome').value.trim();
  const senha = document.getElementById('cad-senha').value.trim();
  if(!nome || !senha){ alert('Preencha nome e senha.'); return; }
  if(senha.length < 6){ alert('A senha precisa ter no mínimo 6 caracteres.'); return; }
  const email = slugEmail(nome);
  firebase.auth().createUserWithEmailAndPassword(email, senha)
    .then((cred) => firebase.firestore().collection('empresas').doc(cred.user.uid).set({ nome, criadoEm: Date.now() }))
    .catch((err) => {
      if(err.code === 'auth/email-already-in-use'){
        alert('Esse nome de empresa já está cadastrado. Use a tela de login.');
      } else {
        alert('Erro ao criar acesso: ' + err.message);
      }
    });
}

function fazerLogin(){
  const nome = document.getElementById('login-nome').value.trim();
  const senha = document.getElementById('login-senha').value.trim();
  const erro = document.getElementById('erro-login');
  const email = slugEmail(nome);
  erro.classList.add('hidden');
  firebase.auth().signInWithEmailAndPassword(email, senha)
    .catch(() => {
      erro.textContent = 'Nome ou senha incorretos.';
      erro.classList.remove('hidden');
    });
}

function sair(){
  if(unsubOS) unsubOS();
  if(unsubClientes) unsubClientes();
  if(unsubEstoque) unsubEstoque();
  firebase.auth().signOut();
  fecharMenu();
}

function entrarNoApp(){
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('tela-app').classList.remove('hidden');
  escutarDados();
}

function escutarDados(){
  const db = firebase.firestore();
  const ref = db.collection('empresas').doc(empresaId);

  unsubOS = ref.collection('os').onSnapshot((snap) => {
    osList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPainel(); renderOS();
  });

  unsubClientes = ref.collection('clientes').onSnapshot((snap) => {
    clientesList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClientes();
  });

  unsubEstoque = ref.collection('estoque').onSnapshot((snap) => {
    estoqueList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderEstoque(); renderPainel();
  });
}

function abrirMenu(){ document.getElementById('menu-lateral').classList.remove('hidden'); }
function fecharMenu(){ document.getElementById('menu-lateral').classList.add('hidden'); }

function mudarAba(nome){
  document.querySelectorAll('.secao').forEach(s => s.classList.add('hidden'));
  document.getElementById('secao-' + nome).classList.remove('hidden');
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('ativo'));
  document.querySelector(`.tab-item[data-secao="${nome}"]`).classList.add('ativo');
}

function badgeStatus(status){
  const map = { 'Pendente':'badge-pendente', 'Em andamento':'badge-andamento', 'Concluído':'badge-concluido', 'Entregue':'badge-entregue' };
  return `<span class="badge ${map[status]||''}">${status}</span>`;
}

function renderPainel(){
  document.getElementById('num-total').textContent = osList.length;
  document.getElementById('num-pendente').textContent = osList.filter(o=>o.status==='Pendente').length;
  document.getElementById('num-andamento').textContent = osList.filter(o=>o.status==='Em andamento').length;
  document.getElementById('num-concluido').textContent = osList.filter(o=>o.status==='Concluído' || o.status==='Entregue').length;

  const baixo = estoqueList.filter(i => Number(i.quantidade) <= Number(i.minimo));
  const alerta = document.getElementById('alerta-estoque');
  if(baixo.length){
    alerta.classList.remove('hidden');
    alerta.textContent = `⚠️ ${baixo.length} item(ns) com estoque baixo: ${baixo.map(i=>i.nome).join(', ')}`;
  } else {
    alerta.classList.add('hidden');
  }

  const recentes = [...osList].sort((a,b)=> b.criadoEm - a.criadoEm).slice(0,3);
  const box = document.getElementById('lista-recentes');
  box.innerHTML = recentes.length ? recentes.map(o => `
    <div class="item-card">
      <div class="item-topo">
        <div>
          <div class="item-titulo">${o.item} — ${o.cliente}</div>
          <div class="item-sub">${o.descricao || ''}</div>
        </div>
        ${badgeStatus(o.status)}
      </div>
    </div>
  `).join('') : '<div class="vazio">Nenhuma ordem de serviço ainda.</div>';
}

function renderOS(){
  const filtro = document.getElementById('filtro-status').value;
  const lista = osList.filter(o => !filtro || o.status === filtro).sort((a,b)=> b.criadoEm - a.criadoEm);
  const box = document.getElementById('lista-os');
  box.innerHTML = lista.length ? lista.map(o => `
    <div class="item-card">
      <div class="item-topo">
        <div>
          <div class="item-titulo">${o.item} — ${o.cliente}</div>
          <div class="item-sub">${o.descricao || ''} ${o.valor ? '• R$ ' + Number(o.valor).toFixed(2) : ''}</div>
          <div class="item-sub">${new Date(o.criadoEm).toLocaleDateString('pt-BR')}</div>
        </div>
        ${badgeStatus(o.status)}
      </div>
      <div class="item-acoes">
        <button onclick="avancarStatus('${o.id}')">Avançar status</button>
        <button onclick="abrirModalOS('${o.id}')">Editar</button>
        <button class="excluir" onclick="excluirOS('${o.id}')">Excluir</button>
      </div>
    </div>
  `).join('') : '<div class="vazio">Nenhuma ordem encontrada.</div>';
}

function refOS(){ return firebase.firestore().collection('empresas').doc(empresaId).collection('os'); }
function refClientes(){ return firebase.firestore().collection('empresas').doc(empresaId).collection('clientes'); }
function refEstoque(){ return firebase.firestore().collection('empresas').doc(empresaId).collection('estoque'); }

function avancarStatus(id){
  const ordem = ['Pendente','Em andamento','Concluído','Entregue'];
  const os = osList.find(o=>o.id===id);
  const idx = ordem.indexOf(os.status);
  if(idx < ordem.length - 1){ refOS().doc(id).update({ status: ordem[idx+1] }); }
}

function excluirOS(id){
  if(!confirm('Excluir esta ordem de serviço?')) return;
  refOS().doc(id).delete();
}

function abrirModalOS(id){
  const editando = osList.find(o=>o.id===id);
  const opcoesClientes = clientesList.map(c=>`<option value="${c.nome}" ${editando&&editando.cliente===c.nome?'selected':''}>${c.nome}</option>`).join('');
  document.getElementById('modal-caixa').innerHTML = `
    <h3>${editando ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}</h3>
    <label>Cliente</label>
    <select id="os-cliente"><option value="">Selecione ou digite abaixo</option>${opcoesClientes}</select>
    <label>Ou novo cliente (nome)</label>
    <input id="os-cliente-novo" placeholder="Nome do cliente">
    <label>Item</label>
    <select id="os-item">
      <option ${editando&&editando.item==='Tênis'?'selected':''}>Tênis</option>
      <option ${editando&&editando.item==='Bolsa'?'selected':''}>Bolsa</option>
      <option ${editando&&editando.item==='Boné'?'selected':''}>Boné</option>
      <option ${editando&&editando.item==='Outro'?'selected':''}>Outro</option>
    </select>
    <label>Descrição do serviço</label>
    <textarea id="os-descricao" rows="3">${editando?editando.descricao||'':''}</textarea>
    <label>Valor (R$)</label>
    <input id="os-valor" type="number" step="0.01" value="${editando?editando.valor||'':''}">
    <label>Status</label>
    <select id="os-status">
      <option ${editando&&editando.status==='Pendente'?'selected':''}>Pendente</option>
      <option ${editando&&editando.status==='Em andamento'?'selected':''}>Em andamento</option>
      <option ${editando&&editando.status==='Concluído'?'selected':''}>Concluído</option>
      <option ${editando&&editando.status==='Entregue'?'selected':''}>Entregue</option>
    </select>
    <div class="modal-acoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primario" onclick="salvarOS('${id||''}')">Salvar</button>
    </div>
  `;
  abrirModal();
}

function salvarOS(id){
  const clienteSelect = document.getElementById('os-cliente').value;
  const clienteNovo = document.getElementById('os-cliente-novo').value.trim();
  const cliente = clienteNovo || clienteSelect;
  if(!cliente){ alert('Informe o cliente.'); return; }

  if(clienteNovo && !clientesList.find(c=>c.nome===clienteNovo)){
    refClientes().add({ nome: clienteNovo, telefone: '', criadoEm: Date.now() });
  }

  const dados = {
    cliente,
    item: document.getElementById('os-item').value,
    descricao: document.getElementById('os-descricao').value.trim(),
    valor: document.getElementById('os-valor').value,
    status: document.getElementById('os-status').value
  };

  if(id){
    refOS().doc(id).update(dados);
  } else {
    refOS().add({ ...dados, criadoEm: Date.now() });
  }
  fecharModal();
}

function renderClientes(){
  const box = document.getElementById('lista-clientes');
  box.innerHTML = clientesList.length ? [...clientesList].sort((a,b)=>a.nome.localeCompare(b.nome)).map(c => `
    <div class="item-card">
      <div class="item-topo">
        <div>
          <div class="item-titulo">${c.nome}</div>
          <div class="item-sub">${c.telefone || 'Sem telefone cadastrado'}</div>
        </div>
      </div>
      <div class="item-acoes">
        <button onclick="abrirModalCliente('${c.id}')">Editar</button>
        <button class="excluir" onclick="excluirCliente('${c.id}')">Excluir</button>
      </div>
    </div>
  `).join('') : '<div class="vazio">Nenhum cliente cadastrado.</div>';
}

function abrirModalCliente(id){
  const editando = clientesList.find(c=>c.id===id);
  document.getElementById('modal-caixa').innerHTML = `
    <h3>${editando ? 'Editar cliente' : 'Novo cliente'}</h3>
    <label>Nome</label>
    <input id="cli-nome" value="${editando?editando.nome:''}">
    <label>Telefone</label>
    <input id="cli-telefone" value="${editando?editando.telefone||'':''}">
    <div class="modal-acoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primario" onclick="salvarCliente('${id||''}')">Salvar</button>
    </div>
  `;
  abrirModal();
}

function salvarCliente(id){
  const nome = document.getElementById('cli-nome').value.trim();
  if(!nome){ alert('Informe o nome.'); return; }
  const telefone = document.getElementById('cli-telefone').value.trim();
  if(id){
    refClientes().doc(id).update({ nome, telefone });
  } else {
    refClientes().add({ nome, telefone, criadoEm: Date.now() });
  }
  fecharModal();
}

function excluirCliente(id){
  if(!confirm('Excluir este cliente?')) return;
  refClientes().doc(id).delete();
}

function renderEstoque(){
  const box = document.getElementById('lista-estoque');
  box.innerHTML = estoqueList.length ? estoqueList.map(i => {
    const baixo = Number(i.quantidade) <= Number(i.minimo);
    return `
    <div class="item-card">
      <div class="item-topo">
        <div>
          <div class="item-titulo">${i.nome}</div>
          <div class="item-sub">Qtd: ${i.quantidade} • Mínimo: ${i.minimo}</div>
        </div>
        ${baixo ? '<span class="badge badge-baixo">Estoque baixo</span>' : ''}
      </div>
      <div class="item-acoes">
        <button onclick="abrirModalEstoque('${i.id}')">Editar</button>
        <button class="excluir" onclick="excluirEstoque('${i.id}')">Excluir</button>
      </div>
    </div>`;
  }).join('') : '<div class="vazio">Nenhum item no estoque.</div>';
}

function abrirModalEstoque(id){
  const editando = estoqueList.find(i=>i.id===id);
  document.getElementById('modal-caixa').innerHTML = `
    <h3>${editando ? 'Editar item' : 'Novo item de estoque'}</h3>
    <label>Nome do produto</label>
    <input id="est-nome" value="${editando?editando.nome:''}">
    <label>Quantidade</label>
    <input id="est-qtd" type="number" value="${editando?editando.quantidade:''}">
    <label>Quantidade mínima (alerta)</label>
    <input id="est-min" type="number" value="${editando?editando.minimo:''}">
    <div class="modal-acoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primario" onclick="salvarEstoque('${id||''}')">Salvar</button>
    </div>
  `;
  abrirModal();
}

function salvarEstoque(id){
  const nome = document.getElementById('est-nome').value.trim();
  if(!nome){ alert('Informe o nome do produto.'); return; }
  const quantidade = document.getElementById('est-qtd').value || 0;
  const minimo = document.getElementById('est-min').value || 0;
  if(id){
    refEstoque().doc(id).update({ nome, quantidade, minimo });
  } else {
    refEstoque().add({ nome, quantidade, minimo, criadoEm: Date.now() });
  }
  fecharModal();
}

function excluirEstoque(id){
  if(!confirm('Excluir este item?')) return;
  refEstoque().doc(id).delete();
}

function abrirModal(){ document.getElementById('modal-fundo').classList.remove('hidden'); }
function fecharModal(){ document.getElementById('modal-fundo').classList.add('hidden'); }
function fecharModalFora(e){ if(e.target.id === 'modal-fundo') fecharModal(); }

function exportarBackup(){
  const dados = { osList, clientesList, estoqueList, exportadoEm: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lavanderia-pro-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importarBackup(evento){
  const arquivo = evento.target.files[0];
  if(!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    try{
      const dados = JSON.parse(leitor.result);
      if(!confirm('Isso vai ADICIONAR os itens do backup aos dados atuais da nuvem. Continuar?')) return;
      (dados.osList||[]).forEach(o => { const { id, ...resto } = o; refOS().add(resto); });
      (dados.clientesList||[]).forEach(c => { const { id, ...resto } = c; refClientes().add(resto); });
      (dados.estoqueList||[]).forEach(i => { const { id, ...resto } = i; refEstoque().add(resto); });
      fecharMenu();
      alert('Backup importado com sucesso.');
    } catch(err){
      alert('Arquivo de backup inválido.');
    }
  };
  leitor.readAsText(arquivo);
}

let promptInstalacao;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalacao = e;
  document.getElementById('btn-instalar').style.display = 'block';
});

function instalarApp(){
  if(!promptInstalacao) return;
  promptInstalacao.prompt();
  promptInstalacao.userChoice.then(() => { promptInstalacao = null; });
}

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

iniciar();