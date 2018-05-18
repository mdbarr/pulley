'use strict';

function SmtpServer() {

}

module.exports = function (pulley) {
  return new SmtpServer(pulley);
};
