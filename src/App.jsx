import { useRef, useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useStockfish } from "./useStockfish";
import Modal from './components/Modal';
import Header from './components/Header';


function App() {
  const game = useRef(new Chess());
  const lastBestMove = useRef(null);
  const chessGame = game.current;
  const [position, setPosition] = useState(chessGame.fen());
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [winner, setWinner] = useState(null);
  const [difficulty, setDifficulty] = useState(1)

  function safeMove(from, to) {
    const legalMoves = chessGame.moves({ verbose: true });
    const move = legalMoves.find(m => m.from === from && m.to === to);

    if (!move) {
      console.log('Illegal move attempted:', from, to);
      return false;
    }

    const result = chessGame.move({
      from,
      to,
      promotion: move.promotion ? 'q' : undefined,
    });

   if (result) {
    setPosition(chessGame.fen());

    // Check for game over
    if (chessGame.isGameOver()) {
      if (chessGame.isCheckmate()) {
        setTimeout(() => {
          setWinner(chessGame.turn() === 'w' ? 'Black' : 'White')
        }, 2000)
      } else {
        setTimeout(() => {
          setWinner('Draw')
        }, 2000)
      }
    }

    return true;
  }

    return false;
  }

  const { sendCommand } = useStockfish((line) => {
    if (typeof line === 'string' && line.startsWith('bestmove')) {
      const best = line.split(' ')[1];
      lastBestMove.current = best;
      const from = best.slice(0, 2);
      const to = best.slice(2, 4);

      if (chessGame.turn() === 'b') {
        const moved = safeMove(from, to);
      }
    } else if (line.error) {
      console.log(line.error);
    }
  });

  useEffect(() => {
    sendCommand("uci");
    sendCommand(`setoption name Skill Level value ${difficulty}`);
    sendCommand("isready");
  }, [difficulty]);

  function requestEngineMove() {
    if (chessGame.turn() !== 'b') return;

    const moves = chessGame.history({ verbose: true })
      .map(m => m.from + m.to + (m.promotion || ''))
      .join(" ");

    sendCommand(`position startpos moves ${moves}`);
    sendCommand(`go depth ${difficulty}`);
  }

  function onPlayerMoveComplete() {
    if (chessGame.turn() === 'b') {
      setTimeout(() => requestEngineMove(), 100); 
    }
  }


  function getMoveOptions(square) {
      const moves = chessGame.moves({
        square,
        verbose: true
      });

      if (moves.length === 0) {
        setOptionSquares({});
        return false;
      }

      const newSquares = {};

      for (const move of moves) {
        newSquares[move.to] = {
          background: chessGame.get(move.to) && chessGame.get(move.to)?.color !== chessGame.get(square)?.color ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
          borderRadius: '50%'
        };
      }

      newSquares[square] = {
        background: 'rgba(255, 255, 0, 0.4)'
      };

      setOptionSquares(newSquares);

      return true;
  }

  // Handle square click
  function onSquareClick({ square, piece }) {
    if (!moveFrom && piece) {
      const hasMoveOptions = getMoveOptions(square);

      if (hasMoveOptions) {
        setMoveFrom(square);
      }
      return;
    }

    const moved = safeMove(moveFrom, square);

    if (moved) {
      setMoveFrom('');
      setOptionSquares({});
      if (chessGame.turn() === 'b') {
        requestEngineMove();
      }
    } else {
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : '');
    }
  }

  // Handle drag and drop
  function onPieceDrop({ sourceSquare, targetSquare }) {
    const moved = safeMove(sourceSquare, targetSquare);
    if (moved) {
      setMoveFrom('');
      setOptionSquares({});
      onPlayerMoveComplete();
      return true;
    }
    return false;
  }

  function handleNewGame() {
    const newGame = new Chess();
    game.current = newGame;
    setPosition(newGame.fen());
    setMoveFrom('');
    setOptionSquares({});
    setWinner(null);
}

  const chessboardOptions = {
    onPieceDrop,
    onSquareClick,
    position,
    squareStyles: optionSquares,
    id: 'click-or-drag-to-move'
  }

  return (
    <>
      <Header handleLevelChange={setDifficulty}/>
      <main>
        <div className='chessboard-container'>
          <Chessboard options={chessboardOptions}/>
        </div>
        {winner ? <Modal winner={winner} handleNewGame={handleNewGame}/> : null}
      </main>
    </>
  )
}

export default App