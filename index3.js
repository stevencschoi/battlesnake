const bodyParser = require('body-parser')
const express = require('express')

const PORT = process.env.PORT || 3000

const app = express()
app.use(bodyParser.json())

app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)

app.listen(PORT, () => console.log(`Battlesnake Server listening at http://127.0.0.1:${PORT}`));

function handleIndex(request, response) {
  var battlesnakeInfo = {
    apiversion: '1',
    author: 'the_steve',
    color: '#ffc300',
    head: 'evil',
    tail: 'curled'
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
  const me = gameData.you;
  const head = gameData.you.head;
  const myBody = gameData.you.body;
  const snakes = gameData.board.snakes;
  const food = gameData.board.food;
  const hazards = gameData.board.hazards;
  const boardHeight = gameData.board.height;
  const boardWidth = gameData.board.width;
  
  // console.log('gameData:', gameData);
  console.log('turn:', gameData.turn);
  snakes.forEach(snake => console.log('snakes in play:', snake.name));
  let moves = ['up', 'right', 'down', 'left'];

  const enemySnakes = getEnemySnakes(snakes, me);
  const enemySnakeHeads = enemySnakes.map(snake => snake.head);

  let potentialEnemyMoves = [];
  enemySnakeHeads.forEach(snake => {
    const newCoords = getPotentialSnakeCoords(snake);
    for (const coord of newCoords) {
      potentialEnemyMoves.push(coord);
    }
  });

  const snakeBodies = snakes.map(snake => snake.body);

  const obstacles = combineHazards(snakeBodies, hazards, head);
  //? array of invalid coordinates on board
  const obstaclesIncludingMyHead = [...obstacles];
  obstaclesIncludingMyHead.push(head);
  //? new obstacle array including possible moves by enemies
  const obstaclesWithPotentialEnemyMoves = combineHazards(snakeBodies, hazards, head, potentialEnemyMoves);

  // const board = createBoard(boardHeight, boardWidth);
  // const boardAsSafeCoords = board.filter((coord) => !obstaclesIncludingMyHead.find(({ x, y }) => coord.x === x && coord.y === y));

  //? eliminate possible moves that are out of bounds or hazardous
  let possibleMoves = filterPossibleMoves(moves, boardHeight, boardWidth, myBody, obstacles);
  let possibleMovesWithPotentialEnemyMoves = filterPossibleMoves(moves, boardHeight, boardWidth, myBody, obstaclesWithPotentialEnemyMoves);

  // console.log('possibleMoves:', possibleMoves);
  // console.log('possibleMoves including potential enemy moves:', possibleMovesWithPotentialEnemyMoves);

  //todo: latency too high looping though all this... how to improve performance?
  //? filter out any possible moves that lead to less than 2 possible next moves
  //! if the next move after this best move has only one possible move or less, move towards next closest food
  // let safePossibleNextMoves = [];
  // for (const move of possibleMovesWithPotentialEnemyMoves) {
  //   const nextTurnMyBody = getSnakeCoordsForNextMove(move, myBody);
  //   console.log('for move:', move);
  //   console.log('nextTurnMyBody:', nextTurnMyBody);
  //   console.log('next turn my head:', nextTurnMyBody[0]);
  //   //! next turn obstacles will assume enemy snakes move towards the closest food
  //   const nextTurnEnemySnakeBodies = enemySnakes.map(snake => {
  //     // determine enemy possible moves
  //     const possibleEnemyMoves = filterPossibleMoves(moves, boardHeight, boardWidth, snake.body, obstaclesIncludingMyHead);
  //     // find each snake's closest food
  //     const enemyFoodByDistance = sortTargetsByDistance(food, snake.head);
  //     // find the direction that snake must travel to eat it
  //     const moveToClosestFood = getMoveTowardsTarget(possibleEnemyMoves, enemyFoodByDistance[0], snake.body);
  //     // return the coords of that snake if it moves in that direction
  //     return snake.body = getSnakeCoordsForNextMove(moveToClosestFood, snake.body);
  //   });

  //   // console.log('enemy sneks next turn:', nextTurnEnemySnakeBodies);
  
  //   nextTurnEnemySnakeBodies.forEach(snake => console.log('enemy snakes for next turn:', snake));
  //   const nextTurnObstacles = combineHazards(nextTurnEnemySnakeBodies, hazards, nextTurnMyBody[0]);
    
  //   thisMovePossibleNextMoves = filterPossibleMoves(possibleMovesWithPotentialEnemyMoves, boardHeight, boardWidth, nextTurnMyBody, nextTurnObstacles);
  //   if (thisMovePossibleNextMoves.length >= 1) {
  //     thisMovePossibleNextMoves.push(safePossibleNextMoves);
  //   }
  // }
  // console.log('safest possible next moves:', safePossibleNextMoves);

  //? pre-move food analysis:
  const foodByDistance = sortTargetsByDistance(food, head);
  console.log('food by distance:', foodByDistance);
  //? pre-move enemy analysis:
  const snakesToDestroy = getSnakesToDestroy(snakes, me).map(snake => snake.head);
  const snakesToDestroyByDistance = sortTargetsByDistance(snakesToDestroy, head);

  let bestMoveTowardsFood = getMoveTowardsTarget(possibleMovesWithPotentialEnemyMoves, foodByDistance[0], myBody);
  console.log('best move towards food:', bestMoveTowardsFood);
  
  let move;
  let shout;
  
  //! if there is a significantly weaker snake closer than the nearest food, kill it
  if (snakesToDestroy.length > 0 && getDistanceFromHead(snakesToDestroyByDistance[0], head) < getDistanceFromHead(foodByDistance[0], head)) {
    console.log('snakes to destroy:', snakesToDestroy);
    console.log('enemy snake distance from head:', getDistanceFromHead(snakesToDestroyByDistance[0], head));
    console.log('food distance from head:', getDistanceFromHead(foodByDistance[0], head));

    move = attackSnake(possibleMovesWithPotentialEnemyMoves, snakesToDestroyByDistance[0], me);
    shout = `I'm coming for dat booty`;
    console.log('********** TARGETING ENEMY SNEK:', move);
  } else {
    if (snakes.length === 2) { //! ********** go for the kill **********
      const enemy = snakes.find(snake => snake.id !== me.id);
      if (enemy.length < me.length) {
        move = getMoveTowardsTarget(possibleMoves, enemy.head, myBody);
        shout = 'BOOM, headshot!';
        console.log('********** GOING FOR THE KILL:', move);
      } else {
        console.log('***** not strong enough, get the noms');
        move = bestMoveTowardsFood;
      }
    }
  
    if (possibleMoves.length === 1) {
      move = possibleMoves[0];
      shout = `Mom's spaghetti`;
    } else {
      const movesSortedByOpenSpace = findOpenSpace(possibleMovesWithPotentialEnemyMoves, myBody, obstacles, boardHeight, boardWidth);
      console.log('moves by most safe area:', movesSortedByOpenSpace);
      const bestMoveTowardsOpenSpace = movesSortedByOpenSpace[0];
      
      if (movesSortedByOpenSpace !== undefined) {
        console.log('best move to open space:', bestMoveTowardsOpenSpace.id, bestMoveTowardsOpenSpace.mostSpace);
        //? validate how much space available in move towards food
        const spaceForBestFoodMove = getOpenSpace(bestMoveTowardsFood, movesSortedByOpenSpace);
    
        console.log('space available for best food move:', spaceForBestFoodMove);
    
        //!identify the closest snake, identify their head and if the closest hazard is that snake's head, move towards open space
    
        if (spaceForBestFoodMove <= 4) { //todo: probably need a better condition to apply logic
          const snakeHeadsByDistance = sortTargetsByDistance(enemySnakeHeads, bestMoveTowardsFood);
          const closestSnakeHead = snakeHeadsByDistance[0];
          
          const enemy = snakes.find(snake => snake.head.x === closestSnakeHead.x && snake.head.y === closestSnakeHead.y);
          
          console.log('my head:', head);
          console.log('enemy heads:', snakeHeadsByDistance);
          console.log('closest enemy identified:', enemy.name, enemy.head, enemy.length, enemy.shout);
          console.log('limited distance from enemy head:',getDistanceFromHead(enemy.head, moveAsCoord(bestMoveTowardsFood, head)));
          
          //! if there is less than 4 available blocks to move, check if the closest snake head is inside that space and if they are bigger than you, save yourself
  
          if (getDistanceFromHead(enemy.head, moveAsCoord(bestMoveTowardsFood, head)) <= spaceForBestFoodMove && enemy.length >= gameData.you.length) { //todo: account for potential enemy moves
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
  }

  console.log('confirming move:', move);
  response.status(200).send({
    move: move,
    shout: shout
  });
}

//! ********** decision making functions **********
function attackSnake(possibleMoves, snakeHead, me) {
  const move = getMoveTowardsTarget(possibleMoves, snakeHead, me.body);
  return move;
}

function getSnakesToDestroy(snakes, me) {
  //? only attack snakes that are at least 2 units smaller, so the final move wreck me
  const targetSnakes = snakes.filter(snake => snake.length < me.length - 1);
  return targetSnakes;
}

//? look up space available on move
function getOpenSpace(move, array) {
  const area = array.find(item => item.id === move);
  return area.mostSpace;
}

function findOpenSpace(moves, myBody, obstacles, height, width) {
  //? compare possible moves and determine which option will have the most space to move
  //? convert potential move to coordinate and sort them by available space (least hazards within 1 unit in surrounding area)
  const head = myBody[0];
  let obstaclesSortedByDistance = sortTargetsByDistance(obstacles, head); 
  obstaclesSortedByDistance.shift(); //! remove own head from array
  // console.log('obstacles sorted by distance:', obstaclesSortedByDistance);
  let movesByDistance = [];
  for (let i = 0; i < moves.length; i++) {
    //? find all obstacles on the same axis (x,y)
    //? sort by the closest obstacle
    //? get diffX / diffY
    //? move towards the diff with higher absolute value
    //? if equal, move towards greater distance area
    const theMoveAsCoord = moveAsCoord(moves[i], head);
    // console.log('the move:', theMoveAsCoord);
    // console.log('move:', moves[i]);
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

function getMoveTowardsTarget(moves, target, myBody) {
  const directionMatrix = {
    left: 'right',
    up: 'down',
    right: 'left',
    down: 'up'
  };

  const head = myBody[0];
  const neck = myBody[1];
  
  //? of possible moves, determine which move will get to food in minimum steps
  const currentDirection = getDirection(head, neck);
  const oppositeDirection = directionMatrix[currentDirection];

  const newMoves = moves.filter(move => move !== oppositeDirection);

  //? if positive diffX, coord is to the LEFT of head
  //? if negative diffX, coord is to the RIGHT of head
  //? if positive diffY, coord is to the DOWN of head
  //? if negative diffY, coord is to the UP of head

  let sortedMovesByDistanceFromHead = newMoves.sort((a,b) => getDistanceFromHead(moveAsCoord(a, head), target) - getDistanceFromHead(moveAsCoord(b, head), target));
  // console.log('sortedPossibleMovesByShortestDistanceToTarget:', sortedMovesByDistanceFromHead);
  return sortedMovesByDistanceFromHead[0];
};

function sortTargetsByDistance(array, head) {
  const arrSortedByDistance = array.sort((a,b) => getDistanceFromHead(a, head) - getDistanceFromHead(b, head));
  return arrSortedByDistance;
}

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
};

function getDirection(head, neck) {
  if (head.x - neck.x === 0 && head.y - neck.y === -1) {
    return 'down';
  } else if (head.x - neck.x === 0 && head.y - neck.y === 1) {
    return 'up';
  } else if (head.x - neck.x === -1 && head.y - neck.y === 0) {
    return 'left';
  } else return 'right';
};

function getSnakeCoordsForNextMove(move, body) {
  //? apply directional move for the head
  //? move the last piece of the body to the position of the previous piece
  let newSnakeCoords = [];
  for (let i = 0; i < body.length; i++) {
    if (i === 0) {
      newSnakeCoords.push(moveAsCoord(move, body[i]));
    } else {
      newSnakeCoords.push(body[i-1]);
    }
  }
  return newSnakeCoords;
}

function getEnemySnakes(snakes, me) {
  const enemySnakes = snakes.filter(snake => snake.id !== me.id);
  return enemySnakes;
}

//? consider potential movements from enemy head positions as hazards
function getPotentialSnakeCoords(snakeHead) {
  const newPotentialSnakeCoords = [
    snakeHead,
    { x: snakeHead.x, y: snakeHead.y + 1}, // *up coord
    { x: snakeHead.x + 1, y: snakeHead.y}, // *right
    { x: snakeHead.x, y: snakeHead.y - 1}, // *down
    { x: snakeHead.x - 1, y: snakeHead.y} // *left
  ]
  // .filter(coord => !offBoard(coord, height, width));
  return newPotentialSnakeCoords;
}

function combineHazards(bodies, hazards, head, potentialEnemyMoves = []) { // *also sorts by distance
  const obstacles = bodies
    // .map(snake => snake.body)
    .flat()
    .concat(hazards)
    .concat(potentialEnemyMoves)
    .filter(obstacle => {
      if (obstacle.x === head.x && obstacle.y === head.y) {
        return false;
      } else {
        return true;
      }
    })

  return obstacles;
}
//? create 2d array to replicate possible coordinates
function createBoard(height, width) {
  let board = [];
  for (let i = 0; i < width; i++) {
    for (let j = height - 1; j >= 0; j--) {
      board.push({ x: i, y: j});
    }
  }
  return board;
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

function filterPossibleMoves(array, height, width, myBody, obstacles) {
  //? identify neck to prevent immediately moving into body
  const head = myBody[0];
  const neck = myBody[1];
  const possibleMoves = array.filter(move => {
    //? avoid any existing snake body coordinates
    if (!obstacles.some(obstacle => obstacle.x === moveAsCoord(move, head).x && obstacle.y === moveAsCoord(move, head).y)) {
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