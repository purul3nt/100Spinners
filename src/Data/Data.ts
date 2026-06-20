/// <reference path="../../node_modules/@types/jquery/index.d.ts"/>

//import 'jquery';
import 'phaser';
//var $ = require('jquery');
//import 'jstorage';
import ed from '../genericScripts/EventDispatcher';
import shared from '../config/Shared';
import testData from '../Data/TestData';

import { getURLParameter } from '../genericScripts/HelperFuncts';
let GAME_NAME = shared.GAME_NAME;
let BETS = shared.BETS;
let BET_POS = shared.BET_POS;
let LINES = shared.LINES;
let LINE_POS = shared.LINE_POS;
let BET = BETS[BET_POS];
let LINE = LINES[LINE_POS];
const game_code = (getURLParameter('game_code') === undefined) ? "space_beasts" : getURLParameter('game_code');;
console.log(game_code)
const platform = "desktop";
const casino_token = "casino";
const currency = "EUR";
const language = (getURLParameter('language') === undefined) ? "en" : getURLParameter('language');
const play_for_fun = (getURLParameter('play_for_fun') === undefined) ? true : getURLParameter('play_for_fun');
var error_url_parameters = false;
if (game_code === undefined || platform === undefined || casino_token === undefined || currency === undefined) {
  error_url_parameters = true;
}
let LANGUAGE = language;
// var SFX = $.jStorage.get(GAME_NAME + "_opt_sfx");
// var MUSIC = $.jStorage.get(GAME_NAME + "_opt_music");
// var LANGUAGE = $.jStorage.get(GAME_NAME + "_opt_language");
var player_data = {
  balance: undefined,
  nickname: undefined,
  player_preference: undefined,
  session_token: undefined,
}
var game_data = {
  symbols: undefined,
  coin_value_list: undefined,
  freespins: undefined,
  grid: {

    jackpot: undefined,
    lines: undefined,
    payouts: undefined,
    symbols: undefined,

  },
  max_level_bet: undefined,
  currency_hex_code: undefined
}
var bet_data = {
  balance: undefined,
  bonus: undefined,
  currency: undefined,
  freespin: undefined,
  is_jackpot_win: undefined,
  jackpot_amount: undefined,
  message: undefined,
  session_token: undefined,
  slot_grid: undefined,
  status: undefined,
  win_coin: undefined,
  win_currency: undefined,
  winning_combinations: undefined
}
var data = {
  game_code: game_code,
  platform: platform,
  casino_token: casino_token,
  currency: currency,
  language: language,
  play_for_fun: play_for_fun,
  auth_url: "https://staging-backend.gamingcorpscasino.com/casino/slots/authenticate",
  bet_url: "https://staging-backend.gamingcorpscasino.com/casino/slots/bet"
  //auth_url: 	  "https://backend.wonderlandgaming.com/casino/slots/authenticate"
};

var test_bet_data = testData.bet_data;
var test_bet_data_0 = testData.bet_data_test;
var test_bet_data_1 = testData.bet_data_test_0;
var test_bet_data_arr = [test_bet_data, test_bet_data_1, test_bet_data_0]


var test_auth_data = testData.auth_data;

