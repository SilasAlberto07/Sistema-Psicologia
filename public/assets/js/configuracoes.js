// ================================
// CONFIGURAÇÕES — Atualizações
// ================================
// As janelas de aviso ("já está atualizado", "nova versão disponível",
// barra de download etc.) são abertas pelo próprio programa (main.js).

const campoVersao = document.getElementById("versao-app");
const btnVerificar = document.getElementById("btnVerificarAtualizacao");

// Mostra a versão instalada
if (window.atualizacao) {
    window.atualizacao.versao()
        .then(versao => { campoVersao.textContent = versao; })
        .catch(() => { campoVersao.textContent = "desconhecida"; });
} else {
    campoVersao.textContent = "indisponível";
    btnVerificar.disabled = true;
}

// No Mac a atualização é manual (o macOS exige assinatura paga da Apple
// para o app se atualizar sozinho), então escondemos o botão lá.
if (window.atualizacao && window.atualizacao.plataforma === "darwin") {
    document.getElementById("texto-atualizacao").textContent =
        "No Mac, as atualizações são instaladas manualmente: " +
        "feche o programa e abra o instalador .pkg da nova versão. " +
        "Ele substitui a versão antiga e seus dados continuam salvos.";
    document.getElementById("botoes-atualizacao").style.display = "none";
}

btnVerificar.addEventListener("click", async () => {
    if (!window.atualizacao || btnVerificar.classList.contains("verificando")) return;

    const textoOriginal = btnVerificar.innerHTML;
    btnVerificar.classList.add("verificando");
    btnVerificar.innerHTML = '<i class="ti ti-refresh"></i> Verificando...';

    try {
        await window.atualizacao.verificar();
    } catch (erro) {
        mostrarMensagem("Não foi possível verificar se há atualizações.", "error");
    } finally {
        btnVerificar.classList.remove("verificando");
        btnVerificar.innerHTML = textoOriginal;
    }
});


// ================================
// CONFIGURAÇÕES — Trocar senha
// ================================
// A conferência da senha é feita no processo principal (app/auth.js)
const campoSenhaAtual = document.getElementById("senhaAtual");
const campoSenhaNova = document.getElementById("senhaNovaTroca");
const campoConfirmar = document.getElementById("confirmarNovaTroca");
const erroSenha = document.getElementById("mensagem-erro-troca");
const btnSalvarSenha = document.getElementById("btnSalvarSenha");

function mostrarErroSenha(texto) {
    erroSenha.textContent = texto;
    erroSenha.style.display = "block";
}

async function trocarSenha() {
    erroSenha.style.display = "none";

    const resultado = await window.auth.trocar(
        campoSenhaAtual.value,
        campoSenhaNova.value,
        campoConfirmar.value
    );

    if (!resultado.ok) {
        mostrarErroSenha(resultado.erro);
        return;
    }

    campoSenhaAtual.value = "";
    campoSenhaNova.value = "";
    campoConfirmar.value = "";

    mostrarMensagem("Senha alterada com sucesso!", "success");
}

btnSalvarSenha.addEventListener("click", trocarSenha);

// Enter em qualquer campo de senha também salva
[campoSenhaAtual, campoSenhaNova, campoConfirmar].forEach(campo => {
    campo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") trocarSenha();
    });
});


// ================================
// CONFIGURAÇÕES — Sincronização entre computadores
// ================================
const syncEls = {
    bolinha: document.getElementById("syncBolinha"),
    texto: document.getElementById("syncStatusTexto"),
    detalhes: document.getElementById("syncDetalhes"),
    este: document.getElementById("syncEste"),
    pasta: document.getElementById("syncPasta"),
    outros: document.getElementById("syncOutros"),
    ultima: document.getElementById("syncUltima"),
    erro: document.getElementById("syncErro"),
    btnGoogle: document.getElementById("btnSyncGoogleDrive"),
    btnEscolher: document.getElementById("btnSyncEscolher"),
    btnAgora: document.getElementById("btnSyncAgora"),
    btnDesativar: document.getElementById("btnSyncDesativar"),
};

function tempoAtras(iso) {
    if (!iso) return "nunca";
    const segundos = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (segundos < 60) return "agora há pouco";
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `há ${horas} h`;
    return new Date(iso).toLocaleString("pt-BR");
}

