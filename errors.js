/**
 * Created by rafaelkallis on 03.11.16.
 */

export class PrepareNoVoteError {
};

export class NotActiveError {
};

export class CoordinatorNotActiveError {
};
export class SubordinateNotActiveError {
};

PrepareNoVoteError.prototype = Object.create(Error.prototype);
NotActiveError.prototype = Object.create(Error.prototype);
CoordinatorNotActiveError.prototype = Object.create(Error.prototype);
SubordinateNotActiveError.prototype = Object.create(Error.prototype);