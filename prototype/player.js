var common = require('./common.js');

var Player = function(id, name) {
    this.id = id;
    this.name = name;
    this.reset();
};

Player.prototype.reset = function() {
    this.purchasedCards = [];
    this.cardChipValues = [0, 0, 0, 0, 0];
    this.points = 0;
    this.reservedCards = [];
    this.chips = 0;
    this.chipsAndCards = 0;
};

Player.prototype.buyCard = function(card) {
    if (card.buy(this.id, this.chipsAndCards)) {
        this.payForCard(card);
        this.purchasedCards.push(card);
        this.points += card.points;
        this.cardChipValues[common.getColorIndex(card.color)]++;
        this.updateChipsAndCards(this.chips);
    }
};

Player.prototype.reserveCard = function(card, gold){
	if(this.reservedCards.length == 3){
		console.log("ERROR:  Player's reserves are maxed out!");
		return false;
	}
	if(card.reserve(this.id)){
		this.chips += gold;
		this.chipsAndCards += gold;
		this.reservedCards.push(card);
		return true;
	}
};

Player.prototype.activeCard = function(card){
	var reservedCount = this.reservedCards.length;

	this.reservedCards = this.reservedCards.filter(function(reservedCard){
		return reservedCard.cost != card.cost;
	});
	if(reservedCount == this.reservedCards.length){
		console.log("ERROR:  Card not found in player's reserved pile!");
		return false;
	}
	this.buyCard(card);
};

Player.prototype.payForCard = function(card) {
    var chipTotal = this.chips;
    var goldChipsNeeded = 0;

    for (var colorIndex = 0; colorIndex < 5; colorIndex++) {
        var colorBalanceAfterCards =
            Math.max(0, ((card.cost >> (3 * colorIndex)) & 3) - this.cardChipValues[colorIndex]);
        
        this.chips = (this.chips & (((1 << 18) - 1) - (3 << (3 * colorIndex)))) + 
        				(Math.max(0, (chipTotal & 3) - colorBalanceAfterCards)<< (3 * colorIndex));        
        goldChipsNeeded += Math.max(0,  colorBalanceAfterCards - (chipTotal & 3));
        chipTotal = chipTotal >> 3;
    }
    this.chips -= (goldChipsNeeded << 15);
};

Player.prototype.updateChipsAndCards = function(chips){
	this.chipsAndCards = this.chipsAndCards & (3<<15);
	for (var colorIndex = 0; colorIndex < 5; colorIndex++) {
		this.chipsAndCards += Math.min(7, this.cardChipValues[colorIndex]+(chips&3))<<(3*colorIndex);
		chips = chips >> 3;
	}
};
