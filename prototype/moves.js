const util = require('util')
var ChipMoves = require('./chipMoves.js');

var getChipTakingOptions = ChipMoves.getChipTakingOptions;

module.exports = function(board, player) {
    var exposedCards = board.getExposedCards();

    return {
        takeChips: getChipTakingOptions(board.chips, player.chips),
        reserve: getReserveOptions(
            exposedCards, board.getTopCards(), board.chips,
            player.reservedCards, player.chips
        ),
        purchase: getPurchaseOptions(exposedCards, player.reservedCards, player.chipsAndCards)
    };
};

function getReserveOptions(exposedCards, topCards, boardChips, reservedCards, playerChips) {
    var reserveChipOptions = ChipMoves.getReserveOptions(boardChips, playerChips);
    var options = {
        exposed: [],
        covered: []
    };

    if (reservedCards.length === 3) {
        return options;
    }
    exposedCards.forEach(function(card) {
        reserveChipOptions.forEach(function(option) {
            options.exposed.push({
                card: card,
                chips: option
            });
        });
    });
    topCards.forEach(function(card) {
        reserveChipOptions.forEach(function(option) {
            options.covered.push({
                card: card,
                chips: option
            });
        });
    });
    return options;
}

function getPurchaseOptions(exposedCards, reservedCards, playerChipsAndCards) {
    return exposedCards
        .concat(reservedCards.map(function(card) {
            return {
                card: card
            };
        }))
        .filter(function(card) {
            return card.card.canBeBought(playerChipsAndCards);
        });
}
