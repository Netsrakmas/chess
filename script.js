// Game Configuration
let singlePlayer = true; // Enable single-player mode against AI

// Initial Board Setup
const initialBoard = [
    '♜','♞','♝','♛','♚','♝','♞','♜',
    '♟','♟','♟','♟','♟','♟','♟','♟',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    '♙','♙','♙','♙','♙','♙','♙','♙',
    '♖','♘','♗','♕','♔','♗','♘','♖'
];

// Game State Variables
let boardState = initialBoard.slice();
let currentPlayer = 'white';
let selectedPiece = null;
let selectedSquare = null;
let enPassantTarget = null;
let castlingRights = {
    whiteKingMoved: false,
    blackKingMoved: false,
    whiteRookMoved: [false, false], // [Queenside, Kingside]
    blackRookMoved: [false, false],
};
let moveHistory = [];

// DOM Elements
const chessboard = document.getElementById('chessboard');

// Game Initialization
renderBoard();
updatePlayerTurnDisplay();

if (singlePlayer && currentPlayer === 'black') {
    setTimeout(makeAIMove, 500);
}

// Event Listeners
document.getElementById('reset-button').addEventListener('click', resetGame);

// Deselect the selected piece when clicking outside the board
document.addEventListener('click', function(event) {
    const isClickInsideBoard = chessboard.contains(event.target);
    if (!isClickInsideBoard && selectedPiece !== null) {
        selectedPiece = null;
        selectedSquare = null;
        renderBoard();
    }
});

// Helper Functions

function renderBoard() {
    clearHighlights();
    chessboard.innerHTML = ''; // Clear the board

    // Check if the kings are in check
    const whiteInCheck = isKingInCheck('white');
    const blackInCheck = isKingInCheck('black');

    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');
        square.dataset.index = i;
        const row = Math.floor(i / 8);
        const col = i % 8;

        if ((row + col) % 2 === 0) {
            square.classList.add('light');
        } else {
            square.classList.add('dark');
        }

        const piece = boardState[i];
        if (piece) {
            const pieceElement = document.createElement('div');
            pieceElement.textContent = piece;
            pieceElement.classList.add('piece');

            // Highlight the king if in check
            if (piece === '♔' && whiteInCheck) {
                pieceElement.classList.add('king-in-check');
            } else if (piece === '♚' && blackInCheck) {
                pieceElement.classList.add('king-in-check');
            }

            square.appendChild(pieceElement);
        }

        square.addEventListener('click', handleSquareClick);
        chessboard.appendChild(square);
    }
}

function clearHighlights() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.classList.remove('selected');
        square.classList.remove('highlight');
    });
}

function updatePlayerTurnDisplay() {
    const playerTurnDiv = document.getElementById('player-turn');
    playerTurnDiv.textContent = `Current Turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
}

function handleSquareClick() {
    const index = parseInt(this.dataset.index);
    const piece = boardState[index];

    if (selectedPiece !== null && selectedSquare !== null) {
        const fromIndex = selectedSquare;
        const toIndex = index;
        const movingPiece = selectedPiece;

        if (isValidMove(fromIndex, toIndex, movingPiece, currentPlayer)) {
            // Move is valid, update board state
            boardState[toIndex] = movingPiece;
            boardState[fromIndex] = '';

            // Record the move
            recordMove(movingPiece, fromIndex, toIndex);

            // Update en passant target
            if (movingPiece === '♙' || movingPiece === '♟') {
                const fromRow = Math.floor(fromIndex / 8);
                const toRow = Math.floor(toIndex / 8);
                if (Math.abs(toIndex - fromIndex) === 16) {
                    enPassantTarget = (fromIndex + toIndex) / 2;
                } else {
                    enPassantTarget = null;
                }
            } else {
                enPassantTarget = null;
            }

            // Update castling rights
            updateCastlingRights(movingPiece, fromIndex);

            // Check for promotion
            if ((movingPiece === '♙' && Math.floor(toIndex / 8) === 0) ||
                (movingPiece === '♟' && Math.floor(toIndex / 8) === 7)) {
                promotePawn(toIndex, currentPlayer);
            }

            // Switch player
            currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
            updatePlayerTurnDisplay();
            renderBoard();

            // Check for checkmate
            if (isKingInCheck(currentPlayer) && isCheckmate(currentPlayer)) {
                alert(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in checkmate!`);
            }

            if (singlePlayer && currentPlayer === 'black') {
                setTimeout(makeAIMove, 500); // Delay for better UX
            }
        } else {
            // Invalid move
            alert('Invalid move!');
        }
        selectedPiece = null;
        selectedSquare = null;
        renderBoard();
    } else if (piece && ((currentPlayer === 'white' && isWhitePiece(piece)) || (currentPlayer === 'black' && isBlackPiece(piece)))) {
        selectedPiece = piece;
        selectedSquare = index;
        renderBoard();
        highlightSelectedSquare(index);
        highlightPossibleMoves(index, piece);
    }
}

