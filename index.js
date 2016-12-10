var Promise = require('promise');
const NodeCecModule = require('node-cec');
const NodeCec = NodeCecModule.NodeCec;
const CEC = NodeCecModule.CEC;

let client = new NodeCec('node-cec-monitor');
let responsesPending = [];
let timeout = 1000;

let ready = new Promise(function (resolve, reject) {
  let errorTimeout = setTimeout(function () {
    reject(new Error('cec-client never reported ready'));
  }, 5000);
  client.once('ready', function (client) {
    clearTimeout(errorTimeout);
    setTimeout(function () {
      resolve(client);
    }, 3000);
  });

  client.start('cec-client', '-m', '-d', '8', '-b', 'r');
});

let request = function (dest, command, response) {
  return new Promise(function(resolve, reject) {

    ready
    .then(function () {
      let errorTimer;

      let sendResponse = function(packet, status) {
        clearTimeout(timer);
        responsesPending[response]--;
        resolve({packet: packet, status: status});
      };

      client.once(response, sendResponse);

      if (!(response in responsesPending)) {
        responsesPending[response] = 0;
      }

      if(responsesPending[response] < 1) {
        client.sendCommand(dest, CEC.Opcode[command]);
      }

      responsesPending[response]++;

      errorTimer = setTimeout(function () {
        responsesPending[response]--;
        client.removeListener(response, sendResponse);
        return reject(new Error(`No ${response} received after ${timeout}ms`));
      }, timeout);
    })
    .catch(function (err) {
      reject(err);
    });

  });
};

let send = function (command) {
  ready
  .then(function () {
    client.send(command);
    resolve();
  })
  .catch(function (err) {
    reject(err);
  });
};

let command = function (dest, command) {
  ready
  .then(function () {
    client.sendCommand(dest, command);
    resolve();
  })
  .catch(function (err) {
    reject(err);
  });
};

module.exports = {
  command: command,
  send: send,
  timeout: timeout,
  request: request,
  code: CEC
};