function mostrarStatusSync(st) {
    if (!st || st.indisponivel) {
        syncEls.bolinha.className = "sync-bolinha erro";
        syncEls.texto.textContent = "Sincronização indisponível neste computador.";
        document.getElementById("syncBotoes").style.display = "none";
        return;
    }

    syncEls.erro.style.display = st.ultimoErro ? "block" : "none";
    syncEls.erro.textContent = st.ultimoErro || "";

    if (!st.ativa) {
        syncEls.bolinha.className = "sync-bolinha";
        syncEls.texto.textContent = "Desativada";
        syncEls.detalhes.style.display = "none";
        syncEls.btnGoogle.style.display = st.pastaSugerida ? "" : "none";
        syncEls.btnEscolher.style.display = "";
        syncEls.btnAgora.style.display = "none";
        syncEls.btnDesativar.style.display = "none";
        return;
    }

    syncEls.bolinha.className = "sync-bolinha " +
        (st.ultimoErro ? "erro" : st.sincronizando ? "trabalhando" : "ativa");
    syncEls.texto.textContent = st.ultimoErro ? "Ativa, com problema"
        : st.sincronizando ? "Sincronizando..." : "Ativa";

    syncEls.detalhes.style.display = "";
    syncEls.este.textContent = st.esteComputador;
    syncEls.pasta.textContent = st.pasta;
    syncEls.outros.innerHTML = st.outrosComputadores.length
        ? st.outrosComputadores.map(o =>
            `${o.nome} <span style="color:#9a9a88">(atualizado ${tempoAtras(o.atualizadoEm)})</span>`).join("<br>")
        : '<span style="color:#9a9a88">Nenhum ainda. Ative a sincronização no outro computador usando a mesma pasta.</span>';
    syncEls.ultima.textContent = tempoAtras(st.ultimaRecepcao);

    syncEls.btnGoogle.style.display = "none";
    syncEls.btnEscolher.style.display = "none";
    syncEls.btnAgora.style.display = "";
    syncEls.btnDesativar.style.display = "";
}

async function executarSync(acao, botao) {
    if (!window.sincronizacao) return;
    const original = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = '<i class="ti ti-loader-2"></i> Aguarde...';
    try {
        mostrarStatusSync(await acao());
    } catch (e) {
        mostrarMensagem("Não foi possível concluir a sincronização.", "error");
    } finally {
        botao.disabled = false;
        botao.innerHTML = original;
    }
}

if (window.sincronizacao) {
    window.sincronizacao.status().then(mostrarStatusSync);
    setInterval(() => window.sincronizacao.status().then(mostrarStatusSync), 5000);

    syncEls.btnGoogle.addEventListener("click", () =>
        executarSync(() => window.sincronizacao.usarPastaSugerida(), syncEls.btnGoogle));

    syncEls.btnEscolher.addEventListener("click", () =>
        executarSync(() => window.sincronizacao.escolherPasta(), syncEls.btnEscolher));

    syncEls.btnAgora.addEventListener("click", () =>
        executarSync(() => window.sincronizacao.sincronizarAgora(), syncEls.btnAgora));

    syncEls.btnDesativar.addEventListener("click", async () => {
        const resposta = await mostrarConfirmacao(
            "Desativar a sincronização? Os dados deste computador continuam aqui, mas deixam de ser enviados e recebidos."
        );
        if (resposta.isConfirmed) {
            executarSync(() => window.sincronizacao.desativar(), syncEls.btnDesativar);
        }
    });
} else {
    mostrarStatusSync(null);
}


// ================================
// CONFIGURAÇÕES — Senha do backup
// ================================
// A senha fica no cofre do sistema (app/senhaBackup.js). Esta tela só
// mostra se ela existe e, se faltar, deixa digitar. Nunca mostra a senha.
const senhaBackupEls = {
    bolinha: document.getElementById("senhaBackupBolinha"),
    texto: document.getElementById("senhaBackupTexto"),
    form: document.getElementById("senhaBackupForm"),
    nova: document.getElementById("senhaBackupNova"),
    confirmar: document.getElementById("senhaBackupConfirmar"),
    erro: document.getElementById("mensagem-erro-senha-backup"),
    btnSalvar: document.getElementById("btnSalvarSenhaBackup"),

    // trocar a senha
    blocoBotaoTrocar: document.getElementById("senhaBackupBotaoTrocar"),
    btnMostrarTroca: document.getElementById("btnMostrarTrocaSenhaBackup"),
    formTroca: document.getElementById("senhaBackupTrocaForm"),
    login: document.getElementById("senhaBackupLogin"),
    trocaNova: document.getElementById("senhaBackupTrocaNova"),
    trocaConfirmar: document.getElementById("senhaBackupTrocaConfirmar"),
    erroTroca: document.getElementById("mensagem-erro-troca-senha-backup"),
    btnSalvarTroca: document.getElementById("btnSalvarTrocaSenhaBackup"),
    btnCancelarTroca: document.getElementById("btnCancelarTrocaSenhaBackup"),
};

