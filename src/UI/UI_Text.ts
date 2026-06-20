import 'phaser';
import dispatcher from '../genericScripts/EventDispatcher';
import dataServer from '../Data/Data';
import shared from '../config/Shared';
import lang from '../config/language';
import decodeEntities, { number_format, DECIMAL } from '../genericScripts/HelperFuncts';
//import number_format from '../config/HelperFuncts';
var spine: any;
var LANG = lang;
let BETS = shared.BETS;
let BET_POS = shared.BET_POS;
let LINES = shared.LINES;
let LINE_POS = shared.LINE_POS;
let LANGUAGE = dataServer.getLanguage();

export default class UI_Buttons extends Phaser.GameObjects.Text {
  config: any;
  emitter: any;
  ValueBalance: any;
  ValueCredits: any;
  ValueMessage: any;
  ValueBet: any;
  ValueLine: any;
  ValueCoin: any;
  textLine: any;
  textWinCoin: any;
  textBet: any;
  textCoin: any;
  textBalance: Phaser.GameObjects.Text;
  WinCoin: any;
  currency: any;
  player_data: any;
  fsTotalCoin: Phaser.GameObjects.Text;
  fsCount: Phaser.GameObjects.Text;
  fsTotalCoinText: Phaser.GameObjects.Text;
  fsCountText: Phaser.GameObjects.Text;
  portraitConfig: { font_Size: number; start_pos: number; first_row_y_ratio: number; second_row_y_ratio: number; first_column_x_ratio: number; second_column_x_ratio: number; };

  constructor(config: { scene: any; player_data: any; auth: any; x?: any; y?: any; style?: any; }) {
    super(config.scene, config.x, config.y, "", config.style)
    this.config = config.scene.cache.json.get('game_config');
    this.scene = config.scene;
    this.emitter = dispatcher.getInstance();
    this.player_data = config.player_data
    this.portraitConfig = {
      font_Size: 45,
      start_pos: 150,
      first_row_y_ratio: 0.55,
      second_row_y_ratio: 0.62,
      first_column_x_ratio: 0.5,
      second_column_x_ratio: 0.75
    };
    var data = config.auth;
    var configText = this.config.ui.text;
    var font = "px Arial";
    var fill = '#FFF';
    this.assignData(data);
    // this.textBalance = this.scene.add.text(configText.balance_text.x, configText.balance_text.y, LANG[LANGUAGE.toString()]['balance'], { font: "bold " + configText.balance_text.font_size + font, color: fill });
    // this.ValueBalance = this.scene.add.text(configText.balance_currency.x, configText.balance_currency.y, number_format(this.player_data.balance, DECIMAL, ',', '') + this.currency, { font: "bold " + configText.balance_currency.font_size + font, color: fill });
    // this.textBalance.setOrigin(0.5, 0);
    // this.ValueBalance.setOrigin(0.5, 0);

    // this.textLine = this.scene.add.text(configText.nb_lines_text.x, configText.nb_lines_text.y, LANG[LANGUAGE.toString()]['lines'], { font: configText.balance_text.font_size + font, color: fill });
    // this.ValueLine = this.scene.add.text(configText.nb_lines.x, configText.nb_lines.y, number_format(LINES[LINE_POS].number, 0, ',', ''), { font: configText.nb_lines.font_size + font, color: fill });
    // this.textCoin = this.scene.add.text(configText.coin_value_text.x, configText.coin_value_text.y, LANG[LANGUAGE.toString()]['coin'], { font: configText.balance_text.font_size + font, color: fill });
    // this.ValueCoin = this.scene.add.text(configText.coin_value.x, configText.coin_value.y, number_format(BETS[BET_POS], DECIMAL, ',', ''), { font: configText.coin_value.font_size + font, color: fill });
    this.WinCoin = this.scene.add.text(configText.win_value.x, configText.win_value.y, "0.00" + this.currency, { font: "bold " + configText.win_value.font_size + font, color: fill });
    this.WinCoin.text = '0,00' + this.currency;
    this.textWinCoin = this.scene.add.text(configText.win_value_text.x, configText.win_value_text.y, LANG[LANGUAGE.toString()]['win'], { font: "bold " + configText.win_value_text.font_size + font, color: fill });
    this.textBet = this.scene.add.text(configText.bet_total_text.x, configText.bet_total_text.y, LANG[LANGUAGE.toString()]['bet_value'], { font: "bold " + configText.bet_total_text.font_size + font, color: fill });
    this.ValueBet = this.scene.add.text(configText.bet_total_value.x, configText.bet_total_value.y, number_format(BETS[BET_POS] * Number(LINES[LINE_POS].number), DECIMAL, ',', '') + this.currency, { font: "bold " + configText.bet_total_value.font_size + font, color: fill }); //
    this.fsTotalCoin = this.scene.add.text(100, 100, "0", { font: "bold " + configText.bet_total_text.font_size + font, color: fill });
    this.fsCount = this.scene.add.text(100, 200, "0", { font: "bold " + configText.bet_total_value.font_size + font, color: fill }); //
    this.fsTotalCoinText = this.scene.add.text(0, 100, LANG[LANGUAGE.toString()]['freespins'], { font: "bold " + configText.bet_total_text.font_size + font, color: fill });
    this.fsCountText = this.scene.add.text(0, 200, LANG[LANGUAGE.toString()]['freespins'], { font: "bold " + configText.bet_total_value.font_size + font, color: fill }); //
    this.fsTotalCoin.visible = false;
    this.fsTotalCoin.active = false;
    this.fsCount.visible = false;
    this.fsCount.active = false;
    this.fsTotalCoinText.visible = false;
    this.fsTotalCoinText.active = false;
    this.fsCountText.visible = false;
    this.fsCountText.active = false;
    config.scene.add.existing(this)
  }

