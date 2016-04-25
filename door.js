"use strict"

/*

  タン、タタンのリズムでドア認証

*/

var ArduinoFirmata = require('arduino-firmata');
var LindaClient = require('linda').Client;
var socket = require('socket.io-client').connect('http://linda-server.herokuapp.com');
var linda = new LindaClient().connect(socket);
var ts = linda.tuplespace('masuilab');

// Linda Connect Event
linda.io.on('connect', () => {
  console.log('Success Linda Connect !');
});

// DoorOpen
var openDoor = () => {
  ts.write({where: 'delta', type: 'door', cmd: 'open'});
}

// Const Setting
const minP = 30;
const Intervals = {
  a_to_b  : [450, 600],
  b_to_c  : [100, 350]
};
const analogPin = 0;

// Connect Arduino
var arduino = new ArduinoFirmata();
arduino.connect(process.env.ARDUINO); //process.env.ARDUINO

arduino.on('connect', () => {
  console.log("connect!! "+arduino.serialport_name);
  console.log("board version: "+arduino.boardVersion);

  var buf = []; // 1音のセンサー値群配列

  var tunes = []; // 音群配列

  var lastTime = null;
  var inArea = false;
  var LEDTime = 200;
  var led_flag = {
    'pinA' : null,
    'pinB' : null
  }
  setInterval(() => {
    var an = arduino.analogRead(analogPin);

    if(an > minP && !inArea) {  // 領域突入
      inArea = true;
    }

    if(an < minP && inArea) {   // 領域脱出
      inArea = false;

      lastTime = new Date().getTime();

      // 音が3つ以上登録されている場合は、tunesを初期化
      if(tunes.length > 2) {
        tunes = [];
        console.log('Tunes初期化');
      }

      // 音を登録
      tunes.push({
        timestamp: new Date().getTime()
        // buf:       buf
      });
      console.log(`センサー平均値 : ${average(buf)}`);

      if(tunes.length == 3) {
        // 音のスパンを計算する
        var a_to_b = tunes[1].timestamp - tunes[0].timestamp;
        var b_to_c = tunes[2].timestamp - tunes[1].timestamp;
        console.log(`
          A to B : ${a_to_b},
          B to C : ${b_to_c}
          `);
        if(b_to_c > Intervals.b_to_c[0] && b_to_c < Intervals.b_to_c[1]) {
          if(a_to_b > Intervals.a_to_b[0] && a_to_b < Intervals.a_to_b[1]) {
            // 鍵を開ける
            console.log('鍵オープン');
            // openDoor();
          }
        }
      }

      arduino.digitalWrite(6, true);
      buf = [];

    } else if(an < minP) {
      inArea = false;
      var now_time = Math.floor(new Date().getTime());
      if(now_time - led_flag.pinA > LEDTime) {
        arduino.digitalWrite(6, false);
      }
    }

    if(an > minP && inArea) {
      buf.push(an);
    }

    if(new Date().getTime() - lastTime > 2000 && tunes.length > 0) {
      console.log('Tunesタイムアウト初期化');
      tunes = [];
    }

  }, 1);
});


var sum = (arr) => {
  return arr.reduce((prev, current, i, arr) => {
    return prev + current;
  });
};
var average = (arr) => {
  return sum(arr) / arr.length;
};
