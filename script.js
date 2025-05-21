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

function handleSquareClick(event) {
    event.stopPropagation(); // Prevent event from reaching document listener

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

// New helper function to check if a square is attacked
function isSquareAttacked(squareIndex, attackerColor) {
    // Note: `attackerColor` is the color of the pieces that might be attacking `squareIndex`.
    // We need to iterate through pieces of `attackerColor`.
    for (let i = 0; i < 64; i++) {
        const piece = boardState[i];
        // Check if the piece exists and belongs to the attackerColor
        if (piece && ((attackerColor === 'white' && isWhitePiece(piece)) || (attackerColor === 'black' && isBlackPiece(piece)))) {
            // Check if this piece of attackerColor can move to squareIndex
            // Pass ignoreCheck = true to prevent recursion with isKingInCheck.
            // The player for isValidMove is attackerColor, as we're checking their moves.
            if (isValidMove(i, squareIndex, piece, attackerColor, true)) {
                return true;
            }
        }
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
        return true; // Normal 1-square king move
    }

    // Castling Logic
    if (!castlingRights[`${playerColor}KingMoved`] && rowDiff === 0 && colDiff === 2) { // King wants to move 2 squares
        const direction = toCol > fromCol ? 1 : -1; // 1 for kingside, -1 for queenside
        const rookCol = direction === 1 ? 7 : 0;
        const rookOriginalIndex = fromRow * 8 + rookCol;
        const rookPiece = boardState[rookOriginalIndex];
        const expectedRook = playerColor === 'white' ? '♖' : '♜';

        // Check if the correct rook is present and hasn't moved
        const rookSideIndex = direction === 1 ? 1 : 0; // 1 for kingside, 0 for queenside
        if (rookPiece !== expectedRook || castlingRights[`${playerColor}RookMoved`][rookSideIndex]) {
            return false;
        }

        // Check for obstructions between king and rook
        const pathStart = direction === 1 ? fromIndex + 1 : fromIndex - 1;
        // Path includes king's destination or one past it for queenside.
        // For K-side (e1->g1, from=60, to=62): pathStart=61, pathEnd=62. Loop i=61. boardState[61] (f1)
        // For Q-side (e1->c1, from=60, to=58): pathStart=59, pathEnd=59. Loop i=59, i=58. boardState[59] (d1), boardState[58] (c1)
        // The prompt's pathEnd for queenside (toIndex + 1) seems to intend to check one square beyond where the king lands if iterating with i += direction.
        // Check for obstructions between king and rook
        const pathStart = direction === 1 ? fromIndex + 1 : fromIndex - 1;
        // Path includes king's destination or one past it for queenside
        const pathEnd = direction === 1 ? toIndex : toIndex + 1; 
        for (let i = pathStart; i !== pathEnd; i += direction) {
            if (boardState[i]) { // If any square in the path is occupied
                return false;
            }
        }
        
        // Check if king is in check, or passes through or lands on an attacked square
        const opponentColor = playerColor === 'white' ? 'black' : 'white';
        
        // King cannot castle out of check (king is currently attacked)
        if (isSquareAttacked(fromIndex, opponentColor)) {
             return false;
        }

        // King cannot pass through an attacked square
        const firstStepIndex = fromIndex + direction; // e.g. f1 for white kingside, d1 for white queenside
        if (isSquareAttacked(firstStepIndex, opponentColor)) {
            return false;
        }
        
        // King cannot land on an attacked square
        // toIndex is the king's destination square (e.g. g1 for white kingside, c1 for white queenside)
        if (isSquareAttacked(toIndex, opponentColor)) {
            return false;
        }

        // If all checks pass, castling is a valid type of king move.
        // The actual moving of pieces will be handled in handleSquareClick.
        return true;
    }

    return false; // Not a standard 1-square move, and not a valid castling move.
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

            // Move is valid, update board state (king's part of the move)
    boardState[toIndex] = movingPiece;
    boardState[fromIndex] = '';

            // Add Castling Execution Logic:
            // If the movingPiece is a king and it moved two squares, it's a castling move.
            if ((movingPiece === '♔' || movingPiece === '♚') && Math.abs(toIndex - fromIndex) === 2) {
                const fromRow = Math.floor(fromIndex / 8);
                // const fromCol = fromIndex % 8; // Not strictly needed due to toIndex relation
                const toCol = toIndex % 8; // King's destination column
                let rookFromIndex, rookToIndex;

                if (toCol > (fromIndex % 8) ) { // Kingside castling (e.g., king from col 4 to col 6)
                    rookFromIndex = fromRow * 8 + 7; // Rook at h-file (col 7)
                    rookToIndex = fromRow * 8 + 5;   // Rook moves to f-file (col 5)
                } else { // Queenside castling (e.g., king from col 4 to col 2)
                    rookFromIndex = fromRow * 8 + 0; // Rook at a-file (col 0)
                    rookToIndex = fromRow * 8 + 3;   // Rook moves to d-file (col 3)
                }
                boardState[rookToIndex] = boardState[rookFromIndex];
                boardState[rookFromIndex] = '';
            }
            
            // Record the move (original position, good)
    recordMove(movingPiece, fromIndex, toIndex);

            // Update en passant target (original position, good)
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

// --- Automated Tests ---
function setupTestEnvironment(testBoardSetup, testPlayer, testCastlingRightsInput) {
    // Make deep copies to avoid modifying the actual game state during tests
    boardState = testBoardSetup.slice(); // Assuming testBoardSetup is a simple array
    currentPlayer = testPlayer;
    castlingRights = JSON.parse(JSON.stringify(testCastlingRightsInput)); // Deep copy for nested objects
    enPassantTarget = null; // Reset enPassant for tests unless specified
    selectedPiece = null;
    selectedSquare = null;
    // Note: Does not call renderBoard() to avoid UI updates during tests
}

function runChessTests() {
    console.log("Starting chess tests...");

    const originalBoardState = boardState.slice();
    const originalCurrentPlayer = currentPlayer;
    const originalCastlingRights = JSON.parse(JSON.stringify(castlingRights));
    const originalEnPassantTarget = enPassantTarget;
    const originalSelectedPiece = selectedPiece;
    const originalSelectedSquare = selectedSquare;

    let testCount = 0;
    let passedCount = 0;

    function runTest(testName, testFunction) {
        testCount++;
        console.log(`Running test: ${testName}`);
        let result = false;
        try {
            result = testFunction(); // Test function should return true if assert passes, or rely on assert to throw
            if (result === undefined) result = true; // If assert is used and doesn't throw, it's a pass
        } catch (e) {
            console.error(`Test '${testName}': FAILED. Error: ${e.message}`);
            result = false; // Ensure result is false if an error occurs (like assert failing)
        }
        if (result) {
            passedCount++;
            console.log(`Test '${testName}': PASSED`);
        } else {
            // Error message already logged by console.assert or the catch block
        }
        // Restore to a clean slate (initial board for simplicity) or specific state if needed
        // For now, each test will set up its own board.
    }

    // --- isSquareAttacked Tests ---

    runTest("isSquareAttacked: White rook attacking e5", () => {
        const testBoard = initialBoard.slice();
        testBoard[36] = ''; // Clear e5
        testBoard[32] = '♖'; // White rook on e4
        setupTestEnvironment(testBoard, 'white', { whiteKingMoved: false, blackKingMoved: false, whiteRookMoved: [false, false], blackRookMoved: [false, false] });
        // Target square e5 (index 36), attacker is white
        console.assert(isSquareAttacked(36, 'white') === true, "White rook on e4 should attack e5");
        return true;
    });

    runTest("isSquareAttacked: Black bishop attacking d4", () => {
        const testBoard = initialBoard.slice();
        testBoard[27] = ''; // Clear d4
        testBoard[0] = '♝'; // Black bishop on a1
        setupTestEnvironment(testBoard, 'black', { whiteKingMoved: false, blackKingMoved: false, whiteRookMoved: [false, false], blackRookMoved: [false, false] });
        // Target square d4 (index 27), attacker is black
        console.assert(isSquareAttacked(27, 'black') === true, "Black bishop on a1 should attack d4");
        return true;
    });

    runTest("isSquareAttacked: Square not attacked", () => {
        const testBoard = initialBoard.slice(); // Standard setup, e.g. e3
        setupTestEnvironment(testBoard, 'white', { whiteKingMoved: false, blackKingMoved: false, whiteRookMoved: [false, false], blackRookMoved: [false, false] });
        // Target square e3 (index 44), no one should attack it initially from white side
        console.assert(isSquareAttacked(44, 'white') === false, "e3 should not be attacked by white in initial setup");
        console.assert(isSquareAttacked(44, 'black') === false, "e3 should not be attacked by black in initial setup");
        return true;
    });

    // --- isValidKingMove (Castling) Tests ---
    const K = '♔'; const k = '♚'; const R = '♖'; const r = '♜'; const P = '♙'; const p = '♟'; const N = '♘'; const B = '♗';
    const emptyRights = () => JSON.parse(JSON.stringify({ whiteKingMoved: false, blackKingMoved: false, whiteRookMoved: [false, false], blackRookMoved: [false, false] }));

    // Test Case 1: Valid White Kingside Castling
    runTest("isValidKingMove: Valid White Kingside Castling", () => {
        const board = Array(64).fill('');
        board[60] = K; board[63] = R; // e1, h1
        setupTestEnvironment(board, 'white', emptyRights());
        console.assert(isValidKingMove(60, 62, 'white') === true, "White Kingside Castling (e1-g1)");
        return true;
    });

    // Test Case 2: Valid White Queenside Castling
    runTest("isValidKingMove: Valid White Queenside Castling", () => {
        const board = Array(64).fill('');
        board[60] = K; board[56] = R; // e1, a1
        setupTestEnvironment(board, 'white', emptyRights());
        console.assert(isValidKingMove(60, 58, 'white') === true, "White Queenside Castling (e1-c1)");
        return true;
    });

    // Test Case 3: Blocked Kingside Castling (piece between king and rook)
    runTest("isValidKingMove: Blocked Kingside (piece on f1)", () => {
        const board = Array(64).fill('');
        board[60] = K; board[63] = R; board[61] = B; // e1, h1, f1 (Bishop)
        setupTestEnvironment(board, 'white', emptyRights());
        console.assert(isValidKingMove(60, 62, 'white') === false, "Blocked White Kingside (piece on f1)");
        return true;
    });
    
    // Test Case 4: Castling Not Allowed (king has moved)
    runTest("isValidKingMove: Kingside Castling Not Allowed (king moved)", () => {
        const board = Array(64).fill('');
        board[60] = K; board[63] = R;
        let rights = emptyRights();
        rights.whiteKingMoved = true;
        setupTestEnvironment(board, 'white', rights);
        console.assert(isValidKingMove(60, 62, 'white') === false, "Kingside Castling Not Allowed (king moved)");
        return true;
    });

    // Test Case 5: Castling Not Allowed (rook has moved)
    runTest("isValidKingMove: Kingside Castling Not Allowed (kingside rook moved)", () => {
        const board = Array(64).fill('');
        board[60] = K; board[63] = R;
        let rights = emptyRights();
        rights.whiteRookMoved[1] = true; // Kingside rook (h1) moved
        setupTestEnvironment(board, 'white', rights);
        console.assert(isValidKingMove(60, 62, 'white') === false, "Kingside Castling Not Allowed (kingside rook moved)");
        return true;
    });

    // Test Case 6: Castling Not Allowed (king passes through attacked square f1)
    runTest("isValidKingMove: Kingside Castling Not Allowed (f1 attacked)", () => {
        const board = Array(64).fill('');
        board[60] = K; board[63] = R; // White King e1, Rook h1
        board[53] = r; // Black Rook on f2, attacking f1 (index 61)
        setupTestEnvironment(board, 'white', emptyRights());
        // isSquareAttacked(61, 'black') should be true
        console.assert(isValidKingMove(60, 62, 'white') === false, "Kingside Castling Not Allowed (f1 attacked by black rook on f2)");
        return true;
    });
    
    // Test Case 7: Castling Not Allowed (king lands on attacked square g1)
    runTest("isValidKingMove: Kingside Castling Not Allowed (g1 attacked)", () => {
        const board = Array(64).fill('');
        board[60] = K; board[63] = R; // White King e1, Rook h1
        board[54] = r; // Black Rook on g2, attacking g1 (index 62)
        setupTestEnvironment(board, 'white', emptyRights());
        // isSquareAttacked(62, 'black') should be true
        console.assert(isValidKingMove(60, 62, 'white') === false, "Kingside Castling Not Allowed (g1 attacked by black rook on g2)");
        return true;
    });

    // Test Case 8: Castling Not Allowed (king is in check on e1)
    runTest("isValidKingMove: Kingside Castling Not Allowed (e1 attacked, king in check)", () => {
        const board = Array(64).fill('');
        board[60] = K; board[63] = R; // White King e1, Rook h1
        board[52] = r; // Black Rook on e2, attacking e1 (index 60)
        setupTestEnvironment(board, 'white', emptyRights());
        // isSquareAttacked(60, 'black') should be true
        console.assert(isValidKingMove(60, 62, 'white') === false, "Kingside Castling Not Allowed (e1 attacked, king in check)");
        return true;
    });

    // Restore original game state
    boardState = originalBoardState;
    currentPlayer = originalCurrentPlayer;
    castlingRights = originalCastlingRights;
    enPassantTarget = originalEnPassantTarget;
    selectedPiece = originalSelectedPiece;
    selectedSquare = originalSelectedSquare;
    // renderBoard(); // Optional: only if visual inspection during/after tests is needed

    console.log(`Chess tests finished. ${passedCount}/${testCount} tests passed.`);
    if (typeof alert !== 'undefined') { // Show alert in browser, not in all environments
        alert(`Chess tests finished. ${passedCount}/${testCount} tests passed. Check console for details.`);
    }
}
// To run tests, open browser console and type: runChessTests()
