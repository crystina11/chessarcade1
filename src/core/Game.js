import * as THREE from 'three';
import { Player } from './Player.js';
import { MapManager } from './MapManager.js';
import { ProjectileSystem } from './ProjectileSystem.js';
import { WeaponSystem, getWeapon, getThrowable } from './WeaponData.js';
import { Controls } from './Controls.js';
import { AVATARS, WEAPONS, THROWABLES, GAME_MODES, GUN_GAME_ORDER, MAPS } from '../utils/constants.js';

export class Game {
  constructor(canvas, uiManager, multiplayer){
    this.canvas=canvas;
    this.ui=uiManager;
    this.multiplayer=multiplayer;
    this.scene=new THREE.Scene();
    this.scene.fog=new THREE.Fog(0x0a0a0a, 30, 120);
    this.camera=new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.renderer=new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;

    // Lighting - comic style
    const ambient=new THREE.AmbientLight(0xffffff,0.6);
    this.scene.add(ambient);
    const dir=new THREE.DirectionalLight(0xFFD000,1.2);
    dir.position.set(10,20,10);
    dir.castShadow=true;
    dir.shadow.mapSize.set(2048,2048);
    dir.shadow.camera.near=0.5; dir.shadow.camera.far=100;
    dir.shadow.camera.left=-50; dir.shadow.camera.right=50; dir.shadow.camera.top=50; dir.shadow.camera.bottom=-50;
    this.scene.add(dir);
    const rim=new THREE.DirectionalLight(0x00D5FF,0.4);
    rim.position.set(-10,5,-10);
    this.scene.add(rim);

    this.mapManager=new MapManager(this.scene);
    this.projectiles=new ProjectileSystem(this.scene, this.mapManager);
    this.controls=new Controls(this.camera, canvas);

    this.localPlayer=null;
    this.players=new Map();
    this.bots=[];
    this.weaponSystem=new WeaponSystem();

    this.gameState='menu'; // menu, playing, paused, lobby
    this.currentMap='warehouse';
    this.currentMode='ffa';
    this.matchTime=300;
    this.matchTimer=300;
    this.killFeed=[];
    this.lastShootTime=0;

    this.raycaster=new THREE.Raycaster();
    this.clock=new THREE.Clock();

    window.addEventListener('resize',()=>this.onResize());
    this.setupMultiplayerCallbacks();

    // Camera
    this.cameraOffset=new THREE.Vector3(0,3.5,-6);
    this.cameraTarget=new THREE.Vector3();
    this.cameraShake=0;

    // Bot AI timer
    this.botTimer=0;
  }

  setupMultiplayerCallbacks(){
    if(!this.multiplayer) return;
    this.multiplayer.on('onPlayerUpdate',(data, peerId)=>{
      let p=this.players.get(peerId);
      if(!p){
        // create remote player
        const avatar=AVATARS.find(a=>a.id===data.avatar)||AVATARS[0];
        p=new Player(peerId,false,avatar,this.scene);
        this.players.set(peerId,p);
      }
      // Update pos
      if(data.pos){
        p.position.set(data.pos[0],data.pos[1],data.pos[2]);
        p.rotation.y=data.rotY||0;
        p.aimDirection.set(data.aimX||0, data.aimY||0, data.aimZ||1);
        if(data.weapon) p.setWeapon(data.weapon);
        p.health=data.health||100;
      }
    });
    this.multiplayer.on('onShoot',(data, peerId)=>{
      const shooter=this.players.get(peerId);
      if(!shooter) return;
      const origin=new THREE.Vector3().fromArray(data.origin);
      const dir=new THREE.Vector3().fromArray(data.dir);
      if(data.projectile){
        this.projectiles.spawnProjectile(origin, dir, data.weapon, peerId, data.arrowType);
      } else {
        // hitscan visual + check hit on local
        this.projectiles.spawnBullet(origin, dir, data.weapon, peerId, data.arrowType);
        this.checkHitscan(origin, dir, data.weapon, peerId, data.arrowType);
      }
    });
    this.multiplayer.on('onHit',(data, peerId)=>{
      // Someone says we got hit
      if(data.targetId===this.multiplayer.localId || data.targetId===this.localPlayer?.id){
        if(this.localPlayer) {
          const killed=this.localPlayer.takeDamage(data.damage, data.shooterId);
          this.ui.showHitmarker();
          if(killed){
            this.onLocalDeath(data.shooterId);
          }
        }
      }
    });
    this.multiplayer.on('onProjectile',(data, peerId)=>{
      const origin=new THREE.Vector3().fromArray(data.origin);
      const dir=new THREE.Vector3().fromArray(data.dir);
      if(data.throwable){
        this.projectiles.spawnThrowable(origin, dir, data.throwable, peerId);
      } else {
        this.projectiles.spawnProjectile(origin, dir, data.weapon, peerId, data.arrowType);
      }
    });
    this.multiplayer.on('onPeerLeave', id=>{
      const p=this.players.get(id);
      if(p){ p.remove(); this.players.delete(id); }
    });
    this.multiplayer.on('onGameEvent',(data, peerId)=>{
      if(data.type==='start'){
        this.currentMap=data.map||this.currentMap;
        this.currentMode=data.mode||this.currentMode;
        this.startMatch({ map:this.currentMap, mode:this.currentMode, isMultiplayer:true });
      }
    });
  }

