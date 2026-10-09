document.addEventListener('DOMContentLoaded', function() {
    const selectPlaneta = document.getElementById('planetaSelecionado');
    const gridContainer = document.getElementById('grid_kameas');
    const canvas = document.getElementById('sigilCanvas');
    const ctx = canvas.getContext('2d');
    const btnSalvarComKamea = document.getElementById('btnSalvarComKamea');
    const btnSalvarLinhas = document.getElementById('btnSalvarLinhas');
    const inputTexto = document.getElementById('textoSigilo');
    const selectSistema = document.getElementById('sistemaNumerico');
    const selectTerminacao = document.getElementById('terminacaoSigilo');
    const painelAnalise = document.getElementById('analiseSigilo');
    const statusPersonalizacao = document.getElementById('statusPersonalizacao');
    const ajudaSistemaTitulo = document.getElementById('ajudaSistemaTitulo');
    const ajudaSistemaConteudo = document.getElementById('ajudaSistemaConteudo');
    const btnEspelharVertical = document.getElementById('btnEspelharVertical');
    const btnEspelharHorizontal = document.getElementById('btnEspelharHorizontal');
    const btnRotacionarArco = document.getElementById('btnRotacionarArco');
    const btnRedefinirArco = document.getElementById('btnRedefinirArco');
    const rotacaoArcoValor = document.getElementById('rotacaoArcoValor');
    const tabPlanetario = document.getElementById('tabPlanetario');
    const tabCaos = document.getElementById('tabCaos');
    const chaosWheel = document.getElementById('chaosWheel');
    const regraReducao = document.getElementById('regraReducao');
    const ajudaCaos = document.getElementById('ajudaCaos');
    let modoAtual = 'planetario';


    function atualizarAjudaSistema() {
        const textos = selectSistema.value === 'gematria'
            ? {
                titulo: 'Gematria Hebraica + Aiq Beker',
                paragrafos: [
                    'Após a filtragem da frase, cada letra ocidental mantida recebe o valor numérico definido pelo mapa de correspondências com letras hebraicas usado pelo sistema. Letras com a mesma correspondência compartilham o mesmo valor.',
                    'O Aiq Beker é aplicado automaticamente quando o valor ultrapassa o limite do Kamea escolhido: o sistema remove uma casa decimal por vez, dividindo por 10 e arredondando para baixo, até o valor caber na matriz. Assim, 30 torna-se 3; valores que já cabem permanecem iguais.',
                    'O número reduzido indica a casa exata do Kamea em que a letra será posicionada. Ao mudar de planeta, o limite da matriz muda e a conversão é recalculada.'
                ]
            }
            : {
                titulo: 'Cifra Pitagórica',
                paragrafos: [
                    'Após a filtragem da frase, cada letra mantida é convertida em um dígito de 1 a 9. A sequência percorre o alfabeto em ciclos: A=1 até I=9; J reinicia em 1, e assim por diante.',
                    'Cada dígito indica a casa exata a ser usada no Kamea do planeta selecionado. A ordem das letras aproveitadas determina a ordem em que essas casas serão conectadas.'
                ]
            };

        ajudaSistemaTitulo.textContent = textos.titulo;
        ajudaSistemaConteudo.replaceChildren(...textos.paragrafos.map(texto => {
            const paragrafo = document.createElement('p');
            paragrafo.textContent = texto;
            return paragrafo;
        }));
    }

    const mapPitagorica = {
        A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
        J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8,
        R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8
    };
    const gematriaMap = {
        A: 1, B: 2, C: 20, D: 4, E: 5, F: 80, G: 3, H: 8, I: 10,
        J: 10, K: 20, L: 30, M: 40, N: 50, O: 70, P: 80, Q: 100,
        R: 200, S: 60, T: 400, U: 6, V: 6, W: 6, X: 60, Y: 10, Z: 7
    };
    const maxKameaValues = {
        saturno: 9,
        jupiter: 16,
        marte: 25,
        sol: 36,
        venus: 49,
        mercurio: 64,
        lua: 81
    };

    function applyAiqBeker(letterValue, maxKameaValue) {
        let reduced = letterValue;

        while (reduced > maxKameaValue) {
            if (reduced >= 10) {
                reduced = Math.floor(reduced / 10);
            } else {
                break;
            }
        }

        if (reduced === 0) reduced = 1;
        return reduced;
    }

    function converterLetra(letra) {
        const letraMaiuscula = letra.toUpperCase();
        if (modoAtual === 'caos') {
            return { valorOriginal: letraMaiuscula, numero: letraMaiuscula.charCodeAt(0) - 64 };
        }
        if (selectSistema.value === 'gematria') {
            const valorOriginal = gematriaMap[letraMaiuscula];
            return {
                valorOriginal,
                numero: applyAiqBeker(valorOriginal, maxKameaValues[selectPlaneta.value])
            };
        }

        const numero = mapPitagorica[letraMaiuscula];
        return { valorOriginal: numero, numero };
    }

    let cellCenters = {};
    let cellBounds = {};
    let textoReduzidoCache = null;
    let analiseCache = null;
    let selecoesManuais = new Map();
    let pontosTracados = [];
    let indicePontoArrastado = null;
    let espelhadoVerticalmente = false;
    let espelhadoHorizontalmente = false;
    let rotacaoArco = 0;

    function atualizarControlesArco() {
        const temArcoRepetido = pontosTracados.some(ponto => ponto.repeticaoSequencial);
        [btnEspelharVertical, btnEspelharHorizontal, btnRotacionarArco, btnRedefinirArco]
            .forEach(botao => { botao.disabled = !temArcoRepetido; });
        btnEspelharVertical.setAttribute('aria-pressed', String(espelhadoVerticalmente));
        btnEspelharHorizontal.setAttribute('aria-pressed', String(espelhadoHorizontalmente));
        rotacaoArcoValor.textContent = `Rotação: ${rotacaoArco}°`;
    }

    function transformarVetorArco(vetor) {
        let x = vetor.x * (espelhadoHorizontalmente ? -1 : 1);
        let y = vetor.y * (espelhadoVerticalmente ? -1 : 1);
        const radianos = rotacaoArco * Math.PI / 180;
        return {
            x: x * Math.cos(radianos) - y * Math.sin(radianos),
            y: x * Math.sin(radianos) + y * Math.cos(radianos)
        };
    }

    function analisarTexto() {
        const texto = inputTexto.value;
        if (texto === textoReduzidoCache) return montarAnaliseFinal();
        textoReduzidoCache = texto;

        const palavras = texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .match(/[a-z]+/g) || [];
        const letrasVistas = new Set();
        const analise = { palavras: [] };

        palavras.forEach((palavra, indicePalavra) => {
            const item = { palavra, letras: [], resultado: [], motivo: '', indicesDisponiveis: [] };
            if (palavra.length === 1) {
                item.motivo = 'Ignorada: palavra de uma letra.';
                item.letras = [...palavra].map((letra, indice) => ({ letra, indice, estado: 'ignored' }));
                analise.palavras.push(item);
                return;
            }

            const novasConsoantes = [];
            const letrasLocais = new Set();
            [...palavra].forEach((letra, indice) => {
                if ('aeiou'.includes(letra)) {
                    item.letras.push({ letra, indice, estado: 'removed' });
                } else if (letrasLocais.has(letra)) {
                    item.letras.push({ letra, indice, estado: 'duplicate' });
                } else if (letrasVistas.has(letra)) {
                    item.letras.push({ letra, indice, estado: 'repeated' });
                } else {
                    letrasLocais.add(letra);
                    letrasVistas.add(letra);
                    novasConsoantes.push({ letra, indice });
                    item.letras.push({ letra, indice, estado: 'kept' });
                }
            });
            item.indicesDisponiveis = novasConsoantes.map(({ indice }) => indice);
            item.resultado = [...novasConsoantes];
            if (novasConsoantes.length === 0) {
                item.indicesDisponiveis = item.letras
                    .filter(letra => letra.estado === 'repeated')
                    .map(letra => letra.indice);
                item.motivo = item.indicesDisponiveis.length
                    ? 'Todas as consoantes já apareceram antes. Selecione até 3 para recuperar um fragmento desta palavra.'
                    : 'Sem consoantes para recuperar.';
            }

            item.indicePalavra = indicePalavra;
            analise.palavras.push(item);
        });

        analiseCache = analise;
        return montarAnaliseFinal();
    }

    function montarAnaliseFinal() {
        if (!analiseCache) return { palavras: [], sequencia: [] };
        const analise = { palavras: [], sequencia: [] };
        analiseCache.palavras.forEach((baseItem, indicePalavra) => {
            const item = { ...baseItem, letras: baseItem.letras.map(letra => ({ ...letra })) };
            const selecao = selecoesManuais.get(indicePalavra);
            const elegiveis = new Set(baseItem.indicesDisponiveis);
            const indicesEscolhidos = selecao
                ? [...selecao].filter(indice => elegiveis.has(indice)).slice(0, 3)
                : baseItem.resultado.map(letra => letra.indice);
            item.personalizado = Boolean(selecao);
            item.indicesEscolhidos = indicesEscolhidos;
            item.bloqueada = item.palavra.length === 1 || baseItem.resultado.length > 0 || item.indicesDisponiveis.length === 0;
            item.resultado = indicesEscolhidos.map(indice => ({
                letra: baseItem.palavra[indice],
                indice
            }));
            if (item.personalizado) {
                item.motivo = `Fragmento recuperado: ${item.resultado.length} de até 3 consoantes selecionadas.`;
            }

            item.resultado.forEach(({ letra, indice }) => {
                const conversao = converterLetra(letra);
                if (conversao.numero !== undefined && conversao.numero > 0) {
                    analise.sequencia.push({
                        letra,
                        indice,
                        ...conversao,
                        palavra: item.palavra,
                        indicePalavra
                    });
                }
            });
            analise.palavras.push(item);
        });
        return analise;
    }

    function criarElemento(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    }

    function renderizarAnalise(analise) {
        painelAnalise.replaceChildren();
        painelAnalise.appendChild(criarElemento('h3', '', 'Como o sigilo foi formado'));

        if (!inputTexto.value.trim()) {
            painelAnalise.appendChild(criarElemento(
                'p',
                'analysis_empty',
                modoAtual === 'caos' ? 'Digite uma frase para ver as letras aproveitadas e o percurso alfabético.' : 'Digite uma frase para ver as letras aproveitadas, a redução e a conversão Pitagórica.'
            ));
            return;
        }

        const legenda = criarElemento('div', 'analysis_legend');
        [
            ['kept', 'Consoante mantida'],
            ['vowel', 'Vogal removida'],
            ['repeated', 'Consoante repetida'],
            ['ignored', 'Palavra de uma letra (ignorada)']
        ].forEach(([classe, rotulo]) => {
            const item = criarElemento('span', 'analysis_legend_item');
            item.appendChild(criarElemento('span', `analysis_legend_swatch ${classe}`));
            item.appendChild(criarElemento('span', '', rotulo));
            legenda.appendChild(item);
        });
        painelAnalise.appendChild(legenda);

        painelAnalise.appendChild(criarElemento('h4', '', 'Redução por palavra'));
        analise.palavras.forEach((item, indicePalavra) => {
            const linha = criarElemento('div', 'analysis_word');
            linha.appendChild(criarElemento('span', 'analysis_word_name', item.palavra));

            const letras = criarElemento('span', 'analysis_letters');
            item.letras.forEach(({ letra, indice, estado }) => {
                const escolhido = item.indicesEscolhidos.includes(indice);
                const recuperavel = item.indicesDisponiveis.includes(indice) && !item.bloqueada;
                const disponivel = recuperavel;
                const button = criarElemento(
                    'button',
                    `analysis_letter ${estado === 'removed' ? 'vowel' : estado}${escolhido && item.personalizado ? ' manual_selected' : ''}${item.personalizado && recuperavel && !escolhido ? ' not_selected' : ''}`,
                    letra
                );
                button.type = 'button';
                button.disabled = !disponivel;
                button.setAttribute('aria-pressed', String(escolhido));
                const descricaoEstado = estado === 'removed'
                    ? 'vogal removida e não selecionável'
                    : recuperavel
                    ? escolhido ? 'fragmento recuperado' : 'disponível para recuperar como fragmento'
                    : estado === 'repeated' || estado === 'duplicate'
                    ? 'letra repetida e não selecionável'
                    : estado === 'kept'
                        ? 'consoante inédita, mantida automaticamente e não editável'
                    : estado === 'ignored'
                        ? 'palavra de uma letra, ignorada'
                        : escolhido ? 'incluída' : 'disponível';
                button.setAttribute('aria-label', `${letra.toUpperCase()} de ${item.palavra}, ${descricaoEstado}`);
                button.title = !disponivel
                    ? descricaoEstado
                    : recuperavel
                        ? escolhido ? 'Clique para remover do fragmento recuperado.' : 'Clique para recuperar esta consoante como parte da palavra.'
                        : escolhido ? 'Incluída automaticamente por ser uma consoante inédita.' : 'Consoante inédita.';
                button.addEventListener('click', () => alternarLetra(indicePalavra, indice, item));
                letras.appendChild(button);
            });
            linha.appendChild(letras);

            linha.appendChild(criarElemento('span', 'analysis_arrow', '→'));
            const conversao = criarElemento('span', 'analysis_conversion');
            if (item.resultado.length) {
                item.resultado.forEach(({ letra }) => {
                    const { valorOriginal, numero } = converterLetra(letra);
                    const rotuloConversao = modoAtual === 'caos'
                        ? letra.toUpperCase()
                        : selectSistema.value === 'gematria'
                            ? `${letra.toUpperCase()} (${valorOriginal}) → ${numero}`
                            : `${letra.toUpperCase()} → ${numero}`;
                    conversao.appendChild(criarElemento(
                        'span',
                        'analysis_number',
                        rotuloConversao
                    ));
                });
            } else {
                conversao.appendChild(criarElemento('span', 'analysis_tag', 'sem letras'));
            }
            linha.appendChild(conversao);

            if (item.motivo) {
                linha.appendChild(criarElemento('small', 'analysis_note', item.motivo));
            }
            painelAnalise.appendChild(linha);
        });

        painelAnalise.appendChild(criarElemento('h4', '', 'Sequência usada no sigilo'));
        const sequencia = criarElemento('div', 'analysis_sequence');
        if (analise.sequencia.length) {
            analise.sequencia.forEach(({ letra, valorOriginal, numero }, indice) => {
                if (indice) sequencia.appendChild(criarElemento('span', 'analysis_arrow', '→'));
                const rotuloConversao = modoAtual === 'caos'
                    ? letra.toUpperCase()
                    : selectSistema.value === 'gematria'
                        ? `${letra.toUpperCase()} (${valorOriginal} → ${numero})`
                        : `${letra.toUpperCase()} (${numero})`;
                sequencia.appendChild(criarElemento(
                    'span',
                    'analysis_number',
                    rotuloConversao
                ));
            });
        } else {
            sequencia.appendChild(criarElemento('span', 'analysis_empty', 'Nenhuma letra gerou número para traçar.'));
        }
        painelAnalise.appendChild(sequencia);
    }

    function alternarLetra(indicePalavra, indiceLetra, item) {
        if (item.bloqueada || !item.indicesDisponiveis.includes(indiceLetra)) return;
        let selecao = selecoesManuais.has(indicePalavra)
            ? [...selecoesManuais.get(indicePalavra)]
            : [...item.indicesEscolhidos];
        const indiceExistente = selecao.indexOf(indiceLetra);
        if (indiceExistente >= 0) {
            selecao.splice(indiceExistente, 1);
        } else if (selecao.length >= 3) {
            statusPersonalizacao.textContent = 'Você pode recuperar até 3 consoantes desta palavra.';
            return;
        } else {
            selecao.push(indiceLetra);
            selecao.sort((a, b) => a - b);
        }
        selecoesManuais.set(indicePalavra, selecao);
        statusPersonalizacao.textContent = '';
        drawSigil();
    }

    function createChaosWheel() {
        chaosWheel.replaceChildren();
        cellCenters = {};
        cellBounds = {};
        const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        [...letras].forEach((letra, indice) => {
            const angulo = -Math.PI / 2 + (indice * Math.PI * 2 / letras.length);
            const elemento = document.createElement('div');
            elemento.className = 'chaos_letter';
            elemento.textContent = letra;
            elemento.dataset.val = String(indice + 1);
            elemento.style.left = `${50 + Math.cos(angulo) * 43}%`;
            elemento.style.top = `${50 + Math.sin(angulo) * 43}%`;
            chaosWheel.appendChild(elemento);
        });
    }
    function alternarModo(modo) {
        modoAtual = modo;
        const caos = modo === 'caos';
        document.body.classList.toggle('chaos_mode', caos);
        document.querySelectorAll('.planetary_only').forEach(el => el.hidden = caos);
        document.querySelectorAll('.chaos_only').forEach(el => el.hidden = !caos);
        gridContainer.hidden = caos;
        chaosWheel.hidden = !caos;
        tabPlanetario.classList.toggle('active', !caos);
        tabCaos.classList.toggle('active', caos);
        tabPlanetario.setAttribute('aria-selected', String(!caos));
        tabCaos.setAttribute('aria-selected', String(caos));
        selectTerminacao.value = 't';
        selectTerminacao.hidden = caos;
        regraReducao.textContent = caos
            ? 'Vogais e letras repetidas são removidas globalmente. A sequência restante é ligada diretamente na roda A–Z.'
            : 'Vogais e consoantes repetidas são removidas; palavras de uma letra são ignoradas. Todas as consoantes inéditas de cada palavra são mantidas.';
        selecoesManuais.clear();
        textoReduzidoCache = null;
        analiseCache = null;
        pontosTracados = [];
        if (caos) createChaosWheel(); else createGrid(selectPlaneta.value);
        requestAnimationFrame(drawSigil);
    }
    function createGrid(planeta) {
        gridContainer.innerHTML = '';
        cellCenters = {};
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let size = 0;
        let totalCells = 0;

        if (planeta === 'saturno') { size = 3; totalCells = 9; }
        else if (planeta === 'jupiter') { size = 4; totalCells = 16; }
        else if (planeta === 'marte') { size = 5; totalCells = 25; }
        else if (planeta === 'sol') { size = 6; totalCells = 36; }
        else if (planeta === 'venus') { size = 7; totalCells = 49; }
        else if (planeta === 'mercurio') { size = 8; totalCells = 64; }
        else if (planeta === 'lua') { size = 9; totalCells = 81; }

        gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

        const geometricMaskSol = [
            1,0,0,0,0,1,0,1,1,0,0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,0,1,1,0,1,0,0,0,0,1
        ];

        for (let i = 0; i < totalCells; i++) {
            const x = i % size;
            const y = Math.floor(i / size);
            let valor = 0;

            if (planeta === 'saturno') {
                valor = 3 * ((x - y + 4) % 3) + ((6 - x - y) % 3) + 1;
            } else if (planeta === 'jupiter') {
                const p = 13 - 4 * y + x;
                const isDiag = ((x ^ y) % 3 === 0) ? 1 : 0;
                valor = isDiag * (17 - p) + (1 - isDiag) * p;
            } else if (planeta === 'marte') {
                const a = (2 * x + 3 * y + 2) % 5;
                const b = (3 * x + 3 * y) % 5;
                valor = 5 * a + b + 1;
            } else if (planeta === 'sol') {
                const p = 6 * y + x + 1;
                const d = geometricMaskSol[i];
                valor = d * (37 - p) + (1 - d) * p;
            } else if (planeta === 'venus') {
                const a = (3 * x + 4 * y + 3) % 7;
                const b = (4 * x + 4 * y) % 7;
                valor = 7 * a + b + 1;
            } else if (planeta === 'mercurio') {
                const p = 8 * y - x + 8;
                const rx = x % 4;
                const ry = y % 4;
                const isDiag = (rx === ry || rx + ry === 3) ? 1 : 0;
                valor = isDiag * p + (1 - isDiag) * (65 - p);
            } else if (planeta === 'lua') {
                const a = (4 * x + 5 * y + 4) % 9;
                const b = (5 * x + 5 * y) % 9;
                valor = 9 * a + b + 1;
            }

            const cell = document.createElement('div');
            cell.className = 'grid_cell';
            cell.textContent = valor;
            cell.dataset.val = valor;
            if (size >= 8) cell.style.fontSize = '0.9em';

            gridContainer.appendChild(cell);
        }
    }

    function updateCanvasSize() {
        const superficie = modoAtual === 'caos' ? chaosWheel : gridContainer;
        canvas.width = superficie.offsetWidth;
        canvas.height = superficie.offsetHeight;
    }

    function extractCoordinates() {
        cellCenters = {};
        cellBounds = {};
        const cells = modoAtual === 'caos' ? chaosWheel.querySelectorAll('.chaos_letter') : gridContainer.querySelectorAll('.grid_cell');
        cells.forEach(cell => {
            const val = parseInt(cell.dataset.val, 10);
            cellCenters[val] = {
                x: cell.offsetLeft + cell.offsetWidth / 2,
                y: cell.offsetTop + cell.offsetHeight / 2
            };
            cellBounds[val] = {
                left: cell.offsetLeft,
                top: cell.offsetTop,
                width: cell.offsetWidth,
                height: cell.offsetHeight
            };
        });
    }

    function obterDeslocamentosTerminacao(ponto, anterior, limites) {
        if (selectTerminacao.value === 't') {
            if (!anterior) return [];
            const dx = ponto.x - anterior.x;
            const dy = ponto.y - anterior.y;
            const comprimento = Math.hypot(dx, dy);
            if (!comprimento) return [];
            const nx = -dy / comprimento;
            const ny = dx / comprimento;
            return [{ x: nx * 10, y: ny * 10 }, { x: -nx * 10, y: -ny * 10 }];
        }

        const dx = anterior ? ponto.x - anterior.x : 1;
        const dy = anterior ? ponto.y - anterior.y : 0;
        const comprimento = Math.hypot(dx, dy) || 1;
        const direcao = { x: dx / comprimento, y: dy / comprimento };
        const normal = { x: direcao.y, y: -direcao.x };
        const escala = Math.min(limites.width, limites.height);
        const haste = escala * 0.09;
        const larguraLaco = escala * 0.08;
        const coordenadas = [
            [0, 0],
            [haste, 0],
            [haste, larguraLaco * 0.55],
            [haste * 0.8, larguraLaco],
            [haste * 0.48, larguraLaco],
            [haste * 0.2, larguraLaco],
            [haste * 0.12, larguraLaco * 0.45],
            [haste * 0.15, 0]
        ];
        return coordenadas.map(([aoLongo, lateral]) => ({
            x: direcao.x * aoLongo + normal.x * lateral,
            y: direcao.y * aoLongo + normal.y * lateral
        }));
    }

    function restringirPontoAoKamea(ponto, anterior, limites, incluiTerminacao) {
        const raioBolinha = ponto.inicio ? 6 : ponto.repetido ? 5 : 0;
        const margemTraco = 1.5;
        for (let tentativa = 0; tentativa < 4; tentativa++) {
            const deslocamentos = incluiTerminacao
                ? obterDeslocamentosTerminacao(ponto, anterior, limites)
                : [];
            const minX = Math.min(-raioBolinha, ...deslocamentos.map(item => item.x)) - margemTraco;
            const maxX = Math.max(raioBolinha, ...deslocamentos.map(item => item.x)) + margemTraco;
            const minY = Math.min(-raioBolinha, ...deslocamentos.map(item => item.y)) - margemTraco;
            const maxY = Math.max(raioBolinha, ...deslocamentos.map(item => item.y)) + margemTraco;
            const x = Math.max(
                limites.left - minX,
                Math.min(limites.left + limites.width - maxX, ponto.x)
            );
            const y = Math.max(
                limites.top - minY,
                Math.min(limites.top + limites.height - maxY, ponto.y)
            );
            if (x === ponto.x && y === ponto.y) break;
            ponto.x = x;
            ponto.y = y;
        }
        ponto.relativeX = (ponto.x - limites.left) / limites.width;
        ponto.relativeY = (ponto.y - limites.top) / limites.height;
        return ponto;
    }

    function drawSigil(opcoes = {}) {
        const contexto = opcoes.contexto || ctx;
        const incluirPontosEditaveis = opcoes.incluirPontosEditaveis !== false;
        if (contexto === ctx) updateCanvasSize();
        extractCoordinates();
        contexto.clearRect(0, 0, canvas.width, canvas.height);

        const analise = analisarTexto();
        renderizarAnalise(analise);
        const sequencia = analise.sequencia.map(item => item.numero);
        const pontosAnteriores = pontosTracados;
        const ocorrencias = {};
        pontosTracados = [];
        sequencia.forEach((numero, indice) => {
            const ocorrencia = ocorrencias[numero] || 0;
            ocorrencias[numero] = ocorrencia + 1;
            const repetido = ocorrencia > 0;
            const limites = cellBounds[numero];
            const pontoAnterior = pontosAnteriores[indice];

            if (!limites) return;
            let ponto;
            if (!repetido) {
                ponto = {
                    numero,
                    repetido: false,
                    repeticaoSequencial: false,
                    inicio: indice === 0,
                    x: cellCenters[numero].x,
                    y: cellCenters[numero].y
                };
            } else {
                const repeticaoInicial = indice === 1 && sequencia[0] === numero;
                const repeticaoSequencial = indice > 0 && sequencia[indice - 1] === numero;
                ponto = repeticaoInicial
                    ? { numero, repetido: true, repeticaoSequencial: true, repeticaoInicial: true, movivel: false }
                    : repeticaoSequencial
                    ? {
                        numero,
                        repetido: true,
                        repeticaoSequencial: true,
                        movivel: false,
                        relativeX: 0.5,
                        relativeY: 0.5
                    }
                    : pontoAnterior && pontoAnterior.numero === numero && pontoAnterior.repetido
                    ? pontoAnterior
                    : {
                        numero,
                        repetido: true,
                        relativeX: 0.2 + Math.random() * 0.6,
                        relativeY: 0.2 + Math.random() * 0.6
                    };
                ponto.numero = numero;
                ponto.repetido = true;
                ponto.repeticaoSequencial = repeticaoSequencial;
                if (repeticaoInicial) {
                    const proximoValorDiferente = sequencia.slice(indice + 1).find(valor => valor !== numero);
                    const inicio = cellCenters[numero];
                    const destino = proximoValorDiferente ? cellCenters[proximoValorDiferente] : null;
                    const dx = destino ? destino.x - inicio.x : 1;
                    const dy = destino ? destino.y - inicio.y : 0;
                    const comprimento = Math.hypot(dx, dy) || 1;
                    ponto.x = inicio.x + dx / comprimento * 6;
                    ponto.y = inicio.y + dy / comprimento * 6;
                } else if (repeticaoSequencial) {
                    ponto.x = cellCenters[numero].x;
                    ponto.y = cellCenters[numero].y;
                } else {
                    ponto.movivel = true;
                    ponto.x = limites.left + ponto.relativeX * limites.width;
                    ponto.y = limites.top + ponto.relativeY * limites.height;
                }
            }
            restringirPontoAoKamea(
                ponto,
                pontosTracados[indice - 1],
                limites,
                indice === sequencia.length - 1
            );
            pontosTracados.push(ponto);
        });
        atualizarControlesArco();
        if (!pontosTracados.length) return;

        contexto.strokeStyle = '#d4af37';
        contexto.lineWidth = 3;
        contexto.lineCap = 'round';
        contexto.lineJoin = 'round';

        contexto.beginPath();
        contexto.moveTo(pontosTracados[0].x, pontosTracados[0].y);
        let saidaDoArcoRepeticao = null;
        let terminacaoNoArco = null;
        const repeticoesDesenhadas = new Set();
        pontosTracados.slice(1).forEach((ponto, indiceRelativo) => {
            const indice = indiceRelativo + 1;
            if (repeticoesDesenhadas.has(indice)) return;

            if (saidaDoArcoRepeticao) {
                const destino = ponto;
                contexto.lineTo(destino.x, destino.y);
                saidaDoArcoRepeticao = null;
            } else {
                contexto.lineTo(ponto.x, ponto.y);
            }

            if (!ponto.repeticaoSequencial) return;

            let fimRepeticao = indice;
            while (
                fimRepeticao + 1 < pontosTracados.length &&
                pontosTracados[fimRepeticao + 1].numero === ponto.numero &&
                pontosTracados[fimRepeticao + 1].repeticaoSequencial
            ) {
                fimRepeticao++;
                repeticoesDesenhadas.add(fimRepeticao);
            }
            const destinoSeguinte = pontosTracados
                .slice(fimRepeticao + 1)
                .find(candidato => Math.hypot(candidato.x - ponto.x, candidato.y - ponto.y) > 0.5);
            const destinoAnterior = pontosTracados
                .slice(0, indice)
                .reverse()
                .find(candidato => Math.hypot(candidato.x - ponto.x, candidato.y - ponto.y) > 0.5);
            const dx = destinoSeguinte
                ? destinoSeguinte.x - ponto.x
                : destinoAnterior
                    ? ponto.x - destinoAnterior.x
                    : 1;
            const dy = destinoSeguinte
                ? destinoSeguinte.y - ponto.y
                : destinoAnterior
                    ? ponto.y - destinoAnterior.y
                    : 0;
            const comprimento = Math.hypot(dx, dy) || 1;
            const direcaoOriginal = { x: dx / comprimento, y: dy / comprimento };
            const normalOriginal = { x: direcaoOriginal.y, y: -direcaoOriginal.x };
            const direcao = transformarVetorArco(direcaoOriginal);
            const normal = transformarVetorArco(normalOriginal);
            const celula = cellBounds[ponto.numero];
            const raio = Math.min(
                6,
                (ponto.x - celula.left - 3) / Math.max(1, Math.abs(direcao.x) + Math.abs(normal.x)),
                (celula.left + celula.width - ponto.x - 3) / Math.max(1, Math.abs(direcao.x) + Math.abs(normal.x)),
                (ponto.y - celula.top - 3) / Math.max(1, Math.abs(direcao.y) + Math.abs(normal.y)),
                (celula.top + celula.height - ponto.y - 3) / Math.max(1, Math.abs(direcao.y) + Math.abs(normal.y))
            );
            const raioArco = Math.max(2, raio);
            const quantidadeArcos = fimRepeticao - indice + 2;
            const saida = {
                x: ponto.x + direcao.x * raioArco * 2 * quantidadeArcos,
                y: ponto.y + direcao.y * raioArco * 2 * quantidadeArcos
            };
            for (let arco = 0; arco < quantidadeArcos; arco++) {
                const inicioArco = {
                    x: ponto.x + direcao.x * raioArco * arco * 2,
                    y: ponto.y + direcao.y * raioArco * arco * 2
                };
                const fimArco = {
                    x: inicioArco.x + direcao.x * raioArco * 2,
                    y: inicioArco.y + direcao.y * raioArco * 2
                };
                contexto.bezierCurveTo(
                    inicioArco.x + direcao.x * raioArco * 0.5 + normal.x * raioArco * 1.3,
                    inicioArco.y + direcao.y * raioArco * 0.5 + normal.y * raioArco * 1.3,
                    inicioArco.x + direcao.x * raioArco * 1.5 + normal.x * raioArco * 1.3,
                    inicioArco.y + direcao.y * raioArco * 1.5 + normal.y * raioArco * 1.3,
                    fimArco.x,
                    fimArco.y
                );
            }
            if (fimRepeticao === pontosTracados.length - 1) {
                terminacaoNoArco = { ...saida, direcao };
            }
            saidaDoArcoRepeticao = saida;
        });
        contexto.stroke();

        contexto.save();
        contexto.globalCompositeOperation = 'destination-out';
        contexto.beginPath();
        contexto.arc(pontosTracados[0].x, pontosTracados[0].y, 5.5, 0, Math.PI * 2);
        contexto.fill();
        contexto.restore();

        contexto.beginPath();
        contexto.arc(pontosTracados[0].x, pontosTracados[0].y, 6, 0, Math.PI * 2);
        contexto.stroke();
        if (incluirPontosEditaveis) {
            pontosTracados.forEach(ponto => {
                if (!ponto.repetido || ponto.movivel === false) return;
                contexto.beginPath();
                contexto.arc(ponto.x, ponto.y, 5, 0, Math.PI * 2);
                contexto.fillStyle = '#0d0d0d';
                contexto.fill();
                contexto.strokeStyle = '#72c7a3';
                contexto.stroke();
                contexto.strokeStyle = '#d4af37';
            });
        }
        const ultimoPonto = pontosTracados[pontosTracados.length - 1];
        const limitesTermino = cellBounds[ultimoPonto.numero];
        const pontoTermino = terminacaoNoArco || ultimoPonto;
        const pontoAnteriorTermino = terminacaoNoArco
            ? {
                x: pontoTermino.x - terminacaoNoArco.direcao.x,
                y: pontoTermino.y - terminacaoNoArco.direcao.y
            }
            : pontosTracados[pontosTracados.length - 2];

        if (selectTerminacao.value === 'laco') {
            const limites = limitesTermino;
            const dx = pontoAnteriorTermino ? pontoTermino.x - pontoAnteriorTermino.x : 1;
            const dy = pontoAnteriorTermino ? pontoTermino.y - pontoAnteriorTermino.y : 0;
            const comprimento = Math.hypot(dx, dy) || 1;
            const direcao = { x: dx / comprimento, y: dy / comprimento };
            const normal = { x: -direcao.y, y: direcao.x };
            const escala = Math.min(limites.width, limites.height);
            const haste = escala * 0.09;
            const larguraLaco = escala * 0.08;
            const pontoLocal = (aoLongo, lateral) => ({
                x: pontoTermino.x + direcao.x * aoLongo + normal.x * lateral,
                y: pontoTermino.y + direcao.y * aoLongo + normal.y * lateral
            });
            const ponta = pontoLocal(haste, 0);
            const curva1 = pontoLocal(haste, larguraLaco * 0.55);
            const curva2 = pontoLocal(haste * 0.8, larguraLaco);
            const curva3 = pontoLocal(haste * 0.48, larguraLaco);
            const curva4 = pontoLocal(haste * 0.2, larguraLaco);
            const curva5 = pontoLocal(haste * 0.12, larguraLaco * 0.45);
            const retorno = pontoLocal(haste * 0.15, 0);
            contexto.beginPath();
            contexto.moveTo(pontoTermino.x, pontoTermino.y);
            contexto.lineTo(ponta.x, ponta.y);
            contexto.bezierCurveTo(
                curva1.x, curva1.y,
                curva2.x, curva2.y,
                curva3.x, curva3.y
            );
            contexto.bezierCurveTo(
                curva4.x, curva4.y,
                curva5.x, curva5.y,
                retorno.x, retorno.y
            );
            contexto.lineTo(pontoTermino.x, pontoTermino.y);
            contexto.stroke();
        } else if (sequencia.length > 1) {
            const dx = pontoAnteriorTermino
                ? pontoTermino.x - pontoAnteriorTermino.x
                : 0;
            const dy = pontoAnteriorTermino
                ? pontoTermino.y - pontoAnteriorTermino.y
                : 0;
            const len = Math.hypot(dx, dy);

            contexto.beginPath();
            if (len > 0) {
                const nx = -dy / len;
                const ny = dx / len;
                const inicioBarra = {
                    x: pontoTermino.x + nx * 10,
                    y: pontoTermino.y + ny * 10
                };
                const fimBarra = {
                    x: pontoTermino.x - nx * 10,
                    y: pontoTermino.y - ny * 10
                };
                contexto.moveTo(inicioBarra.x, inicioBarra.y);
                contexto.lineTo(fimBarra.x, fimBarra.y);
            }
            contexto.stroke();
        }
    }

    function posicaoNoCanvas(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
        };
    }

    function encontrarPontoRepetidoArrastavel(posicao) {
        let candidato = null;
        let menorDistancia = 12;
        const celulaClicada = Object.entries(cellBounds).find(([, limites]) =>
            posicao.x >= limites.left &&
            posicao.x <= limites.left + limites.width &&
            posicao.y >= limites.top &&
            posicao.y <= limites.top + limites.height
        );
        if (!celulaClicada) return null;
        const numeroCelula = Number(celulaClicada[0]);

        for (let indice = 1; indice < pontosTracados.length; indice++) {
            const ponto = pontosTracados[indice];
            if (!ponto.repetido || ponto.movivel === false || ponto.numero !== numeroCelula) continue;
            const distancia = Math.hypot(posicao.x - ponto.x, posicao.y - ponto.y);
            if (distancia < menorDistancia) {
                candidato = indice;
                menorDistancia = distancia;
            }
        }
        return candidato;
    }

    canvas.addEventListener('pointerdown', function(event) {
        const posicao = posicaoNoCanvas(event);
        indicePontoArrastado = encontrarPontoRepetidoArrastavel(posicao);
        if (indicePontoArrastado === null) return;
        canvas.setPointerCapture(event.pointerId);
        canvas.classList.add('dragging');
        event.preventDefault();
    });

    canvas.addEventListener('pointermove', function(event) {
        if (indicePontoArrastado === null) return;
        const ponto = pontosTracados[indicePontoArrastado];
        const limites = cellBounds[ponto.numero];
        const posicao = posicaoNoCanvas(event);
        const anterior = pontosTracados[indicePontoArrastado - 1];
        const incluiTerminacao = indicePontoArrastado === pontosTracados.length - 1;
        ponto.x = posicao.x;
        ponto.y = posicao.y;
        restringirPontoAoKamea(ponto, anterior, limites, incluiTerminacao);
        drawSigil();
        event.preventDefault();
    });

    function encerrarArraste(event) {
        if (indicePontoArrastado === null) return;
        indicePontoArrastado = null;
        canvas.classList.remove('dragging');
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    }

    canvas.addEventListener('pointerup', encerrarArraste);
    canvas.addEventListener('pointercancel', encerrarArraste);

    function salvarCanvas(canvasParaSalvar, nomeArquivo) {
        const link = document.createElement('a');
        link.download = nomeArquivo;
        link.href = canvasParaSalvar.toDataURL('image/png');
        link.click();
    }

    function salvarSigiloComKamea() {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        const tracoCanvas = document.createElement('canvas');
        tracoCanvas.width = canvas.width;
        tracoCanvas.height = canvas.height;
        const tracoCtx = tracoCanvas.getContext('2d');
        drawSigil({ contexto: tracoCtx, incluirPontosEditaveis: false });
        const canvasRect = canvas.getBoundingClientRect();
        const escalaX = exportCanvas.width / canvasRect.width;
        const escalaY = exportCanvas.height / canvasRect.height;
        const superficie = modoAtual === 'caos' ? chaosWheel : gridContainer;
        const gradeRect = superficie.getBoundingClientRect();
        const gradeX = (gradeRect.left - canvasRect.left) * escalaX;
        const gradeY = (gradeRect.top - canvasRect.top) * escalaY;
        const gradeLargura = gradeRect.width * escalaX;
        const gradeAltura = gradeRect.height * escalaY;

        exportCtx.fillStyle = '#111';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        exportCtx.fillStyle = '#111';
        exportCtx.fillRect(gradeX, gradeY, gradeLargura, gradeAltura);
        exportCtx.strokeStyle = '#d4af37';
        exportCtx.lineWidth = 2;
        exportCtx.strokeRect(gradeX + 1, gradeY + 1, gradeLargura - 2, gradeAltura - 2);

        superficie.querySelectorAll(modoAtual === 'caos' ? '.chaos_letter' : '.grid_cell').forEach(cell => {
            const rect = cell.getBoundingClientRect();
            const x = (rect.left - canvasRect.left) * escalaX;
            const y = (rect.top - canvasRect.top) * escalaY;
            const largura = rect.width * escalaX;
            const altura = rect.height * escalaY;
            exportCtx.fillStyle = '#1a1a1a';
            exportCtx.fillRect(x, y, largura, altura);
            exportCtx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
            exportCtx.lineWidth = 1;
            exportCtx.strokeRect(x + 0.5, y + 0.5, largura - 1, altura - 1);
            exportCtx.fillStyle = '#fff';
            exportCtx.font = `bold ${Math.min(largura, altura) * 0.38}px "Courier New", Courier, monospace`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';
            exportCtx.fillText(cell.textContent, x + largura / 2, y + altura / 2);
        });

        exportCtx.drawImage(tracoCanvas, 0, 0);
        salvarCanvas(exportCanvas, modoAtual === 'caos' ? 'sigilo-caos-com-roda.png' : `sigilo-${selectPlaneta.value}-com-kamea.png`);
    }

    function salvarSomenteLinhas() {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        drawSigil({ contexto: exportCtx, incluirPontosEditaveis: false });
        salvarCanvas(exportCanvas, modoAtual === 'caos' ? 'sigilo-caos-linhas.png' : `sigilo-${selectPlaneta.value}-linhas.png`);
    }

    tabPlanetario.addEventListener('click', () => alternarModo('planetario'));
    tabCaos.addEventListener('click', () => alternarModo('caos'));
    btnSalvarComKamea.addEventListener('click', salvarSigiloComKamea);
    btnSalvarLinhas.addEventListener('click', salvarSomenteLinhas);

    btnEspelharVertical.addEventListener('click', function() {
        espelhadoVerticalmente = !espelhadoVerticalmente;
        drawSigil();
    });
    btnEspelharHorizontal.addEventListener('click', function() {
        espelhadoHorizontalmente = !espelhadoHorizontalmente;
        drawSigil();
    });
    btnRotacionarArco.addEventListener('click', function() {
        rotacaoArco = (rotacaoArco + 90) % 360;
        drawSigil();
    });
    btnRedefinirArco.addEventListener('click', function() {
        espelhadoVerticalmente = false;
        espelhadoHorizontalmente = false;
        rotacaoArco = 0;
        drawSigil();
    });

    selectPlaneta.addEventListener('change', function(e) {
        createGrid(e.target.value);
        drawSigil();
    });

    selectTerminacao.addEventListener('change', drawSigil);
    selectSistema.addEventListener('change', function() {
        atualizarAjudaSistema();
        drawSigil();
    });
    inputTexto.addEventListener('input', function() {
        selecoesManuais.clear();
        textoReduzidoCache = null;
        analiseCache = null;
        pontosTracados = [];
        statusPersonalizacao.textContent = '';
        drawSigil();
    });
    window.addEventListener('resize', drawSigil);

    atualizarAjudaSistema();
    createGrid(selectPlaneta.value);
    atualizarControlesArco();
});