function mostrarFormTroca(mostrar) {
    senhaBackupEls.formTroca.style.display = mostrar ? "" : "none";
    senhaBackupEls.blocoBotaoTrocar.style.display = mostrar ? "none" : "";
    senhaBackupEls.erroTroca.style.display = "none";
    if (!mostrar) {
        senhaBackupEls.login.value = "";
        senhaBackupEls.trocaNova.value = "";
        senhaBackupEls.trocaConfirmar.value = "";
    } else {
        senhaBackupEls.login.focus();
    }
}

async function atualizarStatusSenhaBackup() {
    const st = window.senhaBackup ? await window.senhaBackup.status() : null;

    if (!st) {
        senhaBackupEls.bolinha.className = "sync-bolinha erro";
        senhaBackupEls.texto.textContent = "Indisponível";
        senhaBackupEls.form.style.display = "none";
        senhaBackupEls.blocoBotaoTrocar.style.display = "none";
        senhaBackupEls.formTroca.style.display = "none";
        return;
    }

    if (st.configurada) {
        senhaBackupEls.form.style.display = "none";

        if (st.senhaDiferenteDoOutro) {
            senhaBackupEls.bolinha.className = "sync-bolinha erro";
            senhaBackupEls.texto.textContent =
                "O outro computador está usando outra senha (ela pode ter sido trocada lá). " +
                "Clique em \"Trocar senha do backup\" e digite a mesma senha do outro computador.";
        } else {
            senhaBackupEls.bolinha.className = "sync-bolinha ativa";
            senhaBackupEls.texto.textContent = "Configurada neste computador";
        }

        // não esconde o formulário de troca se a pessoa já está digitando nele
        if (senhaBackupEls.formTroca.style.display === "none") {
            senhaBackupEls.blocoBotaoTrocar.style.display = st.cofreDisponivel ? "" : "none";
        }
        return;
    }

    senhaBackupEls.blocoBotaoTrocar.style.display = "none";
    senhaBackupEls.formTroca.style.display = "none";
    senhaBackupEls.bolinha.className = "sync-bolinha erro";
    senhaBackupEls.texto.textContent = st.cofreDisponivel
        ? "Não configurada: os backups estão parados até a senha ser digitada"
        : "O cofre de senhas deste computador não está disponível";
    senhaBackupEls.form.style.display = st.cofreDisponivel ? "" : "none";
}

// Primeira vez neste computador: o sistema confere com o outro computador ANTES de salvar
async function salvarSenhaBackup() {
    senhaBackupEls.erro.style.display = "none";

    const original = senhaBackupEls.btnSalvar.innerHTML;
    senhaBackupEls.btnSalvar.disabled = true;
    senhaBackupEls.btnSalvar.innerHTML = '<i class="ti ti-loader-2 config-girando"></i> Conferindo...';

    let resultado;
    try {
        resultado = await window.senhaBackup.definir(
            senhaBackupEls.nova.value,
            senhaBackupEls.confirmar.value
        );
    } catch (e) {
        resultado = { ok: false, erro: "Não foi possível salvar a senha do backup." };
    } finally {
        senhaBackupEls.btnSalvar.disabled = false;
        senhaBackupEls.btnSalvar.innerHTML = original;
    }

    if (!resultado.ok) {
        senhaBackupEls.erro.textContent = resultado.erro;
        senhaBackupEls.erro.style.display = "block";
        return;
    }

    senhaBackupEls.nova.value = "";
    senhaBackupEls.confirmar.value = "";
    await atualizarStatusSenhaBackup();

    mostrarMensagem(
        resultado.conferida
            ? "Senha conferida: é a mesma do outro computador. Senha do backup salva!"
            : "Senha do backup salva! (Ainda não há outro computador na sincronização para conferir.)",
        "success"
    );
}