  setProfile(name, avatarId){
    this.playerName=name||'PUNK-01';
    this.avatarId=avatarId||'punk';
    const avatar=AVATARS.find(a=>a.id===avatarId)||AVATARS[2];
    this.localAvatar=avatar;
    if(this.multiplayer) this.multiplayer.setLocalInfo(this.playerName, this.avatarId);
  }

  setLoadout(loadout){
    this.weaponSystem.primary=loadout.primary||'m4';
    this.weaponSystem.secondary=loadout.secondary||'glock';
    this.weaponSystem.lethal=loadout.lethal||'grenade';
    this.weaponSystem.tactical=loadout.tactical||'smoke';
    this.weaponSystem.arrowType=loadout.arrowType||'standard';
    this.weaponSystem.initAmmo();
    if(this.localPlayer) this.localPlayer.setWeapon(this.weaponSystem.getCurrentWeaponId());
  }

  loadMap(mapId){
    this.currentMap=mapId;
    this.mapManager.loadMap(mapId);
  }

  startMatch({ map='warehouse', mode='ffa', isMultiplayer=false, botCount=5 }={}){
    this.currentMap=map; this.currentMode=mode;
    this.loadMap(map);
    this.matchTime=GAME_MODES[mode]?.time||300;
    this.matchTimer=this.matchTime;
    this.gameState='playing';

    // Clear old players
    this.players.forEach(p=>p.remove());
    this.players.clear();
    this.bots=[];
    this.projectiles.clear();

    // Local player
    const spawnPos=this.mapManager.getSpawnPoint(0);
    this.localPlayer=new Player('local', true, this.localAvatar, this.scene);
    this.localPlayer.position.copy(spawnPos);
    this.localPlayer.setWeapon(this.weaponSystem.getCurrentWeaponId());
    this.players.set('local', this.localPlayer);

    if(!isMultiplayer){
      // Spawn bots
      for(let i=0;i<botCount;i++){
        const botAvatar=AVATARS[i%AVATARS.length];
        const bot=new Player('bot-'+i,false,botAvatar,this.scene);
        const pos=this.mapManager.getSpawnPoint(i+1);
        bot.position.copy(pos);
        bot.setWeapon(Object.keys(WEAPONS)[Math.floor(Math.random()*Object.keys(WEAPONS).length)]);
        bot.team=mode==='tdm'? (i%2):0;
        bot.isBot=true;
        bot.botState={ target:null, wanderTime:0, shootCooldown:0 };
        this.players.set(bot.id, bot);
        this.bots.push(bot);
      }
    }

    this.ui.showHUD();
    this.ui.updateMapInfo(map, mode);
    this.clock.start();
    this.animate();
  }

