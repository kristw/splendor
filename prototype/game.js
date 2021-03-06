var Board = require('./board.js');
var Noble = require('./noble.js');
var Player = require('./player.js');
var common = require('./common.js');
var show = common.show;
var shuffle = require('shuffle-array');

var Game = function(agents) {
    this.playerCount = 0;
    this.players = agents.map(function(agent) {
        var player = new Player(this.playerCount++, agent.name);
        player.agent = agent;
        return player;
    }.bind(this));
    this.board = new Board(this.playerCount);
    this.getMoves = require('./moves.js');
    this.reset();
};

module.exports = Game;

Game.prototype.reset = function() {
    shuffle(this.players);
    this.players.forEach(function(player) {
        player.reset();
    });
    this.board.reset();
    this.move = 0;
    this.movesMade = [];
};

Game.prototype.getCurrentPlayer = function() {
    return this.players[this.move % this.playerCount];
};

Game.prototype.logMoves = function() {
    console.log(JSON.stringify(this.movesMade, null, 2));
};

Game.prototype.playUntilPlayerId = function(id) {
    var player;
    var decision;
    var gameStates = [];

    while (this.move < 200 && !this.isOver() && this.getCurrentPlayer().id != id) {
        player = this.getCurrentPlayer();
        decision = player.agent.makeMove(
            this.board,
            this.players,
            this.move % this.playerCount,
            this.getMoves(this.board, player));
        this.movesMade.push({
            turn: this.move,
            player: this.gatherPlayerStats(player),
            move: decision
        });
        this.executeDecision(decision);
        gameStates.push(this.getGameState(id));
        this.move++;
    }
    return gameStates;
};

Game.prototype.isOver = function() {
    return this.move % this.playerCount === 0 && this.getTopScore() >= 15;
};

Game.prototype.getTopScore = function() {
    return this.players.reduce(function(topScore, player) {
        return Math.max(topScore, player.points);
    }, 0);
};

Game.prototype.executeDecision = function(decision) {
    if (decision.label === "PURCHASE") {
        return this.executePurchase(decision.action);
    }
    if (decision.label === "TAKE") {
        return this.executeTake(decision.action);
    }
    if (decision.label === "RESERVE_EXPOSED") {
        return this.executeReserve(decision.action, false);
    }
    if (decision.label === "RESERVE_COVERED") {
        return this.executeReserve(decision.action, true);
    }
};

Game.prototype.executePurchase = function(action) {
    var prePurchasePlayerChips = this.getCurrentPlayer().chips;

    if (action.card.isReserved) {
        this.getCurrentPlayer().activateCard(action.card);
    } else {
        this.getCurrentPlayer().buyCard(action.card);
        this.board.removeCard(action.row, action.index);
    }
    this.board.addChips(prePurchasePlayerChips - this.getCurrentPlayer().chips);
    this.checkNobles();
};

Game.prototype.executeTake = function(action) {
    var take = Number(action.split(',')[0]);
    var giveBack = Number(action.split(',')[1]);

    this.makeChipExchange(take, giveBack);
};

Game.prototype.executeReserve = function(action, isCovered) {
    var card = action.card.card;
    var take = Number(action.chips.split(',')[0]);
    var giveBack = Number(action.chips.split(',')[1]);

    this.board.removeCard(action.card.row, action.card.index);
    this.getCurrentPlayer().reserveCard(card, 0);
    this.makeChipExchange(take, giveBack);
};

Game.prototype.makeChipExchange = function(take, giveBack) {
    this.getCurrentPlayer().addChips(take);
    this.board.removeChips(take);
    this.getCurrentPlayer().removeChips(giveBack);
    this.board.addChips(giveBack);
};

Game.prototype.getOutcome = function() {
    var winner = this.getWinner();

    return {
        winner: winner,
        score: this.getTopScore(),
        moves: this.move,
    };
};

Game.prototype.getWinner = function() {
    this.players.sort(function(a, b) {
        return (a.points - b.points) * 100 +
            b.purchasedCards.length - a.purchasedCards.length;
    });
    if (this.players[0].points === this.players[1].points &&
        this.players[0].purchasedCards.length === this.players[1].purchasedCards.length) {
        return -1;
    }
    return this.players[0].id;
};

Game.prototype.checkNobles = function() {
    var index = 0;
    var takeableNobles = this.board.nobles.map(function(noble) {
            return {
                index: index++,
                noble: noble
            };
        })
        .filter(function(noble) {
            return Noble.canGetNoble(noble.noble, this.getCurrentPlayer().cardChipValues);
        }.bind(this));

    if (takeableNobles.length > 0) {
        this.getCurrentPlayer().addNoble(
            this.board.nobles.splice(this.getCurrentPlayer().agent.takeNoble(takeableNobles).index, 1)[0]);
    }
};

Game.prototype.gatherPlayerStats = function(player) {
    return {
        id: player.id,
        name: player.name,
        points: player.points,
        cardSummary: player.getCardChipValues(),
        //cards: player.purchasedCards,
        reserves: player.getReservedCards(),
        chips: common.translateChipCount(player.chips),
        nobles: player.getNobles()
    };
};

Game.prototype.getGameState = function(playerId) {
    return {
        turn: this.move,
        board: this.board,
        players: this.players,
        moves: this.getMoves(this.board, this.getCurrentPlayer()),
        isOver: this.isOver(),
        currentPlayer: playerId,
        winner: this.getWinner(),
        didWin: this.getWinner() == playerId
    };
};
