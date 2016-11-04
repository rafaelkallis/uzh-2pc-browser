/**
 * Created by rafaelkallis on 03.11.16.
 */

class SubordinateError extends Error {
    constructor(from_subordinate_id) {
        super();
        this.from_subordinate_id = from_subordinate_id;
    }
}

class DisconnectedError extends Error {
}

class TimeoutError extends Error {
}

class PrepareNoVoteError extends SubordinateError {
    constructor(from_subordinate_id) {
        super(from_subordinate_id);
    }
}

class ACKError extends SubordinateError {
    constructor(from_subordinate_id) {
        super(from_subordinate_id);
    }
}

module.exports = {
    TimeoutError,
    DisconnectedError,
    PrepareNoVoteError,
    ACKError
};