  animate(){
    if(this.gameState!=='playing') return;
    requestAnimationFrame(()=>this.animate());
    const dt=Math.min(this.clock.getDelta(),0.05);
    this.update(dt);
    this.render();
  }

  update(dt){
    if(this.gameState!=='playing') return;

    this.matchTimer-=dt;
    if(this.matchTimer<=0){
      this.endMatch();
      return;
    }

    this.controls.update(dt);
    const move=this.controls.getMoveVector();

    if(this.localPlayer && !this.localPlayer.isDead){
      this.localPlayer.moveInput.copy(move);
      this.localPlayer.isSprinting=this.controls.isSprinting() && move.length()>0.5;
      this.localPlayer.isCrouching=this.controls.isCrouching();
      this.localPlayer.rotation.y=this.controls.yaw;

      // Jump / dodge
      if(this.controls.consumeKey('Space')){
        if(this.localPlayer.onGround){
          this.localPlayer.velocity.y=7;
          this.localPlayer.onGround=false;
        }
      }
      // Dash with double tap or shift+direction?
      if(this.controls.keys['KeyQ'] && move.length()>0){
        // dash handled as special
      }

      // Weapon switching
      if(this.controls.consumeKey('KeyQ')){
        // toggle primary/secondary
        const next=this.weaponSystem.currentSlot==='primary'?'secondary':'primary';
        this.weaponSystem.switchSlot(next);
        this.localPlayer.setWeapon(this.weaponSystem.getCurrentWeaponId());
        this.ui.updateWeaponUI(this.weaponSystem);
      }
      if(this.controls.consumeKey('Digit1')){
        this.weaponSystem.switchSlot('primary');
        this.localPlayer.setWeapon(this.weaponSystem.getCurrentWeaponId());
        this.ui.updateWeaponUI(this.weaponSystem);
      }
      if(this.controls.consumeKey('Digit2')){
        this.weaponSystem.switchSlot('secondary');
        this.localPlayer.setWeapon(this.weaponSystem.getCurrentWeaponId());
        this.ui.updateWeaponUI(this.weaponSystem);
      }
      // Reload
      if(this.controls.consumeKey('KeyR')){
        const wid=this.weaponSystem.getCurrentWeaponId();
        if(this.weaponSystem.reload(wid)){
          this.ui.updateWeaponUI(this.weaponSystem);
          // anim
        }
      }
      // Grenade
      if(this.controls.consumeKey('KeyG')){
        this.throwGrenade(this.weaponSystem.lethal);
      }
      if(this.controls.consumeKey('KeyF')){
        this.throwGrenade(this.weaponSystem.tactical);
      }

      // Shooting
      if(this.controls.mouse.down){
        this.tryShoot();
      }

      this.localPlayer.update(dt, this.mapManager);

      // Send multiplayer update at 20hz
      if(this.multiplayer && this.multiplayer.connected){
        if(!this._lastNetSend || performance.now()-this._lastNetSend>50){
          this.multiplayer.sendPlayerUpdate({
            pos: [this.localPlayer.position.x, this.localPlayer.position.y, this.localPlayer.position.z],
            rotY: this.localPlayer.rotation.y,
            aimX: this.localPlayer.aimDirection.x,
            aimY: this.localPlayer.aimDirection.y,
            aimZ: this.localPlayer.aimDirection.z,
            health: this.localPlayer.health,
            weapon: this.localPlayer.currentWeaponId,
            avatar: this.avatarId,
            name: this.playerName
          });
          this._lastNetSend=performance.now();
        }
      }
    }

    // Update all players
    this.players.forEach(p=>{
      if(p!==this.localPlayer) p.update(dt, this.mapManager);
    });

    // Bots AI
    this.updateBots(dt);

    // Projectiles
    this.projectiles.update(dt, Array.from(this.players.values()), (hitInfo)=>{
      this.onHit(hitInfo);
    });

    // Camera
    this.updateCamera(dt);

    // UI
    this.ui.updateHUD({
      health: this.localPlayer?.health||0,
      armor: this.localPlayer?.armor||0,
      ammo: this.weaponSystem.ammo[this.weaponSystem.getCurrentWeaponId()],
      weapon: this.weaponSystem.getCurrentWeapon(),
      kills: this.localPlayer?.kills||0,
      time: this.matchTimer,
      alive: Array.from(this.players.values()).filter(p=>!p.isDead).length
    });

    // Minimap
    this.ui.updateMinimap(Array.from(this.players.values()), this.localPlayer, this.mapManager.currentMap?.size||60);

    // Gun game check
    if(this.currentMode==='gungame' && this.localPlayer){
      const needed=GUN_GAME_ORDER.length;
      if(this.localPlayer.kills>=needed){
        this.endMatch(true);
      }
    }
  }

