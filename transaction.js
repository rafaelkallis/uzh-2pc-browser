import {Observable} from './observable';

let transaction_id_sequence = 0;

export class Transaction extends Observable {

    constructor(payload){
        super();
        this._id = transaction_id_sequence++;
        this._payload = payload;
        this._phase = '';
    }

    get id(){
        return this._id;
    }

    get payload(){
        return this._payload;
    }

    get phase(){
        return this._phase;
    }
    set phase(phase){
        if (this._phase !== phase){
            this._phase = phase;
            this._notify();
        }
    }
}