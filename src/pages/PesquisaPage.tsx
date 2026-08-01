import { useNavigate } from 'react-router-dom';
import { usePesquisa } from '@hooks/usePesquisa';
import { useImagem } from '@hooks/useImagens';
import { MiniaturaImagem } from '@components/imagem/MiniaturaImagem';
import type { ResultadoBusca } from '@domain/domain';

export function PesquisaPage(): JSX.Element {
  const { termo, setTermo, resultados, buscando } = usePesquisa();
  const navigate = useNavigate();

  function abrirResultado(resultado: ResultadoBusca): void {
    navigate(`/imagem/${resultado.imagemId}?palavra=${resultado.palavra.id}`);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-base-50">Pesquisar</h1>
      </header>

      <input
        className="campo-input"
        placeholder="Digite um nome, matrícula, valor..."
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        autoFocus
      />

      <div className="flex flex-col gap-2">
        {resultados.map((resultado) => (
          <ItemResultado key={resultado.palavra.id} resultado={resultado} onAbrir={abrirResultado} />
        ))}

        {buscando && resultados.length === 0 ? (
          <p className="py-6 text-center text-base-500">Nenhum resultado encontrado.</p>
        ) : null}

        {!buscando ? (
          <p className="py-6 text-center text-base-500">Digite algo para pesquisar nas imagens importadas.</p>
        ) : null}
      </div>
    </div>
  );
}

function ItemResultado({
  resultado,
  onAbrir
}: {
  resultado: ResultadoBusca;
  onAbrir: (resultado: ResultadoBusca) => void;
}): JSX.Element | null {
  const imagem = useImagem(resultado.imagemId);
  if (!imagem) return null;

  return (
    <button
      type="button"
      onClick={() => onAbrir(resultado)}
      className="cartao flex items-center gap-3 text-left active:scale-[0.98]"
    >
      <MiniaturaImagem imagem={imagem} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      <span className="flex flex-col overflow-hidden">
        <span className="truncate font-semibold text-base-50">{resultado.textoLinha}</span>
        <span className="truncate text-sm text-base-400">{imagem.nome}</span>
      </span>
    </button>
  );
}