  updateCamera(dt){
    if(!this.localPlayer) return;
    const targetPos=this.localPlayer.position.clone();
    targetPos.y+=1.8;

    // Third person offset based on yaw/pitch
    const yaw=this.controls.yaw;
    const pitch=this.controls.pitch;
    const dist=6 + (this.localPlayer.isAiming? -2:0);
    const offset=new THREE.Vector3(
      Math.sin(yaw)*Math.cos(pitch)*dist,
      -Math.sin(pitch)*dist + 1.5,
      Math.cos(yaw)*Math.cos(pitch)*dist
    );
    const camPos=targetPos.clone().add(offset);

    // Collision check for camera
    if(this.mapManager){
      const dir=camPos.clone().sub(targetPos).normalize();
      const rayLen=camPos.distanceTo(targetPos);
      // simple check - if obstacle between, pull camera
      // (we approximate with box check)
      const steps=8;
      for(let i=1;i<=steps;i++){
        const test=targetPos.clone().add(dir.clone().multiplyScalar((i/steps)*rayLen));
        const col=this.mapManager.checkCollision(test,0.2);
        if(col.hit){
          camPos.copy(test).sub(dir.multiplyScalar(0.3));
          break;
        }
      }
    }

    // Shake
    if(this.cameraShake>0){
      camPos.x+=(Math.random()-0.5)*this.cameraShake;
      camPos.y+=(Math.random()-0.5)*this.cameraShake;
      camPos.z+=(Math.random()-0.5)*this.cameraShake;
      this.cameraShake=Math.max(0,this.cameraShake-dt*5);
    }

    this.camera.position.lerp(camPos, dt*8);
    this.camera.lookAt(targetPos);
  }

  tryShoot(){
    if(!this.localPlayer || this.localPlayer.isDead) return;
    const now=performance.now();
    const weapon=this.weaponSystem.getCurrentWeapon();
    const ammo=this.weaponSystem.ammo[weapon.id];
    if(!ammo || ammo.current<=0){
      // auto reload?
      return;
    }
    const rpmDelay=60000/weapon.rpm;
    if(now-this.lastShootTime<rpmDelay) return;
    this.lastShootTime=now;

    // Consume ammo
    if(!this.weaponSystem.consumeAmmo(weapon.id,1)) return;

    this.localPlayer.addRecoil(weapon.type==='shotgun'?0.8:weapon.type==='rifle'?0.4:0.2);
    this.cameraShake+=weapon.type==='shotgun'?0.3:weapon.type==='launcher'?0.6:0.12;

    // Calculate aim direction
    const origin=this.localPlayer.getMuzzleWorldPos();
    // Camera forward
    const camDir=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    let dir=camDir.clone();

    // Spread
    const spread=weapon.spread * (this.localPlayer.isSprinting?2:1) * (this.localPlayer.isCrouching?0.5:1);
    dir.x+=(Math.random()-0.5)*spread;
    dir.y+=(Math.random()-0.5)*spread;
    dir.z+=(Math.random()-0.5)*spread;
    dir.normalize();

    const arrowType=weapon.id==='bow'?this.weaponSystem.arrowType:null;

    if(weapon.projectile){
      const proj=this.projectiles.spawnProjectile(origin, dir, weapon.id, 'local', arrowType);
      // Multiplayer
      if(this.multiplayer && this.multiplayer.connected){
        this.multiplayer.sendProjectile({
          origin: [origin.x,origin.y,origin.z],
          dir: [dir.x,dir.y,dir.z],
          weapon: weapon.id,
          arrowType,
          projectile:true
        });
      }
    } else {
      // Hitscan - check hits
      this.projectiles.spawnBullet(origin, dir, weapon.id, 'local', arrowType);
      this.checkHitscan(origin, dir, weapon.id, 'local', arrowType);

      if(this.multiplayer && this.multiplayer.connected){
        this.multiplayer.sendShoot({
          origin: [origin.x,origin.y,origin.z],
          dir: [dir.x,dir.y,dir.z],
          weapon: weapon.id,
          arrowType,
          projectile:false
        });
      }
    }

    this.ui.updateWeaponUI(this.weaponSystem);
    this.ui.showCrosshairRecoil();

    // Muzzle flash
    this.createMuzzleFlash(origin);
  }

