import { WEAPONS, ARROW_TYPES, THROWABLES } from '../utils/constants.js';

export function getWeapon(id){ return WEAPONS[id] || WEAPONS.glock; }
export function getArrow(id){ return ARROW_TYPES[id] || ARROW_TYPES.standard; }
export function getThrowable(id){ return THROWABLES[id] || THROWABLES.grenade; }

export class WeaponSystem {
  constructor(){
    this.primary = 'm4';
    this.secondary = 'glock';
    this.lethal = 'grenade';
    this.tactical = 'smoke';
    this.arrowType = 'standard';
    this.currentSlot = 'primary';
    this.ammo = {};
    this.initAmmo();
  }
  initAmmo(){
    for(const k in WEAPONS){
      const w = WEAPONS[k];
      this.ammo[k] = { current: w.mag, reserve: w.reserve };
    }
  }
  getCurrentWeaponId(){
    if(this.currentSlot==='primary') return this.primary;
    if(this.currentSlot==='secondary') return this.secondary;
    return this.primary;
  }
  getCurrentWeapon(){
    return getWeapon(this.getCurrentWeaponId());
  }
  switchSlot(slot){
    if(slot==='primary' && this.primary) this.currentSlot='primary';
    else if(slot==='secondary' && this.secondary) this.currentSlot='secondary';
    else if(slot==='lethal') this.currentSlot='lethal';
    else if(slot==='tactical') this.currentSlot='tactical';
  }
  canShoot(id){
    const w = getWeapon(id);
    const a = this.ammo[id];
    return a && a.current>0;
  }
  consumeAmmo(id, amount=1){
    if(!this.ammo[id]) return false;
    if(this.ammo[id].current>=amount){
      this.ammo[id].current-=amount;
      return true;
    }
    return false;
  }
  reload(id){
    const w = getWeapon(id);
    const a = this.ammo[id];
    if(!a) return false;
    if(a.reserve<=0 || a.current>=w.mag) return false;
    const need = w.mag - a.current;
    const take = Math.min(need, a.reserve);
    a.current+=take;
    a.reserve-=take;
    return true;
  }
  addAmmo(id, amount){
    if(!this.ammo[id]) return;
    this.ammo[id].reserve+=amount;
  }
}
