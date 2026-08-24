import * as THREE from 'three';
import { getWeapon } from './WeaponData.js';

export class Player {
  constructor(id, isLocal=false, avatarData, scene){
    this.id=id;
    this.isLocal=isLocal;
    this.avatar=avatarData;
    this.scene=scene;
    this.health=100;
    this.maxHealth=100;
    this.armor=0;
    this.isDead=false;
    this.kills=0;
    this.deaths=0;
    this.team=0;

    this.position=new THREE.Vector3(0,1,0);
    this.velocity=new THREE.Vector3(0,0,0);
    this.rotation=new THREE.Euler(0,0,0);
    this.aimDirection=new THREE.Vector3(0,0,1);
    this.moveInput=new THREE.Vector2(0,0);
    this.isSprinting=false;
    this.isCrouching=false;
    this.isAiming=false;
    this.onGround=true;

    this.meshGroup=new THREE.Group();
    this.createMesh();
    if(scene) scene.add(this.meshGroup);

    // Animation state
    this.animTime=0;
    this.bobPhase=0;
    this.recoil=0;
    this.dashCooldown=0;
    this.slowFactor=1;
    this.slowTimer=0;
    this.burnTimer=0;
    this.poisonTimer=0;

    // Weapon
    this.currentWeaponId='m4';
    this.weaponMesh=null;
    this.createWeaponMesh();
  }