function isWhitePiece(piece) {
    return '♙♖♘♗♕♔'.includes(piece);
}

function isBlackPiece(piece) {
    return '♟♜♞♝♛♚'.includes(piece);
}

function isValidMove(fromIndex, toIndex, piece, player, ignoreCheck = false) {
    // Check for own piece at destination
    const destinationPiece = boardState[toIndex];
    if (destinationPiece && ((isWhitePiece(destinationPiece) && isWhitePiece(piece)) || (isBlackPiece(destinationPiece) && isBlackPiece(piece)))) {
        return false;
    }

    let isValidMove = false;
    if (piece === '♙' || piece === '♟') {
        isValidMove = isValidPawnMove(fromIndex, toIndex, piece, player);
    } else if (piece === '♖' || piece === '♜') {
        isValidMove = isValidRookMove(fromIndex, toIndex);
    } else if (piece === '♗' || piece === '♝') {
        isValidMove = isValidBishopMove(fromIndex, toIndex);
    } else if (piece === '♘' || piece === '♞') {
        isValidMove = isValidKnightMove(fromIndex, toIndex);
    } else if (piece === '♕' || piece === '♛') {
        isValidMove = isValidQueenMove(fromIndex, toIndex);
    } else if (piece === '♔' || piece === '♚') {
        isValidMove = isValidKingMove(fromIndex, toIndex, player);
    }

    if (isValidMove && !ignoreCheck) {
        // Temporarily make the move and check for check
        const originalPiece = boardState[toIndex];
        boardState[toIndex] = piece;
        boardState[fromIndex] = '';

        const inCheck = isKingInCheck(player);

        // Revert the move
        boardState[fromIndex] = piece;
        boardState[toIndex] = originalPiece;

        if (inCheck) {
            return false;
        }
    }

    return isValidMove;
}

// Movement Functions

function isValidPawnMove(fromIndex, toIndex, piece, playerColor) {
    const direction = isWhitePiece(piece) ? -1 : 1;
    const fromRow = Math.floor(fromIndex / 8);
    const fromCol = fromIndex % 8;
    const toRow = Math.floor(toIndex / 8);
    const toCol = toIndex % 8;
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const destinationPiece = boardState[toIndex];

    // Standard move forward
    if (colDiff === 0 && rowDiff === direction && !destinationPiece) {
        return true;
    }

    // Double move from starting position
    if (colDiff === 0 && rowDiff === 2 * direction && !destinationPiece && !boardState[fromIndex + direction * 8]) {
        if ((isWhitePiece(piece) && fromRow === 6) || (isBlackPiece(piece) && fromRow === 1)) {
            return true;
        }
    }

    // Capture move
    if (Math.abs(colDiff) === 1 && rowDiff === direction && destinationPiece && ((isWhitePiece(piece) && isBlackPiece(destinationPiece)) || (isBlackPiece(piece) && isWhitePiece(destinationPiece)))) {
        return true;
    }

    // En Passant
    if (Math.abs(colDiff) === 1 && rowDiff === direction && toIndex === enPassantTarget) {
        // Remove the captured pawn
        const capturedPawnIndex = toIndex + (isWhitePiece(piece) ? 8 : -8);
        boardState[capturedPawnIndex] = '';
        return true;
    }

    return false;
}

function isValidRookMove(fromIndex, toIndex) {
    const fromRow = Math.floor(fromIndex / 8);
    const toRow = Math.floor(toIndex / 8);
    const fromCol = fromIndex % 8;
    const toCol = toIndex % 8;

    if (fromRow !== toRow && fromCol !== toCol) {
        return false;
    }

    // Check for obstructions
    const stepRow = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
    const stepCol = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);

    let currentRow = fromRow + stepRow;
    let currentCol = fromCol + stepCol;

    while (currentRow !== toRow || currentCol !== toCol) {
        const index = currentRow * 8 + currentCol;
        if (boardState[index]) {
            return false;
        }
        currentRow += stepRow;
        currentCol += stepCol;
    }
    return true;
}

