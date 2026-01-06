const boardEl = document.getElementById("board");
const whiteScoreEl = document.getElementById("whiteScore");
const blackScoreEl = document.getElementById("blackScore");
const turnDisplayEl = document.getElementById("turnDisplay");
const resetBtn = document.getElementById("resetBtn");
const messageBarEl = document.getElementById("messageBar");

let board = [];
let selected = null;
let turn = "white";
let scores = { white: 0, black: 0 };
let gameOver = false;

const PIECES = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟︎",
  },
};

const PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
};

function initBoard() {
  board = Array.from({ length: 8 }, () => Array(8).fill(null));

  const place = (row, col, color, type) => {
    board[row][col] = { color, type };
  };

  // Pawns
  for (let col = 0; col < 8; col++) {
    place(1, col, "black", "pawn");
    place(6, col, "white", "pawn");
  }

  // Rooks
  place(0, 0, "black", "rook");
  place(0, 7, "black", "rook");
  place(7, 0, "white", "rook");
  place(7, 7, "white", "rook");

  // Knights
  place(0, 1, "black", "knight");
  place(0, 6, "black", "knight");
  place(7, 1, "white", "knight");
  place(7, 6, "white", "knight");

  // Bishops
  place(0, 2, "black", "bishop");
  place(0, 5, "black", "bishop");
  place(7, 2, "white", "bishop");
  place(7, 5, "white", "bishop");

  // Queens
  place(0, 3, "black", "queen");
  place(7, 3, "white", "queen");

  // Kings
  place(0, 4, "black", "king");
  place(7, 4, "white", "king");

  scores.white = 0;
  scores.black = 0;
  selected = null;
  turn = "white";
  gameOver = false;

  updateScores();
  updateTurnDisplay();
  setMessage("Game on! Play your best moves.");

  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const squareEl = document.createElement("div");
      squareEl.classList.add("square");
      const isDark = (row + col) % 2 === 1;
      squareEl.classList.add(isDark ? "dark" : "light");
      squareEl.dataset.row = row;
      squareEl.dataset.col = col;

      const piece = board[row][col];
      if (piece) {
        const pieceEl = document.createElement("span");
        pieceEl.textContent = PIECES[piece.color][piece.type];
        pieceEl.classList.add("piece", piece.color);
        squareEl.appendChild(pieceEl);
      }

      squareEl.addEventListener("click", onSquareClick);
      boardEl.appendChild(squareEl);
    }
  }
}

function updateScores() {
  whiteScoreEl.textContent = scores.white;
  blackScoreEl.textContent = scores.black;
}

function updateTurnDisplay() {
  turnDisplayEl.textContent =
    turn.charAt(0).toUpperCase() + turn.slice(1);
}

function setMessage(text) {
  messageBarEl.textContent = text;
}

function clearHighlights() {
  document
    .querySelectorAll(".square.selected, .square.highlight")
    .forEach((el) => el.classList.remove("selected", "highlight"));
}

function onSquareClick(e) {
  if (gameOver) return;

  const row = parseInt(e.currentTarget.dataset.row, 10);
  const col = parseInt(e.currentTarget.dataset.col, 10);
  const clickedPiece = board[row][col];

  if (selected) {
    const [sRow, sCol] = selected;
    if (sRow === row && sCol === col) {
      selected = null;
      clearHighlights();
      return;
    }

    const moves = getLegalMoves(sRow, sCol, board, turn);
    const isLegal = moves.some((m) => m[0] === row && m[1] === col);

    if (isLegal) {
      movePiece(sRow, sCol, row, col);
      selected = null;
      clearHighlights();
      renderBoard();

      // after move: check win/lose/draw & encouragement
      const opponent = turn === "white" ? "black" : "white";
      evaluateGameState(opponent);

      if (!gameOver) {
        turn = opponent;
        updateTurnDisplay();
      }

      return;
    }
  }

  if (!clickedPiece || clickedPiece.color !== turn) return;

  selected = [row, col];
  clearHighlights();
  highlightSelection(row, col);
}