  checkHitscan(origin, dir, weaponId, shooterId, arrowType){
    const weapon=getWeapon(weaponId);
    const arrow=arrowType?{ ...THROWABLES[arrowType], ...requireArrow(arrowType)}:null;
    // Actually get arrow data
    const arrowData=arrowType? (()=>{
      const { ARROW_TYPES } = requireConstants();
      return ARROW_TYPES[arrowType];
    })() : null;
    // We'll just use getArrow from imported but we already have
    // Use raycaster
    this.raycaster.set(origin, dir);
    this.raycaster.far=weapon.range;

    // Check players
    const players=Array.from(this.players.values()).filter(p=>p.id!==shooterId && !p.isDead);
    // Sort by distance
    let closestHit=null;
    let closestDist=Infinity;

    // Check map obstacles first
    let mapHitDist=weapon.range;
    if(this.mapManager){
      // Simple: check if ray hits any obstacle box
      // Approximate by testing against colliders
      // We'll do a stepped ray march
      const steps=20;
      const stepSize=weapon.range/steps;
      for(let i=0;i<steps;i++){
        const testPos=origin.clone().add(dir.clone().multiplyScalar(i*stepSize));
        const col=this.mapManager.checkCollision(testPos,0.2);
        if(col.hit){
          mapHitDist=i*stepSize;
          break;
        }
      }
    }

    for(const p of players){
      // Simple sphere test
      const toPlayer=p.position.clone().add(new THREE.Vector3(0,1,0)).sub(origin);
      const proj=toPlayer.dot(dir);
      if(proj<0 || proj>mapHitDist) continue;
      const closest=origin.clone().add(dir.clone().multiplyScalar(proj));
      const dist=closest.distanceTo(p.position.clone().add(new THREE.Vector3(0,1,0)));
      if(dist<0.9 && proj<closestDist){
        closestDist=proj;
        closestHit=p;
      }
    }

    if(closestHit){
      // Damage
      let dmg=weapon.damage * weapon.pellets;
      if(weapon.type==='shotgun'){
        // Damage falloff
        const falloff=Math.max(0.3,1-closestDist/weapon.range);
        dmg=weapon.damage * weapon.pellets * falloff;
      }
      // Arrow effect
      const arrowD=arrowType? getArrowData(arrowType):null;
      if(arrowD) dmg=arrowD.damage;

      const killed=closestHit.takeDamage(dmg, shooterId);
      if(closestHit.applyEffect && arrowD?.effect){
        closestHit.applyEffect(arrowD.effect, arrowD);
      }

      this.onHit({ target: closestHit, shooter: shooterId, damage: dmg, killed, weaponId, arrowType });

      // Multiplayer hit confirm
      if(this.multiplayer && this.multiplayer.connected && closestHit.id!=='local'){
        this.multiplayer.sendHit({ targetId: closestHit.id, damage: dmg, shooterId });
      }
    }
  }