  assignData(data: { bets: any[]; bet_pos: number; lines: any[]; line_pos: number; key: { currency_hex_code: any; }; }) {
    BETS = data.bets;
    BET_POS = data.bet_pos;
    LINES = data.lines;
    LINE_POS = data.line_pos;
    this.currency = decodeEntities(data.key.currency_hex_code);
  }

  updateBalanceTextBeforeBet(balance: any) {
    this.ValueBalance.text = number_format(balance, DECIMAL, ',', '') + this.currency;
  }

  updateBalanceTextFromBet(balance: any) {
    this.ValueBalance.text = number_format(balance, DECIMAL, ',', '') + this.currency;
  }

  updateBetText(bet: number, lines: number) {
    this.ValueBet.text = number_format(bet * lines, DECIMAL, ',', '') + this.currency;
  }
  updateLineText(line: number) {
    this.ValueLine.text = number_format(line, 0, ',', '');
  }
  updateWinText(win) {
    this.WinCoin.text = number_format(win, DECIMAL, ',', '') + this.currency;
  }
  resetWinText() {
    this.WinCoin.text = number_format("0,00", DECIMAL, ',', '') + this.currency;
  }

  updateFreeSpinText(value) {
    this.fsCount.text = value;
  }
  updateLanguage(lang) {
    this.textLine.text = LANG[lang.toString()]['lines'];
    this.textCoin.text = LANG[lang.toString()]['coin'];
    this.textWinCoin.text = LANG[lang.toString()]['win'];
    this.textBet.text = LANG[lang.toString()]['bet_value'];
    this.fsTotalCoinText.text = LANG[lang.toString()]['freespins'];
    this.fsCountText.text = LANG[lang.toString()]['freespins'];
  }

  toggleFsText() {
    this.fsTotalCoin.visible = !this.fsTotalCoin.visible;
    this.fsTotalCoin.active = !this.fsTotalCoin.active;
    this.fsCount.visible = !this.fsCount.visible;
    this.fsCount.active = !this.fsCount.active;
    this.fsTotalCoinText.visible = !this.fsTotalCoinText.visible;
    this.fsTotalCoinText.active = !this.fsTotalCoinText.active;
    this.fsCountText.visible = !this.fsCountText.visible;
    this.fsCountText.active = !this.fsCountText.active;
  }

  setTextPortrait() {
    this.textBet.x = this.portraitConfig.start_pos;
    this.textBet.y = this.scene.cameras.main.height * this.portraitConfig.first_row_y_ratio;
    this.textBet.setFontSize(this.portraitConfig.font_Size);
    this.ValueBet.x = this.portraitConfig.start_pos;
    this.ValueBet.setFontSize(this.portraitConfig.font_Size);
    this.ValueBet.y = this.scene.cameras.main.height * this.portraitConfig.second_row_y_ratio;

    // this.textBalance.x = this.scene.cameras.main.width * this.portraitConfig.first_column_x_ratio;
    // this.textBalance.y = this.scene.cameras.main.height * this.portraitConfig.first_row_y_ratio;
    // this.textBalance.setFontSize(this.portraitConfig.font_Size);
    // this.ValueBalance.x = this.scene.cameras.main.width * this.portraitConfig.first_column_x_ratio;
    // this.ValueBalance.y = this.scene.cameras.main.height * this.portraitConfig.second_row_y_ratio;
    // this.ValueBalance.setFontSize(this.portraitConfig.font_Size);

    this.textWinCoin.x = this.scene.cameras.main.width * this.portraitConfig.second_column_x_ratio;
    this.textWinCoin.y = this.scene.cameras.main.height * this.portraitConfig.first_row_y_ratio;
    this.textWinCoin.setFontSize(this.portraitConfig.font_Size);
    this.WinCoin.x = this.scene.cameras.main.width * this.portraitConfig.second_column_x_ratio;;
    this.WinCoin.y = this.scene.cameras.main.height * this.portraitConfig.second_row_y_ratio;
    this.WinCoin.setFontSize(this.portraitConfig.font_Size);
  }

  setTextLandscape() {
    var configText = this.config.ui.text;
    this.textBet.x = configText.bet_total_text.x
    this.textBet.y = configText.bet_total_text.y
    this.textBet.setFontSize(configText.bet_total_text.font_size);
    this.ValueBet.x = configText.bet_total_value.x;
    this.ValueBet.setFontSize(configText.bet_total_value.font_size);
    this.ValueBet.y = configText.bet_total_value.y;

    // this.textBalance.x = configText.balance_text.x;
    // this.textBalance.y = configText.balance_text.y;
    // this.textBalance.setFontSize(configText.balance_text.font_size);
    // this.ValueBalance.x = configText.balance_currency.x;
    // this.ValueBalance.y = configText.balance_currency.y;
    // this.ValueBalance.setFontSize(configText.balance_currency.font_size);

    this.textWinCoin.x = configText.win_value_text.x;
    this.textWinCoin.y = configText.win_value_text.y;
    this.textWinCoin.setFontSize(configText.win_value_text.font_size);
    this.WinCoin.x = configText.win_value.x;
    this.WinCoin.y = configText.win_value.y;
    this.WinCoin.setFontSize(configText.win_value.font_size);



  }

}
