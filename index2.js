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
  const snakes = gameData.board.snakes;
  const food = gameData.board.food;
  const hazards = gameData.board.hazards;
  const boardLimit = gameData.board.height;
  // console.log('snakes at turn start:', snakes);

  let moves = ['up', 'right', 'down', 'left'];
  // eliminate possible moves that are out of bounds or part of a snake
  let possibleMoves = filterPossibleMoves(moves, boardLimit, snakeBody, snakes);

  console.log('possibleMoves:', possibleMoves);

  const foodByDistance = sortTargetsByDistance(food, head);

  console.log('food by distance:', foodByDistance);
  
  let move;

  if (possibleMoves.length === 1) {
    move = possibleMoves[0];
  }

  let bestMoveTowardsFood = getMoveTowardsTarget(possibleMoves, foodByDistance[0], snakeBody);

  console.log('best move towards food:', bestMoveTowardsFood);

  move = bestMoveTowardsFood;

  // console.log('current direction:', getCurrentDirection(head, neck));
  console.log('confirming move:', move);

  response.status(200).send({
    move: move,
    shout: 'serenity now!'
  });
}

//! ********** decision making indicators **********
// calculate distance from snake head
function getDiffX(coord, head) {
  return head.x - coord.x;
}

function getDiffY(coord, head) {
  return head.y - coord.y;
}

function getDistanceFromHead(coord,head) {
  let diffX = getDiffX(coord, head);
  let diffY = getDiffY(coord, head);

  if (diffX < 0) {
    diffX *= -1;
  }

  if (diffY < 0) {
    diffY *= -1;
  }

  // console.log('diffX:', diffX);
  // console.log('diffY:', diffY);
  // console.log('distance from head:', diffX + diffY);
  return diffX + diffY;
}

function sortTargetsByDistance(array, head) {
  const arrSortedByDistance = array.sort((a,b) => getDistanceFromHead(a, head) - getDistanceFromHead(b, head));
  console.log('closest target:', arrSortedByDistance[0]);
  return arrSortedByDistance;
}

function getMoveTowardsTarget(moves, target, snakeBody) {
  const directionMatrix = {
    left: 'right',
    up: 'down',
    right: 'left',
    down: 'up'
  };

  const head = snakeBody[0];
  const neck = snakeBody[1];
  // of possible moves, determine which move will get to food in minimum steps
  const currentDirection = getCurrentDirection(head, neck);
  const oppositeDirection = directionMatrix[currentDirection];

  const newMoves = moves.filter(move => move !== oppositeDirection);

  //? if positive diffX, coord is to the LEFT of head
  //? if negative diffX, coord is to the RIGHT of head
  //? if positive diffY, coord is to the DOWN of head
  //? if negative diffY, coord is to the UP of head

  console.log('possible moves in getMoveFn:', newMoves);

  let sortedMovesByDistanceFromHead = newMoves.sort((a,b) => getDistanceFromHead(moveAsCoord(a, head), target) - getDistanceFromHead(moveAsCoord(b, head), target));

  console.log('sortedMoves:', sortedMovesByDistanceFromHead);

  return sortedMovesByDistanceFromHead[0];

};

//! ********** identity functions **********
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

function getCurrentDirection(head, neck) {
  if (head.x - neck.x === 0 && head.y - neck.y === -1) {
    return 'down';
  } else if (head.x - neck.x === 0 && head.y - neck.y === 1) {
    return 'up';
  } else if (head.x - neck.x === -1 && head.y - neck.y === 0) {
    return 'left';
  } else return 'right';
};

//! ********** validation tests **********
function offBoard(position, boardLimit) {
  if (position.x > boardLimit - 1 || position.x < 0) {
    return true;
  }
  else if (position.y > boardLimit - 1 || position.y < 0) {
    return true;
  } else {
    return false;
  }
}

function areCoordsEqual(coord, compareCoord) {
  return coord.x === compareCoord.x && coord.y === compareCoord.y;
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

function handleEnd(request, response) {
  const gameData = request.body

  console.log('END')
  response.status(200).send('ok')
}