function isValidBishopMove(fromIndex, toIndex) {
    const fromRow = Math.floor(fromIndex / 8);
    const fromCol = fromIndex % 8;
    const toRow = Math.floor(toIndex / 8);
    const toCol = toIndex % 8;

    if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) {
        return false;
    }

    // Check for obstructions
    const stepRow = toRow > fromRow ? 1 : -1;
    const stepCol = toCol > fromCol ? 1 : -1;

    let currentRow = fromRow + stepRow;
    let currentCol = fromCol + stepCol;

    while (currentRow !== toRow && currentCol !== toCol) {
        const index = currentRow * 8 + currentCol;
        if (boardState[index]) {
            return false;
        }
        currentRow += stepRow;
        currentCol += stepCol;
    }
    return true;
}

function isValidKnightMove(fromIndex, toIndex) {
    const fromRow = Math.floor(fromIndex / 8);
    const fromCol = fromIndex % 8;
    const toRow = Math.floor(toIndex / 8);
    const toCol = toIndex % 8;

    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);

    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

function isValidQueenMove(fromIndex, toIndex) {
    return isValidRookMove(fromIndex, toIndex) || isValidBishopMove(fromIndex, toIndex);
}

function isValidKingMove(fromIndex, toIndex, playerColor) {
    const fromRow = Math.floor(fromIndex / 8);
    const fromCol = fromIndex % 8;
    const toRow = Math.floor(toIndex / 8);
    const toCol = toIndex % 8;

    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);

    // Standard king move
    if (rowDiff <= 1 && colDiff <= 1) {
        return true;
    }

    // Castling
    if (!castlingRights[`${playerColor}KingMoved`] && rowDiff === 0 && colDiff === 2) {
        const direction = toCol > fromCol ? 1 : -1;
        const rookCol = direction === 1 ? 7 : 0;
        const rookIndex = fromRow * 8 + rookCol;
        const rook = boardState[rookIndex];
        if (rook && ((playerColor === 'white' && rook === '♖') || (playerColor === 'black' && rook === '♜'))) {
            const betweenSquares = direction === 1
                ? [fromIndex + 1, fromIndex + 2]
                : [fromIndex - 1, fromIndex - 2, fromIndex - 3];

            // Check if squares between king and rook are empty
            for (let squareIndex of betweenSquares) {
                if (boardState[squareIndex]) {
                    return false;
                }
            }

            // Check if king passes through check
            for (let squareIndex of [fromIndex, ...betweenSquares]) {
                // Temporarily move king
                const originalPiece = boardState[squareIndex];
                boardState[squareIndex] = boardState[fromIndex];
                boardState[fromIndex] = '';

                if (isKingInCheck(playerColor)) {
                    // Revert move
                    boardState[fromIndex] = boardState[squareIndex];
                    boardState[squareIndex] = originalPiece;
                    return false;
                }

                // Revert move
                boardState[fromIndex] = boardState[squareIndex];
                boardState[squareIndex] = originalPiece;
            }

            // Perform castling
            boardState[toIndex] = boardState[fromIndex];
            boardState[fromIndex] = '';
            // Move rook
            const newRookIndex = fromRow * 8 + (fromCol + direction);
            boardState[newRookIndex] = rook;
            boardState[rookIndex] = '';

            // Update castling rights
            castlingRights[`${playerColor}KingMoved`] = true;
            if (direction === 1) {
                castlingRights[`${playerColor}RookMoved`][1] = true;
            } else {
                castlingRights[`${playerColor}RookMoved`][0] = true;
            }

            return false; // Return false because move has been handled
        }
    }

    return false;
}

function isKingInCheck(playerColor) {
    const kingPiece = playerColor === 'white' ? '♔' : '♚';
    const kingIndex = boardState.indexOf(kingPiece);
    if (kingIndex === -1) {
        // King is captured, game over
        return true;
    }

    // Check all enemy pieces to see if any can attack the king
    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (piece && ((playerColor === 'white' && isBlackPiece(piece)) || (playerColor === 'black' && isWhitePiece(piece)))) {
            if (isValidMove(i, kingIndex, piece, playerColor === 'white' ? 'black' : 'white', true)) {
                return true;
            }
        }
    }
    return false;
}

function isCheckmate(playerColor) {
    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (piece && ((playerColor === 'white' && isWhitePiece(piece)) || (playerColor === 'black' && isBlackPiece(piece)))) {
            for (let j = 0; j < 64; j++) {
                if (isValidMove(i, j, piece, playerColor)) {
                    // Found a valid move
                    return false;
                }
            }
        }
    }
    return true;
}

function promotePawn(toIndex, playerColor) {
    const choices = playerColor === 'white' ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞'];
    const choice = prompt('Promote to (Q, R, B, N):', 'Q');
    let piece;
    switch (choice.toUpperCase()) {
        case 'Q':
            piece = choices[0];
            break;
        case 'R':
            piece = choices[1];
            break;
        case 'B':
            piece = choices[2];
            break;
        case 'N':
            piece = choices[3];
            break;
        default:
            piece = choices[0];
    }
    boardState[toIndex] = piece;
}

