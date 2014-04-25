function GameManager(size, InputManager, Actuator) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.actuator     = new Actuator;

  this.running      = false;
  this.last         = [];

  this.goodMoves    = 0;
  this.totalMoves   = 0;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("undo", this.undo.bind(this));

  this.inputManager.on('think', function() {
    var best = this.ai.getBest();
    this.actuator.showHint(best.move);
  }.bind(this));


  this.inputManager.on('run', function() {
    if (this.running) {
      this.running = false;
      this.actuator.setRunButton('Auto-run');
    } else {
      this.running = true;
      this.run()
      this.actuator.setRunButton('Stop');
    }
  }.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.restart();
  this.running = false;
  this.actuator.setRunButton('Auto-run');
  this.setup();
};

// Set up the game
GameManager.prototype.setup = function () {
  this.grid         = new Grid(this.size);
  this.grid.addStartTiles();

  this.score        = 0;
  this.over         = false;
  this.won          = false;

  this.refresh()
};

// Refresh
GameManager.prototype.refresh = function () {
  this.ai = new AI(this.grid);

  // Update the actuator
  this.actuate();
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  this.actuator.actuate(this.grid, {
    score: this.score,
    over:  this.over,
    won:   this.won
  });
};

// makes a given move and updates state
GameManager.prototype.move = function(direction) {
  var wasGood;
  var best = this.ai.getBest();
  console.log('Cloning current grid');
  this.last.push({
    grid: this.grid.clone(),
    direction: direction,
    best: best,
    good: this.goodMoves,
    total: this.totalMoves,
  })

  var result = this.grid.move(direction);
  this.score += result.score;

  if (!result.won) {
    if (result.moved) {
      this.totalMoves += 1;
      wasGood = this.displayComparisonWithAI(best, direction);
      if (wasGood) {
        this.goodMoves += 1;
      }
      this.displayPerformance();
      this.grid.computerMove();
    } else {
      this.last.pop();
    }
  } else {
    this.won = true;
  }

  //console.log(this.grid.valueSum());

  if (!this.grid.movesAvailable()) {
    this.over = true; // Game over!
  }

  this.actuate();
}

// undoes last move and updates state
GameManager.prototype.undo = function() {
  var previous, best, direction;
  if (this.last.length) {
    console.log('undoing last move');
    previous = this.last.pop();
    this.grid = previous.grid;
    this.goodMoves = previous.good;
    this.totalMoves = previous.total;
    this.refresh();
    best = previous.best;
    direction = previous.direction;
  }
  this.displayComparisonWithAI(best, direction);
  this.displayPerformance();
}

GameManager.prototype.displayComparisonWithAI = function(best, direction) {
  var fc = document.getElementById('feedback-container');
  var wasGood = false;
  if (best) {
    this.actuator.showHint(best.move);
    if (parseInt(best.move, 10) === direction) {
      fc.className = 'good';
      wasGood = true;
    } else {
      fc.className = 'bad';
    }
  } else {
    fc.innerText = '';
  }
  return wasGood;
}

GameManager.prototype.displayPerformance = function() {
  var percentage = document.getElementById('feedback-percentage');
  percentage.innerText = parseInt((this.goodMoves / (this.totalMoves || 1)) * 100, 10).toString() + '% (' + this.goodMoves + '/' + this.totalMoves + ')';
}

// moves continuously until game is over
GameManager.prototype.run = function() {
  var best = this.ai.getBest();
  this.move(best.move);
  var timeout = animationDelay;
  if (this.running && !this.over && !this.won) {
    var self = this;
    setTimeout(function(){
      self.run();
    }, timeout);
  }
}
