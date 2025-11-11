// Armazenamento local dos clientes
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];

// Máscaras de input
function aplicarMascaraTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        if (value.length < 14) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        }
    }
    input.value = value;
}

function aplicarMascaraCPF(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/^(\d{3})(\d)/, '$1.$2');
    value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1-$2');
    input.value = value;
}

function aplicarMascaraCEP(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    input.value = value;
}

// Event listeners para máscaras
document.getElementById('telefone').addEventListener('input', function(e) {
    aplicarMascaraTelefone(e.target);
});

document.getElementById('cpf').addEventListener('input', function(e) {
    aplicarMascaraCPF(e.target);
});

document.getElementById('cep').addEventListener('input', function(e) {
    aplicarMascaraCEP(e.target);
});

// Função para exibir mensagem
function exibirMensagem(texto, tipo) {
    const mensagem = document.getElementById('mensagem');
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
    
    setTimeout(() => {
        mensagem.className = 'mensagem';
    }, 5000);
}

// Função para limpar formulário
function limparFormulario() {
    document.getElementById('clienteForm').reset();
    exibirMensagem('Formulário limpo com sucesso!', 'sucesso');
}

// Função para validar CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validação dos dígitos verificadores
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digito1 = 11 - (soma % 11);
    if (digito1 >= 10) digito1 = 0;
    
    if (digito1 !== parseInt(cpf.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    let digito2 = 11 - (soma % 11);
    if (digito2 >= 10) digito2 = 0;
    
    return digito2 === parseInt(cpf.charAt(10));
}

// Função para validar email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Função para cadastrar cliente
function cadastrarCliente(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const cliente = {
        id: Date.now(),
        nome: formData.get('nome'),
        email: formData.get('email'),
        telefone: formData.get('telefone'),
        cpf: formData.get('cpf'),
        dataNascimento: formData.get('dataNascimento'),
        endereco: formData.get('endereco'),
        cidade: formData.get('cidade'),
        estado: formData.get('estado'),
        cep: formData.get('cep'),
        observacoes: formData.get('observacoes') || ''
    };
    
    // Validações
    if (!validarCPF(cliente.cpf)) {
        exibirMensagem('CPF inválido! Por favor, verifique o CPF informado.', 'erro');
        return;
    }
    
    if (!validarEmail(cliente.email)) {
        exibirMensagem('E-mail inválido! Por favor, verifique o e-mail informado.', 'erro');
        return;
    }
    
    // Verificar se CPF já existe
    const cpfExistente = clientes.find(c => c.cpf.replace(/\D/g, '') === cliente.cpf.replace(/\D/g, ''));
    if (cpfExistente) {
        exibirMensagem('Este CPF já está cadastrado!', 'erro');
        return;
    }
    
    // Adicionar cliente
    clientes.push(cliente);
    localStorage.setItem('clientes', JSON.stringify(clientes));
    
    exibirMensagem('Cliente cadastrado com sucesso!', 'sucesso');
    event.target.reset();
    atualizarListaClientes();
}

// Função para remover cliente
function removerCliente(id) {
    if (confirm('Tem certeza que deseja remover este cliente?')) {
        clientes = clientes.filter(c => c.id !== id);
        localStorage.setItem('clientes', JSON.stringify(clientes));
        atualizarListaClientes();
        exibirMensagem('Cliente removido com sucesso!', 'sucesso');
    }
}

// Função para formatar data
function formatarData(data) {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
}

// Função para atualizar lista de clientes
function atualizarListaClientes() {
    const listaClientes = document.getElementById('listaClientes');
    
    if (clientes.length === 0) {
        listaClientes.innerHTML = '<p class="sem-clientes">Nenhum cliente cadastrado ainda.</p>';
        return;
    }
    
    listaClientes.innerHTML = clientes.map(cliente => `
        <div class="cliente-card">
            <h3>${cliente.nome}</h3>
            <div class="cliente-info">
                <p><strong>E-mail:</strong> ${cliente.email}</p>
                <p><strong>Telefone:</strong> ${cliente.telefone}</p>
                <p><strong>CPF:</strong> ${cliente.cpf}</p>
                <p><strong>Nascimento:</strong> ${formatarData(cliente.dataNascimento)}</p>
                <p><strong>Endereço:</strong> ${cliente.endereco}</p>
                <p><strong>Cidade/UF:</strong> ${cliente.cidade} - ${cliente.estado}</p>
                <p><strong>CEP:</strong> ${cliente.cep}</p>
                ${cliente.observacoes ? `<p><strong>Observações:</strong> ${cliente.observacoes}</p>` : ''}
            </div>
            <button class="btn-remover" onclick="removerCliente(${cliente.id})">Remover Cliente</button>
        </div>
    `).join('');
}

// Event listeners
document.getElementById('clienteForm').addEventListener('submit', cadastrarCliente);
document.getElementById('btnLimpar').addEventListener('click', limparFormulario);

// Carregar clientes ao carregar a página
atualizarListaClientes();