// Trocar a senha (ou igualar com a senha nova do outro computador)
async function trocarSenhaBackup() {
    senhaBackupEls.erroTroca.style.display = "none";

    const original = senhaBackupEls.btnSalvarTroca.innerHTML;
    senhaBackupEls.btnSalvarTroca.disabled = true;
    senhaBackupEls.btnSalvarTroca.innerHTML = '<i class="ti ti-loader-2 config-girando"></i> Conferindo...';

    let resultado;
    try {
        resultado = await window.senhaBackup.trocar(
            senhaBackupEls.login.value,
            senhaBackupEls.trocaNova.value,
            senhaBackupEls.trocaConfirmar.value
        );
    } catch (e) {
        resultado = { ok: false, erro: "Não foi possível trocar a senha do backup." };
    } finally {
        senhaBackupEls.btnSalvarTroca.disabled = false;
        senhaBackupEls.btnSalvarTroca.innerHTML = original;
    }

    if (!resultado.ok) {
        senhaBackupEls.erroTroca.textContent = resultado.erro;
        senhaBackupEls.erroTroca.style.display = "block";
        return;
    }

    mostrarFormTroca(false);
    await atualizarStatusSenhaBackup();
    if (typeof atualizarStatusBackup === "function") atualizarStatusBackup();

    if (resultado.modo === "igualar") {
        mostrarMensagem(
            "Senha atualizada! Agora ela é a mesma do outro computador e a sincronização voltou a funcionar.",
            "success"
        );
    } else if (resultado.temOutroComputador) {
        Swal.fire({
            icon: "success",
            title: "Senha do backup trocada!",
            html:
                "<p><strong>Agora faça o mesmo no outro computador:</strong> abra Configurações → " +
                "Senha do backup → <em>Trocar senha do backup</em> e digite esta mesma senha nova.</p>" +
                "<p style='margin-top:10px'>Até lá, a sincronização entre os dois fica pausada. " +
                "Nenhum dado é perdido: tudo é enviado assim que o outro computador for atualizado.</p>",
            confirmButtonText: "Entendi",
        });
    } else {
        mostrarMensagem("Senha do backup trocada! Os backups antigos continuam podendo ser restaurados.", "success");
    }
}

senhaBackupEls.btnSalvar.addEventListener("click", salvarSenhaBackup);
senhaBackupEls.btnMostrarTroca.addEventListener("click", () => mostrarFormTroca(true));
senhaBackupEls.btnCancelarTroca.addEventListener("click", () => mostrarFormTroca(false));
senhaBackupEls.btnSalvarTroca.addEventListener("click", trocarSenhaBackup);
[senhaBackupEls.login, senhaBackupEls.trocaNova, senhaBackupEls.trocaConfirmar].forEach((campo) => {
    campo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") trocarSenhaBackup();
    });
});
atualizarStatusSenhaBackup();


// ================================
// CONFIGURAÇÕES — Backup e restauração
// ================================
// Quem faz o backup e a restauração é o processo principal (main.js).
// Restaurar NUNCA apaga dados: o que está no backup volta, o que foi
// cadastrado depois continua, e antes de tudo é feita uma cópia de segurança.
const backupEls = {
    bolinha: document.getElementById("backupBolinha"),
    texto: document.getElementById("backupStatusTexto"),
    btnAgora: document.getElementById("btnBackupAgora"),
    btnRestaurar: document.getElementById("btnAbrirRestaurar"),
    btnPasta: document.getElementById("btnAbrirPastaBackup"),
    janela: document.getElementById("janelaRestaurar"),
    lista: document.getElementById("listaBackups"),
    btnFechar: document.getElementById("btnFecharRestaurar"),
    btnArquivo: document.getElementById("btnEscolherArquivoBackup"),
};

function escaparTexto(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function dataBackupPorExtenso(iso) {
    const d = new Date(iso);
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === hoje.toDateString()) return `Hoje às ${hora}`;
    if (d.toDateString() === ontem.toDateString()) return `Ontem às ${hora}`;
    return `${d.toLocaleDateString("pt-BR")} às ${hora}`;
}