  onHit({ target, shooter, damage, killed, weaponId, arrowType }){
    // UI
    if(shooter==='local' || shooter===this.localPlayer?.id){
      this.ui.showHitmarker(killed);
      if(killed){
        this.localPlayer.kills++;
        this.addKillFeed(this.playerName, target.avatar?.name||target.id, weaponId||'rifle');
        // Gun game upgrade
        if(this.currentMode==='gungame'){
          const idx=GUN_GAME_ORDER.indexOf(this.weaponSystem.primary);
          if(idx>=0 && idx<GUN_GAME_ORDER.length-1){
            this.weaponSystem.primary=GUN_GAME_ORDER[idx+1];
            this.weaponSystem.currentSlot='primary';
            this.localPlayer.setWeapon(this.weaponSystem.getCurrentWeaponId());
            this.ui.updateWeaponUI(this.weaponSystem);
            this.ui.showPow(`WEAPON UP! ${getWeapon(this.weaponSystem.primary).name}`, target.position);
          }
        }
        // Respawn target if bot
        if(target.isBot){
          setTimeout(()=>{
            const pos=this.mapManager.getSpawnPoint(Math.floor(Math.random()*6));
            target.respawn(pos);
            target.setWeapon(Object.keys(WEAPONS)[Math.floor(Math.random()*Object.keys(WEAPONS).length)]);
          },2000);
        }
      }
    }
    // Effects
    if(killed){
      this.createDeathEffect(target.position);
    }
  }

  onLocalDeath(killerId){
    this.ui.showPow('WASTED!', this.localPlayer.position);
    this.cameraShake=1.5;
    // Respawn handled in Player class after 3 sec, but also reset position
    setTimeout(()=>{
      if(this.localPlayer){
        const pos=this.mapManager.getSpawnPoint(Math.floor(Math.random()*6));
        this.localPlayer.respawn(pos);
      }
    },3000);
  }

