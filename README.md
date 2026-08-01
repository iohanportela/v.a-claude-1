# Buscador de Produtividade (com OCR)

Aplicativo pessoal, 100% offline, para encontrar rapidamente uma pessoa
numa foto da lista de produtividade da fábrica. Nenhum dado sai do
aparelho: sem login, sem backend, sem banco online.

## Como funciona

1. **Biblioteca** — importe uma ou mais fotos (câmera ou galeria). O OCR
   roda **uma única vez**, no momento da importação, e toda palavra
   reconhecida (com sua posição exata na imagem) fica salva localmente.
2. **Pesquisa** — busque qualquer palavra (nome, matrícula, percentual...).
   A busca é instantânea, ignora maiúsculas/minúsculas e acentuação, e
   aceita busca parcial. Nenhum OCR roda de novo — é tudo consulta ao
   banco local.
3. **Visualizador** — abre a foto original com zoom e arraste, destacando
   a linha inteira do resultado (não só a palavra buscada): o app
   identifica automaticamente as outras palavras da mesma linha visual
   (por proximidade no eixo Y) e desenha um único retângulo ao redor de
   tudo — ex.: buscar "Silvio" destaca a linha inteira
   `31582 SILVIO VITOR DO NASCIMENTO LIMA 120,6% R$ 1,88`.

## Requisitos

- Node.js 18+ e npm
- Para gerar o APK: Android Studio + Android SDK instalados

## 1. Instalar dependências

```bash
npm install
```

## 2. Rodar em modo desenvolvimento (navegador)

```bash
npm run dev
```

No navegador, o OCR usa automaticamente o motor **Tesseract.js**
(fallback web); no app Android nativo, usa **Google ML Kit**
automaticamente — nenhuma configuração manual necessária.

## 3. Gerar o build web (PWA)

```bash
npm run build
```

## 4. Empacotar como app Android nativo

```bash
npx cap add android      # só na primeira vez
npm run build
npx cap sync android
npx cap open android
```

## Arquitetura

```
src/
  components/
    common/    Modal, ToastContainer (genéricos)
    layout/    Layout, BottomNav
    imagem/    MiniaturaImagem, VisualizadorZoom (pan/zoom + destaque)
  pages/       BibliotecaPage, PesquisaPage, VisualizadorPage
  hooks/       useImagens, usePesquisa, useUiStore (Zustand)
  database/    schema Dexie (Imagem, Palavra) e repositórios
  services/
    ocr/       OcrService (ML Kit nativo / Tesseract.js fallback)
    camera/    CameraService (captura/galeria, API @capacitor/camera 8.1+)
    importService.ts   roda o OCR uma vez e persiste as palavras
    buscaService.ts    pesquisa + agrupamento da linha destacada
  types/       tipos de domínio (Imagem, Palavra, BoundingBox)
  utils/       texto.ts (normalização), agrupamentoLinha.ts (Y-proximidade), imagem.ts
```

## Privacidade

- OCR roda no aparelho, uma única vez por imagem, no momento da importação.
- Todo armazenamento é local via IndexedDB.
- Nenhuma requisição de rede é feita pelo app em nenhum momento.
