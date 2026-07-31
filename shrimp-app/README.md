# Produtividade Camarão

Aplicativo pessoal, 100% offline, para organizar a produtividade das
mesas de evisceração a partir de fotos da tela do sistema da empresa.
Nenhum dado sai do aparelho: sem login, sem backend, sem banco online.

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
(fallback web), já que o ML Kit nativo só funciona dentro do app
Android empacotado.

## 3. Gerar o build web (PWA)

```bash
npm run build
```

Isso gera a pasta `dist/`, que já é um PWA instalável (funciona
offline, pode ser "Adicionado à tela inicial" em qualquer navegador
Android/desktop).

## 4. Empacotar como app Android nativo (com ML Kit OCR)

```bash
npx cap add android      # só na primeira vez
npm run build
npx cap sync android
npx cap open android
```

O Android Studio vai abrir o projeto em `android/`. A partir daí:
`Build > Build Bundle(s) / APK(s) > Build APK(s)`.

Quando rodando como app nativo, o app detecta automaticamente a
plataforma e passa a usar o **Google ML Kit** (via
`@capacitor-mlkit/text-recognition`) em vez do Tesseract.js — sem
nenhuma mudança de código necessária.

## Ícones do PWA

Os arquivos em `public/icon-192.png`, `public/icon-512.png` e
`public/apple-touch-icon.png` são placeholders gerados
automaticamente. Substitua por ícones reais do app antes de publicar.

## Arquitetura

```
src/
  components/   componentes de UI reutilizáveis (mesa, formulários, layout)
  pages/        as 7 telas do app (Home, Cadastro, Importação,
                Processamento, Pesquisa, Navegação, Configurações)
  hooks/        hooks reativos sobre o banco (dexie-react-hooks) e stores Zustand
  database/     schema Dexie (IndexedDB) e repositórios de acesso a dados
  services/     OCR (interface + ML Kit + Tesseract), parser de linhas,
                orquestração do processamento, importação de planilha, backup
  contexts/     reservado para contexto React quando necessário
  types/        tipos de domínio centrais
  utils/        utilitários de imagem/blob
```

## Privacidade

- Todo processamento de OCR roda no aparelho.
- Todo armazenamento é local via IndexedDB.
- Nenhuma requisição de rede é feita pelo app em nenhum momento.
