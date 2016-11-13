export class Explosion {
    constructor(parent_element){
        this._parent_element = parent_element;        
    }

    boom() {
        let explosion = document.createElement('div');
        this._parent_element.appendChild(explosion);
        explosion.classList.add('explosion');
        setTimeout(() => this._parent_element.removeChild(explosion), 1000);
    }
}