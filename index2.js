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
    color: '#BE0F34',
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
  const snakeBody = gameData.you.body;
  const snakes = gameData.board.snakes;
  const food = gameData.board.food;
  const hazards = gameData.board.hazards;
  const boardHeight = gameData.board.height;
  const boardWidth = gameData.board.width;

  let moves = ['up', 'right', 'down', 'left'];

  const obstacles = combineSnakesHazards(snakes,hazards,head);
  // eliminate possible moves that are out of bounds or hazardous
  let possibleMoves = filterPossibleMoves(moves, boardHeight, boardWidth, snakeBody, snakes, hazards);

  const enemySnakeHeads = snakes
    .map(snake => snake.head)
    .flat()
    .filter(snek => snek.x !== head.x && snek.y !== head.y);
  
  console.log('my head:', head);
  console.log('enemy snake heads:', enemySnakeHeads);

  const foodByDistance = sortTargetsByDistance(food, head);

  console.log('food by distance:', foodByDistance);
  
  let move;
  let shout;

  if (snakes.length === 2) { //! ********** go for the kill **********
    const enemy = snakes.find(snake => snake.id !== gameData.you.id);

    if (enemy.length < gameData.you.length) {
      move = getMoveTowardsTarget(possibleMoves, enemy.head, snakeBody);
      shout = 'BOOM, headshot!';
      console.log('********** GOING FOR THE KILL:', move);
    }
  }

  if (possibleMoves.length === 1) {
    move = possibleMoves[0];
    shout = `Mom's spaghetti`;
  } else {
    const movesSortedByOpenSpace = findOpenSpace(possibleMoves, snakeBody, obstacles, boardHeight, boardWidth);
    const bestMoveTowardsOpenSpace = movesSortedByOpenSpace[0];
    
    console.log('moves by most safe area:', movesSortedByOpenSpace);

    if (movesSortedByOpenSpace !== undefined) {
      console.log('best move to open space:', bestMoveTowardsOpenSpace.id, bestMoveTowardsOpenSpace.mostSpace);
  
      let bestMoveTowardsFood = getMoveTowardsTarget(possibleMoves, foodByDistance[0], snakeBody);
  
      console.log('best move towards food:', bestMoveTowardsFood);
      // validate how much space available in move towards food
      const spaceForBestFoodMove = getOpenSpace(bestMoveTowardsFood, movesSortedByOpenSpace);
  
      console.log('space available for best food move:', spaceForBestFoodMove);
  
      //!identify the closest snake, identify their head and if the closest hazard is that snake's head, move towards open space
  
      if (spaceForBestFoodMove <= 4) {
        const snakeHeadsArray = 
          snakes.map(snake => snake.head)
            .flat()
            .filter(snakeHead => snakeHead.x !== head.x && snakeHead.y !== head.y);
  
        const closestSnakeHead = sortTargetsByDistance(snakeHeadsArray, bestMoveTowardsFood)[0];
        console.log('closestSnakeHead:', closestSnakeHead);
  
        const enemy = snakes.find(snake => snake.head.x === closestSnakeHead.x && snake.head.y === closestSnakeHead.y);
  
        console.log('enemy identified:', enemy.name, enemy.head, enemy.length, enemy.shout);
        console.log('conditional distance from enemy head:',getDistanceFromHead(enemy.head, moveAsCoord(bestMoveTowardsFood, head)));
        
        //! if there is less than 4 available blocks to move, check if the closest snake head is inside that space and if they are bigger than you, save yourself
        const potentialEnemyMoves = getPotentialSnakeCoords(enemy.head);
        
        if (getDistanceFromHead(enemy.head, moveAsCoord(bestMoveTowardsFood, head)) <= spaceForBestFoodMove && enemy.length >= gameData.you.length) {
          move = bestMoveTowardsOpenSpace.id;
          shout = 'Ew, get away from me.'
          console.log('this snake is tooO close, moving away!', move);
        } else {
          move = bestMoveTowardsFood;
          console.log('occular pat-down complete; still going for food - yolo:', move);
        }
      } else {
        move = bestMoveTowardsFood;
        shout = 'om nom nom nom';
      }
      console.log('move after all considerations:', move);
    }
  }

  console.log('confirming move:', move);
  response.status(200).send({
    move: move,
    shout: shout
  });
}

//! ********** decision making indicators **********
// consider potential hazards from enemy head positions
function getPotentialSnakeCoords(snakeHead, height, width) {
  let newPotentialSnakeCoords = [
    snakeHead,
    { x: snakeHead.x, y: snakeHead.y + 1}, // *up coord
    { x: snakeHead.x + 1, y: snakeHead.y}, // *right
    { x: snakeHead.x, y: snakeHead.y - 1}, // *down
    { x: snakeHead.x - 1, y: snakeHead.y} // *left
  ].filter(coord => !offBoard(coord, height, width));
  console.log('new potential snake coords:', newPotentialSnakeCoords);
  return newPotentialSnakeCoords;
}

// look up space available on move
function getOpenSpace(move, array) {
  const area = array.find(item => item.id === move);
  return area.mostSpace;
}

