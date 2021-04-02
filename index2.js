const bodyParser = require('body-parser')
const express = require('express')

const PORT = process.env.PORT || 3000

const app = express()
app.use(bodyParser.json())

app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)

app.listen(PORT, () => console.log(`Battlesnake Server listening at http://127.0.0.1:${PORT}`))

function handleIndex(request, response) {
  var battlesnakeInfo = {
    apiversion: '1',
    author: 'the_steve',
    color: '#e71d36',
    head: 'evil',
    tail: 'weight'
  }
  response.status(200).json(battlesnakeInfo)
}

function handleStart(request, response) {
  const gameData = request.body

  console.log('START');
  response.status(200).send('ok')
}

function handleMove(request, response) {
  const gameData = request.body;
  console.log('gameData:', gameData);

  const head = gameData.you.head;
  const neck = gameData.you.body[1];
  const snakeBody = gameData.you.body;
  const tail = gameData.you.body[gameData.you.body.length-1];
  // let snakes = gameData.board.snakes.map(snake => snake.body).flat();
  const snakes = gameData.board.snakes;
  console.log('snakes:', snakes);
  const food = gameData.board.food;
  const hazards = gameData.board.hazards;
  const boardLimit = gameData.board.height;
  console.log('snakes at turn start:', snakes);

  let moves = ['up', 'right', 'down', 'left'];
  // eliminate possible moves that are out of bounds or part of a snake
  let possibleMoves = filterPossibleMoves(moves, boardLimit, snakeBody, snakes);

  console.log('possibleMoves:', possibleMoves);
  
  let move = possibleMoves[0];

  if (possibleMoves.length === 1) {
    move = possibleMoves[0];
  }

  console.log('moving to:', move);

  response.status(200).send({
    move: move,
    shout: 'serenity now!'
  });
}

function filterPossibleMoves(array, boardLimit, snakeBody, snakes) {
  // identify neck to prevent immediately moving into body
  const snakesAsOne = snakes.map(snake => snake.body).flat();
  const head = snakeBody[0];
  const neck = snakeBody[1];
  const possibleMoves = array.filter(move => {
    // avoid any existing snake body coordinates
    if (!snakesAsOne.some(snake => snake.x === moveAsCoord(move, head).x && snake.y === moveAsCoord(move, head).y)) {
      return !offBoard(moveAsCoord(move, head), boardLimit) && !areCoordsEqual(moveAsCoord(move, head), neck);
    }
  });

  return possibleMoves;
}

// calculate distance from snake head
function distanceFromHead(coord,head) {
  let diffX = head.x - coord.x;
  let diffY = head.y - coord.y;

  if (diffX < 0) {
    diffX *= -1;
  }

  if (diffY < 0) {
    diffY *= -1;
  }

  return (diffX + diffY);
}

function moveAsCoord(move, head) {
  switch(move) {
    case 'up':
      return {x: head.x, y: head.y+1};
    case 'down':
      return {x: head.x, y:head.y-1};
    case 'left':
      return {x: head.x-1, y: head.y};
    case 'right':
      return {x: head.x+1, y: head.y};
  }
}

function offBoard(position, boardLimit) {
  if (position.x > boardLimit - 1 || position.x < 0) {
    console.log(`{ ${position.x}, ${position.y} } is off board!`);
    return true;
  }
  else if (position.y > boardLimit - 1 || position.y < 0) {
    console.log(`{ ${position.x}, ${position.y} } is off board!`);
    return true;
  } else {
    return false;
  }
}

function areCoordsEqual(coord, compareCoord) {
  console.log('are coords equal?:', coord.x === compareCoord.x && coord.y === compareCoord.y);
  return coord.x === compareCoord.x && coord.y === compareCoord.y;
}

function handleEnd(request, response) {
  const gameData = request.body

  console.log('END')
  response.status(200).send('ok')
}