function highlightSelection(row, col) {
  const current = document.querySelector(
    `.square[data-row="${row}"][data-col="${col}"]`
  );
  if (current) current.classList.add("selected");

  const moves = getLegalMoves(row, col, board, turn);
  moves.forEach(([r, c]) => {
    const sq = document.querySelector(
      `.square[data-row="${r}"][data-col="${c}"]`
    );
    if (sq) sq.classList.add("highlight");
  });
}

function movePiece(fromRow, fromCol, toRow, toCol) {
  const source = board[fromRow][fromCol];
  const target = board[toRow][toCol];

  if (target) {
    const value = PIECE_VALUES[target.type] || 0;
    scores[source.color] += value;
    updateScores();

    // encouragement for good capture
    if (value >= 5) {
      setMessage(
        `${capitalize(source.color)} captured a big piece! Nice attack.`
      );
    } else if (value >= 3) {
      setMessage(
        `${capitalize(source.color)} gains material. Keep the pressure.`
      );
    }
  }

  board[toRow][toCol] = source;
  board[fromRow][fromCol] = null;

  // Simple pawn promotion to queen
  if (source.type === "pawn" && (toRow === 0 || toRow === 7)) {
    source.type = "queen";
    setMessage(
      `${capitalize(source.color)} pawn promoted to a queen. Great progress!`
    );
  }
}

function insideBoard(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getLegalMoves(row, col, stateBoard, colorToMove) {
  const piece = stateBoard[row][col];
  if (!piece || piece.color !== colorToMove) return [];
  const { color, type } = piece;
  const dir = color === "white" ? -1 : 1;
  const moves = [];

  // generate pseudo-legal moves first
  if (type === "pawn") {
    const oneStep = row + dir;
    const twoStep = row + 2 * dir;
    if (insideBoard(oneStep, col) && !stateBoard[oneStep][col]) {
      moves.push([oneStep, col]);
      const startRow = color === "white" ? 6 : 1;
      if (
        row === startRow &&
        insideBoard(twoStep, col) &&
        !stateBoard[twoStep][col]
      ) {
        moves.push([twoStep, col]);
      }
    }
    [col - 1, col + 1].forEach((c) => {
      const r = row + dir;
      if (!insideBoard(r, c)) return;
      const target = stateBoard[r][c];
      if (target && target.color !== color) moves.push([r, c]);
    });
  }

  if (type === "rook" || type === "queen") {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      while (insideBoard(r, c)) {
        const target = stateBoard[r][c];
        if (!target) {
          moves.push([r, c]);
        } else {
          if (target.color !== color) moves.push([r, c]);
          break;
        }
        r += dr;
        c += dc;
      }
    });
  }

  if (type === "bishop" || type === "queen") {
    const dirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    dirs.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      while (insideBoard(r, c)) {
        const target = stateBoard[r][c];
        if (!target) {
          moves.push([r, c]);
        } else {
          if (target.color !== color) moves.push([r, c]);
          break;
        }
        r += dr;
        c += dc;
      }
    });
  }

  if (type === "knight") {
    const jumps = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];
    jumps.forEach(([dr, dc]) => {
      const r = row + dr;
      const c = col + dc;
      if (!insideBoard(r, c)) return;
      const target = stateBoard[r][c];
      if (!target || target.color !== color) moves.push([r, c]);
    });
  }

  if (type === "king") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (!insideBoard(r, c)) continue;
        const target = stateBoard[r][c];
        if (!target || target.color !== color) moves.push([r, c]);
      }
    }
  }

  // filter moves that leave own king in check (simple legality)
  return moves.filter(([toR, toC]) =>
    !wouldLeaveKingInCheck(row, col, toR, toC, stateBoard)
  );
}

function findKing(color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === "king") {
        return [r, c];
      }
    }
  }
  return null;
}

