import * as THREE from 'three';

export class Controls {
  constructor(camera, domElement){
    this.camera=camera;
    this.dom=domElement;
    this.keys={};
    this.mouse={ x:0, y:0, down:false, right:false };
    this.moveInput=new THREE.Vector2(0,0);
    this.aimInput=new THREE.Vector2(0,0);
    this.isPointerLocked=false;
    this.sensitivity=0.0025;
    this.invertY=false;

    this.yaw=0; this.pitch=-0.2;
    this.targetYaw=0; this.targetPitch=-0.2;

    this.mobileMove=new THREE.Vector2(0,0);
    this.mobileAim=new THREE.Vector2(0,0);
    this.isMobile=false;

    this.setup();
  }

  setup(){
    window.addEventListener('keydown', e=>{
      this.keys[e.code]=true;
      if(['Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e=>{ this.keys[e.code]=false; });

    this.dom.addEventListener('mousedown', e=>{
      if(e.button===0){ this.mouse.down=true; this.lock(); }
      if(e.button===2) this.mouse.right=true;
    });
    window.addEventListener('mouseup', e=>{
      if(e.button===0) this.mouse.down=false;
      if(e.button===2) this.mouse.right=false;
    });
    window.addEventListener('mousemove', e=>{
      if(this.isPointerLocked){
        this.targetYaw-=e.movementX*this.sensitivity;
        this.targetPitch-=e.movementY*this.sensitivity*(this.invertY?-1:1);
        this.targetPitch=Math.max(-Math.PI/2+0.1, Math.min(Math.PI/2-0.1, this.targetPitch));
      } else {
        this.mouse.x=(e.clientX/window.innerWidth)*2-1;
        this.mouse.y=-(e.clientY/window.innerHeight)*2+1;
      }
    });
    this.dom.addEventListener('contextmenu', e=>e.preventDefault());

    // Wheel for weapon switch
    window.addEventListener('wheel', e=>{
      if(e.deltaY>0) this.keys['WheelDown']=true;
      else this.keys['WheelUp']=true;
      setTimeout(()=>{ this.keys['WheelDown']=false; this.keys['WheelUp']=false; },100);
    });

    // Touch for mobile handled separately via nipplejs
    this.detectMobile();
  }

  detectMobile(){
    this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints>0 || window.innerWidth<900;
  }

  lock(){
    if(this.isMobile) return;
    if(this.dom.requestPointerLock) this.dom.requestPointerLock();
  }

  updatePointerLock(){
    this.isPointerLocked = document.pointerLockElement===this.dom;
  }

  getMoveVector(){
    const v=new THREE.Vector2(0,0);
    if(this.keys['KeyW']||this.keys['ArrowUp']) v.y+=1;
    if(this.keys['KeyS']||this.keys['ArrowDown']) v.y-=1;
    if(this.keys['KeyA']||this.keys['ArrowLeft']) v.x-=1;
    if(this.keys['KeyD']||this.keys['ArrowRight']) v.x+=1;
    // Add mobile
    v.x+=this.mobileMove.x;
    v.y+=this.mobileMove.y;
    if(v.length()>1) v.normalize();
    return v;
  }

  getAimVector(){
    // For third person, yaw/pitch controls rotation
    const v=new THREE.Vector2(0,0);
    v.x+=this.mobileAim.x*2;
    v.y+=this.mobileAim.y*2;
    return v;
  }

  update(dt){
    this.updatePointerLock();
    // Smooth yaw/pitch
    this.yaw=THREE.MathUtils.lerp(this.yaw, this.targetYaw, dt*12);
    this.pitch=THREE.MathUtils.lerp(this.pitch, this.targetPitch, dt*12);
    // Mobile aim adds to target
    if(this.isMobile){
      this.targetYaw-=this.mobileAim.x*dt*2.5;
      this.targetPitch-=this.mobileAim.y*dt*2.5;
      this.targetPitch=Math.max(-Math.PI/2+0.1, Math.min(Math.PI/2-0.1, this.targetPitch));
    }
  }

  isSprinting(){ return this.keys['ShiftLeft']||this.keys['ShiftRight']; }
  isCrouching(){ return this.keys['ControlLeft']||this.keys['KeyC']; }
  isJumping(){ return this.keys['Space']; }
  isReloading(){ return this.keys['KeyR']; }
  isSwitching(){ return this.keys['KeyQ']||this.keys['WheelDown']||this.keys['WheelUp']; }
  isGrenade(){ return this.keys['KeyG']; }
  isTactical(){ return this.keys['KeyF']; }
  isInteract(){ return this.keys['KeyE']; }

  consumeKey(code){ if(this.keys[code]){ this.keys[code]=false; return true; } return false; }
}