//calculate open space
function findOpenSpace(moves, snakeBody, obstacles, height, width) {
  // compare possible moves and determine which option will have the most space to move
  // convert potential move to coordinate and sort them by available space (least hazards within 1 unit in surrounding area)
  const head = snakeBody[0];
  let obstaclesSortedByDistance = sortTargetsByDistance(obstacles, head); 
  obstaclesSortedByDistance.shift(); //! remove own head from array
  console.log('obstacles sorted by distance:', obstaclesSortedByDistance);
  
  let movesByDistance = [];
  for (let i = 0; i < moves.length; i++) {
    // convert move to coordinate
    // find all obstacles on the same axis (x,y)
    // sort by the closest obstacle
    // get diffX / diffY
    // move towards the diff with higher absolute value
    // if equal, move towards greater distance area
    const theMoveAsCoord = moveAsCoord(moves[i], head);
    console.log('the move:', theMoveAsCoord);
    console.log('move:', moves[i]);

    let obj = {
      id: moves[i],
      coord: theMoveAsCoord,
    };

    const obstaclesRelativeToMoveX = obstaclesSortedByDistance
      .filter(obstacle => obstacle.x === moveAsCoord(moves[i], head).x)
      .sort((a,b) => getDiffX(a, moveAsCoord(moves[i], head)) - getDiffX(b, moveAsCoord(moves[i], head)));

    const closestObstacleX = obstaclesRelativeToMoveX[0];
    
    if (closestObstacleX !== undefined) {
      let lowestDiffY = getDiffY(closestObstacleX, moveAsCoord(moves[i], head));
      let absoluteDiffY;

      if (lowestDiffY < 0) {
        absoluteDiffY = lowestDiffY * -1;
      } else {
        absoluteDiffY = lowestDiffY;
      }

      obj.lowestDiffY = lowestDiffY;
      obj.absoluteDiffY = absoluteDiffY;

    } else {
      obj.lowestDiffY = theMoveAsCoord.y - height - 1;
      if (obj.lowestDiffY < 0) {
        obj.absoluteDiffY = obj.lowestDiffY * -1;
      } else {
        obj.absoluteDiffY = obj.lowestDiffY;
      }
    }

    const obstaclesRelativeToMoveY = obstaclesSortedByDistance
      .filter(obstacle => obstacle.y === moveAsCoord(moves[i], head).y)
      .sort((a,b) => getDiffY(a, moveAsCoord(moves[i], head)) - getDiffY(b, moveAsCoord(moves[i], head)));

    const closestObstacleY = obstaclesRelativeToMoveY[0];
    
    if (closestObstacleY !== undefined) {
      let lowestDiffX = getDiffX(closestObstacleY, moveAsCoord(moves[i], head));
      let absoluteDiffX;
      if (lowestDiffX < 0) {
        absoluteDiffX = lowestDiffX * -1;
      } else {
        absoluteDiffX = lowestDiffX;
      }

      obj.lowestDiffX = lowestDiffX;
      obj.absoluteDiffX = absoluteDiffX;
    } else {
      obj.lowestDiffX = theMoveAsCoord.x - width - 1;
      if (obj.lowestDiffX < 0) {
        obj.absoluteDiffX = obj.lowestDiffX * -1;
      } else {
        obj.absoluteDiffX = obj.lowestDiffX;
      }
    }
    obj.mostSpace = obj.absoluteDiffY * obj.absoluteDiffX;
    movesByDistance.push(obj);
  }
  movesByDistance.sort((a,b) => b.mostSpace - a.mostSpace);
  return movesByDistance;
}

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

  return diffX + diffY;
}

function sortTargetsByDistance(array, head) {
  const arrSortedByDistance = array.sort((a,b) => getDistanceFromHead(a, head) - getDistanceFromHead(b, head));
  // console.log('closest target:', arrSortedByDistance[0]);
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

  let sortedMovesByDistanceFromHead = newMoves.sort((a,b) => getDistanceFromHead(moveAsCoord(a, head), target) - getDistanceFromHead(moveAsCoord(b, head), target));

  console.log('sortedPossibleMovesByShortestDistanceToTarget:', sortedMovesByDistanceFromHead);

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

function combineSnakesHazards(snakes,hazards,head) {
  let obstacles = snakes
    .map(snake => snake.body)
    .flat()
    .concat(hazards);

  let obstaclesSortedByDistance = sortTargetsByDistance(obstacles, head); 
  obstaclesSortedByDistance.shift(); // !remove own head from obstacles

  return obstacles;
}


//! ********** validation functions **********
function offBoard(position, height, width) {
  if (position.x > width - 1 || position.x < 0) {
    return true;
  }
  else if (position.y > height - 1 || position.y < 0) {
    return true;
  } else {
    return false;
  }
}

function areCoordsEqual(coord, compareCoord) {
  return coord.x === compareCoord.x && coord.y === compareCoord.y;
}

function filterPossibleMoves(array, height, width, snakeBody, snakes, hazards) {
  // identify neck to prevent immediately moving into body
  const snakesAsOne = snakes.map(snake => snake.body).flat();
  const head = snakeBody[0];
  const neck = snakeBody[1];
  const possibleMoves = array.filter(move => {
    // avoid any existing snake body coordinates
    if (!snakesAsOne.some(snake => snake.x === moveAsCoord(move, head).x && snake.y === moveAsCoord(move, head).y) && !hazards.some(hazard => hazard.x === moveAsCoord(move, head).x && hazard.y === moveAsCoord(move, head).y)) {
      return !offBoard(moveAsCoord(move, head), height, width) && !areCoordsEqual(moveAsCoord(move, head), neck);
    }
  });

  return possibleMoves;
}

function handleEnd(request, response) {
  const gameData = request.body

  console.log('END')
  response.status(200).send('ok')
}