function isSquareAttacked(row, col, byColor) {
  // Scan all opponent pieces and see if they have a pseudo-legal move to (row,col)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== byColor) continue;

      const pseudoMoves = getPseudoMoves(r, c, board);
      if (pseudoMoves.some(([mr, mc]) => mr === row && mc === col)) {
        return true;
      }
    }
  }
  return false;
}

function getPseudoMoves(row, col, stateBoard) {
  const piece = stateBoard[row][col];
  if (!piece) return [];
  const { color, type } = piece;
  const dir = color === "white" ? -1 : 1;
  const moves = [];

  if (type === "pawn") {
    // only capture moves matter for attack
    [col - 1, col + 1].forEach((c) => {
      const r = row + dir;
      if (!insideBoard(r, c)) return;
      moves.push([r, c]);
    });
  }

  if (type === "rook" || type === "queen") {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      while (insideBoard(r, c)) {
        moves.push([r, c]);
        if (stateBoard[r][c]) break;
        r += dr;
        c += dc;
      }
    });
  }

  if (type === "bishop" || type === "queen") {
    const dirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    dirs.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;
      while (insideBoard(r, c)) {
        moves.push([r, c]);
        if (stateBoard[r][c]) break;
        r += dr;
        c += dc;
      }
    });
  }

  if (type === "knight") {
    const jumps = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];
    jumps.forEach(([dr, dc]) => {
      const r = row + dr;
      const c = col + dc;
      if (insideBoard(r, c)) moves.push([r, c]);
    });
  }

  if (type === "king") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (insideBoard(r, c)) moves.push([r, c]);
      }
    }
  }

  return moves;
}

function wouldLeaveKingInCheck(fromR, fromC, toR, toC, stateBoard) {
  const temp = stateBoard.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null))
  );

  const piece = temp[fromR][fromC];
  temp[toR][toC] = piece;
  temp[fromR][fromC] = null;

  // find king position after move
  let kingPos = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = temp[r][c];
      if (p && p.color === piece.color && p.type === "king") {
        kingPos = [r, c];
      }
    }
  }
  if (!kingPos) return false;
  const [kR, kC] = kingPos;

  // check if king attacked by opponent in this simulated position
  const opponent = piece.color === "white" ? "black" : "white";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = temp[r][c];
      if (!p || p.color !== opponent) continue;
      const pseudo = getPseudoMoves(r, c, temp);
      if (pseudo.some(([mr, mc]) => mr === kR && mc === kC)) {
        return true;
      }
    }
  }
  return false;
}

function evaluateGameState(sideToMove) {
  const kingPos = findKing(sideToMove);
  if (!kingPos) {
    // king captured: immediate win
    gameOver = true;
    const winner = sideToMove === "white" ? "Black" : "White";
    setMessage(`${winner} wins! King has been captured. Great job!`);
    return;
  }

  const [kR, kC] = kingPos;
  const inCheck = isSquareAttacked(
    kR,
    kC,
    sideToMove === "white" ? "black" : "white"
  );

  // generate any legal move for sideToMove
  let hasMove = false;
  for (let r = 0; r < 8 && !hasMove; r++) {
    for (let c = 0; c < 8 && !hasMove; c++) {
      const p = board[r][c];
      if (!p || p.color !== sideToMove) continue;
      const moves = getLegalMoves(r, c, board, sideToMove);
      if (moves.length > 0) hasMove = true;
    }
  }

  if (!hasMove) {
    gameOver = true;
    if (inCheck) {
      const winner = sideToMove === "white" ? "Black" : "White";
      setMessage(
        `Checkmate! ${winner} wins. Excellent play, that was a strong finish.`
      );
    } else {
      setMessage(
        "Draw! No legal moves available. Nice fight from both sides."
      );
    }
    return;
  }

  // encouragement if one side is ahead in material
  const diff = scores.white - scores.black;
  if (diff >= 8) {
    setMessage("White is far ahead in material. Convert the advantage calmly.");
  } else if (diff <= -8) {
    setMessage(
      "Black is leading. Stay focused, there is always a chance to come back."
    );
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

resetBtn.addEventListener("click", initBoard);
initBoard();