function tamanhoLegivel(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

let backupsConhecidos = [];

async function atualizarStatusBackup() {
    if (!window.backup) {
        backupEls.bolinha.className = "sync-bolinha erro";
        backupEls.texto.textContent = "Indisponível neste computador";
        [backupEls.btnAgora, backupEls.btnRestaurar, backupEls.btnPasta].forEach(b => b.disabled = true);
        return;
    }

    const info = await window.backup.listar();
    if (!info) return;

    backupsConhecidos = info.backups;
    const automaticos = info.backups.filter(b => b.tipo === "automatico");

    if (!info.senhaConfigurada) {
        backupEls.bolinha.className = "sync-bolinha erro";
        backupEls.texto.textContent = "Backups parados: configure a senha do backup abaixo";
    } else if (!info.backups.length) {
        backupEls.bolinha.className = "sync-bolinha erro";
        backupEls.texto.textContent = "Nenhum backup encontrado ainda";
    } else {
        const ultimo = info.backups[0];
        backupEls.bolinha.className = "sync-bolinha ativa";
        backupEls.texto.textContent =
            `Último backup: ${dataBackupPorExtenso(ultimo.data).toLowerCase()} · ${automaticos.length} guardado(s)`;
    }
}

function montarListaBackups() {
    if (!backupsConhecidos.length) {
        backupEls.lista.innerHTML = `
            <div class="restaurar-vazio">
                Nenhum backup na pasta deste computador.<br>
                Se o backup está em outro lugar (Google Drive, pendrive...), use o botão abaixo.
            </div>`;
        return;
    }

    backupEls.lista.innerHTML = backupsConhecidos.map(b => `
        <div class="restaurar-item">
            <div class="restaurar-item-info">
                <div class="restaurar-item-data">
                    ${escaparTexto(dataBackupPorExtenso(b.data))}
                    ${b.tipo === "antes-de-restaurar"
                        ? '<span class="restaurar-selo copia">Cópia de antes de restaurar</span>'
                        : '<span class="restaurar-selo">Automático</span>'}
                </div>
                <div class="restaurar-item-detalhe">${tamanhoLegivel(b.tamanho)}</div>
            </div>
            <button class="btn-salvar btn-restaurar-este" data-arquivo="${escaparTexto(b.nome)}">
                <i class="ti ti-restore"></i> Restaurar
            </button>
        </div>
    `).join("");
}

function abrirJanelaRestaurar() {
    montarListaBackups();
    backupEls.janela.classList.remove("oculto");
}

function fecharJanelaRestaurar() {
    backupEls.janela.classList.add("oculto");
}

async function pedirSenhaDoArquivo(mensagemErro) {
    const r = await Swal.fire({
        icon: "question",
        title: "Senha do backup",
        html: (mensagemErro ? `<p style="color:#ba3c3c">${escaparTexto(mensagemErro)}</p>` : "") +
            "<p>Esse backup foi feito com uma senha diferente da configurada agora. " +
            "Digite a senha que estava em uso quando ele foi feito.</p>",
        input: "password",
        inputAttributes: { autocomplete: "off" },
        showCancelButton: true,
        confirmButtonText: "Abrir backup",
        cancelButtonText: "Cancelar",
        inputValidator: (v) => (!v ? "Digite a senha." : undefined),
    });
    return r.isConfirmed ? r.value : null;
}

// =========================
// SENHA DO BACKUP antes de ações sensíveis (restaurar / abrir a pasta)
// A tela só pergunta; quem confere de verdade é o processo principal.
// Devolve a senha digitada (já conferida) ou null se cancelou.
// =========================
async function pedirSenhaParaBackup({ titulo, html, textoBotao, icone = "warning" }) {
    const r = await Swal.fire({
        icon: icone,
        title: titulo,
        html: html +
            "<p style='margin-top:14px'><strong>Digite a senha do backup para continuar:</strong></p>",
        input: "password",
        inputPlaceholder: "Senha do backup",
        inputAttributes: { autocomplete: "off" },
        showCancelButton: true,
        confirmButtonText: textoBotao,
        cancelButtonText: "Cancelar",
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        preConfirm: async (senha) => {
            if (!senha) {
                Swal.showValidationMessage("Digite a senha do backup.");
                return false;
            }
            let r;
            try {
                r = await window.backup.conferirSenha(senha);
            } catch (e) {
                r = { ok: false, erro: "Não foi possível conferir a senha." };
            }
            if (!r || !r.ok) {
                Swal.showValidationMessage((r && r.erro) || "Senha do backup incorreta.");
                return false;
            }
            return senha;
        },
    });
    return r.isConfirmed ? r.value : null;
}

async function restaurarBackup(arquivo, descricao) {
    const senhaConfirmacao = await pedirSenhaParaBackup({
        titulo: "Restaurar este backup?",
        html:
            `<p>Os dados de <strong>${escaparTexto(descricao)}</strong> voltarão para o sistema.</p>` +
            "<p style='margin-top:10px'>Nada será apagado: o que foi cadastrado depois desse backup continua no sistema. " +
            "Se o mesmo dado foi alterado depois, ele volta a ficar como estava no backup.</p>" +
            "<p style='margin-top:10px'>Antes de começar, o sistema guarda uma cópia dos dados de agora.</p>",
        textoBotao: "Sim, restaurar",
    });
    if (!senhaConfirmacao) return;

    let senhaDoArquivo;
    for (;;) {
        // sem Swal.showLoading(): ele deixa a próxima janela sem o botão OK
        Swal.fire({
            title: "Restaurando...",
            html: '<i class="ti ti-loader-2 config-girando" style="font-size:34px;color:#7a8e69"></i>' +
                "<p style='margin-top:12px'>Guardando uma cópia dos dados atuais e trazendo o backup de volta. " +
                "Não feche o programa.</p>",
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
        });

        let resultado;
        try {
            resultado = await window.backup.restaurar(arquivo, senhaDoArquivo, senhaConfirmacao);
        } catch (e) {
            resultado = { ok: false, erro: "Não foi possível restaurar o backup." };
        }

        if (resultado.precisaSenha) {
            senhaDoArquivo = await pedirSenhaDoArquivo(resultado.erro);
            if (!senhaDoArquivo) return;
            continue;
        }

        if (!resultado.ok) {
            mostrarMensagem(resultado.erro, "error");
            await atualizarStatusBackup();
            return;
        }

        fecharJanelaRestaurar();
        await atualizarStatusBackup();

        const texto = resultado.alteracoes > 0
            ? `Backup de ${dataBackupPorExtenso(resultado.backup.data).toLowerCase()} restaurado. ` +
              "Uma cópia dos dados de antes da restauração foi guardada na pasta de backups."
            : "Nada precisou ser restaurado: os dados de agora já têm tudo o que está nesse backup.";

        mostrarMensagem(texto, "success", () => {
            if (resultado.alteracoes > 0) window.location.href = "../index.html";
        });
        return;
    }
}

if (window.backup) {
    backupEls.btnAgora.addEventListener("click", async () => {
        const original = backupEls.btnAgora.innerHTML;
        backupEls.btnAgora.disabled = true;
        backupEls.btnAgora.innerHTML = '<i class="ti ti-loader-2"></i> Fazendo backup...';
        try {
            const r = await window.backup.fazerAgora();
            if (r.ok) mostrarMensagem("Backup feito com sucesso!", "success");
            else mostrarMensagem(r.erro, "error");
        } catch (e) {
            mostrarMensagem("Não foi possível fazer o backup.", "error");
        } finally {
            backupEls.btnAgora.disabled = false;
            backupEls.btnAgora.innerHTML = original;
            atualizarStatusBackup();
        }
    });

    backupEls.btnRestaurar.addEventListener("click", async () => {
        await atualizarStatusBackup();
        abrirJanelaRestaurar();
    });

    backupEls.btnPasta.addEventListener("click", async () => {
        const senha = await pedirSenhaParaBackup({
            titulo: "Abrir a pasta de backups",
            html: "<p>Os arquivos da pasta de backups guardam todos os dados do sistema.</p>",
            textoBotao: "Abrir pasta",
            icone: "question",
        });
        if (!senha) return;

        let r;
        try {
            r = await window.backup.abrirPasta(senha);
        } catch (e) {
            r = { ok: false, erro: "Não foi possível abrir a pasta de backups." };
        }
        if (r && r.ok === false) mostrarMensagem(r.erro, "error");
    });
    backupEls.btnFechar.addEventListener("click", fecharJanelaRestaurar);
    backupEls.janela.addEventListener("click", (e) => {
        if (e.target === backupEls.janela) fecharJanelaRestaurar();
    });

    backupEls.lista.addEventListener("click", (e) => {
        const botao = e.target.closest(".btn-restaurar-este");
        if (!botao) return;
        const b = backupsConhecidos.find(x => x.nome === botao.dataset.arquivo);
        if (b) restaurarBackup(b.nome, dataBackupPorExtenso(b.data).toLowerCase());
    });

    backupEls.btnArquivo.addEventListener("click", async () => {
        const escolhido = await window.backup.escolherArquivo();
        if (!escolhido) return;
        restaurarBackup(escolhido.caminho, `${dataBackupPorExtenso(escolhido.data).toLowerCase()} (${escolhido.nome})`);
    });
}

atualizarStatusBackup();
