
import 'phaser';
var escapeChars = {
  '¢': 'cent',
  '£': 'pound',
  '¥': 'yen',
  '€': 'euro',
  '©': 'copy',
  '®': 'reg',
  '<': 'lt',
  '>': 'gt',
  '"': 'quot',
  '&': 'amp',
  '\'': '#39'
};

var regexString = '[';
for (var key in escapeChars) {
  regexString += key;
}
regexString += ']';

var regex = new RegExp(regexString, 'g');

function escapeHTML(str) {
  return str.replace(regex, function(m) {
    return '&' + escapeChars[m] + ';';
  });
};

var htmlEntities = {
  nbsp: ' ',
  cent: '¢',
  pound: '£',
  yen: '¥',
  euro: '€',
  copy: '©',
  reg: '®',
  lt: '<',
  gt: '>',
  quot: '"',
  amp: '&',
  apos: '\''
};

export default function decodeEntities(str) {
  return str.replace(/\&([^;]+);/g, function(entity, entityCode) {
    var match;

    if (entityCode in htmlEntities) {
      return htmlEntities[entityCode];
      /*eslint no-cond-assign: 0*/
    } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
      return String.fromCharCode(parseInt(match[1], 16));
      /*eslint no-cond-assign: 0*/
    } else if (match = entityCode.match(/^#(\d+)$/)) {
      return String.fromCharCode(~~match[1]);
    } else {
      return entity;
    }
  });
};


function number_format(number: string | number, decimals: number, decPoint: string, thousandsSep: string) {
  number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
  var n = !isFinite(+number) ? 0 : +number;
  var prec = !isFinite(+decimals) ? 0 : Math.abs(decimals);
  var sep = (typeof thousandsSep === 'undefined') ? ',' : thousandsSep;
  var dec = (typeof decPoint === 'undefined') ? '.' : decPoint;
  var toFixedFix = function(n, prec) {
    var k = Math.pow(10, prec);
    return '' + (Math.floor(n * k) / k).toFixed(prec);
  };
  var s = (prec ? toFixedFix(n, prec) : '' + Math.floor(n)).split('.');
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
  }
  if ((s[1] || '').length < prec) {
    s[1] = s[1] || '';
    s[1] += new Array(prec - s[1].length + 1).join('0');
  }
  return s.join(dec);
}

export { number_format as number_format }


function getURLParameter(sParam) {
  var sPageURL = window.location.search.substring(1);
  var sURLVariables = sPageURL.split('&');
  for (var i = 0; i < sURLVariables.length; i++) {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam) {
      return sParameterName[1];
    }
  }
}

export { getURLParameter as getURLParameter }


function getRand(min, max) {
  var rand = Phaser.Math.Between(min, max);
  return rand
}

export { getRand as getRand }

export var lines_colors = [
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520',
  'DAA520'
  // '10C469',
  // 'F9C851',
  // '3366CC',
  // 'DC3912',
  // 'FF9900',
  // '109618',
  // '990099',
  // '3B3EAC',
  // '0099C6',
  // 'DD4477',
  // '66AA00',
  // 'B82E2E',
  // '316395',
  // '994499',
  // '22AA99',
  // 'AAAA11',
  // '6633CC',
  // 'E67300',
  // '8B0707',
  // '329262',
  // '5574A6',
  // '3B3EAC'
];
export { lines_colors as lines_color }

export const DECIMAL = 2;

function fullScreenHandler(scene, button) {

  if (scene.scale.isFullscreen) {
    scene.scale.stopFullscreen();
    button.setTexture('btn_opt_normal');
  }
  else {
    scene.scale.toggleFullscreen();
    button.setTexture('btn_opt_activ');
  }
}

export { fullScreenHandler as fullScreenHandler }
