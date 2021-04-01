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
    color: '#72efdd',
    head: 'silly',
    tail: 'curled'
  }
  response.status(200).json(battlesnakeInfo)
}

function handleStart(request, response) {
  const gameData = request.body

  console.log('START')
  response.status(200).send('ok')
}

function handleMove(request, response) {
  const gameData = request.body;
  console.log('gameData:', gameData);

  const head = gameData.you.head;
  const snakeBody = gameData.you.body;
  const tail = gameData.you.body[gameData.you.body.length-1];
  const snakes = gameData.board.snakes.map(snake => snake.body).flat();
  console.log('starting snakes:', snakes);
  const food = gameData.board.food;
  const hazards = gameData.board.hazards;
  const boardLimit = gameData.board.height;

  let possibleMoves = ['up', 'right', 'down', 'left'];

  // arrange foods by closest distance
  let closestFoods = findClosestFood(food, head);
  // console.log('head:', head);
  // console.log('my body:', snakeBody);

  let move = moveTo(closestFoods, head, snakeBody, boardLimit, snakes);
  response.status(200).send({ move: move });
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

// sort all foods in game by distance closest to snake head
function findClosestFood(foodArray, head) {
  const foodByDistance = foodArray.sort(food => distanceFromHead(food, head));
  console.log('closest food:', foodByDistance[0]);
  return foodByDistance;
}

function moveTowardsClosestFood(food, head, snakeBody, boardLimit, snakes) {
  // console.log('snakes in movetowards:', snakes);
  const distanceDiffX = food.x - head.x;
  const distanceDiffY = food.y - head.y;
  const position = { distanceDiffX, distanceDiffY }
  console.log('move towards position:', position);

  let possibleMoves = ['up', 'right', 'down', 'left']

  // let possibleMoves = [moveAsCoord('up', head), moveAsCoord('right', head), moveAsCoord('down', head), moveAsCoord('left', head)];

  let newPossibleMoves = possibleMoves.filter(move => !offBoard(moveAsCoord(move, head), boardLimit) && !coordEqual(moveAsCoord(move, head), snakeBody) && !coordEqual(moveAsCoord(move, head), snakes));

  console.log('new possible moves:', newPossibleMoves);

  let newPossibleMovesAsCoords = newPossibleMoves.map((move) => {
    return moveAsCoord(move, head);
  });

  console.log('newPossibleMovesAsCoords:', newPossibleMovesAsCoords);

  let diffX = food.x - head.x;
  let diffY = food.y - head.y;

  if (newPossibleMoves.length === 1) {
    return newPossibleMoves[0];
  }
  // absolute difference in distance
  if (diffX < 0) {
    diffX *= -1;
  }

  if (diffY < 0) {
    diffY *= -1;
  }

  if (diffX === 0) {
    if (distanceDiffY > 0 && newPossibleMoves.includes('up')) {
      return 'up';
    } else {
      return 'down';
    }
  } 
  
  if (diffY === 0) {
    if (distanceDiffX > 0 && newPossibleMoves.includes('right')) {
      return 'right';
    } else {
      return 'left';
    }
  }

  if (diffX < diffY) {
    if (distanceDiffX > 0 && newPossibleMoves.includes('right')) {
      return 'right';
    } else {
      return 'left';
    }
  } else if (diffY < diffX && newPossibleMoves.includes('up')) {
    if (distanceDiffY > 0) {
      return 'up';
    } else {
      return 'down';
    }
  } else if (diffX === diffY) {
    console.log('diffX ' + diffX + ' = diffY ' + diffY);
    // invalidate any moves that cannot be made
    for (let mv of newPossibleMoves) {
      console.log('mv:', mv);
      let coord = moveAsCoord(mv, head);
      if (distanceDiffX > 0 && !offBoard(coord, boardLimit) && !coordEqual(coord, snakeBody) && !coordEqual(moveAsCoord, snakes)) {
        console.log('this is the move from else:', mv);
        return mv;
      }
    }
  }
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

function moveTo(array, head, snakeBody, boardLimit, snakes) {
  // iterate through the sorted foods array and return the first move that passes the validation (not off board, not part of body)
  // console.log('snakes in moveTo:', snakes);
  console.log('head:', head);
  console.log('array in moveTo:', array);

  for (let i = 0; i < array.length; i++) {
    console.log('array[i] (closest food):', array[i]);
    let moveToFood = moveTowardsClosestFood(array[i], head, snakeBody, boardLimit, snakes);
    let coord = moveAsCoord(moveToFood, head); 
    console.log('moveToFood:', moveToFood);
    console.log('coord:', coord);
    if (!offBoard(coord, boardLimit) && !coordEqual(coord, snakeBody) && !coordEqual(coord, snakes)) {
      console.log('moveToFood valid!:', moveToFood);
      move = moveToFood;
      console.log('MOVE CONFIRMED:', move);
      return move;
    }
  }
}

function offBoard(position, boardLimit) {
  console.log('board limit:', boardLimit-1);
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

function coordEqual(coord, coordArray) {
  // return coord.x === coordArray.some(position => position.x) && coord.y === coordArray.some(position => position.y);
  if (coordArray.some(coordinate => coordinate.x === coord.x && coordinate.y === coord.y) && coordArray.some(coordinate => coordinate.y === coord.y && coordinate.x === coord.x)) {
    console.log(`coord { ${coord.x}, ${coord.y} } not valid!`);
    return true;
  } else {
    return false;
  }
}

function handleEnd(request, response) {
  const gameData = request.body

  console.log('END')
  response.status(200).send('ok')
}