function updateCastlingRights(piece, fromIndex) {
    if (piece === '♔') {
        castlingRights.whiteKingMoved = true;
    } else if (piece === '♚') {
        castlingRights.blackKingMoved = true;
    } else if (piece === '♖') {
        // Determine which rook moved
        if (fromIndex === 56) {
            castlingRights.whiteRookMoved[0] = true;
        } else if (fromIndex === 63) {
            castlingRights.whiteRookMoved[1] = true;
        }
    } else if (piece === '♜') {
        if (fromIndex === 0) {
            castlingRights.blackRookMoved[0] = true;
        } else if (fromIndex === 7) {
            castlingRights.blackRookMoved[1] = true;
        }
    }
}

function highlightSelectedSquare(index) {
    const square = document.querySelector(`.square[data-index='${index}']`);
    square.classList.add('selected');
}

function highlightPossibleMoves(fromIndex, piece) {
    for (let i = 0; i < 64; i++) {
        if (isValidMove(fromIndex, i, piece, currentPlayer)) {
            const square = document.querySelector(`.square[data-index='${i}']`);
            square.classList.add('highlight');
        }
    }
}

function resetGame() {
    boardState = initialBoard.slice();
    currentPlayer = 'white';
    castlingRights = {
        whiteKingMoved: false,
        blackKingMoved: false,
        whiteRookMoved: [false, false],
        blackRookMoved: [false, false],
    };
    enPassantTarget = null;
    selectedPiece = null;
    selectedSquare = null;
    moveHistory = [];
    updateMoveHistoryDisplay();
    updatePlayerTurnDisplay();
    renderBoard();
}

function makeAIMove() {
    const possibleMoves = [];

    // Find all AI pieces
    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        if (piece && ((currentPlayer === 'white' && isWhitePiece(piece)) || (currentPlayer === 'black' && isBlackPiece(piece)))) {
            // Find all valid moves for this piece
            for (let j = 0; j < 64; j++) {
                if (isValidMove(i, j, piece, currentPlayer)) {
                    possibleMoves.push({ from: i, to: j, piece: piece });
                }
            }
        }
    }

    if (possibleMoves.length === 0) {
        if (isKingInCheck(currentPlayer)) {
            alert(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in checkmate!`);
        } else {
            alert(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} has no valid moves. Stalemate!`);
        }
        return;
    }

    // Choose a random move
    const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    const movingPiece = move.piece;
    const fromIndex = move.from;
    const toIndex = move.to;

    // Update board state
    boardState[toIndex] = movingPiece;
    boardState[fromIndex] = '';

    // Record the move
    recordMove(movingPiece, fromIndex, toIndex);

    // Update en passant target
    if (movingPiece === '♙' || movingPiece === '♟') {
        const fromRow = Math.floor(fromIndex / 8);
        const toRow = Math.floor(toIndex / 8);
        if (Math.abs(toIndex - fromIndex) === 16) {
            enPassantTarget = (fromIndex + toIndex) / 2;
        } else {
            enPassantTarget = null;
        }
    } else {
        enPassantTarget = null;
    }

    // Update castling rights
    updateCastlingRights(movingPiece, fromIndex);

    // Check for promotion
    if ((movingPiece === '♙' && Math.floor(toIndex / 8) === 0) ||
        (movingPiece === '♟' && Math.floor(toIndex / 8) === 7)) {
        // Auto-promote to queen
        boardState[toIndex] = isWhitePiece(movingPiece) ? '♕' : '♛';
    }

    // Switch player
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    updatePlayerTurnDisplay();
    renderBoard();

    // Check for checkmate
    if (isKingInCheck(currentPlayer) && isCheckmate(currentPlayer)) {
        alert(`${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in checkmate!`);
    }
}

function recordMove(piece, fromIndex, toIndex) {
    const fromSquare = indexToSquareName(fromIndex);
    const toSquare = indexToSquareName(toIndex);
    const move = `${piece} ${fromSquare} ➔ ${toSquare}`;
    moveHistory.push(move);
    updateMoveHistoryDisplay();
}

function indexToSquareName(index) {
    const file = 'abcdefgh'[index % 8];
    const rank = 8 - Math.floor(index / 8);
    return `${file}${rank}`;
}

function updateMoveHistoryDisplay() {
    const moveHistoryList = document.getElementById('move-history');
    moveHistoryList.innerHTML = '';
    moveHistory.forEach((move, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = move;
        moveHistoryList.appendChild(listItem);
    });
}