export default new class DataServer {
  constructor() { }
  authenticate(data, callback) {
    $.ajax({
      contentType: 'application/json',
      type: 'POST',
      dataType: 'json',
      data: JSON.stringify(data),
      url: data.auth_url,
      success: function(data, textStatus, jqXHR) {
        callback(undefined, data);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        callback(new Error(errorThrown), undefined);
      }
    });
  }
  authenticateSession() {
    const that = this;
    //TEST
    var response = test_auth_data;

    // this.authenticate(data, function(error, response) {
    //   if (error) {
    //     console.log(response.status);
    //     that.ErrorGame();
    //   }
    //   if (that.isValidStatus(response.status)) {
    player_data.session_token = response.session_token;
    player_data.balance = response.balance;
    player_data.nickname = response.nickname;
    //player_data.player_preference = response.player_preference;
    game_data.coin_value_list = response.coin_value_list;
    //game_data.freespins = response.freebets;
    game_data.grid = response.grid;
    game_data.max_level_bet = response.max_level_bet;
    that.setBets(response.coin_value_list);
    that.setLines(response.grid.lines);
    that.setLinePos(response.grid.lines.length - 1);
    that.setBet();
    that.setLine();
    game_data.currency_hex_code = response.currency_hex_code;
    if (response.coin_value_list.length > 1) {
      that.setBetPos(Math.floor(response.coin_value_list.length / 2));
    } else {
      that.setBetPos(1);
    }
    setTimeout(that.dispatchEventAuthenticate, 500, [player_data, game_data, BETS, BET_POS, BET, LINES, LINE_POS, game_code])
    //
    //   } else {
    //     that.ErrorGame();
    //   }
    // });

  }
  dispatchEventAuthenticate(player_data, game_data) {
    var emitter = ed.getInstance();
    emitter.emit("Authenticated", player_data, game_data);
  }


  bet() {
    var that = this;
    //TEST
    var data = test_bet_data_arr[Math.floor(Math.random() * test_bet_data_arr.length)];;



    //
    // player_data.balance -= BETS[BET_POS] * LINES[LINE_POS].number;
    //
    // $.ajax({
    //   contentType: 'application/json',
    //   dataType: 'json',
    //   type: 'POST',
    //   data: JSON.stringify({
    //     'game_code': game_code,
    //     'session_token': player_data.session_token,
    //     'amount': LINES[LINE_POS].number,
    //     'type': 'bet',
    //     'currency': 'EUR',
    //     'coin_value': BETS[BET_POS],
    //     'lines_played': LINES[LINE_POS].number,
    //   }),
    //   url: data.bet_url,
    //   async: false,
    //   success: function(data) {
    //     if (
    //       that.isValidStatus(data.status)) {
    bet_data.balance = data.balance;
    bet_data.bonus = data.bonus;
    bet_data.currency = data.currency;
    //    bet_data.freespin = data.freebet;
    bet_data.is_jackpot_win = data.is_jackpot_win;
    bet_data.jackpot_amount = data.jackpot_amount;
    bet_data.message = data.message;
    bet_data.session_token = data.session_token;
    bet_data.slot_grid = data.slot_grid;
    bet_data.status = data.status;
    var items = Array(0, 0, 500, 0, 0, 0, 20, 0, 0, 0, 20, 5346);
    //bet_data.win_coin = items[Math.floor(Math.random() * items.length)];  //data.win_coin;
    bet_data.win_coin = data.win_coin;
    bet_data.win_currency = bet_data.win_coin * BETS[BET_POS] * Number(LINES[LINE_POS].number);//data.win_currency;
    //  console.log(bet_data.win_coin)
    bet_data.winning_combinations = data.winning_combinations;

    setTimeout(that.dispatchEventBet, 500, bet_data)
    setTimeout(function() { player_data.balance = bet_data.balance; }, 500)
    //     }
    //   },
    //   error: function(jqXHR, textStatus, errorThrown) {
    //     //                  createModal(errorThrown, true);
    //     //                    showMessageModal();
    //   }
    // });
  }
  dispatchEventBet(bet_data) {
    var emitter = ed.getInstance();
    emitter.emit("betReceived", bet_data);
  }
  isValidStatus(status) {
    return status === 0 || (status >= 200 && status < 300);
  }

  getBalance() {
    //    console.log("GetBalance" + player_data.balance)
    return player_data.balance;
  }

  setBets(value) {
    BETS = value;

  };
  setBetPos(value) {
    BET_POS = value;
  };
  setBet() {
    BET = BETS[BET_POS];;
  };
  setLines(value) {
    LINES = value;

  };
  setLinePos(value) {
    LINE_POS = value;
  };
  setLine() {
    LINE = LINES[LINE_POS].number;;

  };
  getBetValue() {
    return BETS[BET_POS] * Number(LINES[LINE_POS].number);
  }

  setLineLess() {
    if (LINE_POS > 0) {
      LINE_POS--;
      LINE = LINES[LINE_POS].number;
    }
  }

  setLineMore() {
    if (LINE_POS > 0 && (LINE_POS < LINES.length - 1)) {
      LINE_POS++;
      LINE = LINES[LINE_POS].number;
    }
  }
  setBetLess() {
    if (BET_POS > 0) {
      BET_POS--;
      BET = BETS[BET_POS];
    }
  };
  setBetMore() {
    if (BET_POS < BETS.length - 1) {
      BET_POS++;
      BET = BETS[BET_POS];
    }
  };

  getLine() {
    return LINE;
  }
  getBet() {
    return BET;
  }

  setLanguage(value) {
    LANGUAGE = value;
  }

  getLanguage() {
    return LANGUAGE
  }
  ErrorGame() {
    //  this.scene.start('Slot_GameError');
  }
}