  throwGrenade(throwableId){
    if(!this.localPlayer || this.localPlayer.isDead) return;
    const t=getThrowable(throwableId);
    if(!t) return;
    // Check count - simplified infinite for now, or track
    const origin=this.localPlayer.getMuzzleWorldPos();
    const dir=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.controls.pitch, this.controls.yaw,0)));
    this.projectiles.spawnThrowable(origin, dir, throwableId, 'local');
    if(this.multiplayer && this.multiplayer.connected){
      this.multiplayer.sendProjectile({
        origin:[origin.x,origin.y,origin.z],
        dir:[dir.x,dir.y,dir.z],
        throwable: throwableId
      });
    }
  }

  createMuzzleFlash(pos){
    const geo=new THREE.SphereGeometry(0.15,6,6);
    const mat=new THREE.MeshBasicMaterial({ color:0xFFD000, transparent:true, opacity:0.9 });
    const mesh=new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    setTimeout(()=>this.scene.remove(mesh),60);
  }

  createDeathEffect(pos){
    // Comic POW
    this.ui.showPow('BOOM!', pos);
    const geo=new THREE.SphereGeometry(1.2,10,8);
    const mat=new THREE.MeshBasicMaterial({ color:0xFF1A1A, transparent:true, opacity:0.6 });
    const mesh=new THREE.Mesh(geo, mat);
    mesh.position.copy(pos); mesh.position.y+=1;
    this.scene.add(mesh);
    let scale=1;
    const anim=()=>{
      scale+=0.08;
      mesh.scale.setScalar(scale);
      mat.opacity-=0.04;
      if(mat.opacity>0) requestAnimationFrame(anim);
      else this.scene.remove(mesh);
    };
    anim();
  }

  updateBots(dt){
    this.botTimer+=dt;
    this.bots.forEach(bot=>{
      if(bot.isDead) return;
      // Simple AI
      bot.botState.wanderTime-=dt;
      bot.botState.shootCooldown-=dt;

      // Find closest player
      let closest=null; let closestDist=Infinity;
      this.players.forEach(p=>{
        if(p.id===bot.id || p.isDead) return;
        const d=bot.position.distanceTo(p.position);
        if(d<closestDist){ closestDist=d; closest=p; }
      });

      if(closest){
        // Move towards
        const dir=closest.position.clone().sub(bot.position);
        dir.y=0;
        const dist=dir.length();
        dir.normalize();
        // Avoid obstacles - simple
        if(dist>2){
          // Convert world dir to local input based on bot rotation
          const desiredYaw=Math.atan2(-dir.x, -dir.z);
          const yawDiff=desiredYaw-bot.rotation.y;
          bot.rotation.y+=yawDiff*dt*3;
          bot.moveInput.set(0,1);
        } else {
          bot.moveInput.set((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5);
        }

        // Aim at target
        const aimDir=closest.position.clone().add(new THREE.Vector3(0,1,0)).sub(bot.position.clone().add(new THREE.Vector3(0,1,0))).normalize();
        bot.aimDirection.copy(aimDir);
        bot.rotation.y=Math.atan2(-aimDir.x, -aimDir.z);

        // Shoot if in range
        if(dist<20 && bot.botState.shootCooldown<=0){
          const origin=bot.getMuzzleWorldPos();
          const weapon=getWeapon(bot.currentWeaponId);
          if(weapon.projectile){
            this.projectiles.spawnProjectile(origin, aimDir, weapon.id, bot.id, null);
          } else {
            // Hitscan with some inaccuracy
            const spreadDir=aimDir.clone();
            spreadDir.x+=(Math.random()-0.5)*0.1;
            spreadDir.y+=(Math.random()-0.5)*0.1;
            spreadDir.z+=(Math.random()-0.5)*0.1;
            spreadDir.normalize();
            this.projectiles.spawnBullet(origin, spreadDir, weapon.id, bot.id);
            this.checkHitscan(origin, spreadDir, weapon.id, bot.id);
          }
          bot.botState.shootCooldown= (60/weapon.rpm)/1000 + Math.random()*0.5;
          bot.addRecoil(0.3);
        }
      } else {
        // Wander
        if(bot.botState.wanderTime<=0){
          bot.moveInput.set((Math.random()-0.5)*2, (Math.random()-0.5)*2);
          if(bot.moveInput.length()>1) bot.moveInput.normalize();
          bot.botState.wanderTime=1+Math.random()*2;
        }
      }
    });
  }

  addKillFeed(killer, victim, weapon){
    this.ui.addKillFeed(killer, victim, weapon);
  }

  endMatch(isVictory=false){
    this.gameState='menu';
    this.ui.showEndScreen(isVictory? 'VICTORY!' : 'MATCH OVER', this.localPlayer?.kills||0);
    // Cleanup
    // Keep players but stop loop
  }

  render(){
    this.renderer.render(this.scene, this.camera);
  }

  onResize(){
    this.camera.aspect=window.innerWidth/window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  pause(){
    this.gameState='paused';
    this.clock.stop();
  }
  resume(){
    if(this.gameState==='paused'){
      this.gameState='playing';
      this.clock.start();
      this.animate();
    }
  }
}

// Helpers to avoid circular import issues
function getArrowData(id){
  const map={
    standard:{ damage:75, effect:null },
    fire:{ damage:65, effect:'burn', duration:3 },
    explosive:{ damage:90, effect:'explode', radius:4 },
    poison:{ damage:40, effect:'poison', duration:5 },
    ice:{ damage:50, effect:'slow', slow:0.4, duration:2.5 },
    electric:{ damage:55, effect:'stun', stun:0.8 }
  };
  return map[id]||map.standard;
}
function requireConstants(){
  // dynamic to avoid import cycle
  return { ARROW_TYPES: {
    standard:{damage:75},fire:{damage:65},explosive:{damage:90},poison:{damage:40},ice:{damage:50},electric:{damage:55}
  }};
}
function requireArrow(id){
  return getArrowData(id);
}