  createMesh(){
    const avatarColor = new THREE.Color(this.avatar?.color || '#FFD000');
    const inkColor = 0x0a0a0a;

    // Root
    this.meshGroup.position.copy(this.position);

    // Shadow
    const shadowGeo = new THREE.CircleGeometry(0.6, 12);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent:true, opacity:0.4 });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x=-Math.PI/2;
    this.shadow.position.y=0.02;
    this.meshGroup.add(this.shadow);

    // Body parts group for animation
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y=1;
    this.meshGroup.add(this.bodyGroup);

    // Torso - comic box with toon material
    const torsoGeo = new THREE.BoxGeometry(0.7,0.9,0.4);
    const torsoMat = new THREE.MeshToonMaterial({ color: avatarColor, roughness:0.7 });
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y=0.5;
    this.torso.castShadow=true;
    this.bodyGroup.add(this.torso);

    // Outline for torso
    const torsoOutline = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.0,0.5), new THREE.MeshBasicMaterial({ color: inkColor, side: THREE.BackSide }));
    torsoOutline.position.copy(this.torso.position);
    this.bodyGroup.add(torsoOutline);

    // Head - sphere with face
    const headGeo = new THREE.SphereGeometry(0.35,12,10);
    const headMat = new THREE.MeshToonMaterial({ color: 0xFFDBAC });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0,1.2,0);
    this.head.castShadow=true;
    this.bodyGroup.add(this.head);

    // Head outline
    const headOutline = new THREE.Mesh(new THREE.SphereGeometry(0.42,12,10), new THREE.MeshBasicMaterial({ color: inkColor, side: THREE.BackSide }));
    headOutline.position.copy(this.head.position);
    this.bodyGroup.add(headOutline);

    // Face details - eyes comic
    const eyeGeo = new THREE.BoxGeometry(0.12,0.08,0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12,1.25,0.28);
    this.bodyGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12,1.25,0.28);
    this.bodyGroup.add(rightEye);

    // Mask / bandana based on avatar
    if(this.avatar?.id!=='ghost'){
      const bandGeo = new THREE.BoxGeometry(0.75,0.15,0.5);
      const bandMat = new THREE.MeshToonMaterial({ color: 0x0a0a0a });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0,1.35,0);
      this.bodyGroup.add(band);
    }

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.12,0.6,4,8);
    const skinMat = new THREE.MeshToonMaterial({ color: 0xFFDBAC });
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftArm.position.set(-0.5,0.5,0);
    this.leftArm.castShadow=true;
    this.bodyGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightArm.position.set(0.5,0.5,0);
    this.rightArm.castShadow=true;
    this.bodyGroup.add(this.rightArm);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.15,0.7,4,8);
    const pantsMat = new THREE.MeshToonMaterial({ color: 0x222222 });
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.2,-0.3,0);
    this.bodyGroup.add(this.leftLeg);
    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.2,-0.3,0);
    this.bodyGroup.add(this.rightLeg);

    // Leg outlines
    [this.leftLeg, this.rightLeg].forEach(leg=>{
      const outline = new THREE.Mesh(new THREE.CapsuleGeometry(0.19,0.78,4,8), new THREE.MeshBasicMaterial({ color: inkColor, side: THREE.BackSide }));
      outline.position.copy(leg.position);
      this.bodyGroup.add(outline);
    });

    // Nameplate
    const canvas = document.createElement('canvas');
    canvas.width=256; canvas.height=64;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,256,64);
    ctx.fillStyle=this.avatar?.color || '#FFD000';
    ctx.font='bold 28px "Black Ops One"';
    ctx.fillText((this.avatar?.name||'PLAYER').substring(0,10),10,40);
    const tex=new THREE.CanvasTexture(canvas);
    const spriteMat=new THREE.SpriteMaterial({ map: tex });
    this.nameplate=new THREE.Sprite(spriteMat);
    this.nameplate.position.set(0,2.2,0);
    this.nameplate.scale.set(1.8,0.45,1);
    if(!this.isLocal) this.meshGroup.add(this.nameplate);
  }

  createWeaponMesh(){
    if(this.weaponMesh) this.bodyGroup.remove(this.weaponMesh);
    const w = getWeapon(this.currentWeaponId);
    const group=new THREE.Group();
    // Simple gun shape
    let barrelLen = w.type==='shotgun'?1.2 : w.type==='rifle'?1.0 : w.type==='smg'?0.7 : w.type==='launcher'?1.4 : 0.5;
    let bodyLen=0.5;
    const bodyGeo=new THREE.BoxGeometry(0.12,0.18,bodyLen);
    const bodyMat=new THREE.MeshToonMaterial({ color: new THREE.Color(w.color) });
    const body=new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0,0,0.3);
    group.add(body);
    const barrelGeo=new THREE.BoxGeometry(0.06,0.06,barrelLen);
    const barrelMat=new THREE.MeshToonMaterial({ color: 0x111111 });
    const barrel=new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0,0.05,0.3+bodyLen/2+barrelLen/2);
    group.add(barrel);

    // Muzzle
    const muzzleGeo=new THREE.CylinderGeometry(0.05,0.05,0.12,6);
    const muzzleMat=new THREE.MeshBasicMaterial({ color: 0x222222 });
    const muzzle=new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.rotation.x=Math.PI/2;
    muzzle.position.set(0,0.05,0.3+bodyLen/2+barrelLen+0.06);
    group.add(muzzle);
    this.muzzlePos=muzzle.position.clone();
    this.muzzleLocal=new THREE.Vector3(0,0.05,0.3+bodyLen/2+barrelLen+0.2);

    group.position.set(0.5,0.4,0.2);
    group.rotation.y=0;
    this.bodyGroup.add(group);
    this.weaponMesh=group;
  }

  setWeapon(id){
    this.currentWeaponId=id;
    this.createWeaponMesh();
  }

  update(dt, mapManager){
    if(this.isDead) return;
    this.animTime+=dt;

    // Timers
    if(this.slowTimer>0){ this.slowTimer-=dt; if(this.slowTimer<=0) this.slowFactor=1; }
    if(this.burnTimer>0){ this.burnTimer-=dt; this.takeDamage(5*dt, null, false); }
    if(this.poisonTimer>0){ this.poisonTimer-=dt; this.takeDamage(3*dt, null, false); }
    if(this.dashCooldown>0) this.dashCooldown-=dt;

    // Movement physics - only for local or for all if not networked?
    if(this.isLocal){
      const speed = this.isSprinting?6.5 : this.isCrouching?2.2 : 4.2;
      const effectiveSpeed = speed * this.slowFactor;
      // Input to world
      const forward = new THREE.Vector3(0,0,0);
      const right = new THREE.Vector3(0,0,0);
      // Camera relative - simplified: use rotation
      const yaw = this.rotation.y;
      forward.set(-Math.sin(yaw),0,-Math.cos(yaw));
      right.set(Math.cos(yaw),0,-Math.sin(yaw));
      const move = new THREE.Vector3();
      move.addScaledVector(forward, this.moveInput.y);
      move.addScaledVector(right, this.moveInput.x);
      if(move.length()>1) move.normalize();
      move.multiplyScalar(effectiveSpeed);

      // Apply
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, move.x, dt*10);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, move.z, dt*10);

      // Gravity
      this.velocity.y -= 12*dt;
      // Ground check
      if(this.position.y<=1.0){
        this.position.y=1.0;
        this.velocity.y=Math.max(0,this.velocity.y);
        this.onGround=true;
        if(this.moveInput.length()>0.1){
          this.bobPhase+=dt* (this.isSprinting?12:8);
        }
      } else {
        this.onGround=false;
      }

      // Proposed new pos
      const newPos = this.position.clone().add(this.velocity.clone().multiplyScalar(dt));
      // Collision
      if(mapManager){
        // X
        let testPos = new THREE.Vector3(newPos.x, this.position.y, this.position.z);
        let col = mapManager.checkCollision(testPos, 0.6);
        if(col.hit){ newPos.x=this.position.x; this.velocity.x=0; }
        // Z
        testPos = new THREE.Vector3(newPos.x, this.position.y, newPos.z);
        col = mapManager.checkCollision(testPos, 0.6);
        if(col.hit){ newPos.z=this.position.z; this.velocity.z=0; }
        // Y already handled
      }
      this.position.copy(newPos);
      this.position.y=Math.max(1.0,this.position.y);
    }

    // Update mesh
    this.meshGroup.position.copy(this.position);
    this.meshGroup.rotation.y=this.rotation.y;

    // Animations
    const bob = Math.sin(this.bobPhase)*0.08;
    const bob2 = Math.cos(this.bobPhase*2)*0.04;
    this.bodyGroup.position.y=1 + bob2;
    this.bodyGroup.rotation.z= Math.sin(this.bobPhase)*0.05 * this.moveInput.length();
    this.bodyGroup.rotation.x= THREE.MathUtils.lerp(this.bodyGroup.rotation.x, -this.moveInput.y*0.15, dt*5);

    // Leg animation
    if(this.moveInput.length()>0.1 && this.onGround){
      this.leftLeg.rotation.x=Math.sin(this.bobPhase)*0.6;
      this.rightLeg.rotation.x=Math.sin(this.bobPhase+Math.PI)*0.6;
      this.leftArm.rotation.x=Math.sin(this.bobPhase+Math.PI)*0.4;
      this.rightArm.rotation.x=Math.sin(this.bobPhase)*0.4 - this.recoil*0.5;
    } else {
      this.leftLeg.rotation.x=THREE.MathUtils.lerp(this.leftLeg.rotation.x,0,dt*5);
      this.rightLeg.rotation.x=THREE.MathUtils.lerp(this.rightLeg.rotation.x,0,dt*5);
      this.leftArm.rotation.x=THREE.MathUtils.lerp(this.leftArm.rotation.x,0,dt*5);
      this.rightArm.rotation.x=THREE.MathUtils.lerp(this.rightArm.rotation.x,-this.recoil,dt*10);
    }

    // Recoil recovery
    this.recoil=THREE.MathUtils.lerp(this.recoil,0,dt*8);
    if(this.weaponMesh){
      this.weaponMesh.position.z=0.2 + this.recoil*0.2;
      this.weaponMesh.rotation.x=-this.recoil*0.3;
    }

    // Aim direction lerp
    // ...

    // Shadow scale based on height
    if(this.shadow){
      const h = this.position.y;
      this.shadow.scale.setScalar(Math.max(0.2,1.2 - h*0.2));
      this.shadow.material.opacity=Math.max(0,0.4 - h*0.1);
    }
  }

  takeDamage(amount, attackerId=null, showEffect=true){
    if(this.isDead) return false;
    let dmg=amount;
    if(this.armor>0){
      const armorAbsorb=Math.min(this.armor, dmg*0.5);
      this.armor-=armorAbsorb;
      dmg-=armorAbsorb;
    }
    this.health-=dmg;
    if(showEffect){
      // Visual flash
      if(this.torso){
        this.torso.material.color.set(0xFF0000);
        setTimeout(()=>{ if(this.torso) this.torso.material.color.set(this.avatar?.color||'#FFD000'); },80);
      }
    }
    if(this.health<=0){
      this.health=0;
      this.die(attackerId);
      return true;
    }
    return false;
  }

  heal(amount){
    this.health=Math.min(this.maxHealth, this.health+amount);
  }

  die(killerId){
    this.isDead=true;
    this.deaths++;
    this.meshGroup.visible=false;
    // Respawn after 3 sec if local
    if(this.isLocal){
      setTimeout(()=>this.respawn(),3000);
    }
  }

  respawn(pos=null){
    this.isDead=false;
    this.health=this.maxHealth;
    this.armor=0;
    this.meshGroup.visible=true;
    if(pos) this.position.copy(pos);
    this.velocity.set(0,0,0);
  }

  dash(direction){
    if(this.dashCooldown>0) return false;
    const dashForce=10;
    const dir=new THREE.Vector3(direction.x,0,direction.y).normalize();
    // Convert to world
    const yaw=this.rotation.y;
    const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    const worldDir=new THREE.Vector3();
    worldDir.addScaledVector(forward, dir.y);
    worldDir.addScaledVector(right, dir.x);
    worldDir.normalize().multiplyScalar(dashForce);
    this.velocity.x=worldDir.x;
    this.velocity.z=worldDir.z;
    this.velocity.y=2;
    this.dashCooldown=1.2;
    return true;
  }

  applyEffect(effect, data){
    if(effect==='slow'){ this.slowFactor=data.slow||0.4; this.slowTimer=data.duration||2.5; }
    else if(effect==='burn'){ this.burnTimer=data.duration||3; }
    else if(effect==='poison'){ this.poisonTimer=data.duration||5; }
    else if(effect==='stun'){ this.slowFactor=0.1; this.slowTimer=data.stun||0.8; }
  }

  getMuzzleWorldPos(){
    if(!this.weaponMesh) return this.position.clone().add(new THREE.Vector3(0,1.5,0));
    const localPos=this.muzzleLocal.clone();
    localPos.applyMatrix4(this.weaponMesh.matrixWorld);
    // Actually need world matrix
    this.weaponMesh.updateWorldMatrix(true,false);
    const worldPos=new THREE.Vector3();
    worldPos.setFromMatrixPosition(this.weaponMesh.matrixWorld);
    worldPos.add(new THREE.Vector3(0,0,0.6).applyQuaternion(this.meshGroup.quaternion));
    // Simplify: front of player
    const front=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion().setFromEuler(this.rotation));
    return this.position.clone().add(new THREE.Vector3(0,1.4,0)).add(front.multiplyScalar(0.8));
  }

  addRecoil(amount){ this.recoil+=amount; }

  remove(){
    if(this.scene) this.scene.remove(this.meshGroup);
  }
}
