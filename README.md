# Sigilia

# Construtor de Sigilos e Kameas Planetários

Uma aplicação web projetada para a criação automatizada e personalização visual de sigilos mágicos. A ferramenta converte intenções (frases) em traçados geométricos através de cálculos tradicionais, oferecendo duas vertentes principais: Sigilos Planetários (Kameas) e Sigilos de Magia do Caos.

## Principais Funcionalidades

### 1. Modos de Criação Duplos
* **Sigilos Planetários:** Traça o sigilo sobre o quadrado mágico (Kamea) do planeta escolhido, indo de Saturno (3x3) até a Lua (9x9).
* **Magia do Caos:** Utiliza uma Roda Alfabética de A-Z onde o traço conecta diretamente as letras restantes da intenção.

### 2. Sistemas Numéricos e Cifras
* **Cifra Pitagórica:** Converte as letras aproveitadas em dígitos de 1 a 9 (ex: A=1, J=1).
* **Gematria Hebraica + Aiq Beker:** As letras recebem valores numéricos baseados no mapa hebraico e sofrem redução automática (Aiq Beker) para caberem nos limites numéricos do Kamea selecionado (ex: Saturno tem limite 9, Lua tem limite 81).

### 3. Redução Inteligente de Frases
* **Filtro Automático:** Remove vogais, letras repetidas globalmente e ignora palavras compostas por apenas uma letra (sem redução).
* **Controle Manual:** Quando uma palavra seria totalmente apagada por conter apenas consoantes já utilizadas, o usuário pode selecionar manualmente até 3 consoantes para resgatar como um fragmento na análise.

### 4. Personalização do Desenho (Canvas)
* **Arcos de Repetição:** Quando uma casa se repete no Kamea, o sistema gera arcos curvos que podem ser espelhados verticalmente/horizontalmente ou rotacionados em 90° para fins estéticos.
* **Nós Arrastáveis:** A posição de passagens repetidas dentro de um mesmo quadrado pode ser ajustada clicando e arrastando os pontos no Canvas.
* **Terminações:** Escolha entre terminar o sigilo com uma barra transversal perpendicular (T) ou um pequeno laço (exclusivo para Kameas).

### 5. Exportação
* Salve o sigilo gerado como uma imagem `.png` contendo o Kamea/Roda ao fundo ou apenas as linhas puras do traçado.

## Tecnologias Utilizadas

O projeto foi desenvolvido focando em performance, acessibilidade e ausência de dependências externas:
* **HTML5:** Estrutura semântica com atributos WAI-ARIA (`aria-live`, `aria-selected`) para leitores de tela.
* **CSS3:** Interface responsiva em Grid e Flexbox, com tema escuro (Dark Mode) padronizado em tons de preto e dourado.
* **Vanilla JavaScript (ES6+):** Manipulação avançada da API do HTML5 `<canvas>`, cálculo algorítmico dos Kameas e renderização vetorial de curvas Bezier sem o uso de bibliotecas de terceiros.

## Como Executar o Projeto

Como o projeto é construído estritamente com tecnologias front-end nativas, não há necessidade de Node.js, bundlers ou servidores locais.
