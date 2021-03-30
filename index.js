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
  const snakeBody = gameData.you.body[1];
  const tail = gameData.you.body[gameData.you.body.length-1];
  const length = gameData.you.length;
  const snakes = gameData.board.snakes;
  const food = gameData.board.food;
  const hazards = gameData.board.hazards;
  const boardLimit = gameData.board.height;

  let possibleMoves = ['up', 'right', 'down', 'left'];

  const closestFoods = findClosestFood(food, head);
  console.log('head:', head);
  console.log('my body:', gameData.you.body);

  for (let i = 0; i < closestFoods.length; i++) {
    const moveToFood = moveTowardsClosestFood(closestFoods[i], head);
    const coord = moveAsCoord(moveToFood, head); 
    if (!offBoard(coord, boardLimit) && !coordEqual(coord, snakeBody)) {
      console.log('MOVE:', moveToFood)
      response.status(200).send({ move: moveToFood });
    }
  }
}

function distanceFromHead(coord,head) {
  const diffX = head.x - coord.x;
  const diffY = head.y - coord.y;
  return (diffX * diffX) + (diffY * diffY);
}

function findClosestFood(foodArray, head) {
  const foodByDistance = foodArray.sort(food => distanceFromHead(food, head));
  console.log('closest food:', foodByDistance[0]);
  return foodByDistance;
}

function moveTowardsClosestFood(food, head) {
  let possibleMoves = ['up', 'right', 'down', 'left'];

  const distanceDiffX = food.x - head.x;
  const distanceDiffY = head.y - food.y;

  console.log('distanceDiffX:', distanceDiffX);
  console.log('distanceDiffY:', distanceDiffY);

  let diffX = food.x - head.x;
  let diffY = head.y - food.y;

  // absolute difference in distance
  if (diffX < 0) {
    diffX *= -1;
  }

  if (diffY < 0) {
    diffY *= -1;
  }

  if (diffX === 0) {
    if (distanceDiffY > 0) {
      return 'down';
    } else {
      return 'up';
    }
  } 
  
  if (diffY === 0) {
    if (distanceDiffX > 0) {
      return 'left';
    } else {
      return 'right';
    }
  }

  if (diffX < diffY) {
    if (distanceDiffX > 0) {
      return 'right';
    } else {
      return 'left';
    }
  } else if (diffY < diffX) {
    if (distanceDiffY > 0) {
      return 'up';
    } else {
      return 'down';
    }
  } else {
    return 'right';
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

function offBoard(position, boardLimit) {
  if (position.x > boardLimit) return true;
  if (position.x < 0) return true;
  if (position.y > boardLimit) return true;
  if (position.y < 0) return true;
  return false;
}

function coordEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function handleEnd(request, response) {
  const gameData = request.body

  console.log('END')
  response.status(200).send('ok')
}
