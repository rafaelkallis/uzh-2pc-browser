/**
 * Created by rafaelkallis on 08.11.16.
 */

export class Observable {

    constructor() {
        this._observers = [];
    }

    observe(observer){
        this._observers = this._observers.concat(observer);
    }

    _notify(){
        this._observers.forEach(observer => this._notify_observer(observer)); 
    }

    _notify_observer(observer){
        observer(this);
    }
}
