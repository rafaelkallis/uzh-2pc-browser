/**
 * Created by rafaelkallis on 03.11.16.
 */
const CoordinatorMediator = require('./mediator').CoordinatorMediator;
const constants = require('./constants');
const PREPARE = constants.PREPARE;
const COMMIT = constants.COMMIT;
const ABORT = constants.ABORT;
const YES = constants.YES;
const NO = constants.NO;
const ACK = constants.ACK;
const BUG_NO = constants.BUG_NO;
const BUG_TIMEOUT = constants.BUG_TIMEOUT;

class Subordinate {
    constructor(id, coordinator_host) {
        let message_handler = (type, payload, callback) => {
            switch (type) {
                case PREPARE:
                    payload == BUG_NO ? callback(NO) : payload != BUG_TIMEOUT && callback(YES);
                    break;
                case COMMIT:
                    payload == BUG_TIMEOUT ? setTimeout(() => callback(ACK), 2000) : callback(ACK);
                    break;
                case ABORT:
                    payload == BUG_TIMEOUT ? setTimeout(() => callback(ACK), 2000) : callback(ACK);
                    break;
            }
        };
        this._coordinator_med = new CoordinatorMediator(id, coordinator_host, message_handler);
    }
}

module.exports = Subordinate;