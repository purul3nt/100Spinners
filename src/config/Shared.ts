/// <reference path="../../node_modules/@types/jquery/index.d.ts"/>
//import 'jquery';

//var $ = require('jquery');
//import {jQuery, $} from "jquery";
//import 'jquery-ajax-native';
import 'phaser';
import 'jstorage';


export default {
  BETS: [],
  BET_POS: 0,
  //BET: BETS[BET_POS],
  LINES: [],
  LINE_POS: 0,
  //LINE:  LINES[LINE_POS],
  SFX: false,//$.jStorage.get('Slot'+"_opt_sfx"),
  MUSIC: false, //$.jStorage.get('Slot'+"_opt_music"),
  LANGUAGE: 'en',// $.jStorage.get('Slot'+"_opt_language"),
  GAME_NAME: 'Slot',
  game_data: {
    symbols: undefined,
    coin_value_list: undefined,
    freespins: undefined,
    grid: {
      bonus: {
        wheel: undefined,
        freespins: undefined
      },
      grid: {
        reel_count: undefined,
        type: undefined,
        row_count: undefined,
        strip_grid: undefined,
        symbols: undefined
      },
      jackpot: undefined,
      lines: undefined,
      payouts: undefined,
      symbols: undefined,

    },
    max_level_bet: undefined,
    currency_hex_code: undefined
  },
  bet_data: {
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
  },
  player_data: {
    balance: undefined,
    nickname: undefined,
    player_preference: undefined,
    session_token: undefined,
  }
};
